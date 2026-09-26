import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import PageShell from '../components/PageShell'
import RequirementDot, { type RequirementSection } from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import {
  VOUCHER_ACCOUNT_TYPE_LABEL,
  VOUCHER_ACCOUNT_TAGS,
  VOUCHER_DEMO_ACCOUNTS,
  createVoucherIssueTask,
  createVoucherTemplate,
  findDemoAccount,
  issueVouchers,
  liveVoucherStatus,
  naturalPeriodValidity,
  removeVoucherTemplate,
  runDueVoucherIssueTasks,
  setVoucherTaskPaused,
  sweepVoucherStatuses,
  updateVoucherTemplate,
  useVoucherIssueTasks,
  useVoucherTemplates,
  useVouchers,
  voidVoucher,
} from '../store'
import type { VoucherIssueAccount } from '../store'
import {
  VOUCHER_MULTI_DEDUCT_HINT,
  VOUCHER_PERIOD_UNIT_LABEL,
  VOUCHER_STATUS_COLOR,
  VOUCHER_STATUS_LABEL,
  VOUCHER_TASK_SCHEDULE_LABEL,
  roundAmount,
  voucherNaturalPeriodHint,
  voucherValidityDesc,
} from '../types'
import type {
  AccountTag,
  Voucher,
  VoucherIssueTask,
  VoucherPeriodUnit,
  VoucherStatus,
  VoucherTaskAccountScope,
  VoucherTaskFiring,
  VoucherTaskRunRecord,
  VoucherTaskSchedule,
  VoucherTemplate,
  VoucherValidityType,
} from '../types'

const { Text } = Typography
const { RangePicker } = DatePicker

type TabKey = 'templates' | 'vouchers' | 'tasks'

/** 三个 Tab 各自的需求说明（红点批注），以本处最新文案为准（releases.ts 2.2 为历史评审快照，不回改） */
const TAB_REQUIREMENTS: Record<TabKey, { title: string; sections: RequirementSection[] }> = {
  templates: {
    title: '券模板 · 需求说明',
    sections: [
      {
        label: '需求内容',
        items: [
          '1.列表展示如图，按照创建时间倒序展示。',
          '2.支持根据模板名称模糊搜索，支持根据状态搜索。',
          '3.点击删除，需要二次确认后删除；',
        ],
      },
    ],
  },
  vouchers: {
    title: '代金券列表 · 需求说明',
    sections: [
      {
        label: '需求内容',
        items: [
          '1.代金券列表为已经发放到账户中的券，列表字段展示如图；根据发放时间倒序展示。支持复制券码；',
          '2.支持根据券码模糊搜索、券模板名称模糊搜索、用户账户id/手机号模糊搜索等等，需要注意，按照时间搜索的，均为大于等于开始时间 小于结束时间。',
          '3.生效中的券，展示作废按钮，点击后二次确认后，系统需要再次检查该券状态，无误后置于已作废状态。',
          '已作废、已用完、已过期的券无法操作和使用（待生效也支持作废）；',
          '4.支持批量作废，选择券后，点击批量作废，检查选择的券是否有有效券，如有，则对所有有效券进行作废操作。如均为非有效券和待生效券，则提示“仅可对有效和待生效的券进行操作”',
        ],
      },
    ],
  },
  tasks: {
    title: '发放任务 · 需求说明',
    sections: [
      {
        label: '需求内容',
        items: [
          '1.发放任务列表按照任务创建时间倒序展示。字段如图；',
          '2.支持按照任务名称模糊搜索；',
          '3.点击新建发放任务同券模板列表；',
          '4.执行中的任务可以中止，需要二次确认后中止；中止后任务不再执行。',
          '5.中止的任务可以恢复。恢复后需检查是否已超过截止日期，已超过则需要变为已完成状态。',
          '6.执行记录按照执行的时间倒序展示每次执行的情况。',
          '7.系统需要有任务定期检查代金券的有效期，将到达有效期的券置于有效，将到达失效时间的券置于已过期。',
        ],
      },
    ],
  },
}

type AccountTypeKey = NonNullable<VoucherIssueAccount['accountType']>

/** 搜索区时间范围：未选择为 null；只选了单边时另一边为 null */
type DateRange = [Dayjs | null, Dayjs | null] | null

interface Filters {
  tplKw: string
  tplStatus: 'any' | 'enabled' | 'disabled'
  /** 代金券列表：券码 */
  vCode: string
  /** 代金券列表：券模板名称，模糊匹配 */
  vTemplateKw: string
  /** 代金券列表：账户 ID 或手机号 */
  vAccount: string
  /** 代金券列表：归属账户的用户标签（多选，命中任一即保留） */
  vTags: string[]
  vStatus: 'any' | VoucherStatus
  /** 代金券列表：发放时间范围 */
  vIssued: DateRange
  /** 代金券列表：生效时间范围 */
  vEffective: DateRange
  /** 代金券列表：失效时间范围 */
  vExpired: DateRange
  tKw: string
  tSchedule: 'any' | VoucherIssueTask['schedule']
}

const EMPTY_FILTERS: Filters = {
  tplKw: '',
  tplStatus: 'any',
  vCode: '',
  vTemplateKw: '',
  vAccount: '',
  vTags: [],
  vStatus: 'any',
  vIssued: null,
  vEffective: null,
  vExpired: null,
  tKw: '',
  tSchedule: 'any',
}

/** 时间是否落在所选区间内：大于等于开始时间、小于结束时间；未选区间视为不限制，只选单边时按单边限制 */
const inTimeRange = (value: string | undefined, range: DateRange) => {
  if (!range || (!range[0] && !range[1])) return true
  if (!value) return false
  const t = dayjs(value)
  if (range[0] && t.isBefore(range[0])) return false
  if (range[1] && !t.isBefore(range[1])) return false
  return true
}

/** 金额展示口径：¥ + 两位小数（余额按 6 位存储，展示前收敛到 2 位） */
const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

/** 弹窗内小节分隔线：压缩默认上下留白，让分组紧凑 */
const sectionDivider = { margin: '4px 0 16px' }

/** 弹窗内券模板信息块：灰底分隔、小字号，每行为「标签：值」左右结构 */
function TplInfoCard({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div
      style={{
        background: '#f0f2f5',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: '22px',
        marginBottom: 24,
      }}
    >
      {rows.map((r) => (
        <div key={r.label}>
          <span style={{ color: '#666' }}>{r.label}：</span>
          <span style={{ color: '#333', fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

const EMPTY_CELL = <Text type="secondary">—</Text>

const TASK_STATUS_META: Record<VoucherIssueTask['status'], { label: string; color: string }> = {
  draft: { label: '待执行', color: 'gold' },
  running: { label: '执行中', color: 'processing' },
  done: { label: '已完成', color: 'success' },
  partial: { label: '部分完成', color: 'warning' },
  paused: { label: '已中止', color: 'default' },
}

const ACCOUNT_TYPE_LABEL: Record<NonNullable<Voucher['accountType']>, string> = {
  personal: '个人',
  enterprise: '企业',
  sub: '子账号',
}

/** 模板有效期的一行摘要文案（与发放弹窗共用 types 中的解析口径） */
const validityDesc = voucherValidityDesc

/** 立即发放弹窗的有效期展示：按券设置的三种口径都算出发放当日的具体起止（含「～ 长期」），与需求红点口径一致 */
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

/** 可发放账户：企业子账号不支持发放，「所有账户」按此口径取全量 */
const ISSUABLE_ACCOUNTS = VOUCHER_DEMO_ACCOUNTS.filter((a) => a.accountType !== 'sub')

/** 周期任务口径提示：只说明发放时点，有效期口径归券模板 */
const TASK_PERIOD_HINT = '每周期开始的第1天00:00:00发放'

/** 新建任务表单里的发放方式档位：指定时间发放 / 周期性发放 */
type TaskKind = 'once' | 'periodic'

/** 周期性发放：自然周期单位 → 发放频率 */
const scheduleOfUnit = (unit: VoucherPeriodUnit): VoucherTaskSchedule =>
  unit === 'week' ? 'weekly' : unit === 'quarter' ? 'quarterly' : 'monthly'

/** 固定日期有效期：表单只填生效/失效两个时间，选择精度到分钟，存储为 `YYYY-MM-DD HH:mm:00` 时刻串 */
const FIXED_TIME_DISPLAY = 'YYYY-MM-DD HH:mm'

/** 指定发放时间的选择与展示精度：到分钟，存储为 YYYY-MM-DD HH:mm:00 */
const FIRE_TIME_DISPLAY = 'YYYY-MM-DD HH:mm'

/** 发放任务口径提示（红色展示于「新建发放任务」弹窗标题下方）：券的生效/失效由券模板决定，任务只决定发放动作 */
const TASK_FIRING_HINT = '券的生效与失效按券模板的有效期规则计算，任务只决定什么时候发放到账'

/** 周期性发放的「首次发放时间」档位：立即发放（先发本周期）/ 下一周期开始发放（创建时零发放） */
const periodicFiringOptions: Array<{ value: VoucherTaskFiring; label: string }> = [
  { value: 'immediate', label: '立即发放' },
  { value: 'next_period', label: '下一周期开始发放' },
]

/* ---------------- 账户选择器（发放 / 发放任务共用） ---------------- */

/** 目标账户列表列：账户名 / 账户 ID / 类型 / 标签 */
const accountPickerColumns: ColumnsType<VoucherIssueAccount> = [
  {
    title: '账户名',
    dataIndex: 'accountName',
    ellipsis: true,
    render: (_: string | undefined, a) => <>{a.accountName ?? a.accountId}</>,
  },
  {
    title: '账户 ID',
    dataIndex: 'accountId',
    width: 186,
    render: (v: string) => (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {v}
      </Text>
    ),
  },
  {
    title: '类型',
    dataIndex: 'accountType',
    width: 96,
    render: (v: AccountTypeKey | undefined) => VOUCHER_ACCOUNT_TYPE_LABEL[v ?? 'personal'],
  },
  {
    title: '标签',
    dataIndex: 'tags',
    width: 168,
    render: (tags: AccountTag[] | undefined) =>
      tags && tags.length > 0 ? (
        <Space size={4} wrap>
          {tags.map((t) => (
            <Tag key={t.name} color={t.color} style={{ marginInlineEnd: 0 }}>
              {t.name}
            </Tag>
          ))}
        </Space>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
]

/** 类型筛选项：企业子账号不支持发放，只可按个人 / 企业筛选 */
const ACCOUNT_TYPE_FILTER_OPTIONS: { value: 'any' | AccountTypeKey; label: string }[] = [
  { value: 'any', label: '全部类型' },
  ...(Object.keys(VOUCHER_ACCOUNT_TYPE_LABEL) as AccountTypeKey[])
    .filter((k) => k !== 'sub')
    .map((k) => ({ value: k, label: VOUCHER_ACCOUNT_TYPE_LABEL[k] })),
]

/** 目标账户选择器：点击后弹窗展示账户信息，支持搜索、按标签 / 类型筛选与表格多选 */
function AccountPicker({ value = [], onChange }: { value?: string[]; onChange?: (ids: string[]) => void }) {
  const [kw, setKw] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<'any' | AccountTypeKey>('any')
  const [pickOpen, setPickOpen] = useState(false)

  /** 已选账户明细，用于触发器上直接展示账户名 */
  const selected = useMemo(
    () =>
      value
        .map((id) => VOUCHER_DEMO_ACCOUNTS.find((a) => a.accountId === id))
        .filter((a): a is VoucherIssueAccount => a !== undefined),
    [value],
  )

  const matched = useMemo(() => {
    const k = kw.trim().toLowerCase()
    return VOUCHER_DEMO_ACCOUNTS.filter((a) => {
      const hay = [a.accountId, a.accountName, a.phone, ...(a.tags ?? []).map((t) => t.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (k && !hay.includes(k)) return false
      if (typeFilter !== 'any' && (a.accountType ?? 'personal') !== typeFilter) return false
      if (tagFilter.length > 0 && !tagFilter.some((t) => (a.tags ?? []).some((x) => x.name === t))) return false
      return true
    })
  }, [kw, tagFilter, typeFilter])

  /** 点击整行即勾选 / 取消；企业子账号不支持发放，不可切换 */
  const toggle = (a: VoucherIssueAccount) => {
    if (a.accountType === 'sub') return
    onChange?.(
      value.includes(a.accountId)
        ? value.filter((id) => id !== a.accountId)
        : [...value, a.accountId],
    )
  }

  return (
    <>
      <div
        onClick={() => setPickOpen(true)}
        style={{
          minHeight: 32,
          padding: '3px 24px 3px 11px',
          border: '1px solid #d9d9d9',
          borderRadius: 8,
          background: '#fff',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {selected.length === 0 ? (
          <Text type="secondary">请选择要发放的账户</Text>
        ) : (
          <Space size={4} wrap>
            {selected.map((a) => (
              <Tag
                key={a.accountId}
                closable
                onClose={(e) => {
                  /** 删除标签只移除该账户，不触发外层重新打开选择弹窗 */
                  e.stopPropagation()
                  onChange?.(value.filter((id) => id !== a.accountId))
                }}
                style={{ marginInlineEnd: 0 }}
              >
                {a.accountName ?? a.accountId}
              </Tag>
            ))}
          </Space>
        )}
        <DownOutlined
          style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}
        />
      </div>
      <Modal
        title="选择要发放的账户"
        open={pickOpen}
        centered
        width={720}
        onCancel={() => setPickOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setPickOpen(false)}>取消</Button>
            <Button type="primary" onClick={() => setPickOpen(false)}>
              确认
            </Button>
          </Space>
        }
      >
        <Space size={8} wrap style={{ marginBottom: 8 }}>
          <Input
            size="small"
            allowClear
            placeholder="搜索账户名 / 账户 ID / 标签"
            style={{ width: 190 }}
            value={kw}
            onChange={(e) => setKw(e.target.value)}
          />
          <Select
            mode="multiple"
            size="small"
            allowClear
            maxTagCount="responsive"
            placeholder="标签"
            style={{ minWidth: 140 }}
            value={tagFilter}
            onChange={setTagFilter}
            options={VOUCHER_ACCOUNT_TAGS.map((t: AccountTag) => ({ value: t.name, label: t.name }))}
          />
          <Select
            size="small"
            placeholder="类型"
            style={{ width: 120 }}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as 'any' | AccountTypeKey)}
            options={ACCOUNT_TYPE_FILTER_OPTIONS}
          />
        </Space>
        <Table<VoucherIssueAccount>
          size="small"
          rowKey="accountId"
          columns={accountPickerColumns}
          dataSource={matched}
          pagination={false}
          scroll={{ y: 232 }}
          locale={{ emptyText: <Text type="secondary">无匹配账户</Text> }}
          rowSelection={{
            type: 'checkbox',
            preserveSelectedRowKeys: true,
            selectedRowKeys: value,
            onChange: (keys) => onChange?.(keys as string[]),
            getCheckboxProps: (a) => ({ disabled: a.accountType === 'sub' }),
          }}
          onRow={(a) => ({
            onClick: (e) => {
              /** 勾选框自身已由 rowSelection 处理，避免整行点击与勾选重复触发 */
              if ((e.target as HTMLElement).closest('.ant-table-selection-column')) return
              toggle(a)
            },
            style: { cursor: a.accountType === 'sub' ? 'not-allowed' : 'pointer' },
          })}
        />
      </Modal>
    </>
  )
}

/* ---------------- 弹窗表单值类型 ---------------- */

interface TplFormValues {
  name: string
  faceValue: number
  validityType: VoucherValidityType
  fixedStart?: Dayjs
  fixedEnd?: Dayjs
  /** 固定日期：「长期有效」开关，打开后不落失效时间 */
  fixedLongTerm?: boolean
  effectiveDelayDays?: number
  validDays?: number
  longTermValid?: boolean
  periodUnit?: VoucherPeriodUnit
  applicableTo?: string
  status: boolean
}

interface IssueFormValues {
  templateId: string
  accounts: string[]
}

interface TaskFormValues {
  name: string
  templateId: string
  accountScope: VoucherTaskAccountScope
  /** 部分账户时的勾选名单；选「所有账户」时该项不渲染 */
  accounts?: string[]
  kind: TaskKind
  unit: VoucherPeriodUnit
  /** 首次发放时间（仅周期性发放）：immediate 立即发放 / next_period 下一周期开始发放 */
  firing: VoucherTaskFiring
  /** 「指定时间发放」的具体时刻（必填，精确到分钟） */
  fireAt?: Dayjs
  /** 周期任务的发放截止日期（仅周期性发放）；开启长期有效时不填 */
  deadline?: Dayjs
  /** 「长期有效」开关：打开后截止日期置灰显示「不限」，任务一直续发 */
  deadlineLongTerm?: boolean
}

export default function VoucherIssueCenter() {
  const templates = useVoucherTemplates()
  const vouchers = useVouchers()
  const tasks = useVoucherIssueTasks()

  const [tab, setTab] = useState<TabKey>('templates')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  /** 点击「搜索」才把当前输入提交为生效条件 */
  const [query, setQuery] = useState<Filters>(EMPTY_FILTERS)
  /** 代金券搜索区：默认只展示一行，其余条件展开后可见 */
  const [voucherSearchExpanded, setVoucherSearchExpanded] = useState(false)

  /** 券模板弹窗：editing 为 null 表示新增 */
  const [tplModalOpen, setTplModalOpen] = useState(false)
  const [editingTpl, setEditingTpl] = useState<VoucherTemplate | null>(null)
  const [tplForm] = Form.useForm<TplFormValues>()

  /** 立即发放弹窗：presetTplId 为券模板行内「立即发放」锁定的模板 */
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [presetTplId, setPresetTplId] = useState<string | undefined>(undefined)
  const [issueForm] = Form.useForm<IssueFormValues>()

  const [voidTarget, setVoidTarget] = useState<Voucher | null>(null)

  /** 批量作废：代金券列表勾选的券 id + 批量弹窗开关 */
  const [voidSelection, setVoidSelection] = useState<string[]>([])
  const [batchVoidOpen, setBatchVoidOpen] = useState(false)

  /** 新建发放任务弹窗：taskPresetTplId 为券模板行内「创建发放任务」锁定的模板（无值时模板可选） */
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskPresetTplId, setTaskPresetTplId] = useState<string | undefined>(undefined)
  const [taskForm] = Form.useForm<TaskFormValues>()

  /** 执行记录弹窗：展示某个任务的全部历次执行（最新在前） */
  const [runsTask, setRunsTask] = useState<VoucherIssueTask | null>(null)

  const tplValidity = Form.useWatch('validityType', tplForm)
  const tplLongTerm = Form.useWatch('longTermValid', tplForm)
  const tplFixedLongTerm = Form.useWatch('fixedLongTerm', tplForm)
  const tplPeriodUnit: VoucherPeriodUnit = Form.useWatch('periodUnit', tplForm) ?? 'month'

  const enabledTemplates = useMemo(() => templates.filter((t) => t.status === 'enabled'), [templates])
  const templateOptions = useMemo(
    () => enabledTemplates.map((t) => ({ value: t.id, label: `${t.name}（面额 ${money(t.faceValue)}）` })),
    [enabledTemplates],
  )
  /** 弹窗内锁定的券模板：「立即发放」「创建发放任务」入口只展示名称，不可更换 */
  const presetTemplate = useMemo(() => templates.find((t) => t.id === presetTplId), [templates, presetTplId])
  const taskPresetTemplate = useMemo(
    () => templates.find((t) => t.id === taskPresetTplId),
    [templates, taskPresetTplId],
  )

  /** 新建任务弹窗：选中券后回显面额与有效期；周期相关字段联动展示 */
  const taskTplId = Form.useWatch('templateId', taskForm)
  const taskTemplate = useMemo(
    () => enabledTemplates.find((t) => t.id === taskTplId),
    [enabledTemplates, taskTplId],
  )
  const taskKind: TaskKind = Form.useWatch('kind', taskForm) ?? 'once'
  const taskAccountScope: VoucherTaskAccountScope = Form.useWatch('accountScope', taskForm) ?? 'all'
  /** 周期任务的「长期有效」开关：默认打开；打开时截止日期置灰、免必填 */
  const taskDeadlineLongTerm = Form.useWatch('deadlineLongTerm', taskForm) ?? true

  /** 演示环境的定时触发：进入发放任务列表时，把已过指定时刻的「待执行」任务补跑一次 */
  useEffect(() => {
    if (tab !== 'tasks') return
    if (runDueVoucherIssueTasks() > 0) message.success('到期的发放任务已自动执行')
  }, [tab])

  /** 系统巡检任务：进入页面先扫一次，之后每 60 秒定期检查券的有效期，到达生效时刻的置为生效中、到达失效时刻的置为已过期 */
  useEffect(() => {
    sweepVoucherStatuses()
    const timer = window.setInterval(() => sweepVoucherStatuses(), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  /* ---------------- 各 Tab 过滤结果（基于已提交的 query 快照） ---------------- */

  const filteredTemplates = useMemo(
    () =>
      templates
        .filter((t) => {
          if (query.tplKw.trim() && !t.name.toLowerCase().includes(query.tplKw.trim().toLowerCase())) return false
          if (query.tplStatus !== 'any' && t.status !== query.tplStatus) return false
          return true
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [templates, query],
  )

  const filteredVouchers = useMemo(() => {
    const code = query.vCode.trim().toLowerCase()
    const templateKw = query.vTemplateKw.trim().toLowerCase()
    const account = query.vAccount.trim().toLowerCase()
    const templateNameById = new Map(templates.map((t) => [t.id, t.name]))
    return vouchers
      .filter((v) => {
        if (code && !v.code.toLowerCase().includes(code)) return false
        if (templateKw) {
          const name = (templateNameById.get(v.templateId) ?? '').toLowerCase()
          if (!name.includes(templateKw)) return false
        }
        if (account) {
          const hay = [v.accountId, v.accountName, v.phone].filter(Boolean).join(' ').toLowerCase()
          if (!hay.includes(account)) return false
        }
        if (query.vTags.length > 0) {
          const tagNames = (v.accountId ? findDemoAccount(v.accountId)?.tags ?? [] : []).map((t) => t.name)
          if (!query.vTags.some((tag) => tagNames.includes(tag))) return false
        }
        if (query.vStatus !== 'any' && liveVoucherStatus(v) !== query.vStatus) return false
        if (!inTimeRange(v.claimedAt ?? v.createdAt, query.vIssued)) return false
        if (!inTimeRange(v.effectiveAt, query.vEffective)) return false
        if (!inTimeRange(v.expireAt, query.vExpired)) return false
        return true
      })
      .sort((a, b) =>
        (b.claimedAt ?? b.createdAt).localeCompare(a.claimedAt ?? a.createdAt),
      )
  }, [vouchers, templates, query])

  /** 已勾选且当前状态为生效中/待生效的券，是批量作废的实际操作对象 */
  const voidableSelection = useMemo(
    () =>
      voidSelection.filter((id) => {
        const v = vouchers.find((item) => item.id === id)
        if (!v) return false
        const live = liveVoucherStatus(v)
        return live === 'active' || live === 'notEffective'
      }),
    [voidSelection, vouchers],
  )

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((t) => {
          if (query.tKw.trim() && !t.name.toLowerCase().includes(query.tKw.trim().toLowerCase())) return false
          if (query.tSchedule !== 'any' && t.schedule !== query.tSchedule) return false
          return true
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tasks, query],
  )

  const submitSearch = () => setQuery({ ...filters })
  const resetSearch = () => {
    setFilters(EMPTY_FILTERS)
    setQuery(EMPTY_FILTERS)
  }
  const switchTab = (key: string) => {
    setTab(key as TabKey)
    resetSearch()
    setVoidSelection([])
  }

  /* ---------------- 弹窗开关 ---------------- */

  const openTplModal = (tpl: VoucherTemplate | null) => {
    setEditingTpl(tpl)
    setTplModalOpen(true)
  }

  const openIssueModal = (templateId?: string) => {
    setPresetTplId(templateId)
    setIssueModalOpen(true)
  }

  /** 券模板行内「创建发放任务」传入 templateId 锁定模板；发放任务 Tab 的「新建发放任务」不传，模板可选 */
  const openTaskModal = (templateId?: string) => {
    setTaskPresetTplId(templateId)
    setTaskModalOpen(true)
  }

  /* ---------------- 保存动作 ---------------- */

  const saveTemplate = async () => {
    try {
      const v = await tplForm.validateFields()
      const byIssue = v.validityType === 'daysAfterIssue'
      const natural = v.validityType === 'naturalPeriod'
      const fixed = v.validityType === 'fixedDate'
      /** 表单已无「适用范围 / 备注」入口：新建统一为全平台通用，编辑沿用原值以免误改已生效的抵扣范围 */
      const periodUnit: VoucherPeriodUnit = v.periodUnit ?? 'month'
      const data: Omit<VoucherTemplate, 'id' | 'createdAt' | 'operator'> = {
        name: v.name.trim(),
        faceValue: roundAmount(v.faceValue, 2),
        /** 抵扣规则不再提供单选，统一为「存在代金券，将优先用券」 */
        deductOrder: 'voucherFirst',
        scope: editingTpl?.scope ?? 'all',
        scopeModels: editingTpl?.scopeModels,
        validityType: v.validityType,
        /** 固定日期直接存所选的分钟级时刻，发放时不再拼接默认时分秒 */
        fixedStart: fixed ? v.fixedStart?.startOf('minute').format('YYYY-MM-DD HH:mm:00') : undefined,
        /** 固定日期「长期有效」开关打开时不落 fixedEnd，即不设到期时间 */
        fixedEnd: fixed && !v.fixedLongTerm ? v.fixedEnd?.startOf('minute').format('YYYY-MM-DD HH:mm:00') : undefined,
        effectiveDelayDays: byIssue ? v.effectiveDelayDays ?? 0 : undefined,
        /** 「长期有效」开关打开时不落 validDays，即不设到期时间 */
        validDays: byIssue && !v.longTermValid ? v.validDays : undefined,
        /** 自然周期只配周期单位，生效=所在周期第一天 00:00:00、到期=周期最后一天 23:59:59，不落其他字段 */
        periodUnit: natural ? periodUnit : undefined,
        applicableTo: v.applicableTo?.trim() || undefined,
        status: v.status ? 'enabled' : 'disabled',
        remark: editingTpl?.remark,
      }
      if (editingTpl) {
        updateVoucherTemplate(editingTpl.id, data)
        message.success('模板已更新')
      } else {
        createVoucherTemplate(data)
        message.success('模板已创建')
      }
      setTplModalOpen(false)
    } catch {
      /* 校验失败，不关闭弹窗 */
    }
  }

  const saveIssue = async () => {
    try {
      const v = await issueForm.validateFields()
      /** 保存时先检查卡券状态：模板已停用则拦截发放 */
      const tpl = templates.find((t) => t.id === v.templateId)
      if (tpl && tpl.status !== 'enabled') {
        message.error('卡券已停用')
        return
      }
      const accounts = VOUCHER_DEMO_ACCOUNTS.filter((a) => v.accounts.includes(a.accountId))
      const result = issueVouchers(v.templateId, accounts, { source: 'targeted' })
      if (result.issued.length === 0) {
        message.error(result.skipped[0]?.reason ?? '发放失败')
        return
      }
      message.success(`发放完成：成功 ${result.issued.length} 张`)
      setIssueModalOpen(false)
    } catch {
      /* 校验失败，不关闭弹窗 */
    }
  }

  /** 作废确认弹窗：点「确认」即置为已作废，点「取消」不做修改 */
  const saveVoid = () => {
    if (!voidTarget) return
    const result = voidVoucher(voidTarget.id, '后台作废')
    if (result.ok) message.success('券已作废')
    else message.error(result.msg)
    if (result.ok) {
      setVoidTarget(null)
      setVoidSelection((prev) => prev.filter((id) => id !== voidTarget.id))
    }
  }

  /** 打开批量作废确认弹窗：先检查勾选中的券是否存在有效/待生效券，均否则提示且不弹窗 */
  const openBatchVoid = () => {
    if (voidableSelection.length === 0) {
      message.error('仅可对有效和待生效的券进行操作')
      return
    }
    setBatchVoidOpen(true)
  }

  /** 批量作废：仅对有效/待生效券执行，已作废、已用完、已过期的券跳过 */
  const saveBatchVoid = () => {
    const remaining: string[] = []
    let firstError = ''
    voidableSelection.forEach((id) => {
      const result = voidVoucher(id, '批量作废')
      if (result.ok) return
      remaining.push(id)
      if (!firstError) firstError = result.msg
    })
    const okCount = voidableSelection.length - remaining.length
    if (okCount > 0) {
      message.success(`已作废 ${okCount} 张`)
      setBatchVoidOpen(false)
    }
    if (firstError) message.error(firstError)
    setVoidSelection((prev) => prev.filter((id) => remaining.includes(id)))
  }

  const saveTask = async () => {
    try {
      const v = await taskForm.validateFields()
      const accounts =
        v.accountScope === 'all'
          ? ISSUABLE_ACCOUNTS
          : VOUCHER_DEMO_ACCOUNTS.filter((a) => (v.accounts ?? []).includes(a.accountId))
      const result = createVoucherIssueTask({
        name: v.name.trim(),
        templateId: v.templateId,
        accounts,
        accountScope: v.accountScope,
        schedule: v.kind === 'once' ? 'once' : scheduleOfUnit(v.unit),
        /** 指定时间发放：单次到点必发（firing 恒为 scheduled）；周期性发放：立即发放 / 下一周期开始发放 */
        firing: v.kind === 'once' ? 'scheduled' : v.firing,
        /** 发放时间与截止日期统一精确到分钟，秒归零 */
        scheduledAt: v.kind === 'once' && v.fireAt ? `${v.fireAt.format('YYYY-MM-DD HH:mm')}:00` : undefined,
        /** 截止日期精确到分钟；长期有效或不填则不落该字段 */
        periodDeadline:
          v.kind === 'periodic' && !v.deadlineLongTerm && v.deadline ? `${v.deadline.format('YYYY-MM-DD HH:mm')}:00` : undefined,
      })
      if (result.ok) message.success(result.msg)
      else message.error(result.msg)
      if (result.ok) setTaskModalOpen(false)
    } catch {
      /* 校验失败，不关闭弹窗 */
    }
  }

  /* ---------------- 列定义 ---------------- */

  const templateColumns: ColumnsType<VoucherTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      width: 160,
      fixed: 'left',
      ellipsis: true,
      render: (name: string) => (
        <Tooltip title={name}>
          <Text strong>{name}</Text>
        </Tooltip>
      ),
    },
    { title: '面额', dataIndex: 'faceValue', width: 100, render: (n: number) => money(n) },
    {
      title: '有效期',
      width: 240,
      render: (_: unknown, t) => <Tooltip title={validityDesc(t)}>{validityDesc(t)}</Tooltip>,
      ellipsis: true,
    },
    {
      title: '使用说明',
      dataIndex: 'applicableTo',
      width: 160,
      ellipsis: true,
      render: (value?: string) =>
        value ? <Tooltip title={value}>{value}</Tooltip> : EMPTY_CELL,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: VoucherTemplate['status'], t) => (
        <Switch
          size="small"
          checked={value === 'enabled'}
          onChange={(checked) => {
            updateVoucherTemplate(t.id, { status: checked ? 'enabled' : 'disabled' })
            message.success(checked ? '模板已启用' : '模板已停用')
          }}
        />
      ),
    },
    { title: '操作人', dataIndex: 'operator', width: 90 },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      width: 280,
      fixed: 'right',
      render: (_: unknown, t) => (
        <Space size={0}>
          <Button type="link" disabled={t.status !== 'enabled'} onClick={() => openIssueModal(t.id)}>
            立即发放
          </Button>
          <Button type="link" disabled={t.status !== 'enabled'} onClick={() => openTaskModal(t.id)}>
            创建发放任务
          </Button>
          <Button type="link" onClick={() => openTplModal(t)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该券模板吗？"
            description="已发出过券的模板建议停用而非删除"
            okText="确定"
            cancelText="取消"
            onConfirm={() => {
              const result = removeVoucherTemplate(t.id)
              if (result.ok) message.success(result.msg)
              else message.error(result.msg)
            }}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const voucherColumns: ColumnsType<Voucher> = [
    {
      title: '券码',
      dataIndex: 'code',
      width: 180,
      fixed: 'left',
      render: (code: string) => <Text copyable={{ text: code }}>{code}</Text>,
    },
    {
      title: '券模板',
      dataIndex: 'templateName',
      width: 150,
      ellipsis: true,
      render: (name: string) => <Tooltip title={name}>{name}</Tooltip>,
    },
    { title: '面额', dataIndex: 'faceValue', width: 90, render: (n: number) => money(n) },
    { title: '余额', dataIndex: 'balance', width: 90, render: (n: number) => money(n) },
    {
      title: '归属账户',
      width: 200,
      render: (_: unknown, v) =>
        v.accountId ? (
          <Space direction="vertical" size={0}>
            <Text>{v.accountName ?? v.accountId}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {v.accountId}
              {v.phone ? `｜${v.phone}` : ''}
              {v.accountType ? `｜${ACCOUNT_TYPE_LABEL[v.accountType]}` : ''}
            </Text>
          </Space>
        ) : (
          EMPTY_CELL
        ),
    },
    {
      title: '用户标签',
      width: 168,
      render: (_: unknown, v) => {
        const tags = v.accountId ? findDemoAccount(v.accountId)?.tags ?? [] : []
        return tags.length > 0 ? (
          <Space size={4} wrap>
            {tags.map((t) => (
              <Tag key={t.name} color={t.color} style={{ marginInlineEnd: 0 }}>
                {t.name}
              </Tag>
            ))}
          </Space>
        ) : (
          EMPTY_CELL
        )
      },
    },
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
    { title: '操作人', dataIndex: 'operator', width: 90 },
    {
      title: '发放日期',
      dataIndex: 'claimedAt',
      width: 170,
      render: (value?: string) => value ?? EMPTY_CELL,
    },
    {
      title: '操作',
      width: 80,
      fixed: 'right',
      render: (_: unknown, v) => {
        const live = liveVoucherStatus(v)
        return (
          <Space size={0}>
            <Tooltip title={live === 'expired' ? '已过期的券无需作废' : undefined}>
              <span>
                <Button
                  type="link"
                  danger
                  disabled={live === 'void' || live === 'usedUp' || live === 'expired'}
                  onClick={() => setVoidTarget(v)}
                >
                  作废
                </Button>
              </span>
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  const taskColumns: ColumnsType<VoucherIssueTask> = [
    {
      title: '任务名称',
      dataIndex: 'name',
      width: 190,
      fixed: 'left',
      ellipsis: true,
      render: (name: string) => <Tooltip title={name}><Text strong>{name}</Text></Tooltip>,
    },
    {
      title: '券模板',
      dataIndex: 'templateName',
      width: 150,
      ellipsis: true,
      render: (name: string) => <Tooltip title={name}>{name}</Tooltip>,
    },
    {
      title: '目标账户',
      width: 170,
      ellipsis: true,
      render: (_: unknown, t) =>
        t.accountScope ? (
          `${t.accountScope === 'all' ? '所有账户' : '部分账户'}（${t.targetAccounts.length} 个）`
        ) : t.targetDesc ? (
          <Tooltip title={t.targetDesc}>{t.targetDesc}</Tooltip>
        ) : (
          EMPTY_CELL
        ),
    },
    {
      title: '发放方式',
      dataIndex: 'schedule',
      width: 100,
      render: (schedule: VoucherTaskSchedule) => (
        <Tag>{schedule === 'once' ? '指定时间' : VOUCHER_TASK_SCHEDULE_LABEL[schedule]}</Tag>
      ),
    },
    {
      title: '最新一次发放时间',
      width: 170,
      render: (_: unknown, t) =>
        t.runs && t.runs.length > 0 ? t.runs[t.runs.length - 1].at : EMPTY_CELL,
    },
    {
      title: '下次执行',
      dataIndex: 'nextRunAt',
      width: 170,
      render: (value?: string) => value ?? EMPTY_CELL,
    },
    {
      title: '任务状态',
      dataIndex: 'status',
      width: 100,
      render: (status: VoucherIssueTask['status']) => (
        <Tag color={TASK_STATUS_META[status].color}>{TASK_STATUS_META[status].label}</Tag>
      ),
    },
    { title: '操作人', dataIndex: 'operator', width: 90 },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_: unknown, t) => {
        /** 「中止」只对未完成的周期任务开放；已中止的任务提供「恢复」；「执行记录」所有任务常驻 */
        const canPause = t.schedule !== 'once' && (t.status === 'running' || t.status === 'draft')
        return (
          <Space size={0}>
            {t.status === 'paused' && (
              <Button
                type="link"
                onClick={() => {
                  const next = setVoucherTaskPaused(t.id, false)
                  message.success(
                    next === 'done' ? '已超过发放截止日期，任务已变为已完成' : '任务已恢复',
                  )
                }}
              >
                恢复
              </Button>
            )}
            {canPause && (
              <Popconfirm
                title="确定中止该发放任务吗？"
                description="中止后任务将不再执行，可再恢复"
                okText="确定"
                cancelText="取消"
                onConfirm={() => {
                  setVoucherTaskPaused(t.id, true)
                  message.success('任务已中止')
                }}
              >
                <Button type="link">中止</Button>
              </Popconfirm>
            )}
            <Button type="link" onClick={() => setRunsTask(t)}>
              执行记录
            </Button>
          </Space>
        )
      },
    },
  ]

  /* ---------------- 搜索区（按 Tab 切换） ---------------- */

  const searchFields =
    tab === 'templates' ? (
      <>
        <SearchField label="模板名称">
          <Input
            placeholder="请输入模板名称"
            allowClear
            style={{ width: 180 }}
            value={filters.tplKw}
            onChange={(e) => setFilters({ ...filters, tplKw: e.target.value })}
            onPressEnter={submitSearch}
          />
        </SearchField>
        <SearchField label="状态">
          <Select
            style={{ width: 120 }}
            value={filters.tplStatus}
            onChange={(value) => setFilters({ ...filters, tplStatus: value })}
            options={[
              { value: 'any', label: '全部' },
              { value: 'enabled', label: '启用' },
              { value: 'disabled', label: '停用' },
            ]}
          />
        </SearchField>
      </>
    ) : tab === 'vouchers' ? (
      <>
        <SearchField label="券码">
          <Input
            placeholder="请输入券码"
            allowClear
            style={{ width: 180 }}
            value={filters.vCode}
            onChange={(e) => setFilters({ ...filters, vCode: e.target.value })}
            onPressEnter={submitSearch}
          />
        </SearchField>
        <SearchField label="券模板">
          <Input
            placeholder="请输入券模板名称"
            allowClear
            style={{ width: 180 }}
            value={filters.vTemplateKw}
            onChange={(e) => setFilters({ ...filters, vTemplateKw: e.target.value })}
            onPressEnter={submitSearch}
          />
        </SearchField>
        <SearchField label="账户ID/手机号">
          <Input
            placeholder="请输入账户 ID 或手机号"
            allowClear
            style={{ width: 200 }}
            value={filters.vAccount}
            onChange={(e) => setFilters({ ...filters, vAccount: e.target.value })}
            onPressEnter={submitSearch}
          />
        </SearchField>
        <SearchField label="用户标签">
          <Select
            mode="multiple"
            allowClear
            placeholder="全部标签"
            style={{ width: 200 }}
            maxTagCount={1}
            value={filters.vTags}
            onChange={(value) => setFilters({ ...filters, vTags: value })}
            options={VOUCHER_ACCOUNT_TAGS.map((t: AccountTag) => ({ value: t.name, label: t.name }))}
          />
        </SearchField>
        <SearchField label="状态">
          <Select
            style={{ width: 130 }}
            value={filters.vStatus}
            onChange={(value) => setFilters({ ...filters, vStatus: value })}
            options={[
              { value: 'any', label: '全部' },
              { value: 'notEffective', label: '待生效' },
              { value: 'active', label: '生效中' },
              { value: 'usedUp', label: '已用完' },
              { value: 'expired', label: '已过期' },
              { value: 'void', label: '已作废' },
            ]}
          />
        </SearchField>
        {voucherSearchExpanded && (
          <>
            <SearchField label="发放时间">
              <RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: 380 }}
                value={filters.vIssued}
                onChange={(dates) => setFilters({ ...filters, vIssued: dates })}
              />
            </SearchField>
            <SearchField label="生效时间">
              <RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: 380 }}
                value={filters.vEffective}
                onChange={(dates) => setFilters({ ...filters, vEffective: dates })}
              />
            </SearchField>
            <SearchField label="失效时间">
              <RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: 380 }}
                value={filters.vExpired}
                onChange={(dates) => setFilters({ ...filters, vExpired: dates })}
              />
            </SearchField>
          </>
        )}
      </>
    ) : (
      <>
        <SearchField label="任务名称">
          <Input
            placeholder="请输入任务名称"
            allowClear
            style={{ width: 200 }}
            value={filters.tKw}
            onChange={(e) => setFilters({ ...filters, tKw: e.target.value })}
            onPressEnter={submitSearch}
          />
        </SearchField>
      </>
    )

  const tablePagination = {
    pageSize: 10,
    showTotal: (t: number) => `共 ${t} 条记录`,
  }

  const list =
    tab === 'templates' ? (
      <Table<VoucherTemplate>
        rowKey="id"
        columns={templateColumns}
        dataSource={filteredTemplates}
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
      />
    ) : tab === 'vouchers' ? (
      <Table<Voucher>
        rowKey="id"
        columns={voucherColumns}
        dataSource={filteredVouchers}
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
        rowSelection={{
          fixed: true,
          selectedRowKeys: voidSelection,
          onChange: (keys) => setVoidSelection(keys as string[]),
        }}
      />
    ) : (
      <Table<VoucherIssueTask>
        rowKey="id"
        columns={taskColumns}
        dataSource={filteredTasks}
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
      />
    )

  return (
    <>
      <PageShell
        breadcrumb={['账户管理', '代金券']}
        topExtra={
          <Tabs
            activeKey={tab}
            onChange={switchTab}
            items={[
              { key: 'templates', label: '券模板' },
              { key: 'vouchers', label: '代金券列表' },
              { key: 'tasks', label: '发放任务' },
            ]}
          />
        }
        searchFields={searchFields}
        onSearch={submitSearch}
        onReset={resetSearch}
        listTitle={tab === 'templates' ? '券模板列表' : tab === 'vouchers' ? '代金券列表' : '发放任务列表'}
        total={
          tab === 'templates' ? filteredTemplates.length : tab === 'vouchers' ? filteredVouchers.length : filteredTasks.length
        }
        titleExtra={
          <RequirementDot
            title={TAB_REQUIREMENTS[tab].title}
            sections={TAB_REQUIREMENTS[tab].sections}
          />
        }
        addText={tab === 'templates' ? '新增券模板' : tab === 'tasks' ? '新建发放任务' : undefined}
        onAdd={tab === 'templates' ? () => openTplModal(null) : tab === 'tasks' ? () => openTaskModal() : undefined}
        listActions={
          tab === 'vouchers' ? (
            <Button danger disabled={voidSelection.length === 0} onClick={openBatchVoid}>
              批量作废
            </Button>
          ) : undefined
        }
        searchExtra={
          tab === 'vouchers' ? (
            <Button
              type="link"
              style={{ paddingInline: 0 }}
              icon={voucherSearchExpanded ? <UpOutlined /> : <DownOutlined />}
              iconPosition="end"
              onClick={() => setVoucherSearchExpanded((v) => !v)}
            >
              {voucherSearchExpanded ? '收起' : '展开'}
            </Button>
          ) : undefined
        }
      >
        {list}
      </PageShell>

      {/* 新增 / 编辑券模板 */}
      <Modal
        title={
          <Space size={8}>
            {editingTpl ? '编辑券模板' : '新增券模板'}
            <RequirementDot
              title="新增券模板 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.模板名称，必填，限12字，不限输入类型，不可重名；',
                    '2.面额，必填，数字，支持2位小数；0.01～9999999之间；',
                    '3.发放后N天生效，必填，整数，0-365；',
                    '生效后N天有效，必填，整数，0-3650；',
                    '选择长期有效后，不限制失效日期，直到卡券用完；',
                    '自然周期，支持选择周、月、季度。发放时，按照发放时间计算有效期。',
                    '固定日期：生效时间应大于当前，支持选择到年月日时分，失效时间应大于生效时间；选择长期有效时，不限制失效日期，直到卡券用完；',
                    '4.使用说明限500字，选填。',
                    '5.状态默认开启。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={tplModalOpen}
        centered
        width={680}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        onOk={saveTemplate}
        onCancel={() => setTplModalOpen(false)}
      >
        <Form<TplFormValues>
          form={tplForm}
          layout="vertical"
          preserve={false}
          initialValues={
            editingTpl
              ? {
                  name: editingTpl.name,
                  faceValue: editingTpl.faceValue,
                  validityType: editingTpl.validityType,
                  fixedStart:
                    editingTpl.validityType === 'fixedDate' && editingTpl.fixedStart
                      ? dayjs(editingTpl.fixedStart)
                      : undefined,
                  fixedEnd:
                    editingTpl.validityType === 'fixedDate' && editingTpl.fixedEnd
                      ? dayjs(editingTpl.fixedEnd)
                      : undefined,
                  fixedLongTerm: editingTpl.validityType === 'fixedDate' && !editingTpl.fixedEnd,
                  effectiveDelayDays: editingTpl.effectiveDelayDays,
                  validDays: editingTpl.validDays,
                  longTermValid: editingTpl.validityType === 'daysAfterIssue' && editingTpl.validDays == null,
                  periodUnit: editingTpl.periodUnit ?? 'month',
                  applicableTo: editingTpl.applicableTo,
                  status: editingTpl.status === 'enabled',
                }
              : {
                  validityType: 'daysAfterIssue',
                  effectiveDelayDays: 0,
                  validDays: 30,
                  longTermValid: false,
                  fixedLongTerm: false,
                  periodUnit: 'month',
                  status: true,
                }
          }
        >
          <Divider plain style={sectionDivider}>
            基本信息
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="模板名称"
                rules={[
                  { required: true, message: '请输入模板名称' },
                  {
                    validator: (_, value: string) => {
                      const name = value?.trim()
                      if (!name) return Promise.resolve()
                      if (templates.some((t) => t.name.trim() === name && t.id !== editingTpl?.id)) {
                        return Promise.reject(new Error('模板名称不可重名'))
                      }
                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <Input placeholder="如：新人体验券" maxLength={12} showCount />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="faceValue" label="面额（元）" rules={[{ required: true, message: '请输入面额' }]}>
                <InputNumber min={0.01} max={9999999} precision={2} style={{ width: '100%' }} placeholder="如：10" />
              </Form.Item>
            </Col>
          </Row>

          <Divider plain style={sectionDivider}>
            有效期
          </Divider>
          <Form.Item name="validityType" label="有效期类型" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'daysAfterIssue', label: '发放后按天' },
                { value: 'naturalPeriod', label: '自然周期' },
                { value: 'fixedDate', label: '固定日期' },
              ]}
            />
          </Form.Item>
          {tplValidity === 'fixedDate' ? (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="fixedStart"
                  label="生效时间"
                  rules={[
                    { required: true, message: '请选择生效时间' },
                    () => ({
                      validator: (_: unknown, value: Dayjs | undefined) => {
                        /** 仅新建模板时拦截：编辑历史模板时保留原生效时刻，避免被当前时间卡死 */
                        if (!value || editingTpl) return Promise.resolve()
                        if (!value.isAfter(dayjs())) {
                          return Promise.reject(new Error('生效时间应大于当前时间'))
                        }
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    showTime={{ format: 'HH:mm' }}
                    format={FIXED_TIME_DISPLAY}
                    placeholder="请选择生效时间"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="fixedEnd"
                  label="失效时间"
                  dependencies={['fixedStart']}
                  rules={[
                    ...(tplFixedLongTerm ? [] : [{ required: true, message: '请选择失效时间' }]),
                    ({ getFieldValue }) => ({
                      validator: (_, value: Dayjs | undefined) => {
                        const start = getFieldValue('fixedStart') as Dayjs | undefined
                        if (value && start && value.valueOf() <= start.valueOf()) {
                          return Promise.reject(new Error('失效时间应大于生效时间'))
                        }
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    showTime={{ format: 'HH:mm' }}
                    format={FIXED_TIME_DISPLAY}
                    placeholder={tplFixedLongTerm ? '不限' : '请选择失效时间'}
                    disabled={Boolean(tplFixedLongTerm)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="fixedLongTerm"
                  label="长期有效"
                  valuePropName="checked"
                  tooltip="打开后券不设到期时间，余额可用至消耗完毕"
                >
                  <Switch
                    checkedChildren="是"
                    unCheckedChildren="否"
                    onChange={(on) => {
                      if (on) tplForm.setFieldValue('fixedEnd', undefined)
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          ) : tplValidity === 'naturalPeriod' ? (
            <Form.Item
              name="periodUnit"
              rules={[{ required: true }]}
              extra={voucherNaturalPeriodHint(tplPeriodUnit)}
            >
              <Radio.Group
                options={(Object.keys(VOUCHER_PERIOD_UNIT_LABEL) as VoucherPeriodUnit[]).map((k) => ({
                  value: k,
                  label: VOUCHER_PERIOD_UNIT_LABEL[k],
                }))}
              />
            </Form.Item>
          ) : (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="effectiveDelayDays"
                  label="发放后 N 天生效"
                  rules={[{ required: true, message: '请输入天数' }]}
                >
                  <InputNumber min={0} max={365} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="validDays"
                  label="生效后 N 天内有效"
                  rules={tplLongTerm ? [] : [{ required: true, message: '请输入天数，或开启长期有效' }]}
                >
                  <InputNumber
                    min={0}
                    max={3650}
                    precision={0}
                    style={{ width: '100%' }}
                    disabled={Boolean(tplLongTerm)}
                    placeholder={tplLongTerm ? '不限' : undefined}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="longTermValid"
                  label="长期有效"
                  valuePropName="checked"
                  tooltip="打开后券不设到期时间，余额可用至消耗完毕"
                >
                  <Switch
                    checkedChildren="是"
                    unCheckedChildren="否"
                    onChange={(on) => {
                      if (on) tplForm.setFieldValue('validDays', undefined)
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}
          {tplValidity === 'daysAfterIssue' ? (
            <div style={{ marginTop: -8, marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                例：发放后3天生效，生效后5天有效；
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                1月1日发放（不管几点） → 1月2日算第1天，1月4日 00:00 生效 → 1月4日算生效第1天，1月8日 23:59:59 失效。
              </Text>
            </div>
          ) : null}
          <Divider plain style={sectionDivider}>
            使用与抵扣
          </Divider>
          <Form.Item label="抵扣规则">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {VOUCHER_MULTI_DEDUCT_HINT}
            </Text>
          </Form.Item>
          <Form.Item name="applicableTo" label="使用说明">
            <Input.TextArea
              placeholder="如：适用于kimi-k3（选填）"
              maxLength={500}
              showCount
              rows={3}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            extra="停用后不可再发放，已到账的券不受影响"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发放代金券 */}
      <Modal
        title={
          <Space size={8}>
            发放代金券
            <RequirementDot
              title="发放代金券 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.展示券信息，并根据券设置进行有效期的计算；',
                    '1）发放后按天（发放后n天、有效期m天）',
                    '有效期为 发放日+n天的00:00 ～ 发放日+n天+m天-1天的23:59。',
                    '例：发放后3天生效、有效期5天，1月1日发放（不管几点）→ 1月2日算第1天，1月4日 00:00 生效 → 1月4日算生效第1天，1月8日 23:59:59 失效。',
                    '2）自然周期：有效期为发放日的周期第一天00:00 ～ 最后一天23:59。',
                    '例：选择自然月、现在为9月20日，则展示 2026-9-1 00:00 ～ 2026-9-30 23:59。',
                    '3）固定周期：直接展示配置的固定起止时间。',
                    '长期有效：展示为「2026-10-11 00:00 ～ 长期」。',
                    '2.点击要发放的账户，展示账户列表（未删除、未停用的）',
                    '支持根据账户名、ID、标签、账户类型搜索；',
                    '选择账户后，展示账户昵称，支持删除；再次展开选择账户列表，已选择的账户需要被选中，支持取消选中。',
                    '3.点击保存，检查卡券状态，如状态为停用，则提示“卡券已停用”',
                    '如卡券被编辑，以点击发放时的信息为准。',
                    '发放成功，记录发放时间，券的有效期；并记录卡片状态；',
                    '当前时间<有效期开始时间，待生效；',
                    '当前时间>=有效期开始时间 且 <=有效期结束时间，生效中；',
                    '当前时间>有效期结束时间，已过期；',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={issueModalOpen}
        centered
        width={520}
        destroyOnClose
        okText="确认发放"
        cancelText="取消"
        onOk={saveIssue}
        onCancel={() => setIssueModalOpen(false)}
      >
        <Form<IssueFormValues>
          form={issueForm}
          layout="vertical"
          preserve={false}
          initialValues={{ templateId: presetTplId, accounts: [] }}
        >
          <TplInfoCard
            rows={[
              { label: '模板名称', value: presetTemplate?.name ?? '—' },
              { label: '券面额', value: presetTemplate ? money(presetTemplate.faceValue) : '—' },
              { label: '有效期', value: presetTemplate ? validityDescForIssue(presetTemplate) : '—' },
            ]}
          />
          <Form.Item name="templateId" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="accounts"
            label="目标账户"
            rules={[{ required: true, message: '请至少选择一个账户' }]}
          >
            <AccountPicker />
          </Form.Item>
        </Form>
      </Modal>

      {/* 作废：纯确认弹窗，不再填写作废原因 */}
      <Modal
        title="作废代金券"
        open={Boolean(voidTarget)}
        centered
        width={520}
        destroyOnClose
        okText="确认"
        cancelText="取消"
        onOk={saveVoid}
        onCancel={() => setVoidTarget(null)}
      >
        <Text>作废后代金券将不可用，是否确认？</Text>
      </Modal>

      {/* 批量作废 */}
      <Modal
        title="批量作废代金券"
        open={batchVoidOpen}
        centered
        width={520}
        destroyOnClose
        okText="确认"
        cancelText="取消"
        onOk={saveBatchVoid}
        onCancel={() => setBatchVoidOpen(false)}
      >
        <Text>
          已勾选 {voidSelection.length} 张，其中有效/待生效 {voidableSelection.length} 张将被作废，作废后代金券将不可用，是否确认？
        </Text>
      </Modal>

      {/* 新建发放任务 */}
      <Modal
        title={
          <Space size={8}>
            新建发放任务
            <RequirementDot
              title="新建发放任务 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.页面展示如图；',
                    '2.任务名称12字，必填，不限制输入类型，不可重复；',
                    '3.选择所有账户，则对所有（未删除未停用账户生效）；选择部分账户则对已选择的账户生效（已选择的账户交互同其他选择账户的逻辑）；',
                    '4.指定时间发送，则可输入当前时间之后的时间（以保存时的时间计算）；精确到分钟，早于当前时间提示“发放时间不可早于当前时间”；',
                    '周期性发放则可选周、月、季度（单选），周即每周一00:00发放；月为月度1日00:00发放；季度为季度首月1日00:00发放。注意：发放时，需要检查任务时候已到截止日期；如已到截止日期，咋无需执行任务，任务变为“已完成”状态；',
                    '5.首次发放时间选择立即发放时，保存成功则自动发放一次，有效期按照券规则计算；',
                    '下一周期开发发放，则等待下一次出发周期发放时间时再发放。',
                    '6.发放截止日期默认长期有效。如关闭长期有效。则截止日期需要大于当前时间。可能有还未执行就失效的可能，不做处理，直接变为已完成。',
                    '7.所有关于任务发放时间、截止日期和券有效期的时间，统一精确到分钟。',
                    '8.保存时，验证以上规则，验证通过，提示保存成功。同时在发放任务中增加一条任务信息，状态为执行中。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={taskModalOpen}
        centered
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        onOk={saveTask}
        onCancel={() => setTaskModalOpen(false)}
      >
        <Text type="danger" style={{ display: 'block', fontSize: 12, marginBottom: 16 }}>
          {TASK_FIRING_HINT}
        </Text>
        <Form<TaskFormValues>
          form={taskForm}
          layout="vertical"
          preserve={false}
          initialValues={{
            kind: 'once',
            unit: 'month',
            firing: 'immediate',
            accountScope: 'all',
            accounts: [],
            deadlineLongTerm: true,
            templateId: taskPresetTplId,
          }}
        >
          {taskPresetTplId ? (
            <>
              <TplInfoCard
                rows={[
                  { label: '模板名称', value: taskPresetTemplate?.name ?? '—' },
                  { label: '券面额', value: taskPresetTemplate ? money(taskPresetTemplate.faceValue) : '—' },
                  { label: '有效期', value: taskPresetTemplate ? validityDesc(taskPresetTemplate) : '—' },
                ]}
              />
              <Form.Item name="templateId" hidden>
                <Input />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="templateId" label="券模板" rules={[{ required: true, message: '请选择券模板' }]}>
                <Select placeholder="请选择启用中的券模板" options={templateOptions} />
              </Form.Item>
              {taskTemplate && (
                <TplInfoCard
                  rows={[
                    { label: '券面额', value: money(taskTemplate.faceValue) },
                    { label: '有效期', value: validityDesc(taskTemplate) },
                  ]}
                />
              )}
            </>
          )}
          <Form.Item
            name="name"
            label="任务名称"
            rules={[
              { required: true, message: '请输入任务名称' },
              { max: 12, message: '任务名称最多12个字' },
              {
                validator: (_, value: string) =>
                  value && value.trim() && tasks.some((t) => t.name === value.trim())
                    ? Promise.reject(new Error('任务名称不可重复'))
                    : Promise.resolve(),
              },
            ]}
          >
            <Input placeholder="如：企业权益月度发放" maxLength={12} />
          </Form.Item>
          <Form.Item name="accountScope" label="目标账户" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'all', label: '所有账户' },
                { value: 'partial', label: '部分账户' },
              ]}
            />
          </Form.Item>
          {taskAccountScope === 'partial' && (
            <Form.Item
              name="accounts"
              rules={[{ required: true, message: '请至少选择一个账户' }]}
              extra="周期任务每次执行都会按此名单发放"
            >
              <AccountPicker />
            </Form.Item>
          )}
          <Form.Item name="kind" label="发放方式" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'once', label: '指定时间发放' },
                { value: 'periodic', label: '周期性发放' },
              ]}
              /** 切换发放方式时重置：周期档位回「立即发放」，清空指定时间已选的时刻，截止日期回到「长期有效」默认 */
              onChange={() =>
                taskForm.setFieldsValue({ firing: 'immediate', fireAt: undefined, deadline: undefined, deadlineLongTerm: true })
              }
            />
          </Form.Item>
          {/* 发放方式的下一级联动项：整体缩进一格，表示从属于上方所选方式 */}
          <div style={{ paddingLeft: 24 }}>
            {taskKind === 'periodic' && (
              <Form.Item name="unit" rules={[{ required: true }]} extra={TASK_PERIOD_HINT}>
                <Radio.Group
                  options={[
                    { value: 'week', label: VOUCHER_TASK_SCHEDULE_LABEL.weekly },
                    { value: 'month', label: VOUCHER_TASK_SCHEDULE_LABEL.monthly },
                    { value: 'quarter', label: VOUCHER_TASK_SCHEDULE_LABEL.quarterly },
                  ]}
                />
              </Form.Item>
            )}
            {taskKind === 'once' && (
              <Form.Item
                name="fireAt"
                label="发放时间"
                rules={[
                  { required: true, message: '请选择发放时间' },
                  {
                    validator: (_, value: Dayjs) =>
                      value && value.isBefore(dayjs(), 'minute')
                        ? Promise.reject(new Error('发放时间不可早于当前时间'))
                        : Promise.resolve(),
                  },
                ]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format={FIRE_TIME_DISPLAY}
                  style={{ width: '100%' }}
                  placeholder="请选择发放时间"
                  disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                />
              </Form.Item>
            )}
            {taskKind === 'periodic' && (
              <Form.Item name="firing" label="首次发放时间" rules={[{ required: true }]}>
                <Radio.Group options={periodicFiringOptions} />
              </Form.Item>
            )}
            {taskKind === 'periodic' && (
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    name="deadline"
                    label="发放截止日期"
                    tooltip="周期任务发放到截止日期为止，到点后任务自动转为已完成；打开右侧「长期有效」则一直续发"
                    rules={[
                      ...(taskDeadlineLongTerm ? [] : [{ required: true, message: '请选择发放截止日期' }]),
                      {
                        validator: (_, value: Dayjs) =>
                          !taskDeadlineLongTerm && value && value.isBefore(dayjs(), 'minute')
                            ? Promise.reject(new Error('发放截止日期需大于当前时间'))
                            : Promise.resolve(),
                      },
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format={FIRE_TIME_DISPLAY}
                      style={{ width: '100%' }}
                      placeholder={taskDeadlineLongTerm ? '不限' : '请选择截止日期'}
                      disabled={taskDeadlineLongTerm}
                      disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="deadlineLongTerm" label="长期有效" valuePropName="checked">
                    <Switch
                      checkedChildren="是"
                      unCheckedChildren="否"
                      onChange={(on) => {
                        if (on) taskForm.setFieldValue('deadline', undefined)
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </div>
        </Form>
      </Modal>

      <Modal
        title="执行记录"
        open={Boolean(runsTask)}
        centered
        width={520}
        footer={
          <Button type="primary" onClick={() => setRunsTask(null)}>
            关闭
          </Button>
        }
        onCancel={() => setRunsTask(null)}
        destroyOnClose
      >
        <Table<VoucherTaskRunRecord>
          rowKey={(r) => `${r.at}_${r.trigger}`}
          size="small"
          pagination={false}
          dataSource={
            runsTask
              ? [...(runsTask.runs ?? [])].sort((a, b) => b.at.localeCompare(a.at))
              : []
          }
          locale={{ emptyText: <Text type="secondary">暂无执行记录</Text> }}
          columns={[
            { title: '执行时间', dataIndex: 'at' },
            {
              title: '应发放数量',
              width: 120,
              render: (_, r) => r.issued + r.skipped,
            },
            { title: '成功发放数量', dataIndex: 'issued', width: 130 },
          ]}
        />
      </Modal>
    </>
  )
}
