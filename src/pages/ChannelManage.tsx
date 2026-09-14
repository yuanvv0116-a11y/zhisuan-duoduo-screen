import { useEffect, useMemo, useState } from 'react'
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
  Form,
  message,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from '@ant-design/icons'
import type { Channel, ChannelApiCredential } from '../types'
import { useChannels, useChannelModels, CURRENT_OPERATOR } from '../store'
import ChannelModal from '../components/ChannelDrawer'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import SecretCell from '../components/SecretCell'
import RequirementDot from '../components/RequirementDot'

const { Text, Paragraph } = Typography

type StatusFilter = 'all' | 'enabled' | 'disabled'

const newId = () => Math.random().toString(36).slice(2, 10)

interface CredRow extends ChannelApiCredential {
  rowType: 'cred'
  parentId: string
}

interface ChannelRow extends Channel {
  rowType: 'channel'
  children?: CredRow[]
}

type TreeRow = ChannelRow | CredRow

export default function ChannelManage() {
  const { channels, addChannel, updateChannel, removeChannel } = useChannels()
  const { channelModels } = useChannelModels()
  const [nameKw, setNameKw] = useState('')
  const [apiNameKw, setApiNameKw] = useState('')
  const [statusKw, setStatusKw] = useState<StatusFilter>('all')
  const [query, setQuery] = useState<{
    name: string
    apiName: string
    status: StatusFilter
  }>({
    name: '',
    apiName: '',
    status: 'all',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Channel | null>(null)
  const [deleteTipOpen, setDeleteTipOpen] = useState(false)
  const [apiModalId, setApiModalId] = useState<string | null>(null)
  const [apiModalCredId, setApiModalCredId] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<readonly string[]>([])
  const [credInUseOpen, setCredInUseOpen] = useState(false)

  const apiModalChannel = useMemo(
    () => channels.find((c) => c.id === apiModalId) ?? null,
    [channels, apiModalId],
  )
  const apiModalCred = useMemo(
    () =>
      apiModalChannel?.apiCredentials?.find((x) => x.id === apiModalCredId) ?? null,
    [apiModalChannel, apiModalCredId],
  )

  const toggleExpand = (id: string) =>
    setExpandedKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    )

  const toggleCredStatus = (channelId: string, credId: string, checked: boolean) => {
    const list = channels.find((c) => c.id === channelId)?.apiCredentials ?? []
    updateChannel(channelId, {
      apiCredentials: list.map((x) =>
        x.id === credId ? { ...x, status: checked ? 'enabled' : 'disabled' } : x,
      ),
    })
    message.success(checked ? 'API 已启用' : 'API 已停用')
  }

  const handleSearch = () => {
    setQuery({ name: nameKw, apiName: apiNameKw, status: statusKw })
    const an = apiNameKw.trim().toLowerCase()
    if (an) {
      setExpandedKeys(
        channels
          .filter((c) =>
            (c.apiCredentials ?? []).some((x) =>
              x.apiName.toLowerCase().includes(an),
            ),
          )
          .map((c) => c.id),
      )
    }
  }
  const handleReset = () => {
    setNameKw('')
    setApiNameKw('')
    setStatusKw('all')
    setQuery({ name: '', apiName: '', status: 'all' })
  }

  const filtered = useMemo(() => {
    const n = query.name.trim().toLowerCase()
    const an = query.apiName.trim().toLowerCase()
    return channels
      .filter((c) => {
        const matchName = !n || c.name.toLowerCase().includes(n)
        const matchApiName =
          !an ||
          (c.apiCredentials ?? []).some((x) => x.apiName.toLowerCase().includes(an))
        const matchStatus =
          query.status === 'all' ||
          (c.apiCredentials ?? []).some((x) => x.status === query.status)
        return matchName && matchApiName && matchStatus
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [channels, query])

  const { modelsByChannel, modelsByCred } = useMemo(() => {
    const byChannel = new Map<string, { modelName: string; modelCode: string }[]>()
    const byCred = new Map<string, { modelName: string; modelCode: string }[]>()
    channelModels.forEach((m) => {
      const item = { modelName: m.modelName, modelCode: m.modelCode }
      const list = byChannel.get(m.channelId) ?? []
      list.push(item)
      byChannel.set(m.channelId, list)
      if (m.credentialId) {
        const credList = byCred.get(m.credentialId) ?? []
        credList.push(item)
        byCred.set(m.credentialId, credList)
      }
    })
    return { modelsByChannel: byChannel, modelsByCred: byCred }
  }, [channelModels])

  const treeData = useMemo<ChannelRow[]>(
    () =>
      filtered.map((c) => {
        const an = query.apiName.trim().toLowerCase()
        const children = (c.apiCredentials ?? [])
          .filter(
            (x) =>
              (query.status === 'all' || x.status === query.status) &&
              (!an || x.apiName.toLowerCase().includes(an)),
          )
          .map<CredRow>((x) => ({
            ...x,
            rowType: 'cred' as const,
            parentId: c.id,
          }))
        return {
          ...c,
          rowType: 'channel' as const,
          ...(children.length ? { children } : {}),
        }
      }),
    [filtered, query.status, query.apiName],
  )

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

  const deleteCredential = (channelId: string, credId: string) => {
    const list = channels.find((c) => c.id === channelId)?.apiCredentials ?? []
    updateChannel(channelId, { apiCredentials: list.filter((x) => x.id !== credId) })
    message.success('已删除')
  }

  const submitApiConfigs = (channelId: string, rows: ChannelApiCredential[]) => {
    const list = channels.find((c) => c.id === channelId)?.apiCredentials ?? []
    const today = new Date().toISOString().slice(0, 10)
    if (apiModalCred) {
      updateChannel(channelId, {
        apiCredentials: list.map((x) =>
          x.id === apiModalCred.id
            ? {
                ...rows[0],
                id: x.id,
                operator: CURRENT_OPERATOR,
                createdAt: x.createdAt ?? today,
              }
            : x,
        ),
      })
      message.success('API 配置已保存')
    } else {
      updateChannel(channelId, {
        apiCredentials: [
          ...list,
          ...rows.map((v) => ({
            ...v,
            operator: CURRENT_OPERATOR,
            createdAt: today,
          })),
        ],
      })
      message.success(`已添加 ${rows.length} 组 API 配置`)
      setExpandedKeys((prev) => (prev.includes(channelId) ? prev : [...prev, channelId]))
    }
    setApiModalId(null)
    setApiModalCredId(null)
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
                '1.列表展示如图，按照添加渠道的时间倒序展示；增加api名称模糊搜索；新增渠道与api名称分离。',
                '2.未添加API的无点击操作；添加API的渠道支持点击展开，查看API信息；',
                '3.点击编辑渠道时，只修改渠道信息；',
                '4.点击编辑API信息时，支持修改API信息；',
                '5.点击删除API信息时，需要检查API信息下是否有模型，如有模型提示“当前API下有关联模型，请先移除其下模型”；如没有模型，则二次确认后删除。',
                '6.点击删除渠道信息时，检查渠道下所有API下是否有模型，如有模型提示“当前渠道下有关联模型，请先移除其下模型”；如没有模型，则二次确认后删除。',
                '7.鼠标悬浮在接入模型数量上，悬浮展示模型信息如图。',
                '8.api未启用的，将无法调用该api及其下模型。报错“xx API未启用”',
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
                '增加API名称搜索，支持根据API名称模糊搜索。',
                '「API 状态」：下拉单选，可选值为 全部状态 / 启用 / 停用；按每组 API 配置的状态过滤，仅保留包含匹配配置的渠道，子行也只展示匹配的配置。',
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
          <SearchField label="API 名称">
            <Input
              allowClear
              placeholder="请输入 API 名称"
              style={{ width: 220 }}
              value={apiNameKw}
              onChange={(e) => setApiNameKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="API 状态">
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
      <Table<TreeRow>
        rowKey="id"
        dataSource={treeData}
        rowClassName={(r) => (r.rowType === 'cred' ? '' : 'channel-parent-row')}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 8, showTotal: (t) => `共 ${t} 条记录` }}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys) => setExpandedKeys(keys as readonly string[]),
          showExpandColumn: false,
        }}
        indentSize={24}
        columns={[
          {
            title: '渠道名称',
            width: 240,
            fixed: 'left',
            render: (_, r) =>
              r.rowType === 'cred' ? null : (
                <Space direction="vertical" size={0}>
                  <Text strong>{r.name}</Text>
                  {(r.children?.length ?? 0) > 0 ? (
                    <Tooltip title={expandedKeys.includes(r.id) ? '收起' : '展开'}>
                      <a
                        onClick={() => toggleExpand(r.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          已添加 {(r.apiCredentials ?? []).length} 组 API
                        </Text>
                        {expandedKeys.includes(r.id) ? (
                          <CaretUpOutlined />
                        ) : (
                          <CaretDownOutlined />
                        )}
                      </a>
                    </Tooltip>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      已添加 {(r.apiCredentials ?? []).length} 组 API
                    </Text>
                  )}
                </Space>
              ),
          },
          {
            title: 'API 名称',
            width: 200,
            render: (_, r) =>
              r.rowType === 'cred' ? (
                <Text>{r.apiName || '—'}</Text>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: 'API 地址',
            width: 260,
            render: (_, r) => {
              if (r.rowType === 'channel') return <Text type="secondary">—</Text>
              return r.apiUrl ? (
                <Tooltip title={r.apiUrl}>
                  <Text ellipsis style={{ maxWidth: 220, display: 'inline-block' }}>
                    {r.apiUrl}
                  </Text>
                </Tooltip>
              ) : (
                <Text type="secondary">—</Text>
              )
            },
          },
          {
            title: 'API Key',
            width: 280,
            render: (_, r) =>
              r.rowType === 'channel' ? (
                <Text type="secondary">—</Text>
              ) : (
                <SecretCell value={r.apiKey} maxWidth={150} />
              ),
          },
          {
            title: 'API 状态',
            width: 110,
            align: 'center',
            render: (_, r) =>
              r.rowType === 'channel' ? (
                <Text type="secondary">—</Text>
              ) : (
                <Switch
                  size="small"
                  checked={r.status === 'enabled'}
                  checkedChildren="启用"
                  unCheckedChildren="停用"
                  onChange={(checked) => toggleCredStatus(r.parentId, r.id, checked)}
                />
              ),
          },
          {
            title: '接入模型数量',
            key: 'modelCount',
            width: 120,
            align: 'center',
            render: (_, r) => {
              const list =
                r.rowType === 'cred'
                  ? modelsByCred.get(r.id) ?? []
                  : modelsByChannel.get(r.id) ?? []
              if (list.length === 0) return <Text type="secondary">0</Text>
              return (
                <Tooltip
                  styles={{ body: { maxWidth: 320 } }}
                  title={
                    <div style={{ width: 280 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          paddingBottom: 6,
                          marginBottom: 6,
                          borderBottom: '1px solid rgba(255,255,255,0.2)',
                        }}
                      >
                        接入模型明细（{list.length}）
                      </div>
                      <div style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                        {list.map((m, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0' }}>
                            <span style={{ color: 'rgba(255,255,255,0.55)', minWidth: 18 }}>
                              {i + 1}.
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>
                                {m.modelName}
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, wordBreak: 'break-all' }}>
                                Model Code: {m.modelCode || '—'}
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
            title: '渠道联系人',
            dataIndex: 'contact',
            width: 120,
            render: (_, r) =>
              r.rowType === 'cred' ? null : r.contact || <Text type="secondary">—</Text>,
          },
          {
            title: '联系方式',
            dataIndex: 'phone',
            width: 160,
            render: (_, r) =>
              r.rowType === 'cred' ? null : r.phone || <Text type="secondary">—</Text>,
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
            title: '操作人',
            dataIndex: 'operator',
            width: 100,
            render: (v: string) => (v ? <Text>{v}</Text> : <Text type="secondary">—</Text>),
          },
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            width: 120,
            render: (_, r) =>
              r.createdAt ? <Text>{r.createdAt}</Text> : <Text type="secondary">—</Text>,
          },
          {
            title: '操作',
            width: 230,
            fixed: 'right',
            render: (_, r) =>
              r.rowType === 'cred' ? (
                <Space size={0}>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setApiModalId(r.parentId)
                      setApiModalCredId(r.id)
                    }}
                  >
                    编辑
                  </Button>
                  {(modelsByCred.get(r.id) ?? []).length > 0 ? (
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setCredInUseOpen(true)}
                    >
                      删除
                    </Button>
                  ) : (
                    <Popconfirm
                      title="确认删除该 API 配置？"
                      okText="确认"
                      cancelText="取消"
                      onConfirm={() => deleteCredential(r.parentId, r.id)}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              ) : (
                <Space size={0}>
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
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setApiModalId(r.id)
                      setApiModalCredId(null)
                    }}
                  >
                    添加API
                  </Button>
                  {(modelsByChannel.get(r.id) ?? []).length > 0 ? (
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setDeleteTipOpen(true)}
                    >
                      删除
                    </Button>
                  ) : (
                    <Popconfirm
                      title="确认删除该渠道？"
                      okText="确认"
                      cancelText="取消"
                      onConfirm={() => {
                        removeChannel(r.id)
                        message.success('已删除')
                      }}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  )}
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

      <ApiConfigModal
        open={!!apiModalChannel}
        channel={apiModalChannel}
        editCred={apiModalCred}
        onClose={() => {
          setApiModalId(null)
          setApiModalCredId(null)
        }}
        onSubmit={submitApiConfigs}
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
        <Paragraph style={{ marginBottom: 0 }}>
          当前渠道下有关联模型，请先移除其下模型
        </Paragraph>
      </Modal>

      <Modal
        open={credInUseOpen}
        centered
        width={420}
        okText="确认"
        cancelText="取消"
        onOk={() => setCredInUseOpen(false)}
        onCancel={() => setCredInUseOpen(false)}
      >
        <Paragraph style={{ marginBottom: 0 }}>
          当前API下有关联模型，请先移除其下模型
        </Paragraph>
      </Modal>
    </PageShell>
  )
}

interface CredFormRow {
  id: string
  apiName: string
  apiUrl: string
  apiKey: string
  remark?: string
  status?: boolean
}

interface ApiConfigModalProps {
  open: boolean
  channel: Channel | null
  /** 传入则为「编辑该组配置」模式（仅回显这一组）；null 为「添加API」批量新增模式 */
  editCred: ChannelApiCredential | null
  onClose: () => void
  onSubmit: (channelId: string, rows: ChannelApiCredential[]) => void
}

function ApiConfigModal({ open, channel, editCred, onClose, onSubmit }: ApiConfigModalProps) {
  const [form] = Form.useForm<{ creds: CredFormRow[] }>()
  const watched = Form.useWatch([], form)

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        creds: editCred
          ? [
              {
                id: editCred.id,
                apiName: editCred.apiName,
                apiUrl: editCred.apiUrl,
                apiKey: editCred.apiKey,
                remark: editCred.remark,
                status: editCred.status !== 'disabled',
              },
            ]
          : [
              {
                id: newId(),
                apiName: '',
                apiUrl: '',
                apiKey: '',
                remark: '',
                status: true,
              },
            ],
      })
    }
  }, [open, editCred, form])

  const handleOk = async () => {
    if (!channel) return
    try {
      const { creds } = await form.validateFields()
      const rows: ChannelApiCredential[] = (creds ?? []).map((v) => ({
        id: v.id || newId(),
        apiName: v.apiName.trim(),
        apiUrl: v.apiUrl.trim(),
        apiKey: v.apiKey.trim(),
        remark: v.remark?.trim() || undefined,
        status: editCred ? editCred.status : v.status === false ? 'disabled' : 'enabled',
      }))
      const taken = new Set(
        (channel.apiCredentials ?? [])
          .filter((x) => x.id !== editCred?.id)
          .map((x) => x.apiName.trim()),
      )
      const seen = new Set<string>()
      let dupName = ''
      for (const v of rows) {
        if (taken.has(v.apiName) || seen.has(v.apiName)) {
          dupName = v.apiName
          break
        }
        seen.add(v.apiName)
      }
      if (dupName) {
        message.error(`${dupName}名称已存在`)
        return
      }
      onSubmit(channel.id, rows)
    } catch {
      message.error('请检查每组 API 配置的必填项')
    }
  }

  return (
    <Modal
      title={
        <Space size={6}>
          {editCred ? '编辑API' : '添加API'}
          <RequirementDot
            title={editCred ? '编辑API' : '添加API'}
            sections={[
              {
                label: '',
                items: editCred
                  ? [
                      '1.编辑API：只编辑当前这一组配置，每个输入框上方展示字段名称，占两行——第一行为 API名称（12 字以内）+ API地址，第二行为 API Key、备注；名称、地址、Key 必填，备注选填；内容较长时，鼠标悬停输入框可查看完整内容；',
                      '2.弹窗内不展示「新增」，也不可在弹窗内删除，保存后原位更新；如需删除某组配置，请使用列表子行的「删除」；一组 API 配置可以关联配置多个模型。',
                      '3.编辑弹窗内不放状态；该组 API 配置的状态（启用/停用）请在列表中该 API 子行的开关上直接切换。',
                    ]
                  : [
                      '1.API 名称、API 地址、API Key，必填，规则同以前；备注选填，限制50字；状态默认开启；删除无需2次确认；',
                      '2.「添加API」不回显已添加的配置，每次仅批量新增：每点击一次「新增」增加一组，最多增加10组，保存后整批追加到该渠道（渠道内api名称不可重复，重复提示“xxx名称已存在”）；',
                    ],
              },
            ]}
          />
        </Space>
      }
      width={840}
      centered
      open={open}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      onOk={handleOk}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.List name="creds">
          {(fields, { add, remove }) => (
            <>
              {fields.length === 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary">
                    暂无 API 配置，点击「新增」添加
                  </Text>
                </div>
              )}
              {fields.map((field, index) => (
                <div key={field.key} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    {!editCred && (
                      <Text type="secondary" style={{ width: 22, lineHeight: '32px', flexShrink: 0 }}>
                        #{index + 1}
                      </Text>
                    )}
                    <Form.Item
                      label={editCred ? 'API名称' : undefined}
                      style={{ marginBottom: 0, width: 148, flexShrink: 0 }}
                      name={[field.name, 'apiName']}
                      rules={[
                        { required: true, message: '请输入 API 名称' },
                        { max: 12, message: 'API 名称不超过 12 个字' },
                      ]}
                    >
                      <Input maxLength={12} placeholder="API 名称（≤12字）" />
                    </Form.Item>
                    <Form.Item
                      label={editCred ? 'API地址' : undefined}
                      style={{ marginBottom: 0, flex: 1, minWidth: 240 }}
                      name={[field.name, 'apiUrl']}
                      rules={[{ required: true, message: '请输入 API 地址' }]}
                    >
                      <Input
                        placeholder="API 地址，如 https://api.example.com/v1"
                        title={watched?.creds?.[field.name]?.apiUrl || undefined}
                      />
                    </Form.Item>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {!editCred && <div style={{ width: 22, flexShrink: 0 }} />}
                    <Form.Item
                      label={editCred ? 'API Key' : undefined}
                      style={{ marginBottom: 0, width: 320, flexShrink: 0 }}
                      name={[field.name, 'apiKey']}
                      rules={[{ required: true, message: '请输入 API Key' }]}
                    >
                      <Input.Password placeholder="API Key" autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item
                      label={editCred ? '备注' : undefined}
                      style={{ marginBottom: 0, flex: 1, minWidth: 120 }}
                      name={[field.name, 'remark']}
                      rules={[{ max: 50, message: '备注不超过 50 个字' }]}
                    >
                      <Input
                        maxLength={50}
                        placeholder="备注（选填，≤50字）"
                        title={watched?.creds?.[field.name]?.remark || undefined}
                      />
                    </Form.Item>
                    {!editCred && (
                      <Form.Item
                        style={{ marginBottom: 0, flexShrink: 0 }}
                        name={[field.name, 'status']}
                        valuePropName="checked"
                      >
                        <Switch size="small" checkedChildren="启用" unCheckedChildren="停用" style={{ marginTop: 6 }} />
                      </Form.Item>
                    )}
                    {!editCred && (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ marginTop: 3 }}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </div>
                </div>
              ))}
              {!editCred && (
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  disabled={fields.length >= 10}
                  onClick={() => {
                    add({
                      id: newId(),
                      apiName: '',
                      apiUrl: '',
                      apiKey: '',
                      remark: '',
                      status: true,
                    })
                  }}
                >
                  {`新增（${fields.length}/10）`}
                </Button>
              )}
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}
