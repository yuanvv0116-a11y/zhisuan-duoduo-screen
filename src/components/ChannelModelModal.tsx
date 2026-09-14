import { useEffect, useMemo, useState } from 'react'
import { Modal, Form, Input, Cascader, Typography, Space, Checkbox, message } from 'antd'
import type { Channel, ChannelModelItem, EndpointMapping } from '../types'
import { MODEL_CONFIG_ENDPOINTS, endpointLabel } from '../constants'
import { readStoredChannels } from '../store'
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
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [optionChannels, setOptionChannels] = useState<Channel[]>(channels)
  const [cascaderKey, setCascaderKey] = useState(0)

  useEffect(() => {
    if (open) {
      const init = model ? structuredClone(model) : emptyModel()
      setDraft(init)
      setOptionChannels(channels)
      const initCred =
        init.credentialId ||
        channels.find((c) => c.id === init.channelId)?.apiCredentials?.[0]?.id ||
        undefined
      form.setFieldsValue({
        modelName: init.modelName,
        channelApi: init.channelId && initCred ? [init.channelId, initCred] : undefined,
        modelCode: init.modelCode,
      })
      const c: Record<string, boolean> = {}
      const m: Record<string, string> = {}
      init.endpoints.forEach((e) => {
        c[e.endpointKey] = true
        m[e.endpointKey] = e.mappingUrl
      })
      setChecked(c)
      setMapping(m)
    }
  }, [open, model, form])

  const channelApi = Form.useWatch('channelApi', form)
  const selectedChannelId = Array.isArray(channelApi) ? channelApi[0] : undefined
  const selectedCredentialId = Array.isArray(channelApi) ? channelApi[1] : undefined
  const cascaderOptions = useMemo(
    () =>
      optionChannels
        .filter((c) => (c.apiCredentials ?? []).length > 0)
        .map((c) => ({
          value: c.id,
          label: c.name,
          children: (c.apiCredentials ?? []).map((x) => ({
            value: x.id,
            label: `${x.apiName}（${x.status === 'enabled' ? '启用' : '禁用'}）`,
          })),
        })),
    [optionChannels],
  )
  const currentCred = useMemo(() => {
    const channel = channels.find((c) => c.id === selectedChannelId)
    return channel?.apiCredentials?.find((x) => x.id === selectedCredentialId) ?? null
  }, [channels, selectedChannelId, selectedCredentialId])

  const endpointList = useMemo(() => {
    const base = [...MODEL_CONFIG_ENDPOINTS]
    ;(model?.endpoints ?? []).forEach((e) => {
      if (!base.includes(e.endpointKey)) base.push(e.endpointKey)
    })
    return base
  }, [model])

  const handleSave = async () => {
    try {
      const base = await form.validateFields()
      const missing = endpointList.some((k) => checked[k] && !(mapping[k] ?? '').trim())
      if (missing) {
        message.error('请填写已勾选端点的模型映射地址')
        return
      }
      const endpoints: EndpointMapping[] = endpointList
        .filter((k) => checked[k])
        .map((k) => ({ endpointKey: k, mappingUrl: (mapping[k] ?? '').trim() }))
      const [nextChannelId, nextCredentialId] = base.channelApi ?? []
      onSubmit({
        ...draft,
        modelName: base.modelName,
        channelId: nextChannelId,
        credentialId: nextCredentialId,
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
                    '1.渠道与API名称为同一个级联选择控件（必选）：第一级渠道，来源于渠道管理（下方有api的都展示），鼠标悬浮即展开第二级；第二级为该渠道下的API名称，API名称后用括号展示API状态（启用/禁用）；选到API后，下方展示该API的地址。一组 API 可以关联多个模型。如选择某个api时，此api被删掉了。则选择后提示“当前API信息已变更，请重新选择” 提示完了刷新下拉列表数据',
                  ],
                },
              ]}
            />
          </Space>
        )
      }
      width={1100}
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
          <Input placeholder="如：Qwen-Turbo 对话" maxLength={50} showCount />
        </Form.Item>

        <Form.Item
          name="channelApi"
          label="渠道/ API名称"
          rules={[{ required: true, message: '请选择渠道商和API名称' }]}
        >
          <Cascader
            key={cascaderKey}
            options={cascaderOptions}
            placeholder="请选择渠道/ API名称"
            expandTrigger="hover"
            onChange={(value) => {
              if (!Array.isArray(value) || value.length < 2) return
              const [chId, credId] = value as string[]
              const fresh = readStoredChannels()
              const alive = fresh
                .find((c) => c.id === chId)
                ?.apiCredentials?.some((x) => x.id === credId)
              if (!alive) {
                message.warning('当前API信息已变更，请重新选择')
                form.setFieldValue('channelApi', undefined)
                setOptionChannels(fresh)
                setCascaderKey((k) => k + 1)
              }
            }}
            showSearch={{
              filter: (inputValue, path) =>
                path.some((option) =>
                  String(option.label).toLowerCase().includes(inputValue.toLowerCase()),
                ),
            }}
          />
        </Form.Item>

        {currentCred && (
          <div
            style={{
              background: '#f7f8fa',
              border: '1px solid #eef0f4',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <Text type="secondary" style={{ width: 72, flex: 'none' }}>
                API 地址
              </Text>
              <Text copyable={{ text: currentCred.apiUrl }}>{currentCred.apiUrl}</Text>
            </div>
          </div>
        )}

        <Form.Item
          name="modelCode"
          label="Model Code"
          rules={[{ required: true, message: '请输入 Model Code' }]}
        >
          <Input placeholder="如：qwen-turbo" maxLength={50} showCount />
        </Form.Item>

        <div style={{ marginBottom: 8 }}>
          <Text strong>端点映射地址</Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            勾选端点后，模型映射地址必填，最多 200 字
          </Text>
        </div>

        <div style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 8 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: 24,
              rowGap: 12,
            }}
          >
            {endpointList.map((k) => (
              <div key={k}>
                <Checkbox
                  checked={!!checked[k]}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [k]: e.target.checked }))
                  }
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{endpointLabel(k)}</span>
                </Checkbox>
                <Input
                  style={{ marginTop: 6 }}
                  placeholder={k}
                  disabled={!checked[k]}
                  value={mapping[k] ?? ''}
                  maxLength={200}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [k]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </Form>
    </Modal>
  )
}
