import { useEffect, useMemo, useState } from 'react'
import { Layout, Menu, Typography, Space, Avatar, Dropdown, Alert } from 'antd'
import { ApiOutlined, AppstoreOutlined, BarChartOutlined, DownOutlined, UserOutlined, TeamOutlined, WalletOutlined, MoreOutlined } from '@ant-design/icons'
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
import RechargeTask from './pages/RechargeTask'
import OtherRequirements from './pages/OtherRequirements'
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
      case 'otherRequirements':
        return <OtherRequirements />
      default:
        return <ChannelManage />
    }
  }

  return (
    <Layout style={{ height: '100vh' }}>
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

      {/* 评审模式：版本不存在时的警告条 */}
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

      {/* 评审模式：正常版本时的蓝色提示条 */}
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
    </Layout>
  )
}
