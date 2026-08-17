import { useMemo, useState } from 'react'
import { Card, Input, Select, Button, Table, Tag, Typography, Space, Modal, Form, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  MoreOutlined,
  ContainerOutlined,
  IdcardOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography

const USER_TAG_OPTIONS = [
  { name: '内部员工', color: '#2f6bff' },
  { name: '员工介绍', color: '#52c41a' },
  { name: '合作伙伴', color: '#fa541c' },
]

/* ---------------- 统计卡 ---------------- */
interface StatCard {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  bg: string
}

const STATS: StatCard[] = [
  { label: '总用户数', value: '97', icon: <UserOutlined />, color: '#2f6bff', bg: '#eef4ff' },
  { label: '总认证数', value: '42', icon: <SafetyCertificateOutlined />, color: '#52c41a', bg: '#eafaf0' },
]

/* ---------------- 表格数据 ---------------- */
interface UserRow {
  key: string
  username: string
  phone: string
  email: string
  realName: boolean
  entAuth: boolean
  authInfo: string
  accountCount: number
  status: string
  registeredAt: string
  remark: string
  tags: string[]
}

const INIT_ROWS: UserRow[] = [
  { key: '1', username: 'lyfyyds', phone: '183****8544', email: '', realName: true, entAuth: false, authInfo: '李怡凡', accountCount: 1, status: '正常', registeredAt: '2026-08-14 14:00:12', remark: '杨继航介绍', tags: ['内部员工'] },
  { key: '2', username: '13811305182', phone: '138****5182', email: '', realName: false, entAuth: false, authInfo: '', accountCount: 1, status: '正常', registeredAt: '2026-08-10 17:16:05', remark: '', tags: [] },
  { key: '3', username: '18255445034', phone: '182****5034', email: '', realName: false, entAuth: false, authInfo: '', accountCount: 1, status: '正常', registeredAt: '2026-08-05 16:38:53', remark: '', tags: [] },
  { key: '4', username: '13355949369', phone: '133****9369', email: '17707808@qq.com', realName: false, entAuth: false, authInfo: '', accountCount: 1, status: '正常', registeredAt: '2026-08-05 15:17:01', remark: '王天龙介绍 - 某地数据局', tags: ['内部员工', '员工介绍'] },
  { key: '5', username: '18160382631', phone: '181****2631', email: '', realName: false, entAuth: false, authInfo: '', accountCount: 1, status: '正常', registeredAt: '2026-08-05 10:41:29', remark: '吴明成介绍', tags: [] },
  { key: '6', username: '13294135063', phone: '132****5063', email: '', realName: false, entAuth: false, authInfo: '', accountCount: 1, status: '已注销', registeredAt: '2026-08-04 10:18:49', remark: '', tags: [] },
]

interface RemarkFormValues {
  remark: string
}

interface UserListProps {
  onNavigateToTagPage?: () => void
}

export default function UserList({ onNavigateToTagPage }: UserListProps = {}) {
  const [rows, setRows] = useState<UserRow[]>(INIT_ROWS)
  const [remarkOpen, setRemarkOpen] = useState(false)
  const [remarkUser, setRemarkUser] = useState<UserRow | null>(null)
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [tagModalUser, setTagModalUser] = useState<UserRow | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [remarkForm] = Form.useForm<RemarkFormValues>()

  const [searchText, setSearchText] = useState('')
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [appliedText, setAppliedText] = useState('')
  const [appliedTags, setAppliedTags] = useState<string[]>([])
  const [appliedType, setAppliedType] = useState('all')
  const [appliedStatus, setAppliedStatus] = useState('all')

  const tagColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    USER_TAG_OPTIONS.forEach((t) => { m[t.name] = t.color })
    return m
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (appliedText) {
        const k = appliedText.toLowerCase()
        const match = r.username.toLowerCase().includes(k) || r.phone.toLowerCase().includes(k) || r.email.toLowerCase().includes(k)
        if (!match) return false
      }
      if (appliedTags.length > 0) {
        if (!appliedTags.some((tag) => r.tags.includes(tag))) return false
      }
      if (appliedStatus !== 'all') {
        if (r.status !== appliedStatus) return false
      }
      return true
    })
  }, [rows, appliedText, appliedTags, appliedStatus])

  const handleSearch = () => {
    setAppliedText(searchText)
    setAppliedTags([...searchTags])
    setAppliedType(typeFilter)
    setAppliedStatus(statusFilter)
  }

  const handleReset = () => {
    setSearchText('')
    setSearchTags([])
    setTypeFilter('all')
    setStatusFilter('all')
    setAppliedText('')
    setAppliedTags([])
    setAppliedType('all')
    setAppliedStatus('all')
  }

  /* ---- 备注 ---- */
  const openRemarkModal = (r: UserRow) => {
    setRemarkUser(r)
    setRemarkOpen(true)
  }

  const handleRemarkAfterOpenChange = (open: boolean) => {
    if (!open || !remarkUser) return
    remarkForm.setFieldsValue({ remark: remarkUser.remark })
  }

  const handleRemarkSubmit = async () => {
    try {
      const v = await remarkForm.validateFields()
      if (!remarkUser) return
      const remark = (v.remark || '').trim()
      if (remark.length > 20) {
        message.error('备注不能超过20字')
        return
      }
      setRows((list) => list.map((r) => r.key === remarkUser.key ? { ...r, remark } : r))
      message.success('保存成功')
      setRemarkOpen(false)
      remarkForm.resetFields()
    } catch {
      /* noop */
    }
  }

  /* ---- 标签 ---- */
  const openTagModal = (r: UserRow) => {
    setTagModalUser(r)
    setSelectedTags([...r.tags])
    setTagModalOpen(true)
  }

  const toggleTag = (name: string) => {
    setSelectedTags((list) =>
      list.includes(name) ? list.filter((t) => t !== name) : [...list, name],
    )
  }

  const handleTagSave = () => {
    if (!tagModalUser) return
    setRows((list) =>
      list.map((r) => r.key === tagModalUser.key ? { ...r, tags: [...selectedTags] } : r),
    )
    message.success('保存成功')
    setTagModalOpen(false)
    setSelectedTags([])
  }

  const columns: ColumnsType<UserRow> = [
    {
      title: '用户信息',
      key: 'user',
      align: 'left',
      width: 220,
      fixed: 'left',
      render: (_: unknown, r: UserRow) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.username}</div>
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            {r.remark ? (
              <>
                <Text
                  style={{ fontSize: 12, color: '#8c8c8c', cursor: 'pointer' }}
                  onClick={() => openRemarkModal(r)}
                >
                  {r.remark}
                </Text>
                <EditOutlined
                  style={{ fontSize: 12, color: '#2f6bff', cursor: 'pointer' }}
                  onClick={() => openRemarkModal(r)}
                />
              </>
            ) : (
              <a
                onClick={() => openRemarkModal(r)}
                style={{ fontSize: 12 }}
              >
                <EditOutlined style={{ marginRight: 4 }} />
                添加备注
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '标签',
      key: 'tags',
      align: 'left',
      width: 220,
      render: (_: unknown, r: UserRow) => (
        <Space size={[4, 4]} wrap>
          {r.tags.map((t) => (
            <Tag
              key={t}
              color={tagColorMap[t] || '#2f6bff'}
              style={{ margin: 0 }}
            >
              {t}
            </Tag>
          ))}
          <a onClick={() => openTagModal(r)} style={{ fontSize: 12 }}>
            +标签
          </a>
        </Space>
      ),
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', align: 'center', width: 140 },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      align: 'center',
      width: 180,
      render: (v: string) => (v ? v : <Text type="secondary">—</Text>),
    },
    {
      title: '认证状态',
      key: 'auth',
      align: 'center',
      width: 140,
      render: (_: unknown, r: UserRow) => (
        <Space direction="vertical" size={4}>
          <Tag icon={<IdcardOutlined />} color={r.realName ? 'success' : 'default'} style={{ margin: 0 }}>
            {r.realName ? '已实名' : '未实名'}
          </Tag>
          <Tag icon={<SafetyCertificateOutlined />} color={r.entAuth ? 'success' : 'default'} style={{ margin: 0 }}>
            {r.entAuth ? '已企业认证' : '未企业认证'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '认证信息',
      dataIndex: 'authInfo',
      key: 'authInfo',
      align: 'center',
      width: 130,
      render: (v: string) => (v ? v : <Text type="secondary">—</Text>),
    },
    {
      title: '关联账户',
      dataIndex: 'accountCount',
      key: 'accountCount',
      align: 'center',
      width: 120,
      render: (v: number) => (
        <a>
          <ContainerOutlined style={{ marginRight: 4 }} />
          {v}个账户
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      width: 100,
      render: (v: string) => <Tag color={v === '正常' ? 'blue' : 'error'}>{v}</Tag>,
    },
    { title: '注册时间', dataIndex: 'registeredAt', key: 'registeredAt', align: 'center', width: 170 },
    {
      title: '操作',
      key: 'op',
      align: 'center',
      width: 90,
      fixed: 'right',
      render: () => (
        <Button type="text" icon={<MoreOutlined />} />
      ),
    },
  ]

  const tagSearchOptions = USER_TAG_OPTIONS.map((t) => ({ value: t.name, label: t.name }))

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATS.map((s) => (
          <Card key={s.label} variant="borderless" styles={{ body: { padding: 20 } }} style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 12 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: s.color }}>{s.value}</div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: s.bg,
                  color: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {s.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Text>搜索：</Text>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="搜索用户名、邮箱或手机号..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 320 }}
          />
          <Text>标签：</Text>
          <Select
            mode="multiple"
            allowClear
            style={{ minWidth: 180 }}
            placeholder="全部标签"
            value={searchTags}
            onChange={setSearchTags}
            options={tagSearchOptions}
            maxTagCount={1}
          />
          <Text>类型：</Text>
          <Select
            style={{ width: 140 }}
            value={typeFilter}
            onChange={setTypeFilter}
            options={[{ value: 'all', label: '全部类型' }]}
          />
          <Text>状态：</Text>
          <Select
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: '全部状态' },
              { value: '正常', label: '正常' },
              { value: '已注销', label: '已注销' },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
        </div>
      </Card>

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <Text strong style={{ fontSize: 16 }}>用户信息</Text>
            <RequirementDot
              title="用户列表"
              sections={[
                {
                  label: '备注功能',
                  items: [
                    '用户信息下方增加备注设置 icon；点击编辑备注，弹窗设置备注。',
                    '备注信息：限 20 字，不限制输入类型。未输入信息，点击保存，备注为空。设置后保存，验证字数 ≤ 20 字，则保存。',
                    '备注信息超过一行支持换行展示。',
                    '已填写备注信息时，点击编辑，则回填原信息，支持修改后保存更新。',
                  ],
                },
                {
                  label: '标签功能',
                  items: [
                    '支持设置标签。未设置标签时，点击【+标签】按钮，弹窗展示用户标签中添加的标签信息；【+添加标签】按钮始终存在在所有标签最后。',
                    '如用户未设置过标签，则弹窗中标签未选中状态，点击后为选中状态。点击保存，为用户添加标签。',
                    '如用户已设置过标签，则弹窗中，已设置的标签为选中状态，支持取消选中。保存后，为用户更新选中的标签。',
                    '如需要添加标签，可点击【+添加标签】，跳转到用户标签页面。',
                    '如点击【保存】时，有选中标签已更新名称颜色等，则直接保存为更新后的信息。如有选中的标签已删除，则提示"当前部分选中标签已删除，请重新选择"，用户确认后，提示关闭，设置标签弹窗刷新（已删除的不再展示，以往保存过的为选中状态，未保存过的为未选中状态）。',
                  ],
                },
                {
                  label: '操作与搜索',
                  items: [
                    '删掉操作中的「设为内部员工」、「设置用户来源」操作。',
                    '增加按标签搜索，默认搜索所有，下拉展示所有添加的标签，支持多选。',
                  ],
                },
              ]}
            />
          </Space>
          <Button type="primary" icon={<UserAddOutlined />}>添加用户</Button>
        </div>
        <Table<UserRow>
          rowKey="key"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{ showTotal: (t) => `共 ${t} 条记录` }}
        />
      </Card>

      {/* 备注编辑弹窗 */}
      <Modal
        title="备注信息"
        open={remarkOpen}
        centered
        width={480}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        afterOpenChange={handleRemarkAfterOpenChange}
        onCancel={() => {
          setRemarkOpen(false)
          remarkForm.resetFields()
        }}
        onOk={handleRemarkSubmit}
      >
        <Form form={remarkForm} layout="vertical" preserve={false}>
          <Form.Item
            label={remarkUser ? `为用户${remarkUser.username}设置备注` : '备注'}
            name="remark"
            rules={[{ max: 20, message: '备注不能超过20字' }]}
          >
            <Input.TextArea
              placeholder="请输入备注信息（选填）"
              maxLength={20}
              showCount
              autoSize={{ minRows: 2, maxRows: 4 }}
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 标签选择弹窗 */}
      <Modal
        title={tagModalUser ? `为用户${tagModalUser.username}设置标签` : '设置标签'}
        open={tagModalOpen}
        centered
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        onCancel={() => {
          setTagModalOpen(false)
          setSelectedTags([])
        }}
        onOk={handleTagSave}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {USER_TAG_OPTIONS.map((t) => {
            const active = selectedTags.includes(t.name)
            return (
              <div
                key={t.name}
                onClick={() => toggleTag(t.name)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: 13,
                  borderRadius: 6,
                  border: active ? `1px solid ${t.color}` : '1px dashed #d9d9d9',
                  background: active ? `${t.color}10` : '#fafafa',
                  color: active ? t.color : '#595959',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: t.color,
                    flexShrink: 0,
                  }}
                />
                {t.name}
              </div>
            )
          })}
        </div>
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={() => {
            setTagModalOpen(false)
            onNavigateToTagPage?.()
          }}
        >
          添加新标签
        </Button>
      </Modal>
    </div>
  )
}
