import { useMemo, useState } from 'react'
import { Card, Input, Select, Button, Breadcrumb, Table, Tag, Typography, Space, Modal, InputNumber, DatePicker, Tooltip, message, Popconfirm } from 'antd'
const { confirm } = Modal
const { RangePicker } = DatePicker
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import RequirementDot from '../components/RequirementDot'
import { useResourcePacks } from '../store'
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
} from '@ant-design/icons'

const { Text } = Typography

/* ---------------- 统计卡 ---------------- */
interface StatCard {
  label: string
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

/** 账户已开通的资源包记录 */
interface OpenedPack {
  packId: string
  packName: string
  packCode: string
  /** 生效时间范围 [开始, 结束] */
  effectiveRange: [string, string]
  /** 计价方式：预付费 / 后付费 */
  billingMethod: 'prepaid' | 'postpaid'
  openedAt: string
}

/** 开通资源包弹窗表单状态 */
interface PackFormState {
  packId: string | null
  range: [Dayjs, Dayjs] | null
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
  { value: true, label: '开启消费额度' },
  { value: false, label: '关闭消费额度' },
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
  const [limitSearch, setLimitSearch] = useState('')
  const [batchLevel, setBatchLevel] = useState<string>('T1')
  const [limitRows, setLimitRows] = useState<LimitModelRow[]>([])
  const [selectedLimitKeys, setSelectedLimitKeys] = useState<React.Key[]>([])

  /* 资源包开通 */
  const { packs } = useResourcePacks()
  /** 已上架资源包（仅这些可开通） */
  const availablePacks = useMemo(() => packs.filter((p) => p.status === 'on'), [packs])
  /** key -> 已开通资源包记录（每账户最多 1 个） */
  const [openedPackMap, setOpenedPackMap] = useState<Record<string, OpenedPack>>({})
  const [packModalOpen, setPackModalOpen] = useState(false)
  const [packTargetKey, setPackTargetKey] = useState<string | null>(null)
  const [packForm, setPackForm] = useState<PackFormState>({
    packId: null,
    range: null,
    billingMethod: 'prepaid',
  })

  const openPackModal = (row: AccountRow) => {
    setPackTargetKey(row.key)
    const existing = openedPackMap[row.key]
    if (existing) {
      // 回填已有开通信息
      setPackForm({
        packId: existing.packId,
        range: [dayjs(existing.effectiveRange[0]), dayjs(existing.effectiveRange[1])],
        billingMethod: existing.billingMethod,
      })
    } else {
      setPackForm({ packId: null, range: null, billingMethod: 'prepaid' })
    }
    setPackModalOpen(true)
  }

  const handleSavePack = () => {
    if (!packForm.packId) {
      message.error('请选择要开通的资源包')
      return
    }
    if (!packForm.range) {
      message.error('请选择生效时间范围')
      return
    }
    const pack = availablePacks.find((p) => p.id === packForm.packId)
    if (!pack) {
      message.error('资源包不存在或已下架')
      return
    }
    const [start, end] = packForm.range
    const record: OpenedPack = {
      packId: pack.id,
      packName: pack.name,
      packCode: pack.code,
      effectiveRange: [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')],
      billingMethod: packForm.billingMethod,
      openedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    setOpenedPackMap((prev) => ({ ...prev, [packTargetKey!]: record }))
    message.success('资源包开通成功')
    setPackModalOpen(false)
  }

  /** 关闭资源包 */
  const handleClosePack = (rowKey: string) => {
    setOpenedPackMap((prev) => {
      const next = { ...prev }
      delete next[rowKey]
      return next
    })
    message.success('资源包已关闭，将按平台价计费')
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

  const openBatchQuota = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要设置的账户')
      return
    }
    setQuotaRows(DEFAULT_MODEL_ROWS.map((r) => ({ ...r })))
    setBatchCycle('daily')
    setBatchAmount(null)
    setBatchEnabled(true)
    setBatchModalOpen(true)
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
      content: '您即将将所有额度状态替换为「关闭消费额度」，是否确认操作？',
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
    setLimitRows(ALL_MODEL_LIST.map((r) => ({ ...r })))
    setLimitSearch('')
    setBatchLevel('T1')
    setSelectedLimitKeys([])
    setLimitModalOpen(true)
  }

  const filteredLimitRows = useMemo(() => {
    if (!limitSearch) return limitRows
    const k = limitSearch.toLowerCase()
    return limitRows.filter((r) => r.modelName.toLowerCase().includes(k))
  }, [limitRows, limitSearch])

  const handleReplaceLevel = () => {
    if (selectedLimitKeys.length === 0) {
      message.warning('请选择要设置的模型')
      return
    }
    confirm({
      title: '确认替换',
      content: `您即将将所选模型的限额等级替换为「${batchLevel}」，是否确认操作？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setLimitRows((prev) =>
          prev.map((r) =>
            selectedLimitKeys.includes(r.key) ? { ...r, limitLevel: batchLevel as LimitModelRow['limitLevel'] } : r,
          ),
        )
        message.success('替换成功')
      },
    })
  }

  const handleSaveLimit = () => {
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
              {r.realName}
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
      render: (v) => (v ? <Text>{v}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: '账户净资产',
      dataIndex: 'assets',
      width: 130,
      align: 'right',
      render: (n: number) => <Text>{n.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</Text>,
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
      title: '已开通资源包',
      key: 'openedPack',
      width: 220,
      render: (_, r) => {
        const op = openedPackMap[r.key]
        if (!op) return <Text type="secondary">—</Text>
        return (
          <Tooltip
            title={
              <div style={{ lineHeight: 1.8 }}>
                <div>编码：{op.packCode}</div>
                <div>生效：{op.effectiveRange[0]} ~ {op.effectiveRange[1]}</div>
                <div>计价：{op.billingMethod === 'prepaid' ? '预付费' : '后付费'}</div>
                <div>开通时间：{op.openedAt}</div>
              </div>
            }
          >
            <Tag color="blue" style={{ margin: 0 }}>
              {op.packName}
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '操作',
      fixed: 'right',
      width: 260,
      render: (_, r) => (
        <Space size={12}>
          <a>余额调整</a>
          <a>调整限额</a>
          <a onClick={() => openPackModal(r)}>
            {openedPackMap[r.key] ? '修改资源包' : '开通资源包'}
          </a>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {STAT_CARDS.map((s) => (
          <Card key={s.label} variant="borderless" styles={{ body: { padding: 16 } }}>
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
          <Text>资源包名称：</Text>
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="请输入资源包名称"
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
          <Space size={6} align="center">
            <Text strong style={{ fontSize: 16 }}>账户信息</Text>
            <RequirementDot
              title="账户信息列表需求"
              sections={[
                {
                  label: '功能需求',
                  items: [
                    '账户信息列表增加标签字段。展示用户的标签（不展示在个人的企业子账户上）；增加资源包列，展示已开通的资源包。',
                    '支持按照标签搜索账户。标签支持多选；支持根据资源包名称模糊搜索；',
                    '在账户前加复选框，支持批量选择账户，批量设置模型使用限额',
                    '点击【批量设置模型消费额度】检查是否选择账户，未选择，提示"请选择要设置的账户"；选择后弹窗',
                    '点击【调整配额】检查是否选择账户，未选择，提示"请选择要设置的账户"；选择后弹窗',
                    '操作栏增加开通资源包功能，点击后如弹窗。开通资源包后，在生效时间范围内，则所有模型的使用按照资源包价格计费，不再走平台售价。超过生效时间，则继续按照平台价格计费。需要标记每一次价格是否采用资源包计费。',
                    '如为预付费，则每次调用需要验证账户金额。如为后付费，则不需要验证账户金额。',
                    '关闭资源包后，按照平台价计费。',
                    '开通资源包仅针对个人账号和企业账号，不包括企业子账号。企业子账号不展示该操作。',
                  ],
                },
              ]}
            />
          </Space>
          <Space>
            <Button icon={<SettingOutlined />} onClick={openBatchQuota}>
              批量设置模型消费额度
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

      {/* 批量设置模型消费额度 弹窗 */}
      <Modal
        title={
          <Space size={6} align="center">
            批量设置模型消费额度
            <RequirementDot
              title="批量设置模型消费额度需求"
              sections={[
                {
                  label: '模型列表排序',
                  items: ['限额的模型列表按照模型上架时间倒序展示'],
                },
                {
                  label: '限额周期解释',
                  items: [
                    '每日：每天00:00清空前一天限额，重新计算限额',
                    '每周：每周一00:00，清空前一周限额，重新计算限额',
                    '每月：每月1日00:00，清空前一月限额，重新计算限额',
                    '每季：每季度1日00:00，清空前一季度限额，重新计算限额',
                    '每年：每年1月1日00:00，清空前一年限额，重新计算限额',
                    '永久：不限制时间',
                  ],
                },
                {
                  label: '限额金额',
                  items: ['限额金额为1～99999元'],
                },
                {
                  label: '限额状态',
                  items: [
                    '默认开启限额（此处是展示设置默认开启，修改后保存修改后的信息。但未设置过的用户均不限额）',
                    '开启时，限额生效。关闭时，不再限制使用额度',
                  ],
                },
                {
                  label: '限额规则',
                  items: [
                    '支持为所有已上架模型设置账户的使用限额和限额周期',
                    '在周期内，用户在某个模型下，仅能使用设置的限额金额，周期结束后重新开始限制额度（最后一次请求可能产生负数，可在下次循环时扣减）',
                  ],
                },
                {
                  label: '通知规则',
                  items: [
                    '限额保存成功后，需要向用户账号发送通知，通知内容为：尊敬的用户，为了提高模型使用效率，现针对不同模型设置限额使用，具体信息如下（仅展示为当前用户设置的，限额状态为开启的信息）',
                  ],
                },
                {
                  label: '批量替换与保存',
                  items: [
                    '批量操作中，每次设置后，点击批量替换，则批量替换所有内容，仅页面展示内容做替换，但不生效',
                    '所有设置，点击保存后才生效',
                  ],
                },
              ]}
            />
          </Space>
        }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
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
            <Text>额度状态：</Text>
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
              title: '额度状态',
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
        title={
          <Space size={6} align="center">
            调整配额
            <RequirementDot
              title="调整配额需求"
              sections={[
                {
                  label: '功能需求',
                  items: [
                    '1.支持根据模型名称模糊搜索模型',
                    '2.支持批量替换限额；仅页面展示为替换的限额，保存后才生效',
                    '3.点击批量替换时候，检查是否选中模型，未选择提示"请选择模型"，选择后，批量替换功能仅对选择的模型生效。注意：如第一次选择了3个模型，限额批量替换为t1；页面未关闭，也未保存，又选择了4个，设置为t5。则保存的时候要对前后的7个模型的限额都做修改。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={limitModalOpen}
        onCancel={() => setLimitModalOpen(false)}
        onOk={handleSaveLimit}
        okText="保存"
        cancelText="取消"
        centered
        width={900}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            可为选择的模型批量替换限额，替换后请点击<span style={{ color: '#ff4d4f' }}>【保存】</span>按钮才可生效
          </Text>
        </div>
        <Space size={12} wrap style={{ marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="搜索模型名称"
            value={limitSearch}
            onChange={(e) => setLimitSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Text>限额等级：</Text>
          <Select
            style={{ width: 120 }}
            value={batchLevel}
            onChange={setBatchLevel}
            options={LIMIT_LEVEL_OPTIONS}
          />
          <Button type="primary" onClick={handleReplaceLevel}>
            批量替换
          </Button>
        </Space>
        <Table<LimitModelRow>
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ y: 320 }}
          dataSource={filteredLimitRows}
          rowSelection={{
            selectedRowKeys: selectedLimitKeys,
            onChange: setSelectedLimitKeys,
            columnWidth: 48,
          }}
          columns={[
            {
              title: '模型名称',
              dataIndex: 'modelName',
              width: 260,
            },
            {
              title: '限额等级',
              dataIndex: 'limitLevel',
              width: 120,
              render: (v: LimitModelRow['limitLevel']) =>
                v ? (
                  <Tag color={QUOTA_LEVEL_COLORS[v] || '#8c8c8c'} style={{ borderRadius: 20 }}>
                    {v}
                  </Tag>
                ) : (
                  <Text type="secondary">—</Text>
                ),
            },
            {
              title: 'RPM（请求/分钟）',
              dataIndex: 'limitLevel',
              width: 160,
              render: (v: LimitModelRow['limitLevel']) => {
                if (!v) return <Text type="secondary">—</Text>
                const p = LIMIT_PRESETS[v]
                return <Text>{p.rpm}</Text>
              },
            },
            {
              title: 'TPM（Token/分钟）',
              dataIndex: 'limitLevel',
              width: 160,
              render: (v: LimitModelRow['limitLevel']) => {
                if (!v) return <Text type="secondary">—</Text>
                const p = LIMIT_PRESETS[v]
                return <Text>{p.tpm.toLocaleString()}</Text>
              },
            },
          ]}
        />
      </Modal>

      {/* 开通/修改资源包 弹窗 */}
      <Modal
        title={packTargetKey && openedPackMap[packTargetKey] ? '修改资源包' : '开通资源包'}
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
                title="关闭资源包"
                description="关闭后将按照平台价计费，是否确认关闭？"
                okText="确认关闭"
                cancelText="取消"
                onConfirm={() => {
                  handleClosePack(packTargetKey)
                  setPackModalOpen(false)
                }}
              >
                <Button danger>关闭资源包</Button>
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

          {/* 资源包选择（单选，仅上架） */}
          <div>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                资源包（仅展示已上架）
              </Text>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择资源包"
              value={packForm.packId}
              onChange={(v) => setPackForm((f) => ({ ...f, packId: v }))}
              options={availablePacks.map((p) => ({
                value: p.id,
                label: `${p.name}（${p.code}）`,
              }))}
              notFoundContent="暂无可开通的资源包"
            />
            {availablePacks.length === 0 && (
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  当前没有已上架的资源包，请先在「资源包管理」中上架。
                </Text>
              </div>
            )}
          </div>

          {/* 生效时间范围 */}
          <div>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                生效时间范围
              </Text>
            </div>
            <RangePicker
              style={{ width: '100%' }}
              value={packForm.range}
              onChange={(v) =>
                setPackForm((f) => ({ ...f, range: v as [Dayjs, Dayjs] | null }))
              }
            />
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
    </div>
  )
}
