import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout, Menu, Typography, Space, Avatar, Dropdown, Segmented, message } from 'antd'
import { ApiOutlined, AppstoreOutlined, BarChartOutlined, DownOutlined, UserOutlined, TeamOutlined, WalletOutlined, MoreOutlined, DesktopOutlined, RocketOutlined, GlobalOutlined, UnorderedListOutlined, GiftOutlined, MoneyCollectOutlined, LoginOutlined } from '@ant-design/icons'
import UserList from './pages/UserList'
import UserTag from './pages/UserTag'
import AccountList from './pages/AccountList'
import ChannelManage from './pages/ChannelManage'
import ChannelModelManage from './pages/ChannelModelManage'
import ModelHourlyPerfDetail, { type PerfDetailFilter } from './pages/ModelHourlyPerfDetail'
import ChannelBill from './pages/ChannelBill'
import ChannelFeeDetail from './pages/ChannelFeeDetail'
import ChannelStatAnalysis from './pages/ChannelStatAnalysis'
import ModelUsageStat from './pages/ModelUsageStat'
import ModelUsageDetail from './pages/ModelUsageDetail'
import ModelList from './pages/ModelList'
import ModelGroupList from './pages/ModelGroupList'
import ResourcePack from './pages/ResourcePack'
import TokenPlanList from './pages/TokenPlanList'
import RechargeTask from './pages/RechargeTask'
import VoucherIssueCenter from './pages/VoucherIssueCenter'
import OtherRequirements from './pages/OtherRequirements'
import PlanBill from './pages/PlanBill'
import UserConsumeBill from './pages/UserConsumeBill'
import PlanStats from './pages/PlanStats'
import VoucherStats from './pages/VoucherStats'
import PurchasePage from './pages/PurchasePage'
import PurchaseCheckout from './pages/PurchaseCheckout'
import PaymentPage from './pages/PaymentPage'
import EnterprisePurchasePage from './pages/EnterprisePurchasePage'
import EnterpriseCheckoutPage from './pages/EnterpriseCheckoutPage'
import AgreementPage, { type AgreementType } from './pages/AgreementPage'
import UsageGuidePage from './pages/UsageGuidePage'
import UsageStatsPage from './pages/UsageStatsPage'
import MySubscriptionPage from './pages/MySubscriptionPage'
import BillingPage, { type BillingSubPage } from './pages/BillingPage'
import ResourcePackPage from './pages/ResourcePackPage'
import PromoLandingPage from './pages/PromoLandingPage'
import OfficialWebPage from './pages/OfficialWebPage'
import PromoShareLandingPage from './pages/PromoShareLandingPage'
import PromoInviteeLandingPageV2 from './pages/PromoInviteeLandingPageV2'
import PromoLoginPage from './pages/PromoLoginPage'
import SiteFooter from './components/SiteFooter'
import RequirementDot from './components/RequirementDot'
import ConsolePromo from './pages/ConsolePromo'
import PromoPartnerManage from './pages/PromoPartnerManage'
import PromoCommissionDetail, { type CommissionDetailFilter } from './pages/PromoCommissionDetail'
import PromoRebateConfig from './pages/PromoRebateConfig'
import PromoSettleAudit from './pages/PromoSettleAudit'
import PromoStats from './pages/PromoStats'
import TokenFactoryPage, { resolvePlazaModelId, type FactoryMenu } from './pages/TokenFactoryPage'
import VersionChangelog from './pages/VersionChangelog'
import { RELEASES, parseConsoleScope } from './releases'
import { getActiveScope, getScopeFromUrl, getScopeRouteKeys, isInScope, SCOPES } from './scope'
import { getPromoSession } from './store'
import type { TokenPlan } from './types'
import { SHOW_ENTERPRISE } from './constants'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export type RouteKey =
  | 'userList'
  | 'userTag'
  | 'accountList'
  | 'rechargeTask'
  | 'voucherIssueCenter'
  | 'channels'
  | 'channelModels'
  | 'modelHourlyPerf'
  | 'channelBill'
  | 'channelFeeDetail'
  | 'channelStat'
  | 'modelUsageStat'
  | 'modelUsageDetail'
  | 'models'
  | 'modelGroups'
  | 'resourcePack'
  | 'tokenPlan'
  | 'planBill'
  | 'userConsumeBill'
  | 'planStats'
  | 'voucherStats'
  | 'promoPartnerManage'
  | 'promoCommissionDetail'
  | 'promoRebateConfig'
  | 'promoSettleAudit'
  | 'promoStats'
  | 'otherRequirements'
  | 'changelog'

type MenuItem = {
  key: string
  label?: string
  children?: MenuItem[]
}

/** 原菜单数据（集中在这里，方便过滤与统计） */
const FULL_MENU: MenuItem[] = [
  {
    key: 'userTeamGroup',
    label: '用户与团队管理',
    children: [
      { key: 'userList', label: '用户列表' },
      { key: 'userTag', label: '用户标签' },
    ],
  },
  {
    key: 'accountGroup',
    label: '账户管理',
    children: [
      { key: 'accountList', label: '账户列表' },
      { key: 'rechargeTask', label: '定时充值任务' },
      { key: 'voucherIssueCenter', label: '代金券' },
    ],
  },
  {
    key: 'modelGroup',
    label: '模型管理',
    children: [
      { key: 'models', label: '模型列表' },
      { key: 'modelGroups', label: '模型分组' },
      { key: 'resourcePack', label: '资源包管理' },
      { key: 'tokenPlan', label: 'Token Plan' },
    ],
  },
  {
    key: 'promoGroup',
    label: '分销管理',
    children: [
      { key: 'promoRebateConfig', label: '分销活动' },
      { key: 'promoCommissionDetail', label: '分佣明细' },
      { key: 'promoPartnerManage', label: '分销合伙人' },
      { key: 'promoSettleAudit', label: '提现审核与兑券' },
      { key: 'promoStats', label: '分销统计' },
    ],
  },
  {
    key: 'channelGroup',
    label: '渠道管理',
    children: [
      { key: 'channels', label: '渠道管理' },
      { key: 'channelModels', label: '渠道模型管理' },
      { key: 'modelHourlyPerf', label: '模型性能明细（小时）' },
      { key: 'channelBill', label: '渠道对账单' },
      { key: 'channelFeeDetail', label: '渠道费用明细' },
    ],
  },
  {
    key: 'statGroup',
    label: '统计与分析',
    children: [
      { key: 'channelStat', label: '渠道统计与性能分析' },
      { key: 'modelUsageStat', label: '模型使用统计分析' },
      { key: 'modelUsageDetail', label: '模型使用明细' },
      { key: 'planStats', label: '资源包与套餐统计' },
      { key: 'voucherStats', label: '代金券统计' },
    ],
  },
  {
    key: 'billGroup',
    label: '账单管理',
    children: [
      { key: 'planBill', label: '套餐与资源包账单' },
      { key: 'userConsumeBill', label: '用户消费账单' },
    ],
  },
  {
    key: 'otherRequirements',
    label: '其他需求',
  },
]

/** 菜单项 icon 映射（单独维护，避免跟过滤逻辑耦合） */
const MENU_ICON: Record<string, React.ReactNode> = {
  userTeamGroup: <TeamOutlined />,
  accountGroup: <WalletOutlined />,
  modelGroup: <AppstoreOutlined />,
  channelGroup: <ApiOutlined />,
  statGroup: <BarChartOutlined />,
  billGroup: <WalletOutlined />,
  promoGroup: <GiftOutlined />,
  otherRequirements: <MoreOutlined />,
}

/** 统计全量叶子节点（路由）数量，用于提示「本次显示 X/Y」 */
function countLeaves(items: MenuItem[]): number {
  let c = 0
  for (const it of items) {
    if (it.children && it.children.length) c += countLeaves(it.children)
    else c += 1
  }
  return c
}

/** 菜单里所有叶子路由 key，用于校验 URL 上的 route 参数 */
const MENU_LEAF_KEYS: Set<string> = new Set(
  FULL_MENU.flatMap((it) => (it.children && it.children.length ? it.children.map((c) => c.key) : [it.key])),
)

/** 官方网站页面 key：tokenPlan=「Token Plan」菜单页，promo=推广合伙人落地页，其余为占位页 */
type WebsitePage =
  | 'tokenPlan'
  | 'product'
  | 'plaza'
  | 'factory'
  | 'market'
  | 'intel'
  | 'news'
  | 'solution'
  | 'promo'

/** 官网完整顶部导航（固定结构，评审模式只隐藏未声明的项，不删结构） */
const WEBSITE_NAV: { key: WebsitePage; label: string }[] = [
  { key: 'tokenPlan', label: 'Token Plan' },
  { key: 'product', label: '产品服务' },
  { key: 'plaza', label: '模型广场' },
  { key: 'factory', label: 'Token工厂' },
  { key: 'market', label: '算力市场' },
  { key: 'intel', label: '算力商情' },
  { key: 'news', label: '行业资讯' },
  { key: 'solution', label: '解决方案' },
  { key: 'promo', label: '推广合伙人' },
]

/** 按 routeKeys 过滤菜单；组内没有可见子项时整个组隐藏 */
function filterMenu(items: MenuItem[], allowed: Set<string> | 'all'): MenuItem[] {
  if (allowed === 'all') return items
  const out: MenuItem[] = []
  for (const it of items) {
    if (it.children && it.children.length) {
      const sub = filterMenu(it.children, allowed)
      if (sub.length > 0) out.push({ ...it, children: sub })
    } else {
      if (allowed.has(it.key)) out.push(it)
    }
  }
  return out
}

/** 给菜单项补上 icon（给 Antd Menu 用的格式） */
function withIcons(items: MenuItem[]): any[] {
  return items.map((it) => {
    const base: any = { key: it.key, label: it.label }
    if (MENU_ICON[it.key]) base.icon = MENU_ICON[it.key]
    if (it.children) base.children = withIcons(it.children)
    return base
  })
}

/** 从 URL query 读取 review 版本号（返回 null 表示非评审模式） */
function getReviewVersionFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const sp = new URLSearchParams(window.location.search)
  const v = sp.get('review')
  if (!v) return null
  return v
}

/** 退出评审模式：去掉 ?review=xxx 并刷新（保留，供未来复用） */
function _exitReviewMode() {
  const url = new URL(window.location.href)
  url.searchParams.delete('review')
  window.location.href = url.toString()
}

export default function App() {
  /** 初始路由支持从 URL 的 route 参数回跳（仅接受菜单里存在的合法 key），刷新后可回到当前页 */
  const [active, setActive] = useState<RouteKey>(() => {
    try {
      const route = new URLSearchParams(window.location.search).get('route')
      if (route && MENU_LEAF_KEYS.has(route)) return route as RouteKey
    } catch {
      /** 忽略非法 URL 参数 */
    }
    return 'promoRebateConfig'
  })
  /** 每次菜单点击 +1，作为内容区 key 的一部分强制重挂载 */
  const [navSeq, setNavSeq] = useState(0)
  /** 后台内容区是各页面共用的滚动容器，切页时需要它回到顶部，否则新页面会停在上一页的滚动位置 */
  const contentRef = useRef<HTMLElement>(null)
  /** 从「查看性能」弹窗点「查看全部」带过来的渠道与该渠道模型名称，用于明细页自动搜索 */
  const [perfDetailFilter, setPerfDetailFilter] = useState<PerfDetailFilter | undefined>(undefined)
  /** 从「分销合伙人 › 分佣明细」跳转带过来的分销员，用于分佣明细页自动搜索 */
  const [commissionDetailFilter, setCommissionDetailFilter] = useState<CommissionDetailFilter | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'admin' | 'console' | 'website'>('admin')
  /** 官网当前页：默认落在「Token Plan」菜单页 */
  const [websitePage, setWebsitePage] = useState<WebsitePage>('tokenPlan')
  /** 控制台默认落在费用管理，顶部导航点击「控制台」时也回到费用管理 */
  const [consoleSubPage, setConsoleSubPage] = useState<string>('billing')
  /** 「查看模型详情」跳转：进入 Token工厂时直达模型广场的模型详情 */
  const [factoryDetailId, setFactoryDetailId] = useState<string | null>(null)
  const [tokenPlanSub, setTokenPlanSub] = useState<
    'overview' | 'mySubscription' | 'resourcePack' | 'mySubscriptionNoPlan' | 'mySubscriptionNoPack' | 'mySubscriptionPlanUnavailable'
  >('overview')
  const [billingSub, setBillingSub] = useState<BillingSubPage>('accountOverview')
  const [checkoutPlan, setCheckoutPlan] = useState<TokenPlan | null>(null)
  const [isRenewMode, setIsRenewMode] = useState(false)

  const renewPlan: TokenPlan = {
    id: 'renew_lite',
    name: '新手套餐（Lite）',
    subtitle: '专为初次接触大模型的用户设计，以轻量配额提供核心API调用能力，是快速验证场景可行性的最佳起点',
    level: 'lite',
    planType: 'personal',
    summaryItems: ['适合首次体验 AI 能力', '可执行约 70 轮问答', '支持主流对话模型'],
    price: 60,
    discountPrice: 39,
    discount: 65,
    showOriginalPrice: true,
    originalPrice: 99,
    durations: [
      { label: '月付', months: 1, discount: 100, finalPrice: 60 },
      { label: '年付', months: 12, discount: 80, finalPrice: 576 },
    ],
    productTag: '',
    totalTokens: 3500000,
    usageLimitEnabled: true,
    usageLimit: 3500000,
    usagePeriod: 'monthly',
    validityValue: 1,
    validityUnit: 'month',
    autoRenew: true,
    status: 'on',
    modelIds: [],
    operator: '管理员',
    createdAt: '2026-08-10',
  }

  const handleRenew = () => {
    setCheckoutPlan(renewPlan)
    setIsRenewMode(true)
  }
  /** 「查看历史订单」：跳转到费用管理的订单明细页 */
  const handleViewOrders = () => {
    setCheckoutPlan(null)
    setIsRenewMode(false)
    setConsoleSubPage('billing')
    setBillingSub('orderDetail')
  }
  /** 「查看模型详情」：跳转到 Token工厂模型广场对应模型的详情页 */
  const handleViewModelDetail = (model: string) => {
    const id = resolvePlazaModelId(model)
    if (!id) {
      message.info('该模型暂无详情数据')
      return
    }
    setFactoryDetailId(id)
    setConsoleSubPage('tokenFactory')
  }
  /** 未购买资源包时的「去购买」：跳转到资源包管理页 */
  const handleGoResourcePack = () => {
    setTokenPlanSub('resourcePack')
  }
  const [paymentData, setPaymentData] = useState<{
    plan: TokenPlan
    duration: any
    total: number
    orderNo: string
    validityUnit?: string
  } | null>(null)
  const [showEnterprisePage, setShowEnterprisePage] = useState(false)
  const [agreementView, setAgreementView] = useState<AgreementType | null>(null)
  const [showUsageGuide, setShowUsageGuide] = useState(false)
  const [showUsageStats, setShowUsageStats] = useState(false)
  const [enterpriseCheckoutPlan, setEnterpriseCheckoutPlan] = useState<{
    id: string
    name: string
    subtitle: string
    price: string
    originalPrice: string
    unit: string
    features: string[]
    models: { name: string; type: string }[]
    totalModelCount: number
    bgGradient: string
  } | null>(null)

  /** 评审模式（从 URL 读取，初始化一次即可） */
  const [reviewVersion, setReviewVersion] = useState<string | null>(
    () => getReviewVersionFromUrl()
  )

  /** 评审模式：自动切换到允许的视图 */
  useEffect(() => {
    if (!reviewVersion) return
    const release = RELEASES[reviewVersion]
    if (!release) return

    const allowedViews = release.views ?? ['admin']
    if (allowedViews.includes(viewMode)) return

    setViewMode(allowedViews[0])
  }, [reviewVersion])

  /** 保证 active 落在允许范围内（评审模式打开了不在允许范围内的路由时，切到第一个允许项；功能列表页永远放行） */
  useEffect(() => {
    if (!reviewVersion) return
    const release = RELEASES[reviewVersion]
    if (!release || release.routeKeys.includes('*')) return
    if (active === 'changelog') return

    const allowed = new Set<string>(release.routeKeys as string[])
    if (allowed.has(active)) return

    const firstAllowed = (release.routeKeys as string[])[0]
    if (firstAllowed) setActive(firstAllowed as RouteKey)
  }, [reviewVersion, active])

  /** 新功能作用域：active 不在新路由集合时切到第一个；功能列表页永远放行 */
  useEffect(() => {
    if (!isInScope()) return
    if (active === 'changelog') return
    const keys = getScopeRouteKeys()
    if (keys.length === 0) return
    if (keys.includes(active)) return
    setActive(keys[0] as RouteKey)
  }, [active])

  /** 切换页面后把共用滚动容器重置到顶部，避免新页面沿用上一页的滚动位置（长页面会只显示下半部分） */
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [active])

  /** 根据评审模式 / 新功能作用域计算允许的路由 / 过滤后的菜单 */
  const { menuItems, shownCount, totalCount, reviewRelease, invalidReview } = useMemo(() => {
    const total = countLeaves(FULL_MENU)

    // 新功能作用域：只显示当前 scope 注册的路由
    const scope = getActiveScope()
    if (scope) {
      const allowedKeys = new Set<string>(scope.routeKeys)
      const filtered = filterMenu(FULL_MENU, allowedKeys)
      const shown = countLeaves(filtered)
      return {
        menuItems: withIcons(filtered),
        shownCount: shown,
        totalCount: total,
        reviewRelease: null as any,
        invalidReview: false,
      }
    }

    if (!reviewVersion) {
      return {
        menuItems: withIcons(FULL_MENU),
        shownCount: total,
        totalCount: total,
        reviewRelease: null as any,
        invalidReview: false,
      }
    }

    const release = RELEASES[reviewVersion]
    if (!release) {
      return {
        menuItems: withIcons(FULL_MENU),
        shownCount: total,
        totalCount: total,
        reviewRelease: null as any,
        invalidReview: true,
      }
    }

    const allowed = release.routeKeys.includes('*')
      ? 'all' as const
      : new Set<string>(release.routeKeys as string[])

    const filtered = filterMenu(FULL_MENU, allowed)
    const shown = countLeaves(filtered)

    return {
      menuItems: withIcons(filtered),
      shownCount: shown,
      totalCount: total,
      reviewRelease: release,
      invalidReview: false,
    }
  }, [reviewVersion])

  /** 评审模式下允许的视图 */
  const reviewAllowedViews = reviewRelease?.views ?? ['admin']
  const isReviewViewAllowed = !reviewRelease || reviewAllowedViews.includes(viewMode)

  /** 评审模式下的控制台范围：只放行本次版本 consoleKeys 声明的 Token工厂 / 费用二级菜单 */
  const consoleScope = useMemo(() => parseConsoleScope(reviewRelease), [reviewRelease])
  const allowedFactoryMenus = consoleScope?.factory as FactoryMenu[] | undefined
  const allowedBillingSubs = consoleScope?.billing as BillingSubPage[] | undefined
  /** 控制台顶部导航：本次范围里没有对应入口时隐藏 */
  const showConsoleFactory = !consoleScope || !!allowedFactoryMenus
  const showConsoleBilling = !consoleScope || !!allowedBillingSubs
  const showConsolePromo = !consoleScope || consoleScope.promo
  /** 控制台顶部「Token Plan」：完整版始终显示；评审模式按 consoleKeys 是否含 `plan` 放行 */
  const showConsoleTokenPlan = !consoleScope || consoleScope.tokenPlan
  const showConsoleLogin = !reviewRelease || !consoleScope || consoleScope.login
  /** 官网可见导航：完整版全量；评审模式只放行 websiteKeys 声明的页面（隐藏而非删除，其余页面结构保留） */
  const visibleWebNav = reviewRelease?.websiteKeys
    ? WEBSITE_NAV.filter((n) => (reviewRelease.websiteKeys as string[]).includes(n.key))
    : WEBSITE_NAV
  /** 官网落地页：取可见导航第一项 */
  const websiteLanding: WebsitePage = visibleWebNav[0]?.key ?? 'tokenPlan'
  const defaultConsoleSub = showConsoleFactory
    ? 'tokenFactory'
    : showConsoleBilling
      ? 'billing'
      : 'tokenFactory'
  /** 费用管理默认子页：评审模式取本次放行项的第一项，否则落在菜单首项「账户概览」 */
  const defaultBillingSub: BillingSubPage = allowedBillingSubs?.[0] ?? 'accountOverview'
  /** 点击「控制台」时的落地子页：放行推广合伙人直达该页，其次 Token Plan，再次 Token工厂，最后费用管理 */
  const consoleLandingSub = showConsolePromo
    ? 'promo'
    : showConsoleTokenPlan
      ? 'tokenPlan'
      : showConsoleFactory
        ? 'tokenFactory'
        : 'billing'

  /** 评审模式：控制台子页回落到本次范围内的入口 */
  useEffect(() => {
    if (!consoleScope) return
    if (!showConsoleFactory && !showConsoleBilling && !showConsolePromo && !showConsoleTokenPlan) return
    if (consoleSubPage === 'tokenFactory' && !showConsoleFactory) setConsoleSubPage(showConsolePromo ? 'promo' : showConsoleTokenPlan ? 'tokenPlan' : 'billing')
    if (consoleSubPage === 'billing' && !showConsoleBilling) setConsoleSubPage(showConsolePromo ? 'promo' : showConsoleTokenPlan ? 'tokenPlan' : 'tokenFactory')
    if (consoleSubPage === 'tokenPlan' && !showConsoleTokenPlan) setConsoleSubPage(defaultConsoleSub)
    if (['appPlaza', 'opc'].includes(consoleSubPage)) setConsoleSubPage(defaultConsoleSub)
    if (consoleSubPage === 'promo' && !showConsolePromo) setConsoleSubPage(defaultConsoleSub)
  }, [consoleScope, consoleSubPage, showConsoleFactory, showConsoleBilling, showConsolePromo, showConsoleTokenPlan, defaultConsoleSub])

  /** 评审模式：费用二级菜单回落到本次范围内的第一项 */
  useEffect(() => {
    if (!allowedBillingSubs || allowedBillingSubs.length === 0) return
    if (allowedBillingSubs.includes(billingSub)) return
    setBillingSub(allowedBillingSubs[0])
  }, [allowedBillingSubs, billingSub])

  /** 评审模式：官网当前页不在放行范围时，回落到落地页 */
  useEffect(() => {
    if (viewMode !== 'website') return
    if (visibleWebNav.some((n) => n.key === websitePage)) return
    setWebsitePage(websiteLanding)
  }, [viewMode, reviewVersion, websitePage, websiteLanding])

  /** 分销商活动落地页：?share=<活动id> 命中时整屏渲染，不叠加后台/控制台/官网的任何外壳；
   * 用 state 承载是为了「进入控制台」时能清掉它、让 App 正常渲染控制台 */
  const [shareCampaignId, setShareCampaignId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('share')
    } catch {
      /** 忽略非法 URL 参数 */
    }
    return null
  })

  /** 分销员邀请码：?code=<邀请码> 与 ?share 同时出现时，说明链接是分销员的专属推广链接，
   * 打开的人是「最终用户」，因此渲染面向 C 端的使用引导承接页而非分销商落地页 */
  const [shareInviteCode, setShareInviteCode] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('code')
    } catch {
      /** 忽略非法 URL 参数 */
    }
    return null
  })

  /** 原型内置登录页：?login=1 命中时整屏渲染（优先于落地页），登录成功直落控制台 */
  const [loginMode, setLoginMode] = useState<boolean>(() => {
    try {
      return new URLSearchParams(window.location.search).get('login') === '1'
    } catch {
      /** 忽略非法 URL 参数 */
    }
    return false
  })

  /** 从地址栏移除指定查询参数（replaceState 不触发刷新，避免返回/登录后重复进入登录页） */
  const dropQueryParams = (...keys: string[]) => {
    try {
      const params = new URLSearchParams(window.location.search)
      keys.forEach((k) => params.delete(k))
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    } catch {
      /** 忽略 URL 清理异常 */
    }
  }

  /** 登录页成功后的回流目标：官网「立即订阅」登录后直达控制台 Token Plan 概览；null 走默认逻辑 */
  const [loginReturn, setLoginReturn] = useState<'tokenPlanOverview' | 'resourcePack' | null>(null)

  if (loginMode) {
    return (
      <PromoLoginPage
        share={shareCampaignId}
        inviteCode={shareInviteCode}
        onBack={() => {
          dropQueryParams('login')
          setLoginReturn(null)
          setLoginMode(false)
        }}
        onSuccess={(invitee) => {
          dropQueryParams('login', 'share', 'code')
          setLoginMode(false)
          setShareCampaignId(null)
          setShareInviteCode(null)
          if (loginReturn === 'tokenPlanOverview') {
            /** 官网「立即订阅」入口：登录后直达控制台 · Token Plan 概览 */
            setLoginReturn(null)
            setViewMode('console')
            setConsoleSubPage('tokenPlan')
            setTokenPlanSub('overview')
            setCheckoutPlan(null)
            setPaymentData(null)
            return
          }
          if (loginReturn === 'resourcePack') {
            /** 官网资源包「立即购买」入口：登录后直达控制台 · 资源包管理 */
            setLoginReturn(null)
            setViewMode('console')
            setConsoleSubPage('tokenPlan')
            setTokenPlanSub('resourcePack')
            setCheckoutPlan(null)
            setPaymentData(null)
            return
          }
          /** 登录成功统一进入控制台：被邀请用户直达「Token工厂 › 概览」（Token工厂默认首页即概览），分销商直达推广合伙人 */
          setViewMode('console')
          setFactoryDetailId(null)
          if (invitee) {
            setConsoleSubPage('tokenFactory')
          } else {
            setConsoleSubPage('promo')
          }
        }}
      />
    )
  }

  if (shareCampaignId && shareInviteCode) {
    return (
      <PromoInviteeLandingPageV2 campaignId={shareCampaignId} inviteCode={shareInviteCode} />
    )
  }

  if (shareCampaignId) {
    return (
      <PromoShareLandingPage
        campaignId={shareCampaignId}
        onEnterConsole={() => {
          try {
            const params = new URLSearchParams(window.location.search)
            params.delete('share')
            const qs = params.toString()
            window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
          } catch {
            /** 忽略 URL 清理异常 */
          }
          setShareCampaignId(null)
          setViewMode('console')
          setConsoleSubPage('promo')
        }}
      />
    )
  }

  const renderPage = () => {
    switch (active) {
      case 'userList':
        return <UserList onNavigateToTagPage={() => setActive('userTag')} />
      case 'userTag':
        return <UserTag />
      case 'accountList':
        return <AccountList />
      case 'rechargeTask':
        return <RechargeTask />
      case 'voucherIssueCenter':
        return <VoucherIssueCenter />
      case 'channels':
        return <ChannelManage />
      case 'channelModels':
        return (
          <ChannelModelManage
            onViewHourlyDetail={(item) => {
              setPerfDetailFilter({ channelId: item.channelId, modelName: item.modelName })
              setActive('modelHourlyPerf')
            }}
          />
        )
      case 'modelHourlyPerf':
        return <ModelHourlyPerfDetail initialFilter={perfDetailFilter} />
      case 'channelBill':
        return <ChannelBill />
      case 'channelFeeDetail':
        return <ChannelFeeDetail />
      case 'channelStat':
        return <ChannelStatAnalysis />
      case 'modelUsageStat':
        return <ModelUsageStat />
      case 'modelUsageDetail':
        return <ModelUsageDetail />
      case 'models':
        return <ModelList />
      case 'modelGroups':
        return <ModelGroupList />
      case 'resourcePack':
        return <ResourcePack />
      case 'tokenPlan':
        return <TokenPlanList />
      case 'planBill':
        return <PlanBill />
      case 'userConsumeBill':
        return <UserConsumeBill />
      case 'planStats':
        return <PlanStats />
      case 'voucherStats':
        return <VoucherStats />
      case 'promoPartnerManage':
        return (
          <PromoPartnerManage
            onOpenCommissionDetail={(p) => {
              setCommissionDetailFilter({ partnerId: p.id, partnerName: p.nickname })
              setActive('promoCommissionDetail')
            }}
          />
        )
      case 'promoCommissionDetail':
        return <PromoCommissionDetail initialFilter={commissionDetailFilter} />
      case 'promoRebateConfig':
        return <PromoRebateConfig />
      case 'promoSettleAudit':
        return <PromoSettleAudit />
      case 'promoStats':
        return <PromoStats />
      case 'otherRequirements':
        return <OtherRequirements />
      case 'changelog':
        return <VersionChangelog />
      default:
        return <ChannelManage />
    }
  }

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 顶层视图切换条 */}
      <div
        style={{
          background: '#f7f8fa',
          borderBottom: '1px solid #eef0f4',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          position: 'relative',
        }}
      >
        <Segmented
          value={viewMode}
          onChange={(v) => {
            const next = v as 'admin' | 'console' | 'website'
            setViewMode(next)
            /** 点击「管理后台」默认回到分销管理 › 分销活动（默认落地页），并清掉 URL 上的旧路由 */
            if (next === 'admin') {
              setActive('promoRebateConfig')
              setNavSeq((s) => s + 1)
              dropQueryParams('route', 'campaign')
            }
            /** 点击「控制台」默认直接进入费用管理，并退出可能残留的套餐结算 / 支付流程 */
            if (next === 'console') {
              setConsoleSubPage(consoleLandingSub)
              setFactoryDetailId(null)
              if (consoleLandingSub === 'billing') setBillingSub(defaultBillingSub)
              if (consoleLandingSub === 'tokenPlan') setTokenPlanSub('overview')
              setCheckoutPlan(null)
              setPaymentData(null)
            }
            /** 点击「官方网站」回到落地页（完整版 Token Plan 菜单页；评审版本次放行页） */
            if (next === 'website') setWebsitePage(websiteLanding)
          }}
          options={[
            {
              label: (
                <Space size={6}>
                  <DesktopOutlined />
                  管理后台
                </Space>
              ),
              value: 'admin',
            },
            {
              label: (
                <Space size={6}>
                  <RocketOutlined />
                  控制台
                </Space>
              ),
              value: 'console',
            },
            {
              label: (
                <Space size={6}>
                  <GlobalOutlined />
                  官方网站
                </Space>
              ),
              value: 'website',
            },
          ]}
        />
        <Space size={16} style={{ position: 'absolute', right: 24 }}>
          {showConsoleLogin && (
            <a
              onClick={() => setLoginMode(true)}
              style={{
                color: '#2f6bff',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <LoginOutlined />
              登录页
            </a>
          )}
          <a
            onClick={() => {
              setViewMode('admin')
              setActive('changelog')
            }}
            style={{
              color: '#2f6bff',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <UnorderedListOutlined />
            功能列表
          </a>
        </Space>
      </div>

      {/* 管理后台视图：智算多多 Header + 评审条 + Sider + 内容 */}
      {viewMode === 'admin' && (
        <>
          <Header
            style={{
              background: '#fff',
              padding: '0 24px',
              height: 56,
              lineHeight: '56px',
              borderBottom: '1px solid #eef0f4',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <Space size={8} style={{ fontWeight: 600, fontSize: 16 }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: '#2f6bff',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                }}
              >
                智
              </span>
              智算多多后台管理系统
            </Space>
            <Space size={24} style={{ color: '#5a6474' }}>
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => { setViewMode('website') }}
              >
                官方网站
              </span>
              <span>Token工厂</span>
            </Space>
            <div style={{ flex: 1 }} />
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '个人中心' },
                  { key: 'logout', label: '退出登录' },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer', color: '#333' }}>
                <Avatar size={26} icon={<UserOutlined />} style={{ background: '#2f6bff' }} />
                <Text>admin2</Text>
                <DownOutlined style={{ fontSize: 10, color: '#999' }} />
              </Space>
            </Dropdown>
          </Header>

          <Layout>
            <Sider theme="light" width={200} style={{ borderRight: '1px solid #eef0f4' }}>
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[active]}
                defaultOpenKeys={['userTeamGroup', 'accountGroup', 'modelGroup', 'promoGroup', 'channelGroup', 'statGroup', 'billGroup']}
                style={{ borderRight: 0, paddingTop: 8 }}
                onClick={({ key }) => {
                  setPerfDetailFilter(undefined)
                  setCommissionDetailFilter(undefined)
                  setActive(key as RouteKey)
                  /** 每次点击菜单都重挂载内容区：即使点的是当前菜单，也能从内嵌子页（如配置返佣模型）退回列表 */
                  setNavSeq((s) => s + 1)
                  /** 把路由同步到 URL（默认落地页分销活动不写参数），刷新可回跳；切页时清掉子页残留参数 */
                  try {
                    const params = new URLSearchParams(window.location.search)
                    if (key === 'promoRebateConfig') params.delete('route')
                    else params.set('route', key)
                    params.delete('campaign')
                    const qs = params.toString()
                    const next = window.location.pathname + (qs ? `?${qs}` : '')
                    if (next !== window.location.pathname + window.location.search) {
                      window.history.pushState(null, '', next)
                    }
                  } catch {
                    /** URL 同步失败不影响页面切换 */
                  }
                }}
                items={menuItems}
              />
            </Sider>
            <Content ref={contentRef} style={{ padding: 16, overflow: 'auto', background: '#f0f2f5' }}>
              <div key={`${active}-${navSeq}`}>{renderPage()}</div>
            </Content>
          </Layout>
        </>
      )}

      {/* 控制台视图：独立顶部导航 + PurchasePage */}
      {viewMode === 'console' && (
        <Content style={{ overflow: 'auto', background: '#fff' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 32px',
              height: 52,
              background: '#fff',
              borderBottom: '1px solid #eef0f4',
            }}
          >
            <Space size={32} style={{ fontSize: 14 }}>
              <Space size={8} style={{ fontWeight: 700, fontSize: 16 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #52c41a 0%, #237804 100%)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  Z
                </span>
                <span style={{ color: '#1a1a1a', fontWeight: 600 }}>控制台</span>
              </Space>
              {showConsoleFactory && (
                <span
                  style={{
                    color: consoleSubPage === 'tokenFactory' ? '#1a1a1a' : '#5a6474',
                    fontWeight: consoleSubPage === 'tokenFactory' ? 600 : 400,
                    cursor: 'pointer',
                  }}
                  onClick={() => { setConsoleSubPage('tokenFactory'); setFactoryDetailId(null); setCheckoutPlan(null); setPaymentData(null) }}
                >
                  Token工厂
                </span>
              )}
              {!consoleScope && (
                <span
                  style={{
                    color: consoleSubPage === 'appPlaza' ? '#1a1a1a' : '#5a6474',
                    fontWeight: consoleSubPage === 'appPlaza' ? 600 : 400,
                    cursor: 'pointer',
                  }}
                  onClick={() => { setConsoleSubPage('appPlaza'); setCheckoutPlan(null); setPaymentData(null) }}
                >
                  应用广场
                </span>
              )}
              {!consoleScope && (
                <span
                  style={{
                    color: consoleSubPage === 'opc' ? '#1a1a1a' : '#5a6474',
                    fontWeight: consoleSubPage === 'opc' ? 600 : 400,
                    cursor: 'pointer',
                  }}
                  onClick={() => { setConsoleSubPage('opc'); setCheckoutPlan(null); setPaymentData(null) }}
                >
                  opc社区
                </span>
              )}
              {showConsoleTokenPlan && (
              <span
                style={{
                  color: consoleSubPage === 'tokenPlan' ? '#2f6bff' : '#5a6474',
                  fontWeight: consoleSubPage === 'tokenPlan' ? 600 : 400,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={() => { setConsoleSubPage('tokenPlan'); setTokenPlanSub('overview'); setCheckoutPlan(null); setPaymentData(null); setShowEnterprisePage(false); setEnterpriseCheckoutPlan(null); setShowUsageGuide(false); setShowUsageStats(false); setAgreementView(null) }}
              >
                Token Plan
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginLeft: 4,
                    padding: '0 5px',
                    height: 16,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ff4d4f 100%)',
                    borderRadius: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  NEW
                </span>
              </span>
              )}
              {showConsolePromo && (
                <span
                  style={{
                    color: consoleSubPage === 'promo' ? '#2f6bff' : '#5a6474',
                    fontWeight: consoleSubPage === 'promo' ? 600 : 400,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => { setConsoleSubPage('promo'); setCheckoutPlan(null); setPaymentData(null) }}
                >
                  <MoneyCollectOutlined style={{ color: '#fa8c16' }} />
                  推广合伙人
                  <RequirementDot
                    title="推广合伙人菜单 · 需求说明"
                    sections={[
                      {
                        label: '需求内容',
                        items: ['1.新增推广合伙人页面。具体如下图；'],
                      },
                    ]}
                  />
                </span>
              )}
            </Space>
            <Space size={20}>
              {showConsoleBilling && (
                <span
                  style={{
                    color: consoleSubPage === 'billing' ? '#2f6bff' : '#5a6474',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: consoleSubPage === 'billing' ? 600 : 400,
                  }}
                  onClick={() => {
                    setConsoleSubPage('billing')
                    setBillingSub(defaultBillingSub)
                    setCheckoutPlan(null)
                    setPaymentData(null)
                  }}
                >
                  费用
                  <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
                </span>
              )}
              {!consoleScope && <span style={{ color: '#5a6474', cursor: 'pointer' }}>文档</span>}
              <span
                style={{
                  position: 'relative',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#f5f7fa',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  color: '#5a6474',
                  cursor: 'pointer',
                }}
              >
                🔔
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#ff4d4f',
                    color: '#fff',
                    borderRadius: 10,
                    fontSize: 10,
                    padding: '0 4px',
                    minWidth: 16,
                    height: 16,
                    lineHeight: '16px',
                    textAlign: 'center',
                  }}
                >
                  6
                </span>
              </span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#2f6bff',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                v
              </span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>w</span>
            </Space>
          </div>
          {consoleSubPage === 'tokenPlan' && agreementView ? (
            <AgreementPage type={agreementView} onBack={() => setAgreementView(null)} />
          ) : consoleSubPage === 'tokenPlan' && paymentData ? (
            <PaymentPage
              productName={paymentData.plan.name}
              duration={paymentData.duration}
              validityUnit={paymentData.validityUnit as any}
              total={paymentData.total}
              orderNo={paymentData.orderNo}
              onBack={() => setPaymentData(null)}
              onPaymentSuccess={() => {
                setPaymentData(null)
                setCheckoutPlan(null)
                setConsoleSubPage('tokenPlan')
                setTokenPlanSub('mySubscriptionNoPack')
              }}
            />
          ) : consoleSubPage === 'tokenPlan' && SHOW_ENTERPRISE && showEnterprisePage && !enterpriseCheckoutPlan ? (
            <EnterprisePurchasePage
              onBack={() => setShowEnterprisePage(false)}
              onBuy={(plan) => setEnterpriseCheckoutPlan(plan)}
            />
          ) : consoleSubPage === 'tokenPlan' && SHOW_ENTERPRISE && showEnterprisePage && enterpriseCheckoutPlan ? (
            <EnterpriseCheckoutPage
              plan={enterpriseCheckoutPlan}
              onBack={() => setEnterpriseCheckoutPlan(null)}
              onPay={(data) => {
                setEnterpriseCheckoutPlan(null)
                setShowEnterprisePage(false)
                setPaymentData({
                  plan: { name: enterpriseCheckoutPlan.name, validityUnit: 'month' } as TokenPlan,
                  duration: data.duration,
                  validityUnit: 'month',
                  total: data.total,
                  orderNo: data.orderNo,
                })
              }}
              onOpenAgreement={setAgreementView}
            />
          ) : consoleSubPage === 'tokenPlan' && !checkoutPlan ? (
            <div style={{ display: 'flex', height: '100%', background: '#f0f2f5' }}>
              {/* 左侧二级菜单 */}
              <div
                style={{
                  width: 200,
                  background: '#fff',
                  borderRight: '1px solid #eef0f4',
                  padding: '16px 0',
                  flexShrink: 0,
                }}
              >
                {(
                    [
                      { key: 'overview', label: 'Token Plan 概览' },
                      { key: 'mySubscriptionNoPlan', label: '我的订阅（未购买套餐）' },
                      { key: 'mySubscriptionNoPack', label: '我的订阅（未购买加油包）' },
                      { key: 'mySubscription', label: '我的订阅（套餐+加油包）' },
                      { key: 'mySubscriptionPlanUnavailable', label: '我的订阅（套餐不可用+加油包可用）' },
                      { key: 'resourcePack', label: '购买加油包' },
                    ] as const
                  ).map((it) => (
                  <div
                    key={it.key}
                    onClick={() => {
                      setTokenPlanSub(it.key)
                      setShowUsageGuide(false)
                      setShowUsageStats(false)
                      setAgreementView(null)
                      setCheckoutPlan(null)
                      setEnterpriseCheckoutPlan(null)
                      setShowEnterprisePage(false)
                      setPaymentData(null as any)
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: 14,
                      cursor: 'pointer',
                      color: tokenPlanSub === it.key ? '#2f6bff' : '#333',
                      background: tokenPlanSub === it.key ? '#f0f7ff' : 'transparent',
                      borderRight: tokenPlanSub === it.key ? '3px solid #2f6bff' : '3px solid transparent',
                      fontWeight: tokenPlanSub === it.key ? 600 : 400,
                    }}
                  >
                    {it.label}
                  </div>
                ))}
              </div>
              {/* 右侧内容 */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {showUsageGuide ? (
                  <UsageGuidePage onBack={() => setShowUsageGuide(false)} />
                ) : showUsageStats ? (
                  <UsageStatsPage onBack={() => setShowUsageStats(false)} />
                ) : tokenPlanSub === 'overview' ? (
                  <PurchasePage
                    onBuy={(plan) => { setCheckoutPlan(plan); setIsRenewMode(false) }}
                    onEnterprise={() => setShowEnterprisePage(true)}
                    onOpenUsageGuide={() => setShowUsageGuide(true)}
                  />
                ) : tokenPlanSub === 'resourcePack' ? (
                  <ResourcePackPage />
                ) : tokenPlanSub === 'mySubscriptionNoPlan' ? (
                  <MySubscriptionPage variant="noPlan" onOpenUsageStats={() => setShowUsageStats(true)} onSubscribe={(ed) => { if (ed === 'team') { setShowEnterprisePage(true); setTokenPlanSub('overview'); } else { setTokenPlanSub('overview'); } }} onRenew={handleRenew} onViewOrders={handleViewOrders} onViewModelDetail={handleViewModelDetail} />
                ) : tokenPlanSub === 'mySubscriptionNoPack' ? (
                  <MySubscriptionPage variant="noPack" onOpenUsageStats={() => setShowUsageStats(true)} onSubscribe={(ed) => { if (ed === 'team') { setShowEnterprisePage(true); setTokenPlanSub('overview'); } else { setTokenPlanSub('overview'); } }} onRenew={handleRenew} onViewOrders={handleViewOrders} onViewModelDetail={handleViewModelDetail} onGoResourcePack={handleGoResourcePack} />
                ) : tokenPlanSub === 'mySubscriptionPlanUnavailable' ? (
                  <MySubscriptionPage variant="planUnavailable" onOpenUsageStats={() => setShowUsageStats(true)} onSubscribe={(ed) => { if (ed === 'team') { setShowEnterprisePage(true); setTokenPlanSub('overview'); } else { setTokenPlanSub('overview'); } }} onRenew={handleRenew} onViewOrders={handleViewOrders} onViewModelDetail={handleViewModelDetail} onGoResourcePack={handleGoResourcePack} />
                ) : (
                  <MySubscriptionPage variant="normal" onOpenUsageStats={() => setShowUsageStats(true)} onSubscribe={(ed) => { if (ed === 'team') { setShowEnterprisePage(true); setTokenPlanSub('overview'); } else { setTokenPlanSub('overview'); } }} onRenew={handleRenew} onViewOrders={handleViewOrders} onViewModelDetail={handleViewModelDetail} />
                )}
              </div>
            </div>
          ) : consoleSubPage === 'tokenPlan' && checkoutPlan ? (
            <PurchaseCheckout
              plan={checkoutPlan}
              isRenew={isRenewMode}
              renewEndDate="2026-09-24"
              onBack={() => { setCheckoutPlan(null); setIsRenewMode(false) }}
              onPay={(data: any) =>
                setPaymentData({
                  plan: checkoutPlan,
                  duration: ('durationOption' in data ? (data as any).durationOption : data.duration) as any,
                  validityUnit: (checkoutPlan as any).validityUnit,
                  total: data.total,
                  orderNo: data.orderNo,
                })
              }
              onOpenAgreement={setAgreementView}
            />
          ) : consoleSubPage === 'tokenFactory' ? (
            <TokenFactoryPage
              allowedMenus={allowedFactoryMenus}
              initialDetailId={factoryDetailId}
              onGoRecharge={
                showConsoleBilling
                  ? () => {
                      setConsoleSubPage('billing')
                      setBillingSub(allowedBillingSubs && !allowedBillingSubs.includes('accountOverview') ? allowedBillingSubs[0] : 'accountOverview')
                    }
                  : undefined
              }
            />
          ) : consoleSubPage === 'billing' ? (
            <BillingPage
              subPage={billingSub}
              onSubChange={setBillingSub}
              allowedSubs={allowedBillingSubs}
            />
          ) : consoleSubPage === 'promo' ? (
            <ConsolePromo />
          ) : (
            <div style={{ padding: 80, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 16 }}>该页面建设中...</div>
            </div>
          )}
        </Content>
      )}

      {/* 官方网站视图：完整顶部导航 + 各页面内容；评审模式只隐藏未声明的导航项 */}
      {viewMode === 'website' && (
        <Content style={{ overflow: 'auto', background: '#fff' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 32px',
              height: 60,
              background: '#fff',
              borderBottom: '1px solid #eef0f4',
            }}
          >
            <Space size={32} style={{ fontSize: 15 }}>
              <Space size={10} style={{ fontWeight: 700, fontSize: 16 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: '#1a1a1a',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  IBI
                </span>
                <span style={{ color: '#5a6474', fontWeight: 400, fontSize: 12 }}>国联股份</span>
                <span style={{ fontWeight: 600 }}>智算多多</span>
              </Space>
              {visibleWebNav.map((nav) => {
                const isActive = websitePage === nav.key
                if (nav.key === 'promo') {
                  return (
                    <span
                      key={nav.key}
                      onClick={() => setWebsitePage('promo')}
                      style={{
                        color: isActive ? '#1a1a1a' : '#5a6474',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MoneyCollectOutlined style={{ color: '#fa8c16' }} />
                      推广合伙人
                      <RequirementDot
                        title="推广合伙人 · 需求说明"
                        sections={[
                          {
                            label: '需求内容',
                            items: [
                              '1.页面展示如图；',
                              '2.部分信息根据分销活动动态展示，具体见页面需求提示。',
                            ],
                          },
                        ]}
                      />
                    </span>
                  )
                }
                return (
                  <span
                    key={nav.key}
                    onClick={() => setWebsitePage(nav.key)}
                    style={{
                      color: isActive ? '#1a1a1a' : '#5a6474',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {nav.label}
                  </span>
                )
              })}
            </Space>
            <Space size={16}>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>控制台</span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#f5f7fa',
                  color: '#5a6474',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                v
              </span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#f5f7fa',
                  color: '#5a6474',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                v
              </span>
            </Space>
          </div>
          {websitePage === 'tokenPlan' && (
            <OfficialWebPage
              onSubscribe={() => {
                /** 未登录先过登录页，登录成功后落到控制台 · Token Plan 概览 */
                setLoginReturn('tokenPlanOverview')
                setLoginMode(true)
              }}
              onBuyResourcePack={() => {
                /** 未登录先过登录页，登录成功后落到控制台 · 资源包管理 */
                setLoginReturn('resourcePack')
                setLoginMode(true)
              }}
            />
          )}
          {websitePage === 'promo' && (
            <PromoLandingPage
              onGoConsole={() => {
                /** 未登录先过登录页，登录成功后由 onSuccess 落到控制台 · 推广合伙人；已登录直接进 */
                if (!getPromoSession()) {
                  setLoginMode(true)
                  return
                }
                setViewMode('console')
                setConsoleSubPage('promo')
                setCheckoutPlan(null)
                setPaymentData(null)
              }}
            />
          )}
          {websitePage !== 'tokenPlan' && websitePage !== 'promo' && (
            <div style={{ padding: 120, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 16 }}>该页面建设中...</div>
            </div>
          )}
          {websitePage !== 'tokenPlan' && <SiteFooter />}
        </Content>
      )}
    </Layout>
  )
}
