import { useState } from 'react'
import { Layout, Menu, Typography, Space, Avatar, Dropdown } from 'antd'
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
import OtherRequirements from './pages/OtherRequirements'

const { Sider, Content, Header } = Layout
const { Text } = Typography

type RouteKey =
  | 'userList'
  | 'userTag'
  | 'accountList'
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

export default function App() {
  const [active, setActive] = useState<RouteKey>('channels')

  const renderPage = () => {
    switch (active) {
      case 'userList':
        return <UserList onNavigateToTagPage={() => setActive('userTag')} />
      case 'userTag':
        return <UserTag />
      case 'accountList':
        return <AccountList />
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
      <Layout>
        <Sider theme="light" width={200} style={{ borderRight: '1px solid #eef0f4' }}>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[active]}
            defaultOpenKeys={['userTeamGroup', 'accountGroup', 'channelGroup', 'modelGroup', 'statGroup']}
            style={{ borderRight: 0, paddingTop: 8 }}
            onClick={({ key }) => setActive(key as RouteKey)}
            items={[
              {
                key: 'userTeamGroup',
                icon: <TeamOutlined />,
                label: '用户与团队管理',
                children: [
                  { key: 'userList', label: '用户列表' },
                  { key: 'userTag', label: '用户标签' },
                ],
              },
              {
                key: 'accountGroup',
                icon: <WalletOutlined />,
                label: '账户管理',
                children: [{ key: 'accountList', label: '账户列表' }],
              },
              {
                key: 'modelGroup',
                icon: <AppstoreOutlined />,
                label: '模型管理',
                children: [
                  { key: 'models', label: '模型列表' },
                  { key: 'resourcePack', label: '资源包管理' },
                ],
              },
              {
                key: 'channelGroup',
                icon: <ApiOutlined />,
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
                icon: <BarChartOutlined />,
                label: '统计与分析',
                children: [
                  { key: 'channelStat', label: '渠道统计分析' },
                  { key: 'modelUsageStat', label: '模型使用统计分析' },
                  { key: 'modelUsageDetail', label: '模型使用明细' },
                ],
              },
              {
                key: 'otherRequirements',
                icon: <MoreOutlined />,
                label: '其他需求',
              },
            ]}
          />
        </Sider>
        <Content style={{ padding: 16, overflow: 'auto', background: '#f0f2f5' }}>
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  )
}
