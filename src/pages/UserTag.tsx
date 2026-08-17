import { useMemo, useState } from 'react'
import { Card, Input, Button, Table, Tag, Typography, Modal, Form, Segmented, Space, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography

const TAG_COLORS = ['#2f6bff', '#fa541c', '#faad14', '#52c41a', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

interface TagRow {
  key: string
  name: string
  description: string
  color: string
  createdAt: string
  creator: string
  userCount: number
}

const INIT_ROWS: TagRow[] = [
  { key: '1', name: '内部员工', description: '内部员工', color: '#2f6bff', createdAt: '2026-11-11 11:11:11', creator: '张三', userCount: 12 },
]

interface FormValues {
  name: string
  color: string
  description?: string
}

export default function UserTag() {
  const [rows, setRows] = useState<TagRow[]>(INIT_ROWS)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [openCreate, setOpenCreate] = useState(false)
  const [editing, setEditing] = useState<TagRow | null>(null)
  const [deleting, setDeleting] = useState<TagRow | null>(null)
  const [form] = Form.useForm<FormValues>()

  const filtered = useMemo(() => {
    const list = [...rows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    if (!searchKeyword.trim()) return list
    const k = searchKeyword.trim().toLowerCase()
    return list.filter((r) => r.name.toLowerCase().includes(k))
  }, [rows, searchKeyword])

  const openCreateModal = () => {
    setEditing(null)
    setOpenCreate(true)
  }

  const openEditModal = (r: TagRow) => {
    setEditing(r)
    setOpenCreate(true)
  }

  const handleAfterOpenChange = (open: boolean) => {
    if (!open) return
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        color: editing.color,
        description: editing.description,
      })
    } else {
      form.setFieldsValue({ color: TAG_COLORS[0], description: undefined })
    }
  }

  const handleSubmit = async () => {
    try {
      const v = await form.validateFields()
      const name = v.name.trim()
      const duplicate = rows.find((r) => r.name === name && r.key !== editing?.key)
      if (duplicate) {
        message.error('该名称已存在')
        return
      }
      if (editing) {
        setRows((list) =>
          list.map((r) =>
            r.key === editing.key
              ? { ...r, name, color: v.color, description: v.description ?? '' }
              : r,
          ),
        )
        message.success('保存成功')
      } else {
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, '0')
        const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
        setRows((list) => [
          {
            key: `${Date.now()}`,
            name,
            color: v.color,
            description: v.description ?? '',
            createdAt,
            creator: 'admin2',
            userCount: 0,
          },
          ...list,
        ])
        message.success('保存成功')
      }
      setOpenCreate(false)
      form.resetFields()
    } catch {
      /* noop */
    }
  }

  const handleDelete = () => {
    if (!deleting) return
    setRows((list) => list.filter((r) => r.key !== deleting.key))
    message.success('删除成功')
    setDeleting(null)
  }

  const columns: ColumnsType<TagRow> = [
    {
      title: '标签',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
      width: 200,
      render: (v: string, r: TagRow) => (
        <Tag color={r.color} style={{ margin: 0, padding: '2px 10px', fontSize: 13 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      align: 'center',
      width: 260,
      ellipsis: true,
      render: (v: string) => (v || <Text type="secondary">—</Text>),
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', align: 'center', width: 180 },
    { title: '创建人', dataIndex: 'creator', key: 'creator', align: 'center', width: 120 },
    {
      title: '操作',
      key: 'op',
      align: 'center',
      width: 160,
      fixed: 'right',
      render: (_: unknown, r: TagRow) => (
        <Space>
          <a onClick={() => openEditModal(r)}><EditOutlined /> 编辑</a>
          <a style={{ color: '#ff4d4f' }} onClick={() => setDeleting(r)}><DeleteOutlined /> 删除</a>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Text>标签：</Text>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="请输入标签名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => setSearchKeyword(keyword)}
            style={{ width: 280 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => setSearchKeyword(keyword)}>搜索</Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setKeyword('')
              setSearchKeyword('')
            }}
          >
            重置
          </Button>
        </div>
      </Card>

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <Text strong style={{ fontSize: 16 }}>
              标签列表
              <RequirementDot
                title="标签管理需求"
                sections={[
                  {
                    label: '',
                    items: [
                      '标签列表根据创建时间倒序展示；支持根据标签名称模糊搜索',
                      '新建标签：标签名称限制8字，不限制输入类型。标签名称不可重复，重复提示"该名称已存在"',
                      '描述选填，限制20字，不限制输入类型。保存后验证以上规则，保存成功提示"保存成功"并刷新列表',
                      '删除时，确认后同步删除所有已设置该标签的用户下的这个标签',
                    ],
                  },
                ]}
              />
            </Text>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建标签
          </Button>
        </div>
        <Table<TagRow>
          rowKey="key"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{ showTotal: (t) => `共 ${t} 条记录` }}
        />
      </Card>

      <Modal
        title={editing ? '编辑标签' : '新建标签'}
        open={openCreate}
        centered
        width={520}
        destroyOnClose
        okText="确定"
        cancelText="取消"
        afterOpenChange={handleAfterOpenChange}
        onCancel={() => {
          setOpenCreate(false)
          form.resetFields()
        }}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="标签名称"
            name="name"
            rules={[
              { required: true, message: '请输入标签名称' },
              { max: 8, message: '标签名称限制8字' },
            ]}
          >
            <Input placeholder="请输入标签名称" maxLength={8} showCount />
          </Form.Item>

          <Form.Item
            label="标签颜色"
            name="color"
            rules={[{ required: true, message: '请选择标签颜色' }]}
          >
            <Segmented
              options={TAG_COLORS.map((c) => ({
                label: (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: c,
                      margin: '4px 0',
                    }}
                  />
                ),
                value: c,
              }))}
            />
          </Form.Item>

          <Form.Item label="描述" name="description" rules={[{ max: 20, message: '描述限制20字' }]}>
            <Input.TextArea
              placeholder="请输入标签描述"
              maxLength={20}
              showCount
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="删除确认"
        open={!!deleting}
        centered
        width={420}
        okText="确定"
        cancelText="取消"
        onCancel={() => setDeleting(null)}
        onOk={handleDelete}
      >
        <div style={{ padding: '8px 0' }}>
          删除该标签后，用户信息也将不再展示此标签。是否确认操作？
        </div>
      </Modal>
    </div>
  )
}
