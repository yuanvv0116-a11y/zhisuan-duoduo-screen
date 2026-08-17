import type { ReactNode } from 'react'
import { Breadcrumb, Card, Button, Space, Typography } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

const { Text } = Typography

interface PageShellProps {
  breadcrumb: string[]
  topExtra?: ReactNode
  searchFields: ReactNode
  onSearch: () => void
  onReset: () => void
  listTitle: string
  total: number
  totalUnit?: string
  hideTotal?: boolean
  addText?: string
  onAdd?: () => void
  searchExtra?: ReactNode
  titleExtra?: ReactNode
  addExtra?: ReactNode
  children: ReactNode
}

export default function PageShell({
  breadcrumb,
  topExtra,
  searchFields,
  onSearch,
  onReset,
  listTitle,
  total,
  totalUnit = '条记录',
  hideTotal,
  addText,
  onAdd,
  searchExtra,
  titleExtra,
  addExtra,
  children,
}: PageShellProps) {
  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={breadcrumb.map((title) => ({ title }))}
      />

      {topExtra}

      <Card
        variant="borderless"
        styles={{ body: { padding: 16 } }}
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {searchFields}
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
              搜索
            </Button>
            <Button onClick={onReset}>重置</Button>
          </Space>
          {searchExtra}
        </div>
      </Card>

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Space size={8}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{listTitle}</span>
            {!hideTotal && (
              <Text type="secondary">
                共 {total} {totalUnit}
              </Text>
            )}
            {titleExtra}
          </Space>
          {onAdd && (
            <Space size={8}>
              <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
                {addText ?? '新增'}
              </Button>
              {addExtra}
            </Space>
          )}
        </div>
        {children}
      </Card>
    </div>
  )
}
