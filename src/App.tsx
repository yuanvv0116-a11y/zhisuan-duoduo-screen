import { useEffect, useMemo, useState } from 'react'
import { Layout, Menu, Typography, Space, Avatar, Dropdown, Alert, Segmented } from 'antd'
import { ApiOutlined, AppstoreOutlined, BarChartOutlined, DownOutlined, UserOutlined, TeamOutlined, WalletOutlined, MoreOutlined, DesktopOutlined, RocketOutlined, GlobalOutlined } from '@ant-design/icons'
import UserList from './pages/UserList'
import UserTag from './pages/UserTag'
import AccountList from './pages/AccountList'
import ChannelManage from './pages/ChannelManage'
import ChannelModelManage from './pages/ChannelModelManage'
import ChannelBill from './pages/ChannelBill'
import ChannelFeeDetail from './pages/ChannelFeeDetail'
import ChannelStatAnalysis from './pages/ChannelStatAnalysis'
import ModelUsageStat from './pages/ModelUsageStat'
import ModelUsageDetail from './pages/ModelUsageDetail'
import ModelList from './pages/ModelList'
import ResourcePack from './pages/ResourcePack'
import TokenPlanList from './pages/TokenPlanList'
import RechargeTask from './pages/RechargeTask'
import OtherRequirements from './pages/OtherRequirements'
import PurchasePage from './pages/PurchasePage'
import OfficialWebPage from './pages/OfficialWebPage'
import ReviewBar from './components/ReviewBar'
import { RELEASES, LATEST_RELEASE } from './releases'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export type RouteKey =
  | 'userList'
  | 'userTag'
  | 'accountList'
  | 'rechargeTask'
  | 'channels'
  | 'channelModels'
  | 'channelBill'
  | 'channelFeeDetail'
  | 'channelStat'
  | 'modelUsageStat'
  | 'modelUsageDetail'
  | 'models'
  | 'resourcePack'
  | 'tokenPlan'
  | 'otherRequirements'

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
      { key: 'channelBill', label: '渠道对账单' },
      { key: 'channelFeeDetail', label: '渠道费用明细' },
    ],
  },
  {
    key: 'statGroup',
    label: '统计与分析',
    children: [
      { key: 'channelStat', label: '渠道统计分析' },
      { key: 'modelUsageStat', label: '模型使用统计分析' },
      { key: 'modelUsageDetail', label: '模型使用明细' },
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

/** 退出评审模式：去掉 ?review=xxx 并刷新 */
function exitReviewMode() {
  const url = new URL(window.location.href)
  url.searchParams.delete('review')
  window.location.href = url.toString()
}

export default function App() {
  const [active, setActive] = useState<RouteKey>('channels')
  const [viewMode, setViewMode] = useState<'admin' | 'console' | 'website'>('admin')
  const [consoleSubPage, setConsoleSubPage] = useState<string>('tokenPlan')

  /** 评审模式（从 URL 读取，初始化一次即可） */
  const [reviewVersion, setReviewVersion] = useState<string | null>(
    () => getReviewVersionFromUrl()
  )

  /** 保证 active 落在允许范围内（评审模式打开了不在允许范围内的路由时，切到第一个允许项） */
  useEffect(() => {
    if (!reviewVersion) return
    const release = RELEASES[reviewVersion]
    if (!release || release.routeKeys.includes('*')) return

    const allowed = new Set<string>(release.routeKeys as string[])
    if (allowed.has(active)) return

    const firstAllowed = (release.routeKeys as string[])[0]
    if (firstAllowed) setActive(firstAllowed as RouteKey)
  }, [reviewVersion, active])

  /** 根据评审模式计算允许的路由 / 过滤后的菜单 */
  const { menuItems, shownCount, totalCount, reviewRelease, invalidReview } = useMemo(() => {
    const total = countLeaves(FULL_MENU)

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
        return <ChannelModelManage />
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
      case 'resourcePack':
        return <ResourcePack />
      case 'tokenPlan':
        return <TokenPlanList />
      case 'otherRequirements':
        return <OtherRequirements />
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
        }}
      >
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as 'admin' | 'console' | 'website')}
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

          {invalidReview && (
            <Alert
              type="warning"
              showIcon
              style={{ borderRadius: 0, border: 0, borderBottom: '1px solid #ffe58f' }}
              message={`评审版本 ${reviewVersion} 不存在，已显示全量菜单。可修改 URL 为以下任一版本：${Object.keys(RELEASES).join(' / ')}`}
              action={
                <Space>
                  <a
                    onClick={() => {
                      const url = new URL(window.location.href)
                      url.searchParams.set('review', LATEST_RELEASE)
                      window.location.href = url.toString()
                    }}
                  >
                    切到最新版本 {LATEST_RELEASE}
                  </a>
                  <a onClick={exitReviewMode}>退出评审</a>
                </Space>
              }
            />
          )}

          {!invalidReview && reviewRelease && (
            <ReviewBar
              version={reviewVersion!}
              release={reviewRelease}
              shownCount={shownCount}
              totalCount={totalCount}
              onExit={exitReviewMode}
            />
          )}

          <Layout>
            <Sider theme="light" width={200} style={{ borderRight: '1px solid #eef0f4' }}>
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[active]}
                defaultOpenKeys={['userTeamGroup', 'accountGroup', 'channelGroup', 'modelGroup', 'statGroup']}
                style={{ borderRight: 0, paddingTop: 8 }}
                onClick={({ key }) => setActive(key as RouteKey)}
                items={menuItems}
              />
            </Sider>
            <Content style={{ padding: 16, overflow: 'auto', background: '#f0f2f5' }}>
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
              <span
                style={{
                  color: consoleSubPage === 'tokenFactory' ? '#1a1a1a' : '#5a6474',
                  fontWeight: consoleSubPage === 'tokenFactory' ? 600 : 400,
                  cursor: 'pointer',
                }}
                onClick={() => setConsoleSubPage('tokenFactory')}
              >
                Token工厂
              </span>
              <span
                style={{
                  color: consoleSubPage === 'appPlaza' ? '#1a1a1a' : '#5a6474',
                  fontWeight: consoleSubPage === 'appPlaza' ? 600 : 400,
                  cursor: 'pointer',
                }}
                onClick={() => setConsoleSubPage('appPlaza')}
              >
                应用广场
              </span>
              <span
                style={{
                  color: consoleSubPage === 'opc' ? '#1a1a1a' : '#5a6474',
                  fontWeight: consoleSubPage === 'opc' ? 600 : 400,
                  cursor: 'pointer',
                }}
                onClick={() => setConsoleSubPage('opc')}
              >
                opc社区
              </span>
              <span
                style={{
                  color: consoleSubPage === 'tokenPlan' ? '#2f6bff' : '#5a6474',
                  fontWeight: consoleSubPage === 'tokenPlan' ? 600 : 400,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={() => setConsoleSubPage('tokenPlan')}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: 'linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  惠
                </span>
                Token Plan
              </span>
            </Space>
            <Space size={20}>
              <span style={{ color: '#5a6474', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                费用
                <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
              </span>
              <span style={{ color: '#5a6474', cursor: 'pointer' }}>文档</span>
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
          {consoleSubPage === 'tokenPlan' ? (
            <PurchasePage />
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
          <OfficialWebPage />
        </Content>
      )}
    </Layout>
  )
}
