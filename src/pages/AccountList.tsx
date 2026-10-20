import { useMemo, useState } from 'react'
import { Card, Input, Select, Button, Breadcrumb, Table, Tag, Typography, Space, Modal, InputNumber, DatePicker, message, Popconfirm, Switch, Form, Tooltip } from 'antd'
const { confirm } = Modal
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import RequirementDot from '../components/RequirementDot'
import { maskName } from '../components/SecretCell'
import {
  useResourcePacks,
  useVouchers,
  useVoucherTemplates,
  liveVoucherStatus,
  voucherPoolBalance,
  issueVouchers,
  naturalPeriodValidity,
} from '../store'
import {
  VOUCHER_STATUS_COLOR,
  VOUCHER_STATUS_LABEL,
  PLAN_DURATION_UNIT_META,
} from '../types'
import type { Voucher, VoucherTemplate } from '../types'
import {
  SearchOutlined,
  ReloadOutlined,
  CreditCardOutlined,
  UserOutlined,
  BankOutlined,
  TeamOutlined,
  DollarOutlined,
  SettingOutlined,
  CloseOutlined,
  GiftOutlined,
  ProfileOutlined,
} from '@ant-design/icons'

const { Text } = Typography

/** 发放弹窗的有效期展示：按发放当日算出具体起止时刻「生效时间 ～ 失效时间」 */
const validityDescForIssue = (t: VoucherTemplate): string => {
  if (t.validityType === 'naturalPeriod') {
    const { effectiveAt, expireAt } = naturalPeriodValidity(t, dayjs().format('YYYY-MM-DD HH:mm:ss'))
    return `${effectiveAt} ～ ${expireAt}`
  }
  if (t.validityType === 'fixedDate') {
    const from = t.fixedStart ? t.fixedStart.slice(0, 16) : undefined
    const to = t.fixedEnd ? t.fixedEnd.slice(0, 16) : undefined
    if (from && to) return `${from} ～ ${to}`
    if (from) return `${from} ～ 长期`
    if (to) return `～ ${to}`
    return '长期'
  }
  const delayStart = dayjs().add(t.effectiveDelayDays ?? 0, 'day').startOf('day')
  const start = delayStart.format('YYYY-MM-DD HH:mm:ss')
  if (t.validDays == null) return `${start} ～ 长期`
  const end = delayStart.add(t.validDays - 1, 'day').endOf('day').format('YYYY-MM-DD HH:mm:ss')
  return `${start} ～ ${end}`
}

/* ---------------- 统计卡 ---------------- */
interface StatCard {
  label: React.ReactNode
  value: string
  icon: React.ReactNode
  color: string
}

const STAT_CARDS: StatCard[] = [
  { label: '总账户数', value: '99', icon: <CreditCardOutlined />, color: '#2f6bff' },
  { label: '个人账户', value: '96', icon: <UserOutlined />, color: '#b37feb' },
  { label: '企业账户', value: '2', icon: <BankOutlined />, color: '#52c41a' },
  { label: '企业子账户', value: '1', icon: <TeamOutlined />, color: '#13c2c2' },
  { label: '净资产统计', value: '¥45,066.730595', icon: <DollarOutlined />, color: '#faad14' },
]

/* ---------------- 数据 ---------------- */
interface AccountRow {
  key: string
  accountName: string
  accountId: string
  accountType: 'personal' | 'enterprise' | 'sub'
  tags?: { name: string; color: string }[]
  realName?: string
  username?: string
  authName?: string
  assets: number
  apiKeyCount: number
  status: 'normal' | 'frozen'
  quotaLevel: string
  createdAt: string
}

/** 账户已开通的加油包记录 */
interface OpenedPack {
  packId: string
  packName: string
  /** 计价方式：预付费 / 后付费 */
  billingMethod: 'prepaid' | 'postpaid'
  openedAt: string
}

/** 开通加油包弹窗表单状态 */
interface PackFormState {
  packId: string | null
  billingMethod: 'prepaid' | 'postpaid'
}

const ROWS: AccountRow[] = [
  {
    key: '1',
    accountName: 'zsdd4892250602',
    accountId: 'ACC20260814G3RJUGglg',
    accountType: 'personal',
    tags: [{ name: '内部员工', color: '#2f6bff' }],
    assets: 9999.535508,
    apiKeyCount: 1,
    status: 'normal',
    quotaLevel: 'T5',
    createdAt: '2026-08-14 16:24:25',
  },
  {
    key: '2',
    accountName: 'lyfyyds',
    accountId: 'ACC20260814lyfMj9dPB',
    accountType: 'personal',
    realName: '李怡凡',
    username: 'lyfyyds',
    authName: '李怡凡',
    tags: [{ name: '内部员工', color: '#2f6bff' }, { name: '员工介绍', color: '#52c41a' }],
    assets: 183.328998,
    apiKeyCount: 1,
    status: 'normal',
    quotaLevel: 'T5',
    createdAt: '2026-08-14 14:00:12',
  },
  {
    key: '3',
    accountName: '13811305182',
    accountId: 'ACC20260810PVPbI3MgE',
    accountType: 'personal',
    tags: [{ name: '员工介绍', color: '#52c41a' }],
    assets: 0,
    apiKeyCount: 0,
    status: 'normal',
    quotaLevel: 'T1',
    createdAt: '2026-08-10 17:16:05',
  },
  {
    key: '4',
    accountName: '18255445034',
    accountId: 'ACC20260805nCS9F4QYv',
    accountType: 'personal',
    tags: [],
    assets: 0,
    apiKeyCount: 0,
    status: 'normal',
    quotaLevel: 'T1',
    createdAt: '2026-08-05 16:38:53',
  },
  {
    key: '5',
    accountName: '13355949369',
    accountId: 'ACC20260805p6UJUPOi',
    accountType: 'personal',
    tags: [{ name: '合作伙伴', color: '#fa541c' }],
    assets: 177.480144,
    apiKeyCount: 1,
    status: 'normal',
    quotaLevel: 'T1',
    createdAt: '2026-08-05 15:17:01',
  },
  {
    key: '6',
    accountName: '18160382631',
    accountId: 'ACC20260805kVDg6e9tu',
    accountType: 'personal',
    tags: [{ name: '员工介绍', color: '#52c41a' }, { name: '合作伙伴', color: '#fa541c' }],
    assets: 300,
    apiKeyCount: 0,
    status: 'normal',
    quotaLevel: 'T1',
    createdAt: '2026-08-05 10:41:29',
  },
]

const ACCOUNT_TYPE_MAP: Record<AccountRow['accountType'], { label: string; color: string }> = {
  personal: { label: '个人账号', color: '#b37feb' },
  enterprise: { label: '企业账号', color: '#52c41a' },
  sub: { label: '企业子账号', color: '#13c2c2' },
}

const QUOTA_LEVEL_COLORS: Record<string, string> = {
  T5: '#fa541c',
  T4: '#faad14',
  T3: '#722ed1',
  T2: '#2f6bff',
  T1: '#13c2c2',
}

/* ---------------- 消费额度模型 ---------------- */
interface QuotaModelRow {
  key: string
  modelName: string
  cycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'permanent'
  amount: number | null
  enabled: boolean
}

const CYCLE_OPTIONS = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' },
  { value: 'yearly', label: '每年' },
  { value: 'permanent', label: '永久' },
]

const STATUS_OPTIONS = [
  { value: true, label: '开启消费限额' },
  { value: false, label: '关闭消费限额' },
]

const DEFAULT_MODEL_ROWS: QuotaModelRow[] = [
  { key: 'zs-ultra-4.8', modelName: 'zs-ultra-4.8', cycle: 'daily', amount: 300, enabled: true },
  { key: 'zs-pro-3.5', modelName: 'zs-pro-3.5', cycle: 'daily', amount: 200, enabled: true },
  { key: 'zs-vision', modelName: 'zs-vision-1.0', cycle: 'monthly', amount: 1000, enabled: true },
  { key: 'zs-embed', modelName: 'zs-embedding-2', cycle: 'daily', amount: 50, enabled: false },
]

/* ---------------- 限额模型（T1~T5） ---------------- */
interface LimitModelRow {
  key: string
  modelName: string
  limitLevel: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | null
  deleted?: boolean
}

const LIMIT_PRESETS: Record<string, { rpm: number; tpm: number }> = {
  T1: { rpm: 10, tpm: 10000 },
  T2: { rpm: 20, tpm: 30000 },
  T3: { rpm: 30, tpm: 50000 },
  T4: { rpm: 40, tpm: 80000 },
  T5: { rpm: 60, tpm: 100000 },
}

const LIMIT_LEVEL_OPTIONS = [
  { value: 'T1', label: 'T1' },
  { value: 'T2', label: 'T2' },
  { value: 'T3', label: 'T3' },
  { value: 'T4', label: 'T4' },
  { value: 'T5', label: 'T5' },
]

const ALL_MODEL_LIST: LimitModelRow[] = [
  { key: 'm1', modelName: 'zs-ultra-4.8', limitLevel: 'T5' },
  { key: 'm2', modelName: 'zs-pro-3.5', limitLevel: 'T3' },
  { key: 'm3', modelName: 'zs-vision-1.0', limitLevel: 'T2' },
  { key: 'm4', modelName: 'zs-embedding-2', limitLevel: 'T1' },
  { key: 'm5', modelName: 'zs-chat-turbo', limitLevel: 'T4' },
  { key: 'm6', modelName: 'zs-chat-plus', limitLevel: 'T3' },
  { key: 'm7', modelName: 'zs-code-1.0', limitLevel: 'T2' },
  { key: 'm8', modelName: 'zs-image-gen', limitLevel: 'T1' },
  { key: 'm9', modelName: 'zs-audio-transcribe', limitLevel: null },
  { key: 'm10', modelName: 'zs-video-gen', limitLevel: null },
  { key: 'm11', modelName: 'zs-translate-pro', limitLevel: 'T2' },
  { key: 'm12', modelName: 'zs-summarize-lite', limitLevel: 'T1' },
]

/* ---------------- 组件 ---------------- */
export default function AccountList() {
  const [searchText, setSearchText] = useState('')
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [packNameInput, setPackNameInput] = useState('')
  const [appliedText, setAppliedText] = useState('')
  const [appliedTags, setAppliedTags] = useState<string[]>([])
  const [appliedType, setAppliedType] = useState('all')
  const [appliedStatus, setAppliedStatus] = useState('all')
  const [appliedPackName, setAppliedPackName] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchCycle, setBatchCycle] = useState<QuotaModelRow['cycle']>('daily')
  const [batchAmount, setBatchAmount] = useState<number | null>(null)
  const [batchEnabled, setBatchEnabled] = useState<boolean>(true)
  const [quotaRows, setQuotaRows] = useState<QuotaModelRow[]>([])
  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const [limitRows, setLimitRows] = useState<LimitModelRow[]>([])
  const [modelSelectValue, setModelSelectValue] = useState<string[]>([])
  const [batchReplaceOpen, setBatchReplaceOpen] = useState(false)
  const [batchReplaceLevel, setBatchReplaceLevel] = useState<string>('T1')

  /* 批量发放代金券 */
  const [batchVoucherOpen, setBatchVoucherOpen] = useState(false)
  const [batchVoucherTemplateId, setBatchVoucherTemplateId] = useState<string | null>(null)

  const openBatchVoucher = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择账户')
      return
    }
    setBatchVoucherTemplateId(enabledVoucherTemplates[0]?.id ?? null)
    setBatchVoucherOpen(true)
  }

  const handleBatchVoucherIssue = () => {
    if (!batchVoucherTemplateId) {
      message.error('请选择要发放的券模板')
      return
    }
    const tpl = voucherTemplates.find((t) => t.id === batchVoucherTemplateId)
    if (tpl && tpl.status !== 'enabled') {
      message.error('卡券已停用')
      setBatchVoucherTemplateId(enabledVoucherTemplates[0]?.id ?? null)
      return
    }
    const accounts = filtered
      .filter((r) => selectedRowKeys.includes(r.key))
      .map((r) => ({
        accountId: r.accountId,
        accountName: r.accountName,
        accountType: r.accountType,
      }))
    const res = issueVouchers(batchVoucherTemplateId, accounts, {
      remark: '账户列表批量发放',
    })
    if (res.issued.length === 0) {
      message.error(res.skipped[0]?.reason || '发放失败')
      return
    }
    message.success('发放成功')
    setBatchVoucherOpen(false)
    setBatchVoucherTemplateId(null)
    setSelectedRowKeys([])
  }

  /* 批量设置余额 */
  const [balanceModalOpen, setBalanceModalOpen] = useState(false)
  const [balanceType, setBalanceType] = useState<'once' | 'cycle'>('cycle')
  const [balanceCycle, setBalanceCycle] = useState<string>('monthly')
  const [balanceAmount, setBalanceAmount] = useState<number | null>(null)
  const [balanceMode, setBalanceMode] = useState<'reset' | 'adjust'>('adjust')

  const openBatchBalance = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要设置的账户')
      return
    }
    setBalanceType('cycle')
    setBalanceCycle('monthly')
    setBalanceAmount(null)
    setBalanceMode('adjust')
    setBalanceModalOpen(true)
  }

  const handleSaveBalance = () => {
    if (balanceAmount === null || balanceAmount <= 0) {
      message.warning('请输入消费总额度')
      return
    }
    setBalanceModalOpen(false)
    const modeText = balanceMode === 'reset' ? '清零重设' : '在现有基础上调整'
    message.success(`已为 ${selectedRowKeys.length} 个账户设置余额：${balanceAmount}元，${modeText}`)
  }

  /* 加油包开通 */
  const { packs } = useResourcePacks()
  /** 已上架加油包（仅这些可开通） */
  const availablePacks = useMemo(() => packs.filter((p) => p.status === 'on'), [packs])
  /** key -> 已开通加油包记录（每账户最多 1 个） */
  const [openedPackMap, setOpenedPackMap] = useState<Record<string, OpenedPack>>({})
  const [packModalOpen, setPackModalOpen] = useState(false)
  const [packTargetKey, setPackTargetKey] = useState<string | null>(null)
  const [packForm, setPackForm] = useState<PackFormState>({
    packId: null,
    billingMethod: 'prepaid',
  })

  /* 加油包详情弹窗 */
  const [packDetailOpen, setPackDetailOpen] = useState(false)
  const [packDetailPackId, setPackDetailPackId] = useState<string | null>(null)
  const [packDetailRecord, setPackDetailRecord] = useState<OpenedPack | null>(null)

  const openPackDetail = (packId: string, record: OpenedPack) => {
    setPackDetailPackId(packId)
    setPackDetailRecord(record)
    setPackDetailOpen(true)
  }

  const openPackModal = (row: AccountRow) => {
    setPackTargetKey(row.key)
    const existing = openedPackMap[row.key]
    if (existing) {
      // 回填已有开通信息
      setPackForm({
        packId: existing.packId,
        billingMethod: existing.billingMethod,
      })
    } else {
      setPackForm({ packId: null, billingMethod: 'prepaid' })
    }
    setPackModalOpen(true)
  }

  const handleSavePack = () => {
    if (!packForm.packId) {
      message.error('请选择要开通的加油包')
      return
    }
    const pack = availablePacks.find((p) => p.id === packForm.packId)
    if (!pack) {
      message.error('加油包不存在或已下架')
      return
    }
    const record: OpenedPack = {
      packId: pack.id,
      packName: pack.name,
      billingMethod: packForm.billingMethod,
      openedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    setOpenedPackMap((prev) => ({ ...prev, [packTargetKey!]: record }))
    message.success('加油包开通成功')
    setPackModalOpen(false)
  }

  /** 关闭加油包 */
  const handleClosePack = (rowKey: string) => {
    setOpenedPackMap((prev) => {
      const next = { ...prev }
      delete next[rowKey]
      return next
    })
    message.success('加油包已关闭，将按平台价计费')
  }

  /* 代金券：与现金账户物理分离，此处只读展示名下券 + 支持发放 */
  const vouchers = useVouchers()
  const voucherTemplates = useVoucherTemplates()
  /** 发放弹窗券模板下拉：仅启用状态、排除兑换专用，按创建时间倒序 */
  const enabledVoucherTemplates = useMemo(
    () =>
      voucherTemplates
        .filter((t) => t.status === 'enabled' && !t.exchangeOnly)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [voucherTemplates],
  )
  /** accountId -> 名下券统计（张数 / 生效中张数 / 券池余额） */
  const voucherStatMap = useMemo(() => {
    const m = new Map<string, { count: number; activeCount: number; pool: number }>()
    vouchers.forEach((v) => {
      if (!v.accountId) return
      const cur = m.get(v.accountId) ?? { count: 0, activeCount: 0, pool: 0 }
      cur.count += 1
      cur.pool += v.balance
      const st = liveVoucherStatus(v)
      if (st === 'active' || st === 'notEffective') cur.activeCount += 1
      m.set(v.accountId, cur)
    })
    return m
  }, [vouchers])
  const voucherBalanceTotal = useMemo(
    () => Array.from(voucherStatMap.values()).reduce((s, x) => s + x.pool, 0),
    [voucherStatMap],
  )
  const statCards = useMemo<StatCard[]>(
    () => [
      ...STAT_CARDS,
      {
        label: (
          <Space size={4}>
            代金券余额合计
            <RequirementDot
              title="代金券余额合计 · 需求说明"
              sections={[
                {
                  label: '统计口径',
                  items: ['统计所有卡券账户中所有生效状态的代金券的余额总和。'],
                },
              ]}
            />
          </Space>
        ),
        value: `¥${voucherBalanceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: <GiftOutlined />,
        color: '#eb2f96',
      },
    ],
    [voucherBalanceTotal],
  )

  /* 名下券明细弹窗 */
  const [voucherDetailRow, setVoucherDetailRow] = useState<AccountRow | null>(null)
  /** 名下券明细：按发放时间（到账时间）倒序 */
  const voucherDetailList = useMemo(
    () =>
      voucherDetailRow
        ? vouchers
            .filter((v) => v.accountId === voucherDetailRow.accountId)
            .sort((a, b) => (b.claimedAt ?? b.createdAt).localeCompare(a.claimedAt ?? a.createdAt))
        : [],
    [voucherDetailRow, vouchers],
  )
  const EMPTY_CELL = <Text type="secondary">—</Text>
  const voucherDetailColumns: ColumnsType<Voucher> = [
    {
      title: '券码',
      dataIndex: 'code',
      width: 160,
      fixed: 'left',
      render: (code: string) => (
        <Text copyable={{ text: code }} style={{ fontSize: 12 }}>
          {code}
        </Text>
      ),
    },
    {
      title: '券名称',
      dataIndex: 'templateName',
      width: 160,
      ellipsis: true,
      render: (n: string) => (n ? <Text>{n}</Text> : EMPTY_CELL),
    },
    {
      title: '面额',
      dataIndex: 'faceValue',
      width: 100,
      align: 'right',
      render: (n: number) => `¥${n.toFixed(2)}`,
    },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 100,
      align: 'right',
      render: (n: number) => (
        <Text style={{ color: n > 0 ? '#fa8c16' : '#8c8c8c' }}>{`¥${n.toFixed(2)}`}</Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, v) => {
        const st = liveVoucherStatus(v)
        return <Tag color={VOUCHER_STATUS_COLOR[st]}>{VOUCHER_STATUS_LABEL[st]}</Tag>
      },
    },
    {
      title: '生效时间',
      dataIndex: 'effectiveAt',
      width: 170,
      render: (t?: string) => (t ? t : EMPTY_CELL),
    },
    {
      title: '到期时间',
      dataIndex: 'expireAt',
      width: 170,
      render: (t?: string) => t ?? <Text type="secondary">长期有效</Text>,
    },
    {
      title: '发放时间',
      dataIndex: 'claimedAt',
      width: 170,
      render: (t?: string) => (t ? t : EMPTY_CELL),
    },
  ]

  /* 发放代金券弹窗（单账户） */
  const [issueRow, setIssueRow] = useState<AccountRow | null>(null)
  const [issueTemplateId, setIssueTemplateId] = useState<string | null>(null)
  const openIssueVoucher = (row: AccountRow) => {
    if (row.accountType === 'sub') {
      message.error('企业子账号不支持发放代金券')
      return
    }
    setIssueRow(row)
    setIssueTemplateId(enabledVoucherTemplates[0]?.id ?? null)
  }
  const handleIssueVoucher = () => {
    if (!issueRow) return
    if (!issueTemplateId) {
      message.error('请选择要发放的券模板')
      return
    }
    const tpl = voucherTemplates.find((t) => t.id === issueTemplateId)
    if (tpl && tpl.status !== 'enabled') {
      message.error('卡券已停用')
      setIssueTemplateId(enabledVoucherTemplates[0]?.id ?? null)
      return
    }
    const res = issueVouchers(
      issueTemplateId,
      [
        {
          accountId: issueRow.accountId,
          accountName: issueRow.accountName,
          accountType: issueRow.accountType,
        },
      ],
      { remark: '账户列表发放' },
    )
    if (res.issued.length === 0) {
      message.error(res.skipped[0]?.reason || '发放失败')
      return
    }
    message.success('发放成功')
    setIssueRow(null)
    setIssueTemplateId(null)
  }

  const filtered = useMemo(() => {
    return ROWS.filter((r) => {
      if (appliedText) {
        const k = appliedText.toLowerCase()
        const match =
          r.accountName.toLowerCase().includes(k) ||
          r.accountId.toLowerCase().includes(k) ||
          (r.username || '').toLowerCase().includes(k) ||
          (r.realName || '').toLowerCase().includes(k)
        if (!match) return false
      }
      if (appliedTags.length > 0) {
        const rowTagNames = r.tags?.map((t) => t.name) || []
        if (!appliedTags.some((name) => rowTagNames.includes(name))) return false
      }
      if (appliedType !== 'all' && r.accountType !== appliedType) return false
      if (appliedStatus !== 'all' && r.status !== appliedStatus) return false
      if (appliedPackName) {
        const op = openedPackMap[r.key]
        if (!op || !op.packName.toLowerCase().includes(appliedPackName.toLowerCase())) return false
      }
      return true
    })
  }, [appliedText, appliedTags, appliedType, appliedStatus, appliedPackName, openedPackMap])

  const handleSearch = () => {
    setAppliedText(searchText)
    setAppliedTags([...searchTags])
    setAppliedType(typeFilter)
    setAppliedStatus(statusFilter)
    setAppliedPackName(packNameInput)
  }
  const handleReset = () => {
    setSearchText('')
    setSearchTags([])
    setTypeFilter('all')
    setStatusFilter('all')
    setPackNameInput('')
    setAppliedText('')
    setAppliedTags([])
    setAppliedType('all')
    setAppliedStatus('all')
    setAppliedPackName('')
  }

  const cycleLabel = CYCLE_OPTIONS.find((o) => o.value === batchCycle)?.label || ''

  const handleReplaceCycle = () => {
    confirm({
      title: '确认替换',
      content: `您即将将所有消费额度周期替换为「${cycleLabel}」，是否确认操作？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setQuotaRows((prev) => prev.map((r) => ({ ...r, cycle: batchCycle })))
        message.success('替换成功')
      },
    })
  }

  const handleReplaceAmount = () => {
    if (batchAmount == null) {
      message.warning('请输入消费额度')
      return
    }
    confirm({
      title: '确认替换',
      content: `您即将将所有消费额度替换为「${batchAmount} 元」，是否确认操作？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setQuotaRows((prev) => prev.map((r) => ({ ...r, amount: batchAmount })))
        message.success('替换成功')
      },
    })
  }

  const handleReplaceEnabled = () => {
    if (batchEnabled) {
      setQuotaRows((prev) => prev.map((r) => ({ ...r, enabled: true })))
      message.success('替换成功')
      return
    }
    confirm({
      title: '确认替换',
      content: '您即将将所有限额状态替换为「关闭消费限额」，是否确认操作？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setQuotaRows((prev) => prev.map((r) => ({ ...r, enabled: false })))
        message.success('替换成功')
      },
    })
  }

  const handleSaveQuota = () => {
    const invalid = quotaRows.some(
      (r) => r.enabled && (r.amount == null || r.amount < 1 || r.amount > 99999),
    )
    if (invalid) {
      message.error('消费额度金额范围为 1 ~ 99999 元')
      return
    }
    message.success('保存成功，已向所选账户发送通知')
    setBatchModalOpen(false)
  }

  const openBatchLimit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要设置的账户')
      return
    }
    setLimitRows([])
    setModelSelectValue([])
    setLimitModalOpen(true)
  }

  const handleModelSelectChange = (keys: string[]) => {
    setModelSelectValue(keys)
    setLimitRows((prev) => {
      const prevKeys = prev.map((r) => r.key)
      const added = keys.filter((k) => !prevKeys.includes(k))
      const removed = prevKeys.filter((k) => !keys.includes(k))
      let next = [...prev]
      next = next.filter((r) => !removed.includes(r.key))
      for (const k of added) {
        const model = ALL_MODEL_LIST.find((m) => m.key === k)
        if (model) {
          next.push({ key: model.key, modelName: model.modelName, limitLevel: null })
        }
      }
      return next
    })
  }

  const removeLimitRow = (key: string) => {
    setLimitRows((prev) => prev.filter((r) => r.key !== key))
    setModelSelectValue((prev) => prev.filter((k) => k !== key))
  }

  const handleLimitLevelChange = (key: string, level: LimitModelRow['limitLevel']) => {
    setLimitRows((prev) => prev.map((r) => (r.key === key ? { ...r, limitLevel: level } : r)))
  }

  const openBatchReplace = () => {
    if (limitRows.length === 0) {
      message.warning('请先选择模型')
      return
    }
    setBatchReplaceLevel('T1')
    setBatchReplaceOpen(true)
  }

  const confirmBatchReplace = () => {
    setLimitRows((prev) => prev.map((r) => ({ ...r, limitLevel: batchReplaceLevel as LimitModelRow['limitLevel'] })))
    setBatchReplaceOpen(false)
    message.success('批量替换成功')
  }

  const handleSaveLimit = () => {
    const missing = limitRows.filter((r) => !r.limitLevel)
    if (missing.length > 0) {
      const names = missing.map((r) => r.modelName).join('、')
      message.error(`${names} 未填入限额等级，请填写后保存`)
      return
    }
    message.success('保存成功，已向所选账户发送通知')
    setLimitModalOpen(false)
  }

  const columns: ColumnsType<AccountRow> = [
    {
      title: '账户信息',
      dataIndex: 'accountName',
      fixed: 'left',
      width: 240,
      render: (_, r) => (
        <div style={{ padding: '4px 0' }}>
          <Space size={6}>
            <Text strong>{r.accountName}</Text>
          </Space>
          {r.realName && (
            <div style={{ color: '#333', fontSize: 13, marginTop: 4 }}>
              {maskName(r.realName)}
              {r.username && <Text type="secondary" style={{ marginLeft: 6 }}>({r.username})</Text>}
            </div>
          )}
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {r.accountId}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 160,
      render: (tags?: { name: string; color: string }[]) => {
        if (!tags || tags.length === 0) return <Text type="secondary">—</Text>
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map((t) => (
              <Tag key={t.name} color={t.color} style={{ margin: 0, padding: '0 6px', fontSize: 12 }}>
                {t.name}
              </Tag>
            ))}
          </div>
        )
      },
    },
    {
      title: '账户类型',
      dataIndex: 'accountType',
      width: 110,
      render: (t: AccountRow['accountType']) => {
        const v = ACCOUNT_TYPE_MAP[t]
        return <Tag color={v.color}>{v.label}</Tag>
      },
    },
    {
      title: '认证信息',
      dataIndex: 'authName',
      width: 110,
      render: (v) => (v ? <Text>{maskName(v as string)}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: '现金账户净资产',
      dataIndex: 'assets',
      width: 150,
      align: 'right',
      render: (n: number) => <Text>{n.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</Text>,
    },
    {
      title: (
        <Space size={4}>
          卡券账户
          <RequirementDot
            title="卡券账户 · 需求说明"
            sections={[
              {
                label: '需求内容',
                items: [
                  '1.将原有账户重新定义为“现金主账户”，在现金主账户下，挂卡券账户。用来展示用户名下所有卡券信息；',
                  '2.卡券账户展示某用户卡券账户下，所有生效状态代金券的余额总和。',
                  '3.点击余额展示用户代金券明细，按照发放时间倒序展示。',
                ],
              },
            ]}
          />
        </Space>
      ),
      key: 'voucher',
      width: 170,
      render: (_v, r) => {
        const st = voucherStatMap.get(r.accountId)
        if (!st || st.count === 0) return <Text type="secondary">—</Text>
        const pool = voucherPoolBalance(vouchers, r.accountId)
        return (
          <Space size={6}>
            <Text style={{ fontWeight: 500, color: '#fa8c16' }}>{`¥${pool.toFixed(2)}`}</Text>
            <Tooltip title="查看卡券明细">
              <Button
                type="link"
                size="small"
                icon={<ProfileOutlined />}
                onClick={() => setVoucherDetailRow(r)}
              />
            </Tooltip>
          </Space>
        )
      },
    },
    {
      title: 'API数量',
      dataIndex: 'apiKeyCount',
      width: 100,
      render: (n: number) => (
        <a>
          {n} 个密钥
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s) => (
        <Tag color={s === 'normal' ? '#52c41a' : '#ff4d4f'}>
          {s === 'normal' ? '正常' : '已冻结'}
        </Tag>
      ),
    },
    {
      title: '限额等级',
      dataIndex: 'quotaLevel',
      width: 100,
      render: (lv: string) => (
        <Tag color={QUOTA_LEVEL_COLORS[lv] || '#8c8c8c'} style={{ borderRadius: 20 }}>
          {lv}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
    },
    {
      title: '已开通加油包',
      key: 'openedPack',
      width: 220,
      render: (_, r) => {
        const op = openedPackMap[r.key]
        if (!op) return <Text type="secondary">—</Text>
        return (
          <Tag
            color="blue"
            style={{ margin: 0, cursor: 'pointer' }}
            onClick={() => openPackDetail(op.packId, op)}
          >
            {op.packName}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      fixed: 'right',
      width: 340,
      render: (_, r) => (
        <Space size={12}>
          <a>余额调整</a>
          <a>调整限额</a>
          <a onClick={() => openPackModal(r)}>
            {openedPackMap[r.key] ? '修改加油包' : '开通加油包'}
          </a>
          <a onClick={() => openIssueVoucher(r)}>发放代金券</a>
          <RequirementDot
            title="发放代金券 · 需求说明"
            sections={[
              {
                label: '需求内容',
                items: [
                  '1.选择券模板下拉框按照创建时间倒序展示所有启用状态的代金券。',
                  '2.选择后，下方展示券的面额和有效期，有效期按发放当日算出具体起止：',
                  '发放后n天、有效期m天：有效期为 今日+n天的00:00 ～ 今日+n天+m天-1天的23:59。例：发放后3天生效、有效期5天，1月1日发放（不管几点）→ 1月2日算第1天，1月4日 00:00 生效 → 1月4日算生效第1天，1月8日 23:59:59 失效。',
                  '自然周期：有效期为发放日的周期第一天00:00 ～ 最后一天23:59。例：选择自然月、现在为9月20日，则展示 2026-9-1 00:00 ～ 2026-9-30 23:59。',
                  '固定周期：直接展示配置的固定起止时间。',
                  '长期有效：展示为「2026-10-11 00:00 ～ 长期」。',
                  '3.点击确认发放后，检查卡券状态，如状态为停用，则提示“xx卡券已停用，请重新选择”，刷新下拉框。',
                  '如卡券被编辑，以点击发放时的信息为准。',
                  '发放成功，记录发放时间，券的有效期；并记录卡片状态；',
                  '当前时间<有效期开始时间，待生效；',
                  '当前时间>=有效期开始时间 且 <=有效期结束时间，生效中；',
                  '当前时间>有效期结束时间，已过期；',
                ],
              },
            ]}
          />
          <a>更多操作</a>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 面包屑 */}
      <Breadcrumb
        items={[
          { title: '账户管理' },
          { title: '账户列表' },
        ]}
      />

      {/* 统计卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
        {statCards.map((s, i) => (
          <Card key={i} variant="borderless" styles={{ body: { padding: 16 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>{s.label}</Text>
                <div style={{ marginTop: 8 }}>
                  <Text strong style={{ fontSize: 26, color: s.color }}>{s.value}</Text>
                </div>
              </div>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: `${s.color}15`,
                  color: s.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {s.icon}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* 搜索卡 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <Space size={16} wrap>
          <Text>搜索：</Text>
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="搜索账户名、用户名、账户ID或邮箱..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 360 }}
          />
          <Text>标签：</Text>
          <Select
            mode="multiple"
            allowClear
            style={{ minWidth: 180 }}
            placeholder="全部标签"
            value={searchTags}
            onChange={setSearchTags}
            options={[
              { value: '内部员工', label: '内部员工' },
              { value: '员工介绍', label: '员工介绍' },
              { value: '合作伙伴', label: '合作伙伴' },
            ]}
            maxTagCount={1}
          />
          <Text>类型：</Text>
          <Select
            style={{ width: 160 }}
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'personal', label: '个人账号' },
              { value: 'enterprise', label: '企业账号' },
              { value: 'sub', label: '企业子账号' },
            ]}
          />
          <Text>状态：</Text>
          <Select
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'normal', label: '正常' },
              { value: 'frozen', label: '已冻结' },
            ]}
          />
          <Text>加油包名称：</Text>
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="请输入加油包名称"
            value={packNameInput}
            onChange={(e) => setPackNameInput(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 列表卡 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16 }}>账户信息</Text>
          <Space>
            <Space size={4}>
              <Button icon={<GiftOutlined />} onClick={openBatchVoucher}>
                批量发放代金券
              </Button>
              <RequirementDot
                title="批量发放代金券 · 需求说明"
                sections={[
                  {
                    label: '需求内容',
                    items: [
                      '1.未选择账户时，提示“请选择账户”',
                      '2.选择账户后逻辑同发放代金券按钮逻辑。为所选择账户批量发放代金券',
                    ],
                  },
                ]}
              />
            </Space>
            <Button icon={<DollarOutlined />} onClick={openBatchBalance}>
              批量设置余额
            </Button>
            <Button type="primary" icon={<SettingOutlined />} onClick={openBatchLimit}>
              调整配额
            </Button>
          </Space>
        </div>
        <Table<AccountRow>
          rowKey="key"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            columnWidth: 48,
          }}
          pagination={{
            showTotal: (t) => `共 ${t} 条记录`,
            defaultPageSize: 20,
          }}
        />
      </Card>

      {/* 批量设置余额 弹窗 */}
      <Modal
        title="批量设置余额"
        open={balanceModalOpen}
        onCancel={() => setBalanceModalOpen(false)}
        onOk={handleSaveBalance}
        okText="保存"
        cancelText="取消"
        centered
        width={520}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Space size={8}>
            <Text type="secondary">调整类型：</Text>
            <Select
              style={{ width: 180 }}
              value={balanceType}
              onChange={setBalanceType}
              options={[
                { value: 'cycle', label: '周期性调整' },
                { value: 'once', label: '一次性调整' },
              ]}
            />
          </Space>
          {balanceType === 'cycle' && (
            <Space size={8}>
              <Text type="secondary">设置周期：</Text>
              <Select
                style={{ width: 140 }}
                value={balanceCycle}
                onChange={setBalanceCycle}
                options={CYCLE_OPTIONS}
              />
            </Space>
          )}
          <Space size={8}>
            <Text type="secondary">调增金额：</Text>
            <InputNumber
              min={1}
              max={999999}
              precision={2}
              step={0.01}
              placeholder="1~999999"
              value={balanceAmount}
              onChange={setBalanceAmount}
              style={{ width: 180 }}
              addonAfter="元"
            />
          </Space>
          <Space size={8}>
            <Text type="secondary">设置方式：</Text>
            <Select
              style={{ width: 200 }}
              value={balanceMode}
              onChange={setBalanceMode}
              options={[
                { value: 'reset', label: '现有账户清零，重新设置' },
                { value: 'adjust', label: '在现有基础上调整设置' },
              ]}
            />
          </Space>
        </div>
      </Modal>

      {/* 批量设置模型消费额度 弹窗 */}
      <Modal
        title="批量设置模型消费额度"
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        onOk={handleSaveQuota}
        okText="保存"
        cancelText="取消"
        centered
        width={1000}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            在下方输入框中，可批量替换消费额度，批量设置会覆盖已设置的信息，替换后支持修改。
          </Text>
        </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Space size={12}>
                <Text>消费额度周期：</Text>
                <Select
                  style={{ width: 140 }}
                  value={batchCycle}
                  onChange={setBatchCycle}
                  options={CYCLE_OPTIONS}
                />
                <Button type="primary" onClick={handleReplaceCycle}>
                  批量替换
                </Button>
              </Space>
              <Space size={12}>
                <Text>消费额度：</Text>
                <InputNumber
                  min={1}
                  max={99999}
                  placeholder="1~99999"
                  value={batchAmount}
                  onChange={setBatchAmount}
                  style={{ width: 160 }}
                  addonAfter="元"
                />
                <Button type="primary" onClick={handleReplaceAmount}>
                  批量替换
                </Button>
              </Space>
              <Space size={12}>
                <Text>限额状态：</Text>
                <Select
                  style={{ width: 160 }}
                  value={batchEnabled}
                  onChange={setBatchEnabled}
                  options={STATUS_OPTIONS}
                />
                <Button type="primary" onClick={handleReplaceEnabled}>
                  批量替换
                </Button>
              </Space>
            </div>
            <Table<QuotaModelRow>
          rowKey="key"
          pagination={false}
          size="small"
          dataSource={quotaRows}
          columns={[
            {
              title: '在售模型名称',
              dataIndex: 'modelName',
              width: 240,
            },
            {
              title: '消费额度周期',
              dataIndex: 'cycle',
              width: 220,
              render: (v: QuotaModelRow['cycle'], record, index) => (
                <Select
                  style={{ width: '100%' }}
                  value={v}
                  onChange={(nv) => {
                    setQuotaRows((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], cycle: nv }
                      return next
                    })
                  }}
                  options={CYCLE_OPTIONS}
                />
              ),
            },
            {
              title: '消费额度（元）',
              dataIndex: 'amount',
              width: 220,
              render: (v: number | null, record, index) => (
                <InputNumber
                  min={1}
                  max={99999}
                  value={v}
                  style={{ width: '100%' }}
                  onChange={(nv) => {
                    setQuotaRows((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], amount: nv ?? null }
                      return next
                    })
                  }}
                />
              ),
            },
            {
              title: '限额状态',
              dataIndex: 'enabled',
              width: 220,
              render: (v: boolean, record, index) => (
                <Select
                  style={{ width: '100%' }}
                  value={v}
                  onChange={(nv) => {
                    setQuotaRows((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], enabled: nv }
                      return next
                    })
                  }}
                  options={STATUS_OPTIONS}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* 调整配额 弹窗 */}
      <Modal
        title="调整配额"
        open={limitModalOpen}
        onCancel={() => setLimitModalOpen(false)}
        onOk={handleSaveLimit}
        okText="保存"
        cancelText="取消"
        centered
        width={900}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary">请选择待调整的模型（支持多选）</Text>
            </div>
            <Select
              mode="multiple"
              placeholder="点击选择模型..."
              value={modelSelectValue}
              onChange={handleModelSelectChange}
              style={{ width: '100%' }}
              optionLabelProp="label"
              options={ALL_MODEL_LIST.filter((m) => !m.deleted).map((m) => ({
                value: m.key,
                label: m.modelName,
              }))}
            />
          </div>

          {limitRows.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <Text strong>已选模型（{limitRows.length}）</Text>
                </Space>
                <Space>
                  <Button type="primary" onClick={openBatchReplace}>
                    批量替换
                  </Button>
                </Space>
              </div>
              <Table<LimitModelRow>
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ y: 320 }}
                dataSource={limitRows}
                columns={[
                  {
                    title: '模型名称',
                    dataIndex: 'modelName',
                    width: 220,
                  },
                  {
                    title: '限额等级',
                    dataIndex: 'limitLevel',
                    width: 140,
                    render: (v: LimitModelRow['limitLevel'], record) => (
                      <Select
                        placeholder="请选择"
                        style={{ width: '100%' }}
                        value={v || undefined}
                        onChange={(nv) => handleLimitLevelChange(record.key, nv as LimitModelRow['limitLevel'])}
                        options={LIMIT_LEVEL_OPTIONS}
                      />
                    ),
                  },
                  {
                    title: 'RPM（请求/分钟）',
                    dataIndex: 'limitLevel',
                    width: 140,
                    render: (v: LimitModelRow['limitLevel']) => {
                      if (!v) return <Text type="secondary">—</Text>
                      const p = LIMIT_PRESETS[v]
                      return <Text>{p.rpm}</Text>
                    },
                  },
                  {
                    title: 'TPM（Token/分钟）',
                    dataIndex: 'limitLevel',
                    width: 140,
                    render: (v: LimitModelRow['limitLevel']) => {
                      if (!v) return <Text type="secondary">—</Text>
                      const p = LIMIT_PRESETS[v]
                      return <Text>{p.tpm.toLocaleString()}</Text>
                    },
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 60,
                    render: (_, record) => (
                      <a onClick={() => removeLimitRow(record.key)}>删除</a>
                    ),
                  },
                ]}
              />
            </>
          )}

          {limitRows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">请先在上方选择模型</Text>
            </div>
          )}
        </div>
      </Modal>

      {/* 批量替换限额等级 弹窗 */}
      <Modal
        title="批量替换限额等级"
        open={batchReplaceOpen}
        onCancel={() => setBatchReplaceOpen(false)}
        onOk={confirmBatchReplace}
        okText="确认替换"
        cancelText="取消"
        centered
        width={400}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div>
            <Text type="secondary">将所有已选模型的限额等级替换为：</Text>
          </div>
          <Select
            style={{ width: '100%' }}
            value={batchReplaceLevel}
            onChange={setBatchReplaceLevel}
            options={LIMIT_LEVEL_OPTIONS}
          />
          <div>
            <Text type="secondary">
              将对 <Text strong>{limitRows.length}</Text> 个模型进行批量替换
            </Text>
          </div>
        </div>
      </Modal>

      {/* 开通/修改加油包 弹窗 */}
      <Modal
        title={packTargetKey && openedPackMap[packTargetKey] ? '修改加油包' : '开通加油包'}
        open={packModalOpen}
        onCancel={() => setPackModalOpen(false)}
        onOk={handleSavePack}
        okText="保存"
        cancelText="取消"
        centered
        width={560}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setPackModalOpen(false)}>取消</Button>
            {packTargetKey && openedPackMap[packTargetKey] && (
              <Popconfirm
                title="关闭加油包"
                description="关闭后将按照平台价计费，是否确认关闭？"
                okText="确认关闭"
                cancelText="取消"
                onConfirm={() => {
                  handleClosePack(packTargetKey)
                  setPackModalOpen(false)
                }}
              >
                <Button danger>关闭加油包</Button>
              </Popconfirm>
            )}
            <Button type="primary" onClick={handleSavePack}>保存</Button>
          </Space>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          {/* 顶部：上次保存时间 */}
          {packTargetKey && openedPackMap[packTargetKey] && (
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #eef0f4',
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                上次保存时间：
                <Text style={{ fontSize: 12, color: '#333' }}>
                  {openedPackMap[packTargetKey].openedAt}
                </Text>
              </Text>
            </div>
          )}

          {/* 加油包选择（单选，仅上架） */}
          <div>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                加油包（仅展示已上架）
              </Text>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择加油包"
              value={packForm.packId}
              onChange={(v) => setPackForm((f) => ({ ...f, packId: v }))}
              options={availablePacks.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              notFoundContent="暂无可开通的加油包"
            />
            {availablePacks.length === 0 && (
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  当前没有已上架的加油包，请先在「加油包管理」中上架。
                </Text>
              </div>
            )}
          </div>

          {/* 计价方式 */}
          <div>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                计价方式
              </Text>
            </div>
            <Select
              style={{ width: '100%' }}
              value={packForm.billingMethod}
              onChange={(v) =>
                setPackForm((f) => ({ ...f, billingMethod: v }))
              }
              options={[
                { value: 'prepaid', label: '预付费' },
                { value: 'postpaid', label: '后付费' },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* 加油包详情弹窗 */}
      <Modal
        title="加油包详情"
        open={packDetailOpen}
        onCancel={() => setPackDetailOpen(false)}
        footer={<Button onClick={() => setPackDetailOpen(false)}>关闭</Button>}
        centered
        width={560}
        destroyOnClose
      >
        {packDetailRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
            {/* 基础信息 */}
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #eef0f4',
                borderRadius: 8,
                padding: '12px 16px',
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>加油包名称</Text>
                <div style={{ marginTop: 4 }}>
                  <Text strong>{packDetailRecord.packName}</Text>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>计价方式：</Text>
                  <Text>{packDetailRecord.billingMethod === 'prepaid' ? '预付费' : '后付费'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>开通时间：</Text>
                  <Text>{packDetailRecord.openedAt}</Text>
                </div>
              </div>
            </div>

            {/* 加油包配置：副标题 / 价格 / 额度 / 有效期 */}
            <div>
              <div style={{ marginBottom: 8 }}>
                <Text strong>加油包配置</Text>
              </div>
              {(() => {
                const pack = packs.find((p) => p.id === packDetailPackId)
                if (!pack) {
                  return <Text type="secondary">—</Text>
                }
                return (
                  <div
                    style={{
                      border: '1px solid #eef0f4',
                      borderRadius: 8,
                      padding: '10px 14px',
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {pack.subtitle ? (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>副标题：</Text>
                        <Text>{pack.subtitle}</Text>
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>价格：</Text>
                        <Text strong style={{ color: '#ff4d4f' }}>¥{pack.price}</Text>
                        {pack.originalPrice && pack.originalPrice > pack.price ? (
                          <Text delete type="secondary" style={{ marginLeft: 6 }}>
                            ¥{pack.originalPrice}
                          </Text>
                        ) : null}
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>额度：</Text>
                        <Text>{pack.quota.toLocaleString()} Tokens</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>有效期：</Text>
                        <Text>
                          {pack.validityValue}
                          {PLAN_DURATION_UNIT_META[pack.validityUnit].shortUnit}
                        </Text>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* 卡券明细弹窗 */}
      <Modal
        title="卡券明细"
        open={!!voucherDetailRow}
        onCancel={() => setVoucherDetailRow(null)}
        footer={<Button onClick={() => setVoucherDetailRow(null)}>关闭</Button>}
        centered
        width={960}
        destroyOnClose
      >
        <Table<Voucher>
          rowKey="id"
          size="small"
          columns={voucherDetailColumns}
          dataSource={voucherDetailList}
          pagination={{ showTotal: (t) => `共 ${t} 条记录`, defaultPageSize: 10 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: '该账户名下暂无代金券' }}
        />
      </Modal>

      {/* 发放代金券弹窗 */}
      <Modal
        title="发放代金券"
        open={!!issueRow}
        onCancel={() => {
          setIssueRow(null)
          setIssueTemplateId(null)
        }}
        onOk={handleIssueVoucher}
        okText="确认发放"
        cancelText="取消"
        centered
        width={520}
        destroyOnClose
      >
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 24, color: '#333' }}>
            {issueRow ? `发放账户：${issueRow.accountName}（${issueRow.accountId}）` : ''}
          </div>
          <Form.Item
            label="选择券模板"
            required
            extra={
              enabledVoucherTemplates.length === 0
                ? '当前无启用的券模板，请先在「账户管理 › 代金券 › 券模板」中新增并启用'
                : '仅可选择已启用的模板'
            }
          >
            <Select
              style={{ width: '100%' }}
              placeholder="请选择券模板"
              value={issueTemplateId ?? undefined}
              onChange={(v) => setIssueTemplateId(v)}
              options={enabledVoucherTemplates.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </Form.Item>
          {issueTemplateId &&
            (() => {
              const tpl = voucherTemplates.find((t) => t.id === issueTemplateId)
              if (!tpl) return null
              return (
                <div
                  style={{
                    background: '#fafafa',
                    border: '1px solid #eef0f4',
                    borderRadius: 8,
                    padding: '12px 16px',
                  }}
                >
                  <Space size={24} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      面额：<Text strong>{`¥${tpl.faceValue.toFixed(2)}`}</Text>
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      有效期：
                      <Text strong>{validityDescForIssue(tpl)}</Text>
                    </Text>
                  </Space>
                </div>
              )
            })()}
        </Form>
      </Modal>

      {/* 批量发放代金券弹窗 */}
      <Modal
        title="批量发放代金券"
        open={batchVoucherOpen}
        onCancel={() => {
          setBatchVoucherOpen(false)
          setBatchVoucherTemplateId(null)
        }}
        onOk={handleBatchVoucherIssue}
        okText="确认发放"
        cancelText="取消"
        centered
        width={520}
        destroyOnClose
      >
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 24, color: '#333' }}>
            {`已选择 ${selectedRowKeys.length} 个账户，请在下方选择优惠券。`}
          </div>
          <Form.Item
            label="选择券模板"
            required
            extra={
              enabledVoucherTemplates.length === 0
                ? '当前无启用的券模板，请先在「账户管理 › 代金券 › 券模板」中新增并启用'
                : '仅可选择已启用的模板'
            }
          >
            <Select
              style={{ width: '100%' }}
              placeholder="请选择券模板"
              value={batchVoucherTemplateId ?? undefined}
              onChange={(v) => setBatchVoucherTemplateId(v)}
              options={enabledVoucherTemplates.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </Form.Item>
          {batchVoucherTemplateId &&
            (() => {
              const tpl = voucherTemplates.find((t) => t.id === batchVoucherTemplateId)
              if (!tpl) return null
              return (
                <div
                  style={{
                    background: '#fafafa',
                    border: '1px solid #eef0f4',
                    borderRadius: 8,
                    padding: '12px 16px',
                  }}
                >
                  <Space size={24} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      面额：<Text strong>{`¥${tpl.faceValue.toFixed(2)}`}</Text>
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      有效期：
                      <Text strong>{validityDescForIssue(tpl)}</Text>
                    </Text>
                  </Space>
                </div>
              )
            })()}
        </Form>
      </Modal>
    </div>
  )
}
