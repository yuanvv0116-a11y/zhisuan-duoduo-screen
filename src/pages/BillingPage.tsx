import React, { useState, useMemo } from 'react'
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
  Descriptions,
  message,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useAccountLedgers, useOrderDetails } from '../store'
import type {
  AccountLedger,
  AccountOperationType,
  OrderDetail,
  OrderStatus,
  ResourceStatus,
} from '../types'
import {
  ACCOUNT_OPERATION_LABEL,
  ORDER_PRODUCT_TYPE_LABEL,
  ORDER_TYPE_LABEL,
  ORDER_STATUS_LABEL,
  RESOURCE_STATUS_LABEL,
} from '../types'

type BillingSubPage =
  | 'accountOverview'
  | 'accountDetail'
  | 'recharge'
  | 'orderDetail'
  | 'consumption'
  | 'invoice'

interface Props {
  subPage: BillingSubPage
  onSubChange: (v: BillingSubPage) => void
}

const LEFT_MENU: { key: BillingSubPage; label: string }[] = [
  { key: 'accountOverview', label: '账户概览' },
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
  dateRange: [Dayjs, Dayjs] | null
}

const emptyLedgerSearch: LedgerSearchForm = {
  operatorPhone: '',
  operatorAccountId: '',
  operationType: '',
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

const { RangePicker } = DatePicker

function DetailRow({
  label,
  value,
  copyable,
  divider = true,
}: {
  label: React.ReactNode
  value: React.ReactNode
  copyable?: boolean
  divider?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (typeof value === 'string' || typeof value === 'number') {
      navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: divider ? 18 : 0,
        borderBottom: divider ? '1px solid #f0f0f0' : 'none',
      }}
    >
      <span style={{ fontSize: 14, color: '#94a3b8', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          color: '#1f2937',
          textAlign: 'right',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '60%',
          wordBreak: 'break-all',
        }}
      >
        {value}
        {copyable && (
          <Tooltip title={copied ? '已复制' : '复制'}>
            <ExportOutlined
              style={{ color: '#bfbfbf', cursor: 'pointer', fontSize: 12 }}
              onClick={handleCopy}
            />
          </Tooltip>
        )}
      </span>
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
    if (s === 'refunded') return 'default'
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
        width={600}
        destroyOnClose
        title={null}
        closable={true}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
            订单详情
          </div>
          {currentOrder && (
            <>
              <Descriptions
                column={2}
                size="small"
                bordered
                labelStyle={{ width: 100, color: '#8c8c8c', background: '#fafafa' }}
                contentStyle={{ color: '#333' }}
              >
                <Descriptions.Item label="订单号">
                  <span
                    style={{
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      wordBreak: 'break-all',
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(currentOrder.orderNo)
                      message.success('已复制')
                    }}
                  >
                    {currentOrder.orderNo}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="订单类型">
                  {ORDER_TYPE_LABEL[currentOrder.orderType]}
                </Descriptions.Item>
                <Descriptions.Item label="产品名称">
                  <span title={currentOrder.productName}>{currentOrder.productName}</span>
                </Descriptions.Item>
                <Descriptions.Item label="支付状态">
                  <Tag color={statusTagColor(currentOrder.status)} style={{ borderRadius: 6 }}>
                    {ORDER_STATUS_LABEL[currentOrder.status]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="订单总价">
                  ¥{(currentOrder.originalPrice ?? 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="优惠金额">
                  ¥{(currentOrder.discountAmount ?? 0).toFixed(2)}
                </Descriptions.Item>
                <Descriptions.Item label="实付金额" span={2}>
                  <span style={{ fontWeight: 600, color: '#ef4444', fontSize: 18 }}>
                    ¥{currentOrder.amount.toFixed(2)}
                  </span>
                  <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 16 }}>
                    支付渠道：{currentOrder.paymentChannel ?? '—'}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              <div style={{ height: 12 }} />

              <Descriptions
                title="资源信息"
                column={2}
                size="small"
                bordered
                labelStyle={{ width: 100, color: '#8c8c8c', background: '#fafafa' }}
                contentStyle={{ color: '#333' }}
              >
                <Descriptions.Item label="资源状态">
                  {currentOrder.resourceStatus ? (
                    <Tag
                      color={resourceStatusTagColor(currentOrder.resourceStatus)}
                      style={{ borderRadius: 6 }}
                    >
                      {RESOURCE_STATUS_LABEL[currentOrder.resourceStatus]}
                    </Tag>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="生效时间">
                  {currentOrder.grantedAt || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="失效时间">
                  {currentOrder.expireAt ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="总量">
                  {currentOrder.totalTokens
                    ? `${currentOrder.totalTokens} Tokens`
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="余量" span={2}>
                  <span
                    style={{
                      color:
                        currentOrder.remainingTokens === '0'
                          ? '#ef4444'
                          : '#333',
                    }}
                  >
                    {currentOrder.remainingTokens
                      ? `${currentOrder.remainingTokens} Tokens`
                      : '—'}
                  </span>
                </Descriptions.Item>
              </Descriptions>

              <div style={{ height: 12 }} />

              <Descriptions
                column={2}
                size="small"
                bordered
                labelStyle={{ width: 100, color: '#8c8c8c', background: '#fafafa' }}
                contentStyle={{ color: '#333' }}
              >
                <Descriptions.Item label="创建时间">
                  {currentOrder.createdAt}
                </Descriptions.Item>
                <Descriptions.Item label="支付时间">
                  {currentOrder.payAt ?? '—'}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

export default function BillingPage({ subPage, onSubChange }: Props) {
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
      render: (v: number) => (
        <span style={{ color: '#ef4444' }}>-{v.toFixed(6)}</span>
      ),
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
        {LEFT_MENU.map((m) => {
          const active = subPage === m.key
          return (
            <div
              key={m.key}
              onClick={() => onSubChange(m.key)}
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
        {subPage === 'accountDetail' ? (
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
                    <Input
                      placeholder="请选择操作类型"
                      style={{ width: 200 }}
                      value={form.operationType}
                      onChange={(e) => setForm({ ...form, operationType: e.target.value as any })}
                      onPressEnter={handleSearch}
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
        ) : subPage === 'orderDetail' ? (
          <OrderDetailSection />
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
