import { useState } from 'react'
import { Space, Button, Tooltip, Typography, message } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons'

const { Text } = Typography

export const maskSecret = (value: string) => {
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

interface SecretCellProps {
  value: string
  maxWidth?: number
}

export default function SecretCell({ value, maxWidth = 200 }: SecretCellProps) {
  const [revealed, setRevealed] = useState(false)

  if (!value) return <Text type="secondary">—</Text>

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      message.success('已复制')
    } catch {
      message.error('复制失败')
    }
  }

  return (
    <Space size={4} style={{ width: '100%' }}>
      <Tooltip title={revealed ? value : ''}>
        <Text
          ellipsis
          style={{ maxWidth, display: 'inline-block', verticalAlign: 'middle' }}
        >
          {revealed ? value : maskSecret(value)}
        </Text>
      </Tooltip>
      <Tooltip title={revealed ? '隐藏' : '显示'}>
        <Button
          type="text"
          size="small"
          icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setRevealed((v) => !v)}
        />
      </Tooltip>
      <Tooltip title="复制">
        <Button type="text" size="small" icon={<CopyOutlined />} onClick={copy} />
      </Tooltip>
    </Space>
  )
}
