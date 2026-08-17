import { useMemo, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Select,
  Tag,
  Card,
  Row,
  Col,
  Breadcrumb,
  Modal,
  InputNumber,
  message,
  DatePicker,
  Divider,
} from 'antd'
import dayjs from 'dayjs'
import {
  SearchOutlined,
  DatabaseOutlined,
  PoweroffOutlined,
  BankOutlined,
  AppstoreOutlined,
  PlusOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { ModelItem, TokenPriceBreakdown } from '../types'
import { useModels, useChannels } from '../store'
import { MODEL_TYPES, modelTypeLabel, MODALS } from '../constants'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography

type OnlineFilter = 'all' | 'online' | 'offline'

/* ---------------- 统计卡 ---------------- */
function StatCard({
  title,
  value,
  valueColor,
  iconBg,
  iconColor,
  icon,
}: {
  title: string
  value: number
  valueColor: string
  iconBg: string
  iconColor: string
  icon: React.ReactNode
}) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 20 } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 15 }}>{title}</Text>
          <div style={{ fontSize: 30, fontWeight: 600, color: valueColor, marginTop: 8 }}>
            {value}
          </div>
        </div>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: iconBg,
            color: iconColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          {icon}
        </span>
      </div>
    </Card>
  )
}

/* ---------------- Logo（对齐截图 Z 形风格） ---------------- */
function ModelLogo({ text }: { text: string }) {
  const char = text?.charAt(0)?.toUpperCase() || '模'
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ borderRadius: 8, display: 'block' }}>
      <defs>
        <linearGradient id={`lg-${char}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1890ff" />
          <stop offset="50%" stopColor="#13c2c2" />
          <stop offset="100%" stopColor="#52c41a" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="8" fill={`url(#lg-${char})`} />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize="18"
        fontWeight="700"
      >
        {char}
      </text>
    </svg>
  )
}

/* ---------------- 根据模型ID生成稳定的成本价/售价（四项明细） ---------------- */
function deterministicPrice(id: string, base: number) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const r = (h % 1000) / 1000
  return Math.round(base * (0.6 + r * 0.8) * 10000) / 10000
}
type PriceKey = 'input' | 'output' | 'cacheRead' | 'cacheCreate'
const PRICE_LABELS: Record<PriceKey, string> = {
  input: '输入',
  output: '输出',
  cacheRead: '缓存读取',
  cacheCreate: '缓存创建',
}
/** Token 计费：四项成本价（元/千Token）；非 Token：output=统一成本，其余 0 */
const costBreakdown = (m: ModelItem): TokenPriceBreakdown => {
  if (m.pricingMode === 'token') {
    return {
      input: deterministicPrice(m.id + '_cin', 0.0008),
      output: deterministicPrice(m.id + '_cout', 0.0024),
      cacheRead: deterministicPrice(m.id + '_cread', 0.0002),
      cacheCreate: deterministicPrice(m.id + '_ccreate', 0.0008),
    }
  }
  const s = deterministicPrice(m.id, 0.8)
  return { input: 0, output: s, cacheRead: 0, cacheCreate: 0 }
}
/** Token 计费：四项对外售价（成本×1.4）；非 Token：output=统一售价 */
const sellBreakdown = (m: ModelItem): TokenPriceBreakdown => {
  const c = costBreakdown(m)
  return {
    input: Math.round(c.input * 1.4 * 10000) / 10000,
    output: Math.round(c.output * 1.4 * 10000) / 10000,
    cacheRead: Math.round(c.cacheRead * 1.4 * 10000) / 10000,
    cacheCreate: Math.round(c.cacheCreate * 1.4 * 10000) / 10000,
  }
}
/** 统一成本价：token 取输出价（主价）作为整行摘要；非 token 取 output */
const costOf = (m: ModelItem) => costBreakdown(m).output
/** 统一对外售价：同上，兼容已有引用（如市场价摘要显示） */
const externalSellOf = (m: ModelItem) => sellBreakdown(m).output

/** 价格单位（成本/售价列表头用） */
const priceUnitOf = (m: ModelItem) => {
  switch (m.pricingMode) {
    case 'token':
    case 'video_quality_token':
      return '元/千Token'
    case 'call':
    case 'image_quality':
      return '元/次'
    case 'free':
      return ''
    default:
      return '元'
  }
}
/** 折扣应用到明细 */
const applyDiscount = (bp: TokenPriceBreakdown, discount: number): TokenPriceBreakdown => ({
  input: Math.round((bp.input * discount) / 100 * 10000) / 10000,
  output: Math.round((bp.output * discount) / 100 * 10000) / 10000,
  cacheRead: Math.round((bp.cacheRead * discount) / 100 * 10000) / 10000,
  cacheCreate: Math.round((bp.cacheCreate * discount) / 100 * 10000) / 10000,
})

export default function ModelList() {
  const { models } = useModels()
  const { channels } = useChannels()

  const [kw, setKw] = useState('')
  const [onlineKw, setOnlineKw] = useState<OnlineFilter>('all')
  const [typeKw, setTypeKw] = useState<string>('')
  const [query, setQuery] = useState<{ kw: string; online: OnlineFilter; type: string }>({
    kw: '',
    online: 'all',
    type: '',
  })

  const handleSearch = () => setQuery({ kw, online: onlineKw, type: typeKw })
  const handleReset = () => {
    setKw('')
    setOnlineKw('all')
    setTypeKw('')
    setQuery({ kw: '', online: 'all', type: '' })
  }

  const filtered = useMemo(() => {
    const k = query.kw.trim().toLowerCase()
    return models.filter((m) => {
      const matchKw = !k || m.name.toLowerCase().includes(k) || m.vendor.toLowerCase().includes(k)
      const matchOnline =
        query.online === 'all' || (query.online === 'online' ? m.online : !m.online)
      const matchType = !query.type || m.type === query.type
      return matchKw && matchOnline && matchType
    })
  }, [models, query])

  const channelNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    channels.forEach((c) => (m[c.id] = c.name))
    return m
  }, [channels])

  const channelOptions = useMemo(
    () => channels.map((c) => ({ value: c.id, label: c.name })),
    [channels],
  )

  /* ---------- 生成报价单弹窗 ---------- */
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [qKw, setQKw] = useState('')
  const [qOnline, setQOnline] = useState<OnlineFilter>('all')
  const [qChannel, setQChannel] = useState<string[]>([])
  const [qOutput, setQOutput] = useState<string[]>([])
  const [qQuery, setQQuery] = useState<{ kw: string; online: OnlineFilter; channel: string[]; output: string[] }>({
    kw: '',
    online: 'all',
    channel: [],
    output: [],
  })
  const [qSelectedKeys, setQSelectedKeys] = useState<React.Key[]>([])
  const [quoteValues, setQuoteValues] = useState<Record<string, number | null>>({}) // key: `${id}_${key}`
  const [discountValues, setDiscountValues] = useState<Record<string, number | null>>({}) // key: `${id}_${key}`
  const [discount, setDiscount] = useState<number>(80)

  const qk = (id: string, k: PriceKey) => `${id}__${k}`

  const applyBatchDiscount = (scope: 'selected' | 'all') => {
    const keys: string[] =
      scope === 'selected'
        ? qSelectedKeys.map((k) => String(k))
        : quoteFiltered.map((m) => m.id)
    if (keys.length === 0) {
      message.warning(scope === 'selected' ? '请选择要应用折扣的模型' : '当前没有可应用折扣的模型')
      return
    }
    setDiscountValues((prevD) => {
      const nextD = { ...prevD }
      keys.forEach((id) => {
        const m = models.find((x) => x.id === id)
        if (!m) return
        const sb = sellBreakdown(m)
        const allKeys: PriceKey[] =
          m.pricingMode === 'token'
            ? ['input', 'output', 'cacheRead', 'cacheCreate']
            : ['output']
        allKeys.forEach((pk) => {
          if (sb[pk] > 0) nextD[qk(id, pk)] = discount
        })
      })
      return nextD
    })
    setQuoteValues((prev) => {
      const next = { ...prev }
      keys.forEach((id) => {
        const m = models.find((x) => x.id === id)
        if (!m) return
        const sb = sellBreakdown(m)
        const allKeys: PriceKey[] =
          m.pricingMode === 'token'
            ? ['input', 'output', 'cacheRead', 'cacheCreate']
            : ['output']
        allKeys.forEach((pk) => {
          if (sb[pk] > 0) next[qk(id, pk)] = Math.round(sb[pk] * (discount / 100) * 10000) / 10000
        })
      })
      return next
    })
    message.success(`已按 ${discount} 折批量计算 ${keys.length} 个模型的对外报价`)
  }

  const quoteFiltered = useMemo(() => {
    const k = qQuery.kw.trim().toLowerCase()
    return models.filter((m) => {
      const matchKw = !k || m.name.toLowerCase().includes(k)
      const matchOnline = qQuery.online === 'all' || (qQuery.online === 'online' ? m.online : !m.online)
      const matchChannel =
        qQuery.channel.length === 0 ||
        (m.apiConfigs ?? []).some((a) => qQuery.channel.includes(a.channelId))
      const matchOutput =
        qQuery.output.length === 0 ||
        (m.outputModals ?? []).some((o) => qQuery.output.includes(o))
      return matchKw && matchOnline && matchChannel && matchOutput
    })
  }, [models, qQuery])

  const handleQuoteSearch = () => setQQuery({ kw: qKw, online: qOnline, channel: qChannel, output: qOutput })
  const handleQuoteReset = () => {
    setQKw('')
    setQOnline('all')
    setQChannel([])
    setQOutput([])
    setQQuery({ kw: '', online: 'all', channel: [], output: [] })
  }

  const [companyName, setCompanyName] = useState('')
  const [quoteDate, setQuoteDate] = useState<dayjs.Dayjs | null>(dayjs())
  const [quoteContent, setQuoteContent] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const openQuote = () => {
    setQuoteValues({})
    setDiscountValues({})
    setQSelectedKeys([])
    setCompanyName('')
    setQuoteDate(dayjs())
    setQuoteContent('')
    setQuoteOpen(true)
  }
  const handleQuoteSubmit = () => {
    if (qSelectedKeys.length === 0) {
      message.warning('请选择要生成报价单的模型')
      return
    }
    setPreviewOpen(true)
  }
  const confirmQuote = () => {
    setPreviewOpen(false)
    setQuoteOpen(false)
    const suffix = [companyName.trim(), quoteDate?.format('YYYY-MM-DD')].filter(Boolean).join(' · ')
    message.success(`已生成 ${qSelectedKeys.length} 个模型的报价单${suffix ? `（${suffix}）` : ''}`)
  }

  const columns: ColumnsType<ModelItem> = [
    {
      title: 'Logo',
      dataIndex: 'logo',
      width: 100,
      fixed: 'left',
      render: (_: string, r) => <ModelLogo text={r.logo || r.name} />,
    },
    {
      title: '模型名称',
      dataIndex: 'name',
      width: 180,
      fixed: 'left',
      ellipsis: true,
      render: (v: string) => (
        <Text style={{ lineHeight: 1.5, wordBreak: 'break-all', whiteSpace: 'normal' }}>{v}</Text>
      ),
    },
    {
      title: '模型生产商',
      dataIndex: 'vendor',
      width: 140,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (v: ModelItem['type']) => {
        const colorMap: Record<string, string> = {
          text: '#1677ff',
          image: '#52c41a',
          video: '#722ed1',
          audio: '#fa8c16',
          embedding: '#13c2c2',
        }
        const label = modelTypeLabel(v)
        const c = colorMap[v] ?? '#1677ff'
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 4,
              background: `${c}15`,
              color: c,
              fontSize: 13,
            }}
          >
            {label}
          </span>
        )
      },
    },
    {
      title: '输入模态',
      dataIndex: 'inputModals',
      width: 120,
      render: (v: string[]) => (v && v.length ? v.join('，') : <Text type="secondary">—</Text>),
    },
    {
      title: '输出模态',
      dataIndex: 'outputModals',
      width: 120,
      render: (v: string[]) => (v && v.length ? v.join('，') : <Text type="secondary">—</Text>),
    },
    {
      title: '最大输出Token',
      dataIndex: 'maxOutputToken',
      width: 140,
      align: 'right',
      render: (v: number) => (v != null ? v.toLocaleString() : <Text type="secondary">—</Text>),
    },
    {
      title: '定价模式',
      dataIndex: 'pricingMode',
      width: 150,
      render: (v: ModelItem['pricingMode']) => {
        const labelMap: Record<string, string> = {
          token: '按 token 计费',
          call: '按调用次数计费',
          image_quality: '按图片质量计费',
          video_quality_token: '按视频质量token计费',
          free: '免费',
        }
        const label = labelMap[v] ?? v
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 14px',
              borderRadius: 16,
              background: '#2f6bff',
              color: '#fff',
              fontSize: 13,
            }}
          >
            {label}
          </span>
        )
      },
    },
    {
      title: '热门',
      dataIndex: 'hot',
      width: 100,
      align: 'center',
      render: (v: boolean) =>
        v ? <Tag color="orange">热门</Tag> : <Tag color="default">普通</Tag>,
    },
  ]

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: '模型管理' }, { title: '模型列表' }]} />

      {/* 统计卡 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <StatCard
            title="模型总数"
            value={70}
            valueColor="#333"
            iconBg="#f0f2f5"
            iconColor="#8c8c8c"
            icon={<DatabaseOutlined />}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="已上架模型"
            value={30}
            valueColor="#52c41a"
            iconBg="#d9f7be"
            iconColor="#52c41a"
            icon={<PoweroffOutlined />}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="供应商数量"
            value={10}
            valueColor="#2f6bff"
            iconBg="#e6f0ff"
            iconColor="#2f6bff"
            icon={<BankOutlined />}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="模型类型"
            value={3}
            valueColor="#722ed1"
            iconBg="#efdbff"
            iconColor="#722ed1"
            icon={<AppstoreOutlined />}
          />
        </Col>
      </Row>

      {/* 搜索卡 */}
      <Card variant="borderless" styles={{ body: { padding: 24 } }} style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
            marginBottom: 20,
          }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="搜索模型名称或提供商..."
            style={{ flex: 1, maxWidth: 640 }}
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            style={{ width: 220 }}
            value={onlineKw}
            onChange={setOnlineKw}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'online', label: '已上架' },
              { value: 'offline', label: '已下架' },
            ]}
          />
          <Select
            style={{ width: 260 }}
            value={typeKw || undefined}
            onChange={setTypeKw}
            placeholder="请选择类型"
            allowClear
            options={MODEL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </div>
        <Space size={12}>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {/* 列表卡 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 16,
          }}
        >
          <div>
            <Text strong style={{ fontSize: 18 }}>
              模型信息
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                共 {70} 个模型
              </Text>
            </div>
          </div>
          <Space size={8}>
            <Button icon={<FileTextOutlined />} onClick={openQuote}>
              生成报价单
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              添加模型
            </Button>
          </Space>
        </div>
        <Table<ModelItem>
          rowKey="id"
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 8, showTotal: (t) => `共 ${t} 条记录` }}
          columns={columns}
        />
      </Card>

      {/* 生成报价单 弹窗 */}
      <Modal
        title={
          <Space size={8} align="center">
            <span>生成报价单</span>
            <RequirementDot
              title="生成报价单 — 需求点"
              sections={[
                {
                  label: '基础信息',
                  items: [
                    '报价公司选填',
                    '报价日期默认今日（支持修改）',
                    '报价内容选填（不填写在报价单中不展示）',
                  ],
                },
                {
                  label: '模型列表与搜索',
                  items: [
                    '展示所有未删除模型，按照上架时间倒序展示，字段如图',
                    '支持根据名称模糊搜索',
                    '支持根据状态、渠道搜索',
                  ],
                },
                {
                  label: '批量折扣',
                  items: ['支持批量设置折扣，设置完，会覆盖现有的折扣和报价'],
                },
                {
                  label: '联动计算',
                  items: [
                    '设置折扣时，自动计算报价；填写价格时，自动计算折扣',
                    '对外报价 = 对外售价 × 折扣',
                  ],
                },
                {
                  label: '生成与导出',
                  items: [
                    '点击生成报价单后，根据预览的样式，展示报价单',
                    '导出格式为 word',
                    '命名规则：年份后两位+月+日+序号+报价单，如：26080701报价单',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={quoteOpen}
        onCancel={() => setQuoteOpen(false)}
        onOk={handleQuoteSubmit}
        okText="生成报价单"
        cancelText="取消"
        centered
        width={1100}
        destroyOnClose
      >
        <div
          style={{
            marginBottom: 16,
            padding: '14px 16px',
            background: '#f5f8ff',
            border: '1px solid #e0e9ff',
            borderRadius: 8,
          }}
        >
          <Row gutter={24}>
            <Col span={14}>
              <div style={{ marginBottom: 6 }}>
                <Text strong>报价公司</Text>
              </div>
              <Input
                allowClear
                placeholder="请输入公司名称（选填）"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={60}
              />
            </Col>
            <Col span={10}>
              <div style={{ marginBottom: 6 }}>
                <Text strong>报价日期</Text>
              </div>
              <DatePicker
                style={{ width: '100%' }}
                value={quoteDate}
                onChange={(v) => setQuoteDate(v)}
                format="YYYY-MM-DD"
                placeholder="请选择报价日期（选填）"
                allowClear
              />
            </Col>
          </Row>
          <Row style={{ marginTop: 12 }}>
            <Col span={24}>
              <div style={{ marginBottom: 6 }}>
                <Text strong>报价内容</Text>
              </div>
              <Input.TextArea
                rows={4}
                placeholder="请输入报价内容（选填）"
                value={quoteContent}
                onChange={(e) => setQuoteContent(e.target.value)}
                maxLength={2000}
                showCount
              />
            </Col>
          </Row>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Space size={12} wrap>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入模型名称"
              style={{ width: 220 }}
              value={qKw}
              onChange={(e) => setQKw(e.target.value)}
              onPressEnter={handleQuoteSearch}
            />
            <Select
              style={{ width: 160 }}
              value={qOnline}
              onChange={setQOnline}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'online', label: '已上架' },
                { value: 'offline', label: '已下架' },
              ]}
            />
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              style={{ minWidth: 180 }}
              value={qChannel}
              onChange={setQChannel}
              placeholder="请选择渠道"
              options={channelOptions}
            />
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              style={{ minWidth: 180 }}
              value={qOutput}
              onChange={setQOutput}
              placeholder="请选择输出模态"
              options={MODALS}
            />
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleQuoteSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleQuoteReset}>
                重置
              </Button>
            </Space>
          </Space>
        </div>
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#fafafa',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text strong>批量折扣：</Text>
          <InputNumber
            min={1}
            max={100}
            step={1}
            precision={0}
            style={{ width: 100 }}
            value={discount}
            onChange={(v) => setDiscount(typeof v === 'number' ? v : 80)}
            addonAfter="折"
          />
          <Text type="secondary" style={{ fontSize: 13 }}>
            对外报价 = 对外售价 × {discount}%
          </Text>
          <div style={{ flex: 1 }} />
          <Button onClick={() => applyBatchDiscount('selected')}>应用到选中</Button>
          <Button type="primary" onClick={() => applyBatchDiscount('all')}>
            应用到全部
          </Button>
        </div>
        <Table<ModelItem>
          rowKey="id"
          dataSource={quoteFiltered}
          scroll={{ x: 'max-content' }}
          rowSelection={{
            selectedRowKeys: qSelectedKeys,
            onChange: setQSelectedKeys,
          }}
          pagination={{ pageSize: 6, showTotal: (t) => `共 ${t} 条记录` }}
          columns={[
            {
              title: '模型名称',
              dataIndex: 'name',
              width: 220,
              fixed: 'left',
              ellipsis: true,
              render: (v: string) => <Text>{v}</Text>,
            },
            {
              title: '状态',
              dataIndex: 'online',
              width: 100,
              align: 'center',
              render: (v: boolean) =>
                v ? <Tag color="green">已上架</Tag> : <Tag color="red">已下架</Tag>,
            },
            {
              title: '渠道',
              dataIndex: 'apiConfigs',
              width: 200,
              render: (_: unknown, r: ModelItem) => {
                const list = r.apiConfigs ?? []
                if (!list.length) return <Text type="secondary">—</Text>
                const unique = Array.from(new Set(list.map((a) => a.channelId)))
                return (
                  <Space size={[4, 4]} wrap>
                    {unique.map((cid) => (
                      <Tag key={cid} color="blue">
                        {channelNameMap[cid] ?? '—'}
                      </Tag>
                    ))}
                  </Space>
                )
              },
            },
            {
              title: '输出模态',
              dataIndex: 'outputModals',
              width: 140,
              render: (v: string[]) =>
                v && v.length ? v.join('，') : <Text type="secondary">—</Text>,
            },
            {
              title: '上下文',
              dataIndex: 'contextWindow',
              width: 130,
              align: 'right',
              render: (v: number | undefined) =>
                v != null ? v.toLocaleString() : <Text type="secondary">—</Text>,
            },
            {
              title: '最大输出Token',
              dataIndex: 'maxOutputToken',
              width: 140,
              align: 'right',
              render: (v: number) =>
                v != null ? v.toLocaleString() : <Text type="secondary">—</Text>,
            },
            {
              title: '成本价（元/千Token）',
              dataIndex: 'id',
              width: 240,
              render: (_: string, r: ModelItem) => {
                const cb = costBreakdown(r)
                if (r.pricingMode === 'token') {
                  return (
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      {(['input', 'output', 'cacheRead', 'cacheCreate'] as PriceKey[]).map(
                        (pk) =>
                          cb[pk] > 0 && (
                            <span key={pk}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {PRICE_LABELS[pk]}
                              </Text>{' '}
                              <Text style={{ color: '#fa8c16' }}>¥{cb[pk].toFixed(4)}</Text>
                            </span>
                          ),
                      )}
                    </Space>
                  )
                }
                return (
                  <Text style={{ color: '#fa8c16' }}>¥{cb.output.toFixed(4)}</Text>
                )
              },
            },
            {
              title: '对外售价（元/千Token）',
              dataIndex: 'id',
              width: 240,
              render: (_: string, r: ModelItem) => {
                const sb = sellBreakdown(r)
                if (r.pricingMode === 'token') {
                  return (
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      {(['input', 'output', 'cacheRead', 'cacheCreate'] as PriceKey[]).map(
                        (pk) =>
                          sb[pk] > 0 && (
                            <span key={pk}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {PRICE_LABELS[pk]}
                              </Text>{' '}
                              <Text style={{ color: '#2f6bff' }}>¥{sb[pk].toFixed(4)}</Text>
                            </span>
                          ),
                      )}
                    </Space>
                  )
                }
                return (
                  <Text style={{ color: '#2f6bff' }}>¥{sb.output.toFixed(4)}</Text>
                )
              },
            },
            {
              title: '折扣',
              dataIndex: 'id',
              width: 220,
              render: (_: string, r: ModelItem) => {
                const sb = sellBreakdown(r)
                const allKeys: PriceKey[] =
                  r.pricingMode === 'token'
                    ? (['input', 'output', 'cacheRead', 'cacheCreate'] as PriceKey[]).filter(
                        (k) => sb[k] > 0,
                      )
                    : ['output']
                return (
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {allKeys.map((pk) => (
                      <div key={pk} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 11, width: 56 }}>
                          {PRICE_LABELS[pk]}
                        </Text>
                        <InputNumber
                          size="small"
                          min={1}
                          max={100}
                          step={1}
                          precision={0}
                          placeholder="折扣"
                          style={{ flex: 1, minWidth: 0 }}
                          value={discountValues[qk(r.id, pk)] ?? null}
                          addonAfter="折"
                          onChange={(val) => {
                            const d = typeof val === 'number' ? val : null
                            setDiscountValues((prev) => ({
                              ...prev,
                              [qk(r.id, pk)]: d,
                            }))
                            if (d != null && sb[pk] > 0) {
                              const price =
                                Math.round(sb[pk] * (d / 100) * 10000) / 10000
                              setQuoteValues((prev) => ({
                                ...prev,
                                [qk(r.id, pk)]: price,
                              }))
                            }
                          }}
                        />
                      </div>
                    ))}
                  </Space>
                )
              },
            },
            {
              title: '对外报价',
              dataIndex: 'id',
              width: 240,
              fixed: 'right',
              render: (_: string, r: ModelItem) => {
                const sb = sellBreakdown(r)
                const allKeys: PriceKey[] =
                  r.pricingMode === 'token'
                    ? (['input', 'output', 'cacheRead', 'cacheCreate'] as PriceKey[]).filter(
                        (k) => sb[k] > 0,
                      )
                    : ['output']
                return (
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {allKeys.map((pk) => (
                      <div key={pk} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 11, width: 56 }}>
                          {PRICE_LABELS[pk]}
                        </Text>
                        <InputNumber
                          size="small"
                          min={0}
                          step={0.01}
                          precision={4}
                          placeholder="请输入"
                          style={{ flex: 1, minWidth: 0 }}
                          value={quoteValues[qk(r.id, pk)] ?? null}
                          addonBefore="¥"
                          onChange={(val) => {
                            const p = typeof val === 'number' ? val : null
                            setQuoteValues((prev) => ({
                              ...prev,
                              [qk(r.id, pk)]: p,
                            }))
                            if (p != null && p > 0 && sb[pk] > 0) {
                              const d = Math.round((p / sb[pk]) * 100)
                              setDiscountValues((prev) => ({
                                ...prev,
                                [qk(r.id, pk)]: Math.min(100, Math.max(1, d)),
                              }))
                            }
                          }}
                        />
                      </div>
                    ))}
                  </Space>
                )
              },
            },
          ]}
        />
      </Modal>

      {/* 报价单预览确认 */}
      <Modal
        title="报价单预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        onOk={confirmQuote}
        okText="确认生成"
        cancelText="返回修改"
        centered
        width={900}
        destroyOnClose
      >
        <div style={{ background: '#fff', padding: 16, border: '1px solid #eef0f4', borderRadius: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>报价单</div>
            <div style={{ marginTop: 4 }}>QUOTATION</div>
          </div>
          <Row gutter={24} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Space>
                <Text type="secondary">报价公司：</Text>
                <Text strong>{companyName.trim() || '—'}</Text>
              </Space>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Space>
                <Text type="secondary">报价日期：</Text>
                <Text strong>{quoteDate?.format('YYYY-MM-DD') ?? '—'}</Text>
              </Space>
            </Col>
          </Row>
          {quoteContent.trim() && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: '#fafafa',
                borderRadius: 6,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
              }}
            >
              {quoteContent.trim()}
            </div>
          )}
          <Divider style={{ margin: '8px 0 16px' }} />
          <Table<ModelItem>
            size="small"
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
            dataSource={models.filter((m) => qSelectedKeys.includes(m.id as React.Key))}
            columns={[
              { title: '序号', width: 60, fixed: 'left', render: (_v, _r, i) => i + 1 },
              {
                title: '模型名称',
                dataIndex: 'name',
                width: 260,
                fixed: 'left',
                ellipsis: true,
              },
              {
                title: '最大输出Token',
                dataIndex: 'maxOutputToken',
                width: 130,
                align: 'right',
                render: (v: number) =>
                  v != null ? v.toLocaleString() : <Text type="secondary">—</Text>,
              },
              {
                title: '市场价（元/千Token）',
                width: 220,
                render: (_: unknown, r: ModelItem) => {
                  const sb = sellBreakdown(r)
                  if (r.pricingMode === 'token') {
                    return (
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        {(['input', 'output', 'cacheRead', 'cacheCreate'] as PriceKey[]).map(
                          (pk) =>
                            sb[pk] > 0 && (
                              <div
                                key={pk}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                }}
                              >
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {PRICE_LABELS[pk]}
                                </Text>
                                <Text>¥{sb[pk].toFixed(4)}</Text>
                              </div>
                            ),
                        )}
                      </Space>
                    )
                  }
                  return <div style={{ textAlign: 'right' }}>¥{sb.output.toFixed(4)}</div>
                },
              },
              {
                title: '折扣',
                width: 140,
                render: (_: unknown, r: ModelItem) => {
                  const sb = sellBreakdown(r)
                  const allKeys: PriceKey[] =
                    r.pricingMode === 'token'
                      ? (['input', 'output', 'cacheRead', 'cacheCreate'] as PriceKey[]).filter(
                          (k) => sb[k] > 0,
                        )
                      : ['output']
                  const hasAny = allKeys.some((k) => discountValues[qk(r.id, k)] != null)
                  if (!hasAny)
                    return (
                      <div style={{ textAlign: 'right' }}>
                        <Text type="secondary">—</Text>
                      </div>
                    )
                  return (
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      {allKeys.map((pk) => (
                        <div
                          key={pk}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {PRICE_LABELS[pk]}
                          </Text>
                          <Text>
                            {discountValues[qk(r.id, pk)] != null
                              ? `${discountValues[qk(r.id, pk)]}折`
                              : '—'}
                          </Text>
                        </div>
                      ))}
                    </Space>
                  )
                },
              },
              {
                title: '合作价格（元/千Token）',
                width: 220,
                fixed: 'right',
                render: (_: unknown, r: ModelItem) => {
                  const sb = sellBreakdown(r)
                  const allKeys: PriceKey[] =
                    r.pricingMode === 'token'
                      ? (['input', 'output', 'cacheRead', 'cacheCreate'] as PriceKey[]).filter(
                          (k) => sb[k] > 0,
                        )
                      : ['output']
                  const hasAny = allKeys.some((k) => quoteValues[qk(r.id, k)] != null)
                  if (r.pricingMode === 'token') {
                    return (
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        {allKeys.map((pk) => {
                          const p = quoteValues[qk(r.id, pk)]
                          return (
                            <div
                              key={pk}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 8,
                              }}
                            >
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {PRICE_LABELS[pk]}
                              </Text>
                              {p != null ? (
                                <Text strong style={{ color: '#2f6bff' }}>
                                  ¥{p.toFixed(4)}
                                </Text>
                              ) : (
                                <Text type="secondary">—</Text>
                              )}
                            </div>
                          )
                        })}
                        {!hasAny && (
                          <Text type="secondary" style={{ textAlign: 'right' }}>
                            —
                          </Text>
                        )}
                      </Space>
                    )
                  }
                  const p = quoteValues[qk(r.id, 'output')]
                  return (
                    <div style={{ textAlign: 'right' }}>
                      {p != null ? (
                        <Text strong style={{ color: '#2f6bff' }}>
                          ¥{p.toFixed(4)}
                        </Text>
                      ) : (
                        <Text type="secondary">—</Text>
                      )}
                    </div>
                  )
                },
              },
            ]}
          />
        </div>
      </Modal>
    </div>
  )
}
