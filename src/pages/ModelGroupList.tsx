import { useMemo, useState } from 'react'
import {
  Button,
  Cascader,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd'
import type { CSSProperties } from 'react'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import { DEFAULT_MODEL_GROUP_ID, useChannels, useModelGroups, useModels } from '../store'
import { modelTypeLabel } from '../constants'
import type { ModelApiConfig, ModelGroup, ModelGroupType, ModelItem } from '../types'

const { Text } = Typography
type GroupForm = Pick<ModelGroup, 'name' | 'description' | 'sort'> & { enabled: boolean }
type ShowFilter = 'all' | 'enabled' | 'disabled'

interface ModelFilter {
  vendor: string
  apiPath: string[]
  name: string
}
const emptyModelFilter: ModelFilter = { vendor: 'all', apiPath: [], name: '' }
/** 级联第二级的「全部」选项：等价于只选到渠道一级，即该渠道下所有 API 名称 */
const API_ALL = 'all'
/** 组内模型信息折叠时展示的行数，超出后提供展开/收起 */
const COLLAPSED_MODEL_LINES = 3
/** 手机号中间 4 位脱敏：138****5182（与用户管理列表展示口径一致） */
const maskPhone = (phone: string) => (phone.length > 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone)

export default function ModelGroupList() {
  const { modelGroups, addModelGroup, updateModelGroup, removeModelGroup, setModelGroupModels } = useModelGroups()
  const { models } = useModels()
  const { channels } = useChannels()
  const { token } = theme.useToken()

  const [tab, setTab] = useState<ModelGroupType>('official')
  const official = tab === 'official'

  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<ShowFilter>('all')
  /** 用户自定义分组专属：创建用户的昵称/手机号、账户ID */
  const [userKw, setUserKw] = useState('')
  const [accountId, setAccountId] = useState('')
  /** 官方分组专属：按组内模型名称搜索 */
  const [modelName, setModelName] = useState('')
  const [query, setQuery] = useState({
    keyword: '',
    status: 'all' as ShowFilter,
    userKw: '',
    accountId: '',
    modelName: '',
  })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ModelGroup | null>(null)
  const [form] = Form.useForm<GroupForm>()

  const [modelGroup, setModelGroup] = useState<ModelGroup | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [modelFilter, setModelFilter] = useState<ModelFilter>(emptyModelFilter)
  const [appliedModelFilter, setAppliedModelFilter] = useState<ModelFilter>(emptyModelFilter)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const modelMap = useMemo(() => new Map(models.map((model) => [model.id, model])), [models])
  const channelMap = useMemo(() => new Map(channels.map((channel) => [channel.id, channel])), [channels])

  const configsOf = (model: ModelItem) => model.apiConfigs ?? []
  const channelNameOf = (channelId: string) => channelMap.get(channelId)?.name ?? '—'
  const apiNameOf = (cfg: ModelApiConfig) =>
    channelMap.get(cfg.channelId)?.apiCredentials?.find((cred) => cred.id === cfg.credentialId)?.apiName ?? '—'

  /**
   * 组内模型逐条展开为「模型名称 / 渠道 / 倍率名称 倍率」一行，同一模型的多个 API 配置各占一行；
   * 若该模型有倍率被单独加入过分组，则只展示被选中的那几条倍率。
   */
  const modelLines = (group: ModelGroup) => {
    const picked = new Set(group.configIds ?? [])
    return group.modelIds.flatMap((id) => {
      const model = modelMap.get(id)
      if (!model) return ['模型已删除']
      const list = configsOf(model)
      const selected = list.filter((config) => picked.has(config.id))
      const shown = selected.length ? selected : list
      return shown.length
        ? shown.map(
            (config) =>
              `${model.name} / ${channelNameOf(config.channelId)} / ${config.multiplierName ?? '—'} ${
                config.modelMultiplier ?? 1
              }x`,
          )
        : [`${model.name} / — / —`]
    })
  }

  const vendorOptions = useMemo(() => {
    const set = Array.from(new Set(models.map((m) => m.vendor).filter(Boolean)))
    return [{ value: 'all', label: '全部' }, ...set.map((v) => ({ value: v, label: v }))]
  }, [models])

  const apiPathOptions = useMemo(
    () =>
      channels.map((channel) => ({
        value: channel.id,
        label: channel.name,
        children: channel.apiCredentials?.length
          ? [
              { value: API_ALL, label: '全部' },
              ...channel.apiCredentials.map((cred) => ({ value: cred.id, label: cred.apiName })),
            ]
          : undefined,
      })),
    [channels],
  )

  const filteredModels = useMemo(() => {
    const f = appliedModelFilter
    const kw = f.name.trim().toLowerCase()
    const channelId = f.apiPath[0]
    const credentialId = f.apiPath[1] === API_ALL ? undefined : f.apiPath[1]
    return models.filter((m) => {
      const matchVendor = f.vendor === 'all' || m.vendor === f.vendor
      const matchName = !kw || m.name.toLowerCase().includes(kw)
      const matchApi =
        !channelId ||
        configsOf(m).some((cfg) =>
          credentialId
            ? cfg.channelId === channelId && cfg.credentialId === credentialId
            : cfg.channelId === channelId,
        )
      return matchVendor && matchApi && matchName
    })
  }, [models, appliedModelFilter])

  const filtered = useMemo(
    () =>
      modelGroups.filter((group) => {
        if (group.groupType !== tab) return false
        if (!group.name.toLowerCase().includes(query.keyword.trim().toLowerCase())) return false
        /** 官方分组：命中组内任一模型名称即可，再叠加是否对外展示 */
        if (tab === 'official') {
          const modelKw = query.modelName.trim().toLowerCase()
          if (modelKw && !group.modelIds.some((id) => modelMap.get(id)?.name.toLowerCase().includes(modelKw)))
            return false
          return query.status === 'all' || group.status === query.status
        }
        /** 用户自定义分组按创建用户筛选：昵称或手机号任一命中即可，手机号按完整号码匹配（列表仅展示脱敏值） */
        const owner = group.owner
        const userKw = query.userKw.trim().toLowerCase()
        const accKw = query.accountId.trim().toLowerCase()
        if (userKw && !(owner?.nickname.toLowerCase().includes(userKw) || owner?.phone.includes(userKw))) return false
        if (accKw && !owner?.accountId.toLowerCase().includes(accKw)) return false
        return true
      }),
    [modelGroups, modelMap, query, tab],
  )

  const perform = (action: () => void, text: string) => {
    try {
      action()
      message.success(text)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const switchTab = (key: string) => {
    const empty = { keyword: '', status: 'all' as ShowFilter, userKw: '', accountId: '', modelName: '' }
    setTab(key as ModelGroupType)
    setKeyword('')
    setStatus('all')
    setUserKw('')
    setAccountId('')
    setModelName('')
    setQuery(empty)
    setExpandedGroups([])
  }

  /** 点击搜索或输入框回车：把当前输入的条件一次性提交为生效条件 */
  const submitSearch = () => setQuery({ keyword, status, userKw, accountId, modelName })

  const toggleGroupExpand = (id: string) =>
    setExpandedGroups((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))

  const openPicker = (group: ModelGroup) => {
    setModelGroup(group)
    setSelectedIds(group.modelIds.filter((id) => modelMap.has(id)))
    setModelFilter(emptyModelFilter)
    setAppliedModelFilter(emptyModelFilter)
  }

  const columns: ColumnsType<ModelGroup> = [
    { title: '分组名称', dataIndex: 'name', width: 180, fixed: 'left' },
    {
      title: '组内模型信息（模型名称/渠道/倍率）',
      width: 380,
      render: (_, group) => {
        const lines = modelLines(group)
        if (!lines.length) return <Text type="secondary">—</Text>
        const expanded = expandedGroups.includes(group.id)
        const visible = expanded ? lines : lines.slice(0, COLLAPSED_MODEL_LINES)
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            {visible.map((line, index) => (
              <Text key={`${group.id}-${index}`} ellipsis={{ tooltip: line }} style={{ display: 'block' }}>
                {line}
              </Text>
            ))}
            {lines.length > COLLAPSED_MODEL_LINES && (
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 'auto' }}
                onClick={() => toggleGroupExpand(group.id)}
              >
                {expanded ? '收起' : `展开（共 ${lines.length} 条）`}
              </Button>
            )}
          </Space>
        )
      },
    },
    /** 描述、是否对外展示、展示顺序均为后台维护字段，只属于官方分组 */
    ...(official
      ? ([
          {
            title: '描述',
            dataIndex: 'description',
            width: 220,
            ellipsis: true,
            render: (value?: string) =>
              value ? <Tooltip title={value}>{value}</Tooltip> : <Text type="secondary">—</Text>,
          },
          {
            title: '是否对外展示',
            dataIndex: 'status',
            width: 120,
            render: (value: ModelGroup['status'], group: ModelGroup) => (
              <Switch
                size="small"
                checked={value === 'enabled'}
                disabled={group.id === DEFAULT_MODEL_GROUP_ID}
                onChange={(checked) =>
                  perform(
                    () => updateModelGroup(group.id, { status: checked ? 'enabled' : 'disabled' }),
                    checked ? '已对外展示' : '已取消对外展示',
                  )
                }
              />
            ),
          },
          { title: '展示顺序', dataIndex: 'sort', width: 100 },
        ] as ColumnsType<ModelGroup>)
      : []),
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 190,
      render: (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false }),
    },
    official
      ? ({ title: '操作人', dataIndex: 'operator', width: 150 } as ColumnsType<ModelGroup>[number])
      : ({
          title: '用户信息',
          width: 200,
          render: (_, group) =>
            group.owner ? (
              <Space direction="vertical" size={2}>
                <Text strong>{group.owner.nickname}</Text>
                <Text type="secondary">{maskPhone(group.owner.phone)}</Text>
                <Text type="secondary">{group.owner.accountId}</Text>
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            ),
        } as ColumnsType<ModelGroup>[number]),
    /** 用户自定义分组由前台用户创建，后台完全只读，不提供任何操作 */
    ...(official
      ? ([
          {
            title: '操作',
            width: 240,
            fixed: 'right',
            render: (_: unknown, group: ModelGroup) => (
              <Space size={0}>
                <Button type="link" onClick={() => openPicker(group)}>
                  添加模型
                </Button>
                <Button
                  type="link"
                  disabled={group.id === DEFAULT_MODEL_GROUP_ID}
                  onClick={() => {
                    setEditing(group)
                    setOpen(true)
                  }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除该分组吗？"
                  okText="确定"
                  cancelText="取消"
                  disabled={group.id === DEFAULT_MODEL_GROUP_ID}
                  onConfirm={() => perform(() => removeModelGroup(group.id), '分组已删除')}
                >
                  <Button type="link" danger disabled={group.id === DEFAULT_MODEL_GROUP_ID}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ] as ColumnsType<ModelGroup>)
      : []),
  ]

  const save = async () => {
    try {
      const v = await form.validateFields()
      const data = {
        name: v.name,
        description: v.description,
        sort: v.sort,
        status: v.enabled ? ('enabled' as const) : ('disabled' as const),
      }
      perform(
        () => (editing ? updateModelGroup(editing.id, data) : addModelGroup(data)),
        editing ? '分组已更新' : '分组已创建',
      )
      setOpen(false)
    } catch {
      /* 校验失败，不处理 */
    }
  }

  const pillStyle: CSSProperties = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: token.borderRadiusSM,
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    fontSize: 12,
  }

  const stackedCell = (model: ModelItem, text: (cfg: ModelApiConfig) => string, width: number) => (
    <Space direction="vertical" size={2}>
      {configsOf(model).map((cfg) => (
        <Text key={cfg.id} ellipsis style={{ display: 'block', maxWidth: width }}>
          {text(cfg)}
        </Text>
      ))}
    </Space>
  )

  const modelPickerColumns: ColumnsType<ModelItem> = [
    { title: '模型名称', dataIndex: 'name', width: 170, render: (v: string) => <Text strong>{v}</Text> },
    {
      title: '倍率名称 / 倍率',
      width: 160,
      render: (_, m) => {
        const list = configsOf(m)
        if (!list.length) return <Text type="secondary">—</Text>
        return (
          <Space direction="vertical" size={2}>
            {list.map((cfg) => (
              <span key={cfg.id} style={pillStyle}>
                {cfg.multiplierName || '—'} · {cfg.modelMultiplier ?? 1}x
              </span>
            ))}
          </Space>
        )
      },
    },
    {
      title: '渠道',
      width: 150,
      render: (_, m) =>
        configsOf(m).length ? stackedCell(m, (cfg) => channelNameOf(cfg.channelId), 150) : <Text type="secondary">—</Text>,
    },
    {
      title: 'API名称',
      width: 160,
      render: (_, m) =>
        configsOf(m).length ? stackedCell(m, apiNameOf, 160) : <Text type="secondary">—</Text>,
    },
    {
      title: '模型类型',
      dataIndex: 'type',
      width: 100,
      render: (v: ModelItem['type']) => <Tag>{modelTypeLabel(v)}</Tag>,
    },
    {
      title: '生产商',
      dataIndex: 'vendor',
      width: 110,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
  ]

  return (
    <>
      <PageShell
        breadcrumb={['模型管理', '模型分组']}
        topExtra={
          <Tabs
            activeKey={tab}
            onChange={switchTab}
            items={[
              { key: 'official', label: '官方分组' },
              { key: 'custom', label: '用户自定义分组' },
            ]}
          />
        }
        listTitle="模型分组列表"
        total={filtered.length}
        hideTotal={!official}
        onAdd={
          official
            ? () => {
                setEditing(null)
                setOpen(true)
              }
            : undefined
        }
        addText="新增分组"
        onSearch={submitSearch}
        onReset={() => {
          setKeyword('')
          setStatus('all')
          setUserKw('')
          setAccountId('')
          setModelName('')
          setQuery({ keyword: '', status: 'all', userKw: '', accountId: '', modelName: '' })
        }}
        searchFields={
          <>
            <SearchField label="分组名称">
              <Input
                value={keyword}
                allowClear
                placeholder="请输入分组名称"
                style={{ width: 220 }}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={submitSearch}
              />
            </SearchField>
            {!official && (
              <>
                <SearchField label="用户昵称/手机号">
                  <Input
                    value={userKw}
                    allowClear
                    placeholder="请输入用户昵称或手机号"
                    style={{ width: 220 }}
                    onChange={(e) => setUserKw(e.target.value)}
                    onPressEnter={submitSearch}
                  />
                </SearchField>
                <SearchField label="用户账户ID">
                  <Input
                    value={accountId}
                    allowClear
                    placeholder="请输入用户账户ID"
                    style={{ width: 220 }}
                    onChange={(e) => setAccountId(e.target.value)}
                    onPressEnter={submitSearch}
                  />
                </SearchField>
              </>
            )}
            {official && (
              <>
                <SearchField label="模型名称">
                  <Input
                    value={modelName}
                    allowClear
                    placeholder="请输入组内模型名称"
                    style={{ width: 220 }}
                    onChange={(e) => setModelName(e.target.value)}
                    onPressEnter={submitSearch}
                  />
                </SearchField>
                <SearchField label="是否对外展示">
                  <Select
                    value={status}
                    style={{ width: 140 }}
                    onChange={setStatus}
                    options={[
                      { value: 'all', label: '全部' },
                      { value: 'enabled', label: '已对外展示' },
                      { value: 'disabled', label: '未对外展示' },
                    ]}
                  />
                </SearchField>
              </>
            )}
          </>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{ showTotal: (total) => `共 ${total} 条记录` }}
        />
      </PageShell>

      <Modal
        title={editing ? '编辑分组' : '新增分组'}
        open={open}
        centered
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
        onCancel={() => setOpen(false)}
        onOk={save}
        afterOpenChange={(visible) => {
          if (visible)
            form.setFieldsValue(
              editing
                ? { ...editing, enabled: editing.status === 'enabled' }
                : { name: '', description: '', sort: 1, enabled: true },
            )
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入分组名称' }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea maxLength={500} showCount rows={3} />
          </Form.Item>
          <Form.Item label="展示顺序" name="sort" rules={[{ required: true }]}>
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="是否对外展示" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`添加模型 · ${modelGroup?.name ?? ''}`}
        open={!!modelGroup}
        centered
        width={900}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        onCancel={() => setModelGroup(null)}
        onOk={() => {
          if (modelGroup) {
            perform(() => setModelGroupModels(modelGroup.id, selectedIds), '组内模型已更新')
            setModelGroup(null)
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <SearchField label="生产商">
            <Select
              value={modelFilter.vendor}
              style={{ width: 140 }}
              options={vendorOptions}
              onChange={(v) => setModelFilter({ ...modelFilter, vendor: v })}
            />
          </SearchField>
          <SearchField label="渠道/API名称">
            <Cascader
              value={modelFilter.apiPath}
              options={apiPathOptions}
              changeOnSelect
              allowClear
              showSearch
              placeholder="全部"
              style={{ width: 260 }}
              onChange={(value) => setModelFilter({ ...modelFilter, apiPath: (value ?? []).map(String) })}
            />
          </SearchField>
          <SearchField label="模型名称">
            <Input
              value={modelFilter.name}
              allowClear
              placeholder="请输入模型名称"
              style={{ width: 160 }}
              onChange={(e) => setModelFilter({ ...modelFilter, name: e.target.value })}
              onPressEnter={() => setAppliedModelFilter(modelFilter)}
            />
          </SearchField>
          <Space>
            <Button type="primary" onClick={() => setAppliedModelFilter(modelFilter)}>
              搜索
            </Button>
            <Button
              onClick={() => {
                setModelFilter(emptyModelFilter)
                setAppliedModelFilter(emptyModelFilter)
              }}
            >
              重置
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">已选择 {selectedIds.length} 个模型</Text>
        </div>

        <Table
          rowKey="id"
          size="small"
          columns={modelPickerColumns}
          dataSource={filteredModels}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedIds,
            preserveSelectedRowKeys: true,
            onChange: (keys) => setSelectedIds(keys as string[]),
          }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `共 ${total} 条记录` }}
          scroll={{ y: 360 }}
        />
      </Modal>
    </>
  )
}
