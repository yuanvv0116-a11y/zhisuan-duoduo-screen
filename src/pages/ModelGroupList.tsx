import { useMemo, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tooltip, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ModelPickerModal from '../components/ModelPickerModal'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import { DEFAULT_MODEL_GROUP_ID, useChannels, useModelGroups, useModels } from '../store'
import type { ModelGroup, ModelGroupType, ModelItem } from '../types'

const { Text } = Typography
type GroupForm = Pick<ModelGroup, 'name' | 'description' | 'sort'> & { enabled: boolean }
type ShowFilter = 'all' | 'enabled' | 'disabled'
/** 组内模型信息折叠时展示的行数，超出后提供展开/收起 */
const COLLAPSED_MODEL_LINES = 3
/** 手机号中间 4 位脱敏：138****5182（与用户管理列表展示口径一致） */
const maskPhone = (phone: string) => (phone.length > 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone)

export default function ModelGroupList() {
  const { modelGroups, addModelGroup, updateModelGroup, removeModelGroup, setModelGroupModels } = useModelGroups()
  const { models } = useModels()
  const { channels } = useChannels()

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
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const modelMap = useMemo(() => new Map(models.map((model) => [model.id, model])), [models])
  const channelMap = useMemo(() => new Map(channels.map((channel) => [channel.id, channel])), [channels])

  const configsOf = (model: ModelItem) => model.apiConfigs ?? []
  const channelNameOf = (channelId: string) => channelMap.get(channelId)?.name ?? '—'

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

  /** 列表按创建时间倒序展示（store 内的展示顺序仅决定前台排序） */
  const filtered = useMemo(
    () =>
      modelGroups
        .filter((group) => {
          if (group.groupType !== tab) return false
          if (!group.name.toLowerCase().includes(query.keyword.trim().toLowerCase())) return false
          /** 官方分组：命中组内任一模型名称即可，再叠加是否对外展示 */
          if (tab === 'official') {
            const modelKw = query.modelName.trim().toLowerCase()
            if (modelKw && !group.modelIds.some((id) => modelMap.get(id)?.name.toLowerCase().includes(modelKw)))
              return false
            return query.status === 'all' || group.status === query.status
          }
          /** 用户自定义分组按创建用户筛选：昵称 / 手机号任一模糊命中即可，用户账户 ID 须完整精确匹配 */
          const owner = group.owner
          const userKw = query.userKw.trim().toLowerCase()
          const accId = query.accountId.trim().toLowerCase()
          if (userKw && !(owner?.nickname.toLowerCase().includes(userKw) || owner?.phone.includes(userKw))) return false
          if (accId && owner?.accountId.toLowerCase() !== accId) return false
          return true
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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

  /**
   * 打开弹窗时回填为「倍率行」勾选：已按倍率加入过的沿用之；
   * 只按模型加入过（未指定倍率）的模型，展开为该模型的全部倍率，与列表「组内模型信息」口径一致。
   */
  const openPicker = (group: ModelGroup) => {
    setModelGroup(group)
    const picked = new Set(group.configIds ?? [])
    setSelectedIds(
      group.modelIds.flatMap((id) => {
        const model = modelMap.get(id)
        if (!model) return []
        const list = configsOf(model)
        if (!list.length) return [id]
        const selected = list.filter((cfg) => picked.has(cfg.id))
        return (selected.length ? selected : list).map((cfg) => cfg.id)
      }),
    )
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

  /** 官方分组内组名不可重复（忽略大小写与首尾空格），编辑时排除自身 */
  const officialNameDuplicated = (name: string) => {
    const target = name.trim().toLowerCase()
    return modelGroups.some(
      (group) =>
        group.groupType === 'official' && group.id !== editing?.id && group.name.trim().toLowerCase() === target,
    )
  }

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
      /* 校验失败，不关闭弹窗 */
    }
  }

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
        titleExtra={
          <RequirementDot
            title="模型分组（管理后台） · 页面与列表"
            sections={[
              {
                label: '',
                items: [
                  '1.页面分为「官方分组」与「用户自定义分组」两个 tab，官方分组为在管理后台设置后展示给用户的分组，用户不可修改；用户自定义分组为用户添加的，后台不可修改；默认展示官方分组，切换页签即切换列表数据与搜索条件。',
                  '2.列表字段展示如图，按照创建时间倒序展示。',
                  '3.组内模型信息一行一条「模型名称 / 渠道 / 倍率名称 倍率x」，超过 3 条折叠，可点「展开（共 N 条）」查看全部，再点「收起」还原。',
                  '4.「是否对外展示」开启时，用户才可查看该分组，关闭时不展示；默认分组不可关闭对外展示、不可编辑、不可删除，仅可添加/编辑模型。',
                  '5.「用户自定义分组」不展示操作列，仅提供查看与搜索。',
                  '6.删除分组需二次确认「确定删除该分组吗？」，确认后提示「分组已删除」。',
                ],
              },
            ]}
          />
        }
        searchExtra={
          <RequirementDot
            title="模型分组（管理后台） · 搜索与筛选"
            sections={[
              {
                label: '',
                items: [
                  '1.「分组名称」：模糊搜索，忽略大小写。',
                  '2.模型名称模糊搜索、是否对外展示（全部 / 已对外展示 / 未对外展示）。',
                  '3.用户昵称/手机号模糊搜索、用户账户 ID精确搜索。',
                ],
              },
            ]}
          />
        }
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
        title={
          <Space size={6}>
            {editing ? '编辑分组' : '新增分组'}
            <RequirementDot
              title="新增 / 编辑分组"
              sections={[
                {
                  label: '',
                  items: [
                  '1.分组名称（必填，最多 10 字）、描述（选填，最多100 字）、展示顺序（必填，整数，大号优先展示，默认9999）、是否对外展示（开关，默认开启）。',
                  '2.官方分组内，组名不可重复。',
                  '3.保存成功提示「分组已创建」',
                ],
                },
              ]}
            />
          </Space>
        }
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
                : { name: '', description: '', sort: 9999, enabled: true },
            )
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入分组名称' },
              {
                validator: (_, value: string) =>
                  value && officialNameDuplicated(value)
                    ? Promise.reject(new Error('该分组名称已存在'))
                    : Promise.resolve(),
              },
            ]}
          >
            <Input maxLength={10} showCount />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea maxLength={100} showCount rows={3} />
          </Form.Item>
          <Form.Item
            label="展示顺序"
            name="sort"
            tooltip="大号优先展示：数值越大越靠前，默认 9999"
            rules={[{ required: true, message: '请输入展示顺序' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="是否对外展示" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <ModelPickerModal
        open={!!modelGroup}
        title={
          <Space size={6}>
            {`添加模型 · ${modelGroup?.name ?? ''}`}
            <RequirementDot
              title="添加模型 · 组内模型维护"
              sections={[
                {
                  label: '',
                  items: [
                    '1.筛选：生产商（下拉）、渠道 / API 名称（级联，先选渠道再选其下 API，可只选到渠道）、模型名称（模糊搜索）。',
                    '2.列表为树形结构：父节点是模型（生产厂商展示在模型名称前），子节点是该模型下的各条倍率（含所属渠道与 API 名称）；勾选父节点即选中其下全部倍率，可跨模型多选，支持「展开全部 / 收起全部」。',
                    '3.点击「保存」检查模型是否存在，均存在，保存成功，建立模型倍率和分组的关联关系。有模型不存在则提示「xx模型不存在，是否保存其他模型？」【确认】保存其他模型，取消则关闭提示，刷新弹窗信息。',
                  ],
                },
              ]}
            />
          </Space>
        }
        initialSelected={selectedIds}
        onCancel={() => setModelGroup(null)}
        onOk={(keys) => {
          if (modelGroup) {
            perform(() => setModelGroupModels(modelGroup.id, keys), '组内模型已更新')
            setModelGroup(null)
          }
        }}
      />
    </>
  )
}
