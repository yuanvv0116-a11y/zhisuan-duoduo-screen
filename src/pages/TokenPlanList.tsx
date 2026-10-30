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
  Form,
  message,
  Popconfirm,
} from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import RequirementDot from '../components/RequirementDot'
import PlanModelConfig from './PlanModelConfig'
import { useTokenPlans } from '../store'
import {
  type PlanDurationOption,
  type PlanValidityUnit,
  type TokenPlan,
  calcPlanDiscountedPrice,
  PLAN_DURATION_UNIT_META,
  durationToDisplayUnits,
  displayUnitsToMonths,
  buildDurationLabel,
} from '../types'

const { Text } = Typography

/* ---------------- 常量映射 ---------------- */
const VALIDITY_UNIT_LABEL: Record<PlanValidityUnit, string> = {
  day: '天',
  week: '周',
  month: '个月',
  quarter: '个季度',
  year: '年',
}
/** 折扣显示：100 = 不打折，90 = 9折，0 = 1折，>100 = 溢价 */
const formatDiscount = (d: number): string => {
  if (d <= 0) return '1折'
  if (d === 100) return '不打折'
  if (d > 100) return `${(d / 10).toFixed(1)}倍`
  return `${(d / 10).toFixed(1)}折`
}

/* ---------------- 弹窗表单状态 ---------------- */
interface FormState {
  name: string
  subtitle: string
  summaryItems: string[]
  price: number
  /** 前台黑色高亮卡片 */
  highlight: boolean
  discountPrice: number
  /** 折扣 0-100（100 = 不打折，85 = 85折） */
  discount: number
  durations: PlanDurationOption[]
  productTag: string
  /** 套餐总 Token 量 */
  totalTokens: number
  validityValue: number
  validityUnit: PlanValidityUnit
  autoRenew: boolean
  status: 'on' | 'off'
  /** 是否前台展示划线原价 */
  showOriginalPrice: boolean
  /** 划线展示的原价（元） */
  originalPrice: number
}

const emptyForm: FormState = {
  name: '',
  subtitle: '',
  summaryItems: [],
  price: 0,
  highlight: true,
  discountPrice: 0,
  discount: 100,
  durations: [{ label: '月付', months: 1, discount: 100, finalPrice: 0 }],
  productTag: '',
  totalTokens: 0,
  validityValue: 1,
  validityUnit: 'month',
  autoRenew: false,
  status: 'on',
  showOriginalPrice: false,
  originalPrice: 0,
}

/** 有效期单位 → 对应的默认订阅时长周期（label + 倍数 × base） */
const VALIDITY_UNIT_DURATION_TEMPLATES: Record<
  PlanValidityUnit,
  { label: string; months: number; discount: number }[]
> = {
  day: [
    { label: '日付', months: 1 / 30, discount: 100 },
    { label: '3日付', months: 3 / 30, discount: 98 },
    { label: '7日付', months: 7 / 30, discount: 95 },
  ],
  week: [
    { label: '周付', months: 7 / 30, discount: 100 },
    { label: '2周付', months: 14 / 30, discount: 97 },
    { label: '月付(4周)', months: 1, discount: 92 },
  ],
  month: [
    { label: '月付', months: 1, discount: 100 },
    { label: '季付', months: 3, discount: 90 },
    { label: '年付', months: 12, discount: 75 },
  ],
  quarter: [
    { label: '季付', months: 3, discount: 100 },
    { label: '半年付', months: 6, discount: 92 },
    { label: '年付', months: 12, discount: 82 },
  ],
  year: [
    { label: '年付', months: 12, discount: 100 },
    { label: '两年付', months: 24, discount: 88 },
    { label: '三年付', months: 36, discount: 78 },
  ],
}

export default function TokenPlanListPage() {
  const { plans, addPlan, updatePlan, removePlan } = useTokenPlans()

  /** 「配置模型」页：页内子状态切换，非全局路由 */
  const [configPlan, setConfigPlan] = useState<TokenPlan | null>(null)

  /* 搜索 */
  const [qName, setQName] = useState('')
  const [qStatus, setQStatus] = useState<'all' | 'on' | 'off'>('all')
  const [appliedName, setAppliedName] = useState('')
  const [appliedStatus, setAppliedStatus] = useState<'all' | 'on' | 'off'>('all')

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (appliedName && !p.name.toLowerCase().includes(appliedName.toLowerCase())) return false
      if (appliedStatus !== 'all' && p.status !== appliedStatus) return false
      return true
    })
  }, [plans, appliedName, appliedStatus])

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
  const [deleteTarget, setDeleteTarget] = useState<TokenPlan | null>(null)
  const [deletePassword, setDeletePassword] = useState('')

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
      summaryItems: plan.summaryItems ?? [],
      // 打折销售开启时售价是折后价，表单售价回填划线前的原价
      price:
        plan.showOriginalPrice && (plan.originalPrice ?? 0) > 0
          ? plan.originalPrice ?? 0
          : plan.price,
      highlight: plan.highlight ?? false,
      discountPrice: plan.price,
      discount: plan.showOriginalPrice ? plan.discount ?? 95 : 100,
      durations: plan.durations?.length
        ? plan.durations.map((d) => ({
            ...d,
            finalPrice:
              d.finalPrice ?? (plan.price * d.months * (d.discount / 100)),
          }))
        : [{ label: '月付', months: 1, discount: 100, finalPrice: 0 }],
      productTag: plan.productTag ?? '',
      totalTokens: (plan as any).totalTokens ?? plan.usageLimit ?? 0,
      validityValue: plan.validityValue,
      validityUnit: plan.validityUnit,
      autoRenew: plan.autoRenew,
      status: plan.status,
      showOriginalPrice: plan.showOriginalPrice ?? false,
      originalPrice: plan.originalPrice ?? 0,
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
    if (form.discountPrice < 0) {
      message.error('折扣价不能为负数')
      return
    }
    if (form.showOriginalPrice && !(form.discount > 0 && form.discount < 100)) {
      message.error('请输入有效的折扣，范围 0.01～0.99')
      return
    }
    if (form.totalTokens <= 0) {
      message.error('套餐总Token量必须大于 0')
      return
    }
    if (form.validityValue <= 0) {
      message.error('有效期必须大于 0')
      return
    }

    const editingPlan = editingId ? plans.find((p) => p.id === editingId) : undefined
    // 打折销售：填写的售价变划线价，折后价作为实际售价
    const discountedPrice = +(
      (form.price * (form.showOriginalPrice ? form.discount : 100)) /
      100
    ).toFixed(2)
    const payload = {
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || undefined,
      // 套餐版本字段已从表单移除：编辑保留原值，新增默认个人版
      planType: editingPlan?.planType ?? 'personal',
      summaryItems: form.summaryItems.filter((s) => s.trim()),
      price: form.showOriginalPrice ? discountedPrice : form.price,
      highlight: form.highlight,
      discountPrice: discountedPrice,
      discount: form.showOriginalPrice ? form.discount : 100,
      durations: form.durations,
      productTag: form.productTag.trim(),
      totalTokens: form.totalTokens,
      // 用量限制已从表单移除：编辑保留原值，新增不限量
      usageLimitEnabled: editingPlan ? (editingPlan as any).usageLimitEnabled ?? true : false,
      usageLimit: editingPlan?.usageLimit ?? 0,
      usagePeriod: editingPlan?.usagePeriod ?? 'monthly',
      validityValue: form.validityValue,
      validityUnit: form.validityUnit,
      autoRenew: form.autoRenew,
      status: form.status,
      // 包含模型改由列表「配置模型」页维护，表单不再配置：编辑保留原值，新增置空
      modelIds: editingPlan?.modelIds ?? [],
      showOriginalPrice: form.showOriginalPrice,
      originalPrice: form.showOriginalPrice ? form.price : 0,
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

  /* 下架二次确认：记录待确认的套餐 id */
  const [pendingOffId, setPendingOffId] = useState<string | null>(null)

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
      title: '套餐内容',
      dataIndex: 'summaryItems',
      key: 'summaryItems',
      width: 220,
      render: (items?: string[]) =>
        items && items.length > 0 ? (
          <div style={{ maxWidth: 200 }}>
            {items.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                {s}
              </div>
            ))}
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '售价（元）',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (v: number) => v.toFixed(2),
    },
    {
      title: '划线原价（元）',
      key: 'originalPrice',
      width: 110,
      align: 'right',
      render: (_, r: TokenPlan) =>
        r.showOriginalPrice && typeof r.originalPrice === 'number' && r.originalPrice > 0 ? (
          <Text type="secondary">{r.originalPrice.toFixed(2)}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '订阅时长',
      key: 'durations',
      width: 180,
      render: (_, r) => {
        if (!r.durations || r.durations.length === 0) return <Text type="secondary">—</Text>
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            {r.durations.map((d, i) => (
              <Tag key={i} color={d.discount >= 100 ? 'default' : 'orange'} style={{ marginInlineEnd: 0 }}>
                {d.label}
                {d.discount < 100 ? ` ${formatDiscount(d.discount)}` : ''}
              </Tag>
            ))}
          </div>
        )
      },
    },
    {
      title: '产品标签',
      dataIndex: 'productTag',
      key: 'productTag',
      width: 90,
      align: 'center',
      render: (v?: string) => (v ? v : <Text type="secondary">—</Text>),
    },
    {
      title: '套餐总Token量',
      key: 'totalTokens',
      width: 140,
      align: 'right',
      render: (_, r) => ((r as any).totalTokens ?? r.usageLimit).toLocaleString(),
    },
    {
      title: '基础有效期',
      key: 'validity',
      width: 120,
      render: (_, r) => `${r.validityValue} ${VALIDITY_UNIT_LABEL[r.validityUnit]}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center',
      render: (v: 'on' | 'off', r) => (
        <Popconfirm
          title="是否确认下架当前套餐"
          open={pendingOffId === r.id}
          okText="确认"
          cancelText="取消"
          onConfirm={() => {
            updatePlan(r.id, { status: 'off' })
            message.success('套餐已下架')
            setPendingOffId(null)
          }}
          onCancel={() => setPendingOffId(null)}
        >
          <Switch
            size="small"
            checked={v === 'on'}
            checkedChildren="上架"
            unCheckedChildren="下架"
            onChange={(checked) => {
              if (checked) {
                updatePlan(r.id, { status: 'on' })
                message.success('套餐已上架')
              } else {
                setPendingOffId(r.id)
              }
            }}
          />
        </Popconfirm>
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
      width: 190,
      render: (_, r) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => setConfigPlan(r)}>
            配置模型
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => {
              setDeleteTarget(r)
              setDeletePassword('')
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  if (configPlan) {
    return <PlanModelConfig plan={configPlan} onBack={() => setConfigPlan(null)} />
  }

  return (
    <PageShell
      breadcrumb={['Token Plan', '套餐管理']}
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
          title="套餐管理 — 需求点"
          sections={[
            {
              label: '',
              items: [
                '1.列表按照创建时间倒序展示，具体信息如图。',
                '2.支持根据套餐名称模糊搜索，支持根据状态搜索。',
                '3.点击删除，二次确认后删除。',
                '4.编辑逻辑与新增一致；',
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
              title="新增/编辑套餐 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1.套餐名称，必填，限制20字，不限制输入内容，不可重复；',
                    '2.副标题，选填，限制100字，不限制输入内容；',
                    '3.套餐内容最多增加10条，每条限制20字，添加后不可为空；',
                    '4.售价，必填，支持两位小数，0.01～99999.99；',
                    '5.划线价开启后，价格必填，支持两位小数，0.01～99999.99； 应大于售价；',
                    '6.token量，必填，0～99999999999',
                    '7.有效期可选月/季/年。 期限数字为整数，1～12；',
                    '8.订阅时长根据有效期的选择，进行变化。默认展示一条基础信息，且不能修改。 如设置了售价为100，有效期1个月，则第一条展示xx 1个月，价格100，折扣100%，售价100；\n订阅时长名称必填，小于6个字；\n订阅周期应为基础有效期的倍数；\n前台页面就按照添加顺序展示；',
                    '9产品标签，选填，最多6字。填写后在前台展示；',
                    '10默认选中产品，默认为不选中。',
                  ],
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
          <Form.Item label="套餐名称" required style={{ marginBottom: 16 }}>
            <Input
              placeholder="请输入套餐名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={50}
            />
          </Form.Item>
          <Form.Item label="副标题" style={{ marginBottom: 16 }}>
            <Input
              placeholder="选填，如「新手尝鲜，入门首选」"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              maxLength={40}
            />
          </Form.Item>

          {/* 套餐内容（按条展示） */}
          <Form.Item label="套餐内容" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.summaryItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Input
                    style={{ flex: 1 }}
                    placeholder={`内容 ${idx + 1}`}
                    value={item}
                    onChange={(e) => {
                      const next = [...form.summaryItems]
                      next[idx] = e.target.value
                      setForm({ ...form, summaryItems: next })
                    }}
                    maxLength={100}
                    size="small"
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => {
                      setForm({ ...form, summaryItems: form.summaryItems.filter((_, i) => i !== idx) })
                    }}
                  />
                </div>
              ))}
              {form.summaryItems.length < 10 && (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  style={{ alignSelf: 'flex-start', padding: 0, height: 22, fontSize: 12 }}
                  onClick={() => setForm({ ...form, summaryItems: [...form.summaryItems, ''] })}
                >
                  添加内容
                </Button>
              )}
            </div>
          </Form.Item>

          {/* 售价（单独一行） */}
          <Form.Item label="售价（元）" required style={{ marginBottom: 16 }}>
            <InputNumber
              style={{ width: 220 }}
              value={form.price}
              onChange={(v) => {
                const price = v ?? 0
                const salePrice = form.showOriginalPrice
                  ? +(price * (form.discount / 100)).toFixed(2)
                  : price
                setForm({
                  ...form,
                  price,
                  discountPrice: salePrice,
                  durations: form.durations.map((d) => ({
                    ...d,
                    finalPrice: +(salePrice * d.months * (d.discount / 100)).toFixed(2),
                  })),
                })
              }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>

          {/* 打折销售：开启后填写的售价作为划线价，实际售价 = 售价 × 折扣 */}
          <Form.Item label="打折销售" style={{ marginBottom: 16 }}>
            <Space size={[16, 0]} align="center">
              <Switch
                checked={form.showOriginalPrice}
                onChange={(checked) => {
                  const discount = checked ? 95 : 100
                  setForm({
                    ...form,
                    showOriginalPrice: checked,
                    discount,
                    discountPrice: +(form.price * (discount / 100)).toFixed(2),
                  })
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                开启后，售价将会变为划线价
              </Text>
            </Space>
          </Form.Item>
          {form.showOriginalPrice && (
            <Form.Item label="折扣" style={{ marginBottom: 16 }}>
              <Space size={[12, 0]} align="center">
                <InputNumber
                  style={{ width: 140 }}
                  value={form.discount / 100}
                  onChange={(v) => {
                    const discount = Math.round((v ?? 1) * 10000) / 100
                    setForm({
                      ...form,
                      discount,
                      discountPrice: +(form.price * (discount / 100)).toFixed(2),
                    })
                  }}
                  min={0.01}
                  max={0.99}
                  step={0.01}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  折扣后售价 ¥{(form.price * (form.discount / 100)).toFixed(2)}（划线价 ¥{form.price.toFixed(2)}）
                </Text>
              </Space>
            </Form.Item>
          )}

          {/* 用量与有效期 */}
          <Space style={{ width: '100%' }} size={[16, 16]} wrap>
            <Form.Item label="套餐总Token量" required style={{ flex: 1, marginBottom: 16 }}>
              <InputNumber
                style={{ width: '100%' }}
                value={form.totalTokens}
                onChange={(v) => setForm({ ...form, totalTokens: v ?? 0 })}
                min={0}
                precision={0}
                placeholder="请输入套餐总 Token 量"
                suffix="Token"
              />
            </Form.Item>
          </Space>
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
                  onChange={(v: PlanValidityUnit) => {
                    // 有效期单位变化时，同步订阅时长的周期/月数
                    const templates = VALIDITY_UNIT_DURATION_TEMPLATES[v]
                    const durations: PlanDurationOption[] = templates.map((t) => ({
                      label: t.label,
                      months: t.months,
                      discount: t.discount,
                      finalPrice: +(form.price * t.months * (t.discount / 100)).toFixed(2),
                    }))
                    setForm({
                      ...form,
                      validityUnit: v,
                      durations,
                    })
                  }}
                  options={[
                    { value: 'month', label: '个月' },
                    { value: 'quarter', label: '个季度' },
                    { value: 'year', label: '年' },
                  ]}
                />
              </Space.Compact>
            </Form.Item>
          </Space>

          {/* 订阅时长 */}
          <Form.Item label="订阅时长（不同时长不同折扣）" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.durations.map((dur, idx) => {
                const displayUnits = durationToDisplayUnits(dur.months, form.validityUnit)
                const autoLabel = buildDurationLabel(displayUnits, form.validityUnit)
                const unitMeta = PLAN_DURATION_UNIT_META[form.validityUnit]
                // 总金额 = 行内显示的数量 × 售价（折扣前原价）
                const totalAmount = +(form.price * displayUnits).toFixed(2)
                return (
                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Input
                      style={{ width: 110 }}
                      size="small"
                      placeholder="名称"
                      value={dur.label || autoLabel}
                      onChange={(e) => {
                        const next = [...form.durations]
                        next[idx] = { ...dur, label: e.target.value }
                        setForm({ ...form, durations: next })
                      }}
                    />
                    <InputNumber
                      style={{ width: 110 }}
                      size="small"
                      placeholder={unitMeta.formLabel}
                      value={displayUnits}
                      onChange={(v) => {
                        const newDisplayUnits = Math.max(1, v ?? 1)
                        const months = displayUnitsToMonths(newDisplayUnits, form.validityUnit)
                        const newLabel = buildDurationLabel(newDisplayUnits, form.validityUnit)
                        const next = [...form.durations]
                        next[idx] = {
                          ...dur,
                          months,
                          label: dur.label ? dur.label : newLabel,
                          finalPrice: +(form.price * months * (dur.discount / 100)).toFixed(2),
                        }
                        setForm({ ...form, durations: next })
                      }}
                      min={1}
                      precision={0}
                      addonAfter={unitMeta.unitSingle}
                    />
                    <InputNumber
                      style={{ width: 110 }}
                      size="small"
                      disabled
                      value={totalAmount}
                      prefix="¥"
                      title="总金额 = 数量 × 售价"
                      formatter={(value) =>
                        value === undefined || value === null
                          ? ''
                          : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                    />
                    <InputNumber
                      style={{ width: 100 }}
                      size="small"
                      placeholder="折扣"
                      value={dur.discount}
                      onChange={(v) => {
                        const discount = v ?? 100
                        const next = [...form.durations]
                        next[idx] = {
                          ...dur,
                          discount,
                          finalPrice: +(form.price * dur.months * (discount / 100)).toFixed(2),
                        }
                        setForm({ ...form, durations: next })
                      }}
                      min={0}
                      step={1}
                      precision={0}
                      addonAfter="折(%)"
                    />
                    <InputNumber
                      className="final-price-input"
                      style={{ width: 110 }}
                      size="small"
                      placeholder="折后价"
                      value={dur.finalPrice}
                      onChange={(v) => {
                        const finalPrice = v ?? 0
                        const next = [...form.durations]
                        const originalTotal = form.price * dur.months
                        const discount =
                          form.price && dur.months
                            ? Math.max(0, Math.round((finalPrice / originalTotal) * 100))
                            : dur.discount
                        next[idx] = { ...dur, finalPrice, discount }
                        setForm({ ...form, durations: next })
                      }}
                      min={0}
                      precision={2}
                      prefix="¥"
                      formatter={(value) =>
                        value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                      }
                      parser={(value) =>
                        Number(value?.replace(/¥\s?|,/g, '') || 0) as 0
                      }
                    />
                    {form.durations.length > 1 && (
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => {
                          setForm({ ...form, durations: form.durations.filter((_, i) => i !== idx) })
                        }}
                      />
                    )}
                  </div>
                )
              })}
              {form.durations.length < 4 && (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  style={{ alignSelf: 'flex-start', padding: 0, height: 22, fontSize: 12 }}
                  onClick={() => {
                    const newDisplayUnits = 1
                    const months = displayUnitsToMonths(newDisplayUnits, form.validityUnit)
                    const label = buildDurationLabel(newDisplayUnits, form.validityUnit)
                    setForm({
                      ...form,
                      durations: [
                        ...form.durations,
                        { label, months, discount: 100, finalPrice: +(form.price * months).toFixed(2) },
                      ],
                    })
                  }}
                >
                  添加时长
                </Button>
              )}
            </div>
          </Form.Item>

          {/* 开关项：产品标签 / 上下架 / 默认选中产品 */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              marginBottom: 16,
              background: '#fafafa',
              borderRadius: 8,
              padding: '12px 16px',
              border: '1px solid #f0f0f0',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#333' }}>产品标签（不填不展示）</span>
              <Input
                value={form.productTag}
                onChange={(e) => setForm({ ...form, productTag: e.target.value })}
                maxLength={6}
                placeholder="最多6个字"
                style={{ width: 160 }}
              />
            </div>
            <div style={{ width: 1, background: '#f0f0f0' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 16 }}>
              <span style={{ fontSize: 13, color: '#333' }}>上下架状态</span>
              <Switch
                checked={form.status === 'on'}
                onChange={(v) => setForm({ ...form, status: v ? 'on' : 'off' })}
                checkedChildren="上架"
                unCheckedChildren="下架"
                size="small"
              />
            </div>
            <div style={{ width: 1, background: '#f0f0f0' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 16 }}>
              <span style={{ fontSize: 13, color: '#333' }}>默认选中产品</span>
              <Switch
                checked={form.highlight}
                onChange={(v) => setForm({ ...form, highlight: v })}
                checkedChildren="是"
                unCheckedChildren="否"
                size="small"
              />
            </div>
          </div>
        </Form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title={
          <Space size={6} align="center">
            删除确认
            <RequirementDot
              title="删除套餐 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1. 套餐已有用户订阅时，弹窗提示「该套餐正在被订阅，删除后将影响用户使用」，需输入删除密码确认。',
                    '2. 删除密码：必填，密码校验通过才允许删除；错误提示「密码错误，不支持删除」。',
                    '3. 点击「确认删除」：校验通过后删除套餐，提示已删除，列表刷新。',
                  ],
                },
              ]}
            />
          </Space>
        }
        open={!!deleteTarget}
        onCancel={() => {
          setDeleteTarget(null)
          setDeletePassword('')
        }}
        onOk={() => {
          if (deletePassword === '603613') {
            removePlan(deleteTarget!.id)
            message.success('已删除')
            setDeleteTarget(null)
            setDeletePassword('')
          } else {
            message.error('密码错误，不支持删除')
          }
        }}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        centered
        width={480}
        destroyOnClose
      >
        <div style={{ marginBottom: 12, color: '#333', lineHeight: 1.6 }}>
          该套餐正在被订阅，删除后将影响用户使用，确认删除请在下方输入删除密码。
        </div>
        <Input.Password
          placeholder="请输入删除密码"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          onPressEnter={() => {
            if (deletePassword === '603613') {
              removePlan(deleteTarget!.id)
              message.success('已删除')
              setDeleteTarget(null)
              setDeletePassword('')
            } else {
              message.error('密码错误，不支持删除')
            }
          }}
        />
      </Modal>
    </PageShell>
  )
}
