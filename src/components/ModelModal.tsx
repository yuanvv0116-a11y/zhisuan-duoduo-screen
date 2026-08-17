import { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Tabs,
  Checkbox,
  Button,
  Tag,
  Typography,
  Row,
  Col,
  Empty,
  Upload,
  Space,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ModelItem, ModelApiConfig, Channel, EndpointMapping } from '../types'
import { useChannels, useChannelModels } from '../store'
import { uid } from '../store'
import {
  MODEL_TYPES,
  MODALS,
  MODEL_CONFIG_ENDPOINTS,
} from '../constants'
import RequirementDot from './RequirementDot'

const { Text } = Typography

interface Props {
  open: boolean
  model: ModelItem | null
  onClose: () => void
  onSubmit: (data: ModelItem) => void
}

const DEFAULT_ENDPOINTS = ['/v1/chat/completions', '/v1/completions', '/v1/messages']
const defaultEndpointMappings = (): EndpointMapping[] =>
  DEFAULT_ENDPOINTS.map((ep) => ({ endpointKey: ep, mappingUrl: ep }))

const emptyModel = (): ModelItem => ({
  id: '',
  logo: '',
  name: '',
  vendor: '',
  type: 'text',
  inputModals: ['文本'],
  outputModals: ['文本'],
  maxOutputToken: 4096,
  pricingMode: 'token',
  hot: false,
  deepThinking: false,
  sort: 99,
  online: true,
  onlineAt: '',
  modelCode: '',
  contextWindow: 8192,
  intro: '',
  docTags: [],
  configEndpoints: [...DEFAULT_ENDPOINTS],
  apiConfigs: [
    {
      id: uid(),
      channelId: '',
      modelCode: '',
      weight: 100,
      endpointMappings: defaultEndpointMappings(),
      queueEnabled: true,
      queueLimit: 1,
      timeout: 1,
    },
  ],
})

const fillMappings = (mappings: EndpointMapping[], endpoints: string[]): EndpointMapping[] =>
  endpoints.map((ep) => {
    const existing = mappings.find((m) => m.endpointKey === ep)
    return existing ?? { endpointKey: ep, mappingUrl: '' }
  })

export default function ModelModal({ open, model, onClose, onSubmit }: Props) {
  const [form] = Form.useForm()
  const { channels } = useChannels()
  const { channelModels } = useChannelModels()
  const [tab, setTab] = useState('basic')
  const [draft, setDraft] = useState<ModelItem>(emptyModel())

  const [configEndpoints, setConfigEndpoints] = useState<string[]>([])
  const [apiConfigs, setApiConfigs] = useState<ModelApiConfig[]>([])
  const [docTags, setDocTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagInputVisible, setTagInputVisible] = useState(false)

  useEffect(() => {
    if (open) {
      const init = model ? structuredClone(model) : emptyModel()
      const eps = init.configEndpoints ?? []
      setDraft(init)
      setTab('basic')
      setConfigEndpoints(eps)
      setApiConfigs(
        (init.apiConfigs ?? []).map((c) => ({
          ...c,
          queueEnabled: c.queueEnabled ?? true,
          queueLimit: c.queueLimit ?? 1,
          timeout: c.timeout ?? 1,
          endpointMappings: fillMappings(c.endpointMappings, eps),
        })),
      )
      setDocTags(init.docTags ?? [])
      setTagInput('')
      setTagInputVisible(false)
      form.setFieldsValue({
        name: init.name,
        modelCode: init.modelCode,
        vendor: init.vendor,
        type: init.type,
        inputModals: init.inputModals,
        outputModals: init.outputModals,
        contextWindow: init.contextWindow,
        maxOutputToken: init.maxOutputToken,
        deepThinking: init.deepThinking,
        hot: init.hot,
        online: init.online,
        intro: init.intro,
      })
    }
  }, [open, model, form])

  const toggleEndpoint = (ep: string, checked: boolean) => {
    setConfigEndpoints((prev) => (checked ? [...prev, ep] : prev.filter((e) => e !== ep)))
  }

  const addApiConfig = () => {
    setApiConfigs((prev) => [
      ...prev,
      {
        id: uid(),
        channelId: '',
        modelCode: '',
        weight: 100,
        endpointMappings: configEndpoints.map((ep) => ({
          endpointKey: ep,
          mappingUrl: DEFAULT_ENDPOINTS.includes(ep) ? ep : '',
        })),
        queueEnabled: true,
        queueLimit: 1,
        timeout: 1,
      },
    ])
  }

  const removeApiConfig = (id: string) => {
    setApiConfigs((prev) => prev.filter((c) => c.id !== id))
  }

  const patchApiConfig = (id: string, patch: Partial<ModelApiConfig>) => {
    setApiConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const handleChannelChange = (id: string, channelId: string) => {
    patchApiConfig(id, { channelId, channelModelId: undefined, modelCode: '' })
  }

  const handleChannelModelChange = (id: string, channelModelId: string) => {
    const cm = channelModels.find((m) => m.id === channelModelId)
    patchApiConfig(id, { channelModelId, modelCode: cm?.modelCode ?? '' })
  }

  const setEndpointMapping = (cfgId: string, ep: string, url: string) => {
    setApiConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== cfgId) return c
        const exists = c.endpointMappings.some((m) => m.endpointKey === ep)
        const endpointMappings = exists
          ? c.endpointMappings.map((m) => (m.endpointKey === ep ? { ...m, mappingUrl: url } : m))
          : [...c.endpointMappings, { endpointKey: ep, mappingUrl: url }]
        return { ...c, endpointMappings }
      }),
    )
  }

  const getMapping = (cfg: ModelApiConfig, ep: string) =>
    cfg.endpointMappings.find((m) => m.endpointKey === ep)?.mappingUrl ?? ''

  const removeTag = (t: string) => setDocTags((prev) => prev.filter((x) => x !== t))
  const confirmTag = () => {
    const v = tagInput.trim()
    if (v && !docTags.includes(v)) setDocTags((prev) => [...prev, v])
    setTagInput('')
    setTagInputVisible(false)
  }

  const handleLogoUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('请上传图片文件')
      return false
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, logo: reader.result as string }))
    }
    reader.readAsDataURL(file)
    return false
  }

  const handleSave = async () => {
    try {
      const base = await form.validateFields()
      const cleanedConfigs = apiConfigs.map((c) => ({
        ...c,
        endpointMappings: c.endpointMappings.filter((m) => configEndpoints.includes(m.endpointKey)),
      }))
      onSubmit({
        ...draft,
        name: base.name,
        modelCode: base.modelCode,
        vendor: base.vendor,
        type: base.type,
        logo: draft.logo,
        inputModals: base.inputModals,
        outputModals: base.outputModals,
        contextWindow: base.contextWindow,
        maxOutputToken: base.maxOutputToken,
        deepThinking: base.deepThinking,
        hot: base.hot,
        online: base.online,
        intro: base.intro,
        docTags,
        configEndpoints,
        apiConfigs: cleanedConfigs,
      })
    } catch {
      setTab('basic')
      message.error('请检查「基本信息」的必填项')
    }
  }

  const basicPane = (
    <Form form={form} layout="vertical" requiredMark>
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item name="name" label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input placeholder="如：GPT-4" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="modelCode" label="模型code" rules={[{ required: true, message: '请输入模型 code' }]}>
            <Input placeholder="如：OpenAI" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="vendor" label="模型生产商" rules={[{ required: true, message: '请选择模型生产商' }]}>
            <Select
              placeholder="请选择模型生产商"
              options={['阿里', '字节跳动', '智谱', '深度求索', '智算多多', 'OpenAI'].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="type" label="模型分类" rules={[{ required: true, message: '请选择模型分类' }]}>
            <Select
              placeholder="请选择模型分类"
              options={MODEL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="模型Logo" required>
            <Upload
              listType="picture-card"
              showUploadList={false}
              accept="image/*"
              beforeUpload={handleLogoUpload}
            >
              {draft.logo ? (
                <img
                  src={draft.logo}
                  alt="logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
                />
              ) : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="inputModals" label="输入模态" rules={[{ required: true, message: '请选择输入模态' }]}>
            <Select mode="multiple" placeholder="选择输入模态" options={MODALS} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="outputModals" label="输出模态" rules={[{ required: true, message: '请选择输出模态' }]}>
            <Select mode="multiple" placeholder="选择输出模态" options={MODALS} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="contextWindow" label="上下文窗口" rules={[{ required: true, message: '请输入上下文窗口' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="如：8192" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="maxOutputToken" label="最大输出Token数" rules={[{ required: true, message: '请输入最大输出 Token 数' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="如：4096" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="deepThinking" label="是否支持深度思考" rules={[{ required: true, message: '请选择是否支持深度思考' }]}>
            <Select
              placeholder="选择是否支持深度思考"
              options={[
                { value: true, label: '支持' },
                { value: false, label: '不支持' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="hot" label="设为热门模型" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item label="文档标签">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {docTags.map((t) => (
            <Tag key={t} closable onClose={() => removeTag(t)}>
              {t}
            </Tag>
          ))}
          {tagInputVisible ? (
            <Input
              size="small"
              autoFocus
              style={{ width: 120 }}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onBlur={confirmTag}
              onPressEnter={confirmTag}
            />
          ) : (
            <Button size="small" icon={<PlusOutlined />} onClick={() => setTagInputVisible(true)}>
              新标签
            </Button>
          )}
        </div>
      </Form.Item>

      <Form.Item name="intro" label="模型简介" rules={[{ required: true, message: '请输入模型简介' }]}>
        <Input.TextArea
          rows={4}
          maxLength={300}
          showCount
          placeholder="请输入模型简介，包括适用场景、特点等…"
        />
      </Form.Item>
    </Form>
  )

  const endpointsPane = (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text type="danger">*</Text>{' '}
        <Text type="secondary">请在下方选择要配置的端点，并在 API 配置中为端点配置映射地址</Text>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
        {MODEL_CONFIG_ENDPOINTS.map((ep) => (
          <Checkbox
            key={ep}
            checked={configEndpoints.includes(ep)}
            onChange={(e) => toggleEndpoint(ep, e.target.checked)}
          >
            {ep}
          </Checkbox>
        ))}
      </div>
    </div>
  )

  const apiPane = (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text type="secondary">配置模型可用的 API 模型渠道，支持多个渠道模型负载均衡</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={addApiConfig}>
          添加配置
        </Button>
      </div>

      {apiConfigs.length === 0 ? (
        <Empty description="暂无 API 配置，点击「添加配置」新增" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apiConfigs.map((cfg) => {
            const ch = channels.find((c) => c.id === cfg.channelId) as Channel | undefined
            return (
              <div
                key={cfg.id}
                style={{ border: '1px solid #eef0f4', borderRadius: 8, padding: 16 }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 6 }}>
                      <Text type="danger">*</Text> 渠道名称
                    </div>
                    <Select
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="选择渠道"
                      value={cfg.channelId || undefined}
                      showSearch
                      optionFilterProp="label"
                      onChange={(v) => handleChannelChange(cfg.id, v)}
                      options={[...channels]
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 6 }}>权重</div>
                    <InputNumber
                      min={0}
                      style={{ width: '100%', marginBottom: 12 }}
                      value={cfg.weight}
                      onChange={(v) => patchApiConfig(cfg.id, { weight: v ?? 0 })}
                    />
                  </Col>
                </Row>

                {ch && (
                  <div
                    style={{
                      background: '#f5f6f8',
                      border: '1px solid #eef0f4',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                    }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ marginBottom: 6, color: '#5a6474' }}>API 地址</div>
                        <div style={{ wordBreak: 'break-all' }}>
                          <Text>{ch.apiUrl || '—'}</Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ marginBottom: 6, color: '#5a6474' }}>API 名称</div>
                        <div style={{ wordBreak: 'break-all' }}>
                          <Text>{ch.apiName || '—'}</Text>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}

                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 6 }}>
                      <Text type="danger">*</Text> 渠道模型
                    </div>
                    <Select
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="选择渠道模型"
                      value={cfg.channelModelId || undefined}
                      disabled={!cfg.channelId}
                      showSearch
                      optionFilterProp="label"
                      onChange={(v) => handleChannelModelChange(cfg.id, v)}
                      options={channelModels
                        .filter((m) => m.channelId === cfg.channelId)
                        .map((m) => ({ value: m.id, label: m.modelName }))}
                    />
                  </Col>
                  {cfg.channelModelId && (
                    <Col span={12}>
                      <div style={{ marginBottom: 6 }}>Model code</div>
                      <Input value={cfg.modelCode} disabled style={{ marginBottom: 12 }} />
                    </Col>
                  )}
                </Row>

                <div style={{ marginBottom: 8 }}>
                  <Text type="danger">*</Text> <Text strong>端点配置</Text>
                </div>
                {configEndpoints.length === 0 ? (
                  <Text type="secondary">暂无配置，请先配置端点</Text>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {configEndpoints.map((ep) => (
                      <div key={ep} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 220, flex: 'none', textAlign: 'left', color: '#5a6474' }}>
                          {ep}：
                        </div>
                        <Input
                          maxLength={200}
                          showCount
                          placeholder="填入映射地址"
                          value={getMapping(cfg, ep)}
                          onChange={(e) => setEndpointMapping(cfg.id, ep, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>
                    <Text type="danger">*</Text> <Text strong>是否开启队列</Text>
                  </span>
                  <Switch
                    checked={cfg.queueEnabled}
                    onChange={(checked) => patchApiConfig(cfg.id, { queueEnabled: checked })}
                  />
                </div>
                {cfg.queueEnabled && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="danger">*</Text> 排队上限
                      </div>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        value={cfg.queueLimit}
                        onChange={(v) => patchApiConfig(cfg.id, { queueLimit: v ?? 0 })}
                      />
                    </Col>
                    <Col span={12}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="danger">*</Text> 超时时间
                      </div>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        addonAfter="毫秒"
                        value={cfg.timeout}
                        onChange={(v) => patchApiConfig(cfg.id, { timeout: v ?? 0 })}
                      />
                    </Col>
                  </Row>
                )}

                <div style={{ marginTop: 16 }}>
                  <Button danger onClick={() => removeApiConfig(cfg.id)}>
                    删除
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <Modal
      title={
        model ? (
          '编辑模型'
        ) : (
          <Space size={6}>
            添加新模型
            <RequirementDot
              title="添加新模型"
              sections={[
                {
                  label: 'API配置中，修改同页面。',
                  items: [
                    '1.选择渠道，必选，展示渠道名称，按照添加时间倒序展示。选择后，展示渠道配置的api地址、api名称。',
                    '2.点击“渠道模型”，下拉展示该渠道商下所有关联的渠道模型（下拉框中展示渠道模型名称和渠道模型状态），选择后，自动展示“Model code” 且不可修改。',
                    '3.选择模型后，如已选择了端点，则检查模型是否为这些端点设置了映射地址，如有，则自动填写（支持修改）。 如没有，则需要自行填写。',
                    '4.在配置端点处，修改端点；如取消或增加某些端点，则又点击API配置时，需要查询模型配置的端点映射地址，自动填写。逻辑同第3点。',
                  ],
                },
              ]}
            />
          </Space>
        )
      }
      width={880}
      centered
      open={open}
      onCancel={onClose}
      okText="添加模型"
      cancelText="取消"
      onOk={handleSave}
      destroyOnHidden
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'basic', label: '基本信息', children: basicPane },
          { key: 'endpoints', label: '配置端点', children: endpointsPane },
          { key: 'api', label: 'API配置', children: apiPane },
          {
            key: 'params',
            label: '参数配置',
            children: <Empty description="参数配置待补充" style={{ padding: '40px 0' }} />,
          },
          {
            key: 'features',
            label: '功能配置',
            children: <Empty description="功能配置待补充" style={{ padding: '40px 0' }} />,
          },
        ]}
      />
    </Modal>
  )
}
