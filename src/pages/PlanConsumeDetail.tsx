import { useMemo, useState } from 'react'
import { Button, DatePicker, Input, Select, Space, Table, Typography, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
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

/** CSV 单元格：统一加引号并转义内部双引号 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

interface Query {
  user: string
  orderNo: string
  productName: string
  productKind?: ProductKind
  model?: string
  /** 调用时间范围（含端点），格式 YYYY-MM-DD HH:mm:ss */
  timeFrom?: string
  timeTo?: string
}

const emptyQuery: Query = { user: '', orderNo: '', productName: '' }

const TIME_FMT = 'YYYY-MM-DD HH:mm:ss'

/** 由「套餐用量查询 › 查看消耗明细」跳转带入的查询条件：按订单号精确过滤到当前人的当前套餐 */
export interface PlanConsumeFilter {
  orderNo: string
}

interface Props {
  /** 从「套餐用量查询」跳转带入：进入页面即按该订单号完成搜索 */
  initialFilter?: PlanConsumeFilter
}

export default function PlanConsumeDetail({ initialFilter }: Props = {}) {
  const seeded: Query = initialFilter ? { ...emptyQuery, orderNo: initialFilter.orderNo } : emptyQuery
  const [user, setUser] = useState(seeded.user)
  const [orderNo, setOrderNo] = useState(seeded.orderNo)
  const [productName, setProductName] = useState(seeded.productName)
  const [productKind, setProductKind] = useState<ProductKind>()
  const [model, setModel] = useState('')
  const [timeRange, setTimeRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [query, setQuery] = useState<Query>(seeded)

  const filtered = useMemo(
    () =>
      CONSUME_ROWS.filter((r) => {
        if (query.user) {
          const kw = query.user.trim().toLowerCase()
          const hit =
            r.userName.toLowerCase().includes(kw) ||
            r.phone.includes(kw) ||
            maskPhone(r.phone).includes(kw) ||
            r.accountId.toLowerCase().includes(kw)
          if (!hit) return false
        }
        if (query.orderNo && !r.orderNo.toLowerCase().includes(query.orderNo.trim().toLowerCase())) {
          return false
        }
        if (query.productName && !r.productName.toLowerCase().includes(query.productName.trim().toLowerCase())) {
          return false
        }
        if (query.productKind && r.productKind !== query.productKind) return false
        if (query.model && !r.model.toLowerCase().includes(query.model.trim().toLowerCase())) {
          return false
        }
        if (query.timeFrom && r.callTime < query.timeFrom) return false
        if (query.timeTo && r.callTime > query.timeTo) return false
        return true
      }),
    [query],
  )

  const handleSearch = () =>
    setQuery({
      user,
      orderNo,
      productName,
      productKind,
      model,
      timeFrom: timeRange?.[0]?.startOf('day').format(TIME_FMT),
      timeTo: timeRange?.[1]?.endOf('day').format(TIME_FMT),
    })

  const handleReset = () => {
    setUser('')
    setOrderNo('')
    setProductName('')
    setProductKind(undefined)
    setModel('')
    setTimeRange(null)
    setQuery(emptyQuery)
  }

  /** 按当前筛选结果导出 CSV（不只当前页），字段与列表一致 */
  const handleExport = () => {
    if (!filtered.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    const header = [
      '用户姓名',
      '手机号',
      '账户ID',
      '订单信息',
      '产品类型',
      '使用模型',
      'Endpoint',
      '账号别名',
      '调用时间',
      '倍率',
      '输入 Tokens',
      '输出 Tokens',
      '缓存创建 Tokens',
      '缓存读取 Tokens',
      '成本价（元）',
    ]
    const lines = [header.map(csvCell).join(',')]
    filtered.forEach((r) => {
      lines.push(
        [
          r.userName,
          maskPhone(r.phone),
          r.accountId,
          `${r.productName}（${r.orderNo}）`,
          PRODUCT_KIND_LABEL[r.productKind],
          r.model,
          r.endpoint,
          r.accountAlias,
          r.callTime,
          `${r.rate}x`,
          r.inputTokens,
          r.outputTokens,
          r.cacheCreateTokens,
          r.cacheReadTokens,
          r.cost.toFixed(4),
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
    const ts = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    a.download = `套餐消耗明细_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
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
      title: '订单信息',
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
      title: '产品类型',
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
                '1. 列表按照订单创建时间倒序展示；具体样式如图；',
                '2. 订单信息展示套餐名称和订单ID；',
                '3. 模型使用沿用当前消耗明细的内容',
                '4. 支持导出搜索的信息',
              ],
            },
          ]}
        />
      }
      onSearch={handleSearch}
      onReset={handleReset}
      listActions={
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
      }
      searchFields={
        <>
          <Input
            placeholder="用户姓名 / 手机号 / 账户ID"
            allowClear
            style={{ width: 220 }}
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <Input
            placeholder="订单ID"
            allowClear
            style={{ width: 180 }}
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
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
          <Input
            placeholder="套餐名称"
            allowClear
            style={{ width: 180 }}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <Input
            placeholder="模型名称"
            allowClear
            style={{ width: 190 }}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <DatePicker.RangePicker
            allowClear
            style={{ width: 260 }}
            value={timeRange}
            onChange={(v) => setTimeRange(v)}
            placeholder={['调用开始时间', '调用结束时间']}
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
