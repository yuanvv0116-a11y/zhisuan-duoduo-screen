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
  /** 价格（元） */
  price: number
  /** 划线价格（元），0 表示未配置 */
  originalPrice: number
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
  originalPrice: 0,
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
    setEditingId(pack.id)
    setForm({
      name: pack.name,
      subtitle: pack.subtitle ?? '',
      status: pack.status,
      price: pack.price,
      originalPrice: pack.originalPrice ?? 0,
      quota: pack.quota,
      validityValue: pack.validityValue,
      validityUnit: pack.validityUnit,
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      message.error('请输入资源包名称')
      return
    }
    if (!(form.price > 0)) {
      message.error('请输入资源包价格')
      return
    }
    if (form.originalPrice > 0 && form.originalPrice < form.price) {
      message.error('划线价格不能低于价格')
      return
    }
    if (!(form.quota > 0)) {
      message.error('请配置资源包额度')
      return
    }
    if (!(form.validityValue > 0)) {
      message.error('请配置资源包有效期')
      return
    }

    const payload = {
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || undefined,
      status: form.status,
      price: form.price,
      originalPrice: form.originalPrice > 0 ? form.originalPrice : undefined,
      quota: form.quota,
      validityValue: form.validityValue,
      validityUnit: form.validityUnit,
    }

    if (editingId) {
      updatePack(editingId, payload)
      message.success('资源包已更新')
    } else {
      addPack(payload)
      message.success(payload.status === 'on' ? '资源包已创建并上架（原上架资源包已自动下架）' : '资源包已创建')
    }
    setModalOpen(false)
  }

  /* 列表列 */
  const columns: ColumnsType<ResourcePack> = [
    {
      title: '资源包名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 260,
      render: (_, r) => (
        <div>
          <Text strong>{r.name}</Text>
          {r.subtitle ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.subtitle}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: '价格',
      key: 'price',
      width: 160,
      render: (_, r) => (
        <Space size={6}>
          <Text strong style={{ color: '#ff4d4f' }}>¥{r.price}</Text>
          {r.originalPrice && r.originalPrice > r.price ? (
            <Text delete type="secondary">
              ¥{r.originalPrice}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '额度',
      key: 'quota',
      width: 160,
      render: (_, r) =>
        r.quota > 0 ? <Text>{r.quota.toLocaleString()} Tokens</Text> : <Text type="secondary">—</Text>,
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
            message.success(checked ? '资源包已上架，其它上架资源包已自动下架' : '资源包已下架')
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
                  label: '模型配置',
                  items: ['资源包不需要配置模型'],
                },
                {
                  label: '基础信息',
                  items: ['资源包除了名称，还要有副标题'],
                },
                {
                  label: '价格',
                  items: ['资源包要有价格和划线价格'],
                },
                {
                  label: '上架规则',
                  items: ['资源包仅支持上架一个'],
                },
                {
                  label: '额度',
                  items: ['资源包可以配置额度'],
                },
                {
                  label: '有效期',
                  items: ['资源包有有效期'],
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
            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                仅支持上架一个资源包；上架新资源包后，当前已上架的资源包将自动下架。
              </Text>
            </div>
          </Form.Item>

          <Form.Item label="副标题">
            <Input
              placeholder="选填，展示在名称下方"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              maxLength={60}
            />
          </Form.Item>

          <Space size={16} style={{ display: 'flex' }} align='start'>
            <Form.Item label="价格（元）" required style={{ flex: 1, minWidth: 200 }}>
              <InputNumber
                value={form.price}
                onChange={(v) => setForm({ ...form, price: v ?? 0 })}
                min={0}
                precision={2}
                prefix="¥"
                style={{ width: '100%' }}
                placeholder="请输入价格"
              />
            </Form.Item>
            <Form.Item label="划线价格（元）" style={{ flex: 1, minWidth: 200 }}>
              <InputNumber
                value={form.originalPrice || undefined}
                onChange={(v) => setForm({ ...form, originalPrice: v ?? 0 })}
                min={0}
                precision={2}
                prefix="¥"
                style={{ width: '100%' }}
                placeholder="选填，不填则不展示划线价"
              />
            </Form.Item>
          </Space>

          <Form.Item label="额度（Tokens）" required>
            <InputNumber
              value={form.quota}
              onChange={(v) => setForm({ ...form, quota: v ?? 0 })}
              min={0}
              step={1000000}
              precision={0}
              style={{ width: '100%' }}
              placeholder="如 50000000，表示资源包内可用的 Token 总额度"
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
        </Form>
      </Modal>
    </PageShell>
  )
}
