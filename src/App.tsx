import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout, Menu, Typography, Space, Avatar, Dropdown, Segmented } from 'antd'
import { ApiOutlined, AppstoreOutlined, BarChartOutlined, DownOutlined, UserOutlined, TeamOutlined, WalletOutlined, MoreOutlined, DesktopOutlined, RocketOutlined, GlobalOutlined, UnorderedListOutlined } from '@ant-design/icons'
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
import OtherRequirements from './pages/OtherRequirements'
import PlanBill from './pages/PlanBill'
import UserConsumeBill from './pages/UserConsumeBill'
import PlanStats from './pages/PlanStats'
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
import OfficialWebPage from './pages/OfficialWebPage'
import TokenFactoryPage, { type FactoryMenu } from './pages/TokenFactoryPage'
import VersionChangelog from './pages/VersionChangelog'
import { RELEASES, parseConsoleScope } from './releases'
import { getActiveScope, getScopeFromUrl, getScopeRouteKeys, isInScope, SCOPES } from './scope'
import type { TokenPlan } from './types'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export type RouteKey =
  | 'userList'
  | 'userTag'
  | 'accountList'
  | 'rechargeTask'
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
  const [active, setActive] = useState<RouteKey>('channels')
  /** 后台内容区是各页面共用的滚动容器，切页时需要它回到顶部，否则新页面会停在上一页的滚动位置 */
  const contentRef = useRef<HTMLElement>(null)
  /** 从「查看性能」弹窗点「查看全部」带过来的渠道与该渠道模型名称，用于明细页自动搜索 */
  const [perfDetailFilter, setPerfDetailFilter] = useState<PerfDetailFilter | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'admin' | 'console' | 'website'>('admin')
  const [webNav, setWebNav] = useState<'tokenPlan'>('tokenPlan')
  /** 控制台默认落在 Token工厂，顶部导航点击「控制台」时也回到该子页 */
  const [consoleSubPage, setConsoleSubPage] = useState<string>('tokenFactory')
  const [tokenPlanSub, setTokenPlanSub] = useState<
    'overview' | 'mySubscription' | 'resourcePack' | 'mySubscriptionNoPlan' | 'mySubscriptionNoPack'
  >('overview')
  const [billingSub, setBillingSub] = useState<BillingSubPage>('orderDetail')
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
  const defaultConsoleSub = showConsoleFactory
    ? 'tokenFactory'
    : showConsoleBilling
      ? 'billing'
      : 'tokenFactory'
  const defaultBillingSub: BillingSubPage = allowedBillingSubs?.[0] ?? 'orderDetail'

  /** 评审模式：控制台子页回落到本次范围内的入口 */
  useEffect(() => {
    if (!consoleScope) return
    if (!showConsoleFactory && !showConsoleBilling) return
    if (consoleSubPage === 'tokenFactory' && !showConsoleFactory) setConsoleSubPage('billing')
    if (consoleSubPage === 'billing' && !showConsoleBilling) setConsoleSubPage('tokenFactory')
    if (['appPlaza', 'opc', 'tokenPlan'].includes(consoleSubPage)) setConsoleSubPage(defaultConsoleSub)
  }, [consoleScope, consoleSubPage, showConsoleFactory, showConsoleBilling, defaultConsoleSub])

  /** 评审模式：费用二级菜单回落到本次范围内的第一项 */
  useEffect(() => {
    if (!allowedBillingSubs || allowedBillingSubs.length === 0) return
    if (allowedBillingSubs.includes(billingSub)) return
    setBillingSub(allowedBillingSubs[0])
  }, [allowedBillingSubs, billingSub])

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
            /** 点击「控制台」默认选中 Token工厂，并退出可能残留的套餐结算 / 支付流程 */
            if (next === 'console') {
              setConsoleSubPage(defaultConsoleSub)
              setCheckoutPlan(null)
              setPaymentData(null)
            }
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
        <a
          onClick={() => {
            setViewMode('admin')
            setActive('changelog')
          }}
          style={{
            position: 'absolute',
            right: 24,
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
              <span>官方网站</span>
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
                defaultOpenKeys={['userTeamGroup', 'accountGroup', 'channelGroup', 'modelGroup', 'statGroup', 'billGroup']}
                style={{ borderRight: 0, paddingTop: 8 }}
                onClick={({ key }) => {
                  setPerfDetailFilter(undefined)
                  setActive(key as RouteKey)
                }}
                items={menuItems}
              />
            </Sider>
            <Content ref={contentRef} style={{ padding: 16, overflow: 'auto', background: '#f0f2f5' }}>
              {renderPage()}
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
                  onClick={() => { setConsoleSubPage('tokenFactory'); setCheckoutPlan(null); setPaymentData(null) }}
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
              {!consoleScope && (
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
          ) : consoleSubPage === 'tokenPlan' && showEnterprisePage && !enterpriseCheckoutPlan ? (
            <EnterprisePurchasePage
              onBack={() => setShowEnterprisePage(false)}
              onBuy={(plan) => setEnterpriseCheckoutPlan(plan)}
            />
          ) : consoleSubPage === 'tokenPlan' && showEnterprisePage && enterpriseCheckoutPlan ? (
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
                      { key: 'mySubscriptionNoPack', label: '我的订阅（未购买资源包）' },
                      { key: 'mySubscription', label: '我的订阅' },
                      { key: 'resourcePack', label: '资源包管理' },
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
                  <MySubscriptionPage variant="noPlan" onOpenUsageStats={() => setShowUsageStats(true)} onSubscribe={(ed) => { if (ed === 'team') { setShowEnterprisePage(true); setTokenPlanSub('overview'); } else { setTokenPlanSub('overview'); } }} onRenew={handleRenew} />
                ) : tokenPlanSub === 'mySubscriptionNoPack' ? (
                  <MySubscriptionPage variant="noPack" onOpenUsageStats={() => setShowUsageStats(true)} onSubscribe={(ed) => { if (ed === 'team') { setShowEnterprisePage(true); setTokenPlanSub('overview'); } else { setTokenPlanSub('overview'); } }} onRenew={handleRenew} />
                ) : (
                  <MySubscriptionPage variant="normal" onOpenUsageStats={() => setShowUsageStats(true)} onSubscribe={(ed) => { if (ed === 'team') { setShowEnterprisePage(true); setTokenPlanSub('overview'); } else { setTokenPlanSub('overview'); } }} onRenew={handleRenew} />
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
            <TokenFactoryPage allowedMenus={allowedFactoryMenus} />
          ) : consoleSubPage === 'billing' ? (
            <BillingPage
              subPage={billingSub}
              onSubChange={setBillingSub}
              allowedSubs={allowedBillingSubs}
            />
          ) : (
            <div style={{ padding: 80, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 16 }}>该页面建设中...</div>
            </div>
          )}
        </Content>
      )}

      {/* 官方网站视图：独立顶部导航 + OfficialWebPage */}
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
              <span style={{ color: '#1a1a1a', fontWeight: 600, cursor: 'pointer' }}>首页</span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>产品服务</span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>模型广场</span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>Token工厂</span>
              <span
                style={{
                  color: webNav === 'tokenPlan' ? '#1a1a1a' : '#5a6474',
                  fontWeight: webNav === 'tokenPlan' ? 600 : 400,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setViewMode('website')
                  setWebNav('tokenPlan')
                }}
              >
                Token Plan
              </span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>算力市场</span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>算力商情</span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>行业资讯</span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>解决方案</span>
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
          {webNav === 'tokenPlan' && (
            <OfficialWebPage
              onNavigateTokenPlan={() => {
                setViewMode('console')
                setConsoleSubPage('tokenPlan')
                setTokenPlanSub('overview')
                setCheckoutPlan(null)
                setPaymentData(null)
                setShowEnterprisePage(false)
                setEnterpriseCheckoutPlan(null)
                setShowUsageGuide(false)
                setShowUsageStats(false)
                setAgreementView(null)
              }}
            />
          )}
        </Content>
      )}
    </Layout>
  )
}
