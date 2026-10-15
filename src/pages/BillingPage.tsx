import React, { useState, useMemo, useEffect } from 'react'
import {
  Card,
  Table,
  Input,
  Button,
  DatePicker,
  Space,
  Form,
  Tooltip,
  Tag,
  Modal,
  message,
  Alert,
  Select,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ProfileOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { demoVoucherCompactTs, demoVoucherStamp, useAccountLedgers, useOrderDetails } from '../store'
import { SHOW_ENTERPRISE } from '../constants'
import type {
  AccountLedger,
  AccountOperationType,
  FundAccount,
  OrderDetail,
  OrderStatus,
  ResourceStatus,
} from '../types'
import {
  ACCOUNT_OPERATION_LABEL,
  FUND_ACCOUNT_LABEL,
  ORDER_PRODUCT_TYPE_LABEL,
  ORDER_TYPE_LABEL,
  ORDER_STATUS_LABEL,
  RESOURCE_STATUS_LABEL,
} from '../types'
import RequirementDot from '../components/RequirementDot'
import ConsoleVoucher from './ConsoleVoucher'
import AccountOverview from './AccountOverview'

export type BillingSubPage =
  | 'accountOverview'
  | 'accountDetail'
  | 'voucher'
  | 'recharge'
  | 'orderDetail'
  | 'consumption'
  | 'invoice'

interface Props {
  subPage: BillingSubPage
  onSubChange: (v: BillingSubPage) => void
  /** 评审模式放行的费用二级菜单；不传表示全部展示 */
  allowedSubs?: BillingSubPage[]
}

const LEFT_MENU: { key: BillingSubPage; label: string }[] = [
  { key: 'accountOverview', label: '账户概览' },
  { key: 'voucher', label: '代金券' },
  { key: 'accountDetail', label: '账户明细' },
  { key: 'recharge', label: '充值记录' },
  { key: 'orderDetail', label: '订单明细' },
  { key: 'consumption', label: '消费明细' },
  { key: 'invoice', label: '发票信息' },
]

interface LedgerSearchForm {
  operatorPhone: string
  operatorAccountId: string
  operationType: AccountOperationType | ''
  fundAccount: FundAccount | ''
  dateRange: [Dayjs, Dayjs] | null
}

const emptyLedgerSearch: LedgerSearchForm = {
  operatorPhone: '',
  operatorAccountId: '',
  operationType: '',
  fundAccount: '',
  dateRange: null,
}

interface OrderSearchForm {
  dateRange: [Dayjs, Dayjs] | null
  productName: string
  orderNo: string
}
const emptyOrderSearch: OrderSearchForm = {
  dateRange: null,
  productName: '',
  orderNo: '',
}

interface ConsumptionSearchForm {
  productName: string
  voucherCode: string
  dateRange: [Dayjs, Dayjs] | null
  fundAccount: ConsumptionFundAccount | ''
}
const emptyConsumptionSearch: ConsumptionSearchForm = {
  productName: '',
  voucherCode: '',
  dateRange: null,
  fundAccount: '',
}

const { RangePicker } = DatePicker

/** 订单详情弹窗内的小节标题 */
function OrderDetailGroup({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', padding: '12px 0 1px' }}>
      {title}
    </div>
  )
}

/** 订单详情弹窗的行：左侧灰色标签 + 右侧深色值，标签可带 ⓘ 说明 */
function OrderDetailRow({
  label,
  tooltip,
  children,
}: {
  label: string
  tooltip?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '11px 0',
      }}
    >
      <span
        style={{
          width: 120,
          flexShrink: 0,
          fontSize: 13,
          color: '#8c8c8c',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {label}
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined style={{ color: '#c0c4cc', fontSize: 12 }} />
          </Tooltip>
        )}
      </span>
      <span style={{ fontSize: 13, color: '#1f2937', wordBreak: 'break-all' }}>{children}</span>
    </div>
  )
}

function OrderDetailSection() {
  const allOrders = useOrderDetails()
  const [form, setForm] = useState<OrderSearchForm>(emptyOrderSearch)
  const [applied, setApplied] = useState<OrderSearchForm>(emptyOrderSearch)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<OrderDetail | null>(null)

  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
      if (!SHOW_ENTERPRISE && o.productName.includes('企业版')) return false
      if (applied.productName) {
        if (!o.productName.toLowerCase().includes(applied.productName.trim().toLowerCase()))
          return false
      }
      if (applied.orderNo) {
        if (!o.orderNo.toLowerCase().includes(applied.orderNo.trim().toLowerCase())) return false
      }
      if (applied.dateRange && applied.dateRange[0] && applied.dateRange[1]) {
        const t = dayjs(o.createdAt)
        if (t.isBefore(applied.dateRange[0], 'day')) return false
        if (t.isAfter(applied.dateRange[1], 'day')) return false
      }
      return true
    })
  }, [allOrders, applied])

  const handleSearch = () => {
    setApplied({ ...form })
    setPage(1)
  }
  const handleReset = () => {
    setForm(emptyOrderSearch)
    setApplied(emptyOrderSearch)
    setPage(1)
  }
  const handleExport = () => {
    message.success('已提交导出，稍后可在通知中心下载')
  }

  const statusTagColor = (s: OrderStatus) => {
    if (s === 'paid') return 'success'
    if (s === 'pending') return 'warning'
    return 'error'
  }

  const resourceStatusTagColor = (s?: ResourceStatus) => {
    if (s === 'active') return 'success'
    if (s === 'expired') return 'default'
    if (s === 'inactive') return 'warning'
    return 'default'
  }

  const columns: ColumnsType<OrderDetail> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 280,
      fixed: 'left',
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 240,
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
      width: 110,
      render: (v: OrderDetail['productType']) => ORDER_PRODUCT_TYPE_LABEL[v] ?? v,
    },
    {
      title: '订单类型',
      dataIndex: 'orderType',
      key: 'orderType',
      width: 100,
      render: (v: OrderDetail['orderType']) => ORDER_TYPE_LABEL[v] ?? v,
    },
    {
      title: '实付金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) =>
        v === 0 ? (
          <span>¥{v}</span>
        ) : (
          <span style={{ fontWeight: 600 }}>¥{v.toFixed(2)}</span>
        ),
    },
    {
      title: '支付状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: OrderStatus) => (
        <Tag color={statusTagColor(v)} style={{ borderRadius: 6 }}>
          {ORDER_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '交易时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
    },
    {
      title: '资源生效时间',
      dataIndex: 'grantedAt',
      key: 'grantedAt',
      width: 170,
    },
    {
      title: '资源状态',
      dataIndex: 'resourceStatus',
      key: 'resourceStatus',
      width: 110,
      render: (v?: ResourceStatus) =>
        v ? (
          <Tag color={resourceStatusTagColor(v)} style={{ borderRadius: 6 }}>
            {RESOURCE_STATUS_LABEL[v] ?? v}
          </Tag>
        ) : (
          <span style={{ color: '#bfbfbf' }}>—</span>
        ),
    },
    {
      title: '失效时间',
      dataIndex: 'expireAt',
      key: 'expireAt',
      width: 170,
      render: (v?: string) => v ?? <span style={{ color: '#bfbfbf' }}>—</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_v, r) => (
        <Button
          type="link"
          style={{ padding: 0, color: '#2f6bff' }}
          onClick={() => {
            setCurrentOrder(r)
            setDetailOpen(true)
          }}
        >
          查看详情
        </Button>
      ),
    },
  ]

  const paginationConfig: TablePaginationConfig = {
    current: page,
    pageSize,
    total: filtered.length,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (t) => `共 ${t} 条`,
    onChange: (p, ps) => {
      setPage(p)
      setPageSize(ps)
    },
  }

  return (
    <>
      {/* 搜索卡 */}
      <Card
        variant="borderless"
        style={{
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #eef0f4',
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Form layout="vertical" style={{ marginBottom: 0 }}>
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
              <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                产品名称：
              </span>
              <Input
                placeholder="请输入产品名称"
                style={{ width: 200 }}
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                onPressEnter={handleSearch}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                订单号：
              </span>
              <Input
                placeholder="请输入订单号"
                style={{ width: 200 }}
                value={form.orderNo}
                onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
                onPressEnter={handleSearch}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                操作时间：
              </span>
              <RangePicker
                style={{ width: 320 }}
                placeholder={['年/月/日', '年/月/日']}
                value={form.dateRange}
                onChange={(v) => setForm({ ...form, dateRange: v as any })}
              />
            </div>
            <Space size={12}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                style={{ borderRadius: 6, background: '#2f6bff', borderColor: '#2f6bff' }}
              >
                搜索
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                style={{ borderRadius: 6 }}
              >
                导出数据
              </Button>
            </Space>
          </div>
        </Form>
      </Card>

      {/* 列表卡 */}
      <Card
        variant="borderless"
        style={{ borderRadius: 8, border: '1px solid #eef0f4' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<OrderDetail>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={filtered.length > pageSize ? paginationConfig : false}
          scroll={{ x: 'max-content' }}
          size="middle"
        />
      </Card>

      {/* 订单详情弹窗 */}
      <Modal
        centered
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
        title={null}
        closable={false}
      >
        {currentOrder && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '4px 4px 0' }}>
            {/* 标题行 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                marginBottom: 6,
                borderBottom: '1px solid #eef0f4',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>订单详情</span>
              <CloseOutlined
                style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14 }}
                onClick={() => setDetailOpen(false)}
              />
            </div>

            <OrderDetailGroup title="订单信息" />
            <OrderDetailRow label="订单号">{currentOrder.orderNo}</OrderDetailRow>
            <OrderDetailRow label="产品名称">{currentOrder.productName}</OrderDetailRow>
            <OrderDetailRow label="产品类型">
              {ORDER_PRODUCT_TYPE_LABEL[currentOrder.productType]}
            </OrderDetailRow>
            <OrderDetailRow label="订单类型">{ORDER_TYPE_LABEL[currentOrder.orderType]}</OrderDetailRow>

            <OrderDetailGroup title="费用信息" />
            <OrderDetailRow label="官网目录总价">
              ¥{(currentOrder.originalPrice ?? 0).toFixed(2)}
            </OrderDetailRow>
            <OrderDetailRow label="优惠金额">
              ¥{(currentOrder.discountAmount ?? 0).toFixed(2)}
            </OrderDetailRow>
            <OrderDetailRow label="实付金额" tooltip="官网目录总价 − 优惠金额">
              <span style={{ fontWeight: 600 }}>¥{currentOrder.amount.toFixed(2)}</span>
            </OrderDetailRow>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ---------------- 消费明细 ---------------- */

/** 单个计费项：一次调用中某一类用量及其费用，用量为 null 表示该次调用不涉及此项 */
interface ConsumptionItem {
  quantity: number | null
  cost: number
  unit?: string
}

/**
 * 消费明细流水：按需计费产品按次出账，一条流水对应一次模型调用。
 * multiplierName / multiplier 为本次调用实际命中的倍率档位，费用按倍率后的单价计算。
 */
interface ConsumptionDetail {
  id: string
  serialNo: string
  occurredAt: string
  productName: string
  multiplierName: string
  multiplier: number
  input: ConsumptionItem
  output: ConsumptionItem
  cache: ConsumptionItem
  cacheCreate: ConsumptionItem
  cacheRead: ConsumptionItem
  media: ConsumptionItem
  /** 本笔扣费账户：cash 现金主账户全额支付、voucher 卡券账户全额抵扣；缺省视为 cash */
  fundAccount?: ConsumptionFundAccount
  /** 本笔由卡券账户抵扣的金额（元），仅 voucher 有值 */
  voucherDeduction?: number
  /** 参与抵扣的券明细（券名称 + 券码），一张或多张，与「账户明细」代金券流水的券码一一对应 */
  voucherItems?: ConsumptionVoucherItem[]
}

/** 参与本笔抵扣的一张代金券：名称与券码，对账以券码为准 */
interface ConsumptionVoucherItem {
  name: string
  code: string
}

/** 扣费账户枚举：与账户明细「扣费账户」同源，一笔消费只走一个资金池 */
type ConsumptionFundAccount = 'cash' | 'voucher'

const ITEM = (quantity: number | null, cost: number, unit?: string): ConsumptionItem => ({
  quantity,
  cost,
  unit,
})

/** 该次调用不涉及此计费项 */
const BLANK_ITEM: ConsumptionItem = { quantity: null, cost: 0 }

/** 费用总额 = 各计费项费用之和 */
const consumptionTotal = (r: ConsumptionDetail) =>
  [r.input, r.output, r.cache, r.cacheCreate, r.cacheRead, r.media].reduce(
    (sum, item) => sum + item.cost,
    0,
  )

/** 金额展示：最多保留 6 位小数并去掉无意义的尾随 0 */
const formatAmount = (v: number) => String(Number(v.toFixed(6)))

/** CSV 单元格转义：统一加引号，内部引号翻倍 */
const consumptionCsvCell = (value: string | number): string =>
  `"${String(value).replace(/"/g, '""')}"`

/** 本笔的扣费构成，未标注时视为全额现金 */
const consumptionFundOf = (r: ConsumptionDetail): ConsumptionFundAccount =>
  r.fundAccount ?? 'cash'

const CONSUMPTION_FUND_LABEL: Record<ConsumptionFundAccount, string> = {
  cash: '现金主账户',
  voucher: '卡券账户',
}

const CONSUMPTION_SEED: ConsumptionDetail[] = [
  /** 现金主账户全额支付的一笔消费，无券码 */
  {
    id: 'cd-19',
    serialNo: 'MXXF-2609170931552840116',
    occurredAt: '2026-09-17 09:31:55',
    productName: 'glm-5.2',
    multiplierName: '标准倍率',
    multiplier: 1,
    input: ITEM(12000, 3.6),
    output: ITEM(30000, 33.6),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
    fundAccount: 'cash',
  },
  /**
   * 以下两笔与「账户明细」代金券流水（DJQDK 前缀）按券码一一对应，
   * 演示卡券账户抵扣：一笔消费要么全额卡券抵扣、要么全额现金主账户支付；
   * 一张券余额不足时可叠加多张券组合抵扣（cd-17 双券组合）。
   */
  {
    id: 'cd-17',
    serialNo: `MXXF-${demoVoucherCompactTs(31)}2273091`,
    occurredAt: demoVoucherStamp(31),
    productName: 'glm-5.2',
    multiplierName: '标准倍率',
    multiplier: 1,
    input: ITEM(3200, 2),
    output: ITEM(48000, 48),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
    fundAccount: 'voucher',
    voucherDeduction: 50,
    voucherItems: [
      { name: '七夕限定模型券', code: 'DQ-202609-000101' },
      { name: '七夕限定模型券', code: 'DQ-202609-000102' },
    ],
  },
  {
    id: 'cd-18',
    serialNo: `MXXF-${demoVoucherCompactTs(21)}8841227`,
    occurredAt: demoVoucherStamp(21),
    productName: 'kimi-k3',
    multiplierName: '尊享加速倍率',
    multiplier: 2,
    input: ITEM(2100, 1.25),
    output: ITEM(56750, 28.75),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
    fundAccount: 'voucher',
    voucherDeduction: 30,
    voucherItems: [{ name: '七夕限定模型券', code: 'DQ-202609-000101' }],
  },
  {
    id: 'cd-01',
    serialNo: 'MXXF-2609121446271316186',
    occurredAt: '2026-09-12 14:44:55',
    productName: 'kimi-k3',
    multiplierName: '尊享加速倍率',
    multiplier: 2,
    input: ITEM(78, 0.00106),
    output: ITEM(3111, 0.211366),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-02',
    serialNo: 'MXXF-2609101346310914914',
    occurredAt: '2026-09-10 13:46:30',
    productName: 'qwen3.8-flash-next',
    multiplierName: '标准倍率',
    multiplier: 1,
    input: ITEM(122, 0.000093),
    output: ITEM(135, 0.000347),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-03',
    serialNo: 'MXXF-2609100946561221425',
    occurredAt: '2026-09-10 09:46:18',
    productName: 'dodo-og-g-6-astra',
    multiplierName: '标准倍率',
    multiplier: 1,
    input: BLANK_ITEM,
    output: BLANK_ITEM,
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-04',
    serialNo: 'MXXF-2609100944392785118',
    occurredAt: '2026-09-10 09:44:09',
    productName: 'dodo-og-g-6-astra',
    multiplierName: '标准倍率',
    multiplier: 1,
    input: BLANK_ITEM,
    output: BLANK_ITEM,
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-05',
    serialNo: 'MXXF-2609091857585348050',
    occurredAt: '2026-09-09 18:57:31',
    productName: 'dodo-og-g-6-astra',
    multiplierName: '尊享加速倍率',
    multiplier: 2,
    input: ITEM(904, 0.002089),
    output: ITEM(489, 0.005648),
    cache: ITEM(57856, 0.013365),
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-06',
    serialNo: 'MXXF-2609091857292211770',
    occurredAt: '2026-09-09 18:57:13',
    productName: 'dodo-og-g-6-astra',
    multiplierName: '尊享加速倍率',
    multiplier: 2,
    input: ITEM(1581, 0.003653),
    output: ITEM(142, 0.001641),
    cache: ITEM(56832, 0.013129),
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-07',
    serialNo: 'MXXF-2609091622451180362',
    occurredAt: '2026-09-09 16:22:31',
    productName: 'deepseek-v4-flash',
    multiplierName: '独享资源倍率',
    multiplier: 3,
    input: ITEM(1204, 0.006502),
    output: ITEM(892, 0.007213),
    cache: ITEM(20480, 0.000614),
    cacheCreate: ITEM(4096, 0.001229),
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-08',
    serialNo: 'MXXF-2609091108342051776',
    occurredAt: '2026-09-09 11:08:12',
    productName: 'glm-5.2',
    multiplierName: '在线客服倍率',
    multiplier: 2,
    input: ITEM(642, 0.00321),
    output: ITEM(2048, 0.04096),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: ITEM(10240, 0.00512),
    media: BLANK_ITEM,
  },
  {
    id: 'cd-09',
    serialNo: 'MXXF-2609081745120933548',
    occurredAt: '2026-09-08 17:44:50',
    productName: 'doubao-seedream-5.0-pro',
    multiplierName: '高清出图倍率',
    multiplier: 2,
    input: BLANK_ITEM,
    output: BLANK_ITEM,
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: ITEM(2, 1.5, '张'),
  },
  {
    id: 'cd-10',
    serialNo: 'MXXF-2609081530274102663',
    occurredAt: '2026-09-08 15:30:04',
    productName: 'dodo-og-gpt-5-6-luna',
    multiplierName: '算力加速倍率',
    multiplier: 5,
    input: ITEM(320, 0.001234),
    output: ITEM(1536, 0.029491),
    cache: BLANK_ITEM,
    cacheCreate: ITEM(8192, 0.004915),
    cacheRead: ITEM(16384, 0.002458),
    media: BLANK_ITEM,
  },
  {
    id: 'cd-11',
    serialNo: 'MXXF-2609081015442271095',
    occurredAt: '2026-09-08 10:15:21',
    productName: 'kimi-k3',
    multiplierName: '标准倍率',
    multiplier: 1,
    input: ITEM(96, 0.00013),
    output: ITEM(4021, 0.140735),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-12',
    serialNo: 'MXXF-2609071932084416220',
    occurredAt: '2026-09-07 19:31:45',
    productName: 'doubao-seedance-2.0',
    multiplierName: '视频生成倍率',
    multiplier: 1.2,
    input: BLANK_ITEM,
    output: BLANK_ITEM,
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: ITEM(5, 6.0, '秒'),
  },
  {
    id: 'cd-13',
    serialNo: 'MXXF-2609071446320188745',
    occurredAt: '2026-09-07 14:46:09',
    productName: 'kimi-k2.6',
    multiplierName: '活动优惠倍率',
    multiplier: 1,
    input: ITEM(2048, 0.002458),
    output: ITEM(512, 0.001536),
    cache: ITEM(3072, 0.000307),
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-14',
    serialNo: 'MXXF-2609070932151140286',
    occurredAt: '2026-09-07 09:31:52',
    productName: 'qwen3.8-flash-next',
    multiplierName: '夜间闲时倍率',
    multiplier: 2,
    input: ITEM(88, 0.000067),
    output: ITEM(145, 0.000372),
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
  {
    id: 'cd-15',
    serialNo: 'MXXF-2609061658420077314',
    occurredAt: '2026-09-06 16:58:19',
    productName: 'glm-5.2',
    multiplierName: '标准倍率',
    multiplier: 1,
    input: BLANK_ITEM,
    output: BLANK_ITEM,
    cache: BLANK_ITEM,
    cacheCreate: BLANK_ITEM,
    cacheRead: BLANK_ITEM,
    media: BLANK_ITEM,
  },
]

/** 计费项单元格：第一行用量，第二行该项费用 */
function ConsumptionItemCell({ item }: { item: ConsumptionItem }) {
  if (item.quantity === null) return <span style={{ color: '#bfbfbf' }}>--</span>
  return (
    <div>
      <div>{`${item.quantity}${item.unit ?? ''}`}</div>
      <div style={{ color: '#2f6bff', fontSize: 12 }}>{`¥${formatAmount(item.cost)}`}</div>
    </div>
  )
}

function ConsumptionSection({ initialVoucherCode = '' }: { initialVoucherCode?: string }) {
  const [form, setForm] = useState<ConsumptionSearchForm>({
    ...emptyConsumptionSearch,
    voucherCode: initialVoucherCode,
  })
  const [applied, setApplied] = useState<ConsumptionSearchForm>({
    ...emptyConsumptionSearch,
    voucherCode: initialVoucherCode,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    return CONSUMPTION_SEED.filter((c) => {
      if (applied.productName) {
        if (!c.productName.toLowerCase().includes(applied.productName.trim().toLowerCase()))
          return false
      }
      if (applied.voucherCode.trim()) {
        const code = applied.voucherCode.trim()
        if (!(c.voucherItems ?? []).some((v) => v.code === code)) return false
      }
      if (applied.dateRange && applied.dateRange[0] && applied.dateRange[1]) {
        const t = dayjs(c.occurredAt)
        if (t.isBefore(applied.dateRange[0], 'day')) return false
        if (t.isAfter(applied.dateRange[1], 'day')) return false
      }
      if (applied.fundAccount) {
        if (consumptionFundOf(c) !== applied.fundAccount) return false
      }
      return true
    })
  }, [applied])

  const handleSearch = () => {
    setApplied({ ...form })
    setPage(1)
  }
  const handleReset = () => {
    setForm(emptyConsumptionSearch)
    setApplied(emptyConsumptionSearch)
    setPage(1)
  }
  const handleExport = () => {
    if (!filtered.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    const header = [
      '流水号',
      '费用发生时间',
      '产品名称',
      '倍率名称',
      '倍率',
      '输入',
      '输入费用(元)',
      '输出',
      '输出费用(元)',
      '缓存',
      '缓存费用(元)',
      '缓存创建',
      '缓存创建费用(元)',
      '缓存读取',
      '缓存读取费用(元)',
      '媒体信息',
      '媒体费用(元)',
      '扣费账户',
      '卡券信息',
      '费用总额(元)',
    ]
    const lines = [header.map(consumptionCsvCell).join(',')]
    const itemCell = (item: ConsumptionItem) =>
      item.quantity === null ? '' : `${item.quantity}${item.unit ?? ''}`
    const itemFee = (item: ConsumptionItem) =>
      item.quantity === null ? '' : item.cost.toFixed(6)
    filtered.forEach((r) => {
      const items = r.voucherItems ?? []
      lines.push(
        [
          r.serialNo,
          r.occurredAt,
          r.productName,
          r.multiplierName,
          `${r.multiplier}x`,
          itemCell(r.input),
          itemFee(r.input),
          itemCell(r.output),
          itemFee(r.output),
          itemCell(r.cache),
          itemFee(r.cache),
          itemCell(r.cacheCreate),
          itemFee(r.cacheCreate),
          itemCell(r.cacheRead),
          itemFee(r.cacheRead),
          itemCell(r.media),
          itemFee(r.media),
          /** 扣费账户列：现金主账户 / 卡券账户 */
          CONSUMPTION_FUND_LABEL[consumptionFundOf(r)],
          /** 卡券信息列：展示卡名称和券码，多张券以 / 分隔；现金行为空 */
          items.map((v) => `${v.name}（${v.code}）`).join(' / '),
          consumptionTotal(r).toFixed(6),
        ]
          .map(consumptionCsvCell)
          .join(','),
      )
    })
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `消费明细_${dayjs().format('YYYYMMDD_HHmm')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  const itemColumn = (title: string, get: (r: ConsumptionDetail) => ConsumptionItem, width = 110) => ({
    title,
    key: title,
    width,
    align: 'right' as const,
    render: (_v: unknown, r: ConsumptionDetail) => <ConsumptionItemCell item={get(r)} />,
  })

  const columns: ColumnsType<ConsumptionDetail> = [
    {
      title: '流水号',
      dataIndex: 'serialNo',
      key: 'serialNo',
      width: 190,
      fixed: 'left',
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ wordBreak: 'break-all' }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '费用发生时间',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      width: 170,
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 180,
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontWeight: 500 }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '倍率信息',
      key: 'multiplier',
      width: 150,
      render: (_v, r) => (
        <div>
          <div>{r.multiplierName}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{`${r.multiplier}x`}</div>
        </div>
      ),
    },
    itemColumn('输入', (r) => r.input),
    itemColumn('输出', (r) => r.output),
    itemColumn('缓存', (r) => r.cache),
    itemColumn('缓存创建', (r) => r.cacheCreate),
    itemColumn('缓存读取', (r) => r.cacheRead),
    itemColumn('媒体信息', (r) => r.media, 120),
    {
      title: (
        <Space size={6}>
          扣费账户
          <RequirementDot
            title="消费明细 · 扣费账户"
            sections={[
              {
                label: '',
                items: [
                  '1.增加扣费账户信息；展示该笔消费用现金主账户扣费还是卡券账户扣费。如为卡券账户，则鼠标悬浮展示所有本次扣费卡券信息，包括卡名称和卡号 ；',
                  '2.导出账单也增加该列，并增加卡券信息列，展示卡名称和券码；',
                  '3.增加扣费账户筛选条件。',
                  '4.扣费逻辑：',
                  '    如用户有在有效期内的卡片，优先扣除卡内费用，如存在多张卡券，而其中1张不足以支付本次金额，则支持从多张卡片中扣除。 如所有卡片扣费结束仍不足以支付本次消费总额，则最后一张扣费卡片计为负数。不从现金主账户扣款。',
                  '    如用户无有效卡片，则直接从现金主账户扣款。',
                ],
              },
            ]}
          />
        </Space>
      ),
      key: 'fundAccount',
      width: 190,
      render: (_v, r) => {
        const mode = consumptionFundOf(r)
        const items = r.voucherItems ?? []
        if (mode !== 'voucher' || items.length === 0) {
          return <span>{CONSUMPTION_FUND_LABEL[mode]}</span>
        }
        return (
          <Space size={6}>
            <span>{CONSUMPTION_FUND_LABEL[mode]}</span>
            <Tooltip
              title={
                <div>
                  {items.map((v) => (
                    <div key={v.code}>{`${v.name}（${v.code}）`}</div>
                  ))}
                </div>
              }
            >
              <ProfileOutlined style={{ color: '#2f6bff', cursor: 'pointer' }} />
            </Tooltip>
          </Space>
        )
      },
    },
    {
      title: '费用总额（元）',
      key: 'total',
      width: 130,
      fixed: 'right',
      align: 'right',
      render: (_v, r) => {
        const total = consumptionTotal(r)
        return <span style={{ fontWeight: total > 0 ? 600 : 400 }}>{formatAmount(total)}</span>
      },
    },
  ]

  const paginationConfig: TablePaginationConfig = {
    current: page,
    pageSize,
    total: filtered.length,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (t) => `共 ${t} 条`,
    onChange: (p, ps) => {
      setPage(p)
      setPageSize(ps)
    },
  }

  return (
    <>
      <Alert
        type="info"
        showIcon
        message="按需计费产品按次出账，每调用一次进行一次费用统计，若调用一次费用低于¥0.0001，则按最低收费标准¥0.0001收取。"
        style={{ borderRadius: 8, marginBottom: 16 }}
      />

      {/* 搜索卡 */}
      <Card
        variant="borderless"
        style={{ borderRadius: 8, marginBottom: 16, border: '1px solid #eef0f4' }}
        bodyStyle={{ padding: 16 }}
      >
        <Form layout="vertical" style={{ marginBottom: 0 }}>
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
              <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                产品名称：
              </span>
              <Input
                placeholder="请输入产品名称"
                style={{ width: 200 }}
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                onPressEnter={handleSearch}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                券码：
              </span>
              <Input
                placeholder="请输入券码"
                allowClear
                style={{ width: 200 }}
                value={form.voucherCode}
                onChange={(e) => setForm({ ...form, voucherCode: e.target.value })}
                onPressEnter={handleSearch}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                统计周期：
              </span>
              <RangePicker
                style={{ width: 320 }}
                placeholder={['年/月/日', '年/月/日']}
                value={form.dateRange}
                onChange={(v) => setForm({ ...form, dateRange: v as any })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                扣费账户：
              </span>
              <Select
                placeholder="全部"
                allowClear
                style={{ width: 160 }}
                value={form.fundAccount || undefined}
                onChange={(v) =>
                  setForm({ ...form, fundAccount: (v ?? '') as ConsumptionFundAccount | '' })
                }
                options={(Object.keys(CONSUMPTION_FUND_LABEL) as ConsumptionFundAccount[]).map(
                  (k) => ({ value: k, label: CONSUMPTION_FUND_LABEL[k] }),
                )}
              />
            </div>
            <Space size={12} style={{ marginLeft: 'auto' }}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                style={{ borderRadius: 6, background: '#2f6bff', borderColor: '#2f6bff' }}
              >
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset} style={{ borderRadius: 6 }}>
                重置
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                style={{ borderRadius: 6, background: '#52c41a', borderColor: '#52c41a' }}
              >
                导出账单
              </Button>
            </Space>
          </div>
        </Form>
      </Card>

      {/* 列表卡 */}
      <Card
        variant="borderless"
        style={{ borderRadius: 8, border: '1px solid #eef0f4' }}
        bodyStyle={{ padding: 16 }}
      >
        <Table<ConsumptionDetail>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={paginationConfig}
          scroll={{ x: 'max-content' }}
          size="middle"
        />
      </Card>
    </>
  )
}

/** 发票信息：按需求只展示开票口径说明文字，不做额外统计与列表。 */
function InvoiceSection() {
  return (
    <Card variant="borderless" style={{ borderRadius: 8, border: '1px solid #eef0f4' }} bodyStyle={{ padding: 16 }}>
      所有可开票费用应为现金主账户的消费金额，不包括代金券
    </Card>
  )
}

export default function BillingPage({
  subPage,
  onSubChange,
  allowedSubs,
}: Props) {
  /** 评审模式下只保留本次涉及的费用二级菜单 */
  const leftMenu =
    allowedSubs && allowedSubs.length > 0
      ? LEFT_MENU.filter((m) => allowedSubs.includes(m.key))
      : LEFT_MENU
  /** 待带入消费明细的券码：来自本页代金券列表的「查看消费明细」 */
  const [pendingVoucherCode, setPendingVoucherCode] = useState('')

  const ledgers = useAccountLedgers()
  const [form, setForm] = useState<LedgerSearchForm>(emptyLedgerSearch)
  const [applied, setApplied] = useState<LedgerSearchForm>(emptyLedgerSearch)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      if (applied.operatorPhone) {
        if (!l.operatorPhone.includes(applied.operatorPhone)) return false
      }
      if (applied.operatorAccountId) {
        if (
          !l.operatorAccountId
            .toLowerCase()
            .includes(applied.operatorAccountId.trim().toLowerCase())
        )
          return false
      }
      if (applied.operationType) {
        if (l.operationType !== applied.operationType) return false
      }
      if (applied.fundAccount) {
        if (l.fundAccount !== applied.fundAccount) return false
      }
      if (applied.dateRange && applied.dateRange[0] && applied.dateRange[1]) {
        const t = dayjs(l.operatedAt)
        if (t.isBefore(applied.dateRange[0], 'day')) return false
        if (t.isAfter(applied.dateRange[1], 'day')) return false
      }
      return true
    })
  }, [applied, ledgers])

  const handleSearch = () => {
    setApplied({ ...form })
    setPage(1)
  }
  const handleReset = () => {
    setForm(emptyLedgerSearch)
    setApplied(emptyLedgerSearch)
    setPage(1)
  }
  const handleExport = () => {
    message.success('已提交导出，稍后可在通知中心下载')
  }

  const ledgerColumns: ColumnsType<AccountLedger> = [
    {
      title: '流水号',
      dataIndex: 'serialNo',
      key: 'serialNo',
      width: 240,
      fixed: 'left',
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'operatedAt',
      key: 'operatedAt',
      width: 170,
    },
    {
      title: '操作人',
      key: 'operator',
      width: 200,
      render: (_v, r) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{r.operatorPhone}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>账号ID: {r.operatorAccountId}</div>
        </div>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 140,
      render: (v: AccountOperationType) => ACCOUNT_OPERATION_LABEL[v] ?? v,
    },
    {
      title: '扣费账户',
      dataIndex: 'fundAccount',
      key: 'fundAccount',
      width: 160,
      render: (v: FundAccount, r: AccountLedger) => (
        <div style={{ lineHeight: 1.6 }}>
          <Tag color={v === 'voucher' ? 'gold' : 'blue'} style={{ marginRight: 0 }}>
            {FUND_ACCOUNT_LABEL[v] ?? v}
          </Tag>
          {v === 'voucher' && r.voucherCode && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.voucherCode}</div>
          )}
        </div>
      ),
    },
    {
      title: '变动前金额（元）',
      dataIndex: 'amountBefore',
      key: 'amountBefore',
      width: 150,
      align: 'right',
      render: (v: number) => v.toFixed(6),
    },
    {
      title: '变动金额（元）',
      dataIndex: 'amountChange',
      key: 'amountChange',
      width: 150,
      align: 'right',
      render: (v: number, r: AccountLedger) => {
        const increase =
          r.fundAccount === 'voucher' &&
          (r.operationType === 'voucher_issue' || r.operationType === 'voucher_refund')
        return increase ? (
          <span style={{ color: '#16a34a' }}>+{v.toFixed(6)}</span>
        ) : (
          <span style={{ color: '#ef4444' }}>-{v.toFixed(6)}</span>
        )
      },
    },
    {
      title: '变动后金额（元）',
      dataIndex: 'amountAfter',
      key: 'amountAfter',
      width: 150,
      align: 'right',
      render: (v: number) => v.toFixed(6),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 240,
      fixed: 'right',
      ellipsis: true,
      render: (v?: string) =>
        v ? (
          <Tooltip title={v}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          <span style={{ color: '#bfbfbf' }}>—</span>
        ),
    },
  ]

  const ledgerPagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total: filteredLedgers.length,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (t) => `共 ${t} 条`,
    onChange: (p, ps) => {
      setPage(p)
      setPageSize(ps)
    },
  }

  return (
    <div style={{ display: 'flex', background: '#f0f2f5', minHeight: 'calc(100vh - 52px)' }}>
      {/* 左侧菜单 */}
      <div
        style={{
          width: 180,
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #eef0f4',
          padding: '16px 0',
        }}
      >
        <div
          style={{
            padding: '0 20px 12px',
            fontSize: 14,
            fontWeight: 600,
            color: '#1f2937',
          }}
        >
          费用管理
        </div>
        {leftMenu.map((m) => {
          const active = subPage === m.key
          return (
            <div
              key={m.key}
              onClick={() => {
                /** 手动切换菜单时清除待带入的券码，避免下次进消费明细被意外过滤 */
                setPendingVoucherCode('')
                onSubChange(m.key)
              }}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: 14,
                color: active ? '#2f6bff' : '#475569',
                background: active ? '#eff4ff' : 'transparent',
                borderLeft: active ? '3px solid #2f6bff' : '3px solid transparent',
                fontWeight: active ? 600 : 400,
              }}
            >
              {m.label}
            </div>
          )
        })}
      </div>

      {/* 右侧内容区 */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {subPage === 'accountOverview' ? (
          <AccountOverview
            onViewVouchers={
              leftMenu.some((m) => m.key === 'voucher') ? () => onSubChange('voucher') : undefined
            }
          />
        ) : subPage === 'accountDetail' ? (
          <>
            {/* 搜索卡 */}
            <Card
              variant="borderless"
              style={{
                borderRadius: 8,
                marginBottom: 16,
                border: '1px solid #eef0f4',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Form layout="vertical" style={{ marginBottom: 0 }}>
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
                    <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                      操作人手机号：
                    </span>
                    <Input
                      placeholder="请输入操作人手机号"
                      style={{ width: 200 }}
                      value={form.operatorPhone}
                      onChange={(e) => setForm({ ...form, operatorPhone: e.target.value })}
                      onPressEnter={handleSearch}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                      操作人账号ID：
                    </span>
                    <Input
                      placeholder="请输入操作人账号ID"
                      style={{ width: 200 }}
                      value={form.operatorAccountId}
                      onChange={(e) => setForm({ ...form, operatorAccountId: e.target.value })}
                      onPressEnter={handleSearch}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                      操作类型：
                    </span>
                    <Select
                      placeholder="请选择操作类型"
                      style={{ width: 200 }}
                      allowClear
                      value={form.operationType || undefined}
                      onChange={(v) => setForm({ ...form, operationType: (v ?? '') as AccountOperationType | '' })}
                      options={(Object.keys(ACCOUNT_OPERATION_LABEL) as AccountOperationType[]).map((k) => ({
                        value: k,
                        label: ACCOUNT_OPERATION_LABEL[k],
                      }))}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                      扣费账户：
                    </span>
                    <Select
                      placeholder="请选择扣费账户"
                      style={{ width: 180 }}
                      allowClear
                      value={form.fundAccount || undefined}
                      onChange={(v) => setForm({ ...form, fundAccount: (v ?? '') as FundAccount | '' })}
                      options={(Object.keys(FUND_ACCOUNT_LABEL) as FundAccount[]).map((k) => ({
                        value: k,
                        label: FUND_ACCOUNT_LABEL[k],
                      }))}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: '#333', whiteSpace: 'nowrap' }}>
                      操作时间：
                    </span>
                    <RangePicker
                      style={{ width: 360 }}
                      placeholder={['年/月/日', '年/月/日']}
                      value={form.dateRange}
                      onChange={(v) => setForm({ ...form, dateRange: v as any })}
                    />
                  </div>
                  <Space size={12} style={{ marginLeft: 'auto' }}>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleSearch}
                      style={{ borderRadius: 6, background: '#2f6bff', borderColor: '#2f6bff' }}
                    >
                      查询
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={handleReset} style={{ borderRadius: 6 }}>
                      重置
                    </Button>
                    <Button
                      type="primary"
                      icon={<ExportOutlined />}
                      onClick={handleExport}
                      style={{ borderRadius: 6, background: '#2f6bff', borderColor: '#2f6bff' }}
                    >
                      导出
                    </Button>
                  </Space>
                </div>
              </Form>
            </Card>

            {/* 列表卡 */}
            <Card
              variant="borderless"
              style={{ borderRadius: 8, border: '1px solid #eef0f4' }}
              bodyStyle={{ padding: 16 }}
            >
              <Table<AccountLedger>
                rowKey="id"
                columns={ledgerColumns}
                dataSource={filteredLedgers}
                pagination={ledgerPagination}
                scroll={{ x: 'max-content' }}
                size="middle"
              />
            </Card>
          </>
        ) : subPage === 'voucher' ? (
          <ConsoleVoucher
            onViewConsumption={(code) => {
              setPendingVoucherCode(code)
              onSubChange('consumption')
            }}
          />
        ) : subPage === 'orderDetail' ? (
          <OrderDetailSection />
        ) : subPage === 'consumption' ? (
          <ConsumptionSection initialVoucherCode={pendingVoucherCode} />
        ) : subPage === 'invoice' ? (
          <InvoiceSection />
        ) : (
          <Card
            variant="borderless"
            style={{ borderRadius: 8, border: '1px solid #eef0f4', minHeight: 400 }}
            bodyStyle={{ padding: 40 }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 0',
                color: '#999',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 16 }}>
                「
                {LEFT_MENU.find((m) => m.key === subPage)?.label}
                」页面建设中...
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
