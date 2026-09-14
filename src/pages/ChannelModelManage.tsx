import { useMemo, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Popconfirm,
  Popover,
  Tooltip,
  Typography,
  Select,
  Tag,
  message,
  theme,
} from 'antd'
import {
  DashboardOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
} from '@ant-design/icons'
import type { ChannelModelItem, ModelCostConfig, ModelPerfStatus } from '../types'
import { useChannels, useChannelModels } from '../store'
import { endpointLabel } from '../constants'
import { channelModelPerf, PERF_NORMAL_RATE_THRESHOLD, PERF_WARN_RATE_THRESHOLD, PERF_STATUS_META } from '../perf'
import ChannelModelModal from '../components/ChannelModelModal'
import ModelCostModal from '../components/ModelCostModal'
import ModelPerformanceModal from '../components/ModelPerformanceModal'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography

const CASCADER_REQ =
  '渠道与API名称为同一个级联选择控件（必选）：第一级渠道，来源于渠道管理（下方有api的都展示），鼠标悬浮即展开第二级；第二级为该渠道下的API名称；选到API后，下方展示该API的地址。一组 API 可以关联多个模型。如选择某个api时，此api被删掉了。则选择后提示“当前API信息已变更，请重新选择” 提示完了刷新下拉列表数据'

function EndpointSummary({ list }: { list: ChannelModelItem['endpoints'] }) {
  const fullContent = (
    <div style={{ maxWidth: 360 }}>
      {list.map((e) => (
        <div
          key={e.endpointKey}
          style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'center' }}
        >
          <Tag color="blue" style={{ margin: 0, flex: 'none' }}>
            {endpointLabel(e.endpointKey)}
          </Tag>
          <Text
            type={e.mappingUrl ? undefined : 'secondary'}
            style={{ fontSize: 12, maxWidth: 240 }}
            ellipsis={{ tooltip: e.mappingUrl || '未填写映射地址' }}
          >
            {e.mappingUrl || '未填写映射地址'}
          </Text>
        </div>
      ))}
    </div>
  )

  return (
    <Popover content={fullContent} title={`端点映射明细（${list.length}）`} trigger="hover">
      <Button type="link" size="small" style={{ padding: 0 }}>
        已配置 {list.length} 个
      </Button>
    </Popover>
  )
}

const COST_TYPE_LABELS: Record<string, string> = {
  token: '按 token 计费',
  image_quality: '按图片质量计费',
  image_token: '按图片token计费',
  video_quality: '按视频质量计费',
  video_quality_token: '按视频质量token计费',
  vidu_image_quality: 'vidu按图片质量计费',
}

function costRow(label: string, value: number | undefined) {
  return (
    <div
      key={label}
      style={{ display: 'flex', justifyContent: 'space-between', gap: 24, padding: '3px 0' }}
    >
      <Text style={{ fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 12 }}>￥{value ?? '—'}</Text>
    </div>
  )
}

function CostSummary({ config }: { config: ModelCostConfig }) {
  const rows: React.ReactNode[] = []
  if (config.priceType === 'token') {
    rows.push(costRow('输入', config.inputPrice))
    rows.push(costRow('输出', config.outputPrice))
    if (config.cachedEnabled) {
      rows.push(costRow('缓存', config.cachedPrice))
      rows.push(costRow('缓存创建', config.cacheCreatePrice))
      rows.push(costRow('缓存读取', config.cacheReadPrice))
    }
  } else if (config.tiers && config.tiers.length) {
    config.tiers.forEach((t) => rows.push(costRow(`${t.label}`, t.price)))
  } else {
    rows.push(
      <Text key="empty" type="secondary" style={{ fontSize: 12 }}>
        暂无具体价格配置
      </Text>,
    )
  }
  return (
    <Popover
      content={<div style={{ minWidth: 220 }}>{rows}</div>}
      title="模型成本明细"
      trigger="hover"
    >
      <Tag color="purple" style={{ margin: 0, cursor: 'pointer' }}>
        {COST_TYPE_LABELS[config.priceType] ?? config.priceType}
      </Tag>
    </Popover>
  )
}

/** 状态色：模型最新状态只有正常绿 / 异常红，成功率单元格按阈值降级为橙、红 */
function usePerfColor() {
  const { token } = theme.useToken()
  return (tone: 'success' | 'warning' | 'danger') =>
    tone === 'success' ? token.colorSuccess : tone === 'warning' ? token.colorWarning : token.colorError
}

function StatusCell({ status }: { status: ModelPerfStatus }) {
  const colorOf = usePerfColor()
  const meta = PERF_STATUS_META[status]
  const color = colorOf(meta.tone)
  return (
    <Tooltip title="最新一次访问状态">
      <Space size={6}>
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
          }}
        />
        <Text style={{ color }}>{meta.label}</Text>
      </Space>
    </Tooltip>
  )
}

/** 数值单元格：0 视为无数据，统一显示 —；colorByRate 控制百分比是否按成功率阈值染色（缓存命中率等比率不适用该阈值） */
function NumCell({
  value,
  digits,
  suffix,
  colorByRate = true,
}: {
  value?: number
  digits: number
  suffix?: string
  colorByRate?: boolean
}) {
  const colorOf = usePerfColor()
  if (!value) return <Text type="secondary">—</Text>
  const tone =
    suffix === '%' && colorByRate
      ? value >= PERF_NORMAL_RATE_THRESHOLD
        ? 'success'
        : value >= PERF_WARN_RATE_THRESHOLD
          ? 'warning'
          : 'danger'
      : undefined
  return <Text style={{ color: tone ? colorOf(tone) : undefined }}>{`${value.toFixed(digits)}${suffix ?? ''}`}</Text>
}

interface ChannelModelManageProps {
  /** 性能弹窗内点击「查看全部」：跳转「模型性能明细（小时）」并按该渠道模型名称搜索 */
  onViewHourlyDetail?: (item: ChannelModelItem) => void
}

export default function ChannelModelManage({ onViewHourlyDetail }: ChannelModelManageProps = {}) {
  const { channels } = useChannels()
  const { channelModels, addChannelModel, updateChannelModel, removeChannelModel } =
    useChannelModels()

  const [nameKw, setNameKw] = useState('')
  const [codeKw, setCodeKw] = useState('')
  const [channelKw, setChannelKw] = useState<string>('all')
  const [query, setQuery] = useState<{ name: string; code: string; channelId: string }>({
    name: '',
    code: '',
    channelId: 'all',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChannelModelItem | null>(null)
  const [costOpen, setCostOpen] = useState(false)
  const [costModel, setCostModel] = useState<ChannelModelItem | null>(null)
  const [perfOpen, setPerfOpen] = useState(false)
  const [perfModel, setPerfModel] = useState<ChannelModelItem | null>(null)

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? '—'

  const handleSearch = () => setQuery({ name: nameKw, code: codeKw, channelId: channelKw })
  const handleReset = () => {
    setNameKw('')
    setCodeKw('')
    setChannelKw('all')
    setQuery({ name: '', code: '', channelId: 'all' })
  }

  const filtered = useMemo(() => {
    const n = query.name.trim().toLowerCase()
    const c = query.code.trim().toLowerCase()
    return channelModels.filter((m) => {
      const matchName = !n || m.modelName.toLowerCase().includes(n)
      const matchCode = !c || m.modelCode.toLowerCase().includes(c)
      const matchChannel = query.channelId === 'all' || m.channelId === query.channelId
      return matchName && matchCode && matchChannel
    })
  }, [channelModels, query])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (m: ChannelModelItem) => {
    setEditing(m)
    setModalOpen(true)
  }

  const openCost = (m: ChannelModelItem) => {
    setCostModel(m)
    setCostOpen(true)
  }

  const openPerf = (m: ChannelModelItem) => {
    setPerfModel(m)
    setPerfOpen(true)
  }

  const handleCostSubmit = (id: string, config: ModelCostConfig) => {
    updateChannelModel(id, { costConfig: config })
    setCostOpen(false)
  }

  const handleSubmit = (data: ChannelModelItem) => {
    if (data.id) {
      updateChannelModel(data.id, data)
      message.success('渠道模型已更新')
    } else {
      const { id, createdAt, operator, ...rest } = data
      addChannelModel(rest)
      message.success('渠道模型已创建')
    }
    setModalOpen(false)
  }

  return (
    <PageShell
      breadcrumb={['渠道管理', '渠道模型管理']}
      onSearch={handleSearch}
      onReset={handleReset}
      listTitle="渠道模型 列表"
      total={filtered.length}
      hideTotal
      addText="新增渠道模型"
      onAdd={openCreate}
      titleExtra={
        <RequirementDot
          title="渠道模型管理 · 新增运行性能列"
          sections={[
            {
              label: '',
              items: [
                '1.在「Model Code」后新增一组性能列：模型最新状态、24h 访问成功率、24h 平均延迟（s）、24h TTFT（s）、24h TPOT（ms）、24h 缓存命中率。',
                '2.模型最新状态：彩色圆点 + 文字展示正常/异常，鼠标悬浮状态值提示「最新一次访问状态」，即按最新一次访问判定，不用窗口均值判定。',
                '3.24h 访问成功率保留 2 位小数并带百分号；平均延迟、TTFT 单位为秒，TPOT 单位为毫秒，缓存命中率保留 1 位小数、不参与着色。',
                '4.统计口径为最近 24 小时；窗口内无调用数据时统一显示「—」，不做 0 值兜底。',
                '5.数据与「查看性能」弹窗、模型性能明细（小时）同源，三处指标口径一致。',
              ],
            },
          ]}
        />
      }
      addExtra={
        <RequirementDot
          title="新增渠道模型"
          sections={[
            {
              label: '',
              items: [CASCADER_REQ],
            },
          ]}
        />
      }
      searchFields={
        <>
          <SearchField label="模型名称">
            <Input
              allowClear
              placeholder="请输入模型名称"
              style={{ width: 200 }}
              value={nameKw}
              onChange={(e) => setNameKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="Model Code">
            <Input
              allowClear
              placeholder="请输入 Model Code"
              style={{ width: 200 }}
              value={codeKw}
              onChange={(e) => setCodeKw(e.target.value)}
              onPressEnter={handleSearch}
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
        </>
      }
    >
      <Table<ChannelModelItem>
        rowKey="id"
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 8, showTotal: (t) => `共 ${t} 条记录` }}
        columns={[
          {
            title: '渠道模型名称',
            dataIndex: 'modelName',
            width: 180,
            fixed: 'left',
            render: (v: string) => <Text>{v}</Text>,
          },
          {
            title: '渠道名称',
            dataIndex: 'channelId',
            width: 160,
            render: (v: string) => {
              const name = channelName(v)
              return name === '—' ? <Text type="secondary">—</Text> : <Text>{name}</Text>
            },
          },
          {
            title: 'Model Code',
            dataIndex: 'modelCode',
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
            title: '模型最新状态',
            key: 'perfStatus',
            width: 130,
            render: (_, r) => <StatusCell status={channelModelPerf(r).status} />,
          },
          {
            title: '24h 访问成功率',
            key: 'perfRate',
            width: 150,
            render: (_, r) => <NumCell value={channelModelPerf(r).successRate24h} digits={2} suffix="%" />,
          },
          {
            title: '24h平均延迟（s）',
            key: 'perfLatency',
            width: 160,
            render: (_, r) => <NumCell value={channelModelPerf(r).latency} digits={2} />,
          },
          {
            title: '24h TTFT（s）',
            key: 'perfTtft',
            width: 140,
            render: (_, r) => <NumCell value={channelModelPerf(r).ttft} digits={2} />,
          },
          {
            title: '24h TPOT（ms）',
            key: 'perfTpot',
            width: 150,
            render: (_, r) => <NumCell value={channelModelPerf(r).tpot} digits={1} />,
          },
          {
            title: '24h 缓存命中率',
            key: 'perfCacheHit',
            width: 150,
            render: (_, r) => (
              <NumCell
                value={channelModelPerf(r).cacheHit}
                digits={1}
                suffix="%"
                colorByRate={false}
              />
            ),
          },
          {
            title: '端点映射',
            dataIndex: 'endpoints',
            width: 140,
            render: (list: ChannelModelItem['endpoints']) =>
              list && list.length ? (
                <EndpointSummary list={list} />
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: '模型成本',
            dataIndex: 'costConfig',
            width: 150,
            render: (cfg?: ModelCostConfig) =>
              cfg ? <CostSummary config={cfg} /> : <Text type="secondary">—</Text>,
          },
          {
            title: '操作人',
            dataIndex: 'operator',
            width: 110,
            render: (v: string) => <Text>{v}</Text>,
          },
          { title: '创建时间', dataIndex: 'createdAt', width: 120 },
          {
            title: '操作',
            width: 320,
            fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(r)}
                >
                  编辑
                </Button>
                <RequirementDot
                  title="编辑渠道模型"
                  sections={[{ label: '', items: [CASCADER_REQ] }]}
                />
                <Button
                  type="link"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => openCost(r)}
                >
                  模型成本
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<DashboardOutlined />}
                  onClick={() => openPerf(r)}
                >
                  查看性能
                </Button>
                <RequirementDot
                  title="查看性能"
                  sections={[
                    {
                      label: '',
                      items: [
                        '1.行内「查看性能」打开弹窗，按当前渠道模型展示最近 24 小时的运行指标卡与逐小时明细。',
                        '2.指标卡包含 TPS、首 Token 延迟、平均延迟、每个 Token 生成时间、Token 吞吐量、缓存命中率、请求成功率，与列表新增列同源。',
                        '3.弹窗内提供「查看全部」，点击后跳转「渠道管理 › 模型性能明细（小时）」，并自动带入当前渠道与模型、直接完成搜索。',
                      ],
                    },
                  ]}
                />
                <Popconfirm
                  title="确认删除该渠道模型？"
                  onConfirm={() => {
                    removeChannelModel(r.id)
                    message.success('已删除')
                  }}
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <ChannelModelModal
        open={modalOpen}
        model={editing}
        channels={channels}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ModelCostModal
        open={costOpen}
        model={costModel}
        onClose={() => setCostOpen(false)}
        onSubmit={handleCostSubmit}
      />

      <ModelPerformanceModal
        open={perfOpen}
        model={perfModel}
        channels={channels}
        onClose={() => setPerfOpen(false)}
        onViewHourlyDetail={(item) => {
          setPerfOpen(false)
          setPerfModel(null)
          onViewHourlyDetail?.(item)
        }}
      />
    </PageShell>
  )
}
