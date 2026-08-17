import { useMemo, useState } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Popconfirm,
  Tooltip,
  Typography,
  Switch,
  Select,
  Modal,
  message,
} from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Channel } from '../types'
import { useChannels, useChannelModels } from '../store'
import ChannelModal from '../components/ChannelDrawer'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import SecretCell from '../components/SecretCell'
import RequirementDot from '../components/RequirementDot'

const { Text, Paragraph } = Typography

type StatusFilter = 'all' | 'enabled' | 'disabled'

export default function ChannelManage() {
  const { channels, addChannel, updateChannel, removeChannel } = useChannels()
  const { channelModels } = useChannelModels()
  const [nameKw, setNameKw] = useState('')
  const [statusKw, setStatusKw] = useState<StatusFilter>('all')
  const [query, setQuery] = useState<{ name: string; status: StatusFilter }>({
    name: '',
    status: 'all',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Channel | null>(null)
  const [deleteTipOpen, setDeleteTipOpen] = useState(false)

  const toggleStatus = (c: Channel, checked: boolean) => {
    updateChannel(c.id, { status: checked ? 'enabled' : 'disabled' })
    message.success(checked ? '渠道已启用' : '渠道已停用')
  }

  const handleSearch = () => setQuery({ name: nameKw, status: statusKw })
  const handleReset = () => {
    setNameKw('')
    setStatusKw('all')
    setQuery({ name: '', status: 'all' })
  }

  const filtered = useMemo(() => {
    const n = query.name.trim().toLowerCase()
    return channels
      .filter((c) => {
        const matchName = !n || c.name.toLowerCase().includes(n)
        const matchStatus = query.status === 'all' || c.status === query.status
        return matchName && matchStatus
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [channels, query])

  const modelsByChannel = useMemo(() => {
    const map = new Map<string, { modelName: string; modelCode: string }[]>()
    channelModels.forEach((m) => {
      const list = map.get(m.channelId) ?? []
      list.push({ modelName: m.modelName, modelCode: m.modelCode })
      map.set(m.channelId, list)
    })
    return map
  }, [channelModels])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (c: Channel) => {
    setEditing(c)
    setModalOpen(true)
  }

  const handleSubmit = (data: Channel) => {
    if (data.id) {
      updateChannel(data.id, data)
      message.success('渠道已更新')
    } else {
      const { id, createdAt, operator, ...rest } = data
      addChannel(rest)
      message.success('渠道已创建')
    }
    setModalOpen(false)
  }

  return (
    <PageShell
      breadcrumb={['渠道管理', '渠道商管理']}
      onSearch={handleSearch}
      onReset={handleReset}
      listTitle="渠道列表"
      total={filtered.length}
      hideTotal
      addText="新增渠道"
      onAdd={openCreate}
      titleExtra={
        <RequirementDot
          title="渠道商管理 · 页面总览"
          sections={[
            {
              label: '',
              items: [
                '1.列表字段修改如图，增加联系人、联系方式，修改渠道商字段名称、和api名称。',
                '2.列表按创建时间倒序展示。',
                '3. 联系人、联系方式、备注，无信息展示“——”',
                '4. 展示接入的模型数量（在渠道模型里配置到该渠道的，启用状态的），鼠标悬浮，展示接入的模型信息',
                '5.点击删除渠道，查找当前渠道是否有关联的模型（此处的模型不是渠道模型，是对外发布的模型），如有，提示如弹窗。 如没有，则提示“删除当前渠道，也会同步删除渠道下模型，是否确认删除？” 确认后，删除该渠道级渠道下的所有渠道模型（这里的模型不是对外发布模型，是渠道模型管理中关联了当前渠道的模型）',
              ],
            },
          ]}
        />
      }
      searchExtra={
        <RequirementDot
          title="搜索与筛选"
          sections={[
            {
              label: '搜索条件',
              items: [
                '「渠道名称」：按照渠道名称模糊搜索，匹配忽略大小写。',
                '「渠道状态」：下拉单选，可选值为 全部状态 / 启用 / 停用，按照下拉选项精确搜索。',
              ],
            },
            {
              label: '默认与重置',
              items: ['默认搜索全部。', '点击重置恢复默认搜索条件。'],
            },
          ]}
        />
      }
      searchFields={
        <>
          <SearchField label="渠道名称">
            <Input
              allowClear
              placeholder="请输入渠道名称"
              style={{ width: 220 }}
              value={nameKw}
              onChange={(e) => setNameKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="渠道状态">
            <Select
              style={{ width: 160 }}
              value={statusKw}
              onChange={setStatusKw}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'enabled', label: '启用' },
                { value: 'disabled', label: '停用' },
              ]}
            />
          </SearchField>
        </>
      }
    >
      <Table<Channel>
        rowKey="id"
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 8, showTotal: (t) => `共 ${t} 条记录` }}
        columns={[
          {
            title: '渠道名称',
            dataIndex: 'name',
            width: 180,
            fixed: 'left',
            render: (v: string) => <Text>{v}</Text>,
          },
          {
            title: '接入模型数量',
            key: 'modelCount',
            width: 120,
            align: 'center',
            render: (_, r) => {
              const list = modelsByChannel.get(r.id) ?? []
              if (list.length === 0) return <Text type="secondary">0</Text>
              return (
                <Tooltip
                  styles={{ body: { maxWidth: 300 } }}
                  title={
                    <div style={{ width: 260 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          paddingBottom: 6,
                          marginBottom: 6,
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                        }}
                      >
                        共 {list.length} 个接入模型
                      </div>
                      <div style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                        {list.map((m, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              gap: 8,
                              padding: '6px 0',
                              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)',
                            }}
                          >
                            <span style={{ color: 'rgba(255,255,255,0.55)', minWidth: 18 }}>
                              {i + 1}.
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ wordBreak: 'break-all' }}>{m.modelName}</div>
                              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, wordBreak: 'break-all' }}>
                                Model code：{m.modelCode || '—'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                >
                  <a>{list.length}</a>
                </Tooltip>
              )
            },
          },
          {
            title: 'API 名称',
            dataIndex: 'apiName',
            width: 160,
            render: (v: string) => v || <Text type="secondary">—</Text>,
          },
          {
            title: 'API 地址',
            dataIndex: 'apiUrl',
            width: 240,
            ellipsis: true,
            render: (v: string) =>
              v ? (
                <Tooltip title={v}>
                  <Text>{v}</Text>
                </Tooltip>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: (
              <Space size={6}>
                API Key
                <RequirementDot
                  title="API Key 脱敏展示与操作"
                  sections={[
                    {
                      label: '交互逻辑',
                      items: [
                        '默认脱敏展示：保留首尾各 4 位，中间以 **** 代替（如 sk-a****xY90）。',
                        '「显示/隐藏」图标按钮切换当前行明文/密文；「复制」图标按钮一键复制完整 Key，成功提示「已复制」。',
                      ],
                    },
                    {
                      label: '默认值',
                      items: ['默认脱敏（密文）展示。'],
                    },
                  ]}
                />
              </Space>
            ),
            dataIndex: 'apiKey',
            width: 300,
            render: (v: string) => <SecretCell value={v} />,
          },
          {
            title: '渠道联系人',
            dataIndex: 'contact',
            width: 120,
            render: (v: string) => v || <Text type="secondary">—</Text>,
          },
          {
            title: '联系方式',
            dataIndex: 'phone',
            width: 160,
            render: (v: string) => v || <Text type="secondary">—</Text>,
          },
          {
            title: '备注',
            dataIndex: 'remark',
            width: 180,
            ellipsis: true,
            render: (v: string) =>
              v ? <Text>{v}</Text> : <Text type="secondary">—</Text>,
          },
          {
            title: '渠道状态',
            dataIndex: 'status',
            width: 130,
            align: 'center',
            render: (v: string, r) => (
              <Switch
                size="small"
                checked={v === 'enabled'}
                checkedChildren="启用"
                unCheckedChildren="停用"
                onChange={(checked) => toggleStatus(r, checked)}
              />
            ),
          },
          {
            title: '操作人',
            dataIndex: 'operator',
            width: 110,
            render: (v: string) => <Text>{v}</Text>,
          },
          { title: '创建时间', dataIndex: 'createdAt', width: 120 },
          {
            title: '操作',
            width: 160,
            fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(r)}
                >
                  编辑
                </Button>
                <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setDeleteTipOpen(true)}
                  >
                    删除
                  </Button>
              </Space>
            ),
          },
        ]}
      />

      <ChannelModal
        open={modalOpen}
        channel={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        open={deleteTipOpen}
        centered
        width={420}
        okText="确认"
        cancelText="取消"
        onOk={() => setDeleteTipOpen(false)}
        onCancel={() => setDeleteTipOpen(false)}
      >
        <Paragraph>
          当前渠道有模型正在使用，请在模型管理移除当前渠道
        </Paragraph>
      </Modal>
    </PageShell>
  )
}
