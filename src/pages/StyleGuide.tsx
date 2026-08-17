import {
  Breadcrumb,
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Switch,
  Table,
  Input,
  Select,
  Divider,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import SecretCell from '../components/SecretCell'

const { Title, Text, Paragraph } = Typography

const TOKENS = [
  { name: '主色 / 品牌蓝', value: '#2f6bff', usage: '按钮、选中态、链接、主操作' },
  { name: '页面背景', value: '#f0f2f5', usage: '内容区底色' },
  { name: '卡片 / 头部', value: '#ffffff', usage: '卡片、Header、Sider' },
  { name: '分割线', value: '#eef0f4', usage: '边框、分隔' },
  { name: '正文文字', value: '#333333', usage: '主要文字' },
]

function Block({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
      <Space direction="vertical" size={4} style={{ marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
        {desc && <Text type="secondary">{desc}</Text>}
      </Space>
      <Divider style={{ margin: '8px 0 16px' }} />
      {children}
    </Card>
  )
}

export default function StyleGuide() {
  return (
    <div>
      <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: '设计规范' }]} />

      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginTop: 0 }}>
          智算多多 · 设计规范
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          本页是活文档，展示统一的配色、按钮、状态、表格与敏感字段标准样式。新页面请遵循这些样式与
          <Text code>.trae/rules/project_rules.md</Text> 中的规范。
        </Paragraph>
      </Card>

      <Block title="配色 Token" desc="唯一来源，禁止在页面里散写主色十六进制">
        <Space wrap size={16}>
          {TOKENS.map((t) => (
            <Card key={t.name} size="small" style={{ width: 200 }}>
              <div
                style={{
                  height: 40,
                  borderRadius: 8,
                  background: t.value,
                  border: '1px solid #eef0f4',
                  marginBottom: 8,
                }}
              />
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t.value}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t.usage}
                </Text>
              </div>
            </Card>
          ))}
        </Space>
      </Block>

      <Block title="按钮" desc="主操作用 primary，次操作用默认，危险操作用 danger link">
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />}>
            新增
          </Button>
          <Button type="primary" icon={<SearchOutlined />}>
            搜索
          </Button>
          <Button>重置</Button>
          <Button type="link" icon={<EditOutlined />}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      </Block>

      <Block title="搜索项" desc="统一「标签：+ 控件」形式，一行排列，点击搜索才过滤">
        <Space wrap size={16}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>渠道名称：</span>
            <Input placeholder="请输入" style={{ width: 200 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>状态：</span>
            <Select
              style={{ width: 140 }}
              defaultValue="all"
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'enabled', label: '启用' },
              ]}
            />
          </div>
          <Button type="primary" icon={<SearchOutlined />}>
            搜索
          </Button>
          <Button>重置</Button>
        </Space>
      </Block>

      <Block title="状态与标签">
        <Space wrap size={24}>
          <Space>
            <Switch defaultChecked size="small" checkedChildren="启用" unCheckedChildren="停用" />
            <Text type="secondary">列表内状态开关</Text>
          </Space>
          <Space>
            <Tag color="success">启用</Tag>
            <Tag color="default">停用</Tag>
            <Tag color="blue">标签</Tag>
          </Space>
        </Space>
      </Block>

      <Block title="敏感字段" desc="默认脱敏，行内提供显示/隐藏与复制">
        <SecretCell value="sk-abcdef1234567890" />
      </Block>

      <Block title="表格" desc="空值显示 —，超长 ellipsis+Tooltip，分页「共 N 条记录」">
        <Table
          rowKey="k"
          pagination={{ pageSize: 3, showTotal: (t) => `共 ${t} 条记录` }}
          dataSource={[
            { k: '1', name: '示例渠道 A', status: 'enabled', operator: '王敏', remark: '' },
            { k: '2', name: '示例渠道 B', status: 'disabled', operator: '李强', remark: '月结30天' },
          ]}
          columns={[
            { title: '名称', dataIndex: 'name' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (v: string) =>
                v === 'enabled' ? <Tag color="success">启用</Tag> : <Tag color="default">停用</Tag>,
            },
            { title: '操作人', dataIndex: 'operator' },
            {
              title: '备注',
              dataIndex: 'remark',
              render: (v: string) => v || <Text type="secondary">—</Text>,
            },
          ]}
        />
      </Block>
    </div>
  )
}
