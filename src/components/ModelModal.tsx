import { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Cascader,
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
import { uid, readStoredChannels } from '../store'
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
      multiplierName: '',
      modelMultiplier: 1,
      channelEnabled: true,
      endpointMappings: defaultEndpointMappings(),
      queueEnabled: true,
      queueLimit: 1,
      timeout: 1,
    },
  ],
})

/** 倍率名称长度上限：需小于 8 个字 */
const MULTIPLIER_NAME_MAX = 8

/** 校验同一模型下各 API 配置的倍率名称：必填、小于 8 个字、不可重复 */
const validateMultiplierNames = (configs: ModelApiConfig[]): string | null => {
  const names = configs.map((c) => (c.multiplierName ?? '').trim())
  if (names.some((n) => !n)) return '请填写每条 API 配置的「倍率名称」'
  if (names.some((n) => n.length >= MULTIPLIER_NAME_MAX)) return `倍率名称需小于 ${MULTIPLIER_NAME_MAX} 个字`
  const duplicated = names.find((n, i) => names.indexOf(n) !== i)
  if (duplicated) return `倍率名称「${duplicated}」已存在，同一模型下不可重复`
  return null
}

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
  const [optionChannels, setOptionChannels] = useState<Channel[]>(channels)
  const [cascaderKey, setCascaderKey] = useState(0)
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
      setOptionChannels(channels)
      setApiConfigs(
        (init.apiConfigs ?? []).map((c) => ({
          ...c,
          modelMultiplier: c.modelMultiplier ?? 1,
          multiplierName: c.multiplierName ?? '',
          channelEnabled: c.channelEnabled ?? true,
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
        multiplierName: '',
        modelMultiplier: 1,
        channelEnabled: true,
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

  const handleChannelApiChange = (id: string, channelId: string, credentialId: string) => {
    patchApiConfig(id, { channelId, credentialId, channelModelId: undefined, modelCode: '' })
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
      const nameError = validateMultiplierNames(apiConfigs)
      if (nameError) {
        setTab('api')
        message.error(nameError)
        return
      }
      const cleanedConfigs = apiConfigs.map((c) => ({
        ...c,
        multiplierName: (c.multiplierName ?? '').trim(),
        modelMultiplier: c.modelMultiplier ?? 1,
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
        <Text type="secondary">配置模型可用的 API 模型生产方，支持多个模型生产方负载均衡</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={addApiConfig}>
          添加配置
        </Button>
      </div>

      {apiConfigs.length === 0 ? (
        <Empty description="暂无 API 配置，点击「添加配置」新增" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apiConfigs.map((cfg) => {
            const ch = optionChannels.find((c) => c.id === cfg.channelId) as Channel | undefined
            const cred = ch?.apiCredentials?.find((x) => x.id === cfg.credentialId)
            return (
              <div
                key={cfg.id}
                style={{ border: '1px solid #eef0f4', borderRadius: 8, padding: 16 }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 6 }}>
                      <Text type="danger">*</Text> 渠道/API名称
                    </div>
                    <Cascader
                      key={cascaderKey}
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="请选择渠道/API名称"
                      expandTrigger="hover"
                      value={ch ? (cred ? [ch.id, cred.id] : [ch.id]) : undefined}
                      onChange={(value) => {
                        if (!Array.isArray(value) || value.length < 2) return
                        const [chId, credId] = value as string[]
                        const fresh = readStoredChannels()
                        const alive = fresh
                          .find((c) => c.id === chId)
                          ?.apiCredentials?.some((x) => x.id === credId)
                        if (!alive) {
                          message.warning('当前API信息已变更，请重新选择')
                          patchApiConfig(cfg.id, {
                            channelId: '',
                            credentialId: undefined,
                            channelModelId: undefined,
                            modelCode: '',
                          })
                          setOptionChannels(fresh)
                          setCascaderKey((k) => k + 1)
                          return
                        }
                        handleChannelApiChange(cfg.id, chId, credId)
                      }}
                      showSearch={{
                        filter: (inputValue, path) =>
                          path.some((option) =>
                            String(option.label).toLowerCase().includes(inputValue.toLowerCase()),
                          ),
                      }}
                      options={[...optionChannels]
                        .filter((c) => (c.apiCredentials ?? []).length > 0)
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map((c) => ({
                          value: c.id,
                          label: c.name,
                          children: (c.apiCredentials ?? []).map((x) => ({
                            value: x.id,
                            label: `${x.apiName}（${x.status === 'enabled' ? '启用' : '禁用'}）`,
                          })),
                        }))}
                    />
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 6 }}>是否可用</div>
                    <Switch
                      checked={cfg.channelEnabled ?? true}
                      onChange={(checked) => patchApiConfig(cfg.id, { channelEnabled: checked })}
                      style={{ marginBottom: 12 }}
                    />
                  </Col>
                </Row>

                {ch && (
                  <div
                    style={{
                      background: '#f5f6f8',
                      borderRadius: 6,
                      padding: '10px 12px',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 2 }}>API地址</div>
                    <div
                      style={{
                        color: '#333',
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cred?.apiUrl || ch.apiCredentials?.[0]?.apiUrl || '—'}
                    </div>
                  </div>
                )}

                <Row gutter={16}>
                  <Col span={14}>
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
                  <Col span={10}>
                    <div style={{ marginBottom: 6 }}>Model code</div>
                    <Input
                      disabled
                      placeholder="自动填充"
                      value={cfg.modelCode || ''}
                      style={{ marginBottom: 12 }}
                    />
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={14}>
                    <div style={{ marginBottom: 6 }}>
                      <Text type="danger">*</Text> 倍率名称
                    </div>
                    <Input
                      maxLength={MULTIPLIER_NAME_MAX}
                      placeholder="必填，小于8个字，如：标准倍率"
                      value={cfg.multiplierName ?? ''}
                      onChange={(e) => patchApiConfig(cfg.id, { multiplierName: e.target.value })}
                      style={{ marginBottom: 16 }}
                    />
                  </Col>
                  <Col span={10}>
                    <div style={{ marginBottom: 6 }}>模型倍率</div>
                    <InputNumber
                      min={0}
                      step={0.1}
                      precision={2}
                      style={{ width: '100%', marginBottom: 16 }}
                      placeholder="如：1x、2.3x"
                      addonAfter="x"
                      value={cfg.modelMultiplier}
                      onChange={(v) =>
                        patchApiConfig(cfg.id, {
                          modelMultiplier:
                            v === null || v === undefined ? undefined : Math.round(v * 100) / 100,
                        })
                      }
                    />
                  </Col>
                </Row>

                <div style={{ marginBottom: 8 }}>
                  <Text type="danger">*</Text> 端点配置
                </div>
                {configEndpoints.length === 0 ? (
                  <Text type="secondary">暂无配置，请先配置端点</Text>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {configEndpoints.map((ep) => {
                      const mapping = cfg.endpointMappings.find((m) => m.endpointKey === ep)
                      return (
                        <div key={ep} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 220, flex: 'none', textAlign: 'left', color: '#5a6474' }}>
                            {ep}：
                          </div>
                          <Input
                            maxLength={200}
                            placeholder="填入映射地址"
                            value={mapping?.mappingUrl ?? ''}
                            onChange={(e) => setEndpointMapping(cfg.id, ep, e.target.value)}
                          />
                        </div>
                      )
                    })}
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
          <Space size={6}>
            编辑模型
            <RequirementDot
              title="编辑模型 — 倍率名称 / 模型倍率 / 渠道开关"
              sections={[
                {
                  label: '倍率名称',
                  items: [
                    '1.点击API配置tab，在模型倍率之前增加「倍率名称」输入框，必填，小于8个字，同一模型的多组API配置之间不可重复',
                    '2.倍率名称用于区分同一模型的不同倍率配置，模型详情的API配置tab与模型列表的模型渠道中同步展示',
                  ],
                },
                {
                  label: '模型倍率',
                  items: [
                    '1.点击API配置tab，在编辑渠道模型时，可以为模型修改倍率，默认为1，支持2位小数，仅可输入数字，不输入时，存储为1倍',
                    '2.编辑模型倍率后，编辑以后产生的费用，以新的倍率为准',
                  ],
                },
                {
                  label: '渠道开关',
                  items: [
                    '1.点击API配置tab，编辑配置时，去掉权重输入框，增加「是否可用」开关，默认开启',
                    '2.模型详情的API配置tab中同步展示「是否可用」状态',
                  ],
                },
              ]}
            />
          </Space>
        ) : (
          <Space size={6}>
            添加新模型
            <RequirementDot
              title="添加新模型 — 倍率名称 / 模型倍率 / 渠道开关"
              sections={[
                {
                  label: '倍率名称',
                  items: [
                    '1.点击API配置tab，在模型倍率之前增加「倍率名称」输入框，必填，小于8个字，同一模型的多组API配置之间不可重复',
                    '2.未填写、大于等于8个字或名称重复时，点击「添加模型」会被拦截并给出提示，同时自动切到API配置tab',
                  ],
                },
                {
                  label: '模型倍率',
                  items: [
                    '1.点击API配置tab，在添加渠道模型时，需要为模型添加倍率，默认为1，支持2位小数，仅可输入数字，不输入时，存储为1倍',
                  ],
                },
                {
                  label: '渠道开关',
                  items: [
                    '1.点击API配置tab，添加配置时，去掉权重输入框，增加「是否可用」开关，默认开启；关闭后渠道将不可调用，开启后，如渠道api状态关闭，也不可调用',
                  ],
                },
                {
                  label: '渠道/API名称',
                  items: [
                    '1.API配置中，渠道名称改为“渠道/API名称”，下拉框改为级联下拉，首先展示渠道（下方有API的，未删除的渠道），鼠标悬浮在渠道，展示渠道下API名称+（启用/禁用）。如选择后API被删除，则提示“当前API信息已变更，请重新选择”，提示完了刷新下拉列表数据',
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
