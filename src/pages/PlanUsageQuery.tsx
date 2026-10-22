import { useMemo, useState } from 'react'
import { Button, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import {
  PRODUCT_KIND_LABEL,
  USAGE_STATUS_COLOR,
  USAGE_STATUS_LABEL,
  USAGE_ROWS,
  formatTokens,
  maskPhone,
  remainingTokens,
  type ProductKind,
  type UsageRow,
  type UsageStatus,
} from '../planUsageData'

const { Text } = Typography

interface Props {
  /** 「查看消耗明细」：跳转到「套餐消耗明细」页，并按当前订单号过滤到当前人的当前套餐 */
  onViewConsume: (row: UsageRow) => void
}

export default function PlanUsageQuery({ onViewConsume }: Props) {
  const [user, setUser] = useState('')
  const [productKind, setProductKind] = useState<ProductKind>()
  const [status, setStatus] = useState<UsageStatus>()
  const [query, setQuery] = useState<{ user: string; productKind?: ProductKind; status?: UsageStatus }>({
    user: '',
  })
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
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onViewConsume(r)}>
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
      titleExtra={
        <RequirementDot
          title="套餐用量查询 — 需求点"
          sections={[
            {
              label: '',
              items: [
                '1. 列表：每人每笔套餐/加油包订单一行，展示订单号、用户信息（姓名/脱敏手机号/账户ID）、购买产品、产品类型、花费金额、Tokens 总量、已用 Tokens（括号内标注已用百分比）、剩余 Tokens、有效期开始/截止、当前状态。',
                '2. 搜索：用户姓名/手机号/订单号模糊搜索；产品类型（套餐/加油包）、当前状态（使用中/已过期/未生效）筛选。',
                '3. 剩余 Tokens 为 0 时红色警示；状态以标签展示，其余字段纯文字。',
                '4. 点击「查看消耗明细」：跳转「套餐消耗明细」页，自动按该行订单号搜索，仅展示当前人当前套餐的消耗记录；未生效订单按钮置灰，悬停提示「套餐尚未生效，暂无消耗明细」。',
              ],
            },
          ]}
        />
      }
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
    </PageShell>
  )
}
