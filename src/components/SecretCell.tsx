import { useState } from 'react'
import { Space, Button, Tooltip, Typography, message } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons'

const { Text } = Typography

/** 统一脱敏规则：展示前 4 位 + **** + 后 4 位（长度不足 4 位时无首尾可展示，整体打码） */
export const maskSecret = (value: string) => {
  if (value.length <= 4) return '****'
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

/** 人名统一脱敏：保留姓氏，其余打星（王晓军 → 王**，张明 → 张*）。仅处理 2-4 字纯中文姓名，账号名/手机号/空值等直通 */
export const maskName = (value?: string): string => {
  if (!value) return ''
  if (!/^[\u4e00-\u9fa5]{2,4}$/.test(value)) return value
  return `${value.slice(0, 1)}${'*'.repeat(value.length - 1)}`
}

/** 自由文本中内嵌的人名脱敏：将「某某某介绍」等 2-4 字中文连名整体按 maskName 规则替换 */
export const maskNameInText = (text?: string): string => {
  if (!text) return ''
  return text.replace(/[\u4e00-\u9fa5]{2,4}(?=介绍)/g, (m) => maskName(m))
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
          ellipsis={revealed}
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
