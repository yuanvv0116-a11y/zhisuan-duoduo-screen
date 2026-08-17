import { useEffect, useMemo, useState } from 'react'
import { Modal, Form, Input, Select, Typography, Space, message } from 'antd'
import type { Channel, ChannelModelItem, EndpointMapping } from '../types'
import { SYSTEM_ENDPOINTS } from '../constants'
import RequirementDot from './RequirementDot'

const { Text } = Typography

interface Props {
  open: boolean
  model: ChannelModelItem | null
  channels: Channel[]
  onClose: () => void
  onSubmit: (data: ChannelModelItem) => void
}

const emptyModel = (): ChannelModelItem => ({
  id: '',
  modelName: '',
  channelId: '',
  modelCode: '',
  endpoints: [],
  operator: '',
  createdAt: '',
})

export default function ChannelModelModal({
  open,
  model,
  channels,
  onClose,
  onSubmit,
}: Props) {
  const [form] = Form.useForm()
  const [draft, setDraft] = useState<ChannelModelItem>(emptyModel())
  const [channelId, setChannelId] = useState<string>('')
  const [mapping, setMapping] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      const init = model ? structuredClone(model) : emptyModel()
      setDraft(init)
      setChannelId(init.channelId)
      form.setFieldsValue({
        modelName: init.modelName,
        channelId: init.channelId || undefined,
        modelCode: init.modelCode,
      })
      const m: Record<string, string> = {}
      init.endpoints.forEach((e) => {
        m[e.endpointKey] = e.mappingUrl
      })
      setMapping(m)
    }
  }, [open, model, form])

  const currentChannel = useMemo(
    () => channels.find((c) => c.id === channelId) ?? null,
    [channels, channelId],
  )

  const handleSave = async () => {
    try {
      const base = await form.validateFields()
      const endpoints: EndpointMapping[] = SYSTEM_ENDPOINTS.filter((e) =>
        (mapping[e.key] ?? '').trim(),
      ).map((e) => ({ endpointKey: e.key, mappingUrl: (mapping[e.key] ?? '').trim() }))
      onSubmit({
        ...draft,
        modelName: base.modelName,
        channelId: base.channelId,
        modelCode: base.modelCode,
        endpoints,
      })
    } catch {
      message.error('请检查必填项')
    }
  }

  return (
    <Modal
      title={
        model ? (
          '编辑渠道模型'
        ) : (
          <Space size={6}>
            新增渠道模型
            <RequirementDot
              title="新增渠道模型"
              sections={[
                {
                  label: '',
                  items: [
                    '1.渠道模型名称，必填，<50字，不验证重复；',
                    '2.渠道商，必选，来源于渠道管理（不删除的都可以选），单选。 选择后下方展示api名称和api地址。 ',
                    '3.model code ，必填，<50字。',
                    '4.端点映射地址为系统配置，勾选了端点映射地址，则后面的模型映射地址为必填。限制200字。',
                  ],
                },
              ]}
            />
          </Space>
        )
      }
      width={640}
      centered
      open={open}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      onOk={handleSave}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark>
        <Form.Item
          name="modelName"
          label="渠道模型名称"
          rules={[{ required: true, message: '请输入渠道模型名称' }]}
        >
          <Input placeholder="如：Qwen-Turbo 对话" />
        </Form.Item>

        <Form.Item
          name="channelId"
          label="渠道商"
          rules={[{ required: true, message: '请选择渠道商' }]}
        >
          <Select
            placeholder="请选择渠道商"
            options={channels.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setChannelId(v)}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <div
          style={{
            background: '#f7f8fa',
            border: '1px solid #eef0f4',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <Text type="secondary" style={{ width: 72, flex: 'none' }}>
              API 名称
            </Text>
            <Text>{currentChannel ? currentChannel.apiName : '—'}</Text>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Text type="secondary" style={{ width: 72, flex: 'none' }}>
              API 地址
            </Text>
            <Text copyable={currentChannel ? { text: currentChannel.apiUrl } : false}>
              {currentChannel ? currentChannel.apiUrl : '—'}
            </Text>
          </div>
        </div>

        <Form.Item
          name="modelCode"
          label="Model Code"
          rules={[{ required: true, message: '请输入 Model Code' }]}
        >
          <Input placeholder="如：qwen-turbo" />
        </Form.Item>

        <div style={{ marginBottom: 8 }}>
          <Text strong>端点映射地址</Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            填入端点对应的映射地址，留空则不配置该端点
          </Text>
        </div>

        <div style={{ border: '1px solid #eef0f4', borderRadius: 8, overflow: 'hidden' }}>
          {SYSTEM_ENDPOINTS.map((ep, idx) => (
            <div
              key={ep.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 12px',
                borderTop: idx === 0 ? 'none' : '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  width: 190,
                  flex: 'none',
                  marginTop: 5,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: '#333',
                  wordBreak: 'break-all',
                }}
              >
                {ep.url}
              </div>
              <Input
                placeholder="填入映射地址，如：/v1/chat/completions"
                value={mapping[ep.key] ?? ''}
                maxLength={200}
                showCount
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [ep.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      </Form>
    </Modal>
  )
}
