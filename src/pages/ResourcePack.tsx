import { useMemo, useState } from 'react'
import {
  Input,
  Select,
  Table,
  Tag,
  Typography,
  Space,
  Modal,
  Switch,
  InputNumber,
  Button,
  Popconfirm,
  Form,
  Tooltip,
  message,
} from 'antd'
import {
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import RequirementDot from '../components/RequirementDot'
import { useResourcePacks, useModels, useChannels } from '../store'
import { pricingModeLabel } from '../constants'
import type {
  ResourcePack,
  PackModelPricing,
  PackPricingMode,
  PackPricingTier,
  PricingMode,
  TokenPriceBreakdown,
} from '../types'

const { Text } = Typography

/** 根据原模型 pricingMode 返回可用的折扣方式：仅 token 模型支持按 Token 用量，所有模型支持按金额 */
const availablePackModes = (pricingMode: PricingMode): PackPricingMode[] => {
  if (pricingMode === 'token') return ['token_ladder', 'amount_ladder']
  return ['amount_ladder']
}

/** 默认阶梯：第1档（按模式给合理开始/结束默认值，折扣 90%） */
const defaultTiers = (mode: PackPricingMode): PackPricingTier[] => {
  const end = mode === 'token_ladder' ? 1000000 : 100
  return [{ start: 0, threshold: end, discount: 90 }]
}

const PRICE_KEYS: (keyof TokenPriceBreakdown)[] = ['input', 'output', 'cacheRead', 'cacheCreate']
const PRICE_LABELS: Record<keyof TokenPriceBreakdown, string> = {
  input: '输入',
  output: '输出',
  cacheRead: '缓存读',
  cacheCreate: '缓存建',
}

/** 根据模型 ID 生成稳定的价格（与 ModelList 保持一致） */
function deterministicPrice(id: string, base: number) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const r = (h % 1000) / 1000
  return Math.round(base * (0.6 + r * 0.8) * 10000) / 10000
}
/** Token 计费模型的成本价明细：输入 / 输出 / 缓存读取 / 缓存创建（元/千Token） */
const tokenCostOf = (id: string): TokenPriceBreakdown => ({
  input: deterministicPrice(id + '_cin', 0.0008),
  output: deterministicPrice(id + '_cout', 0.0024),
  cacheRead: deterministicPrice(id + '_cread', 0.0002),
  cacheCreate: deterministicPrice(id + '_ccreate', 0.0008),
})
/** Token 计费模型的对外售价明细（成本×1.4） */
const tokenSellOf = (id: string): TokenPriceBreakdown => {
  const c = tokenCostOf(id)
  return {
    input: Math.round(c.input * 1.4 * 10000) / 10000,
    output: Math.round(c.output * 1.4 * 10000) / 10000,
    cacheRead: Math.round(c.cacheRead * 1.4 * 10000) / 10000,
    cacheCreate: Math.round(c.cacheCreate * 1.4 * 10000) / 10000,
  }
}
/** 非 Token 计费模型的统一单价（元/次等） */
const singleCostOf = (id: string) => deterministicPrice(id, 0.8)
const singleSellOf = (id: string) => Math.round(singleCostOf(id) * 1.4 * 10000) / 10000

/** 根据计费形式返回单位 */
const baseUnitOf = (pricingMode: PricingMode): string => {
  switch (pricingMode) {
    case 'token':
      return '元/千Token'
    case 'call':
    case 'image_quality':
      return '元/次'
    case 'video_quality_token':
      return '元/千Token'
    case 'free':
      return '免费'
    default:
      return '元'
  }
}

/** 将单一折扣应用到明细价（元/千Token 等），得到折后价 */
const applyDiscount = (bp: TokenPriceBreakdown, discount: number): TokenPriceBreakdown => ({
  input: Math.round((bp.input * discount) / 100 * 10000) / 10000,
  output: Math.round((bp.output * discount) / 100 * 10000) / 10000,
  cacheRead: Math.round((bp.cacheRead * discount) / 100 * 10000) / 10000,
  cacheCreate: Math.round((bp.cacheCreate * discount) / 100 * 10000) / 10000,
})

/** 根据原模型创建包内模型定价初始值（成本/售价/单位只读） */
const createPackModel = (m: { id: string; name: string; pricingMode: PricingMode }): PackModelPricing => {
  const modes = availablePackModes(m.pricingMode)
  const packPricingMode = modes[0]
  const basePrices: TokenPriceBreakdown =
    m.pricingMode === 'token'
      ? tokenSellOf(m.id)
      : { input: 0, output: singleSellOf(m.id), cacheRead: 0, cacheCreate: 0 }
  return {
    modelId: m.id,
    modelName: m.name,
    pricingMode: m.pricingMode,
    packPricingMode,
    basePrices,
    baseUnit: baseUnitOf(m.pricingMode),
    tiers: defaultTiers(packPricingMode),
    rpm: 30,
    tpm: 50000,
  }
}

/* ---------------- 阈值单位说明 ---------------- */
const thresholdUnit = (mode: PackPricingMode): string =>
  mode === 'token_ladder' ? 'Token' : '元'

/* ---------------- 弹窗表单状态 ---------------- */
interface FormState {
  name: string
  status: 'on' | 'off'
  models: PackModelPricing[]
}

const emptyForm: FormState = {
  name: '',
  status: 'on',
  models: [],
}

export default function ResourcePackPage() {
  const { packs, addPack, updatePack, removePack } = useResourcePacks()
  const { models } = useModels()
  const { channels } = useChannels()

  const channelNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    channels.forEach((c) => (m[c.id] = c.name))
    return m
  }, [channels])

  /* 搜索 */
  const [qName, setQName] = useState('')
  const [qStatus, setQStatus] = useState<'all' | 'on' | 'off'>('all')
  const [appliedName, setAppliedName] = useState('')
  const [appliedStatus, setAppliedStatus] = useState<'all' | 'on' | 'off'>('all')

  const filtered = useMemo(() => {
    return packs.filter((p) => {
      if (appliedName && !p.name.toLowerCase().includes(appliedName.toLowerCase())) return false
      if (appliedStatus !== 'all' && p.status !== appliedStatus) return false
      return true
    })
  }, [packs, appliedName, appliedStatus])

  const handleSearch = () => {
    setAppliedName(qName)
    setAppliedStatus(qStatus)
  }
  const handleReset = () => {
    setQName('')
    setQStatus('all')
    setAppliedName('')
    setAppliedStatus('all')
  }

  /* 弹窗 */
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (pack: ResourcePack) => {
    setEditingId(pack.id)
    setForm({
      name: pack.name,
      status: pack.status,
      models: pack.models.map((m) => ({
        ...m,
        tiers: [{ ...m.tiers[0] }],
      })),
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      message.error('请输入资源包名称')
      return
    }
    if (form.models.length === 0) {
      message.error('请至少选择一个模型')
      return
    }
    // 校验阶梯
    for (const m of form.models) {
      if (m.tiers.length === 0) {
        message.error(`模型「${m.modelName}」至少需要 1 个阶梯`)
        return
      }
      const tiers = m.tiers
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i]
        if (t.start < 0) {
          message.error(`模型「${m.modelName}」第 ${i + 1} 档开始值不能为负数`)
          return
        }
        if (t.threshold <= t.start) {
          message.error(`模型「${m.modelName}」第 ${i + 1} 档结束值必须大于开始值`)
          return
        }
        if (t.discount < 1 || t.discount > 100) {
          message.error(`模型「${m.modelName}」第 ${i + 1} 档折扣必须在 1~100 之间`)
          return
        }
      }
    }

    const payload = {
      name: form.name.trim(),
      status: form.status,
      models: form.models,
    }

    if (editingId) {
      updatePack(editingId, payload)
      message.success('资源包已更新')
    } else {
      addPack(payload)
      message.success('资源包已创建')
    }
    setModalOpen(false)
  }

  /* 模型选择弹窗 */
  const openModelPicker = () => {
    setSelectedModelIds(form.models.map((m) => m.modelId))
    setModelPickerOpen(true)
  }

  const confirmModelPicker = () => {
    const existing = new Map(form.models.map((m) => [m.modelId, m]))
    const newModels: PackModelPricing[] = selectedModelIds.map((id) => {
      const found = models.find((m) => m.id === id)
      if (!found) return existing.get(id)!
      return (
        existing.get(id) ??
        createPackModel({ id: found.id, name: found.name, pricingMode: found.pricingMode })
      )
    })
    setForm({ ...form, models: newModels })
    setModelPickerOpen(false)
  }

  /* 修改包内模型定价 */
  const updatePackModel = (modelId: string, patch: Partial<PackModelPricing>) => {
    setForm({
      ...form,
      models: form.models.map((m) => (m.modelId === modelId ? { ...m, ...patch } : m)),
    })
  }

  const removePackModel = (modelId: string) => {
    setForm({ ...form, models: form.models.filter((m) => m.modelId !== modelId) })
  }

  /* 阶梯操作 */
  const updateTier = (modelId: string, idx: number, patch: Partial<PackPricingTier>) => {
    const model = form.models.find((m) => m.modelId === modelId)
    if (!model) return
    const tiers = model.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    updatePackModel(modelId, { tiers })
  }

  /* 列表列 */
  const columns: ColumnsType<ResourcePack> = [
    {
      title: '资源包名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '包含模型',
      key: 'models',
      width: 120,
      align: 'center',
      render: (_, r) => {
        if (r.models.length === 0) return <Text type="secondary">—</Text>
        return (
          <Tooltip
            title={
              <div style={{ lineHeight: 1.8 }}>
                {r.models.map((m) => (
                  <div key={m.modelId}>
                    {m.modelName}
                    {m.tiers.map((t, i) => (
                      <span key={i} style={{ paddingLeft: 8, color: 'rgba(255,255,255,0.65)' }}>
                        折扣 {t.discount}%
                        {i < m.tiers.length - 1 ? '，' : ''}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            }
          >
            <Text style={{ cursor: 'pointer', color: '#2f6bff' }}>{r.models.length}</Text>
          </Tooltip>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (v: 'on' | 'off', r) => (
        <Switch
          size="small"
          checked={v === 'on'}
          checkedChildren="上架"
          unCheckedChildren="下架"
          onChange={(checked) => {
            updatePack(r.id, { status: checked ? 'on' : 'off' })
            message.success(checked ? '资源包已上架' : '资源包已下架')
          }}
        />
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 140,
      render: (_, r) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该资源包？"
            onConfirm={() => {
              removePack(r.id)
              message.success('已删除')
            }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  /* 模型选择表格列 */
  const modelPickerColumns: ColumnsType<(typeof models)[0]> = [
    {
      title: '模型名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '渠道商',
      key: 'channels',
      width: 200,
      render: (_, r) => {
        const list = r.apiConfigs ?? []
        if (!list.length) return <Text type="secondary">—</Text>
        const unique = Array.from(new Set(list.map((a) => a.channelId)))
        return (
          <Space size={[4, 4]} wrap>
            {unique.map((cid) => (
              <Tag key={cid} color="blue">
                {channelNameMap[cid] ?? '—'}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: '计费形式',
      dataIndex: 'pricingMode',
      key: 'pricingMode',
      width: 140,
      render: (v: PricingMode) => (
        <Tag color={v === 'token' ? 'blue' : 'geekblue'}>{pricingModeLabel(v)}</Tag>
      ),
    },
    {
      title: '上架状态',
      dataIndex: 'online',
      key: 'online',
      width: 100,
      align: 'center',
      render: (v: boolean) =>
        v ? <Tag color="green">已上架</Tag> : <Tag color="red">已下架</Tag>,
    },
  ]

  return (
    <PageShell
      breadcrumb={['模型管理', '资源包管理']}
      searchFields={
        <>
          <SearchField label="资源包名称">
            <Input
              allowClear
              placeholder="请输入资源包名称"
              style={{ width: 220 }}
              value={qName}
              onChange={(e) => setQName(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="状态">
            <Select
              style={{ width: 160 }}
              value={qStatus}
              onChange={setQStatus}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'on', label: '上架' },
                { value: 'off', label: '下架' },
              ]}
            />
          </SearchField>
        </>
      }
      onSearch={handleSearch}
      onReset={handleReset}
      listTitle="资源包列表"
      total={filtered.length}
      hideTotal
      addText="新增资源包"
      onAdd={openAdd}
      titleExtra={
        <RequirementDot
          title="资源包管理 — 需求点"
          sections={[
            {
              label: '产品定义',
              items: '资源包 = 将一系列模型打包成一个产品，包内模型单独计价',
            },
            {
              label: '上下架状态',
              items: ['资源包仅维护「上架 / 下架」状态'],
            },
            {
              label: '搜索',
              items: ['支持根据资源包名称模糊搜索、按照状态搜索'],
            },
            {
              label: '下架规则',
              items: [
                '点击下架，需要验证是否有已使用资源包',
                '如果有提示「当前资源包正在使用，下架后将同步移除所有在用资源包，是否确认？」',
                '【确认】为所有开通该资源包的账户关闭资源包，并下架资源包',
              ],
            },
            {
              label: '编辑规则',
              items: ['编辑资源包并保存后，按照新的资源包模型价格计费'],
            },
            {
              label: '删除规则',
              items: [
                '点击删除，需要验证是否有已使用资源包',
                '如果有提示「当前资源包正在使用，删除后将同步移除所有在用资源包，是否确认？」',
                '【确认】为所有开通该资源包的账户关闭资源包，并删除资源包',
                '此处要考虑计费的快照，以前用过哪个资源包消费过要有记录',
              ],
            },
          ]}
        />
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        pagination={{ showTotal: (t) => `共 ${t} 条记录`, pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        size="middle"
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={
          <Space size={6} align="center">
            {editingId ? '编辑资源包' : '新增资源包'}
            <RequirementDot
              title="新增资源包需求"
              sections={[
                {
                  label: '基础信息',
                  items: [
                    '资源包名称 50 字内不可重复',
                  ],
                },
                {
                  label: '选择模型',
                  items: [
                    '点击选择模型，展示所有未删除模型，先按照上下架状态优先展示上架模型，再按照上架时间倒序展示',
                    '支持多选',
                    '支持选择下架模型（下架模型放在资源包里允许被调用）',
                  ],
                },
                {
                  label: '折扣设置',
                  items: [
                    '折扣支持输入 0-100 的整数',
                    '设置完展示售价和折后价',
                  ],
                },
                {
                  label: '保存',
                  items: ['点击保存后保存信息，提示保存成功，返回列表刷新'],
                },
              ]}
            />
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        centered
        width={1000}
        destroyOnClose
      >
        {/* 基础信息 */}
        <Form layout="vertical" requiredMark>
          <Form.Item label="资源包名称" required>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="请输入名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={40}
                style={{ flex: 1 }}
              />
              {!editingId && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    border: '1px solid #d9d9d9',
                    borderLeft: 'none',
                    borderRadius: '0 6px 6px 0',
                    background: '#fff',
                    cursor: 'pointer',
                    height: 32,
                  }}
                >
                  <Switch
                    checked={form.status === 'on'}
                    onChange={(v) => setForm({ ...form, status: v ? 'on' : 'off' })}
                    checkedChildren="上架"
                    unCheckedChildren="下架"
                    size="small"
                  />
                </div>
              )}
            </Space.Compact>
          </Form.Item>
        </Form>

        {/* 包内模型定价 */}
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: '#fafafa',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Space>
              <Text strong>包含模型与定价</Text>
              <Text type="secondary">（{form.models.length} 个）</Text>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openModelPicker}>
              选择模型
            </Button>
          </div>

          {form.models.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              请点击「选择模型」添加模型
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.models.map((m) => {
                const isToken = m.pricingMode === 'token'
                const sellPrices = m.basePrices
                const priceKeys: (keyof TokenPriceBreakdown)[] = isToken
                  ? ['input', 'output', 'cacheRead', 'cacheCreate']
                  : ['output']
                const unitShort = m.baseUnit.replace('元/', '')

                return (
                  <div
                    key={m.modelId}
                    style={{
                      background: '#fff',
                      border: '1px solid #eef0f4',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    {/* 模型头：模型名称 + 删除按钮 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <Text strong>{m.modelName}</Text>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removePackModel(m.modelId)}
                      />
                    </div>

                    {/* 模型名称下方：模型渠道 + 计价方式 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 24,
                        marginBottom: 10,
                        padding: '8px 0',
                        borderBottom: '1px dashed #eef0f4',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          计价方式
                        </Text>
                        <Tag color="geekblue">{pricingModeLabel(m.pricingMode)}</Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          模型渠道
                        </Text>
                        {(() => {
                          const modelFull = models.find((mm) => mm.id === m.modelId)
                          const apis = modelFull?.apiConfigs ?? []
                          if (!apis.length) return <Text type="secondary">—</Text>
                          const cid = apis[0].channelId
                          return (
                            <Tag color="blue">{channelNameMap[cid] ?? '—'}</Tag>
                          )
                        })()}
                      </div>
                    </div>

                    {/* 阶梯卡片：折扣 + 售价 + 折后价 */}
                    <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 10 }}>
                      {m.tiers.map((t, idx) => {
                        const curPrices = applyDiscount(m.basePrices, t.discount)

                        const renderPriceRow = (
                          label: string,
                          prices: TokenPriceBreakdown,
                          color: string,
                          vertical = false,
                        ) => {
                          const items = priceKeys.map((k) => {
                            const val = prices[k]
                            const show = isToken ? val > 0 : k === 'output'
                            return (
                              <Text
                                key={k}
                                style={{
                                  color,
                                  fontWeight: 500,
                                  fontSize: 13,
                                  lineHeight: '20px',
                                }}
                              >
                                {PRICE_LABELS[k]} ¥
                                {show ? val.toFixed(4) : '—'}
                                {show && (
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11, marginLeft: 2 }}
                                  >
                                    /{unitShort}
                                  </Text>
                                )}
                              </Text>
                            )
                          })

                          if (vertical) {
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {label}
                                </Text>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    paddingLeft: 12,
                                  }}
                                >
                                  {items}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: 14,
                                flexWrap: 'wrap',
                              }}
                            >
                              <Text
                                type="secondary"
                                style={{ fontSize: 12, minWidth: 42 }}
                              >
                                {label}
                              </Text>
                              {items}
                            </div>
                          )
                        }

                        return (
                          <div
                            key={idx}
                            style={{
                              border: '1px solid #eef0f4',
                              borderRadius: 8,
                              padding: '12px 14px',
                              background: idx === m.tiers.length - 1 ? '#fafcff' : '#fff',
                            }}
                          >
                            {/* 首行：折扣 */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 10,
                              }}
                            >
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                折扣
                              </Text>
                              <InputNumber
                                value={t.discount}
                                onChange={(v) =>
                                  updateTier(m.modelId, idx, { discount: v ?? 100 })
                                }
                                min={1}
                                max={100}
                                step={1}
                                precision={0}
                                size="small"
                                style={{ width: 110 }}
                                suffix="%"
                              />
                            </div>
                            {/* 售价 / 折后价：两列横向并排，每列内部纵向 */}
                            <div
                              style={{
                                display: 'flex',
                                gap: 40,
                                paddingLeft: 4,
                                flexWrap: 'wrap',
                              }}
                            >
                              {renderPriceRow('售价', sellPrices, '#333', true)}
                              {renderPriceRow('折后价', curPrices, '#fa541c', true)}
                            </div>
                          </div>
                        )
                      })}
                    </Space>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* 模型选择弹窗 */}
      <Modal
        title="选择模型"
        open={modelPickerOpen}
        onCancel={() => setModelPickerOpen(false)}
        onOk={confirmModelPicker}
        okText="确认选择"
        cancelText="取消"
        centered
        width={700}
        destroyOnClose
      >
        <Table
          rowKey="id"
          columns={modelPickerColumns}
          dataSource={models}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedModelIds,
            onChange: (keys) => setSelectedModelIds(keys as string[]),
          }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="small"
          scroll={{ y: 360 }}
        />
      </Modal>
    </PageShell>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '1px solid #eef0f4',
  fontWeight: 500,
  fontSize: 12,
  color: '#8c8c8c',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid #f0f0f0',
}
