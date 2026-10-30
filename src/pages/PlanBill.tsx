import { useState, useMemo } from 'react'
import {
  Breadcrumb,
  Card,
  Input,
  Button,
  DatePicker,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Modal,
  Statistic,
  Progress,
  message,
  Tooltip,
} from 'antd'
import {
  SearchOutlined,
  ExportOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { SHOW_ENTERPRISE } from '../constants'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography
const { RangePicker } = DatePicker

interface PlanBillRow {
  id: string
  orderNo: string
  userNickname: string
  userPhone: string
  userAccount: string
  userEmail: string
  productName: string
  productType: 'tokenPlan' | 'resourcePack'
  orderType: 'new' | 'renew'
  amount: number
  discount: number
  originalAmount: number
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  createdAt: string
  grantedAt: string
  expireAt: string
  resourceStatus: 'active' | 'expired' | 'inactive'
  totalTokens: string
  remainingTokens: string
  operator: string
  paymentMethod: string
  paymentChannel: string
}

interface CallDetailRow {
  id: string
  callTime: string
  model: string
  tokens: number
  cacheHitRate: number
  cost: number
}

const MODEL_LIST = ['豆包大模型2.1', '豆包图像创作模型5.0', '豆包声音复刻模型2.0', '推理模型-4', '推理模型-Pro']

function generateCallDetails(row: PlanBillRow): CallDetailRow[] {
  const baseTime = new Date(row.createdAt.replace(/-/g, '/'))
  const details: CallDetailRow[] = []
  const count = 15 + Math.floor(Math.random() * 20)
  for (let i = 0; i < count; i++) {
    const time = new Date(baseTime.getTime() + i * 3600 * 1000 * (2 + Math.random() * 6))
    const model = MODEL_LIST[Math.floor(Math.random() * MODEL_LIST.length)]
    const tokens = Math.floor(1000 + Math.random() * 50000)
    const cacheHitRate = Math.random()
    const cost = (tokens / 1000) * (0.002 + Math.random() * 0.008)
    details.push({
      id: `${row.id}-${i}`,
      callTime: `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`,
      model,
      tokens,
      cacheHitRate,
      cost: Math.round(cost * 10000) / 10000,
    })
  }
  return details.sort((a, b) => b.callTime.localeCompare(a.callTime))
}

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  tokenPlan: 'Token Plan套餐',
  resourcePack: '加油包',
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  new: '新购',
  renew: '续费',
}

const STATUS_LABEL: Record<string, string> = {
  paid: '已支付',
  pending: '待支付',
  failed: '支付失败',
  refunded: '已退款',
}

const STATUS_COLOR: Record<string, string> = {
  paid: 'green',
  pending: 'orange',
  failed: 'red',
  refunded: 'default',
}

const RESOURCE_STATUS_LABEL: Record<string, string> = {
  active: '生效中',
  expired: '已失效',
  inactive: '未生效',
}

const RESOURCE_STATUS_COLOR: Record<string, string> = {
  active: 'green',
  expired: 'default',
  inactive: 'orange',
}

const rows: PlanBillRow[] = [
  {
    id: '1',
    orderNo: 'ORD20260826001',
    userNickname: '智能助手',
    userPhone: '155****3215',
    userAccount: 'ACC202606230005',
    userEmail: 'user001@example.com',
    productName: '新手套餐（Lite）',
    productType: 'tokenPlan',
    orderType: 'new',
    amount: 39,
    discount: 65,
    originalAmount: 60,
    status: 'paid',
    createdAt: '2026-08-26 10:23:15',
    grantedAt: '2026-08-26 10:23:20',
    expireAt: '2026-09-26 10:23:20',
    resourceStatus: 'active',
    totalTokens: '3,500,000',
    remainingTokens: '2,380,000',
    operator: '管理员',
    paymentMethod: '微信支付',
    paymentChannel: '微信',
  },
  {
    id: '2',
    orderNo: 'ORD20260826002',
    userNickname: '企业AI部',
    userPhone: '138****7890',
    userAccount: 'ACC202607150012',
    userEmail: 'enterprise@example.com',
    productName: '企业团队版套餐',
    productType: 'tokenPlan',
    orderType: 'new',
    amount: 1999,
    discount: 80,
    originalAmount: 2499,
    status: 'paid',
    createdAt: '2026-08-26 09:45:02',
    grantedAt: '2026-08-26 09:45:10',
    expireAt: '2027-08-26 09:45:10',
    resourceStatus: 'active',
    totalTokens: '50,000,000',
    remainingTokens: '48,200,000',
    operator: '管理员',
    paymentMethod: '对公转账',
    paymentChannel: '对公转账',
  },
  {
    id: '3',
    orderNo: 'ORD20260826003',
    userNickname: '开发者小张',
    userPhone: '186****1234',
    userAccount: 'ACC202608010003',
    userEmail: 'dev@example.com',
    productName: '豆包大模型2.1 特价尊享包',
    productType: 'resourcePack',
    orderType: 'new',
    amount: 299,
    discount: 75,
    originalAmount: 399,
    status: 'paid',
    createdAt: '2026-08-26 08:30:00',
    grantedAt: '2026-08-26 08:30:05',
    expireAt: '2026-11-26 08:30:05',
    resourceStatus: 'active',
    totalTokens: '10,000,000',
    remainingTokens: '6,850,000',
    operator: '系统',
    paymentMethod: '微信支付',
    paymentChannel: '微信',
  },
  {
    id: '4',
    orderNo: 'ORD20260825004',
    userNickname: '内容创作者',
    userPhone: '159****5678',
    userAccount: 'ACC202608100007',
    userEmail: 'creator@example.com',
    productName: 'Token Plan 个人版套餐',
    productType: 'tokenPlan',
    orderType: 'renew',
    amount: 576,
    discount: 80,
    originalAmount: 720,
    status: 'paid',
    createdAt: '2026-08-25 22:10:33',
    grantedAt: '2026-08-25 22:10:35',
    expireAt: '2027-08-25 22:10:35',
    resourceStatus: 'active',
    totalTokens: '12,000,000',
    remainingTokens: '11,980,000',
    operator: '系统自动',
    paymentMethod: '支付宝',
    paymentChannel: '余额扣减',
  },
  {
    id: '5',
    orderNo: 'ORD20260825005',
    userNickname: '私人投研',
    userPhone: '137****9012',
    userAccount: 'ACC202608200011',
    userEmail: 'research@example.com',
    productName: '私人投研分析部加油包',
    productType: 'resourcePack',
    orderType: 'new',
    amount: 999,
    discount: 77,
    originalAmount: 1299,
    status: 'pending',
    createdAt: '2026-08-25 16:55:48',
    grantedAt: '—',
    expireAt: '—',
    resourceStatus: 'inactive',
    totalTokens: '—',
    remainingTokens: '—',
    operator: '管理员',
    paymentMethod: '待支付',
    paymentChannel: '—',
  },
  {
    id: '6',
    orderNo: 'ORD20260825006',
    userNickname: '图像工作室',
    userPhone: '133****3456',
    userAccount: 'ACC202608150009',
    userEmail: 'studio@example.com',
    productName: '豆包图像创作模型5.0',
    productType: 'resourcePack',
    orderType: 'renew',
    amount: 199,
    discount: 90,
    originalAmount: 221,
    status: 'paid',
    createdAt: '2026-08-25 14:22:10',
    grantedAt: '2026-08-25 14:22:12',
    expireAt: '2026-12-25 14:22:12',
    resourceStatus: 'active',
    totalTokens: '5,000,000',
    remainingTokens: '3,200,000',
    operator: '系统自动',
    paymentMethod: '微信支付',
    paymentChannel: '余额扣减',
  },
  {
    id: '7',
    orderNo: 'ORD20260824007',
    userNickname: '声音复刻项目',
    userPhone: '189****7788',
    userAccount: 'ACC202608220015',
    userEmail: 'voice@example.com',
    productName: '豆包声音复刻模型2.0',
    productType: 'resourcePack',
    orderType: 'new',
    amount: 399,
    discount: 80,
    originalAmount: 499,
    status: 'failed',
    createdAt: '2026-08-24 11:08:22',
    grantedAt: '—',
    expireAt: '—',
    resourceStatus: 'inactive',
    totalTokens: '—',
    remainingTokens: '—',
    operator: '管理员',
    paymentMethod: '支付宝',
    paymentChannel: '支付宝',
  },
]

interface SearchForm {
  orderNo: string
  productName: string
  userAccount: string
  userPhone: string
  productType: string[]
  orderType: string[]
  status: string[]
  resourceStatus: string[]
  dateRange: any
}

const initialSearch: SearchForm = {
  orderNo: '',
  productName: '',
  userAccount: '',
  userPhone: '',
  productType: [],
  orderType: [],
  status: [],
  resourceStatus: [],
  dateRange: null,
}

export default function PlanBill() {
  const [search, setSearch] = useState<SearchForm>(initialSearch)
  const [appliedSearch, setAppliedSearch] = useState<SearchForm>(initialSearch)
  const [callDetailOpen, setCallDetailOpen] = useState(false)
  const [callDetailData, setCallDetailData] = useState<CallDetailRow[]>([])
  const [callDetailRow, setCallDetailRow] = useState<PlanBillRow | null>(null)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!SHOW_ENTERPRISE && r.productName.includes('企业')) return false
      if (appliedSearch.orderNo && !r.orderNo.toLowerCase().includes(appliedSearch.orderNo.toLowerCase())) return false
      if (appliedSearch.productName && !r.productName.toLowerCase().includes(appliedSearch.productName.toLowerCase())) return false
      if (appliedSearch.userAccount && !r.userAccount.toLowerCase().includes(appliedSearch.userAccount.toLowerCase())) return false
      if (appliedSearch.userPhone && !r.userPhone.includes(appliedSearch.userPhone)) return false
      if (appliedSearch.productType.length > 0 && !appliedSearch.productType.includes(r.productType)) return false
      if (appliedSearch.orderType.length > 0 && !appliedSearch.orderType.includes(r.orderType)) return false
      if (appliedSearch.status.length > 0 && !appliedSearch.status.includes(r.status)) return false
      if (appliedSearch.resourceStatus.length > 0 && !appliedSearch.resourceStatus.includes(r.resourceStatus)) return false
      if (appliedSearch.dateRange && appliedSearch.dateRange.length === 2) {
        const [start, end] = appliedSearch.dateRange
        const created = new Date(r.createdAt).getTime()
        if (created < start.valueOf() || created > end.valueOf()) return false
      }
      return true
    })
  }, [appliedSearch])

  const handleSearch = () => {
    setAppliedSearch({ ...search })
  }

  const handleReset = () => {
    setSearch(initialSearch)
    setAppliedSearch(initialSearch)
  }

  const handleExport = () => {
    message.success('导出成功')
  }

  const columns: ColumnsType<PlanBillRow> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 170,
      fixed: 'left',
      render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: '用户信息',
      key: 'userInfo',
      width: 220,
      render: (_v, r) => (
        <div style={{ lineHeight: 1.8 }}>
          <div style={{ fontWeight: 500 }}>
            <UserOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
            {r.userNickname}
          </div>
          <div>
            <PhoneOutlined style={{ color: '#8c8c8c', marginRight: 4, fontSize: 11 }} />
            {r.userPhone}
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.userAccount}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 220,
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontWeight: 500 }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '产品类型',
      dataIndex: 'productType',
      key: 'productType',
      width: 120,
      render: (v: string) => PRODUCT_TYPE_LABEL[v] ?? v,
    },
    {
      title: '订单类型',
      dataIndex: 'orderType',
      key: 'orderType',
      width: 100,
      render: (v: string) => ORDER_TYPE_LABEL[v] ?? v,
    },
    {
      title: '套餐总量（Tokens）',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 150,
      align: 'right',
      render: (v: string) =>
        v === '—' ? <Text type="secondary">—</Text> : <Text>{v}</Text>,
    },
    {
      title: '原价',
      dataIndex: 'originalAmount',
      key: 'originalAmount',
      width: 100,
      align: 'right',
      render: (v: number) => <>¥{v.toFixed(2)}</>,
    },
    {
      title: '优惠金额',
      key: 'discountAmount',
      width: 110,
      align: 'right',
      render: (_v, r) => {
        const discountAmount = r.originalAmount - r.amount
        return discountAmount > 0 ? (
          <Text type="secondary">
            -¥{discountAmount.toFixed(2)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        )
      },
    },
    {
      title: '实付金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: '#2f6bff' }}>¥{v.toFixed(2)}</span>
      ),
    },
    {
      title: '支付状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v]} style={{ borderRadius: 6 }}>
          {STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 110,
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: '交易时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
    },
    {
      title: '套餐状态',
      dataIndex: 'resourceStatus',
      key: 'resourceStatus',
      width: 100,
      render: (v: string) => (
        <Tag color={RESOURCE_STATUS_COLOR[v]} style={{ borderRadius: 6 }}>
          {RESOURCE_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '资源生效时间',
      dataIndex: 'grantedAt',
      key: 'grantedAt',
      width: 170,
      render: (v: string) => (v === '—' ? <Text type="secondary">—</Text> : v),
    },
    {
      title: '失效时间',
      dataIndex: 'expireAt',
      key: 'expireTime',
      width: 170,
      render: (v: string) => {
        if (v === '—') return <Text type="secondary">—</Text>
        return v
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_v, r) =>
        r.status === 'paid' ? (
          <Space size={4}>
            <Button
              type="link"
              style={{ padding: 0, color: '#2f6bff' }}
              onClick={() => {
                setCallDetailRow(r)
                setCallDetailData(generateCallDetails(r))
                setCallDetailOpen(true)
              }}
            >
              消耗明细
            </Button>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: '账单管理' }, { title: '套餐与加油包订单' }]}
      />

      <Card
        variant="borderless"
        styles={{ body: { padding: 16 } }}
        style={{ marginBottom: 16 }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: 24,
            rowGap: 16,
            alignItems: 'end',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>订单号：</Text>
            <Input
              placeholder="请输入订单号"
              allowClear
              style={{ width: 180 }}
              value={search.orderNo}
              onChange={(e) => setSearch({ ...search, orderNo: e.target.value })}
              onPressEnter={handleSearch}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>产品名称：</Text>
            <Input
              placeholder="请输入产品名称"
              allowClear
              style={{ width: 180 }}
              value={search.productName}
              onChange={(e) => setSearch({ ...search, productName: e.target.value })}
              onPressEnter={handleSearch}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>账户ID：</Text>
            <Input
              placeholder="请输入账户ID"
              allowClear
              style={{ width: 180 }}
              value={search.userAccount}
              onChange={(e) => setSearch({ ...search, userAccount: e.target.value })}
              onPressEnter={handleSearch}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>手机号：</Text>
            <Input
              placeholder="请输入手机号"
              allowClear
              style={{ width: 160 }}
              value={search.userPhone}
              onChange={(e) => setSearch({ ...search, userPhone: e.target.value })}
              onPressEnter={handleSearch}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>产品类型：</Text>
            <Select
              mode="multiple"
              allowClear
              maxTagCount={1}
              placeholder="请选择"
              style={{ width: 180 }}
              value={search.productType}
              onChange={(v) => {
                const allVals = ['tokenPlan', 'resourcePack']
                setSearch({
                  ...search,
                  productType: v.includes('all')
                    ? allVals
                    : v.filter((x) => x !== 'all'),
                })
              }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'tokenPlan', label: 'Token Plan套餐' },
                { value: 'resourcePack', label: '加油包' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>订单类型：</Text>
            <Select
              mode="multiple"
              allowClear
              maxTagCount={1}
              placeholder="请选择"
              style={{ width: 180 }}
              value={search.orderType}
              onChange={(v) => {
                const allVals = ['new', 'renew']
                setSearch({
                  ...search,
                  orderType: v.includes('all')
                    ? allVals
                    : v.filter((x) => x !== 'all'),
                })
              }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'new', label: '新购' },
                { value: 'renew', label: '续费' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>支付状态：</Text>
            <Select
              mode="multiple"
              allowClear
              maxTagCount={1}
              placeholder="请选择"
              style={{ width: 180 }}
              value={search.status}
              onChange={(v) => {
                const allVals = ['paid', 'pending', 'failed', 'refunded']
                setSearch({
                  ...search,
                  status: v.includes('all')
                    ? allVals
                    : v.filter((x) => x !== 'all'),
                })
              }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'paid', label: '已支付' },
                { value: 'pending', label: '待支付' },
                { value: 'failed', label: '支付失败' },
                { value: 'refunded', label: '已退款' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>套餐状态：</Text>
            <Select
              mode="multiple"
              allowClear
              maxTagCount={1}
              placeholder="请选择"
              style={{ width: 180 }}
              value={search.resourceStatus}
              onChange={(v) => {
                const allVals = ['active', 'expired', 'inactive']
                setSearch({
                  ...search,
                  resourceStatus: v.includes('all')
                    ? allVals
                    : v.filter((x) => x !== 'all'),
                })
              }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'active', label: '生效中' },
                { value: 'expired', label: '已失效' },
                { value: 'inactive', label: '未生效' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text>交易时间：</Text>
            <RangePicker
              style={{ width: 300 }}
              placeholder={['年/月/日', '年/月/日']}
              value={search.dateRange}
              onChange={(v) => setSearch({ ...search, dateRange: v })}
            />
          </div>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ borderRadius: 6 }}
            >
              搜索
            </Button>
            <Button onClick={handleReset} style={{ borderRadius: 6 }}>
              重置
            </Button>
          </Space>
        </div>
      </Card>

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Space size={8}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>账单列表</span>
            <RequirementDot
              title="套餐与加油包订单 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1.页面按照交易时间倒序展示；字段如图',
                    '2.根据订单号、产品名称、账户id、手机号、模糊搜索',
                    '3.待支付订单5分钟后失效，置于已取消状态；',
                    '4.原价=售价； 优惠金额=售价-实付',
                    '5.列表支持导出',
                    '6.已支付的订单展示消耗明细。点击后跳转到套餐消耗明细并筛选当前套餐。',
                  ],
                },
              ]}
            />
          </Space>
          <Space>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              style={{ borderRadius: 6 }}
            >
              导出
            </Button>
          </Space>
        </div>

        <Table<PlanBillRow>
          rowKey="id"
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
          columns={columns}
        />
      </Card>

      <Modal
        centered
        open={callDetailOpen}
        onCancel={() => setCallDetailOpen(false)}
        footer={null}
        width={780}
        destroyOnClose
        title={
          <Space size={6}>
            消耗明细
            <RequirementDot
              title="消耗明细弹窗 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1. 入口：账单列表操作列点击「消耗明细」打开，仅展示该订单的调用记录。',
                    '2. 顶部汇总：总成本（¥ 四位小数）、总消耗费用（¥ 两位小数），取当前订单全部调用记录求和。',
                    '3. 明细列：调用时间、调用模型、Token消耗（千分位）、缓存命中率（进度条）、消耗费用（¥ 四位小数）。',
                    '4. 按调用时间倒序排列，每页 10 条。',
                  ],
                },
              ]}
            />
          </Space>
        }
      >
        {callDetailRow && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: 16,
                padding: '16px 20px',
                background: '#f7f9fc',
                borderRadius: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <Statistic
                  title="总成本"
                  value={callDetailData.reduce((sum, d) => sum + d.cost, 0)}
                  precision={4}
                  prefix="¥"
                  valueStyle={{ color: '#2f6bff', fontSize: 22 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Statistic
                  title="总消耗费用"
                  value={callDetailData.reduce((sum, d) => sum + d.cost, 0)}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#333', fontSize: 22 }}
                />
              </div>
            </div>

            <Table<CallDetailRow>
              rowKey="id"
              dataSource={callDetailData}
              size="small"
              pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: '调用时间', dataIndex: 'callTime', key: 'callTime', width: 170 },
                {
                  title: '调用模型',
                  dataIndex: 'model',
                  key: 'model',
                  width: 180,
                  render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
                },
                {
                  title: 'Token消耗',
                  dataIndex: 'tokens',
                  key: 'tokens',
                  width: 120,
                  align: 'right',
                  render: (v: number) => v.toLocaleString(),
                },
                {
                  title: '缓存命中率',
                  dataIndex: 'cacheHitRate',
                  key: 'cacheHitRate',
                  width: 140,
                  render: (v: number) => (
                    <Progress
                      percent={Math.round(v * 10000) / 100}
                      size="small"
                      strokeColor={v > 0.7 ? '#52c41a' : v > 0.4 ? '#faad14' : '#ff4d4f'}
                    />
                  ),
                },
                {
                  title: '消耗费用',
                  dataIndex: 'cost',
                  key: 'cost',
                  width: 110,
                  align: 'right',
                  render: (v: number) => (
                    <Text type={v === 0 ? 'secondary' : undefined}>
                      ¥{v.toFixed(4)}
                    </Text>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
