import { useMemo, useState } from 'react'
import { Button, Input, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
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

/** CSV 单元格：统一加引号并转义内部双引号 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

interface Props {
  /** 「查看消耗明细」：跳转到「套餐消耗明细」页，并按当前订单号过滤到当前人的当前套餐 */
  onViewConsume: (row: UsageRow) => void
}

export default function PlanUsageQuery({ onViewConsume }: Props) {
  const [user, setUser] = useState('')
  const [planName, setPlanName] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [productKind, setProductKind] = useState<ProductKind>()
  const [status, setStatus] = useState<UsageStatus>()
  const [query, setQuery] = useState<{
    user: string;
    planName: string;
    orderNo: string;
    productKind?: ProductKind;
    status?: UsageStatus;
  }>({ user: '', planName: '', orderNo: '' })

  const filtered = useMemo(
    () =>
      USAGE_ROWS.filter((r) => {
        if (query.user) {
          const kw = query.user.trim().toLowerCase()
          const hit =
            r.userName.toLowerCase().includes(kw) ||
            r.phone.includes(kw) ||
            maskPhone(r.phone).includes(kw) ||
            r.accountId.toLowerCase().includes(kw)
          if (!hit) return false
        }
        if (query.planName && !r.productName.toLowerCase().includes(query.planName.trim().toLowerCase())) {
          return false
        }
        if (query.orderNo && !r.orderNo.toLowerCase().includes(query.orderNo.trim().toLowerCase())) {
          return false
        }
        if (query.productKind && r.productKind !== query.productKind) return false
        if (query.status && r.status !== query.status) return false
        return true
      }),
    [query],
  )

  const handleSearch = () => setQuery({ user, planName, orderNo, productKind, status })

  const handleReset = () => {
    setUser('')
    setPlanName('')
    setOrderNo('')
    setProductKind(undefined)
    setStatus(undefined)
    setQuery({ user: '', planName: '', orderNo: '' })
  }

  /** 按当前筛选结果导出 CSV（不只当前页），字段与列表一致 */
  const handleExport = () => {
    if (!filtered.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    const header = [
      '订单号',
      '用户姓名',
      '手机号',
      '账户ID',
      '购买产品',
      '产品类型',
      '订单实付（元）',
      'Tokens 总量',
      '已用 Tokens',
      '已用百分比（%）',
      '剩余 Tokens',
      '有效期开始',
      '有效期截止',
      '当前状态',
    ]
    const lines = [header.map(csvCell).join(',')]
    filtered.forEach((r) => {
      const percent = Math.min(100, Math.round((r.usedTokens / r.totalTokens) * 100))
      lines.push(
        [
          r.orderNo,
          r.userName,
          maskPhone(r.phone),
          r.accountId,
          r.productName,
          PRODUCT_KIND_LABEL[r.productKind],
          r.amount.toFixed(2),
          r.totalTokens,
          r.usedTokens,
          percent,
          remainingTokens(r),
          r.validFrom,
          r.validTo,
          USAGE_STATUS_LABEL[r.status],
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
    a.download = `套餐用量_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
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
      title: '订单实付',
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
                '1.列表按照订单创建时间倒序展示；展示信息如图；',
                '2.用户信息展示用户真实姓名（如没有实名，展示昵称）、手机号、账户id；',
                '3.已用token后的百分比为 已用token/token总量；',
                '4.点击查看消费明细，跳转到消费明细页面，并筛选到当前套餐；',
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
            placeholder="套餐名称"
            allowClear
            style={{ width: 180 }}
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
          />
          <Input
            placeholder="订单编号"
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
