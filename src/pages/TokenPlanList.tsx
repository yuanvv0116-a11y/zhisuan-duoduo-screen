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
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import RequirementDot from '../components/RequirementDot'
import { useTokenPlans, useModels } from '../store'
import {
  calcPlanDiscountedPrice,
  type PlanLevel,
  type PlanUsagePeriod,
  type PlanValidityUnit,
  type TokenPlan,
} from '../types'

const { Text } = Typography

/* ---------------- 常量映射 ---------------- */
const LEVEL_LABEL: Record<PlanLevel, string> = {
  lite: 'Lite',
  standard: 'Standard',
  pro: 'Pro',
  max: 'Max',
}
const LEVEL_COLOR: Record<PlanLevel, string> = {
  lite: 'default',
  standard: 'blue',
  pro: 'gold',
  max: 'purple',
}
const VALIDITY_UNIT_LABEL: Record<PlanValidityUnit, string> = {
  day: '天',
  week: '周',
  month: '个月',
  quarter: '个季度',
  year: '年',
}
const USAGE_PERIOD_LABEL: Record<PlanUsagePeriod, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季',
  yearly: '每年',
}

/** 格式化 Token 用量：自动转万/亿 */
const formatTokens = (n: number): string => {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)} 亿 Token`
  if (n >= 10_000) return `${(n / 10_000).toFixed(2)} 万 Token`
  return `${n.toLocaleString()} Token`
}

/** 折扣显示：100 = 不打折，90 = 9折，0 = 1折 */
const formatDiscount = (d: number): string => {
  if (d <= 0) return '1折'
  if (d >= 100) return '不打折'
  return `${(d / 10).toFixed(1)}折`
}

/* ---------------- 弹窗表单状态 ---------------- */
interface FormState {
  name: string
  subtitle: string
  level: PlanLevel
  summary: string
  price: number
  discount: number
  usageLimit: number
  usagePeriod: PlanUsagePeriod
  validityValue: number
  validityUnit: PlanValidityUnit
  autoRenew: boolean
  status: 'on' | 'off'
  modelIds: string[]
}

const emptyForm: FormState = {
  name: '',
  subtitle: '',
  level: 'standard' as PlanLevel,
  summary: '',
  price: 0,
  discount: 100,
  usageLimit: 0,
  usagePeriod: 'monthly',
  validityValue: 1,
  validityUnit: 'month',
  autoRenew: false,
  status: 'on',
  modelIds: [],
}

export default function TokenPlanListPage() {
  const { plans, addPlan, updatePlan, removePlan } = useTokenPlans()
  const { models } = useModels()

  const modelNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    models.forEach((it) => (m[it.id] = it.name))
    return m
  }, [models])

  /* 搜索 */
  const [qName, setQName] = useState('')
  const [qLevel, setQLevel] = useState<'all' | PlanLevel>('all')
  const [qStatus, setQStatus] = useState<'all' | 'on' | 'off'>('all')
  const [appliedName, setAppliedName] = useState('')
  const [appliedLevel, setAppliedLevel] = useState<'all' | PlanLevel>('all')
  const [appliedStatus, setAppliedStatus] = useState<'all' | 'on' | 'off'>('all')

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (appliedName && !p.name.toLowerCase().includes(appliedName.toLowerCase())) return false
      if (appliedLevel !== 'all' && p.level !== appliedLevel) return false
      if (appliedStatus !== 'all' && p.status !== appliedStatus) return false
      return true
    })
  }, [plans, appliedName, appliedLevel, appliedStatus])

  const handleSearch = () => {
    setAppliedName(qName)
    setAppliedLevel(qLevel)
    setAppliedStatus(qStatus)
  }
  const handleReset = () => {
    setQName('')
    setQLevel('all')
    setQStatus('all')
    setAppliedName('')
    setAppliedLevel('all')
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

  const openEdit = (plan: TokenPlan) => {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      subtitle: plan.subtitle ?? '',
      level: plan.level,
      summary: plan.summary ?? '',
      price: plan.price,
      discount: plan.discount,
      usageLimit: plan.usageLimit,
      usagePeriod: plan.usagePeriod,
      validityValue: plan.validityValue,
      validityUnit: plan.validityUnit,
      autoRenew: plan.autoRenew,
      status: plan.status,
      modelIds: [...plan.modelIds],
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      message.error('请输入套餐名称')
      return
    }
    if (form.price < 0) {
      message.error('售价不能为负数')
      return
    }
    if (form.discount < 0 || form.discount > 100) {
      message.error('折扣必须在 0~100 之间')
      return
    }
    if (form.usageLimit <= 0) {
      message.error('用量限制必须大于 0')
      return
    }
    if (form.validityValue <= 0) {
      message.error('有效期必须大于 0')
      return
    }

    const payload = {
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || undefined,
      level: form.level,
      summary: form.summary.trim() || undefined,
      price: form.price,
      discount: form.discount,
      usageLimit: form.usageLimit,
      usagePeriod: form.usagePeriod,
      validityValue: form.validityValue,
      validityUnit: form.validityUnit,
      autoRenew: form.autoRenew,
      status: form.status,
      modelIds: form.modelIds,
    }

    if (editingId) {
      updatePlan(editingId, payload)
      message.success('套餐已更新')
    } else {
      addPlan(payload)
      message.success('套餐已创建')
    }
    setModalOpen(false)
  }

  /* 模型选择弹窗 */
  const openModelPicker = () => {
    setSelectedModelIds([...form.modelIds])
    setModelPickerOpen(true)
  }

  const confirmModelPicker = () => {
    setForm({ ...form, modelIds: [...selectedModelIds] })
    setModelPickerOpen(false)
  }

  /* 折后价实时计算 */
  const previewDiscounted = calcPlanDiscountedPrice(form.price, form.discount)

  /* 列表列 */
  const columns: ColumnsType<TokenPlan> = [
    {
      title: '套餐名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 160,
      render: (v: string, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          {r.subtitle ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.subtitle}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '套餐级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      align: 'center',
      render: (v: PlanLevel) => <Tag color={LEVEL_COLOR[v]}>{LEVEL_LABEL[v]}</Tag>,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      width: 220,
      ellipsis: true,
      render: (v?: string) =>
        v ? (
          <Tooltip title={v}>
            <Text ellipsis style={{ maxWidth: 200 }}>{v}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '售价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '折扣',
      dataIndex: 'discount',
      key: 'discount',
      width: 90,
      align: 'center',
      render: (v: number) => {
        const isFull = v >= 100
        return (
          <Tag color={isFull ? 'default' : 'orange'}>
            {isFull ? '不打折' : `${(v / 10).toFixed(1)}折`}
          </Tag>
        )
      },
    },
    {
      title: '折后价',
      key: 'discountedPrice',
      width: 110,
      align: 'right',
      render: (_, r) => {
        const dp = calcPlanDiscountedPrice(r.price, r.discount)
        return (
          <Text strong style={{ color: r.discount >= 100 ? undefined : '#fa541c' }}>
            ¥{dp.toFixed(2)}
          </Text>
        )
      },
    },
    {
      title: '用量限制',
      key: 'usage',
      width: 200,
      render: (_, r) => (
        <Text>
          {USAGE_PERIOD_LABEL[r.usagePeriod]} {formatTokens(r.usageLimit)}
        </Text>
      ),
    },
    {
      title: '有效期',
      key: 'validity',
      width: 120,
      render: (_, r) => `${r.validityValue} ${VALIDITY_UNIT_LABEL[r.validityUnit]}`,
    },
    {
      title: '自动续费',
      dataIndex: 'autoRenew',
      key: 'autoRenew',
      width: 90,
      align: 'center',
      render: (v: boolean) =>
        v ? <Tag color="green">支持</Tag> : <Tag>不支持</Tag>,
    },
    {
      title: '包含模型',
      key: 'modelIds',
      width: 100,
      align: 'center',
      render: (_, r) => {
        if (r.modelIds.length === 0) return <Text type="secondary">—</Text>
        return (
          <Tooltip
            title={
              <div style={{ lineHeight: 1.8 }}>
                {r.modelIds.map((id) => (
                  <div key={id}>{modelNameMap[id] ?? '—'}</div>
                ))}
              </div>
            }
          >
            <Text style={{ cursor: 'pointer', color: '#2f6bff' }}>{r.modelIds.length}</Text>
          </Tooltip>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center',
      render: (v: 'on' | 'off', r) => (
        <Switch
          size="small"
          checked={v === 'on'}
          checkedChildren="上架"
          unCheckedChildren="下架"
          onChange={(checked) => {
            updatePlan(r.id, { status: checked ? 'on' : 'off' })
            message.success(checked ? '套餐已上架' : '套餐已下架')
          }}
        />
      ),
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
      width: 120,
      render: (_, r) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该套餐？"
            onConfirm={() => {
              removePlan(r.id)
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
      title: '厂商',
      dataIndex: 'vendor',
      key: 'vendor',
      width: 140,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
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
      breadcrumb={['模型管理', 'Token Plan']}
      searchFields={
        <>
          <SearchField label="套餐名称">
            <Input
              allowClear
              placeholder="请输入套餐名称"
              style={{ width: 220 }}
              value={qName}
              onChange={(e) => setQName(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="套餐级别">
            <Select
              style={{ width: 160 }}
              value={qLevel}
              onChange={setQLevel}
              options={[
                { value: 'all', label: '全部级别' },
                { value: 'lite', label: 'Lite' },
                { value: 'standard', label: 'Standard' },
                { value: 'pro', label: 'Pro' },
                { value: 'max', label: 'Max' },
              ]}
            />
          </SearchField>
          <SearchField label="状态">
            <Select
              style={{ width: 140 }}
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
      listTitle="Token 套餐列表"
      total={filtered.length}
      hideTotal
      addText="新增套餐"
      onAdd={openAdd}
      titleExtra={
        <RequirementDot
          title="Token 套餐 — 需求点"
          sections={[
            {
              label: '产品定义',
              items: 'Token 套餐 = 预付费购买一个有效期 + 周期用量额度的产品',
            },
            {
              label: '套餐级别',
              items: ['Lite / Standard / Pro / Max 四档'],
            },
            {
              label: '售价与折扣',
              items: [
                '售价：套餐原价（元）',
                '折扣：0-100，100 = 不打折，90 = 9折，0 = 1折',
                '折后价 = 售价 × 折扣 ÷ 100（自动计算）',
              ],
            },
            {
              label: '用量限制',
              items: [
                '按周期限制 Token 用量：每天/每周/每月/每季/每年',
                '示例：有效期 1 年，每月 100 万 Token',
              ],
            },
            {
              label: '有效期',
              items: ['天 / 周 / 月 / 季度 / 年'],
            },
            {
              label: '搜索',
              items: ['支持按套餐名称模糊搜索、按级别筛选、按上下架状态筛选'],
            },
            {
              label: '上下架规则',
              items: ['点击下架，仅维护状态；已售套餐的剩余额度仍可使用直至到期'],
            },
            {
              label: '删除规则',
              items: [
                '点击删除，需要二次确认',
                '已有用户购买的套餐不允许删除（提示「当前套餐正在使用，无法删除」）',
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
            {editingId ? '编辑套餐' : '新增套餐'}
            <RequirementDot
              title="新增套餐需求"
              sections={[
                {
                  label: '基础信息',
                  items: [
                    '套餐名称 50 字内不可重复',
                    '副标题选填，用于列表展示',
                    '套餐级别：Lite / Standard / Pro / Max',
                    '摘要选填，简短描述套餐内容',
                  ],
                },
                {
                  label: '价格',
                  items: [
                    '售价为非负数，支持 2 位小数',
                    '折扣支持 0-100 的整数，100 = 不打折',
                    '折后价 = 售价 × 折扣 ÷ 100（系统自动计算）',
                  ],
                },
                {
                  label: '用量与有效期',
                  items: [
                    '用量限制：周期单位（每天/每周/每月/每季/每年）+ Token 数量',
                    '有效期：数值 > 0，单位为天/周/月/季/年',
                    '示例：有效期 1 年，每月 100 万 Token',
                  ],
                },
                {
                  label: '模型与状态',
                  items: [
                    '点击选择模型，可多选；空模型也允许保存',
                    '套餐状态：默认上架，可在新增时直接关掉',
                    '是否支持自动续费：默认关闭',
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
        width={680}
        destroyOnClose
      >
        <Form layout="vertical" requiredMark>
          {/* 基础信息 */}
          <Form.Item label="套餐名称" required>
            <Input
              placeholder="请输入套餐名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={50}
            />
          </Form.Item>
          <Form.Item label="副标题">
            <Input
              placeholder="选填，如「新手尝鲜，入门首选」"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              maxLength={40}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} size={[16, 16]} wrap>
            <Form.Item label="套餐级别" style={{ flex: 1, marginBottom: 16 }}>
              <Select
                style={{ width: 200 }}
                value={form.level}
                onChange={(v) => setForm({ ...form, level: v })}
                options={[
                  { value: 'lite', label: 'Lite' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'pro', label: 'Pro' },
                  { value: 'max', label: 'Max' },
                ]}
              />
            </Form.Item>
            <Form.Item label="上下架状态" style={{ marginBottom: 16 }}>
              <Switch
                checked={form.status === 'on'}
                onChange={(v) => setForm({ ...form, status: v ? 'on' : 'off' })}
                checkedChildren="上架"
                unCheckedChildren="下架"
                size="small"
              />
            </Form.Item>
          </Space>
          <Form.Item label="摘要">
            <Input.TextArea
              placeholder="选填，简短描述套餐内容"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              maxLength={200}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          {/* 价格信息 */}
          <Space style={{ width: '100%' }} size={[16, 16]} wrap>
            <Form.Item label="售价（元）" required style={{ flex: 1, marginBottom: 16 }}>
              <InputNumber
                style={{ width: 200 }}
                value={form.price}
                onChange={(v) => setForm({ ...form, price: v ?? 0 })}
                min={0}
                precision={2}
                prefix="¥"
              />
            </Form.Item>
            <Form.Item label="折扣（0-100）" required style={{ marginBottom: 16 }}>
              <InputNumber
                style={{ width: 140 }}
                value={form.discount}
                onChange={(v) => setForm({ ...form, discount: v ?? 100 })}
                min={0}
                max={100}
                step={1}
                precision={0}
                suffix="%"
              />
            </Form.Item>
            <Form.Item label="折后价" style={{ marginBottom: 16 }}>
              <InputNumber
                style={{ width: 140 }}
                value={previewDiscounted}
                onChange={(v) => {
                  const newPrice = v ?? 0
                  if (form.price <= 0) return
                  const newDiscount = Math.round((newPrice / form.price) * 100)
                  setForm({ ...form, discount: Math.max(0, Math.min(100, newDiscount)) })
                }}
                min={0}
                precision={2}
                prefix="¥"
                placeholder="自动计算"
              />
            </Form.Item>
          </Space>

          {/* 用量与有效期 */}
          <Space style={{ width: '100%' }} size={[16, 16]} wrap>
            <Form.Item label="有效期" required style={{ flex: 1, marginBottom: 16 }}>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  value={form.validityValue}
                  onChange={(v) => setForm({ ...form, validityValue: v ?? 1 })}
                  min={1}
                  precision={0}
                />
                <Select
                  style={{ width: 120 }}
                  value={form.validityUnit}
                  onChange={(v) => setForm({ ...form, validityUnit: v })}
                  options={[
                    { value: 'day', label: '天' },
                    { value: 'week', label: '周' },
                    { value: 'month', label: '个月' },
                    { value: 'quarter', label: '个季度' },
                    { value: 'year', label: '年' },
                  ]}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="用量限制" required style={{ flex: 1, marginBottom: 16 }}>
              <Space.Compact style={{ width: '100%' }}>
                <Select
                  style={{ width: 90 }}
                  value={form.usagePeriod}
                  onChange={(v) => setForm({ ...form, usagePeriod: v })}
                  options={[
                    { value: 'daily', label: '每天' },
                    { value: 'weekly', label: '每周' },
                    { value: 'monthly', label: '每月' },
                    { value: 'quarterly', label: '每季' },
                    { value: 'yearly', label: '每年' },
                  ]}
                />
                <InputNumber
                  style={{ flex: 1 }}
                  value={form.usageLimit}
                  onChange={(v) => setForm({ ...form, usageLimit: v ?? 0 })}
                  min={0}
                  precision={0}
                  placeholder="数量"
                  suffix="Token"
                />
              </Space.Compact>
            </Form.Item>
          </Space>

          <Form.Item label="是否支持自动续费" style={{ marginBottom: 16 }}>
            <Switch
              checked={form.autoRenew}
              onChange={(v) => setForm({ ...form, autoRenew: v })}
              checkedChildren="支持"
              unCheckedChildren="不支持"
              size="small"
            />
          </Form.Item>

          {/* 包含模型 */}
          <Form.Item label="包含模型" style={{ marginBottom: 0 }}>
            <div
              style={{
                padding: 12,
                background: '#fafafa',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text type="secondary">
                  已选 {form.modelIds.length} 个模型
                </Text>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={openModelPicker}
                >
                  选择模型
                </Button>
              </div>
              {form.modelIds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 12, color: '#999', fontSize: 12 }}>
                  点击「选择模型」添加包含的模型
                </div>
              ) : (
                <Space size={[8, 8]} wrap>
                  {form.modelIds.map((id) => (
                    <Tag
                      key={id}
                      closable
                      onClose={() =>
                        setForm({
                          ...form,
                          modelIds: form.modelIds.filter((m) => m !== id),
                        })
                      }
                    >
                      {modelNameMap[id] ?? '—'}
                    </Tag>
                  ))}
                </Space>
              )}
            </div>
          </Form.Item>
        </Form>
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
