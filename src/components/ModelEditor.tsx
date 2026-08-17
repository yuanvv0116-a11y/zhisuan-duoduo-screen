import {
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Popconfirm,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ChannelModel, BillingType } from '../types'
import { BILLING_TYPES } from '../constants'
import { uid } from '../store'

const { Text } = Typography

interface Props {
  models: ChannelModel[]
  onChange: (v: ChannelModel[]) => void
}

function PriceCells({
  m,
  onEdit,
}: {
  m: ChannelModel
  onEdit: (patch: Partial<ChannelModel>) => void
}) {
  switch (m.billingType) {
    case 'token':
      return (
        <Space>
          <InputNumber
            addonBefore="输入"
            min={0}
            step={0.1}
            value={m.inputPrice}
            placeholder="元/千Tokens"
            onChange={(v) => onEdit({ inputPrice: v ?? undefined })}
            style={{ width: 150 }}
          />
          <InputNumber
            addonBefore="输出"
            min={0}
            step={0.1}
            value={m.outputPrice}
            placeholder="元/千Tokens"
            onChange={(v) => onEdit({ outputPrice: v ?? undefined })}
            style={{ width: 150 }}
          />
        </Space>
      )
    case 'call':
      return (
        <InputNumber
          addonBefore="单价"
          addonAfter="元/次"
          min={0}
          step={0.01}
          value={m.callPrice}
          onChange={(v) => onEdit({ callPrice: v ?? undefined })}
          style={{ width: 200 }}
        />
      )
    case 'gpu_hour':
      return (
        <InputNumber
          addonBefore="单价"
          addonAfter="元/卡时"
          min={0}
          step={0.5}
          value={m.gpuHourPrice}
          onChange={(v) => onEdit({ gpuHourPrice: v ?? undefined })}
          style={{ width: 220 }}
        />
      )
    case 'package':
      return (
        <InputNumber
          addonBefore="资源包"
          addonAfter="元/周期"
          min={0}
          value={m.callPrice}
          onChange={(v) => onEdit({ callPrice: v ?? undefined })}
          style={{ width: 220 }}
        />
      )
    case 'tiered':
      return <Text type="secondary">阶梯价请在备注中说明各档区间</Text>
    case 'free':
      return <Tag color="green">免费</Tag>
    default:
      return null
  }
}

export default function ModelEditor({ models, onChange }: Props) {
  const update = (id: string, patch: Partial<ChannelModel>) =>
    onChange(models.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  const add = () =>
    onChange([
      ...models,
      {
        id: uid(),
        modelName: '',
        billingType: 'token',
      },
    ])

  const remove = (id: string) => onChange(models.filter((m) => m.id !== id))

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text type="secondary">
          该渠道下的模型将通过渠道配置的 API 接入，只需指定「计费方式」。
        </Text>
        <Button icon={<PlusOutlined />} onClick={add}>
          新增模型
        </Button>
      </div>
      <Table<ChannelModel>
        rowKey="id"
        dataSource={models}
        pagination={false}
        size="small"
        scroll={{ x: 710 }}
        locale={{ emptyText: '暂无接入模型' }}
        columns={[
          {
            title: '模型名称',
            dataIndex: 'modelName',
            width: 160,
            fixed: 'left',
            render: (_, r) => (
              <Input
                placeholder="如：qwen-turbo"
                value={r.modelName}
                onChange={(e) => update(r.id, { modelName: e.target.value })}
              />
            ),
          },
          {
            title: '计费方式',
            dataIndex: 'billingType',
            width: 150,
            render: (_, r) => (
              <Select<BillingType>
                style={{ width: '100%' }}
                value={r.billingType}
                onChange={(v) => update(r.id, { billingType: v })}
                options={BILLING_TYPES.map((b) => ({
                  value: b.value,
                  label: b.label,
                }))}
              />
            ),
          },
          {
            title: '计费单价',
            width: 340,
            render: (_, r) => (
              <PriceCells m={r} onEdit={(p) => update(r.id, p)} />
            ),
          },
          {
            title: '操作',
            width: 60,
            fixed: 'right',
            render: (_, r) => (
              <Popconfirm title="删除该模型？" onConfirm={() => remove(r.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />
    </div>
  )
}
