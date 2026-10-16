import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import {
  CopyOutlined,
  DownloadOutlined,
  GiftOutlined,
  InfoCircleFilled,
  LinkOutlined,
  PictureOutlined,
  SearchOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import PromoPosterModal from '../components/PromoPosterModal'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import { maskName } from '../components/SecretCell'
import {
  CURRENT_CONSOLE_USER,
  PROMO_WITHDRAW_MIN,
  applyWithdraw,
  buildCampaignInviteUrl,
  enrollPromoPartner,
  exchangeCommissionToVoucher,
  isCampaignInPeriod,
  isPromoCampaignActive,
  loadWithdrawAccountNo,
  loadWithdrawBankName,
  promoEffectiveRate,
  usePromoCampaigns,
  usePromoCommissions,
  usePromoExchanges,
  usePromoPartners,
  usePromoRebateRules,
  usePromoWithdraws,
  useVoucherTemplates,
  voucherExchangeCost,
} from '../store'
import type { CommissionRecord, ExchangeRecord, ModelRebateRule, PromoCampaign, PromoCampaignModel, WithdrawRequest } from '../types'
import { WITHDRAW_STATUS_LABEL, roundAmount } from '../types'

const { Text, Paragraph } = Typography
const { RangePicker } = DatePicker

/** 收益明细搜索条件（点击「搜索」后才生效） */
interface CommissionQuery {
  dateRange: [string, string] | null
  invitee: string
  campaign: string
}

const EMPTY_COMMISSION_QUERY: CommissionQuery = { dateRange: null, invitee: '', campaign: '' }

const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

/** 千分位数字（不含 ¥），如 1,286.40 */
const numCn = (n: number) =>
  roundAmount(n, 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** CSV 单元格：统一加引号并转义内部双引号 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** 活动横幅右侧插画：礼盒 + 金币 + 数据卡片 */
const BANNER_ART = (
  <svg width="112" height="58" viewBox="0 0 216 112" style={{ flex: 'none' }} aria-hidden>
    <circle cx="142" cy="58" r="54" fill="#ffffff" opacity="0.4" />
    <g transform="rotate(-10 42 68)">
      <rect x="16" y="44" width="56" height="44" rx="8" fill="#dcebff" />
      <polyline points="26,78 38,66 46,72 60,56" fill="none" stroke="#8db2ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="52,56 60,56 60,64" fill="none" stroke="#8db2ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <rect x="96" y="52" width="70" height="50" rx="8" fill="#3f77ff" />
    <rect x="88" y="36" width="86" height="24" rx="8" fill="#5f8fff" />
    <rect x="123" y="36" width="16" height="66" fill="#cfe0ff" />
    <path d="M131 38 C 116 22 104 30 112 37 C 118 41 126 40 131 38 Z" fill="#9dbfff" />
    <path d="M131 38 C 146 22 158 30 150 37 C 144 41 136 40 131 38 Z" fill="#9dbfff" />
    <circle cx="188" cy="30" r="14" fill="#ffcf5c" />
    <circle cx="188" cy="30" r="10" fill="#ffe2a0" />
    <text x="188" y="35" textAnchor="middle" fontSize="12" fill="#c98a12" fontWeight="700">¥</text>
    <circle cx="200" cy="76" r="11" fill="#ffcf5c" />
    <circle cx="200" cy="76" r="7.5" fill="#ffe2a0" />
    <text x="200" y="80" textAnchor="middle" fontSize="10" fill="#c98a12" fontWeight="700">¥</text>
  </svg>
)

/** 小贴士条右侧插画：柱状图 + 趋势线 + 金币 */
const TIP_ART = (
  <svg width="128" height="40" viewBox="0 0 128 40" style={{ flex: 'none', marginLeft: 'auto' }} aria-hidden>
    <rect x="4" y="22" width="10" height="14" rx="2" fill="#bcd3ff" />
    <rect x="20" y="14" width="10" height="22" rx="2" fill="#8db2ff" />
    <rect x="36" y="6" width="10" height="30" rx="2" fill="#4b86ff" />
    <polyline points="56,26 72,16 84,20 102,8" fill="none" stroke="#7ea6ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="114" cy="12" r="9" fill="#ffcf5c" />
    <text x="114" y="16" textAnchor="middle" fontSize="10" fill="#c98a12" fontWeight="700">¥</text>
  </svg>
)

/** 板块之间的统一间距 */
const SECTION_GAP = 20

/** 「活动规则」弹窗内容：按章节分组，每章节下若干条款 */
const ACTIVITY_RULES: { title: string; items: string[] }[] = [
  {
    title: '一、返佣资格',
    items: [
      '用户须点击推广活动列表中的专属推广链接，方可参与返佣活动。',
      '用户通过专属推广链接首次注册，即建立邀请关系。关系一旦建立，在活动期间内持续有效。',
      '同一用户不可被重复邀请。',
      '推广者与购买者不得为同一账号。若推广者与购买者为同一账号，推广者无佣金奖励。',
    ],
  },
  {
    title: '二、计佣规则',
    items: [
      '被邀请人使用现金账户进行 token 消费的，为邀请人计佣；使用代金券等非现金方式支付所消耗的 token 费用，不计佣。',
      '若同一模型命中多个活动，按其中最高佣金标准计算，不重复计佣。',
      '佣金计算至活动截止时点，活动截止后不再计入返佣数据。',
      '退款、撤销、争议订单对应的消费，不计入返佣；已计佣部分予以扣除。',
    ],
  },
  {
    title: '三、佣金结算与提现',
    items: [
      '为避免因四舍五入影响推广者应得利益，系统将于每日 23:59 完成当日消费统计后，统一展示返佣金额。',
      '佣金入账后，满 100 元可申请提现，也可兑换平台代金券。',
      '为响应国家相关政策，平台可能会扣除佣金税点，具体以实际发放金额为准。',
    ],
  },
  {
    title: '四、除外与处理',
    items: [
      '异常订单（包括但不限于刷单等行为）将取消对应奖励，且不计入有效邀请人数。',
      '活动名称仅为方便用户理解参考使用，不具有效力，实际活动内容以具体活动规则为准。',
    ],
  },
]

const maskAccountNo = (no: string) => (no.length > 8 ? `${no.slice(0, 4)} **** **** ${no.slice(-4)}` : no)

const copyText = async (value: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      message.success('已复制')
      return
    } catch {
      /** 剪贴板 API 被拒绝时走下方 execCommand 兜底 */
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    message.success('已复制')
  } catch {
    message.error('复制失败')
  }
}

/** 计佣比例（%）：限时活动期内 = 加倍返佣比例 */
const effectiveRate = (r: ModelRebateRule) => promoEffectiveRate(r)

export default function ConsolePromo() {
  const { token } = theme.useToken()
  const partners = usePromoPartners()
  const commissions = usePromoCommissions()
  const rules = usePromoRebateRules()
  const withdraws = usePromoWithdraws()
  const exchanges = usePromoExchanges()
  const campaigns = usePromoCampaigns()

  const [recordsModalOpen, setRecordsModalOpen] = useState(false)
  /** 收益明细搜索：草稿态（输入中）与生效态（点击搜索后） */
  const [commissionRangeKw, setCommissionRangeKw] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [commissionInviteeKw, setCommissionInviteeKw] = useState('')
  const [commissionCampaignKw, setCommissionCampaignKw] = useState('')
  const [commissionQuery, setCommissionQuery] = useState<CommissionQuery>(EMPTY_COMMISSION_QUERY)
  const [guideModalOpen, setGuideModalOpen] = useState(false)
  const [recordTab, setRecordTab] = useState<'withdraw' | 'exchange'>('withdraw')

  const [exchangeOpen, setExchangeOpen] = useState(false)
  /** 兑换档位：选中的兑换专用券模板 id */
  const [exchangeTplId, setExchangeTplId] = useState<string | null>(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState<number | null>(null)
  /** 提现 / 兑换记录弹窗（从申请提现弹窗内进入） */
  const [payoutRecordOpen, setPayoutRecordOpen] = useState(false)
  /** 收款人固定为实名认证本人，不提供输入，防止提现到他人账户 */
  const [accountNo, setAccountNo] = useState(loadWithdrawAccountNo)
  const [bankName, setBankName] = useState(loadWithdrawBankName)
  /** 推广活动列表中，当前要生成海报的活动 */
  const [posterForCampaign, setPosterForCampaign] = useState<PromoCampaign | null>(null)
  /** 推广活动列表「查看返佣模型」：当前查看的活动 */
  const [modelsForCampaign, setModelsForCampaign] = useState<PromoCampaign | null>(null)

  const me = useMemo(
    () => partners.find((p) => p.accountId === CURRENT_CONSOLE_USER.accountId) ?? null,
    [partners],
  )
  const myCommissions = useMemo(
    () =>
      me
        ? commissions
            .filter((c) => c.partnerId === me.id && c.kind === 'consume')
            .slice()
            .sort((a, b) => b.at.localeCompare(a.at))
        : [],
    [commissions, me],
  )
  /** 模型标准返佣比例，用于按实际比例反推该笔计佣倍率（限时活动 ×2 等） */
  const standardRateByModel = useMemo(() => {
    const m = new Map<string, number>()
    rules.forEach((r) => m.set(r.modelName, r.rate))
    return m
  }, [rules])
  /** 活动 id → 活动，用于收益明细展示该笔返佣的来源活动 */
  const campaignById = useMemo(() => {
    const m = new Map<string, PromoCampaign>()
    campaigns.forEach((c) => m.set(c.id, c))
    return m
  }, [campaigns])
  /** 收益明细搜索结果：点击「搜索」后按计佣时间 / 被邀请人 / 活动名称过滤 */
  const filteredCommissions = useMemo(() => {
    const invitee = commissionQuery.invitee.toLowerCase()
    const campaign = commissionQuery.campaign.toLowerCase()
    return myCommissions.filter((c) => {
      const matchInvitee =
        !invitee ||
        (c.inviteeName ?? '').toLowerCase().includes(invitee) ||
        (c.inviteeAccountId ?? '').toLowerCase().includes(invitee)
      const day = c.at.slice(0, 10)
      const matchDate =
        !commissionQuery.dateRange ||
        (day >= commissionQuery.dateRange[0] && day <= commissionQuery.dateRange[1])
      const campaignName = (campaignById.get(c.campaignId ?? '')?.name ?? c.campaignId ?? '').toLowerCase()
      const matchCampaign = !campaign || campaignName.includes(campaign)
      return matchInvitee && matchDate && matchCampaign
    })
  }, [myCommissions, commissionQuery, campaignById])
  const handleCommissionSearch = () =>
    setCommissionQuery({
      dateRange:
        commissionRangeKw && commissionRangeKw[0] && commissionRangeKw[1]
          ? [commissionRangeKw[0].format('YYYY-MM-DD'), commissionRangeKw[1].format('YYYY-MM-DD')]
          : null,
      invitee: commissionInviteeKw.trim(),
      campaign: commissionCampaignKw.trim(),
    })
  const myWithdraws = useMemo(
    () =>
      me
        ? withdraws
            .filter((w) => w.partnerId === me.id)
            .slice()
            .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
        : [],
    [withdraws, me],
  )
  /** 存在待审核提现申请时不再允许重复提交，与 store 层 applyWithdraw 校验保持一致 */
  const hasPendingWithdraw = useMemo(() => myWithdraws.some((w) => w.status === 'pending'), [myWithdraws])
  const myExchanges = useMemo(
    () =>
      me
        ? exchanges
            .filter((e) => e.partnerId === me.id)
            .slice()
            .sort((a, b) => b.at.localeCompare(a.at))
        : [],
    [exchanges, me],
  )
  const activeRules = useMemo(() => rules.filter((r) => r.status === 'on'), [rules])
  const todayStr = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])
  /** 可推广的活动：开启「在活动列表展示」且计佣中的活动可分享，进行中优先、其后未开始、已结束 */
  const promoCampaigns = useMemo(() => {
    const phase = (c: PromoCampaign) => {
      if (isCampaignInPeriod(c)) return 0
      return todayStr < c.startAt ? 1 : 2
    }
    return campaigns
      .filter((c) => c.status === 'on' && (c.showInList ?? true))
      .slice()
      .sort((a, b) => phase(a) - phase(b) || b.startAt.localeCompare(a.startAt))
  }, [campaigns, todayStr])
  /** 当前进行中的限时活动模型（用于横幅与文案） */
  const campaignModel = useMemo(() => {
    const onCampaign = activeRules.filter((r) => r.campaign && isPromoCampaignActive(r))
    if (onCampaign.length === 0) return null
    return onCampaign.reduce((best, r) => (r.rate > best.rate ? r : best))
  }, [activeRules])
  useEffect(() => {
    if (!me) enrollPromoPartner(CURRENT_CONSOLE_USER)
  }, [me])

  /** 兑换档位：启用中的兑换专用券模板，按面额由小到大 */
  const voucherTemplates = useVoucherTemplates()
  const exchangeTiers = useMemo(
    () =>
      voucherTemplates
        .filter((t) => t.exchangeOnly && t.status === 'enabled')
        .slice()
        .sort((a, b) => a.faceValue - b.faceValue),
    [voucherTemplates],
  )

  const doExchange = (partnerId: string, tplId: string) => {
    const res = exchangeCommissionToVoucher(partnerId, tplId)
    if (!res.ok) {
      message.error(res.msg)
      return
    }
    message.success(`兑换成功，${money(res.faceValue ?? 0)} 代金券已到账`)
    setExchangeOpen(false)
    setExchangeTplId(null)
  }

  const handleExchange = () => {
    if (!me) return
    if (!exchangeTplId) {
      message.error('请选择要兑换的代金券')
      return
    }
    const tpl = exchangeTiers.find((t) => t.id === exchangeTplId)
    if (!tpl) {
      message.error('请选择要兑换的代金券')
      return
    }
    const partnerId = me.id
    const tplId = tpl.id
    Modal.confirm({
      title: '确认兑换吗？',
      content: `将消耗佣金 ${money(voucherExchangeCost(tpl))}，兑换 ${money(tpl.faceValue)} 代金券，兑换后即时到账、有效期1年。`,
      okText: '确认兑换',
      cancelText: '取消',
      centered: true,
      onOk: () => doExchange(partnerId, tplId),
    })
  }

  const handleWithdraw = () => {
    if (!me) return
    if (!bankName.trim()) {
      message.error('请填写开户行')
      return
    }
    if (!accountNo.trim()) {
      message.error('请填写收款银行账号')
      return
    }
    const res = applyWithdraw(me.id, withdrawAmount ?? 0, CURRENT_CONSOLE_USER.nickname, accountNo.trim(), bankName.trim())
    if (!res.ok) {
      message.error(res.msg)
      return
    }
    setWithdrawOpen(false)
    setWithdrawAmount(null)
    Modal.success({
      title: '提现申请已提交，请等待审核',
      content: '进度情况可在【收益明细】》【提现记录】中查看。',
      okText: '知道了',
      centered: true,
    })
  }

  /** 活动是否含加倍返佣档（活动期内生效），用于活动列表标记 */
  const campaignHasBoost = (c: PromoCampaign) =>
    isCampaignInPeriod(c) && (c.models ?? []).some((m) => m.enabled !== false && m.boost)

  /** 活动内某个模型的当前计佣比例：活动期内加倍档取加倍比例 */
  const campaignModelRate = (c: PromoCampaign | null, m: PromoCampaignModel) =>
    m.enabled !== false && m.boost && c && isCampaignInPeriod(c) ? (m.boostRate ?? m.rate) : m.rate

  /** 「查看返佣模型」弹窗：模型名称 + 模型档位 + 当前计佣，加倍档额外标记 */
  const campaignModelColumns: ColumnsType<PromoCampaignModel> = [
    {
      title: '模型名称',
      dataIndex: 'modelName',
      render: (v: string, row) => {
        const notEnded = !!modelsForCampaign && todayStr <= modelsForCampaign.endAt
        return (
          <Space size={6}>
            <Text>{v}</Text>
            {row.enabled !== false && row.boost && notEnded && (
              <Tag color="volcano" style={{ marginInlineEnd: 0 }}>
                ⚡ 佣金加倍
              </Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: '模型档位',
      key: 'tier',
      width: 170,
      render: (_, row) => (
        <Text>{`${row.modelMultiplier ?? 1}x · ${row.multiplierName?.trim() || '标准倍率'}`}</Text>
      ),
    },
    {
      title: '当前计佣',
      key: 'effective',
      align: 'right',
      render: (_, row) => {
        const rate = campaignModelRate(modelsForCampaign, row)
        const boosted = rate !== row.rate
        return (
          <span style={{ fontWeight: boosted ? 600 : 400, color: boosted ? '#ff4d4f' : undefined }}>
            {rate}%
            {boosted && (
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
                （标准 {row.rate}%）
              </Text>
            )}
          </span>
        )
      },
    },
    {
      title: '每 500 元约返佣',
      key: 'estimate',
      align: 'right',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      render: (_, row) => money((campaignModelRate(modelsForCampaign, row) / 100) * 500),
    },
  ]

  /** 活动卡片内展示的最高返佣：与落地页同口径（活动期内加倍档取加倍比例） */
  const campaignMaxRate = (c: PromoCampaign) => {
    const inPeriod = isCampaignInPeriod(c)
    const rates = (c.models ?? [])
      .filter((m) => m.enabled !== false)
      .map((m) => (m.boost && inPeriod ? (m.boostRate ?? m.rate) : m.rate))
    return rates.length > 0 ? Math.max(...rates) : null
  }

  const campaignColumns: ColumnsType<PromoCampaign> = [
    {
      title: '活动名称',
      dataIndex: 'name',
      width: 240,
      ellipsis: { showTitle: false },
      render: (v: string, row) => (
        <Space size={6}>
          <Tooltip placement="topLeft" title={v}>
            <Text strong>{v}</Text>
          </Tooltip>
          {campaignHasBoost(row) && (
            <Tag color="volcano" style={{ marginInlineEnd: 0 }}>
              佣金加倍
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '推广时间',
      key: 'period',
      width: 200,
      render: (_, row) => <Text>{`${row.startAt} ~ ${row.endAt}`}</Text>,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, row) => {
        const inPeriod = isCampaignInPeriod(row)
        return inPeriod ? (
          <Tag color="green">进行中</Tag>
        ) : todayStr < row.startAt ? (
          <Tag color="blue">未开始</Tag>
        ) : (
          <Tag>已结束</Tag>
        )
      },
    },
    {
      title: '最高返佣',
      key: 'maxRate',
      width: 110,
      align: 'right',
      render: (_, row) => {
        const r = campaignMaxRate(row)
        return r == null ? <Text type="secondary">—</Text> : <Text strong style={{ color: '#d46b08' }}>{r}%</Text>
      },
    },
    {
      title: '专属推广链接',
      key: 'shareLink',
      onHeaderCell: () => ({ style: { paddingLeft: 32 } }),
      onCell: () => ({ style: { paddingLeft: 32 } }),
      render: (_, row) => (
        <Space.Compact style={{ maxWidth: 520 }}>
          <Input
            size="small"
            readOnly
            value={buildCampaignInviteUrl(row.id, me?.inviteCode)}
            prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
          />
          <Button
            size="small"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copyText(buildCampaignInviteUrl(row.id, me?.inviteCode))}
          >
            复制
          </Button>
        </Space.Compact>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, row) => (
        <Space size={8}>
          <Button size="small" type="link" style={{ paddingInline: 0 }} onClick={() => setModelsForCampaign(row)}>
            查看返佣模型
          </Button>
          <Button
            size="small"
            type="link"
            icon={<PictureOutlined />}
            style={{ paddingInline: 0 }}
            onClick={() => setPosterForCampaign(row)}
          >
            分享海报
          </Button>
        </Space>
      ),
    },
  ]

  const commissionColumns: ColumnsType<CommissionRecord> = [
    { title: '计佣时间', dataIndex: 'at', width: 110, render: (v: string) => v?.slice(0, 10) },
    {
      title: '被邀请人',
      dataIndex: 'inviteeName',
      width: 80,
      render: (v?: string) => (v && v !== '—' ? maskName(v) : <Text type="secondary">—</Text>),
    },
    {
      title: '计佣模型',
      dataIndex: 'modelName',
      width: 140,
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '活动',
      dataIndex: 'campaignId',
      width: 150,
      render: (v?: string) => {
        if (!v) return <Text type="secondary">—</Text>
        const campaign = campaignById.get(v)
        if (!campaign) return <Text type="secondary">—</Text>
        return campaign.name
      },
    },
    {
      title: '档位',
      key: 'multiplier',
      width: 60,
      render: (_, row) => {
        if (!row.modelName || row.rate == null) return <Text type="secondary">—</Text>
        const std = standardRateByModel.get(row.modelName)
        if (!std) return <Text type="secondary">—</Text>
        const x = Math.round((row.rate / std) * 100) / 100
        return <span style={{ color: x > 1 ? '#fa8c16' : undefined, fontWeight: x > 1 ? 500 : undefined }}>×{x}</span>
      },
    },
    {
      title: '现金消耗 / 比例',
      key: 'detail',
      width: 130,
      render: (_, row) =>
        row.consumeAmount == null ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text>
            {money(row.consumeAmount)} / {row.rate}%
          </Text>
        ),
    },
    {
      title: '佣金',
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>+{money(v)}</span>,
    },
  ]

  /** 收益明细按当前筛选结果导出 CSV（不只当前页），字段与列表一致 */
  const handleCommissionExport = () => {
    if (!filteredCommissions.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    const header = ['计佣时间', '被邀请人', '计佣模型', '活动', '档位', '现金消耗（元）', '计佣比例（%）', '佣金（元）']
    const lines = [header.map(csvCell).join(',')]
    filteredCommissions.forEach((c) => {
      const tier = c.modelName && c.rate != null ? standardRateByModel.get(c.modelName) : undefined
      const multiplier = tier ? Math.round((c.rate! / tier) * 100) / 100 : null
      lines.push(
        [
          c.at,
          c.inviteeName && c.inviteeName !== '—' ? maskName(c.inviteeName) : '—',
          c.modelName || '—',
          (c.campaignId && campaignById.get(c.campaignId)?.name) || '—',
          multiplier == null ? '—' : `×${multiplier}`,
          c.consumeAmount == null ? '—' : roundAmount(c.consumeAmount, 2).toFixed(2),
          c.rate == null ? '—' : c.rate,
          c.amount.toFixed(2),
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
    a.download = `收益明细_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filteredCommissions.length} 条记录`)
  }

  const withdrawColumns: ColumnsType<WithdrawRequest> = [
    { title: '申请时间', dataIndex: 'appliedAt', width: 170, fixed: 'left' },
    {
      title: '提现金额',
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      render: (v: number) => <Text strong>{money(v)}</Text>,
    },
    {
      title: '预扣个税',
      dataIndex: 'tax',
      width: 100,
      align: 'right',
      render: (v: number, row) =>
        row.status === 'rejected' ? <Text type="secondary">—</Text> : <Text type="secondary">-{money(v)}</Text>,
    },
    {
      title: '应到账',
      key: 'net',
      width: 110,
      align: 'right',
      render: (_, row) =>
        row.status === 'rejected' ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text>{money(roundAmount(row.amount - row.tax, 2))}</Text>
        ),
    },
    {
      title: '收款人',
      dataIndex: 'accountName',
      width: 100,
      render: (v?: string) => (v ? <Text>{maskName(v)}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: '开户行',
      dataIndex: 'bankName',
      width: 120,
      render: (v?: string) => (v ? <Text>{v}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: '收款账号',
      dataIndex: 'accountNo',
      width: 150,
      render: (v: string) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{maskAccountNo(v)}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: WithdrawRequest['status']) =>
        s === 'approved' ? (
          <Tag color="green">{WITHDRAW_STATUS_LABEL[s]}</Tag>
        ) : s === 'pending' ? (
          <Tag color="orange">{WITHDRAW_STATUS_LABEL[s]}</Tag>
        ) : (
          <Tag color="red">{WITHDRAW_STATUS_LABEL[s]}</Tag>
        ),
    },
    {
      title: '备注',
      key: 'note',
      width: 200,
      fixed: 'right',
      ellipsis: { showTitle: false },
      render: (_, row) => {
        const note = row.rejectReason ?? (row.reviewedAt ? `${row.reviewedAt} 审核通过，打款已完成` : '')
        return note ? (
          <Tooltip title={note} placement="topLeft">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {note}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        )
      },
    },
  ]

  const exchangeColumns: ColumnsType<ExchangeRecord> = [
    { title: '兑换时间', dataIndex: 'at', width: 170, fixed: 'left' },
    {
      title: '消耗佣金',
      dataIndex: 'commission',
      width: 110,
      align: 'right',
      render: (v: number) => <Text strong>{money(v)}</Text>,
    },
    {
      title: '券面额',
      dataIndex: 'faceValue',
      width: 110,
      align: 'right',
      render: (v: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>+{money(v)}</span>
      ),
    },
    {
      title: '代金券编号',
      dataIndex: 'voucherCode',
      width: 150,
      render: (v: string) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Text>,
    },
    { title: '有效期至', dataIndex: 'expireAt', width: 170 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: () => <Tag color="green">已到账</Tag>,
    },
  ]

  /* ---------------- 推广合伙人（无档案时由上方 effect 自动建档） ---------------- */
  if (!me) return null
  const frozen = me.status === 'frozen'

  const flowSteps = [
    {
      no: '1',
      icon: <LinkOutlined />,
      title: '复制链接发给好友',
      desc: '复制活动的专属推广链接，发送给好友或分享到群聊即可。',
    },
    {
      no: '2',
      icon: <WalletOutlined />,
      title: '好友充值使用，立即计入佣金',
      desc: '好友充值并消耗 token，即开始计佣入账。',
    },
    {
      no: '3',
      icon: <GiftOutlined />,
      title: '兑券或提现',
      desc: '佣金可按档位兑换平台代金券，也支持随时提现。',
    },
  ]

  return (
    <div>
      {frozen && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          message="合伙人资格已冻结"
          description="检测到违规推广行为，佣金暂停结算，如有疑问请联系客服。"
        />
      )}

      {campaignModel && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 12,
            padding: '10px 32px',
            minHeight: 0,
            background: 'linear-gradient(97deg, #d9e8ff 0%, #eaf2ff 55%, #dde9ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2d4d', lineHeight: 1.5 }}>
              <span style={{ marginRight: 8 }}>🔥</span>
              {campaignModel.modelName} 限时活动进行中
              <RequirementDot
                title="限时活动横幅 · 需求说明"
                sections={[
                  {
                    label: '需求内容',
                    items: [
                      '如有进行中的，且设置为在官网推广，取最新一条信息，展示此处的广告位。展示活动名称，佣金加倍+原比例+加倍后比例和活动截止时间',
                      '如设置为推广没有加倍佣金则展示“展示活动名称，最好返佣 +佣金原比例+和活动截止时间”',
                      '如果没有设置推广且进行中的，则不展示广告位',
                    ],
                  },
                ]}
              />
            </div>
            <div style={{ fontSize: 14, marginTop: 2, color: '#4a5878' }}>
              佣金加倍
              <span style={{ color: token.colorPrimary, fontWeight: 700, margin: '0 6px' }}>
                {campaignModel.rate}% → {effectiveRate(campaignModel)}%
              </span>
              ，活动截止 {campaignModel.campaignEndAt}
            </div>
          </div>
          {BANNER_ART}
        </div>
      )}

      {/* 左侧竖排操作步骤 + 右侧佣金信息与推广链接 */}
      <Row gutter={16} style={{ marginTop: SECTION_GAP }} align="stretch">
        <Col xs={24} lg={12}>
          <Card
            variant="borderless"
            style={{ height: '100%', border: '1px solid #e8ebf0', borderRadius: 12 }}
            styles={{ body: { padding: '18px 24px 16px', height: '100%', display: 'flex', flexDirection: 'column' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Text strong style={{ fontSize: 16 }}>
                    操作步骤
                  </Text>
                  <RequirementDot
                    title="操作步骤 · 需求说明"
                    sections={[
                      {
                        label: '需求内容',
                        items: [
                          '1.三步如下图；',
                          '2.点击活动规则，展示活动规则弹窗，内容如图；',
                        ],
                      },
                    ]}
                  />
                </span>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    三步完成推广，佣金自动入账
                  </Text>
                </div>
              </div>
              <Typography.Link style={{ fontSize: 13, flex: 'none' }} onClick={() => setGuideModalOpen(true)}>
                活动规则 ›
              </Typography.Link>
            </div>
            <div style={{ marginTop: 14, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {flowSteps.map((s, idx) => (
                <div
                  key={s.no}
                  style={{ display: 'flex', flex: idx === flowSteps.length - 1 ? 'none' : '1 1 auto', minHeight: 0 }}
                >
                  <div style={{ flex: 'none', width: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: token.colorPrimary,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {s.no}
                    </div>
                    {idx < flowSteps.length - 1 && (
                      <div style={{ flex: 1, width: 0, borderLeft: '2px dashed #c9d8f2', margin: '3px 0' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, marginLeft: 12, marginBottom: idx === flowSteps.length - 1 ? 0 : 8 }}>
                    <div
                      style={{
                        border: '1px solid #eef2fa',
                        borderRadius: 10,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          flex: 'none',
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: '#e8effd',
                          color: token.colorPrimary,
                          fontSize: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {s.icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</div>
                        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 0, lineHeight: 1.7 }}>
                          {s.desc}
                        </Paragraph>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <div
            style={{
              background: 'linear-gradient(120deg, #235cff 0%, #4b86ff 60%, #6ea0ff 100%)',
              borderRadius: 12,
              padding: '24px 24px 20px',
              color: '#fff',
              boxShadow: '0 6px 18px rgba(47,107,255,0.22)',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <Typography.Link style={{ color: '#fff', fontSize: 12 }} onClick={() => setRecordsModalOpen(true)}>
                收益明细 ›
              </Typography.Link>
            </div>
            <div style={{ display: 'flex', marginTop: 12 }}>
              {[
                { label: '可提现金额（元）', amount: me.availableCommission },
                { label: '累计佣金（元）', amount: me.totalCommission },
              ].map((m, idx) => (
                <div
                  key={m.label}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    paddingLeft: idx === 0 ? 0 : 16,
                    borderLeft: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.24)',
                  }}
                >
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {m.label}
                      {idx === 0 && (
                        <RequirementDot
                          title="佣金汇总 · 需求说明"
                          sections={[
                            {
                              label: '需求内容',
                              items: [
                                '1.累计佣金 展示所有获得过的佣金总和，包括已提现、申请提现和兑换代金券的；',
                                '2.可提现金额=累计佣金-已提现-已申请提现待审核-已兑券的',
                              ],
                            },
                          ]}
                        />
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.3, letterSpacing: 0.5 }}>
                    <span style={{ fontSize: 20, fontWeight: 600, marginRight: 4 }}>¥</span>
                    {numCn(m.amount)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: '#fff', opacity: 0.85, marginTop: 16 }}>
              每日 23:59 统一结算更新当日返佣，以避免单次计佣误差带来的收入损失
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
                marginTop: 8,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.24)',
              }}
            >
              <Space wrap>
                <Button
                  style={{ background: '#fff', color: token.colorPrimary, fontWeight: 500, border: 'none' }}
                  icon={<GiftOutlined />}
                  disabled={frozen}
                  onClick={() => setExchangeOpen(true)}
                >
                  兑换代金券
                </Button>
                <Tooltip title={hasPendingWithdraw ? '已有提现申请待审核，请等待处理' : undefined}>
                  <Button
                    style={{ background: '#fff', color: '#333', fontWeight: 500, border: 'none' }}
                    disabled={frozen || hasPendingWithdraw}
                    onClick={() => setWithdrawOpen(true)}
                  >
                    提现到银行卡
                  </Button>
                </Tooltip>
              </Space>
            </div>
          </div>
          <Card
            variant="borderless"
            style={{ marginTop: 16, border: '1px solid #e8ebf0', borderRadius: 12 }}
            styles={{ body: { padding: 20 } }}
          >
            <div style={{ display: 'flex' }}>
              {[
                { label: '邀请好友（人）', value: me.inviteCount },
                { label: '已实名（人）', value: me.verifiedCount },
                { label: '已消费（人）', value: me.firstConsumeCount },
              ].map((m, idx, arr) => (
                <div
                  key={m.label}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    textAlign: 'center',
                    paddingLeft: idx === 0 ? 0 : 8,
                    paddingRight: idx === arr.length - 1 ? 0 : 8,
                    borderLeft: idx === 0 ? 'none' : '1px solid #eef0f4',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {m.label}
                      {idx === 0 && (
                        <RequirementDot
                          title="邀请好友（人） · 需求说明"
                          sections={[
                            {
                              label: '需求内容',
                              items: [
                                '当前登录人分享链接，对方通过邀请链接登录，如被邀请人未与他人建立分佣金关系，则标记分享人为分销人员，记为邀请好友+1.',
                                '邀请的好友实名成功的，为实名+1；',
                                '邀请的好友，成功消费且扣减的为现金主账户中的费用，则记录为已消费+1.',
                                '注意：\n1.同一人消费多次，均记录为消费1人。\n2.同一人不可重复实名。\n3.自己邀请自己可以计算为邀请人（主要是不实名时无法判断），可以享受分佣。',
                              ],
                            },
                          ]}
                        />
                      )}
                    </span>
                  </Text>
                  <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 推广活动：每个活动一个专属分享链接 */}
      {promoCampaigns.length > 0 && (
        <Card
          variant="borderless"
          style={{ marginTop: SECTION_GAP, border: '1px solid #e8ebf0', borderRadius: 12 }}
          styles={{ body: { padding: '20px 16px 16px' } }}
        >
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 15 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                推广活动
                <RequirementDot
                  title="推广活动 · 需求说明"
                  sections={[
                    {
                      label: '需求内容',
                      items: [
                        '1.列表按照推广活动结束时间正序展示管理后台添加的，且设置为列表展示的活动。',
                        '2.如活动有任一模型设置为佣金加倍，则展示佣金加倍标签；',
                        '3.最高返佣展示的为活动中最高的一个模型佣金比例。',
                        '4.专属推广链接需要标记当前推广人的推广编码及当前活动的编码，推广编码要唯一。落地页根据每个推广人和活动展示不同。',
                        '5.推广码支持复制。',
                        '6.点击查看返佣模型，展示最新配置的活动的模型信息。按照佣金倒序展示，如有加倍佣金，展示如图。\n模型档位仅展示倍率即可，如1x\n每500元返佣金额=500x佣金比例。',
                        '7.点击分享海报，展示样式如图，图中二维码应为推广链接对应的二维码。支持下载海报。',
                        '8.分享落地页。\n1.写明xx邀请，xx为分享人实名。如分享人未实名，则展示昵称；\n\n2.点击立即注册领取，则需要带参数跳转到登录页面，当被邀请人成功注册且为首次注册时：\n1.分享人被定义为分销员（如未邀请过任何人，则为分享人增加一条分销人信息，如已成功邀请过，则无需重复添加信息）；\n2.建立两人的分销-分佣关系；\n3.分销员的邀请人数+1；\n4.页面跳转到token工厂的概览页面\n\n当被邀请人已注册过，只是成功登录时：\n1.检查被邀请人是否已跟其他人建立分销-分佣关系，如未建立，则建立当前两人的分销关系，该分销员邀请人数+1；如被邀请人已与他人建立分销关系，则无需任何操作。\n2.页面跳转到token工厂的概览页面；',
                      ],
                    },
                  ]}
                />
              </span>
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                每个活动都有专属推广链接，复制后转发即可享受返佣，如活动模型重复，取最高佣金。
              </Text>
            </div>
          </div>
          <Table<PromoCampaign>
            rowKey="id"
            size="middle"
            columns={campaignColumns}
            dataSource={promoCampaigns}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}

      <div
        style={{
          marginTop: SECTION_GAP,
          borderRadius: 12,
          padding: '14px 20px',
          background: 'linear-gradient(90deg, #e8f1ff 0%, #f4f8ff 60%, #eef4ff 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <InfoCircleFilled style={{ color: token.colorPrimary, fontSize: 16, flex: 'none' }} />
        <Text style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
          <Text strong>小贴士：</Text>
          分享给更多好友，获得更多佣金！佣金实时统计，提现秒到账。
        </Text>
        {TIP_ART}
      </div>

      <Modal
        title={
          <Space size={6}>
            兑换代金券
            <RequirementDot
              title="兑换代金券 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.此处展示可兑换金额，即佣金总额-已兑换-已申请提现待审核-已提现金额。',
                    '2.展示的代金券为后台配置，优先展示佣金可兑换的，然后按照金额由小到大。消耗金额为后台配置的代金券兑换金额。；',
                    '3.点击确认兑换后，确认后检查当前可兑换金额是否充足，当前登录人是否冻结对券权利。如正常且金额充足则扣减金额，兑换代金券，并发放到兑换人卡券账户。（兑换成功的一刻即位发放时间）； 兑换成功后，佣金账户将扣减对应金额；',
                    '4.点击提现/兑换记录，样式如界面。默认选中兑换记录tab。按照兑换时间倒序展示兑换信息。顶部展示统计信息（已兑券金额=成功兑换代金券的佣金总额）',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={exchangeOpen}
        centered
        width={520}
        okText="确认兑换"
        cancelText="取消"
        onOk={handleExchange}
        onCancel={() => {
          setExchangeOpen(false)
          setExchangeTplId(null)
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          佣金兑换平台代金券，兑换后即时到账，有效期1年。
        </Text>
        <div style={{ margin: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>
            可兑换金额：<span style={{ fontWeight: 600, color: '#1f2d4d' }}>{money(me.availableCommission)}</span>
          </span>
          <Typography.Link
            style={{ fontSize: 12 }}
            onClick={() => {
              setRecordTab('exchange')
              setPayoutRecordOpen(true)
            }}
          >
            提现记录 / 兑换记录 ›
          </Typography.Link>
        </div>
        <Row gutter={[12, 12]}>
          {exchangeTiers.map((t) => {
            const cost = voucherExchangeCost(t)
            const affordable = cost <= me.availableCommission
            const selected = exchangeTplId === t.id
            return (
              <Col span={12} key={t.id}>
                <div
                  role="button"
                  onClick={() => {
                    if (!affordable) return
                    setExchangeTplId(selected ? null : t.id)
                  }}
                  style={{
                    border: `1px solid ${selected ? token.colorPrimary : '#eef0f4'}`,
                    background: selected ? '#f0f5ff' : '#fff',
                    borderRadius: 8,
                    padding: '14px 12px',
                    textAlign: 'center',
                    cursor: affordable ? 'pointer' : 'not-allowed',
                    opacity: affordable ? 1 : 0.45,
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#1f2d4d' }}>{money(t.faceValue)}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    消耗佣金 {money(cost)}
                  </Text>
                  {!affordable ? (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        佣金不足
                      </Text>
                    </div>
                  ) : null}
                </div>
              </Col>
            )
          })}
        </Row>
      </Modal>

      <Modal
        title={
          <Space size={6}>
            申请提现
            <RequirementDot
              title="申请提现 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.弹窗展示如图，此处展示可提现金额，即佣金总额-已兑换-已申请提现待审核-已提现金额。',
                    '2.收款人需为当前分销人的实名姓名；不可更改。如为企业实名账户，则可下拉选择收款的为企业/法人/被授权人（法人/被授权人哪个不为空就展示哪个）；\n如当前登录人未实名，“为保证提款安全，收款人须为实名认证本人。”下方不展示收款账户输入信息，展示“请先实名认证”按钮，点击后跳转到实名认证页面。实名认证后方可申请提现。',
                    '3.开户行和账号均为输入，限制200字；',
                    '4.如不满足最低提现金额，则提交申请时提示“最低提现金额为100元”',
                    '5.提交后应检查账户金额是否充足，检查当前人员是否提现权利被冻结。如被冻结提示“当前账户已冻结，暂不支持提现”如成功提交，则提示提交成功，本次提现金额冻结，可提现金额减少。后台展示提现待审核信息。\n如后台通过本次提现，则本次金额真实扣减。\n如驳回，则应返还本次提现金额到可提现账户中；',
                    '6.提现申请提交成功后，再次申请提现，应展示上次填写的收款人、开户行、银行账号。',
                    '7.点击提现记录 / 兑换记录 ，展示提现记录 / 兑换记录，并默认选中提现记录，按照申请时间倒序展示，字段如图。提现记录上方应统计已成功提现总金额。\n列表中备注信息为：提现申请通过时间+"审核通过，打款完成"',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={withdrawOpen}
        centered
        width={520}
        okText="提交申请"
        cancelText="取消"
        onOk={handleWithdraw}
        onCancel={() => setWithdrawOpen(false)}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          审核通过后 1-3 个工作日打款，审核未通过时金额自动退回佣金账户。平台按税务要求代扣个税（实际以发放时核算为准）。
        </Text>
        <div style={{ margin: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>
            可提现金额：<span style={{ fontWeight: 600, color: '#1f2d4d' }}>{money(me.availableCommission)}</span>
            <Text type="secondary">（最低提现金额 {PROMO_WITHDRAW_MIN} 元）</Text>
          </span>
          <Typography.Link
            style={{ fontSize: 12 }}
            onClick={() => {
              setRecordTab('withdraw')
              setPayoutRecordOpen(true)
            }}
          >
            提现记录 / 兑换记录 ›
          </Typography.Link>
        </div>
        <InputNumber
          style={{ width: '100%', marginBottom: 12 }}
          min={PROMO_WITHDRAW_MIN}
          max={me.availableCommission}
          precision={2}
          prefix="¥"
          placeholder={`提现金额（满 ${PROMO_WITHDRAW_MIN} 元）`}
          value={withdrawAmount}
          onChange={setWithdrawAmount}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          为保证提款安全，收款人须为实名认证本人。
        </Text>
        <Input
          style={{ marginTop: 12, marginBottom: 12 }}
          placeholder="姓名"
          value={maskName(CURRENT_CONSOLE_USER.nickname)}
          disabled
        />
        <Input
          style={{ marginBottom: 12 }}
          placeholder="开户行"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />
        <Input placeholder="银行账号" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
      </Modal>

      <Modal
        title={
          <Space size={6}>
            提现记录 / 兑换记录
            <RequirementDot
              title="提现记录 / 兑换记录 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.列表信息按照时间倒序展示。',
                    '2.已提现=成功提现总金额\n已兑券=成功兑换代金券总金额',
                    '3.其他字段如图。注意带有姓名和账号信息的要脱敏展示。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={payoutRecordOpen}
        centered
        width={880}
        footer={null}
        onCancel={() => setPayoutRecordOpen(false)}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space size={12}>
            {[
              { label: '已提现', value: me.withdrawnCommission, icon: <WalletOutlined style={{ color: token.colorPrimary, fontSize: 14 }} /> },
              { label: '已兑券', value: me.exchangedCommission, icon: <GiftOutlined style={{ color: '#52c41a', fontSize: 14 }} /> },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f0f2f5',
                  borderRadius: 8,
                  padding: '6px 14px',
                }}
              >
                {s.icon}
                <Text type="secondary" style={{ fontSize: 13 }}>{s.label}</Text>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2d4d' }}>{money(s.value)}</span>
              </div>
            ))}
          </Space>
        </div>
        <Tabs
          activeKey={recordTab}
          onChange={(k) => setRecordTab(k as 'withdraw' | 'exchange')}
          tabBarStyle={{ margin: '12px 0' }}
          items={[
            {
              key: 'withdraw',
              label: '提现记录',
              children: (
                <Table<WithdrawRequest>
                  rowKey="id"
                  size="middle"
                  tableLayout="fixed"
                  columns={withdrawColumns}
                  dataSource={myWithdraws}
                  pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
                  scroll={{ x: 1150, y: 'calc(100vh - 400px)' }}
                  locale={{ emptyText: '暂无提现记录，可用佣金满 100 元后可发起提现' }}
                />
              ),
            },
            {
              key: 'exchange',
              label: '兑换记录',
              children: (
                <Table<ExchangeRecord>
                  rowKey="id"
                  size="middle"
                  tableLayout="fixed"
                  columns={exchangeColumns}
                  dataSource={myExchanges}
                  pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
                  scroll={{ x: 820, y: 'calc(100vh - 400px)' }}
                  locale={{ emptyText: '暂无兑换记录，可用佣金可兑换为无门槛代金券' }}
                />
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title="查看返佣模型"
        open={!!modelsForCampaign}
        centered
        width={760}
        footer={null}
        onCancel={() => setModelsForCampaign(null)}
      >
        <Table<PromoCampaignModel>
          rowKey={(row) => `${row.modelName}-${row.multiplierName}`}
          size="middle"
          columns={campaignModelColumns}
          dataSource={(modelsForCampaign?.models ?? []).filter((m) => m.enabled !== false)}
          pagination={false}
          scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
        />
      </Modal>

      <Modal
        title={
          <Space size={6}>
            收益明细
            <RequirementDot
              title="收益明细 · 需求说明"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.收益明细按照计算佣金时间倒序展示。具体以日为结算单位还是以每笔交易为单位，以研发为准。 但需注意；以日为结算单位，则明细的日期和搜索条件精确到天，以每笔交易为单位，则需要展示到分秒；',
                    '2.支持按照分佣时间范围搜索，按照被邀请人姓名模糊搜索，按照活动名称模糊搜索。',
                    '3.搜索后的信息支持导出，导出搜索的全部，不考虑分页；导出信息同列表',
                    '4.每页默认展示20条。',
                    '5.如无分佣信息，展示缺省信息“暂无分佣信息”',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={recordsModalOpen}
        centered
        width={880}
        footer={null}
        onCancel={() => setRecordsModalOpen(false)}
      >
        <Space size={12} wrap>
          <SearchField label="计佣时间">
            <RangePicker
              allowClear
              value={commissionRangeKw}
              onChange={(v) => setCommissionRangeKw(v as [Dayjs | null, Dayjs | null] | null)}
            />
          </SearchField>
          <SearchField label="被邀请人">
            <Input
              allowClear
              style={{ width: 140 }}
              placeholder="请输入姓名"
              value={commissionInviteeKw}
              onChange={(e) => setCommissionInviteeKw(e.target.value)}
              onPressEnter={handleCommissionSearch}
            />
          </SearchField>
          <SearchField label="活动">
            <Input
              allowClear
              style={{ width: 180 }}
              placeholder="请输入活动名称"
              value={commissionCampaignKw}
              onChange={(e) => setCommissionCampaignKw(e.target.value)}
              onPressEnter={handleCommissionSearch}
            />
          </SearchField>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleCommissionSearch}>
            搜索
          </Button>
        </Space>
        <div style={{ textAlign: 'right', margin: '16px 0 12px' }}>
          <Button icon={<DownloadOutlined />} onClick={handleCommissionExport}>
            导出
          </Button>
        </div>
        <Table<CommissionRecord>
          rowKey="id"
          size="middle"
          tableLayout="fixed"
          columns={commissionColumns}
          dataSource={filteredCommissions}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (t) => `共 ${t} 条记录`,
          }}
          scroll={{ x: 780, y: 'calc(100vh - 400px)' }}
        />
      </Modal>

      <Modal
        title="活动规则"
        open={guideModalOpen}
        centered
        width={640}
        footer={null}
        onCancel={() => setGuideModalOpen(false)}
      >
        <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: 8 }}>
          {ACTIVITY_RULES.map((sec) => (
            <div key={sec.title} style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13 }}>
                {sec.title}
              </Text>
              <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {sec.items.map((it) => (
                  <li key={it} style={{ fontSize: 12, lineHeight: 2 }}>
                    <Text type="secondary">{it}</Text>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Modal>

      <PromoPosterModal
        open={!!posterForCampaign}
        link={posterForCampaign ? buildCampaignInviteUrl(posterForCampaign.id, me?.inviteCode) : ''}
        campaignName={posterForCampaign?.name ?? ''}
        onClose={() => setPosterForCampaign(null)}
      />
    </div>
  )
}
