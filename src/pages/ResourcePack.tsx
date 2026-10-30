import { useMemo, useState } from 'react'
import {
  Input,
  Select,
  Table,
  Typography,
  Space,
  Modal,
  Switch,
  InputNumber,
  Button,
  Popconfirm,
  Form,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import RequirementDot from '../components/RequirementDot'
import { useResourcePacks } from '../store'
import { PLAN_DURATION_UNIT_META } from '../types'
import type { ResourcePack, PlanValidityUnit } from '../types'

const { Text } = Typography

/* 有效期单位下拉：天 / 周 / 个月 / 季 / 年 */
const validityUnitOptions = (Object.keys(PLAN_DURATION_UNIT_META) as PlanValidityUnit[]).map(
  (u) => ({ value: u, label: PLAN_DURATION_UNIT_META[u].shortUnit }),
)

/** 「X + 单位」展示，如「1个月」「3季」 */
const formatValidity = (value: number, unit: PlanValidityUnit): string =>
  `${value}${PLAN_DURATION_UNIT_META[unit].shortUnit}`

/* ---------------- 弹窗表单状态 ---------------- */
interface FormState {
  name: string
  subtitle: string
  status: 'on' | 'off'
  /** 售价（元）；打折销售开启后即为划线价 */
  price: number
  /** 打折销售 */
  showOriginalPrice: boolean
  /** 折扣 0-100（95 = 95 折） */
  discount: number
  /** 额度（Token 数量） */
  quota: number
  validityValue: number
  validityUnit: PlanValidityUnit
}

const emptyForm: FormState = {
  name: '',
  subtitle: '',
  status: 'on',
  price: 0,
  showOriginalPrice: false,
  discount: 100,
  quota: 0,
  validityValue: 1,
  validityUnit: 'month',
}

export default function ResourcePackPage() {
  const { packs, addPack, updatePack, removePack } = useResourcePacks()

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

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (pack: ResourcePack) => {
    // 划线价高于售价 = 打折销售，回填划线价（售价输入框）与折扣
    const discounted = !!pack.originalPrice && pack.originalPrice > pack.price
    setEditingId(pack.id)
    setForm({
      name: pack.name,
      subtitle: pack.subtitle ?? '',
      status: pack.status,
      price: discounted ? pack.originalPrice! : pack.price,
      showOriginalPrice: discounted,
      discount: discounted ? +((pack.price / pack.originalPrice!) * 100).toFixed(2) : 100,
      quota: pack.quota,
      validityValue: pack.validityValue,
      validityUnit: pack.validityUnit,
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      message.error('请输入加油包名称')
      return
    }
    if (!(form.price > 0)) {
      message.error('请输入加油包售价')
      return
    }
    if (form.showOriginalPrice && !(form.discount > 0 && form.discount < 100)) {
      message.error('请输入有效的折扣，范围 0.01～0.99')
      return
    }
    if (!(form.quota > 0)) {
      message.error('请配置加油包额度')
      return
    }
    if (!(form.validityValue > 0)) {
      message.error('请配置加油包有效期')
      return
    }

    // 打折销售：填写的售价变划线价，折后价作为实际售价
    const discountedPrice = +(
      (form.price * (form.showOriginalPrice ? form.discount : 100)) /
      100
    ).toFixed(2)
    const payload = {
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || undefined,
      status: form.status,
      price: discountedPrice,
      originalPrice: form.showOriginalPrice ? form.price : undefined,
      quota: form.quota,
      validityValue: form.validityValue,
      validityUnit: form.validityUnit,
    }

    if (editingId) {
      updatePack(editingId, payload)
      message.success('加油包已更新')
    } else {
      addPack(payload)
      message.success(payload.status === 'on' ? '加油包已创建并上架（原上架加油包已自动下架）' : '加油包已创建')
    }
    setModalOpen(false)
  }

  /* 列表列 */
  const columns: ColumnsType<ResourcePack> = [
    {
      title: '加油包名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
      render: (_, r) => <Text strong>{r.name}</Text>,
    },
    {
      title: '副标题',
      dataIndex: 'subtitle',
      key: 'subtitle',
      width: 280,
      render: (_, r) =>
        r.subtitle ? <Text type="secondary">{r.subtitle}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: '价格',
      key: 'price',
      width: 110,
      render: (_, r) => <Text strong style={{ color: '#ff4d4f' }}>¥{r.price}</Text>,
    },
    {
      title: '划线价',
      key: 'originalPrice',
      width: 110,
      render: (_, r) =>
        r.originalPrice && r.originalPrice > r.price ? (
          <Text type="secondary">¥{r.originalPrice}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '额度（Tokens）',
      key: 'quota',
      width: 140,
      render: (_, r) =>
        r.quota > 0 ? <Text>{r.quota.toLocaleString()}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: '有效期',
      key: 'validity',
      width: 100,
      render: (_, r) => <Text>{formatValidity(r.validityValue, r.validityUnit)}</Text>,
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
            message.success(checked ? '加油包已上架，其它上架加油包已自动下架' : '加油包已下架')
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
            title="确认删除该加油包？"
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

  return (
    <PageShell
      breadcrumb={['Token Plan', '加油包管理']}
      searchFields={
        <>
          <SearchField label="加油包名称">
            <Input
              allowClear
              placeholder="请输入加油包名称"
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
      listTitle="加油包列表"
      total={filtered.length}
      hideTotal
      addText="新增加油包"
      onAdd={openAdd}
      titleExtra={
        <RequirementDot
          title="加油包管理 — 需求点"
          sections={[
            {
              label: '',
              items: [
                '1.列表按照添加时间倒序展示，支持按照加油包名称模糊搜索；',
                '2.点击“上架”按钮，二次确认后才下架',
                '3.点击“下架”进行上架时，上架成功后，其他加油包要下架。即，只允许一个加油包上架。',
                '4.点击删除需要二次确认',
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
            {editingId ? '编辑加油包' : '新增加油包'}
            <RequirementDot
              title="新增/编辑加油包 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1.加油包名称，20字，必填，不限制输入类型，名称不可重复。',
                    '2.副标题，100字，选填。',
                    '4.售价，必填，支持两位小数，0.01～99999.99；',
                    '5.划线价开启后，价格必填，支持两位小数，0.01～99999.99； 应大于售价；',
                    '6.token量，必填，0～99999999999',
                    '7.有效期可选月/季/年。 期限数字为整数，1～12；',
                    '默认下架',
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
        width={640}
        destroyOnClose
      >
        <Form layout="vertical" requiredMark>
          <Form.Item label="加油包名称" required>
            <Input
              placeholder="请输入名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={40}
            />
          </Form.Item>

          <Form.Item label="副标题">
            <Input
              placeholder="选填，展示在名称下方"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              maxLength={60}
            />
          </Form.Item>

          <Form.Item label="售价（元）" required>
            <InputNumber
              value={form.price}
              onChange={(v) => setForm({ ...form, price: v ?? 0 })}
              min={0}
              precision={2}
              prefix="¥"
              style={{ width: 220 }}
              placeholder="请输入售价"
            />
          </Form.Item>

          {/* 打折销售：开启后填写的售价作为划线价，实际售价 = 售价 × 折扣 */}
          <Form.Item label="打折销售">
            <Space size={[16, 0]} align="center">
              <Switch
                checked={form.showOriginalPrice}
                onChange={(checked) =>
                  setForm({
                    ...form,
                    showOriginalPrice: checked,
                    discount: checked ? 95 : 100,
                  })
                }
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                开启后，售价将会变为划线价
              </Text>
            </Space>
          </Form.Item>
          {form.showOriginalPrice && (
            <Form.Item label="折扣">
              <Space size={[12, 0]} align="center">
                <InputNumber
                  style={{ width: 140 }}
                  value={form.discount / 100}
                  onChange={(v) =>
                    setForm({ ...form, discount: Math.round((v ?? 1) * 10000) / 100 })
                  }
                  min={0.01}
                  max={0.99}
                  step={0.01}
                />
                <span style={{ fontSize: 12 }}>
                  <Text strong style={{ fontSize: 12, color: '#ff4d4f' }}>
                    折扣后售价 ¥{(form.price * (form.discount / 100)).toFixed(2)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    （划线价 ¥{form.price.toFixed(2)}）
                  </Text>
                </span>
              </Space>
            </Form.Item>
          )}

          <Form.Item label="额度（Tokens）" required>
            <InputNumber
              value={form.quota}
              onChange={(v) => setForm({ ...form, quota: v ?? 0 })}
              min={0}
              step={1000000}
              precision={0}
              style={{ width: '100%' }}
              placeholder="如 50000000，表示加油包内可用的 Token 总额度"
            />
          </Form.Item>

          <Form.Item label="有效期" required>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                value={form.validityValue}
                onChange={(v) => setForm({ ...form, validityValue: v ?? 0 })}
                min={1}
                precision={0}
                style={{ width: '60%' }}
                placeholder="请输入有效期数值"
              />
              <Select
                value={form.validityUnit}
                onChange={(v) => setForm({ ...form, validityUnit: v })}
                options={validityUnitOptions}
                style={{ width: '40%' }}
              />
            </Space.Compact>
          </Form.Item>

          <Form.Item label="上架状态">
            <Switch
              checked={form.status === 'on'}
              onChange={(v) => setForm({ ...form, status: v ? 'on' : 'off' })}
              checkedChildren="上架"
              unCheckedChildren="下架"
            />
            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                仅支持上架一个加油包；上架新加油包后，当前已上架的加油包将自动下架。
              </Text>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  )
}
