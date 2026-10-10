import { useMemo, useState } from 'react'
import {
  Table,
  Tag,
  Typography,
  Space,
  Modal,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Popconfirm,
  Form,
  Breadcrumb,
  Card,
  Tooltip,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  EditOutlined,
  TeamOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'
import { maskName } from '../components/SecretCell'

const { Text } = Typography

/* ---------------- 数据类型 ---------------- */
type CycleType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
type SetMode = 'reset' | 'adjust'

interface ExecRecord {
  runAt: string
  runStatus: 'success' | 'partial' | 'failed'
  targetCount: number
  executedCount: number
}

interface RechargeTask {
  id: string
  createdAt: string
  cycle: CycleType
  amount: number
  setMode: SetMode
  nextRunAt: string
  accountCount: number
  status: 'active' | 'inactive'
  remark?: string
  targetType: 'tag' | 'user'
  targetTags?: string[]
  targetUserKeys?: string[]
  execHistory?: ExecRecord[]
}

const CYCLE_LABEL: Record<CycleType, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
}

const CYCLE_OPTIONS = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'yearly', label: '每年' },
]

/* ---------------- mock 数据 ---------------- */
const initialTasks: RechargeTask[] = [
  {
    id: 'RT20260817001',
    createdAt: '2026-08-15 10:24:12',
    cycle: 'monthly',
    amount: 1000,
    setMode: 'reset',
    nextRunAt: '2026-09-01 00:00:00',
    accountCount: 10,
    status: 'active',
    remark: '月度充值任务',
    targetType: 'tag',
    targetTags: ['内部员工', 'VIP'],
    execHistory: [
      { runAt: '2026-08-01 00:00:12', runStatus: 'success', targetCount: 10, executedCount: 10 },
      { runAt: '2026-07-01 00:00:08', runStatus: 'partial', targetCount: 10, executedCount: 8 },
      { runAt: '2026-06-01 00:00:05', runStatus: 'success', targetCount: 10, executedCount: 10 },
    ],
  },
  {
    id: 'RT20260817002',
    createdAt: '2026-08-10 14:30:05',
    cycle: 'weekly',
    amount: 500,
    setMode: 'adjust',
    nextRunAt: '2026-08-25 00:00:00',
    accountCount: 8,
    status: 'active',
    targetType: 'user',
    targetUserKeys: ['a1', 'a2', 'a3', 'a4', 'a6', 'a7', 'a8', 'a10'],
    execHistory: [
      { runAt: '2026-08-18 00:00:10', runStatus: 'success', targetCount: 8, executedCount: 8 },
      { runAt: '2026-08-11 00:00:07', runStatus: 'failed', targetCount: 8, executedCount: 0 },
    ],
  },
  {
    id: 'RT20260817003',
    createdAt: '2026-08-05 09:12:48',
    cycle: 'quarterly',
    amount: 5000,
    setMode: 'adjust',
    nextRunAt: '2026-10-01 00:00:00',
    accountCount: 3,
    status: 'inactive',
    remark: '已暂停',
    targetType: 'tag',
    targetTags: ['合作伙伴'],
    execHistory: [
      { runAt: '2026-07-01 00:00:15', runStatus: 'success', targetCount: 3, executedCount: 3 },
    ],
  },
  {
    id: 'RT20260817004',
    createdAt: '2026-08-20 16:00:33',
    cycle: 'daily',
    amount: 200,
    setMode: 'adjust',
    nextRunAt: '2026-08-31 00:00:00',
    accountCount: 15,
    status: 'active',
    remark: '每日额度补充',
    targetType: 'tag',
    targetTags: ['员工介绍', '内部员工'],
    execHistory: [
      { runAt: '2026-08-30 00:00:03', runStatus: 'success', targetCount: 15, executedCount: 15 },
      { runAt: '2026-08-29 00:00:02', runStatus: 'success', targetCount: 15, executedCount: 15 },
      { runAt: '2026-08-28 00:00:04', runStatus: 'partial', targetCount: 15, executedCount: 13 },
      { runAt: '2026-08-27 00:00:01', runStatus: 'success', targetCount: 15, executedCount: 15 },
    ],
  },
  {
    id: 'RT20260817005',
    createdAt: '2026-08-22 11:20:07',
    cycle: 'yearly',
    amount: 20000,
    setMode: 'reset',
    nextRunAt: '2027-08-22 00:00:00',
    accountCount: 6,
    status: 'active',
    targetType: 'tag',
    targetTags: ['VIP', '合作伙伴', '员工介绍'],
    execHistory: [],
  },
]

/* ---------------- mock 账户数据（用于「编辑覆盖账户」） ---------------- */
type AccountType = 'personal' | 'enterprise' | 'sub'
const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  personal: '个人账户',
  enterprise: '企业账户',
  sub: '企业子账户',
}

interface AccountItem {
  key: string
  accountName: string
  accountType: AccountType
  tags: { name: string; color: string }[]
}

const ACCOUNT_LIST: AccountItem[] = [
  { key: 'a1', accountName: 'zsdd4892250602', accountType: 'personal', tags: [{ name: '内部员工', color: '#2f6bff' }] },
  { key: 'a2', accountName: 'lyfyyds', accountType: 'personal', tags: [{ name: '内部员工', color: '#2f6bff' }, { name: '员工介绍', color: '#52c41a' }] },
  { key: 'a3', accountName: '13811305182', accountType: 'personal', tags: [{ name: '员工介绍', color: '#52c41a' }] },
  { key: 'a4', accountName: '18255445034', accountType: 'personal', tags: [] },
  { key: 'a5', accountName: 'acme_corp', accountType: 'enterprise', tags: [{ name: 'VIP', color: '#fa8c16' }] },
  { key: 'a6', accountName: 'acme_sub01', accountType: 'sub', tags: [] },
  { key: 'a7', accountName: 'acme_sub02', accountType: 'sub', tags: [] },
  { key: 'a8', accountName: 'tech_team', accountType: 'enterprise', tags: [{ name: '合作伙伴', color: '#722ed1' }] },
  { key: 'a9', accountName: 'dev_test', accountType: 'personal', tags: [{ name: '测试', color: '#13c2c2' }] },
  { key: 'a10', accountName: 'partner_a', accountType: 'enterprise', tags: [] },
]

/* ---------------- mock 标签列表 ---------------- */
const TAG_LIST = [
  { name: '内部员工', color: '#2f6bff' },
  { name: '员工介绍', color: '#52c41a' },
  { name: 'VIP', color: '#fa8c16' },
  { name: '合作伙伴', color: '#722ed1' },
  { name: '测试', color: '#13c2c2' },
]

/* ---------------- mock 用户数据（用于「添加账户」搜索） ---------------- */
interface UserItem extends AccountItem {
  nickname: string
  phone: string
  accountId: string
}

const USER_LIST: UserItem[] = [
  { key: 'u1', nickname: '张明', phone: '13811305182', accountId: 'ACC20260810PVPbI3MgE', accountName: '13811305182', accountType: 'personal', tags: [{ name: '员工介绍', color: '#52c41a' }] },
  { key: 'u2', nickname: '李怡凡', phone: '13900001111', accountId: 'ACC20260814lyfMj9dPB', accountName: 'lyfyyds', accountType: 'personal', tags: [{ name: '内部员工', color: '#2f6bff' }] },
  { key: 'u3', nickname: '王强', phone: '13700002222', accountId: 'ACC20260811WQabc1234', accountName: 'wangqiang', accountType: 'personal', tags: [] },
  { key: 'u4', nickname: '赵敏', phone: '13600003333', accountId: 'ACC20260812ZMdef5678', accountName: 'zhaomin', accountType: 'personal', tags: [{ name: 'VIP', color: '#fa8c16' }] },
  { key: 'u5', nickname: '陈刚', phone: '13500004444', accountId: 'ACC20260813CGghi9012', accountName: 'chengang', accountType: 'personal', tags: [] },
  { key: 'u6', nickname: 'Acme 管理员', phone: '13400005555', accountId: 'ACC20260801ACME0001', accountName: 'acme_corp', accountType: 'enterprise', tags: [{ name: 'VIP', color: '#fa8c16' }] },
  { key: 'u7', nickname: 'Tech Lead', phone: '13300006666', accountId: 'ACC20260802TECH0001', accountName: 'tech_team', accountType: 'enterprise', tags: [{ name: '合作伙伴', color: '#722ed1' }] },
  { key: 'u8', nickname: '刘洋', phone: '13200007777', accountId: 'ACC20260803LYaaaa0001', accountName: 'liuyang', accountType: 'personal', tags: [{ name: '测试', color: '#13c2c2' }] },
  { key: 'u9', nickname: '周婷', phone: '13100008888', accountId: 'ACC20260804ZTbbbb0002', accountName: 'zhouting', accountType: 'personal', tags: [] },
  { key: 'u10', nickname: '孙浩', phone: '13000009999', accountId: 'ACC20260805SHcccc0003', accountName: 'sunhao', accountType: 'personal', tags: [{ name: '员工介绍', color: '#52c41a' }] },
]

/* ---------------- mock 账户数据（用于「按用户」选择账户） ---------------- */
interface AccountItemV2 extends AccountItem {
  nickname: string
  phone: string
  accountId: string
  authName: string       // 认证信息
  remark: string
  status: 'active' | 'inactive'
}

const ACCOUNT_LIST_V2: AccountItemV2[] = [
  { key: 'a1', nickname: '张明', phone: '13811305182', accountId: 'ACC20260810PVPbI3MgE', accountName: '13811305182', accountType: 'personal', tags: [{ name: '员工介绍', color: '#52c41a' }], authName: '张明', remark: '老用户', status: 'active' },
  { key: 'a2', nickname: '李怡凡', phone: '13900001111', accountId: 'ACC20260814lyfMj9dPB', accountName: 'lyfyyds', accountType: 'personal', tags: [{ name: '内部员工', color: '#2f6bff' }], authName: '李怡凡', remark: '', status: 'active' },
  { key: 'a3', nickname: '王强', phone: '13700002222', accountId: 'ACC20260811WQabc1234', accountName: 'wangqiang', accountType: 'personal', tags: [], authName: '', remark: '需跟进', status: 'active' },
  { key: 'a4', nickname: '赵敏', phone: '13600003333', accountId: 'ACC20260812ZMdef5678', accountName: 'zhaomin', accountType: 'personal', tags: [{ name: 'VIP', color: '#fa8c16' }], authName: '赵敏', remark: '', status: 'inactive' },
  { key: 'a5', nickname: '陈刚', phone: '13500004444', accountId: 'ACC20260813CGghi9012', accountName: 'chengang', accountType: 'personal', tags: [], authName: '', remark: '', status: 'active' },
  { key: 'a6', nickname: 'Acme 管理员', phone: '13400005555', accountId: 'ACC20260801ACME0001', accountName: 'acme_corp', accountType: 'enterprise', tags: [{ name: 'VIP', color: '#fa8c16' }], authName: 'Acme 科技有限公司', remark: '企业客户', status: 'active' },
  { key: 'a7', nickname: 'Tech Lead', phone: '13300006666', accountId: 'ACC20260802TECH0001', accountName: 'tech_team', accountType: 'enterprise', tags: [{ name: '合作伙伴', color: '#722ed1' }], authName: 'Tech Team Inc', remark: '', status: 'active' },
  { key: 'a8', nickname: '刘洋', phone: '13200007777', accountId: 'ACC20260803LYaaaa0001', accountName: 'liuyang', accountType: 'personal', tags: [{ name: '测试', color: '#13c2c2' }], authName: '刘洋', remark: '测试账号', status: 'active' },
  { key: 'a9', nickname: '周婷', phone: '13100008888', accountId: 'ACC20260804ZTbbbb0002', accountName: 'zhouting', accountType: 'personal', tags: [], authName: '', remark: '', status: 'inactive' },
  { key: 'a10', nickname: '孙浩', phone: '13000009999', accountId: 'ACC20260805SHcccc0003', accountName: 'sunhao', accountType: 'personal', tags: [{ name: '员工介绍', color: '#52c41a' }, { name: 'VIP', color: '#fa8c16' }], authName: '孙浩', remark: '', status: 'active' },
]

/** 任务与账户的关联（mock 初始关联） */
const initialTaskAccounts: Record<string, string[]> = {
  RT20260817001: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'],
  RT20260817002: ['a1', 'a2', 'a3', 'a4', 'a5', 'a8', 'a9', 'a10'],
  RT20260817003: ['a1', 'a5', 'a9'],
}

/* ---------------- 工具：根据周期计算下次运行时间 ---------------- */
function nextRunTime(cycle: CycleType, from = dayjs()): string {
  const fmt = 'YYYY-MM-DD HH:mm:ss'
  switch (cycle) {
    case 'daily':
      return from.add(1, 'day').startOf('day').format(fmt)
    case 'weekly':
      return from.add(1, 'week').startOf('day').format(fmt)
    case 'monthly':
      return from.add(1, 'month').startOf('month').format(fmt)
    case 'quarterly':
      return from.add(3, 'month').startOf('month').format(fmt)
    case 'yearly':
      return from.add(1, 'year').startOf('year').format(fmt)
    default:
      return from.format(fmt)
  }
}

type TargetType = 'tag' | 'user'

interface FormState {
  cycle: CycleType
  amount: number | null
  setMode: SetMode
  remark?: string
  targetType: TargetType
  selectedTags: string[]
  selectedUserKeys: string[]
}

const emptyForm: FormState = {
  cycle: 'monthly',
  amount: null,
  setMode: 'adjust',
  remark: '',
  targetType: 'tag',
  selectedTags: [],
  selectedUserKeys: [],
}

export default function RechargeTask() {
  const [tasks, setTasks] = useState<RechargeTask[]>(initialTasks)

  /* 搜索 */
  const filtered = tasks

  /* 编辑/新增弹窗 */
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  /* 账户选择二级弹窗 */
  const [userPickOpen, setUserPickOpen] = useState(false)
  const [userPickTempKeys, setUserPickTempKeys] = useState<string[]>([])
  const [userPickKw, setUserPickKw] = useState('')        // 昵称 / 账户ID
  const [userPickTag, setUserPickTag] = useState<string | undefined>(undefined)
  /* 已执行任务弹窗 */
  const [execOpen, setExecOpen] = useState(false)
  const [execTask, setExecTask] = useState<RechargeTask | null>(null)

  /* 账户选择弹窗：筛选（点击搜索才过滤） */
  const [userPickCommitted, setUserPickCommitted] = useState<{ kw: string; tag?: string }>({ kw: '', tag: undefined })
  const filteredPickAccounts = useMemo(() => {
    const kw = userPickCommitted.kw.trim().toLowerCase()
    return ACCOUNT_LIST_V2.filter((a) => {
      if (kw) {
        if (!a.nickname.toLowerCase().includes(kw) && !a.accountId.toLowerCase().includes(kw)) return false
      }
      if (userPickCommitted.tag) {
        if (!a.tags.some((t) => t.name === userPickCommitted.tag)) return false
      }
      return true
    })
  }, [userPickCommitted])
  const handleUserPickSearch = () => setUserPickCommitted({ kw: userPickKw, tag: userPickTag })
  const handleUserPickReset = () => {
    setUserPickKw('')
    setUserPickTag(undefined)
    setUserPickCommitted({ kw: '', tag: undefined })
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (r: RechargeTask) => {
    setEditingId(r.id)
    setForm({
      cycle: r.cycle,
      amount: r.amount,
      setMode: r.setMode,
      remark: r.remark ?? '',
      targetType: r.targetType ?? 'tag',
      selectedTags: r.targetTags ?? [],
      selectedUserKeys: r.targetUserKeys ?? [],
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (form.amount === null || form.amount <= 0) {
      message.error('请输入调增金额')
      return
    }
    if (form.amount > 999999) {
      message.error('调增金额不能超过 999999 元')
      return
    }
    if (form.targetType === 'tag' && form.selectedTags.length === 0) {
      message.error('请至少选择一个标签')
      return
    }
    if (form.targetType === 'user' && form.selectedUserKeys.length === 0) {
      message.error('请至少选择一个账户')
      return
    }
    if (editingId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                cycle: form.cycle,
                amount: form.amount!,
                setMode: form.setMode,
                remark: form.remark,
                nextRunAt: nextRunTime(form.cycle),
                targetType: form.targetType,
                targetTags: form.targetType === 'tag' ? form.selectedTags : undefined,
                targetUserKeys: form.targetType === 'user' ? form.selectedUserKeys : undefined,
                accountCount:
                  form.targetType === 'user'
                    ? form.selectedUserKeys.length
                    : t.accountCount,
              }
            : t
        )
      )
      message.success('任务已更新')
    } else {
      const id = `RT${dayjs().format('YYYYMMDD')}${String(tasks.length + 1).padStart(3, '0')}`
      const task: RechargeTask = {
        id,
        createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        cycle: form.cycle,
        amount: form.amount!,
        setMode: form.setMode,
        accountCount: form.targetType === 'user' ? form.selectedUserKeys.length : 0,
        remark: form.remark,
        nextRunAt: nextRunTime(form.cycle),
        status: 'active',
        targetType: form.targetType,
        targetTags: form.targetType === 'tag' ? form.selectedTags : undefined,
        targetUserKeys: form.targetType === 'user' ? form.selectedUserKeys : undefined,
      }
      setTasks((prev) => [task, ...prev])
      // 初始化空关联
      setTaskAccounts((prev) => ({ ...prev, [id]: [] }))
      message.success('任务已创建')
    }
    setModalOpen(false)
  }

  /* 停用/启用 */
  const handleToggle = (id: string, current: 'active' | 'inactive') => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: current === 'active' ? 'inactive' : 'active',
              nextRunAt: current === 'active' ? '—' : nextRunTime(t.cycle),
            }
          : t
      )
    )
    message.success(current === 'active' ? '任务已停用' : '任务已启用')
  }

  /* 编辑覆盖账户弹窗 */
  const [taskAccounts, setTaskAccounts] = useState<Record<string, string[]>>(initialTaskAccounts)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [accountTargetId, setAccountTargetId] = useState<string | null>(null)
  const [selectedAccountKeys, setSelectedAccountKeys] = useState<string[]>([])

  // 移除单个已选账户
  const handleRemoveAccount = (key: string) => {
    setSelectedAccountKeys((prev) => prev.filter((k) => k !== key))
  }

  // 已选账户详情列表（同时来源于账户列表与用户列表）
  const selectedAccounts = useMemo(
    () => [...ACCOUNT_LIST, ...USER_LIST].filter((a) => selectedAccountKeys.includes(a.key)),
    [selectedAccountKeys]
  )

  /* 添加账户二级弹窗（按用户昵称/手机号/账户ID 搜索用户系统） */
  const [addAccModalOpen, setAddAccModalOpen] = useState(false)
  const [addAccTempKeys, setAddAccTempKeys] = useState<string[]>([])
  const [accSearchNickname, setAccSearchNickname] = useState('')
  const [accSearchPhone, setAccSearchPhone] = useState('')
  const [accSearchAccountId, setAccSearchAccountId] = useState('')
  // committed：点击「搜索」后才写入；searched：是否已搜索过（控制列表展示）
  const [accCommitted, setAccCommitted] = useState({ nickname: '', phone: '', accountId: '' })
  const [accSearched, setAccSearched] = useState(false)

  const filteredAccounts = useMemo(() => {
    return USER_LIST.filter((u) => {
      if (accCommitted.nickname && !u.nickname.toLowerCase().includes(accCommitted.nickname.toLowerCase())) return false
      if (accCommitted.phone && !u.phone.includes(accCommitted.phone)) return false
      if (accCommitted.accountId && !u.accountId.toLowerCase().includes(accCommitted.accountId.toLowerCase())) return false
      return true
    })
  }, [accCommitted])

  const openAccountModal = (r: RechargeTask) => {
    setAccountTargetId(r.id)
    const linked = taskAccounts[r.id] ?? []
    setSelectedAccountKeys(linked)
    setAccountModalOpen(true)
  }

  // 打开添加账户二级弹窗
  const openAddAccModal = () => {
    setAddAccTempKeys([])
    setAccSearchNickname('')
    setAccSearchPhone('')
    setAccSearchAccountId('')
    setAccCommitted({ nickname: '', phone: '', accountId: '' })
    setAccSearched(false)
    setAddAccModalOpen(true)
  }

  // 执行搜索
  const handleAccSearch = () => {
    setAccCommitted({ nickname: accSearchNickname, phone: accSearchPhone, accountId: accSearchAccountId })
    setAccSearched(true)
  }

  // 重置搜索
  const handleAccReset = () => {
    setAccSearchNickname('')
    setAccSearchPhone('')
    setAccSearchAccountId('')
    setAccCommitted({ nickname: '', phone: '', accountId: '' })
    setAccSearched(false)
  }

  // 确认添加账户
  const handleConfirmAdd = () => {
    const newKeys = addAccTempKeys.filter((k) => !selectedAccountKeys.includes(k))
    if (newKeys.length === 0) {
      message.info('未选择新账户')
      return
    }
    setSelectedAccountKeys((prev) => [...prev, ...newKeys])
    message.success(`已添加 ${newKeys.length} 个账户`)
    setAddAccModalOpen(false)
  }

  const handleSaveAccount = () => {
    setTaskAccounts((prev) => ({ ...prev, [accountTargetId!]: selectedAccountKeys }))
    // 同步更新任务的 accountCount
    setTasks((prev) =>
      prev.map((t) => (t.id === accountTargetId ? { ...t, accountCount: selectedAccountKeys.length } : t))
    )
    message.success(`覆盖账户已更新，共 ${selectedAccountKeys.length} 个账户`)
    setAccountModalOpen(false)
  }

  /* 删除 */
  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    message.success('任务已删除')
  }

  /* 列定义 */
  const columns: ColumnsType<RechargeTask> = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      width: 180,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
    },
    {
      title: '预设周期',
      dataIndex: 'cycle',
      key: 'cycle',
      width: 100,
      render: (v: CycleType) => <Tag color="blue">{CYCLE_LABEL[v]}</Tag>,
    },
    {
      title: '调增金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>¥{v.toLocaleString()}</Text>,
    },
    {
      title: '设置方式',
      dataIndex: 'setMode',
      key: 'setMode',
      width: 160,
      render: (v: SetMode) =>
        v === 'reset' ? '现有账户清零，重新设置' : '在现有基础上调整',
    },
    {
      title: '任务受众类型',
      dataIndex: 'targetType',
      key: 'targetType',
      width: 120,
      align: 'center',
      render: (v: 'tag' | 'user', r) => {
        if (v === 'tag') {
          const tags = r.targetTags ?? []
          return (
            <Tooltip
              title={
                tags.length > 0 ? (
                  <Space size={4} wrap>
                    {tags.map((t: string) => {
                      const tagData = TAG_LIST.find((x) => x.name === t)
                      return <Tag key={t} color={tagData?.color}>{t}</Tag>
                    })}
                  </Space>
                ) : '未选择标签'
              }
            >
              <span style={{ cursor: 'pointer', color: '#2f6bff' }}>
                按标签{tags.length > 0 ? `（${tags.length}）` : ''}
              </span>
            </Tooltip>
          )
        }
        return <span>按用户</span>
      },
    },
    {
      title: '下一次运行时间',
      dataIndex: 'nextRunAt',
      key: 'nextRunAt',
      width: 180,
      render: (v: string) =>
        v === '—' ? <Text type="secondary">—</Text> : v,
    },
    {
      title: '覆盖账户数量',
      dataIndex: 'accountCount',
      key: 'accountCount',
      width: 130,
      align: 'center',
      render: (v: number) => <Text style={{ color: '#2f6bff' }}>{v}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (v: string) =>
        v === 'active' ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 340,
      align: 'center',
      render: (_, r) => (
        <Space size={4} wrap>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setExecTask(r)
              setExecOpen(true)
            }}
          >
            已执行任务
          </Button>
          <Popconfirm
            title={r.status === 'active' ? '停用任务' : '启用任务'}
            description={
              r.status === 'active'
                ? '停用后任务将不再按周期执行，是否确认停用？'
                : '启用后任务将按周期执行，是否确认启用？'
            }
            okText="确认"
            cancelText="取消"
            onConfirm={() => handleToggle(r.id, r.status)}
          >
            <Button size="small" type="link" danger={r.status === 'active'}>
              {r.status === 'active' ? '停用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="删除任务"
            description="确定要删除该充值任务吗？此操作不可恢复"
            okText="确认"
            cancelText="取消"
            onConfirm={() => handleDelete(r.id)}
          >
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: '账户管理' }, { title: '定时充值任务' }]}
      />

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Space size={8}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>定时充值任务列表</span>
            <RequirementDot
              title="定时充值任务管理需求"
              sections={[
                {
                  label: '功能需求',
                  items: [
                    '定时充值任务来源于「账户列表 → 批量设置余额」中设置的周期性调整任务，每创建一个周期任务都会在此列表生成一条记录。',
                    '列表展示：任务创建时间、预设周期（每日/每周/每月/每季度/每年）、调增金额、设置方式、下一次运行时间、覆盖账户数量、状态、操作。',
                    '操作支持：编辑设置（修改周期、金额、清空策略等）、停用/启用（停用后不再执行，支持再次启用）、编辑任务覆盖账户（增减覆盖账户）、删除（删除后不再执行）。',
                    '停用任务后，下一次运行时间显示为「—」；再次启用后，根据当前周期重新计算下次运行时间。',
                  ],
                },
              ]}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增任务
          </Button>
        </div>
        <Table<RechargeTask>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{
            showTotal: (t) => `共 ${t} 条记录`,
            defaultPageSize: 20,
          }}
        />
      </Card>

      {/* 新增/编辑任务 弹窗 */}
      <Modal
        title={editingId ? '编辑充值任务' : '新增充值任务'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        centered
        width={560}
        destroyOnClose
      >
        <Form layout="vertical" style={{ paddingTop: 8 }}>
          {/* 任务受众类型 */}
          <Form.Item label="任务受众类型" required>
            <Select
              style={{ width: '100%' }}
              value={form.targetType}
              onChange={(v: TargetType) => setForm((f) => ({ ...f, targetType: v, selectedTags: [], selectedUserKeys: [] }))}
              options={[
                { value: 'tag', label: '按标签' },
                { value: 'user', label: '按用户' },
              ]}
            />
          </Form.Item>

          {/* 按标签：多选标签 */}
          {form.targetType === 'tag' && (
            <Form.Item label="选择标签（支持多选，至少选一个）" required>
              <Select
                mode="multiple"
                allowClear
                maxTagCount={3}
                placeholder="请选择标签"
                style={{ width: '100%' }}
                value={form.selectedTags}
                onChange={(v: string[]) => setForm((f) => ({ ...f, selectedTags: v }))}
                options={TAG_LIST.map((t) => ({ value: t.name, label: t.name }))}
                tagRender={(props) => {
              const tagData = TAG_LIST.find((t) => t.name === props.value)
              return (
                <Tag
                  color={tagData?.color}
                  closable={props.closable}
                  onClose={props.onClose}
                  style={{ marginRight: 3 }}
                >
                  {props.label}
                </Tag>
              )
                }}
              />
            </Form.Item>
          )}

          {/* 按用户：选择账户 */}
          {form.targetType === 'user' && (
            <Form.Item label="选择账户（支持多选，至少选一个）" required>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button
                  type="primary"
                  ghost
                  onClick={() => {
                    setUserPickTempKeys([...form.selectedUserKeys])
                    setUserPickOpen(true)
                  }}
                >
                  选择账户
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  已选 {form.selectedUserKeys.length} 个账户
                </Text>
              </div>
              {form.selectedUserKeys.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Space size={4} wrap>
                    {form.selectedUserKeys.slice(0, 3).map((key) => {
                      const u = ACCOUNT_LIST_V2.find((x) => x.key === key)
                      if (!u) return null
                      return (
                        <Tag
                          key={key}
                          closable
                          onClose={() => setForm((f) => ({
                            ...f,
                            selectedUserKeys: f.selectedUserKeys.filter((k) => k !== key),
                          }))}
                        >
                          {maskName(u.nickname)}{u.authName && u.authName !== u.nickname ? `（${maskName(u.authName)}）` : ''}
                        </Tag>
                      )
                    })}
                    {form.selectedUserKeys.length > 3 && (
                      <Tooltip
                        title={
                          <Space size={4} wrap>
                            {form.selectedUserKeys.slice(3).map((key) => {
                              const u = ACCOUNT_LIST_V2.find((x) => x.key === key)
                              if (!u) return null
                              return <Tag key={key} style={{ marginBottom: 2 }}>{maskName(u.nickname)}{u.authName && u.authName !== u.nickname ? `（${maskName(u.authName)}）` : ''}</Tag>
                            })}
                          </Space>
                        }
                      >
                        <Tag style={{ cursor: 'pointer', background: '#f0f5ff', borderColor: '#adc6ff', color: '#2f6bff' }}>
                          +{form.selectedUserKeys.length - 3}
                        </Tag>
                      </Tooltip>
                    )}
                  </Space>
                </div>
              )}
            </Form.Item>
          )}

          <Form.Item label="预设周期" required>
            <Select
              style={{ width: '100%' }}
              value={form.cycle}
              onChange={(v) => setForm((f) => ({ ...f, cycle: v }))}
              options={CYCLE_OPTIONS}
            />
          </Form.Item>
          <Form.Item label="调增金额（1~999999 元，支持 2 位小数）" required>
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={999999}
              precision={2}
              placeholder="请输入调增金额"
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            />
          </Form.Item>
          <Form.Item label="设置方式" required>
            <Select
              style={{ width: '100%' }}
              value={form.setMode}
              onChange={(v) => setForm((f) => ({ ...f, setMode: v }))}
              options={[
                { value: 'adjust', label: '在现有基础上调整' },
                { value: 'reset', label: '现有账户清零，重新设置' },
              ]}
            />
          </Form.Item>
          <Form.Item label="备注（选填，20 字内）">
            <Input
              maxLength={20}
              showCount
              placeholder="请输入备注"
              value={form.remark}
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑覆盖账户 弹窗 */}
      <Modal
        title={
          <Space size={8}>
            <span>编辑任务覆盖账户</span>
            <RequirementDot
              title="编辑任务覆盖账户需求"
              sections={[
                {
                  label: '功能需求',
                  items: [
                    '展示目前该任务影响的账户信息。',
                    '支持添加账户，添加后即生效。',
                    '移除账户时，需要二次提示「是否将该账户从本次任务中移除？」，确认后移除该账户。',
                    '移除操作，保存后生效。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={accountModalOpen}
        onCancel={() => setAccountModalOpen(false)}
        onOk={handleSaveAccount}
        okText="保存"
        cancelText="取消"
        centered
        width={780}
        destroyOnClose
      >
        <div style={{ paddingTop: 8 }}>
          {/* 顶部：已选数量 + 添加账户/添加用户 按钮 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              已选 <Text strong style={{ color: '#2f6bff' }}>{selectedAccountKeys.length}</Text> 个账户
            </Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddAccModal}>
              添加账户
            </Button>
          </div>

          {/* 已选账户表格 */}
          <Table<AccountItem>
            rowKey="key"
            size="small"
            columns={[
              { title: '账户名称', dataIndex: 'accountName', key: 'accountName' },
              {
                title: '账户类型',
                dataIndex: 'accountType',
                key: 'accountType',
                width: 120,
                render: (v: AccountType) => ACCOUNT_TYPE_LABEL[v],
              },
              {
                title: '标签',
                key: 'tags',
                width: 200,
                render: (_, r) =>
                  r.tags.length === 0 ? (
                    <Text type="secondary">—</Text>
                  ) : (
                    <Space size={4} wrap>
                      {r.tags.map((t) => (
                        <Tag key={t.name} color={t.color}>{t.name}</Tag>
                      ))}
                    </Space>
                  ),
              },
              {
                title: '操作',
                key: 'action',
                width: 100,
                align: 'center',
                render: (_, r) => (
                  <Popconfirm
                    title="移除确认"
                    description="是否将该账户从本次任务中移除？"
                    okText="确认"
                    cancelText="取消"
                    onConfirm={() => handleRemoveAccount(r.key)}
                  >
                    <Button
                      size="small"
                      type="link"
                      danger
                      icon={<CloseOutlined />}
                    >
                      移除
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
            dataSource={selectedAccounts}
            scroll={{ y: 300 }}
            pagination={false}
            locale={{ emptyText: '暂无已选账户，点击「添加账户」选择' }}
          />
        </div>
      </Modal>

      {/* 添加账户 二级弹窗（按 昵称/手机号/账户ID 搜索用户系统） */}
      <Modal
        title={
          <Space size={8}>
            <span>添加账户</span>
            <RequirementDot
              title="添加账户需求"
              sections={[
                {
                  label: '功能需求',
                  items: [
                    '支持根据用户昵称模糊搜索、手机号模糊搜索、账户ID精确搜索，搜索后展示搜索到的账户。',
                    '点击确认添加后，如该用户已在任务中，则无需处理；如用户未在任务中，则建立关联关系，提示添加成功，该用户也适用本任务。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={addAccModalOpen}
        onCancel={() => setAddAccModalOpen(false)}
        onOk={handleConfirmAdd}
        okText="确认添加"
        cancelText="取消"
        centered
        width={860}
        destroyOnClose
      >
        <div style={{ paddingTop: 8 }}>
          {/* 筛选区 */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>用户昵称：</span>
              <Input
                style={{ width: 160 }}
                allowClear
                placeholder="请输入用户昵称"
                value={accSearchNickname}
                onChange={(e) => setAccSearchNickname(e.target.value)}
                onPressEnter={handleAccSearch}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>手机号：</span>
              <Input
                style={{ width: 160 }}
                allowClear
                placeholder="请输入手机号"
                value={accSearchPhone}
                onChange={(e) => setAccSearchPhone(e.target.value)}
                onPressEnter={handleAccSearch}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>账户ID：</span>
              <Input
                style={{ width: 200 }}
                allowClear
                placeholder="请输入账户ID"
                value={accSearchAccountId}
                onChange={(e) => setAccSearchAccountId(e.target.value)}
                onPressEnter={handleAccSearch}
              />
            </div>
            <Space>
              <Button type="primary" onClick={handleAccSearch}>
                搜索
              </Button>
              <Button onClick={handleAccReset}>
                重置
              </Button>
            </Space>
          </div>

          <Table<UserItem>
            rowKey="key"
            size="small"
            columns={[
              { title: '用户昵称', dataIndex: 'nickname', key: 'nickname', width: 120, render: (v: string) => maskName(v) },
              { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
              {
                title: '账户ID',
                dataIndex: 'accountId',
                key: 'accountId',
                width: 200,
                render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
              },
              { title: '账户名称', dataIndex: 'accountName', key: 'accountName' },
              {
                title: '账户类型',
                dataIndex: 'accountType',
                key: 'accountType',
                width: 100,
                render: (v: AccountType) => ACCOUNT_TYPE_LABEL[v],
              },
              {
                title: '标签',
                key: 'tags',
                width: 160,
                render: (_, r) =>
                  r.tags.length === 0 ? (
                    <Text type="secondary">—</Text>
                  ) : (
                    <Space size={4} wrap>
                      {r.tags.map((t) => (
                        <Tag key={t.name} color={t.color}>{t.name}</Tag>
                      ))}
                    </Space>
                  ),
              },
              {
                title: '状态',
                key: 'status',
                width: 90,
                align: 'center',
                render: (_, r) =>
                  selectedAccountKeys.includes(r.key) ? (
                    <Tag color="default">已添加</Tag>
                  ) : null,
              },
            ]}
            dataSource={accSearched ? filteredAccounts : []}
            scroll={{ y: 360 }}
            pagination={false}
            locale={{
              emptyText: accSearched
                ? '未查询到符合条件的账户'
                : '请输入搜索条件后点击「搜索」查询账户',
            }}
            rowSelection={{
              selectedRowKeys: addAccTempKeys,
              onChange: (keys) => setAddAccTempKeys(keys.map(String)),
              getCheckboxProps: (r) => ({
                disabled: selectedAccountKeys.includes(r.key),
              }),
            }}
          />
        </div>
      </Modal>

      {/* 账户选择 二级弹窗 */}
      <Modal
        title="选择账户"
        open={userPickOpen}
        onCancel={() => {
          setUserPickOpen(false)
          setUserPickKw('')
          setUserPickTag(undefined)
          setUserPickCommitted({ kw: '', tag: undefined })
        }}
        onOk={() => {
          if (userPickTempKeys.length === 0) {
            message.error('请至少选择一个账户')
            return
          }
          setForm((f) => ({ ...f, selectedUserKeys: [...userPickTempKeys] }))
          setUserPickOpen(false)
          setUserPickKw('')
          setUserPickTag(undefined)
          setUserPickCommitted({ kw: '', tag: undefined })
        }}
        okText="确认选择"
        cancelText="取消"
        centered
        width={880}
        destroyOnClose
      >
        <div style={{ paddingTop: 8 }}>
          {/* 搜索区 */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>昵称/账户ID：</span>
              <Input
                style={{ width: 200 }}
                allowClear
                placeholder="请输入昵称或账户ID"
                value={userPickKw}
                onChange={(e) => setUserPickKw(e.target.value)}
                onPressEnter={handleUserPickSearch}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>标签：</span>
              <Select
                style={{ width: 160 }}
                allowClear
                placeholder="请选择标签"
                value={userPickTag}
                onChange={(v) => setUserPickTag(v)}
                options={TAG_LIST.map((t) => ({ value: t.name, label: t.name }))}
              />
            </div>
            <Space>
              <Button type="primary" onClick={handleUserPickSearch}>搜索</Button>
              <Button onClick={handleUserPickReset}>重置</Button>
            </Space>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
              已选 {userPickTempKeys.length} 个账户 / 共 {filteredPickAccounts.length} 个
            </Text>
          </div>

          <Table<AccountItemV2>
            rowKey="key"
            size="small"
            columns={[
              {
                title: '账户信息',
                dataIndex: 'nickname',
                key: 'nickname',
                width: 260,
                render: (v, r) => (
                  <div>
                    {r.authName && (
                      <div style={{ fontWeight: 500 }}>
                        {maskName(r.authName)}
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 6, fontWeight: 400 }}>已实名</Text>
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#666' }}>{maskName(r.nickname)}</div>
                    <div style={{ fontSize: 11, color: '#996', fontFamily: 'monospace' }}>ID: {r.accountId}</div>
                  </div>
                ),
              },
              {
                title: '标签',
                key: 'tags',
                width: 200,
                render: (_, r) =>
                  r.tags.length === 0 ? (
                    <Text type="secondary">—</Text>
                  ) : (
                    <Space size={4} wrap>
                      {r.tags.map((t) => (
                        <Tag key={t.name} color={t.color}>{t.name}</Tag>
                      ))}
                    </Space>
                  ),
              },
              {
                title: '账户类型',
                dataIndex: 'accountType',
                key: 'accountType',
                width: 110,
                render: (v: AccountType) => {
                  const map: Record<AccountType, { label: string; color: string }> = {
                    personal: { label: '个人账号', color: '#fff1f0' },
                    enterprise: { label: '企业账号', color: '#e6f7ff' },
                    sub: { label: '企业子账号', color: '#f6ffed' },
                  }
                  const cfg = map[v]
                  return (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 10,
                        background: cfg.color,
                        fontSize: 12,
                        color: '#555',
                      }}
                    >
                      {cfg.label}
                    </span>
                  )
                },
              },
            ]}
            dataSource={filteredPickAccounts}
            scroll={{ y: 400 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys: userPickTempKeys,
              onChange: (keys) => setUserPickTempKeys(keys.map(String)),
            }}
          />
        </div>
      </Modal>

      {/* 已执行任务 弹窗 */}
      <Modal
        title="已执行任务"
        open={execOpen}
        onCancel={() => setExecOpen(false)}
        footer={<Button onClick={() => setExecOpen(false)}>关闭</Button>}
        centered
        width={720}
        destroyOnClose
      >
        <div style={{ paddingTop: 8 }}>
          {execTask && (execTask.execHistory ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary" style={{ fontSize: 14 }}>暂无执行记录</Text>
            </div>
          ) : (
            <Table<ExecRecord>
              rowKey={(r) => r.runAt}
              size="small"
              columns={[
                {
                  title: '运行时间',
                  dataIndex: 'runAt',
                  key: 'runAt',
                  width: 200,
                },
                {
                  title: '运行状态',
                  dataIndex: 'runStatus',
                  key: 'runStatus',
                  width: 120,
                  align: 'center',
                  render: (v: ExecRecord['runStatus']) => {
                    const map = {
                      success: { label: '成功', color: 'green' },
                      partial: { label: '部分成功', color: 'orange' },
                      failed: { label: '失败', color: 'red' },
                    } as const
                    const cfg = map[v]
                    return <Tag color={cfg.color}>{cfg.label}</Tag>
                  },
                },
                {
                  title: '已执行账户数',
                  dataIndex: 'executedCount',
                  key: 'executedCount',
                  width: 140,
                  align: 'center',
                  render: (v: number, r: ExecRecord) => {
                    const color = v > 0 ? '#52c41a' : '#ff4d4f'
                    return (
                      <span style={{ color }}>
                        {v}/{r.targetCount}
                      </span>
                    )
                  },
                },
              ]}
              dataSource={[...(execTask?.execHistory ?? [])].sort(
                (a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime()
              )}
              scroll={{ y: 400 }}
              pagination={false}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
