import { Typography, Tag, Button, Space } from 'antd'
import { EyeOutlined, CloseOutlined } from '@ant-design/icons'
import type { ReleaseItem } from '../releases'

const { Text } = Typography

interface ReviewBarProps {
  version: string
  release: ReleaseItem
  /** 显示的菜单数量 / 总菜单数量，用于提示评审范围 */
  shownCount?: number
  totalCount?: number
  onExit: () => void
}

/**
 * 评审模式顶部提示条
 * - 蓝色固定在 Header 下方、内容区上方
 * - 展示：当前版本号 / 标题 / 变更说明 / 显示范围
 * - 提供「退出评审模式」按钮（去掉 ?review=xxx 参数）
 */
export default function ReviewBar({
  version,
  release,
  shownCount,
  totalCount,
  onExit,
}: ReviewBarProps) {
  return (
    <div
      style={{
        background: '#eaf2ff',
        borderBottom: '1px solid #c8dcff',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Tag color="#2f6bff" icon={<EyeOutlined />} style={{ margin: 0 }}>
        评审模式
      </Tag>

      <Space size={8} wrap>
        <Text strong style={{ color: '#1f47c9' }}>
          当前版本 {version}
        </Text>
        <Text type="secondary">·</Text>
        <Text style={{ color: '#333' }}>{release.title}</Text>
        {release.note && (
          <>
            <Text type="secondary">·</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              变更说明：{release.note}
            </Text>
          </>
        )}
        {typeof shownCount === 'number' && typeof totalCount === 'number' && (
          <>
            <Text type="secondary">·</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              本次显示 {shownCount} / {totalCount} 个入口
            </Text>
          </>
        )}
      </Space>

      <div style={{ flex: 1 }} />

      <Button
        size="small"
        icon={<CloseOutlined />}
        onClick={onExit}
      >
        退出评审模式
      </Button>
    </div>
  )
}
