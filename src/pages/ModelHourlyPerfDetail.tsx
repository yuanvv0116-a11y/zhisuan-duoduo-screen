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
import { buildHourlyPerfRows, PERF_NORMAL_RATE_THRESHOLD } from '../perf'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'

const { RangePicker } = DatePicker
const { Text } = Typography

/** 默认查询最近 24 小时，与「查看性能」弹窗的 24h 明细口径一致；可通过时间范围扩展到最近 7 天 */
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(23, 'hour').startOf('hour'), dayjs()]
/** 最近 7 天：从「查看性能」弹窗点「查看全部」跳转时使用，覆盖更长的逐小时周期 */
const last7DaysRange = (): [Dayjs, Dayjs] => [dayjs().subtract(6, 'day').startOf('day'), dayjs()]

/** 已提交的查询条件：点击「搜索」后才生效 */
type PerfQuery = { range: [Dayjs, Dayjs] | null; channelId: string; name: string }

const RATE_TIPS = {
  requestSuccessRate: '算法：1 小时内实测的请求成功数 ÷ 该小时总请求数',
  firstToken: '算法：1 小时内（首个 Token 到达时间 − 请求发送时间）总和 ÷ 1 小时请求数',
  tps: '算法：1 小时内成功请求输出的 Token 总量 ÷ 1 小时内有效请求总耗时（秒）',
  anomaly: '该小时内记录的异常事件数量，鼠标悬浮可查看每条事件的具体时间与异常描述',
}

/** 状态色：与渠道模型管理同一口径，≥99% 绿、≥95% 橙、其余红 */
function usePerfColor() {
  const { token } = theme.useToken()
  return (tone: 'success' | 'warning' | 'danger') =>
    tone === 'success' ? token.colorSuccess : tone === 'warning' ? token.colorWarning : token.colorError
}

/** 百分比单元格：0 视为无数据，统一显示 — */
function RateCell({ value }: { value: number }) {
  const colorOf = usePerfColor()
  if (!value) return <Text type="secondary">—</Text>
  const tone = value >= PERF_NORMAL_RATE_THRESHOLD ? 'success' : value >= 95 ? 'warning' : 'danger'
  return <Text style={{ color: colorOf(tone) }}>{`${value.toFixed(2)}%`}</Text>
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
    const header = [
      '采集时段',
      '渠道名称',
      '渠道模型名称',
      '异常数量',
      '异常明细',
      '首Token平均延迟（秒）',
      'TPS（tokens/秒）',
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
          r.firstTokenLatency ? r.firstTokenLatency.toFixed(2) : '—',
          r.tps ? r.tps.toFixed(1) : '—',
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
      searchExtra={
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          导出
        </Button>
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
            title: <HeaderWithTip label="首 Token 平均延迟" tip={RATE_TIPS.firstToken} />,
            dataIndex: 'firstTokenLatency',
            width: 180,
            render: (v: number) =>
              v ? <Text>{`${v.toFixed(2)}s`}</Text> : <Text type="secondary">—</Text>,
          },
          {
            title: <HeaderWithTip label="TPS" tip={RATE_TIPS.tps} />,
            dataIndex: 'tps',
            width: 130,
            render: (v: number) => (v ? `${v.toFixed(1)} t/s` : <Text type="secondary">—</Text>),
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
