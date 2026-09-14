import { useMemo, useState } from 'react'
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd'
import { ExportOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { HourlyPerfEvent, HourlyPerfRow } from '../types'
import { useChannelModels, useChannels } from '../store'
import { buildHourlyPerfRows, PERF_NORMAL_RATE_THRESHOLD, PERF_WARN_RATE_THRESHOLD } from '../perf'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'

const { RangePicker } = DatePicker
const { Text } = Typography

/** 默认查询最近 24 小时，与「查看性能」弹窗的 24h 明细口径一致；可通过时间范围扩展到最近 7 天 */
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(23, 'hour').startOf('hour'), dayjs()]
/** 最近 7 天：从「查看性能」弹窗点「查看全部」跳转时使用，覆盖更长的逐小时周期 */
const last7DaysRange = (): [Dayjs, Dayjs] => [dayjs().subtract(6, 'day').startOf('day'), dayjs()]

/** 已提交的查询条件：点击「搜索」后才生效 */
type PerfQuery = { range: [Dayjs, Dayjs] | null; channelId: string; name: string }

/** 表头算法说明：与「查看性能」弹窗的指标卡逐项对应，只是把口径从「窗口均值」细化为「单个采集小时」 */
const RATE_TIPS = {
  tps: '算法：1 小时内 Token 吞吐量 ÷ 平均并发，即单请求输出速率',
  firstToken: '算法：1 小时内（首个 Token 到达时间 − 请求发送时间）总和 ÷ 1 小时请求数',
  avgLatency: '算法：1 小时内（响应完成时间 − 请求发送时间）之和 ÷ 该小时成功请求数，即单请求总耗时',
  tpot: '算法：1 小时内（平均延迟 − 首 Token 延迟）× 1000 ÷ 平均输出 Token 数',
  throughput: '算法：1 小时内总输出 Token 数 ÷ 时间窗口（1 小时），即所有并发请求的聚合速率',
  cacheHit: '算法：1 小时内命中缓存的输入 Token ÷ 输入 Token 总量',
  requestSuccessRate: '算法：1 小时内实测的请求成功数 ÷ 该小时总请求数',
  anomaly: '该小时内记录的异常事件数量，鼠标悬浮可查看每条事件的具体时间与异常描述',
}

/** 状态色：与渠道模型管理同一口径，≥99% 绿、≥80% 橙、其余红 */
function usePerfColor() {
  const { token } = theme.useToken()
  return (tone: 'success' | 'warning' | 'danger') =>
    tone === 'success' ? token.colorSuccess : tone === 'warning' ? token.colorWarning : token.colorError
}

/** 百分比单元格：0 视为无数据，统一显示 — */
function RateCell({ value }: { value: number }) {
  const colorOf = usePerfColor()
  if (!value) return <Text type="secondary">—</Text>
  const tone =
    value >= PERF_NORMAL_RATE_THRESHOLD ? 'success' : value >= PERF_WARN_RATE_THRESHOLD ? 'warning' : 'danger'
  return <Text style={{ color: colorOf(tone) }}>{`${value.toFixed(2)}%`}</Text>
}

/** 指标单元格：0 视为无数据统一显示 —；位数与单位与「查看性能」弹窗的指标卡保持一致 */
function MetricCell({ value, digits, unit }: { value: number; digits: number; unit: string }) {
  if (!value) return <Text type="secondary">—</Text>
  return <Text>{`${value.toFixed(digits)} ${unit}`}</Text>
}

/** 表头：名称 + 算法说明悬浮图标 */
function HeaderWithTip({ label, tip }: { label: string; tip: string }) {
  return (
    <Space size={4}>
      {label}
      <Tooltip title={tip}>
        <Text type="secondary" style={{ cursor: 'help' }}>
          <QuestionCircleOutlined />
        </Text>
      </Tooltip>
    </Space>
  )
}

/** 异常数量悬浮层：逐条展示事件的具体时间（精确到秒）与异常描述 */
function EventTip({ events }: { events: HourlyPerfEvent[] }) {
  return (
    <div style={{ maxWidth: 300 }}>
      {events.map((e, i) => (
        <div key={`${e.at}|${e.cause}|${i}`} style={{ marginBottom: i === events.length - 1 ? 0 : 10 }}>
          <div style={{ fontWeight: 600 }}>{e.at}</div>
          <div>{`异常描述：${e.cause}`}</div>
        </div>
      ))}
    </div>
  )
}

/** 异常数量单元格：0 置灰，> 0 红色告警图标 + 悬浮明细 */
function AnomalyCell({ events }: { events: HourlyPerfEvent[] }) {
  const colorOf = usePerfColor()
  if (!events.length) return <Text type="secondary">0</Text>
  const color = colorOf('danger')
  return (
    <Tooltip title={<EventTip events={events} />}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color,
          cursor: 'default',
        }}
      >
        <WarningOutlined />
        {events.length}
      </span>
    </Tooltip>
  )
}

/** CSV 单元格：统一加引号并转义内部双引号 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** 由「查看性能」弹窗「查看全部」带入的查询条件：渠道 + 该渠道下的模型 */
export interface PerfDetailFilter {
  channelId: string
  modelName: string
}

interface Props {
  /** 由「查看性能」弹窗的「查看全部」带入：进入页面即按该渠道名称与该渠道模型名称搜索，并把时间放宽到最近 7 天 */
  initialFilter?: PerfDetailFilter
}

export default function ModelHourlyPerfDetail({ initialFilter }: Props = {}) {
  const { channels } = useChannels()
  const { channelModels } = useChannelModels()

  /** 挂载时的初始查询条件：带入筛选则视为从性能弹窗跳转过来，直接生效，无需再点搜索 */
  const seeded = initialFilter
    ? {
        range: last7DaysRange(),
        /** 渠道可能已被删除，找不到就退回「全部渠道」，避免下拉框显示原始 id */
        channelId: channels.some((c) => c.id === initialFilter.channelId) ? initialFilter.channelId : 'all',
        name: initialFilter.modelName,
      }
    : { range: defaultRange(), channelId: 'all', name: '' }

  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(() => seeded.range)
  const [channelKw, setChannelKw] = useState<string>(seeded.channelId)
  const [nameKw, setNameKw] = useState(seeded.name)
  const [query, setQuery] = useState<PerfQuery>(() => ({
    range: seeded.range,
    channelId: seeded.channelId,
    name: seeded.name,
  }))

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const rows = useMemo(() => buildHourlyPerfRows(channels, channelModels), [channels, channelModels])

  const handleSearch = () => {
    setQuery({ range, channelId: channelKw, name: nameKw })
    setPage(1)
  }
  const handleReset = () => {
    const fresh = defaultRange()
    setRange(fresh)
    setChannelKw('all')
    setNameKw('')
    setQuery({ range: fresh, channelId: 'all', name: '' })
    setPage(1)
  }

  const filtered = useMemo(() => {
    const [start, end] = query.range ?? []
    const startTs = start ? start.startOf('hour').valueOf() : -Infinity
    const endTs = end ? end.endOf('hour').valueOf() : Infinity
    const kw = query.name.trim().toLowerCase()
    return rows.filter((r) => {
      const matchTime = r.collectedTs >= startTs && r.collectedTs <= endTs
      const matchChannel = query.channelId === 'all' || r.channelId === query.channelId
      const matchName = !kw || r.modelName.toLowerCase().includes(kw)
      return matchTime && matchChannel && matchName
    })
  }, [rows, query])

  const handleExport = () => {
    if (!filtered.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    /** 列顺序与页面表格、「查看性能」弹窗的指标卡完全一致 */
    const header = [
      '采集时段',
      '渠道名称',
      '渠道模型名称',
      '异常数量',
      '异常明细',
      'TPS（tokens/秒）',
      '首Token延迟TTFT（秒）',
      '平均延迟（秒）',
      '每个Token生成时间TPOT（毫秒）',
      'Token吞吐量（tokens/秒）',
      '缓存命中率',
      '请求成功率',
    ]
    const lines = [header.map(csvCell).join(',')]
    filtered.forEach((r) => {
      lines.push(
        [
          r.collectedAt,
          r.channelName || '—',
          r.modelName,
          r.events.length,
          r.events.map((e) => `${e.at} 异常描述：${e.cause}`).join('；'),
          r.tps ? r.tps.toFixed(1) : '—',
          r.firstTokenLatency ? r.firstTokenLatency.toFixed(2) : '—',
          r.avgLatency ? r.avgLatency.toFixed(2) : '—',
          r.tpot ? r.tpot.toFixed(1) : '—',
          r.throughput ? r.throughput.toFixed(1) : '—',
          r.cacheHitRate ? `${r.cacheHitRate.toFixed(1)}%` : '—',
          r.requestSuccessRate ? `${r.requestSuccessRate.toFixed(2)}%` : '—',
        ]
          .map(csvCell)
          .join(','),
      )
    })
    /** 前置 BOM，保证 Excel 直接打开时中文不乱码 */
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `模型性能明细_小时_${dayjs().format('YYYYMMDD_HHmm')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  return (
    <PageShell
      breadcrumb={['渠道管理', '模型性能明细（小时）']}
      onSearch={handleSearch}
      onReset={handleReset}
      listTitle="模型性能明细（小时）"
      total={filtered.length}
      hideTotal
      titleExtra={
        <RequirementDot
          title="模型性能明细（小时）· 列表字段"
          sections={[
            {
              label: '',
              items: [
                '1.按小时粒度展示单个渠道模型的运行性能，按照采集时间倒序展示。',
                '2.列字段与「渠道模型管理 › 查看性能」的统计口径一致，只是把窗口均值细化为单个采集小时：采集时段、渠道名称、渠道模型名称、异常数量、TPS、首 Token 延迟（TTFT）、平均延迟、每个 Token 生成时间（TPOT）、Token 吞吐量、缓存命中率、请求成功率。',
                '3.列头带「？」图标，鼠标悬浮展示该指标的算法说明。',
                '4.成功率、缓存命中率等比率类指标按阈值着色（≥99% 绿、≥80% 橙、其余红），与渠道模型管理同一口径。',
                '5.异常数量大于 0 时显示告警图标，鼠标悬浮逐条展示事件的具体时间与异常描述。',
                '6.无数据时统一显示「—」；表格横向滚动，「采集时段」列固定。',
              ],
            },
          ]}
        />
      }
      searchExtra={
        <Space size={8}>
          <RequirementDot
            title="模型性能明细（小时）· 搜索与筛选"
            sections={[
              {
                label: '',
                items: [
                  '1.「采集时间」：精确到小时的起止时间选择器，默认最近 24 小时；面板内置「最近 24 小时 / 最近 3 天 / 最近 7 天」快捷区间。',
                  '2.「渠道名称」：关键字模糊搜索。',
                  '3.「渠道模型名称」：关键字模糊搜索。',
                  '4.点击「重置」恢复默认（最近 24 小时 + 全部渠道 + 全部模型）。',
                  '5.从「查看性能」弹窗点「查看全部」跳转本页时，自动带入渠道与模型并直接完成搜索。',
                ],
              },
            ]}
          />
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
          <RequirementDot
            title="模型性能明细（小时）· 导出"
            sections={[
              {
                label: '',
                items: [
                  '1.按当前筛选结果导出 CSV，不只导当前页。',
                  '2.导出字段与列表一致，并额外包含「异常明细」列，便于离线定位问题。',
                  '3.筛选结果为空时给出提示，不生成文件。',
                ],
              },
            ]}
          />
        </Space>
      }
      searchFields={
        <>
          <SearchField label="采集时间">
            <RangePicker
              showTime={{ format: 'HH' }}
              format="YYYY-MM-DD HH"
              style={{ width: 340 }}
              value={range}
              onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
              presets={[
                { label: '最近 24 小时', value: defaultRange() },
                { label: '最近 3 天', value: [dayjs().subtract(2, 'day').startOf('day'), dayjs()] },
                { label: '最近 7 天', value: last7DaysRange() },
              ]}
            />
          </SearchField>
          <SearchField label="渠道名称">
            <Select
              style={{ width: 200 }}
              value={channelKw}
              onChange={setChannelKw}
              showSearch
              optionFilterProp="label"
              options={[
                { value: 'all', label: '全部渠道' },
                ...channels.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </SearchField>
          <SearchField label="渠道模型名称">
            <Input
              allowClear
              placeholder="请输入渠道模型名称"
              style={{ width: 260 }}
              value={nameKw}
              onChange={(e) => setNameKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
        </>
      }
    >
      <Table<HourlyPerfRow>
        rowKey="key"
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize,
          total: filtered.length,
          showTotal: (t) => `共 ${t} 条记录`,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
        columns={[
          {
            title: '采集时段',
            dataIndex: 'collectedAt',
            width: 160,
            fixed: 'left',
            render: (v: string) => <Text>{v}</Text>,
          },
          {
            title: '渠道名称',
            dataIndex: 'channelName',
            width: 160,
            render: (v: string) => (v ? <Text>{v}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: '渠道模型名称',
            dataIndex: 'modelName',
            width: 180,
            ellipsis: true,
            render: (v: string) =>
              v ? (
                <Tooltip title={v}>
                  <Text>{v}</Text>
                </Tooltip>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: <HeaderWithTip label="异常数量" tip={RATE_TIPS.anomaly} />,
            key: 'anomaly',
            width: 110,
            render: (_, r) => <AnomalyCell events={r.events} />,
          },
          {
            title: <HeaderWithTip label="TPS" tip={RATE_TIPS.tps} />,
            dataIndex: 'tps',
            width: 130,
            render: (v: number) => <MetricCell value={v} digits={1} unit="t/s" />,
          },
          {
            title: <HeaderWithTip label="首 Token 延迟 (TTFT)" tip={RATE_TIPS.firstToken} />,
            dataIndex: 'firstTokenLatency',
            width: 190,
            render: (v: number) => <MetricCell value={v} digits={2} unit="s" />,
          },
          {
            title: <HeaderWithTip label="平均延迟" tip={RATE_TIPS.avgLatency} />,
            dataIndex: 'avgLatency',
            width: 130,
            render: (v: number) => <MetricCell value={v} digits={2} unit="s" />,
          },
          {
            title: <HeaderWithTip label="每个 Token 生成时间 (TPOT)" tip={RATE_TIPS.tpot} />,
            dataIndex: 'tpot',
            width: 210,
            render: (v: number) => <MetricCell value={v} digits={1} unit="ms" />,
          },
          {
            title: <HeaderWithTip label="Token 吞吐量" tip={RATE_TIPS.throughput} />,
            dataIndex: 'throughput',
            width: 150,
            render: (v: number) => <MetricCell value={v} digits={1} unit="t/s" />,
          },
          {
            title: <HeaderWithTip label="缓存命中率" tip={RATE_TIPS.cacheHit} />,
            dataIndex: 'cacheHitRate',
            width: 140,
            render: (v: number) => <MetricCell value={v} digits={1} unit="%" />,
          },
          {
            title: <HeaderWithTip label="请求成功率" tip={RATE_TIPS.requestSuccessRate} />,
            dataIndex: 'requestSuccessRate',
            width: 140,
            render: (v: number) => <RateCell value={v} />,
          },
        ]}
      />
    </PageShell>
  )
}
