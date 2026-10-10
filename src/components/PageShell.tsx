import type { ReactNode } from 'react'
import { Breadcrumb, Card, Button, Space, Typography } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

const { Text } = Typography

interface PageShellProps {
  breadcrumb: string[]
  /** 面包屑行前置内容（如返回链接） */
  breadcrumbPre?: ReactNode
  /** 面包屑行尾追加的内容（如需求红点） */
  breadcrumbExtra?: ReactNode
  topExtra?: ReactNode
  /** 不传则不渲染顶部搜索卡（搜索区下沉到页面内部，如 Tabs 各页签内） */
  searchFields?: ReactNode
  onSearch?: () => void
  onReset?: () => void
  listTitle: string
  total: number
  totalUnit?: string
  hideTotal?: boolean
  addText?: string
  onAdd?: () => void
  searchExtra?: ReactNode
  titleExtra?: ReactNode
  addExtra?: ReactNode
  /** 列表卡右上角自定义操作区（无 onAdd 时也能渲染） */
  listActions?: ReactNode
  children: ReactNode
}

export default function PageShell({
  breadcrumb,
  breadcrumbPre,
  breadcrumbExtra,
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
  listActions,
  children,
}: PageShellProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {breadcrumbPre}
        <Breadcrumb items={breadcrumb.map((title) => ({ title }))} />
        {breadcrumbExtra}
      </div>

      {topExtra}

      {searchFields && (
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
      )}

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
          {(onAdd || listActions) && (
            <Space size={8}>
              {onAdd && (
                <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
                  {addText ?? '新增'}
                </Button>
              )}
              {addExtra}
              {listActions}
            </Space>
          )}
        </div>
        {children}
      </Card>
    </div>
  )
}
