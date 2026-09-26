import { useMemo, useState } from 'react'
import { Button, Input, Select, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import { CURRENT_CONSOLE_USER, findDemoAccount, liveVoucherStatus, useVouchers } from '../store'
import type { VoucherIssueAccount } from '../store'
import {
  VOUCHER_STATUS_COLOR,
  VOUCHER_STATUS_LABEL,
  roundAmount,
} from '../types'
import type { Voucher, VoucherStatus } from '../types'

const { Text } = Typography

/** 金额展示口径：¥ + 两位小数（余额按 6 位存储，展示前收敛到 2 位） */
const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

const EMPTY_CELL = <Text type="secondary">—</Text>

const tablePagination = {
  pageSize: 10,
  showTotal: (t: number) => `共 ${t} 条记录`,
}

/** 我的券列表搜索快照：点击搜索才过滤，券名称与券码为两个独立条件 */
interface VoucherFilters {
  name: string
  code: string
  status: 'any' | VoucherStatus
}

const EMPTY_FILTERS: VoucherFilters = { name: '', code: '', status: 'any' }

/** 列表排序优先级：生效中、待使用（待生效）、已用完、已过期、已作废 */
const STATUS_ORDER: Record<VoucherStatus, number> = {
  active: 0,
  notEffective: 1,
  usedUp: 2,
  expired: 3,
  void: 4,
}

interface Props {
  /** 点击「查看消费明细」：跳到消费明细并按该券码过滤 */
  onViewConsumption?: (voucherCode: string) => void
}

export default function ConsoleVoucher({ onViewConsumption }: Props) {
  const vouchers = useVouchers()

  const account: VoucherIssueAccount =
    findDemoAccount(CURRENT_CONSOLE_USER.accountId) ?? {
      accountId: CURRENT_CONSOLE_USER.accountId,
      accountName: CURRENT_CONSOLE_USER.nickname,
      phone: CURRENT_CONSOLE_USER.phone,
      accountType: 'personal',
    }

  const [filters, setFilters] = useState<VoucherFilters>(EMPTY_FILTERS)
  const [query, setQuery] = useState<VoucherFilters>(EMPTY_FILTERS)

  const myVouchers = useMemo(
    () => vouchers.filter((v) => v.accountId === account.accountId),
    [vouchers, account.accountId],
  )

  /* ---------------- 我的券列表 ---------------- */
  const filtered = useMemo(() => {
    return myVouchers
      .filter((v) => {
        if (query.code) {
          const kw = query.code.trim().toLowerCase()
          /** 券码为精确搜索：需与完整券码一致（忽略大小写与首尾空格） */
          if (v.code.toLowerCase() !== kw) return false
        }
        if (query.name) {
          const kw = query.name.trim().toLowerCase()
          if (!v.templateName.toLowerCase().includes(kw)) return false
        }
        if (query.status !== 'any' && liveVoucherStatus(v) !== query.status) return false
        return true
      })
      .sort((a, b) => {
        /** 先按状态优先级，同状态内按发放时间倒序（claimedAt 为 YYYY-MM-DD HH:mm:ss，字典序即时间序） */
        const byStatus = STATUS_ORDER[liveVoucherStatus(a)] - STATUS_ORDER[liveVoucherStatus(b)]
        if (byStatus !== 0) return byStatus
        return (b.claimedAt ?? '').localeCompare(a.claimedAt ?? '')
      })
  }, [myVouchers, query])

  const columns: ColumnsType<Voucher> = [
    {
      title: '券码',
      dataIndex: 'code',
      width: 180,
      fixed: 'left',
      render: (code: string) => <Text copyable={{ text: code }}>{code}</Text>,
    },
    {
      title: '券名称',
      dataIndex: 'templateName',
      width: 150,
      ellipsis: true,
      render: (name: string) => <Tooltip title={name}>{name}</Tooltip>,
    },
    { title: '面额', dataIndex: 'faceValue', width: 90, render: (n: number) => money(n) },
    { title: '余额', dataIndex: 'balance', width: 90, render: (n: number) => money(n) },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_: unknown, v) => {
        const live = liveVoucherStatus(v)
        return <Tag color={VOUCHER_STATUS_COLOR[live]}>{VOUCHER_STATUS_LABEL[live]}</Tag>
      },
    },
    {
      title: '生效时间',
      dataIndex: 'effectiveAt',
      width: 170,
      render: (value?: string) => value ?? EMPTY_CELL,
    },
    {
      title: '到期时间',
      dataIndex: 'expireAt',
      width: 170,
      render: (value?: string) => value ?? <Text type="secondary">长期有效</Text>,
    },
    {
      title: '发放时间',
      dataIndex: 'claimedAt',
      width: 170,
      render: (value?: string) => value ?? EMPTY_CELL,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_: unknown, v) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => onViewConsumption?.(v.code)}
        >
          查看消费明细
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
      <PageShell
        breadcrumb={['控制台', '代金券']}
        searchFields={
          <>
            <SearchField label="券名称">
              <Input
                allowClear
                placeholder="请输入券名称"
                style={{ width: 180 }}
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                onPressEnter={() => setQuery({ ...filters })}
              />
            </SearchField>
            <SearchField label="券码">
              <Input
                allowClear
                placeholder="请输入券码"
                style={{ width: 200 }}
                value={filters.code}
                onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value }))}
                onPressEnter={() => setQuery({ ...filters })}
              />
            </SearchField>
            <SearchField label="状态">
              <Select
                style={{ width: 140 }}
                value={filters.status}
                onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                options={[
                  { value: 'any', label: '全部' },
                  ...(Object.keys(VOUCHER_STATUS_LABEL) as VoucherStatus[]).map((s) => ({
                    value: s,
                    label: VOUCHER_STATUS_LABEL[s],
                  })),
                ]}
              />
            </SearchField>
          </>
        }
        onSearch={() => setQuery({ ...filters })}
        onReset={() => {
          setFilters(EMPTY_FILTERS)
          setQuery(EMPTY_FILTERS)
        }}
        listTitle="我的代金券"
        total={filtered.length}
        titleExtra={
          <RequirementDot
            title="控制台 · 我的代金券需求"
            sections={[
              {
                label: '',
                items: [
                  '1.代金券列表为后台发放给该用户的代金券；',
                  '2.列表展示如图，优先按照状态展示生效中、待使用、已用完、已过期、已作废；然后按照发放时间倒序展示；',
                  '3.支持根据券名称模糊搜索、根据券码精确搜索、根据状态搜索；',
                  '4.列表中，券码支持复制；',
                  '5.点击消费明细，跳转到消费明细页面，并筛选到当前优惠券。',
                ],
              },
            ]}
          />
        }
      >
        <Table<Voucher>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={tablePagination}
          scroll={{ x: 'max-content' }}
          size="middle"
        />
      </PageShell>
    </div>
  )
}
