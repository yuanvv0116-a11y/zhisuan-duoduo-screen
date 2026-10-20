import { useMemo, useState } from 'react'
import { Button, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import {
  CONSUME_ROWS,
  PRODUCT_KIND_LABEL,
  USAGE_STATUS_COLOR,
  USAGE_STATUS_LABEL,
  USAGE_ROWS,
  formatTokens,
  maskPhone,
  remainingTokens,
  type ConsumeRow,
  type ProductKind,
  type UsageRow,
  type UsageStatus,
} from '../planUsageData'

const { Text } = Typography

/** 消耗明细弹窗内的表格列（不含用户与产品信息，头部已展示） */
const detailColumns: ColumnsType<ConsumeRow> = [
  { title: '调用时间', dataIndex: 'callTime', width: 160 },
  {
    title: '使用模型',
    key: 'model',
    width: 230,
    render: (_, r) => (
      <Space direction="vertical" size={0}>
        <span style={{ fontWeight: 500 }}>{r.model}</span>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.endpoint}</Text>
        <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.accountAlias}</Text>
      </Space>
    ),
  },
  { title: '倍率', dataIndex: 'rate', width: 70, render: (v: number) => `${v}x` },
  {
    title: '输入',
    dataIndex: 'inputTokens',
    align: 'right',
    width: 100,
    render: (v: number) => formatTokens(v),
  },
  {
    title: '输出',
    dataIndex: 'outputTokens',
    align: 'right',
    width: 100,
    render: (v: number) => formatTokens(v),
  },
  {
    title: '缓存创建',
    dataIndex: 'cacheCreateTokens',
    align: 'right',
    width: 100,
    render: (v: number) => formatTokens(v),
  },
  {
    title: '缓存读取',
    dataIndex: 'cacheReadTokens',
    align: 'right',
    width: 100,
    render: (v: number) => formatTokens(v),
  },
  {
    title: '成本价',
    dataIndex: 'cost',
    align: 'right',
    width: 100,
    render: (v: number) => <Text style={{ color: '#1677ff' }}>¥{v.toFixed(4)}</Text>,
  },
]

export default function PlanUsageQuery() {
  const [user, setUser] = useState('')
  const [productKind, setProductKind] = useState<ProductKind>()
  const [status, setStatus] = useState<UsageStatus>()
  const [query, setQuery] = useState<{ user: string; productKind?: ProductKind; status?: UsageStatus }>({
    user: '',
  })
  const [detailRow, setDetailRow] = useState<UsageRow | null>(null)

  const filtered = useMemo(
    () =>
      USAGE_ROWS.filter((r) => {
        if (query.user) {
          const kw = query.user.trim().toLowerCase()
          const hit =
            r.userName.toLowerCase().includes(kw) ||
            r.phone.includes(kw) ||
            maskPhone(r.phone).includes(kw) ||
            r.orderNo.toLowerCase().includes(kw)
          if (!hit) return false
        }
        if (query.productKind && r.productKind !== query.productKind) return false
        if (query.status && r.status !== query.status) return false
        return true
      }),
    [query],
  )

  const detailData = useMemo(
    () => (detailRow ? CONSUME_ROWS.filter((c) => c.usageKey === detailRow.key) : []),
    [detailRow],
  )
  const detailCostSum = useMemo(() => detailData.reduce((s, c) => s + c.cost, 0), [detailData])

  const handleSearch = () => setQuery({ user, productKind, status })

  const handleReset = () => {
    setUser('')
    setProductKind(undefined)
    setStatus(undefined)
    setQuery({ user: '' })
  }

  const columns: ColumnsType<UsageRow> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 150,
      render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: '用户信息',
      key: 'user',
      width: 200,
      render: (_, r) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 500 }}>{r.userName}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>{maskPhone(r.phone)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.accountId}</Text>
        </Space>
      ),
    },
    {
      title: '购买产品',
      dataIndex: 'productName',
      width: 200,
    },
    {
      title: '产品类型',
      dataIndex: 'productKind',
      width: 90,
      render: (v: ProductKind) => PRODUCT_KIND_LABEL[v],
    },
    {
      title: '花费金额',
      dataIndex: 'amount',
      align: 'right',
      width: 110,
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: 'Tokens 总量',
      dataIndex: 'totalTokens',
      align: 'right',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: '已用 Tokens',
      key: 'used',
      width: 160,
      render: (_, r) => {
        const percent = Math.min(100, Math.round((r.usedTokens / r.totalTokens) * 100))
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {formatTokens(r.usedTokens)}
            <Text type="secondary" style={{ fontSize: 12 }}>（{percent}%）</Text>
          </span>
        )
      },
    },
    {
      title: '剩余 Tokens',
      key: 'remain',
      align: 'right',
      width: 120,
      render: (_, r) => {
        const remain = remainingTokens(r)
        return remain === 0 ? <Text type="danger">0</Text> : formatTokens(remain)
      },
    },
    { title: '有效期开始', dataIndex: 'validFrom', width: 110 },
    { title: '有效期截止', dataIndex: 'validTo', width: 110 },
    {
      title: '当前状态',
      dataIndex: 'status',
      width: 100,
      render: (v: UsageStatus) => <Tag color={USAGE_STATUS_COLOR[v]}>{USAGE_STATUS_LABEL[v]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 130,
      render: (_, r) =>
        r.status === 'inactive' ? (
          <Tooltip title="套餐尚未生效，暂无消耗明细">
            <Button type="link" size="small" disabled style={{ padding: 0 }}>
              查看消耗明细
            </Button>
          </Tooltip>
        ) : (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailRow(r)}>
            查看消耗明细
          </Button>
        ),
    },
  ]

  return (
    <PageShell
      breadcrumb={['Token Plan', '套餐用量查询']}
      listTitle="套餐用量"
      total={filtered.length}
      onSearch={handleSearch}
      onReset={handleReset}
      searchFields={
        <>
          <Input
            placeholder="用户姓名 / 手机号 / 订单号"
            allowClear
            style={{ width: 220 }}
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <Select
            placeholder="全部产品类型"
            allowClear
            style={{ width: 150 }}
            value={productKind}
            onChange={setProductKind}
            options={(Object.keys(PRODUCT_KIND_LABEL) as ProductKind[]).map((k) => ({
              label: PRODUCT_KIND_LABEL[k],
              value: k,
            }))}
          />
          <Select
            placeholder="全部状态"
            allowClear
            style={{ width: 150 }}
            value={status}
            onChange={setStatus}
            options={(Object.keys(USAGE_STATUS_LABEL) as UsageStatus[]).map((k) => ({
              label: USAGE_STATUS_LABEL[k],
              value: k,
            }))}
          />
        </>
      }
    >
      <Table<UsageRow>
        rowKey="key"
        size="middle"
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        columns={columns}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
        }}
      />

      <Modal
        centered
        open={detailRow != null}
        destroyOnClose
        width={1000}
        footer={null}
        onCancel={() => setDetailRow(null)}
        title={
          detailRow && (
            <Space size={8}>
              <span>消耗明细</span>
              <Text type="secondary" style={{ fontWeight: 400, fontSize: 13 }}>
                {detailRow.userName} · {detailRow.productName}（{PRODUCT_KIND_LABEL[detailRow.productKind]}） · {detailRow.orderNo}
              </Text>
            </Space>
          )
        }
      >
        {detailRow && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">
              共 {detailData.length} 次调用 · 已用 {formatTokens(detailRow.usedTokens)} Tokens · 累计成本{' '}
              <Text style={{ color: '#1677ff' }}>¥{detailCostSum.toFixed(4)}</Text>
            </Text>
          </div>
        )}
        <Table<ConsumeRow>
          rowKey="key"
          size="small"
          dataSource={detailData}
          columns={detailColumns}
          scroll={{ x: 'max-content', y: 360 }}
          pagination={false}
        />
      </Modal>
    </PageShell>
  )
}
