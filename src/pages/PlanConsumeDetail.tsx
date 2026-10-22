import { useMemo, useState } from 'react'
import { Input, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import {
  CONSUME_ROWS,
  PRODUCT_KIND_LABEL,
  formatTokens,
  maskPhone,
  type ConsumeRow,
  type ProductKind,
} from '../planUsageData'

const { Text } = Typography

interface Query {
  user: string
  productKind?: ProductKind
  model?: string
}

const emptyQuery: Query = { user: '' }

/** 由「套餐用量查询 › 查看消耗明细」跳转带入的查询条件：按订单号精确过滤到当前人的当前套餐 */
export interface PlanConsumeFilter {
  orderNo: string
}

interface Props {
  /** 从「套餐用量查询」跳转带入：进入页面即按该订单号完成搜索 */
  initialFilter?: PlanConsumeFilter
}

export default function PlanConsumeDetail({ initialFilter }: Props = {}) {
  const seeded: Query = initialFilter ? { ...emptyQuery, user: initialFilter.orderNo } : emptyQuery
  const [user, setUser] = useState(seeded.user)
  const [productKind, setProductKind] = useState<ProductKind>()
  const [model, setModel] = useState<string>()
  const [query, setQuery] = useState<Query>(seeded)

  const modelOptions = useMemo(() => {
    const codes = Array.from(new Set(CONSUME_ROWS.map((r) => r.model)))
    return codes.map((c) => ({ label: c, value: c }))
  }, [])

  const filtered = useMemo(
    () =>
      CONSUME_ROWS.filter((r) => {
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
        if (query.model && r.model !== query.model) return false
        return true
      }),
    [query],
  )

  const handleSearch = () => setQuery({ user, productKind, model })

  const handleReset = () => {
    setUser('')
    setProductKind(undefined)
    setModel(undefined)
    setQuery(emptyQuery)
  }

  const columns: ColumnsType<ConsumeRow> = [
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
      title: '扣费来源',
      key: 'source',
      width: 220,
      render: (_, r) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: 'nowrap' }}>
          <span>{r.productName}</span>
          <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.orderNo}</Text>
        </Space>
      ),
    },
    {
      title: '扣费类型',
      dataIndex: 'productKind',
      width: 100,
      render: (v: ProductKind) => PRODUCT_KIND_LABEL[v],
    },
    {
      title: '使用模型',
      key: 'model',
      width: 240,
      render: (_, r) => (
        <Space direction="vertical" size={0} style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 500 }}>{r.model}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.endpoint}</Text>
          <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.accountAlias}</Text>
        </Space>
      ),
    },
    { title: '调用时间', dataIndex: 'callTime', width: 160 },
    { title: '倍率', dataIndex: 'rate', width: 70, render: (v: number) => `${v}x` },
    {
      title: '输入 Tokens',
      dataIndex: 'inputTokens',
      align: 'right',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: '输出 Tokens',
      dataIndex: 'outputTokens',
      align: 'right',
      width: 120,
      render: (v: number) => formatTokens(v),
    },
    {
      title: '缓存创建 Tokens',
      dataIndex: 'cacheCreateTokens',
      align: 'right',
      width: 140,
      render: (v: number) => formatTokens(v),
    },
    {
      title: '缓存读取 Tokens',
      dataIndex: 'cacheReadTokens',
      align: 'right',
      width: 140,
      render: (v: number) => formatTokens(v),
    },
    {
      title: '成本价',
      dataIndex: 'cost',
      align: 'right',
      width: 110,
      render: (v: number) => <Text style={{ color: '#1677ff' }}>¥{v.toFixed(4)}</Text>,
    },
  ]

  return (
    <PageShell
      breadcrumb={['Token Plan', '套餐消耗明细']}
      listTitle="消耗明细"
      total={filtered.length}
      titleExtra={
        <RequirementDot
          title="套餐消耗明细 — 需求点"
          sections={[
            {
              label: '',
              items: [
                '1. 列表：按调用逐笔展示扣费记录，列为用户信息（姓名/脱敏手机号/账户ID）、扣费来源（产品名+订单号）、扣费类型、使用模型（模型/Endpoint/账号别名）、调用时间、倍率、输入 Tokens、输出 Tokens、缓存创建 Tokens、缓存读取 Tokens、成本价（¥ 保留 4 位小数）。',
                '2. 列表按调用时间倒序排列，每页 10 条，可切换每页条数。',
                '3. 搜索：用户姓名/手机号/订单号模糊搜索；扣费类型（套餐/加油包）、使用模型（下拉枚举明细中出现的全部模型）筛选。',
                '4. 从「套餐用量查询 → 查看消耗明细」跳转进入时，按带入的订单号自动完成搜索，仅展示当前人当前套餐的消耗记录；手动从菜单进入时展示全量明细。',
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
            placeholder="全部扣费类型"
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
            placeholder="全部模型"
            allowClear
            style={{ width: 190 }}
            value={model}
            onChange={setModel}
            options={modelOptions}
          />
        </>
      }
    >
      <Table<ConsumeRow>
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
