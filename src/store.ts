import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type {
  Channel,
  ChannelModelItem,
  CommissionRecord,
  ExchangeRecord,
  GroupOwner,
  ModelApiConfig,
  ModelItem,
  ModelGroup,
  ModelRebateRule,
  PromoActivityPage,
  PromoCampaign,
  PromoCampaignModel,
  PromoCampaignScope,
  PromoModelCategory,
  PromoInvitee,
  PromoPartner,
  PromoPartnerStatus,
  ResourcePack,
  TokenPlan,
  AccountLedger,
  OrderDetail,
  AccountTag,
  Voucher,
  VoucherIssueTask,
  VoucherSource,
  VoucherStatus,
  VoucherTemplate,
  VoucherPeriodUnit,
  VoucherTaskAccountScope,
  VoucherTaskFiring,
  VoucherTaskSchedule,
  WithdrawRequest,
} from './types'
import { calcPlanDiscountedPrice, roundAmount, VOUCHER_STATUS_LABEL } from './types'

const STORAGE_KEY = 'zsdd_channels_v14'

const uid = () => Math.random().toString(36).slice(2, 10)

/** 内置渠道 seed 使用固定 id，避免每次重新播种生成随机 id 导致引用悬空 */
export const SEED_CHANNEL_IDS = {
  aliyun: 'seed_ch_aliyun',
  tencent: 'seed_ch_tencent',
  huawei: 'seed_ch_huawei',
  baidu: 'seed_ch_baidu',
  silicon: 'seed_ch_silicon',
}
export const SEED_CREDENTIAL_IDS = {
  aliyunEast: 'seed_cred_aliyun_east',
  aliyunNorth: 'seed_cred_aliyun_north',
  tencentGuangzhou: 'seed_cred_tencent_gz',
  siliconHangzhou: 'seed_cred_silicon_hz',
}

export const CURRENT_OPERATOR = '管理员'

/** 控制台（Token 工厂）演示账号：与账户管理、充值任务、用户自定义分组中的用户保持一致 */
export const CURRENT_CONSOLE_USER: GroupOwner = {
  nickname: '张明',
  phone: '13811305182',
  accountId: 'ACC20260810PVPbI3MgE',
}

const seed: Channel[] = [
  {
    id: SEED_CHANNEL_IDS.aliyun,
    name: '阿里云百炼',
    apiCredentials: [
      {
        id: SEED_CREDENTIAL_IDS.aliyunEast,
        apiName: '阿里云-华东主站',
        apiUrl: 'https://dashscope.aliyuncs.com/api/v1',
        apiKey: 'sk-aliyun-east-demo',
        remark: '默认线路',
        status: 'enabled',
        operator: '王敏',
        createdAt: '2026-01-12',
      },
      {
        id: SEED_CREDENTIAL_IDS.aliyunNorth,
        apiName: '阿里云-华北备站',
        apiUrl: 'https://dashscope-beijing.aliyuncs.com/api/v1',
        apiKey: 'sk-aliyun-north-demo',
        remark: '华北备用集群',
        status: 'disabled',
        operator: '王敏',
        createdAt: '2026-01-20',
      },
    ],
    contact: '张工',
    phone: '13800000000',
    remark: '账户余额预扣',
    operator: '王敏',
    createdAt: '2026-01-12',
    settlement: {
      method: 'prepaid',
      currency: 'CNY',
      billingCycle: 'month',
      taxRate: 6,
      remark: '账户余额预扣',
    },
    models: [
      {
        id: uid(),
        modelName: 'qwen-turbo',
        billingType: 'token',
        inputPrice: 0.3,
        outputPrice: 0.6,
        unit: '元/千Tokens',
      },
    ],
  },
  {
    id: SEED_CHANNEL_IDS.tencent,
    name: '腾讯云 TI',
    apiCredentials: [
      {
        id: SEED_CREDENTIAL_IDS.tencentGuangzhou,
        apiName: '腾讯云-广州主站',
        apiUrl: 'https://tione.tencentcloudapi.com',
        apiKey: 'sk-tencent-gz-demo',
        status: 'enabled',
        operator: '李强',
        createdAt: '2026-02-03',
      },
    ],
    contact: '李工',
    phone: '13900000000',
    remark: '月结30天',
    operator: '李强',
    createdAt: '2026-02-03',
    settlement: {
      method: 'postpaid',
      currency: 'CNY',
      billingCycle: 'month',
      taxRate: 6,
      remark: '月结30天',
    },
    models: [
      {
        id: uid(),
        modelName: 'A100 训练集群',
        billingType: 'gpu_hour',
        gpuHourPrice: 18,
        unit: '元/卡时',
      },
    ],
  },
  {
    id: SEED_CHANNEL_IDS.huawei,
    name: '华为云 ModelArts',
    apiCredentials: [],
    contact: '赵工',
    phone: '13700000000',
    remark: '已建渠道，待添加 API 配置',
    operator: '赵磊',
    createdAt: '2026-03-02',
    settlement: {
      method: 'postpaid',
      currency: 'CNY',
      billingCycle: 'month',
      taxRate: 6,
      remark: '月结30天',
    },
    models: [],
  },
  {
    id: SEED_CHANNEL_IDS.baidu,
    name: '百度智能云千帆',
    apiCredentials: [],
    contact: '孙工',
    phone: '13600000000',
    remark: '新签约渠道，尚未配置 API',
    operator: '孙倩',
    createdAt: '2026-03-05',
    settlement: {
      method: 'prepaid',
      currency: 'CNY',
      billingCycle: 'month',
      taxRate: 6,
      remark: '账户余额预扣',
    },
    models: [],
  },
  {
    id: SEED_CHANNEL_IDS.silicon,
    name: '硅基流动',
    apiCredentials: [
      {
        id: SEED_CREDENTIAL_IDS.siliconHangzhou,
        apiName: '硅基流动-杭州主站',
        apiUrl: 'https://api.siliconflow.cn/v1',
        apiKey: 'sk-siliconflow-demo',
        remark: '默认线路',
        status: 'enabled',
        operator: '陈晨',
        createdAt: '2026-03-08',
      },
    ],
    contact: '陈工',
    phone: '13500000000',
    remark: '聚合模型渠道',
    operator: '陈晨',
    createdAt: '2026-03-08',
    settlement: {
      method: 'prepaid',
      currency: 'CNY',
      billingCycle: 'month',
      taxRate: 6,
      remark: '账户余额预扣',
    },
    models: [],
  },
]

function load(): Channel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Channel[]
  } catch {
    /* ignore */
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
  return seed
}

let state: Channel[] = load()
const listeners = new Set<() => void>()

function emit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return state
}

/** 直读 localStorage 的最新渠道数据（可感知其他标签页的变更） */
export function readStoredChannels(): Channel[] {
  return load()
}

export function useChannels() {
  const channels = useSyncExternalStore(subscribe, getSnapshot)

  const addChannel = useCallback((c: Omit<Channel, 'id' | 'createdAt' | 'operator'>) => {
    const now = new Date().toISOString().slice(0, 10)
    state = [{ ...c, id: uid(), createdAt: now, operator: CURRENT_OPERATOR }, ...state]
    emit()
  }, [])

  const updateChannel = useCallback((id: string, patch: Partial<Channel>) => {
    state = state.map((c) => (c.id === id ? { ...c, ...patch } : c))
    emit()
  }, [])

  const removeChannel = useCallback((id: string) => {
    state = state.filter((c) => c.id !== id)
    emit()
  }, [])

  return { channels, addChannel, updateChannel, removeChannel }
}

export { uid }

/** 内置 seed 之间互相引用时，按名称解析当前实际渠道与 API 配置，避免下标错位 */
const seedChannels = {
  aliyun: state.find((c) => c.name === '阿里云百炼') ?? seed.find((c) => c.name === '阿里云百炼'),
  tencent: state.find((c) => c.name === '腾讯云 TI') ?? seed.find((c) => c.name === '腾讯云 TI'),
  silicon: state.find((c) => c.name === '硅基流动') ?? seed.find((c) => c.name === '硅基流动'),
}

const MODEL_STORAGE_KEY = 'zsdd_channel_models_v6'

const modelSeed: ChannelModelItem[] = [
  {
    id: uid(),
    modelName: 'Qwen-Turbo 对话',
    channelId: seedChannels.aliyun?.id ?? '',
    credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
    modelCode: 'qwen-turbo',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/compatible-mode/v1/chat/completions' },
      { endpointKey: 'embeddings', mappingUrl: '/compatible-mode/v1/embeddings' },
    ],
    operator: '王敏',
    createdAt: '2026-01-15',
    costConfig: {
      priceType: 'token',
      inputPrice: 1,
      outputPrice: 2,
      cachedEnabled: true,
      cachedPrice: 0.02,
      cacheCreatePrice: 0,
      cacheReadPrice: 0.02,
    },
  },
  {
    id: uid(),
    modelName: 'Qwen-Plus 对话',
    channelId: seedChannels.aliyun?.id ?? '',
    credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
    modelCode: 'qwen-plus',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/compatible-mode/v1/chat/completions' },
    ],
    operator: '王敏',
    createdAt: '2026-01-18',
  },
  {
    id: uid(),
    modelName: 'Qwen-Max 长文本',
    channelId: seedChannels.aliyun?.id ?? '',
    credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
    modelCode: 'qwen-max-longcontext',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/compatible-mode/v1/chat/completions' },
    ],
    operator: '王敏',
    createdAt: '2026-01-20',
  },
  {
    id: uid(),
    modelName: 'text-embedding-v3 向量',
    channelId: seedChannels.aliyun?.id ?? '',
    credentialId: seedChannels.aliyun?.apiCredentials?.[1]?.id,
    modelCode: 'text-embedding-v3',
    endpoints: [
      { endpointKey: 'embeddings', mappingUrl: '/compatible-mode/v1/embeddings' },
    ],
    operator: '王敏',
    createdAt: '2026-01-22',
    costConfig: {
      priceType: 'image_quality',
      tiers: [
        { label: '720p', price: 0.4 },
        { label: '1080p', price: 0.8 },
      ],
    },
  },
  {
    id: uid(),
    modelName: 'A100 训练模型',
    channelId: seedChannels.tencent?.id ?? '',
    credentialId: seedChannels.tencent?.apiCredentials?.[0]?.id,
    modelCode: 'ti-a100-train',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/v1/chat/completions' },
    ],
    operator: '李强',
    createdAt: '2026-02-05',
  },
  {
    id: uid(),
    modelName: 'Qwen-VL 多模态',
    channelId: seedChannels.aliyun?.id ?? '',
    credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
    modelCode: 'qwen-vl-max',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/compatible-mode/v1/chat/completions' },
    ],
    operator: '王敏',
    createdAt: '2026-02-10',
  },
  {
    id: uid(),
    modelName: 'Hunyuan 对话',
    channelId: seedChannels.tencent?.id ?? '',
    credentialId: seedChannels.tencent?.apiCredentials?.[0]?.id,
    modelCode: 'hunyuan-pro',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/v1/chat/completions' },
    ],
    operator: '李强',
    createdAt: '2026-02-12',
  },
  {
    id: uid(),
    modelName: 'DeepSeek-V4-Pro',
    channelId: seedChannels.silicon?.id ?? '',
    credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
    modelCode: 'deepseek-v4-pro',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/v1/chat/completions' },
    ],
    operator: '陈晨',
    createdAt: '2026-03-08',
  },
  {
    id: uid(),
    modelName: 'DeepSeek-V4-Flash',
    channelId: seedChannels.silicon?.id ?? '',
    credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
    modelCode: 'deepseek-v4-flash',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/v1/chat/completions' },
    ],
    operator: '陈晨',
    createdAt: '2026-03-08',
  },
  {
    id: uid(),
    modelName: 'Glm-5.3',
    channelId: seedChannels.silicon?.id ?? '',
    credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
    modelCode: 'glm-5.3',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/v1/chat/completions' },
    ],
    operator: '陈晨',
    createdAt: '2026-03-08',
  },
]

function loadModels(): ChannelModelItem[] {
  try {
    const raw = localStorage.getItem(MODEL_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ChannelModelItem[]
  } catch {
    /* ignore */
  }
  localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(modelSeed))
  return modelSeed
}

/** 内置渠道模型 seed 的渠道归属：modelCode → 期望渠道名称与 API 配置下标（用于悬空引用自愈） */
const seedChannelModelIntent: Record<string, { channelName: string; credIndex: number }> = {
  'qwen-turbo': { channelName: '阿里云百炼', credIndex: 0 },
  'qwen-plus': { channelName: '阿里云百炼', credIndex: 0 },
  'qwen-max-longcontext': { channelName: '阿里云百炼', credIndex: 0 },
  'text-embedding-v3': { channelName: '阿里云百炼', credIndex: 1 },
  'qwen-vl-max': { channelName: '阿里云百炼', credIndex: 0 },
  'ti-a100-train': { channelName: '腾讯云 TI', credIndex: 0 },
  'hunyuan-pro': { channelName: '腾讯云 TI', credIndex: 0 },
  'deepseek-v4-pro': { channelName: '硅基流动', credIndex: 0 },
  'deepseek-v4-flash': { channelName: '硅基流动', credIndex: 0 },
  'glm-5.3': { channelName: '硅基流动', credIndex: 0 },
}

/** 修复渠道模型行里悬空的 channelId / credentialId，避免「渠道名称」列展示为 — */
function healChannelModelRefs(rows: ChannelModelItem[]): ChannelModelItem[] | null {
  const liveChannels = state
  if (!liveChannels.length) return null
  const credOwner = new Map<string, Channel>()
  liveChannels.forEach((channel) =>
    (channel.apiCredentials ?? []).forEach((cred) => credOwner.set(cred.id, channel)),
  )
  const findCred = (channelId: string, credIndex?: number) => {
    const creds = liveChannels.find((c) => c.id === channelId)?.apiCredentials ?? []
    const hit =
      (credIndex !== undefined ? creds[credIndex] : undefined) ??
      creds.find((c) => c.status === 'enabled') ??
      creds[0]
    return hit?.id
  }
  let changed = false
  const next = rows.map((row) => {
    const item = { ...row }
    const hint: { channelName: string; credIndex: number } | undefined =
      seedChannelModelIntent[item.modelCode]
    const owner = item.credentialId ? credOwner.get(item.credentialId) : undefined
    const channelOk = liveChannels.some((c) => c.id === item.channelId)
    if (owner) {
      item.channelId = owner.id
    } else if (!channelOk && hint) {
      const channel = liveChannels.find((c) => c.name === hint.channelName)
      if (channel) {
        item.channelId = channel.id
        item.credentialId = findCred(channel.id, hint.credIndex)
      }
    } else if (!item.credentialId) {
      const matched = liveChannels.find((c) => c.id === item.channelId)
      item.credentialId = findCred(item.channelId, hint && matched?.name === hint.channelName ? hint.credIndex : undefined)
    }
    if (item.channelId !== row.channelId || item.credentialId !== row.credentialId) {
      changed = true
    }
    return item
  })
  return changed ? next : null
}

let modelState: ChannelModelItem[] = loadModels()
const healedChannelModels = healChannelModelRefs(modelState)
if (healedChannelModels) {
  modelState = healedChannelModels
  localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(healedChannelModels))
}
const modelListeners = new Set<() => void>()

function emitModels() {
  localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(modelState))
  modelListeners.forEach((l) => l())
}

function subscribeModels(cb: () => void) {
  modelListeners.add(cb)
  return () => modelListeners.delete(cb)
}

function getModelsSnapshot() {
  return modelState
}

export function useChannelModels() {
  const channelModels = useSyncExternalStore(subscribeModels, getModelsSnapshot)

  const addChannelModel = useCallback(
    (m: Omit<ChannelModelItem, 'id' | 'createdAt' | 'operator'>) => {
      const now = new Date().toISOString().slice(0, 10)
      modelState = [{ ...m, id: uid(), createdAt: now, operator: CURRENT_OPERATOR }, ...modelState]
      emitModels()
    },
    [],
  )

  const updateChannelModel = useCallback((id: string, patch: Partial<ChannelModelItem>) => {
    modelState = modelState.map((m) => (m.id === id ? { ...m, ...patch } : m))
    emitModels()
  }, [])

  const removeChannelModel = useCallback((id: string) => {
    modelState = modelState.filter((m) => m.id !== id)
    emitModels()
  }, [])

  return { channelModels, addChannelModel, updateChannelModel, removeChannelModel }
}

/** v4：API 配置新增「倍率名称」字段，seed 结构变更故递增版本号 */
const MODEL_LIST_STORAGE_KEY = 'zsdd_models_v4'

/** 内置 seed 的渠道归属：modelCode → 期望渠道名称与 API 配置下标（用于悬空引用自愈） */
const seedModelIntent: Record<string, { channelName: string; credIndex: number }[]> = {
  'qwen-turbo': [
    { channelName: '阿里云百炼', credIndex: 1 },
    { channelName: '腾讯云 TI', credIndex: 0 },
  ],
  'ti-a100-train': [{ channelName: '腾讯云 TI', credIndex: 0 }],
  'doubao-seedance-2.0': [{ channelName: '硅基流动', credIndex: 0 }],
  'dodo-ac-ultra-5': [{ channelName: '阿里云百炼', credIndex: 0 }],
  'deepseek-v4-flash': [{ channelName: '腾讯云 TI', credIndex: 0 }],
  'glm-5.2-fp8': [{ channelName: '硅基流动', credIndex: 0 }],
  'glm-5.2': [
    { channelName: '阿里云百炼', credIndex: 1 },
    { channelName: '腾讯云 TI', credIndex: 0 },
  ],
}

/**
 * 模型广场共 28 个模型，后台「模型列表」必须与之一一对应：广场模型若在后台没有任何 API 配置，
 * 「分档定价」就只能落到兜底的「默认倍率」，既没有多档倍率可选，也无法「加入到分组」。
 * 其余 23 个模型（除上方手工维护的 5 个）按模态批量补齐三档倍率：标准 1x / 尊享加速 2x / 独享资源 3x，
 * 三档分属三个渠道，使各档位的延迟、吞吐、成功率彼此可区分。
 */
type PlazaTypeProfile = {
  inputModals: string[]
  outputModals: string[]
  maxOutputToken: number
  pricingMode: ModelItem['pricingMode']
  configEndpoints: string[]
  timeout: number
  onlineAt: string
}

const plazaTypeProfile: Record<'text' | 'image' | 'video', PlazaTypeProfile> = {
  text: {
    inputModals: ['文本'],
    outputModals: ['文本'],
    maxOutputToken: 16000,
    pricingMode: 'token',
    configEndpoints: ['/v1/chat/completions'],
    timeout: 120000,
    onlineAt: '2026-08-05',
  },
  image: {
    inputModals: ['文本', '图像'],
    outputModals: ['图像'],
    maxOutputToken: 4096,
    pricingMode: 'image_quality',
    configEndpoints: ['/v1/images/generations', '/v1/images/edits'],
    timeout: 60000,
    onlineAt: '2026-07-20',
  },
  video: {
    inputModals: ['文本', '图像'],
    outputModals: ['视频'],
    maxOutputToken: 4096,
    pricingMode: 'video_quality_token',
    configEndpoints: ['/v1/videos/generations'],
    timeout: 300000,
    onlineAt: '2026-07-28',
  },
}

const vendorLogos: Record<string, string> = {
  智算多多: '智',
  阿里: '阿',
  智谱: '智',
  深度求索: '深',
  月之暗面: '月',
  稀宇科技: '稀',
  小米: '米',
  字节跳动: '字',
  谷歌: '谷',
  爱诗科技: '爱',
  生数: '生',
}

const plazaTierPresets: {
  multiplierName: string
  modelMultiplier: number
  channelKey: 'aliyun' | 'tencent' | 'silicon'
  credIndex: number
  queueEnabled: boolean
  queueLimit: number
}[] = [
  { multiplierName: '标准倍率', modelMultiplier: 1, channelKey: 'aliyun', credIndex: 0, queueEnabled: false, queueLimit: 1 },
  { multiplierName: '尊享加速倍率', modelMultiplier: 2, channelKey: 'tencent', credIndex: 0, queueEnabled: true, queueLimit: 30 },
  { multiplierName: '独享资源倍率', modelMultiplier: 3, channelKey: 'silicon', credIndex: 0, queueEnabled: false, queueLimit: 1 },
]

/** 广场模型名称 → API 标识：与广场卡片 id 的命名保持一致（小写、非字母数字转 `-`） */
const plazaModelCode = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const plazaOnlyModels: { name: string; vendor: string; type: 'text' | 'image' | 'video'; intro: string; hot?: boolean }[] = [
  { name: 'DODO-OG-G-6-Astra', vendor: '智算多多', type: 'text', intro: '国外顶尖模型，长上下文与复杂推理任务的旗舰之选。' },
  { name: 'DODO-OG-G-5-6-Sol', vendor: '智算多多', type: 'text', intro: '顶尖模型，兼顾效果与成本的日常主力。' },
  { name: 'Kimi-K3', vendor: '月之暗面', type: 'text', intro: '月之暗面旗舰开源模型，长上下文与复杂推理表现突出。', hot: true },
  { name: 'GLM-5.3', vendor: '智谱', type: 'text', intro: '智谱代码与安全专用旗舰模型，代码生成与安全审计能力更强。' },
  { name: 'Qwen3.8-Max', vendor: '阿里', type: 'text', intro: '2.4 万亿参数 MoE 旗舰，编程与办公能力全面跃升。', hot: true },
  { name: 'DeepSeek-V4', vendor: '深度求索', type: 'text', intro: '旗舰推理模型，多步骤推理与智能体任务执行更稳定。' },
  { name: 'MiniMax-M3', vendor: '稀宇科技', type: 'text', intro: '长上下文与多模态理解并重，角色扮演与内容创作表现突出。' },
  { name: 'MiMo-VL-Pro', vendor: '小米', type: 'text', intro: '小米多模态理解模型，图文混排解析与视觉问答表现出色。' },
  { name: 'Doubao-Seed-2.0', vendor: '字节跳动', type: 'text', intro: '豆包主力对话模型，推理、创作与工具调用能力均衡。' },
  { name: 'Gemini-3.1-Pro', vendor: '谷歌', type: 'text', intro: '国外顶尖模型，原生多模态推理与超长上下文标杆。', hot: true },
  { name: 'DODO-Vision-4', vendor: '智算多多', type: 'image', intro: '文生图与图像编辑一体，中英文字渲染精准。' },
  { name: 'Wan-Image-2.5', vendor: '阿里', type: 'image', intro: '通义万相图像模型，海报与知识密集型场景效果佳。' },
  { name: 'GLM-Image', vendor: '智谱', type: 'image', intro: '智谱图像生成模型，版式控制与图文混排能力突出。' },
  { name: 'Imagen-5', vendor: '谷歌', type: 'image', intro: '国外顶尖图像模型，写实细节与光影表现业界领先。', hot: true },
  { name: 'PixVerse-Image', vendor: '爱诗科技', type: 'image', intro: '爱诗科技图像生成模型，风格化与主体一致性控制出色。' },
  { name: 'Vidu-Image', vendor: '生数', type: 'image', intro: '生数科技图像模型，多主体一致性与参考图控制见长。' },
  { name: 'Qwen-Image-Layered', vendor: '阿里', type: 'image', intro: '分层图像模型，支持可编辑图层与精准文字排版。' },
  { name: 'DODO-Veo-Fast', vendor: '智算多多', type: 'video', intro: '极速视频生成，适合短视频批量生产与效果预览。' },
  { name: 'Wan-Video-2.5', vendor: '阿里', type: 'video', intro: '通义万相视频模型，运镜控制与人物动作更自然。' },
  { name: 'PixVerse-V5', vendor: '爱诗科技', type: 'video', intro: '爱诗科技旗舰视频模型，动漫与特效风格表现突出。' },
  { name: 'Vidu-Q3', vendor: '生数', type: 'video', intro: '生数科技 Q 系列视频模型，长时长与主体一致性领先。' },
  { name: 'MiniMax-Hailuo-2.5', vendor: '稀宇科技', type: 'video', intro: '海螺视频模型，电影级镜头语言与人物表演细节丰富。' },
  { name: 'Veo-4', vendor: '谷歌', type: 'video', intro: '国外顶尖视频模型，原生音频与物理真实感表现标杆。', hot: true },
]

const plazaSeedModels: ModelItem[] = plazaOnlyModels.map((item) => {
  const profile = plazaTypeProfile[item.type]
  const modelCode = plazaModelCode(item.name)
  /** 批量模型的渠道归属同样登记到自愈映射，渠道被删除重建后仍能修回正确的 API 配置 */
  seedModelIntent[modelCode] = plazaTierPresets.map((preset) => ({
    channelName: seedChannels[preset.channelKey]?.name ?? '',
    credIndex: preset.credIndex,
  }))
  return {
    id: `plaza_${modelCode}`,
    logo: vendorLogos[item.vendor] ?? item.vendor.slice(0, 1),
    name: item.name,
    vendor: item.vendor,
    type: item.type,
    inputModals: profile.inputModals,
    outputModals: profile.outputModals,
    maxOutputToken: profile.maxOutputToken,
    pricingMode: profile.pricingMode,
    hot: item.hot ?? false,
    deepThinking: item.type === 'text',
    sort: 99,
    online: true,
    onlineAt: profile.onlineAt,
    modelCode,
    intro: item.intro,
    configEndpoints: profile.configEndpoints,
    apiConfigs: plazaTierPresets.map((preset, index) => ({
      id: `plaza_${modelCode}_cfg${index + 1}`,
      channelId: seedChannels[preset.channelKey]?.id ?? '',
      credentialId: seedChannels[preset.channelKey]?.apiCredentials?.[preset.credIndex]?.id,
      modelCode,
      multiplierName: preset.multiplierName,
      modelMultiplier: preset.modelMultiplier,
      channelEnabled: true,
      endpointMappings: profile.configEndpoints.map((endpointKey) => ({ endpointKey, mappingUrl: endpointKey })),
      queueEnabled: preset.queueEnabled,
      queueLimit: preset.queueLimit,
      timeout: profile.timeout,
    })),
  }
})

const modelListSeed: ModelItem[] = [
  {
    id: uid(),
    logo: '字',
    name: 'Doubao-Seedream-5.0-Pro',
    vendor: '字节跳动',
    type: 'image',
    inputModals: ['文本', '图像'],
    outputModals: ['图像'],
    maxOutputToken: 4096,
    pricingMode: 'image_quality',
    hot: false,
    deepThinking: false,
    sort: 99,
    online: true,
    onlineAt: '2026-07-15',
    modelCode: 'doubao-seedream-5.0-pro',
    contextWindow: 8192,
    intro: '字节跳动豆包文生图旗舰模型，支持高保真图像生成与图生图编辑。',
    docTags: ['文生图', '图像编辑'],
    configEndpoints: ['/v1/images/generations', '/v1/images/edits'],
    apiConfigs: [
      {
        id: uid(),
        channelId: seedChannels.aliyun?.id ?? '',
        credentialId: seedChannels.aliyun?.apiCredentials?.[1]?.id,
        modelCode: 'qwen-turbo',
        multiplierName: '标准倍率',
        modelMultiplier: 1.5,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/images/generations', mappingUrl: '/v1/images/generations' },
          { endpointKey: '/v1/images/edits', mappingUrl: '/v1/images/edits' },
        ],
        queueEnabled: true,
        queueLimit: 20,
        timeout: 60000,
      },
      {
        id: uid(),
        channelId: seedChannels.tencent?.id ?? '',
        credentialId: seedChannels.tencent?.apiCredentials?.[0]?.id,
        modelCode: 'ti-a100-train',
        multiplierName: '备用渠道倍率',
        modelMultiplier: 2.35,
        channelEnabled: false,
        endpointMappings: [
          { endpointKey: '/v1/images/generations', mappingUrl: '/v2/images/generations' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 30000,
      },
      {
        id: uid(),
        channelId: seedChannels.silicon?.id ?? '',
        credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
        modelCode: 'doubao-seedream-5.0-pro',
        multiplierName: '高清出图倍率',
        modelMultiplier: 3.2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/images/generations', mappingUrl: '/v1/images/generations' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 60000,
      },
      {
        id: uid(),
        channelId: seedChannels.silicon?.id ?? '',
        credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
        modelCode: 'doubao-seedream-5.0-pro',
        multiplierName: '尊享加速倍率',
        modelMultiplier: 2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/images/generations', mappingUrl: '/v1/images/generations' },
          { endpointKey: '/v1/images/edits', mappingUrl: '/v1/images/edits' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 60000,
      },
    ],
  },
  {
    id: uid(),
    logo: '字',
    name: 'Doubao-Seedance-2.0',
    vendor: '字节跳动',
    type: 'video',
    inputModals: ['文本', '图像', '音频', '视频'],
    outputModals: ['视频'],
    maxOutputToken: 4096,
    pricingMode: 'video_quality_token',
    hot: true,
    deepThinking: false,
    sort: 99,
    online: true,
    onlineAt: '2026-07-15',
    apiConfigs: [
      {
        id: uid(),
        channelId: seedChannels.silicon?.id ?? '',
        credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
        modelCode: 'doubao-seedance-2.0',
        multiplierName: '视频生成倍率',
        modelMultiplier: 1.2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/videos/generations', mappingUrl: '/v1/videos/generations' },
        ],
        queueEnabled: true,
        queueLimit: 10,
        timeout: 300000,
      },
      {
        id: uid(),
        channelId: seedChannels.silicon?.id ?? '',
        credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
        modelCode: 'doubao-seedance-2.0',
        multiplierName: '尊享加速倍率',
        modelMultiplier: 2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/videos/generations', mappingUrl: '/v1/videos/generations' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 300000,
      },
    ],
  },
  {
    id: uid(),
    logo: '阿',
    name: 'Qwen3.6-27B-NVFP4',
    vendor: '阿里',
    type: 'text',
    inputModals: ['文本'],
    outputModals: ['文本'],
    maxOutputToken: 16000,
    pricingMode: 'token',
    hot: false,
    deepThinking: false,
    sort: 99,
    online: true,
    onlineAt: '2026-06-26',
    modelCode: 'qwen3.6-27b-nvfp4',
    contextWindow: 131072,
    intro: '阿里通义千问 27B NVFP4 量化版，长上下文对话与推理性价比之选。',
    docTags: ['对话', '长文本'],
    configEndpoints: ['/v1/chat/completions'],
    apiConfigs: [
      {
        id: uid(),
        channelId: seedChannels.aliyun?.id ?? '',
        credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
        modelCode: 'qwen-turbo',
        multiplierName: '活动优惠倍率',
        modelMultiplier: 0.8,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/compatible-mode/v1/chat/completions' },
        ],
        queueEnabled: true,
        queueLimit: 50,
        timeout: 120000,
      },
      {
        id: uid(),
        channelId: seedChannels.aliyun?.id ?? '',
        credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
        modelCode: 'qwen-turbo',
        multiplierName: '尊享加速倍率',
        modelMultiplier: 2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/compatible-mode/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
    ],
  },
  {
    id: uid(),
    logo: '智',
    name: 'DODO-AC-Ultra-5',
    vendor: '智算多多',
    type: 'text',
    inputModals: ['文本'],
    outputModals: ['文本'],
    maxOutputToken: 1000000,
    pricingMode: 'token',
    hot: true,
    deepThinking: true,
    sort: 99,
    online: true,
    onlineAt: '2026-08-03',
    apiConfigs: [
      {
        id: uid(),
        channelId: seedChannels.aliyun?.id ?? '',
        credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
        modelCode: 'dodo-ac-ultra-5',
        multiplierName: '标准倍率',
        modelMultiplier: 1,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
      {
        id: uid(),
        channelId: seedChannels.aliyun?.id ?? '',
        credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
        modelCode: 'dodo-ac-ultra-5',
        multiplierName: '尊享加速倍率',
        modelMultiplier: 2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
    ],
  },
  {
    id: uid(),
    logo: '深',
    name: 'DeepSeek-V4-Flash',
    vendor: '深度求索',
    type: 'text',
    inputModals: ['文本'],
    outputModals: ['文本'],
    maxOutputToken: 384000,
    pricingMode: 'token',
    hot: false,
    deepThinking: true,
    sort: 99,
    online: true,
    onlineAt: '2026-08-03',
    apiConfigs: [
      {
        id: uid(),
        channelId: seedChannels.tencent?.id ?? '',
        credentialId: seedChannels.tencent?.apiCredentials?.[0]?.id,
        modelCode: 'deepseek-v4-flash',
        multiplierName: '独享资源倍率',
        modelMultiplier: 3,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
      {
        id: uid(),
        channelId: seedChannels.tencent?.id ?? '',
        credentialId: seedChannels.tencent?.apiCredentials?.[0]?.id,
        modelCode: 'deepseek-v4-flash',
        multiplierName: '尊享加速倍率',
        modelMultiplier: 2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
    ],
  },
  {
    id: uid(),
    logo: '智',
    name: 'GLM-5.2-FP8',
    vendor: '智谱',
    type: 'text',
    inputModals: ['文本'],
    outputModals: ['文本'],
    maxOutputToken: 1000000,
    pricingMode: 'token',
    hot: false,
    deepThinking: true,
    sort: 99,
    online: false,
    onlineAt: '2026-06-17',
    apiConfigs: [
      {
        id: uid(),
        channelId: seedChannels.silicon?.id ?? '',
        credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
        modelCode: 'glm-5.2-fp8',
        multiplierName: '算力加速倍率',
        modelMultiplier: 2.5,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
      {
        id: uid(),
        channelId: seedChannels.silicon?.id ?? '',
        credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
        modelCode: 'glm-5.2-fp8',
        multiplierName: '尊享加速倍率',
        modelMultiplier: 2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
    ],
  },
  {
    id: uid(),
    logo: '智',
    name: 'GLM-5.2',
    vendor: '智谱',
    type: 'text',
    inputModals: ['文本'],
    outputModals: ['文本'],
    maxOutputToken: 1000000,
    pricingMode: 'token',
    hot: false,
    deepThinking: true,
    sort: 99,
    online: false,
    onlineAt: '2026-06-22',
    apiConfigs: [
      {
        id: uid(),
        channelId: seedChannels.aliyun?.id ?? '',
        credentialId: seedChannels.aliyun?.apiCredentials?.[1]?.id,
        modelCode: 'glm-5.2',
        multiplierName: '标准倍率',
        modelMultiplier: 1.8,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
      {
        id: uid(),
        channelId: seedChannels.tencent?.id ?? '',
        credentialId: seedChannels.tencent?.apiCredentials?.[0]?.id,
        modelCode: 'glm-5.2',
        multiplierName: '在线客服倍率',
        modelMultiplier: 2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: true,
        queueLimit: 30,
        timeout: 60000,
      },
      {
        id: uid(),
        channelId: seedChannels.silicon?.id ?? '',
        credentialId: seedChannels.silicon?.apiCredentials?.[0]?.id,
        modelCode: 'glm-5.2',
        multiplierName: '尊享独享倍率',
        modelMultiplier: 3.2,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 180000,
      },
      {
        id: uid(),
        channelId: seedChannels.aliyun?.id ?? '',
        credentialId: seedChannels.aliyun?.apiCredentials?.[0]?.id,
        modelCode: 'glm-5.2',
        multiplierName: '活动优惠倍率',
        modelMultiplier: 0.8,
        channelEnabled: true,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 120000,
      },
      {
        id: uid(),
        channelId: seedChannels.tencent?.id ?? '',
        credentialId: seedChannels.tencent?.apiCredentials?.[0]?.id,
        modelCode: 'glm-5.2',
        multiplierName: '夜间闲时倍率',
        modelMultiplier: 0.6,
        channelEnabled: false,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/v1/chat/completions' },
        ],
        queueEnabled: true,
        queueLimit: 60,
        timeout: 90000,
      },
    ],
  },
  ...plazaSeedModels,
]

/** v3 存储键：v4 只是新增「倍率名称」字段，迁移旧数据可保持模型 id 不变，避免切断模型分组的引用 */
const MODEL_LIST_LEGACY_STORAGE_KEY = 'zsdd_models_v3'

/**
 * 为历史数据补齐「倍率名称」：优先沿用已填值，其次按模型名称对齐 seed 的配置顺序，
 * 最后兜底「倍率N」；统一截断到 7 个字并保证同一模型内不重复。
 */
function withMultiplierNames(models: ModelItem[]): { list: ModelItem[]; changed: boolean } {
  const seedByName = new Map(modelListSeed.map((m) => [m.name, m]))
  let changed = false
  const list = models.map((model) => {
    const ref = seedByName.get(model.name)
    const used = new Set<string>()
    const apiConfigs = (model.apiConfigs ?? []).map((cfg, i) => {
      const base = cfg.multiplierName?.trim() || ref?.apiConfigs?.[i]?.multiplierName?.trim() || `倍率${i + 1}`
      let name = base.slice(0, 7)
      if (used.has(name)) name = `${name.slice(0, 6)}${i + 1}`
      used.add(name)
      if (name !== cfg.multiplierName) changed = true
      return { ...cfg, multiplierName: name }
    })
    return { ...model, apiConfigs }
  })
  return { list, changed }
}

/**
 * 为历史数据补齐 seed 中新增的倍率档位：按模型名称对齐 seed，
 * 只追加「倍率名称」尚未出现过的配置，既有配置与模型 id 全部保持不变。
 */
function appendSeedApiConfigs(models: ModelItem[]): { list: ModelItem[]; changed: boolean } {
  const seedByName = new Map(modelListSeed.map((m) => [m.name, m]))
  let changed = false
  const list = models.map((model) => {
    const ref = seedByName.get(model.name)
    if (!ref?.apiConfigs?.length) return model
    const existing = model.apiConfigs ?? []
    const names = new Set(existing.map((cfg) => cfg.multiplierName?.trim()))
    const added = (ref.apiConfigs ?? []).filter((cfg) => cfg.multiplierName && !names.has(cfg.multiplierName))
    if (!added.length) return model
    changed = true
    return { ...model, apiConfigs: [...existing, ...added.map((cfg) => ({ ...cfg }))] }
  })
  return { list, changed }
}

/**
 * 为历史数据补齐 seed 中新增的模型：按模型名称对齐 seed，只追加本地没有的模型。
 * 沿用 v4 存储键而非递增版本号，是为了保住既有模型的 id 与倍率配置 id——模型分组、资源包、
 * Token 套餐都按 id 引用它们，换键会导致这些引用一起悬空。
 */
function appendSeedModels(models: ModelItem[]): { list: ModelItem[]; changed: boolean } {
  const existing = new Set(models.map((model) => model.name))
  const added = modelListSeed.filter((model) => !existing.has(model.name))
  if (!added.length) return { list: models, changed: false }
  return { list: [...models, ...added.map((model) => ({ ...model }))], changed: true }
}

/** 历史数据的完整迁移：补倍率名称 + 补新增倍率档位 + 补新增模型 */
function migrateModelList(stored: ModelItem[]): { list: ModelItem[]; changed: boolean } {
  const named = withMultiplierNames(stored)
  const filled = appendSeedApiConfigs(named.list)
  const merged = appendSeedModels(filled.list)
  return { list: merged.list, changed: named.changed || filled.changed || merged.changed }
}

function loadModelList(): ModelItem[] {
  try {
    const raw = localStorage.getItem(MODEL_LIST_STORAGE_KEY)
    if (raw) {
      const { list, changed } = migrateModelList(JSON.parse(raw) as ModelItem[])
      if (changed) localStorage.setItem(MODEL_LIST_STORAGE_KEY, JSON.stringify(list))
      return list
    }
    const legacy = localStorage.getItem(MODEL_LIST_LEGACY_STORAGE_KEY)
    if (legacy) {
      const { list } = migrateModelList(JSON.parse(legacy) as ModelItem[])
      localStorage.setItem(MODEL_LIST_STORAGE_KEY, JSON.stringify(list))
      return list
    }
  } catch {
    /* ignore */
  }
  localStorage.setItem(MODEL_LIST_STORAGE_KEY, JSON.stringify(modelListSeed))
  return modelListSeed
}

/** 修复模型 API 配置里悬空的 channelId / credentialId，避免列表直接展示随机 id */
function healApiConfigRefs(models: ModelItem[]): ModelItem[] | null {
  const liveChannels = readStoredChannels()
  if (!liveChannels.length) return null
  const credOwner = new Map<string, { channel: Channel; index: number }>()
  liveChannels.forEach((channel) =>
    (channel.apiCredentials ?? []).forEach((cred, index) => credOwner.set(cred.id, { channel, index })),
  )
  const channelModelById = new Map(modelState.map((cm) => [cm.id, cm]))
  const findCred = (channelId: string, apiName?: string, credIndex?: number) => {
    const creds = liveChannels.find((c) => c.id === channelId)?.apiCredentials ?? []
    const hit =
      creds.find((c) => c.apiName === apiName) ??
      (credIndex !== undefined ? creds[credIndex] : undefined) ??
      creds.find((c) => c.status === 'enabled') ??
      creds[0]
    return hit?.id
  }
  let changed = false
  const next = models.map((model) => {
    const cfgs = model.apiConfigs
    if (!cfgs?.length) return model
    let count = 0
    const repaired: ModelApiConfig[] = cfgs.map((cfg, i) => {
      const item = { ...cfg }
      const channelOk = liveChannels.some((c) => c.id === item.channelId)
      let hints: { channelName: string; credIndex: number }[] | undefined = seedModelIntent[item.modelCode]
      if (!channelOk && item.channelModelId) {
        const cm = channelModelById.get(item.channelModelId)
        if (cm) {
          item.channelId = cm.channelId
          item.credentialId = findCred(cm.channelId, cm.credentialId) ?? item.credentialId
          hints = undefined
        }
      }
      if (!liveChannels.some((c) => c.id === item.channelId)) {
        const hint = hints?.[i] ?? hints?.[0]
        if (hint) {
          const channel = liveChannels.find((c) => c.name === hint.channelName)
          if (channel) {
            item.channelId = channel.id
            item.credentialId = findCred(channel.id, undefined, hint.credIndex) ?? item.credentialId
          }
        }
      }
      const owner = item.credentialId ? credOwner.get(item.credentialId) : undefined
      if (!owner) {
        const credIndex = channelOk ? undefined : hints?.[i]?.credIndex
        item.credentialId = findCred(item.channelId, undefined, credIndex)
      } else if (owner.channel.id !== item.channelId) {
        item.channelId = owner.channel.id
      }
      if (item.channelId !== cfg.channelId || item.credentialId !== cfg.credentialId) {
        changed = true
        count += 1
      }
      return item
    })
    if (!count) return model
    return { ...model, apiConfigs: repaired }
  })
  return changed ? next : null
}

let modelListState: ModelItem[] = loadModelList()
const healed = healApiConfigRefs(modelListState)
if (healed) {
  modelListState = healed
  localStorage.setItem(MODEL_LIST_STORAGE_KEY, JSON.stringify(healed))
}
const modelListListeners = new Set<() => void>()

function emitModelList() {
  localStorage.setItem(MODEL_LIST_STORAGE_KEY, JSON.stringify(modelListState))
  modelListListeners.forEach((l) => l())
  /** 新增/编辑模型后，「全平台模型」适用范围的活动需按默认返佣比例自动补齐新档位 */
  syncAllScopeCampaignModels()
}

function subscribeModelList(cb: () => void) {
  modelListListeners.add(cb)
  return () => modelListListeners.delete(cb)
}

function getModelListSnapshot() {
  return modelListState
}

export function useModels() {
  const models = useSyncExternalStore(subscribeModelList, getModelListSnapshot)

  const addModel = useCallback((m: Omit<ModelItem, 'id'>) => {
    modelListState = [{ ...m, id: uid() }, ...modelListState]
    emitModelList()
  }, [])

  const updateModel = useCallback((id: string, patch: Partial<ModelItem>) => {
    modelListState = modelListState.map((m) => (m.id === id ? { ...m, ...patch } : m))
    emitModelList()
  }, [])

  const removeModel = useCallback((id: string) => {
    modelListState = modelListState.filter((m) => m.id !== id)
    emitModelList()
  }, [])

  return { models, addModel, updateModel, removeModel }
}

/** v4：展示顺序改为「数值越大越优先展示」，官方/自定义分组 seed 顺序相应重排，同步递增版本号以刷新本地旧数据 */
const MODEL_GROUP_STORAGE_KEY = 'zsdd_model_groups_v4'
export const DEFAULT_MODEL_GROUP_ID = 'default'
type ModelGroupInput = Pick<ModelGroup, 'name' | 'description' | 'status' | 'sort'>

/** 用户自定义分组 seed：由前台用户创建，后台只读（不提供增删改及组内模型维护入口） */
const customGroupSeed: {
  id: string
  name: string
  description: string
  /** 创建该分组的用户（昵称/手机号/账户ID），与账户管理、充值任务中的用户保持一致 */
  owner: GroupOwner
  sort: number
  createdAt: string
  modelNames: string[]
  /** 倍率级引用：按「模型名 + 倍率名称」对齐到具体的 API 配置，演示控制台只把某一条倍率加入分组 */
  configRefs?: { modelName: string; multiplierName: string }[]
}[] = [
  {
    id: 'custom_cs_bot',
    name: '在线客服可用模型',
    description: '用户自建：客服问答场景常用模型',
    owner: { nickname: '张明', phone: '13811305182', accountId: 'ACC20260810PVPbI3MgE' },
    sort: 40,
    createdAt: '2026-08-20T02:15:00.000Z',
    modelNames: ['DeepSeek-V4-Flash', 'GLM-5.2'],
    configRefs: [
      { modelName: 'DeepSeek-V4-Flash', multiplierName: '独享资源倍率' },
      { modelName: 'GLM-5.2', multiplierName: '在线客服倍率' },
    ],
  },
  {
    id: 'custom_multimodal',
    name: '多模态创作组',
    description: '用户自建：图片与视频生成',
    owner: { nickname: '李怡凡', phone: '13900001111', accountId: 'ACC20260814lyfMj9dPB' },
    sort: 30,
    createdAt: '2026-08-24T06:40:00.000Z',
    modelNames: ['Doubao-Seedream-5.0-Pro', 'DODO-AC-Ultra-5'],
  },
  {
    id: 'custom_embedding',
    name: '知识库向量化',
    description: '用户自建：文档理解与向量化',
    owner: { nickname: '王强', phone: '13700002222', accountId: 'ACC20260811WQabc1234' },
    sort: 20,
    createdAt: '2026-08-28T09:05:00.000Z',
    modelNames: ['Qwen3.6-27B-NVFP4'],
  },
  {
    id: 'custom_marketing',
    name: '营销素材生成组',
    description: '用户自建：文生图素材批量出图',
    owner: CURRENT_CONSOLE_USER,
    sort: 10,
    createdAt: '2026-09-02T03:20:00.000Z',
    modelNames: ['Doubao-Seedream-5.0-Pro'],
    /** 同一模型的档位只能有一个进组：该模型的其他档位（备用渠道/高清出图/尊享加速）不可再加入 */
    configRefs: [{ modelName: 'Doubao-Seedream-5.0-Pro', multiplierName: '标准倍率' }],
  },
]

/** 官方分组 seed：由管理后台维护，控制台「模型分组 › 官方分组」只读展示；不含系统内置的 default 兜底分组 */
const officialGroupSeed: {
  id: string
  name: string
  description: string
  sort: number
  createdAt: string
  modelNames: string[]
}[] = [
  {
    id: 'official_general',
    name: '通用对话分组',
    description: '官方预置：通用对话与文本生成，含组内模型的全部倍率档位',
    sort: 70,
    createdAt: '2026-09-05T02:10:00.000Z',
    modelNames: ['DeepSeek-V4-Flash', 'GLM-5.2'],
  },
  {
    id: 'official_creative',
    name: '多模态创作分组',
    description: '官方预置：文生图与多模态创作，适合素材批量产出',
    sort: 60,
    createdAt: '2026-09-05T02:12:00.000Z',
    modelNames: ['Doubao-Seedream-5.0-Pro', 'DODO-AC-Ultra-5'],
  },
  {
    id: 'official_embedding',
    name: '文档向量化分组',
    description: '官方预置：知识库文档理解与向量化，适合批量离线处理',
    sort: 50,
    createdAt: '2026-09-05T02:15:00.000Z',
    modelNames: ['Qwen3.6-27B-NVFP4'],
  },
]

/** 展示顺序为「大号优先」：数值越大越靠前，系统内置 default 恒定置顶，同值按创建时间先后排列 */
function sortModelGroups(groups: ModelGroup[]) {
  return [...groups].sort((a, b) => {
    if (a.id === DEFAULT_MODEL_GROUP_ID) return -1
    if (b.id === DEFAULT_MODEL_GROUP_ID) return 1
    return b.sort - a.sort || a.createdAt.localeCompare(b.createdAt)
  })
}

function seedModelGroups(): ModelGroup[] {
  const idsByNames = (names: string[]) => {
    const wanted = new Set(names)
    return modelListState.filter((model) => wanted.has(model.name)).map((model) => model.id)
  }
  const configIdsByRefs = (refs?: { modelName: string; multiplierName: string }[]) => {
    const ids: string[] = []
    ;(refs ?? []).forEach((ref) => {
      const config = modelListState
        .find((model) => model.name === ref.modelName)
        ?.apiConfigs?.find((cfg) => cfg.multiplierName === ref.multiplierName)
      if (config && !ids.includes(config.id)) ids.push(config.id)
    })
    return ids
  }
  const defaultGroup: ModelGroup = {
    id: DEFAULT_MODEL_GROUP_ID, name: 'default', groupType: 'official', modelIds: [], status: 'enabled', sort: 0,
    createdAt: new Date().toISOString(), operator: CURRENT_OPERATOR,
  }
  const officialGroups: ModelGroup[] = officialGroupSeed.map((seed) => ({
    id: seed.id, name: seed.name, groupType: 'official', modelIds: idsByNames(seed.modelNames),
    description: seed.description, status: 'enabled', sort: seed.sort, createdAt: seed.createdAt,
    operator: CURRENT_OPERATOR,
  }))
  const customGroups: ModelGroup[] = customGroupSeed.map((seed) => ({
    id: seed.id, name: seed.name, groupType: 'custom', modelIds: idsByNames(seed.modelNames),
    configIds: configIdsByRefs(seed.configRefs),
    description: seed.description, sort: seed.sort, createdAt: seed.createdAt,
    operator: `用户：${seed.owner.nickname}`, owner: seed.owner,
  }))
  return sortModelGroups([defaultGroup, ...officialGroups, ...customGroups])
}

function loadModelGroups(): ModelGroup[] {
  const seeded = seedModelGroups()
  try {
    const raw = localStorage.getItem(MODEL_GROUP_STORAGE_KEY)
    if (raw) {
      const groups: ModelGroup[] = JSON.parse(raw)
      if (Array.isArray(groups)) {
        const byId = new Map(groups.map((group) => [group.id, group]))
        /** 已存在的分组沿用本地数据，缺失的 seed 分组补回，保证官方 default 与用户自定义分组始终可见 */
        return sortModelGroups(
          seeded
            .map((seed) => {
              const saved = byId.get(seed.id)
              if (!saved) return seed
              /** 自定义分组由用户在控制台维护（增删改、加移倍率），本地数据优先；分组类型固定为 custom，创建用户缺失时回填 seed */
              if (seed.groupType === 'custom') {
                return { ...seed, ...saved, groupType: 'custom' as const, owner: saved.owner ?? seed.owner }
              }
              return { ...seed, ...saved, groupType: saved.groupType ?? seed.groupType }
            })
            /** 历史版本在后台新建的分组没有 groupType，按「后台新增即官方分组」补齐，避免成为不可见的脏数据 */
            .concat(
              groups
                .filter((group) => !seeded.some((seed) => seed.id === group.id))
                .map((group) => ({ ...group, groupType: group.groupType ?? ('official' as const) })),
            ),
        )
      }
    }
  } catch {}
  localStorage.setItem(MODEL_GROUP_STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

let modelGroupState = loadModelGroups()
const modelGroupListeners = new Set<() => void>()

function emitModelGroups(groups: ModelGroup[]) {
  const next = sortModelGroups(groups)
  localStorage.setItem(MODEL_GROUP_STORAGE_KEY, JSON.stringify(next))
  modelGroupState = next
  modelGroupListeners.forEach((listener) => listener())
}

function subscribeModelGroups(cb: () => void) {
  modelGroupListeners.add(cb)
  return () => modelGroupListeners.delete(cb)
}

function getModelGroupsSnapshot() {
  return modelGroupState
}

/**
 * 分组名称通用校验：非空，且在同一分组类型内唯一。
 * 官方分组之间不可重名、用户自定义分组之间不可重名，但官方与自定义互不占用彼此的名称空间。
 */
function validateGroupName(name: string, id?: string, groupType?: ModelGroup['groupType']) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('请输入分组名称')
  if (
    modelGroupState.some(
      (group) =>
        group.id !== id &&
        (!groupType || group.groupType === groupType) &&
        group.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error('该分组名称已存在')
  }
  return trimmed
}

function validateModelGroup(input: ModelGroupInput, id?: string) {
  if (!Number.isSafeInteger(input.sort) || input.sort < 0) throw new Error('展示顺序须为非负整数')
  return {
    ...input,
    name: validateGroupName(input.name, id, 'official'),
    description: input.description?.trim(),
  }
}

/** 控制台「模型分组 › 我的分组」：每个账号最多创建的自定义分组数量 */
export const MODEL_GROUP_LIMIT_PER_USER = 10

/** 控制台「模型分组 › 我的分组」表单字段：分组名称 + 描述，展示顺序由系统按创建先后自动追加 */
type CustomGroupInput = Pick<ModelGroup, 'name' | 'description'>

function validateCustomGroup(input: CustomGroupInput, id?: string) {
  return { name: validateGroupName(input.name, id, 'custom'), description: input.description?.trim() }
}

/** 展示顺序大号优先，故取一个小于所有分组的顺序值，保证新建的自定义分组落在末尾 */
function nextModelGroupSort() {
  const sorts = modelGroupState
    .filter((group) => group.id !== DEFAULT_MODEL_GROUP_ID)
    .map((group) => group.sort)
  return sorts.length ? Math.max(Math.min(...sorts) - 10, 1) : 1
}

/** 分组内档位冲突：同一模型的另一条倍率配置已占用该分组 */
export type TierConflict = { modelName: string; multiplierName: string }

/**
 * 同一模型的档位唯一性：一个模型只能有一条倍率配置进入同一个分组。
 * 在 `memberIds`（分组的现有成员或最终勾选结果）中查找除 `configId` 外占用该模型的档位，命中即返回冲突信息。
 * 导出给控制台使用，用于把被同模型其他档位占用的分组置灰、把不可勾选的倍率行禁选。
 */
export function findTierConflict(
  models: ModelItem[],
  configId: string,
  memberIds: string[],
): TierConflict | undefined {
  const owner = models.find((model) => (model.apiConfigs ?? []).some((cfg) => cfg.id === configId))
  if (!owner) return undefined
  const taken = memberIds.find(
    (id) => id !== configId && (owner.apiConfigs ?? []).some((cfg) => cfg.id === id),
  )
  if (!taken) return undefined
  const config = owner.apiConfigs?.find((cfg) => cfg.id === taken)
  return { modelName: owner.name, multiplierName: config?.multiplierName?.trim() || '默认倍率' }
}

/** 写入前的统一兜底校验：分组内出现同一模型的多个档位时抛错，由调用方以 message.error 提示 */
function assertNoTierConflict(memberIds: string[], configId: string) {
  const conflict = findTierConflict(modelListState, configId, memberIds)
  if (conflict) {
    throw new Error(
      `「${conflict.modelName}」的档位「${conflict.multiplierName}」已占用该分组，同一模型的档位不能重复加入`,
    )
  }
}

/**
 * 以「最终勾选结果」整体重写自定义分组的组内倍率：新增与移出一次写入，避免多次通知。
 * 组内模型按剩余倍率反查重建，某模型已无任何倍率引用时同步移出分组。
 */
function writeModelGroupConfigs(groupId: string, configIds: string[]) {
  const group = modelGroupState.find((item) => item.id === groupId)
  if (!group) throw new Error('分组不存在')
  if (group.groupType !== 'custom') throw new Error('仅用户自定义分组支持维护组内模型')
  const next = [...new Set(configIds)]
  const modelIds: string[] = []
  for (const configId of next) {
    const owner = modelListState.find((model) => (model.apiConfigs ?? []).some((cfg) => cfg.id === configId))
    if (!owner) throw new Error('倍率配置不存在，请刷新后重试')
    if (!modelIds.includes(owner.id)) modelIds.push(owner.id)
  }
  for (const configId of next) assertNoTierConflict(next, configId)
  emitModelGroups(modelGroupState.map((item) => item.id === groupId ? { ...item, configIds: next, modelIds } : item))
  return next
}

export function useModelGroups() {
  const modelGroups = useSyncExternalStore(subscribeModelGroups, getModelGroupsSnapshot)
  const addModelGroup = useCallback((input: ModelGroupInput) => {
    const data = validateModelGroup(input)
    emitModelGroups([...modelGroupState, {
      ...data, id: uid(), groupType: 'official', modelIds: [],
      createdAt: new Date().toISOString(), operator: CURRENT_OPERATOR,
    }])
  }, [])
  const updateModelGroup = useCallback((id: string, patch: Partial<ModelGroupInput>) => {
    if (id === DEFAULT_MODEL_GROUP_ID) throw new Error('默认分组不可编辑')
    const group = modelGroupState.find((item) => item.id === id)
    if (!group) throw new Error('分组不存在')
    if (group.groupType === 'custom') throw new Error('用户自定义分组不支持在后台编辑')
    const data = validateModelGroup({ ...group, ...patch }, id)
    emitModelGroups(modelGroupState.map((item) => item.id === id ? { ...item, ...data, operator: CURRENT_OPERATOR } : item))
  }, [])
  const removeModelGroup = useCallback((id: string) => {
    if (id === DEFAULT_MODEL_GROUP_ID) throw new Error('默认分组不可删除')
    const group = modelGroupState.find((item) => item.id === id)
    if (!group) throw new Error('分组不存在')
    if (group.groupType === 'custom') throw new Error('用户自定义分组不支持在后台删除')
    emitModelGroups(modelGroupState.filter((item) => item.id !== id))
  }, [])
  /**
   * 后台「添加模型」弹窗保存：勾选粒度是「某个模型的某个倍率」，因此入参是倍率配置 ID 的集合
   * （模型没有任何倍率配置时以模型 ID 占位）。保存时按倍率反查所属模型重建组内模型，
   * 并把勾选结果写入 configIds，使「组内模型信息」只展示被勾选的倍率。
   */
  const setModelGroupModels = useCallback((id: string, memberIds: string[]) => {
    if (!modelGroupState.some((group) => group.id === id)) throw new Error('分组不存在')
    const modelIds = new Set(modelListState.map((model) => model.id))
    const ownerOfConfig = new Map<string, string>()
    for (const model of modelListState) {
      for (const cfg of model.apiConfigs ?? []) ownerOfConfig.set(cfg.id, model.id)
    }
    const configIds: string[] = []
    const nextModelIds: string[] = []
    for (const memberId of new Set(memberIds)) {
      const ownerId = modelIds.has(memberId) ? memberId : ownerOfConfig.get(memberId)
      if (!ownerId) throw new Error('部分模型已删除，请重新选择')
      if (ownerId !== memberId) configIds.push(memberId)
      if (!nextModelIds.includes(ownerId)) nextModelIds.push(ownerId)
    }
    emitModelGroups(modelGroupState.map((group) => group.id === id
      ? { ...group, modelIds: nextModelIds, configIds, operator: group.groupType === 'custom' ? group.operator : CURRENT_OPERATOR }
      : group))
  }, [])
  /**
   * 控制台「分档定价 - 加入分组」：只把选中的那一条倍率配置加入用户自定义分组，
   * 同时把配置所属模型补进组内模型，保证按分组筛选模型时依然命中。
   * 同一模型的档位只能有一个进组，被其他档位占用时直接抛错。
   */
  const addModelGroupConfig = useCallback((groupId: string, configId: string) => {
    const group = modelGroupState.find((item) => item.id === groupId)
    if (!group) throw new Error('分组不存在')
    if (group.groupType !== 'custom') throw new Error('仅用户自定义分组支持加入倍率')
    if ((group.configIds ?? []).includes(configId)) throw new Error('该倍率已在分组中')
    const owner = modelListState.find((model) => (model.apiConfigs ?? []).some((cfg) => cfg.id === configId))
    if (!owner) throw new Error('倍率配置不存在，请刷新后重试')
    assertNoTierConflict(group.configIds ?? [], configId)
    emitModelGroups(modelGroupState.map((item) => item.id === groupId
      ? {
          ...item,
          configIds: [...(item.configIds ?? []), configId],
          modelIds: item.modelIds.includes(owner.id) ? item.modelIds : [...item.modelIds, owner.id],
        }
      : item))
  }, [])
  /** 批量加入倍率：一次校验、一次写入；已在分组中的倍率自动跳过，同模型其他档位仍会被拦下 */
  const addModelGroupConfigs = useCallback((groupId: string, configIds: string[]) => {
    const group = modelGroupState.find((item) => item.id === groupId)
    if (!group) throw new Error('分组不存在')
    if (group.groupType !== 'custom') throw new Error('仅用户自定义分组支持加入倍率')
    if (!configIds.length) throw new Error('请至少选择一条模型倍率')
    const owned = new Set(group.configIds ?? [])
    const added: string[] = []
    const modelIds = [...group.modelIds]
    for (const configId of configIds) {
      if (owned.has(configId)) continue
      const owner = modelListState.find((model) => (model.apiConfigs ?? []).some((cfg) => cfg.id === configId))
      if (!owner) throw new Error('倍率配置不存在，请刷新后重试')
      assertNoTierConflict([...owned], configId)
      owned.add(configId)
      added.push(configId)
      if (!modelIds.includes(owner.id)) modelIds.push(owner.id)
    }
    if (!added.length) throw new Error('所选倍率均已在分组中')
    emitModelGroups(modelGroupState.map((item) => item.id === groupId
      ? { ...item, configIds: [...(item.configIds ?? []), ...added], modelIds }
      : item))
  }, [])
  /** 移出倍率：分组内该模型已无任何倍率引用时，同步把模型移出分组，避免残留空模型 */
  const removeModelGroupConfig = useCallback((groupId: string, configId: string) => {
    const group = modelGroupState.find((item) => item.id === groupId)
    if (!group) throw new Error('分组不存在')
    if (group.groupType !== 'custom') throw new Error('仅用户自定义分组支持移出倍率')
    if (!(group.configIds ?? []).includes(configId)) throw new Error('该倍率不在分组中')
    const configIds = (group.configIds ?? []).filter((id) => id !== configId)
    const owner = modelListState.find((model) => (model.apiConfigs ?? []).some((cfg) => cfg.id === configId))
    const kept = owner
      ? configIds.some((id) => (owner.apiConfigs ?? []).some((cfg) => cfg.id === id))
      : true
    const modelIds = owner && !kept ? group.modelIds.filter((id) => id !== owner.id) : group.modelIds
    emitModelGroups(modelGroupState.map((item) => item.id === groupId ? { ...item, configIds, modelIds } : item))
  }, [])
  /** 添加模型弹窗「保存」：弹窗中的勾选集合即分组最终成员，未勾选的原有倍率同时移出 */
  const syncModelGroupConfigs = useCallback((groupId: string, configIds: string[]) => {
    writeModelGroupConfigs(groupId, configIds)
  }, [])
  /** 清空组内模型：倍率引用与组内模型一并置空，模型本身不受影响 */
  const clearModelGroupConfigs = useCallback((groupId: string) => {
    writeModelGroupConfigs(groupId, [])
  }, [])
  /** 控制台「模型分组 › 我的分组」新增：归属当前账号，每人最多 10 个，组内模型与倍率后续通过「添加模型」维护 */
  const addCustomGroup = useCallback((input: CustomGroupInput, owner: GroupOwner) => {
    const created = modelGroupState.filter(
      (group) => group.groupType === 'custom' && group.owner?.accountId === owner.accountId,
    ).length
    if (created >= MODEL_GROUP_LIMIT_PER_USER) {
      throw new Error(`每人最多创建 ${MODEL_GROUP_LIMIT_PER_USER} 个模型分组，请删除后再新建`)
    }
    const data = validateCustomGroup(input)
    emitModelGroups([...modelGroupState, {
      ...data, id: uid(), groupType: 'custom', modelIds: [], configIds: [],
      sort: nextModelGroupSort(), createdAt: new Date().toISOString(), operator: `用户：${owner.nickname}`, owner,
    }])
  }, [])
  const updateCustomGroup = useCallback((id: string, input: CustomGroupInput) => {
    const group = modelGroupState.find((item) => item.id === id)
    if (!group) throw new Error('分组不存在')
    if (group.groupType !== 'custom') throw new Error('官方分组不支持在此编辑')
    const data = validateCustomGroup(input, id)
    emitModelGroups(modelGroupState.map((item) => item.id === id ? { ...item, ...data } : item))
  }, [])
  const removeCustomGroup = useCallback((id: string) => {
    const group = modelGroupState.find((item) => item.id === id)
    if (!group) throw new Error('分组不存在')
    if (group.groupType !== 'custom') throw new Error('官方分组不支持在此删除')
    emitModelGroups(modelGroupState.filter((item) => item.id !== id))
  }, [])
  return {
    modelGroups,
    addModelGroup,
    updateModelGroup,
    removeModelGroup,
    setModelGroupModels,
    addModelGroupConfig,
    addModelGroupConfigs,
    removeModelGroupConfig,
    syncModelGroupConfigs,
    clearModelGroupConfigs,
    addCustomGroup,
    updateCustomGroup,
    removeCustomGroup,
  }
}

/* ---------------- 资源包 ---------------- */

const PACK_STORAGE_KEY = 'zsdd_resource_packs_v11'

const packSeed: ResourcePack[] = [
  {
    id: uid(),
    name: '全能大模型套餐 A',
    status: 'on',
    models: [
      {
        modelId: 'demo-ultra',
        modelName: 'DODO-AC-Ultra-5',
        pricingMode: 'token',
        packPricingMode: 'token_ladder',
        basePrices: {
          input: 0.0042,
          output: 0.0112,
          cacheRead: 0.0008,
          cacheCreate: 0.0042,
        },
        baseUnit: '元/千Token',
        tiers: [
          { start: 0, threshold: 1000000, discount: 90 },
        ],
        rpm: 60,
        tpm: 100000,
      },
      {
        modelId: 'demo-flash',
        modelName: 'DeepSeek-V4-Flash',
        pricingMode: 'token',
        packPricingMode: 'amount_ladder',
        basePrices: {
          input: 0.0028,
          output: 0.0084,
          cacheRead: 0.0006,
          cacheCreate: 0.0028,
        },
        baseUnit: '元/千Token',
        tiers: [
          { start: 0, threshold: 100, discount: 85 },
        ],
        rpm: 40,
        tpm: 80000,
      },
    ],
    operator: '管理员',
    createdAt: '2026-08-10',
  },
  {
    id: uid(),
    name: '视觉创作包',
    status: 'off',
    models: [
      {
        modelId: 'demo-seedream',
        modelName: 'Doubao-Seedream-5.0-Pro',
        pricingMode: 'image_quality',
        packPricingMode: 'amount_ladder',
        basePrices: {
          input: 0,
          output: 0.28,
          cacheRead: 0,
          cacheCreate: 0,
        },
        baseUnit: '元/次',
        tiers: [
          { start: 0, threshold: 50, discount: 88 },
        ],
        rpm: 20,
        tpm: 30000,
      },
    ],
    operator: '管理员',
    createdAt: '2026-08-12',
  },
]

function loadPacks(): ResourcePack[] {
  try {
    const raw = localStorage.getItem(PACK_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ResourcePack[]
  } catch {
    /* ignore */
  }
  localStorage.setItem(PACK_STORAGE_KEY, JSON.stringify(packSeed))
  return packSeed
}

let packState: ResourcePack[] = loadPacks()
const packListeners = new Set<() => void>()

function emitPacks() {
  localStorage.setItem(PACK_STORAGE_KEY, JSON.stringify(packState))
  packListeners.forEach((l) => l())
}

function subscribePacks(cb: () => void) {
  packListeners.add(cb)
  return () => packListeners.delete(cb)
}

function getPacksSnapshot() {
  return packState
}

export function useResourcePacks() {
  const packs = useSyncExternalStore(subscribePacks, getPacksSnapshot)

  const addPack = useCallback((p: Omit<ResourcePack, 'id' | 'createdAt' | 'operator'>) => {
    const now = new Date().toISOString().slice(0, 10)
    packState = [{ ...p, id: uid(), createdAt: now, operator: CURRENT_OPERATOR }, ...packState]
    emitPacks()
  }, [])

  const updatePack = useCallback((id: string, patch: Partial<ResourcePack>) => {
    packState = packState.map((p) => (p.id === id ? { ...p, ...patch } : p))
    emitPacks()
  }, [])

  const removePack = useCallback((id: string) => {
    packState = packState.filter((p) => p.id !== id)
    emitPacks()
  }, [])

  return { packs, addPack, updatePack, removePack }
}

/* ---------------- Token 套餐 ---------------- */

const PLAN_STORAGE_KEY = 'zsdd_token_plans_v13'

const planSeed: TokenPlan[] = [
  {
    id: uid(),
    name: '新手套餐（Lite）',
    subtitle: '专为初次接触大模型的用户设计，以轻量配额提供核心API调用能力，是快速验证场景可行性的最佳起点',
    level: 'lite',
    planType: 'personal',
    summaryItems: ['适合首次体验 AI 能力', '可执行约 70 轮问答', '支持主流对话模型'],
    price: 60,
    discountPrice: 39,
    discount: 65,
    showOriginalPrice: true,
    originalPrice: 99,
    durations: [
      { label: '月付', months: 1, discount: 100, finalPrice: 60 },
      { label: '年付', months: 12, discount: 80, finalPrice: 576 },
    ],
    productTag: '',
    totalTokens: 3500000,
    usageLimitEnabled: true,
    usageLimit: 3500000,
    usagePeriod: 'monthly',
    validityValue: 1,
    validityUnit: 'month',
    autoRenew: true,
    status: 'on',
    modelIds: [],
    operator: '管理员',
    createdAt: '2026-08-10',
  },
  {
    id: uid(),
    name: '进阶套餐（Standard）',
    subtitle: '综合成本与性能最优解。适配中高频调用需求，兼顾响应质量与经济性，是独立开发者的理想选择',
    level: 'standard',
    planType: 'personal',
    summaryItems: ['日常使用，高性价比', '可执行约 200 轮问答', '支持长上下文模型'],
    price: 199,
    discountPrice: 139.3,
    discount: 70,
    showOriginalPrice: true,
    originalPrice: 299,
    durations: [
      { label: '月付', months: 1, discount: 100, finalPrice: 199 },
      { label: '季付', months: 3, discount: 90, finalPrice: 537.3 },
      { label: '年付', months: 12, discount: 75, finalPrice: 1791 },
    ],
    productTag: '推荐',
    totalTokens: 100000000,
    usageLimitEnabled: true,
    usageLimit: 100000000,
    usagePeriod: 'monthly',
    validityValue: 1,
    validityUnit: 'month',
    autoRenew: true,
    status: 'on',
    modelIds: [],
    operator: '管理员',
    createdAt: '2026-08-12',
  },
  {
    id: uid(),
    name: '专业套餐（Pro）',
    subtitle: '高并发、低延迟、专属资源，为深度依赖大模型的规模化应用提供坚实底座。是承载关键业务的核心引擎',
    level: 'pro',
    planType: 'personal',
    summaryItems: ['适合每天高频使用的开发者', '优先排队通道', '支持全部模型'],
    price: 599,
    discountPrice: 497.17,
    discount: 83,
    showOriginalPrice: true,
    originalPrice: 799,
    durations: [
      { label: '月付', months: 1, discount: 100, finalPrice: 599 },
      { label: '季付', months: 3, discount: 88, finalPrice: 1581.36 },
      { label: '年付', months: 12, discount: 70, finalPrice: 5031.6 },
    ],
    productTag: '',
    totalTokens: 320000000,
    usageLimitEnabled: true,
    usageLimit: 320000000,
    usagePeriod: 'monthly',
    validityValue: 1,
    validityUnit: 'month',
    autoRenew: true,
    status: 'on',
    modelIds: [],
    operator: '管理员',
    createdAt: '2026-08-15',
  },
  {
    id: uid(),
    name: 'Max',
    subtitle: '极致额度加持，重度 AI 开发首选',
    level: 'max',
    planType: 'personal',
    summaryItems: ['适合把 AI 当核心生产力的重度用户', '无限制并发', '专属客服支持'],
    price: 599,
    discountPrice: 599,
    discount: 100,
    showOriginalPrice: true,
    originalPrice: 799,
    durations: [
      { label: '月付', months: 1, discount: 100, finalPrice: 599 },
      { label: '年付', months: 12, discount: 85, finalPrice: 6109.8 },
    ],
    productTag: '',
    totalTokens: 650000000,
    usageLimitEnabled: true,
    usageLimit: 650000000,
    usagePeriod: 'monthly',
    validityValue: 1,
    validityUnit: 'month',
    autoRenew: false,
    status: 'on',
    modelIds: [],
    operator: '管理员',
    createdAt: '2026-08-18',
  },
]

function loadPlans(): TokenPlan[] {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as TokenPlan[]
      return parsed.map((p) => ({
        ...p,
        discountPrice:
          typeof (p as any).discountPrice === 'number'
            ? (p as any).discountPrice
            : calcPlanDiscountedPrice(p.price, p.discount ?? 100),
        showOriginalPrice:
          typeof (p as any).showOriginalPrice === 'boolean' ? (p as any).showOriginalPrice : false,
        originalPrice:
          typeof (p as any).originalPrice === 'number' ? (p as any).originalPrice : 0,
        totalTokens:
          typeof (p as any).totalTokens === 'number' ? (p as any).totalTokens : p.usageLimit ?? 0,
        usageLimitEnabled:
          typeof (p as any).usageLimitEnabled === 'boolean' ? (p as any).usageLimitEnabled : true,
      }))
    }
  } catch {
    /* ignore */
  }
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(planSeed))
  return planSeed
}

let planState: TokenPlan[] = loadPlans()
const planListeners = new Set<() => void>()

function emitPlans() {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(planState))
  planListeners.forEach((l) => l())
}

function subscribePlans(cb: () => void) {
  planListeners.add(cb)
  return () => planListeners.delete(cb)
}

function getPlansSnapshot() {
  return planState
}

export function useTokenPlans() {
  const plans = useSyncExternalStore(subscribePlans, getPlansSnapshot)

  const addPlan = useCallback((p: Omit<TokenPlan, 'id' | 'createdAt' | 'operator'>) => {
    const now = new Date().toISOString().slice(0, 10)
    planState = [{ ...p, id: uid(), createdAt: now, operator: CURRENT_OPERATOR }, ...planState]
    emitPlans()
  }, [])

  const updatePlan = useCallback((id: string, patch: Partial<TokenPlan>) => {
    planState = planState.map((p) => (p.id === id ? { ...p, ...patch } : p))
    emitPlans()
  }, [])

  const removePlan = useCallback((id: string) => {
    planState = planState.filter((p) => p.id !== id)
    emitPlans()
  }, [])

  return { plans, addPlan, updatePlan, removePlan }
}

/* ============================== 费用管理 - 账户明细 ============================== */

const LEDGER_STORAGE_KEY = 'zsdd_account_ledgers_v2'

const OPERATOR_PHONE = '183****9299'
const OPERATOR_ACCOUNT_ID = 'ACC202605090005'

type LedgerSeedRow = {
  serialNo: string
  operatedAt: string
  operationType: 'model_consume'
  amountBefore: number
  amountChange: number
  amountAfter: number
  remark: string
}

const LEDGER_SEED_ROWS: LedgerSeedRow[] = [
  {
    serialNo: 'MXXF-2608241258224463017',
    operatedAt: '2026-08-24 12:58:19',
    operationType: 'model_consume',
    amountBefore: 302.397195,
    amountChange: 0.007145,
    amountAfter: 302.39005,
    remark: 'dodo-og-gpt-5-6-luna—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241258330625690',
    operatedAt: '2026-08-24 12:58:19',
    operationType: 'model_consume',
    amountBefore: 302.39005,
    amountChange: 0.012,
    amountAfter: 302.37805,
    remark: 'kimi-k3—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241257583201337',
    operatedAt: '2026-08-24 12:57:49',
    operationType: 'model_consume',
    amountBefore: 302.433371,
    amountChange: 0.011004,
    amountAfter: 302.422367,
    remark: 'glm-5.2—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241258024794908',
    operatedAt: '2026-08-24 12:57:49',
    operationType: 'model_consume',
    amountBefore: 302.422367,
    amountChange: 0.025172,
    amountAfter: 302.397195,
    remark: 'kimi-k3—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241257393249757',
    operatedAt: '2026-08-24 12:57:32',
    operationType: 'model_consume',
    amountBefore: 302.457195,
    amountChange: 0.010024,
    amountAfter: 302.447171,
    remark: 'glm-5.2—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241257459331574',
    operatedAt: '2026-08-24 12:57:32',
    operationType: 'model_consume',
    amountBefore: 302.447171,
    amountChange: 0.0138,
    amountAfter: 302.433371,
    remark: 'kimi-k3—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241256419655557',
    operatedAt: '2026-08-24 12:56:40',
    operationType: 'model_consume',
    amountBefore: 302.464074,
    amountChange: 0.004371,
    amountAfter: 302.459703,
    remark: 'kimi-k2.6—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241256459548262',
    operatedAt: '2026-08-24 12:56:40',
    operationType: 'model_consume',
    amountBefore: 302.459703,
    amountChange: 0.002508,
    amountAfter: 302.457195,
    remark: 'glm-5.2—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241254445306670',
    operatedAt: '2026-08-24 12:54:21',
    operationType: 'model_consume',
    amountBefore: 302.495962,
    amountChange: 0.031888,
    amountAfter: 302.464074,
    remark: 'deepseek-v4-flash—模型调用消费',
  },
  {
    serialNo: 'MXXF-2608241254112947332',
    operatedAt: '2026-08-24 12:54:09',
    operationType: 'model_consume',
    amountBefore: 302.500746,
    amountChange: 0.000073,
    amountAfter: 302.500673,
    remark: 'deepseek-v4-flash—模型调用消费',
  },
]

// 填充到 3395 条，模拟真实分页数据
function buildLedgerSeed(): AccountLedger[] {
  const extraCount = 3395 - LEDGER_SEED_ROWS.length
  const extras: AccountLedger[] = []
  const models = [
    'kimi-k3—模型调用消费',
    'glm-5.2—模型调用消费',
    'kimi-k2.6—模型调用消费',
    'deepseek-v4-flash—模型调用消费',
    'dodo-og-gpt-5-6-luna—模型调用消费',
  ]
  let baseAmount = 500
  for (let i = 0; i < extraCount; i++) {
    const change = +(Math.random() * 0.05).toFixed(6)
    const before = +baseAmount.toFixed(6)
    const after = +(baseAmount - change).toFixed(6)
    const baseTs = Date.UTC(2026, 6, 1, 0, 0, 0, 0)
    const offsetMs = i * 60 * 1000 * 5
    const d = new Date(baseTs - offsetMs + 8 * 3600 * 1000)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    const ss = String(d.getUTCSeconds()).padStart(2, '0')
    const serialTail = `${y - 2000}${m}${day}${hh}${mm}${ss}${(100000 + i).toString().slice(-6)}`
    extras.push({
      id: `ledger_extra_${i}`,
      serialNo: `MXXF-${serialTail}`,
      operatedAt: `${y}-${m}-${day} ${hh}:${mm}:${ss}`,
      operatorPhone: OPERATOR_PHONE,
      operatorAccountId: OPERATOR_ACCOUNT_ID,
      operationType: 'model_consume',
      amountBefore: before,
      amountChange: change,
      amountAfter: after,
      remark: models[i % models.length],
      fundAccount: 'cash',
    })
    baseAmount = after
  }
  const seed: AccountLedger[] = LEDGER_SEED_ROWS.map((r, idx) => ({
    id: `ledger_seed_${idx}`,
    serialNo: r.serialNo,
    operatedAt: r.operatedAt,
    operatorPhone: OPERATOR_PHONE,
    operatorAccountId: OPERATOR_ACCOUNT_ID,
    operationType: r.operationType,
    amountBefore: r.amountBefore,
    amountChange: r.amountChange,
    amountAfter: r.amountAfter,
    remark: r.remark,
    fundAccount: 'cash',
  }))
  return [...extras, ...seed]
}

const LEDGER_SEED: AccountLedger[] = buildLedgerSeed()

function loadLedgers(): AccountLedger[] {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AccountLedger[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        // v1 数据无 fundAccount 字段，读取时统一回填为现金主账户
        return parsed.map((r) => (r.fundAccount ? r : { ...r, fundAccount: 'cash' as const }))
      }
    }
  } catch {}
  localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(LEDGER_SEED))
  return LEDGER_SEED
}

let ledgerState: AccountLedger[] = loadLedgers()
const ledgerListeners = new Set<() => void>()
function emitLedgers() {
  localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledgerState))
  ledgerListeners.forEach((l) => l())
}
function subscribeLedgers(cb: () => void) {
  ledgerListeners.add(cb)
  return () => ledgerListeners.delete(cb)
}
function getLedgersSnapshot() {
  return ledgerState
}

/** 账户明细：现金主账户流水与代金券流水合并展示，用 fundAccount 区分扣费账户 */
export function useAccountLedgers() {
  const cashLedgers = useSyncExternalStore(subscribeLedgers, getLedgersSnapshot)
  const voucherLedgers = useSyncExternalStore(subVoucherLedgers, getVoucherLedgersSnapshot)
  return useMemo(
    () =>
      [...cashLedgers, ...voucherLedgers].sort((a, b) => b.operatedAt.localeCompare(a.operatedAt)),
    [cashLedgers, voucherLedgers],
  )
}

/* ============================== 费用管理 - 订单明细 ============================== */

const ORDER_DETAIL_STORAGE_KEY = 'zsdd_order_details_v4'

const CUSTOMER_ID = '76971777531177000123'

const ORDER_DETAIL_SEED: OrderDetail[] = [
  {
    id: 'od_001',
    tab: 'resourcePack',
    customerId: CUSTOMER_ID,
    productType: 'tokensPack',
    productName: '【实名认证】500 万 Tokens 体验包',
    orderNo: '202605289a2ede5caa974fe293f',
    orderType: 'gift',
    createdAt: '2026-05-28 11:17:35',
    grantedAt: '2026-05-28 11:17:35',
    payAt: '2026-05-28 11:17:35',
    status: 'paid',
    amount: 0,
    originalPrice: 299,
    discountAmount: 299,
    couponAmount: 0,
    planName: 'Token Plan 个人版',
    seatName: '加油包 x1',
    resourceStatus: 'expired',
    expireAt: '2026-08-28 11:17:35',
    totalTokens: '5,000,000',
    remainingTokens: '0',
    paymentChannel: '系统赠送',
  },
  {
    id: 'od_002',
    tab: 'resourcePack',
    customerId: CUSTOMER_ID,
    productType: 'tokensPack',
    productName: '【新用户专享】1000 万 Tokens 新手礼包',
    orderNo: '20260430cd76f00a5dc840ee866',
    orderType: 'purchase',
    createdAt: '2026-04-30 14:38:45',
    grantedAt: '2026-04-30 14:38:45',
    payAt: '2026-04-30 14:38:45',
    status: 'paid',
    amount: 99,
    originalPrice: 199,
    discountAmount: 100,
    couponAmount: 0,
    planName: 'Token Plan 个人版',
    seatName: '新手礼包 x1',
    resourceStatus: 'active',
    expireAt: '2026-10-30 14:38:45',
    totalTokens: '10,000,000',
    remainingTokens: '6,250,000',
    paymentChannel: '余额扣减',
  },
  {
    id: 'od_003',
    tab: 'resourcePack',
    customerId: CUSTOMER_ID,
    productType: 'tokensPack',
    productName: '【新用户专享】600 万 Tokens 抵扣包',
    orderNo: '202604306dc84e1042164ff5ba0',
    orderType: 'gift',
    createdAt: '2026-04-30 14:38:45',
    grantedAt: '2026-04-30 14:38:45',
    payAt: '2026-04-30 14:38:45',
    status: 'paid',
    amount: 0,
    originalPrice: 179,
    discountAmount: 179,
    couponAmount: 0,
    planName: 'Token Plan 个人版',
    seatName: '抵扣包 x1',
    resourceStatus: 'active',
    expireAt: '2026-10-30 14:38:45',
    totalTokens: '6,000,000',
    remainingTokens: '4,120,000',
    paymentChannel: '系统赠送',
  },
  {
    id: 'od_004',
    tab: 'resourcePack',
    customerId: CUSTOMER_ID,
    productType: 'tokensPack',
    productName: '【新用户专享】200 万 Tokens 欢迎包',
    orderNo: '202604300a0b055f59f3425caf6',
    orderType: 'gift',
    createdAt: '2026-04-30 14:38:45',
    grantedAt: '2026-04-30 14:38:45',
    payAt: '2026-04-30 14:38:45',
    status: 'paid',
    amount: 0,
    originalPrice: 99,
    discountAmount: 99,
    couponAmount: 0,
    planName: 'Token Plan 个人版',
    seatName: '欢迎包 x1',
    resourceStatus: 'expired',
    expireAt: '2026-07-30 14:38:45',
    totalTokens: '2,000,000',
    remainingTokens: '0',
    paymentChannel: '系统赠送',
  },
  {
    id: 'od_005',
    tab: 'resourcePack',
    customerId: CUSTOMER_ID,
    productType: 'tokensPack',
    productName: '【新用户专享】200 万 Tokens 首登赠礼',
    orderNo: '20260430a319500a5dc540a6a92',
    orderType: 'gift',
    createdAt: '2026-04-30 14:38:45',
    grantedAt: '2026-04-30 14:38:45',
    payAt: '2026-04-30 14:38:45',
    status: 'paid',
    amount: 0,
    originalPrice: 99,
    discountAmount: 99,
    couponAmount: 0,
    planName: 'Token Plan 个人版',
    seatName: '首登赠礼 x1',
    resourceStatus: 'expired',
    expireAt: '2026-07-30 14:38:45',
    totalTokens: '2,000,000',
    remainingTokens: '0',
    paymentChannel: '系统赠送',
  },
  {
    id: 'od_006',
    tab: 'resourcePack',
    customerId: CUSTOMER_ID,
    productType: 'tokensPack',
    productName: '【新用户专享】100 万 Tokens 注册礼包',
    orderNo: '202604309e0a17a7a4ca49a6a7b',
    orderType: 'gift',
    createdAt: '2026-04-30 14:38:45',
    grantedAt: '2026-04-30 14:38:45',
    payAt: '2026-04-30 14:38:45',
    status: 'paid',
    amount: 0,
    originalPrice: 69,
    discountAmount: 69,
    couponAmount: 0,
    planName: 'Token Plan 个人版',
    seatName: '注册礼包 x1',
    resourceStatus: 'expired',
    expireAt: '2026-07-30 14:38:45',
    totalTokens: '1,000,000',
    remainingTokens: '0',
    paymentChannel: '系统赠送',
  },
  {
    id: 'od_007',
    tab: 'subscription',
    customerId: CUSTOMER_ID,
    productType: 'plan',
    productName: 'Token Plan 个人版 - 用量包',
    orderNo: '202608257a2edf1a3bb5c4d8e21',
    orderType: 'purchase',
    createdAt: '2026-08-25 15:06:11',
    grantedAt: '2026-08-25 15:06:27',
    payAt: '2026-08-25 15:06:27',
    status: 'paid',
    amount: 100,
    originalPrice: 100,
    discountAmount: 0,
    couponAmount: 0,
    planName: 'Token Plan 个人版',
    seatName: '用量包 x1',
    resourceStatus: 'active',
    expireAt: '2027-08-25 15:06:27',
    totalTokens: '3,500,000',
    remainingTokens: '2,800,000',
    paymentChannel: '微信',
  },
  {
    id: 'od_008',
    tab: 'subscription',
    customerId: CUSTOMER_ID,
    productType: 'plan',
    productName: 'Token Plan 企业版 - 年度订阅',
    orderNo: '202608204f8de2b6aa912f5c731',
    orderType: 'renew',
    createdAt: '2026-08-20 10:22:33',
    grantedAt: '2026-08-20 10:22:33',
    payAt: '2026-08-20 10:22:33',
    status: 'paid',
    amount: 1999,
    originalPrice: 2399,
    discountAmount: 300,
    couponAmount: 100,
    planName: 'Token Plan 企业版',
    seatName: '年度订阅 x1',
    resourceStatus: 'active',
    expireAt: '2027-08-20 10:22:33',
    totalTokens: '50,000,000',
    remainingTokens: '48,600,000',
    paymentChannel: '余额扣减',
  },
]

function loadOrderDetails(): OrderDetail[] {
  try {
    const raw = localStorage.getItem(ORDER_DETAIL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as OrderDetail[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0]
        if (first && 'resourceStatus' in first && 'paymentChannel' in first) {
          return parsed
        }
      }
    }
  } catch {}
  localStorage.setItem(ORDER_DETAIL_STORAGE_KEY, JSON.stringify(ORDER_DETAIL_SEED))
  return ORDER_DETAIL_SEED
}

let orderDetailState: OrderDetail[] = loadOrderDetails()
const orderDetailListeners = new Set<() => void>()
function emitOrderDetails() {
  localStorage.setItem(ORDER_DETAIL_STORAGE_KEY, JSON.stringify(orderDetailState))
  orderDetailListeners.forEach((l) => l())
}
function subscribeOrderDetails(cb: () => void) {
  orderDetailListeners.add(cb)
  return () => orderDetailListeners.delete(cb)
}
function getOrderDetailsSnapshot() {
  return orderDetailState
}

export function useOrderDetails() {
  const list = useSyncExternalStore(subscribeOrderDetails, getOrderDetailsSnapshot)
  return list
}

/* ============================== 代金券 ============================== */

/**
 * 券模板 v6：新增「国庆限定模型券」演示未来生效场景，回捞 v5 数据时按 id 追加缺失的种子模板；
 * 券实例 v4 / 券池流水 v4：演示数据裁剪为「五种状态各一条」属于删除类变更，
 * 回捞无法删掉存量多余行，故 v3 起不再回捞，直接按新种子重建（旧键数据弃用）。
 */
const VOUCHER_TEMPLATE_STORAGE_KEY = 'zsdd_voucher_templates_v6'
const VOUCHER_STORAGE_KEY = 'zsdd_vouchers_v4'
const VOUCHER_TASK_STORAGE_KEY = 'zsdd_voucher_issue_tasks_v6'
const VOUCHER_LEDGER_STORAGE_KEY = 'zsdd_voucher_ledgers_v4'

/* ---------------- 时间与券码工具 ---------------- */

const stampToDate = (s: string) => {
  const [d, t = '00:00:00'] = s.split(' ')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mi, ss] = t.split(':').map(Number)
  return new Date(y, m - 1, day, hh || 0, mi || 0, ss || 0)
}
const fmtStamp = (dt: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`
}
const nowStamp = () => fmtStamp(new Date())
/** 周期首日：周取本周一（自然周以周一为第一天），月取 1 日，季度取 1/4/7/10 月 1 日 */
const periodFirstDay = (base: Date, unit: VoucherPeriodUnit) => {
  if (unit === 'week') {
    const first = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    first.setDate(first.getDate() - ((first.getDay() + 6) % 7))
    return first
  }
  if (unit === 'quarter') {
    return new Date(base.getFullYear(), Math.floor(base.getMonth() / 3) * 3, 1)
  }
  return new Date(base.getFullYear(), base.getMonth(), 1)
}
/** 周期最后一天（零点时刻）：周 = 首日 + 6 天（周日），月 / 季度 = 顺延一个周期后取上月末日 */
const periodLastDay = (first: Date, unit: VoucherPeriodUnit) => {
  const last = new Date(first)
  if (unit === 'week') {
    last.setDate(last.getDate() + 6)
    return last
  }
  last.setMonth(last.getMonth() + (unit === 'quarter' ? 3 : 1))
  last.setDate(0)
  return last
}
/**
 * 自然周期（周 / 月 / 季度）有效期区间，规则固定不可配置：
 * - 生效时刻 = 发券时刻所在周期的第一天 00:00:00（周期中途补发也回溯到周期首日）
 * - 失效时刻 = 发券时刻所在周期最后一天 23:59:59
 */
const naturalPeriodRange = (unit: VoucherPeriodUnit, issuedAt: string) => {
  const first = periodFirstDay(stampToDate(issuedAt), unit)
  const last = periodLastDay(first, unit)
  return {
    effectiveAt: fmtStamp(first),
    expireAt: fmtStamp(new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59)),
  }
}
export const naturalPeriodValidity = (tpl: VoucherTemplate, issuedAt: string) =>
  naturalPeriodRange(tpl.periodUnit ?? 'month', issuedAt)

/** 发放频率 → 自然周期单位；单次发放无周期 */
const taskPeriodUnit = (schedule: VoucherTaskSchedule): VoucherPeriodUnit | null => {
  if (schedule === 'weekly') return 'week'
  if (schedule === 'quarterly') return 'quarter'
  if (schedule === 'monthly') return 'month'
  return null
}
/**
 * 周期任务执行时刻：每周期开始的第 1 天 00:00:00
 * step = 0 取 base 所在周期的第 1 天，step ≥ 1 从该周期起顺延 step 个周期
 */
const periodRunStamp = (base: Date, unit: VoucherPeriodUnit, step: number) => {
  const first = periodFirstDay(base, unit)
  if (step <= 0) return fmtStamp(first)
  const next = new Date(first)
  if (unit === 'week') next.setDate(next.getDate() + 7 * step)
  else next.setMonth(next.getMonth() + (unit === 'quarter' ? 3 : 1) * step)
  return fmtStamp(next)
}

/** 券码：DQ-YYYYMM-6位数字，发放时生成并绑定账户 */
const genBillVoucherCode = (taken: Set<string>): string => {
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  let code = ''
  do {
    code = `DQ-${ym}-${String(Math.floor(Math.random() * 900000) + 100000)}`
  } while (taken.has(code))
  return code
}
const ymdCompact = (s: string) => s.slice(0, 10).replace(/-/g, '')
const genBatchNo = (prefix: string) => `${prefix}-${ymdCompact(nowStamp())}-${uid().slice(0, 4).toUpperCase()}`
const ledgerSerial = (prefix: string) => {
  const p = (n: number, len = 2) => String(n).padStart(len, '0')
  const d = new Date()
  const ts = `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  return `${prefix}-${ts}${p(Math.floor(Math.random() * 1000000), 6)}`
}

/**
 * 演示券锚点：存量券里「非演示种子券」的最晚发放到账时间。
 * 五种状态的代表券（含国庆待生效券）按锚点向后铺秒级时刻，因此无论运营后续发了多少券，
 * 这五条代表券始终按发放时间倒序排在列表第一页顶部，五种状态各占一行。
 * 券种子在模块加载期求值，无法复用后文的 readStoredRows（存在暂时性死区），这里自带一次安全解析。
 */
const DEMO_VOUCHER_SEED_IDS = ['vou_001', 'vou_002', 'vou_009', 'vou_010', 'vou_012']
/** 兜底锚点：当日 10:00；当前时刻不足 10:01 时退到当前时刻前一分钟，保证锚点恒早于「现在」 */
const demoAnchorFallback = (): string => {
  const now = new Date()
  const ten = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)
  return ten.getTime() <= now.getTime() - 60000 ? fmtStamp(ten) : fmtStamp(new Date(now.getTime() - 60000))
}
/** 存量券里非演示种子券的最晚发放到账时间，取不到返回空串 */
const demoLatestStoredClaimedAt = (): string => {
  try {
    const raw = localStorage.getItem(VOUCHER_STORAGE_KEY)
    if (!raw) return ''
    const rows: unknown = JSON.parse(raw)
    if (!Array.isArray(rows)) return ''
    let latest = ''
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const item = row as { id?: unknown; claimedAt?: unknown }
      if (DEMO_VOUCHER_SEED_IDS.includes(String(item.id))) continue
      const claimedAt = typeof item.claimedAt === 'string' ? item.claimedAt : ''
      if (claimedAt > latest) latest = claimedAt
    }
    return latest
  } catch {
    return ''
  }
}
const demoVoucherAnchor = (): string => {
  const fallback = demoAnchorFallback()
  const latest = demoLatestStoredClaimedAt()
  const candidate = latest > fallback ? latest : fallback
  /** 代表券最长向后铺 60 秒，锚点上限取「当前时刻前一分钟」，杜绝演示时刻落到未来 */
  const ceiling = fmtStamp(new Date(Date.now() - 60000))
  return candidate > ceiling ? ceiling : candidate
}
const DEMO_VOUCHER_ANCHOR = demoVoucherAnchor()
const demoVoucherDate = (offsetSec: number): Date =>
  new Date(stampToDate(DEMO_VOUCHER_ANCHOR).getTime() + offsetSec * 1000)

/** 演示券时刻：由锚点派生的秒级时间戳串，券实例、券池流水、消费明细共用同一口径 */
export const demoVoucherStamp = (offsetSec: number): string => fmtStamp(demoVoucherDate(offsetSec))

/** 演示券流水号内的 12 位紧凑时刻（YYMMDDHHmmss） */
export const demoVoucherCompactTs = (offsetSec: number): string => {
  const p = (n: number) => String(n).padStart(2, '0')
  const d = demoVoucherDate(offsetSec)
  return `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** 演示批次号：与锚点同日，末尾序号区分五张代表券 */
const demoBatchNo = (seq: string) => `FB-${ymdCompact(DEMO_VOUCHER_ANCHOR)}-${seq}`

/** 演示券池流水号：前缀 + 锚点紧凑时刻 + 固定尾号 */
const demoLedgerSerial = (prefix: string, offsetSec: number, tail: string) =>
  `${prefix}-${demoVoucherCompactTs(offsetSec)}${tail}`

/* ---------------- 演示账户（与账户管理页 ROWS 对齐） ---------------- */

export interface VoucherIssueAccount {
  accountId: string
  accountName?: string
  phone?: string
  accountType?: 'personal' | 'enterprise' | 'sub'
  /** 账户标签（与账户管理页标签体系一致） */
  tags?: AccountTag[]
}

export const VOUCHER_ACCOUNT_TYPE_LABEL: Record<'personal' | 'enterprise' | 'sub', string> = {
  personal: '个人账号',
  enterprise: '企业账号',
  sub: '企业子账号',
}

export const VOUCHER_DEMO_ACCOUNTS: VoucherIssueAccount[] = [
  {
    accountId: 'ACC20260814G3RJUGglg',
    accountName: 'zsdd4892250602',
    accountType: 'personal',
    tags: [{ name: '内部员工', color: '#2f6bff' }],
  },
  {
    accountId: 'ACC20260814lyfMj9dPB',
    accountName: 'lyfyyds',
    accountType: 'personal',
    tags: [
      { name: '内部员工', color: '#2f6bff' },
      { name: '员工介绍', color: '#52c41a' },
    ],
  },
  {
    accountId: 'ACC20260810PVPbI3MgE',
    accountName: '13811305182',
    phone: '138****5182',
    accountType: 'personal',
    tags: [{ name: '员工介绍', color: '#52c41a' }],
  },
  {
    accountId: 'ACC20260805nCS9F4QYv',
    accountName: '18255445034',
    phone: '182****5034',
    accountType: 'personal',
    tags: [],
  },
  {
    accountId: 'ACC20260805p6UJUPOi',
    accountName: '13355949369',
    phone: '133****9369',
    accountType: 'personal',
    tags: [{ name: '合作伙伴', color: '#fa541c' }],
  },
  {
    accountId: 'ACC20260805kVDg6e9tu',
    accountName: '18160382631',
    phone: '181****2631',
    accountType: 'personal',
    tags: [
      { name: '员工介绍', color: '#52c41a' },
      { name: '合作伙伴', color: '#fa541c' },
    ],
  },
  {
    accountId: 'ACC20260801ACME0001',
    accountName: 'acme_corp',
    phone: '134****5555',
    accountType: 'enterprise',
    tags: [{ name: 'VIP', color: '#fa8c16' }],
  },
  {
    accountId: 'ACC20260802TECH0001',
    accountName: 'tech_team',
    phone: '133****6666',
    accountType: 'enterprise',
    tags: [{ name: '合作伙伴', color: '#fa541c' }],
  },
  {
    accountId: 'ACC20260803SUB0001',
    accountName: 'acme_sub01',
    accountType: 'sub',
    tags: [],
  },
]
export const findDemoAccount = (accountId: string) => VOUCHER_DEMO_ACCOUNTS.find((a) => a.accountId === accountId)
/** 发放弹窗的可选标签集合（由演示账户标签汇总，保证筛选值都有数据） */
export const VOUCHER_ACCOUNT_TAGS: AccountTag[] = VOUCHER_DEMO_ACCOUNTS.reduce<AccountTag[]>((acc, a) => {
  ;(a.tags ?? []).forEach((t) => {
    if (!acc.some((x) => x.name === t.name)) acc.push(t)
  })
  return acc
}, [])

/* ---------------- seed：券模板 ---------------- */

const VOUCHER_TEMPLATE_SEED: VoucherTemplate[] = [
  {
    id: 'vt_001',
    name: '新人体验券',
    faceValue: 10,
    deductOrder: 'voucherFirst',
    scope: 'all',
    validityType: 'daysAfterIssue',
    effectiveDelayDays: 0,
    validDays: 30,
    applicableTo: '适用于全平台模型按量计费',
    status: 'enabled',
    remark: '新用户注册常用券，后台直接发放到账',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-01 10:00:00',
  },
  {
    id: 'vt_002',
    name: '七夕限定模型券',
    faceValue: 50,
    deductOrder: 'voucherFirst',
    scope: 'models',
    scopeModels: ['kimi-k3', 'glm-5.2'],
    validityType: 'fixedDate',
    fixedStart: '2026-09-01 00:00:00',
    fixedEnd: '2026-10-31 23:00:00',
    applicableTo: '适用于kimi-k3、glm-5.2',
    status: 'enabled',
    remark: '仅限 kimi-k3、glm-5.2 消费抵扣',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-01 10:05:00',
  },
  {
    id: 'vt_003',
    name: '企业月度权益券',
    faceValue: 200,
    deductOrder: 'voucherFirst',
    scope: 'all',
    validityType: 'naturalPeriod',
    periodUnit: 'month',
    applicableTo: '适用于全平台 Token 按量计费',
    status: 'enabled',
    remark: '每月 20 日跑批发放当月权益：当月 1 日 00:00:00 起生效，当月最后一天 23:59:59 失效',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-05 09:30:00',
  },
  {
    id: 'vt_004',
    name: '开业普发券',
    faceValue: 100,
    deductOrder: 'cashFirst',
    scope: 'all',
    validityType: 'fixedDate',
    fixedStart: '2026-06-01 00:00:00',
    fixedEnd: '2026-08-31 23:00:00',
    applicableTo: '适用于全平台模型按量计费',
    status: 'disabled',
    remark: '开业活动专用，活动结束已停用',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-05-20 09:00:00',
  },
  {
    id: 'vt_005',
    name: '国庆限定模型券',
    faceValue: 20,
    deductOrder: 'voucherFirst',
    scope: 'all',
    validityType: 'fixedDate',
    fixedStart: '2026-10-01 00:00:00',
    fixedEnd: '2026-10-07 23:00:00',
    applicableTo: '适用于全平台模型按量计费',
    status: 'enabled',
    remark: '国庆活动券：节前提前发放，10 月 1 日 00:00 起生效、10 月 7 日 23:00 失效',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-22 11:00:00',
  },
  {
    id: 'vt_ex_120',
    name: '佣金兑换券 120 元',
    faceValue: 120,
    deductOrder: 'voucherFirst',
    scope: 'all',
    validityType: 'daysAfterIssue',
    effectiveDelayDays: 0,
    validDays: 365,
    applicableTo: '适用于全平台模型按量计费',
    exchangeOnly: true,
    exchangeCost: 100,
    status: 'enabled',
    remark: '推广合伙人佣金兑换专用：消耗佣金 100.00 元兑换 1 张',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-25 10:00:00',
  },
  {
    id: 'vt_ex_240',
    name: '佣金兑换券 240 元',
    faceValue: 240,
    deductOrder: 'voucherFirst',
    scope: 'all',
    validityType: 'daysAfterIssue',
    effectiveDelayDays: 0,
    validDays: 365,
    applicableTo: '适用于全平台模型按量计费',
    exchangeOnly: true,
    exchangeCost: 200,
    status: 'enabled',
    remark: '推广合伙人佣金兑换专用：消耗佣金 200.00 元兑换 1 张',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-25 10:00:00',
  },
  {
    id: 'vt_ex_500',
    name: '佣金兑换券 500 元',
    faceValue: 500,
    deductOrder: 'voucherFirst',
    scope: 'all',
    validityType: 'daysAfterIssue',
    effectiveDelayDays: 0,
    validDays: 365,
    applicableTo: '适用于全平台模型按量计费',
    exchangeOnly: true,
    exchangeCost: 416.67,
    status: 'enabled',
    remark: '推广合伙人佣金兑换专用：消耗佣金 416.67 元兑换 1 张',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-25 10:00:00',
  },
  {
    id: 'vt_ex_1000',
    name: '佣金兑换券 1000 元',
    faceValue: 1000,
    deductOrder: 'voucherFirst',
    scope: 'all',
    validityType: 'daysAfterIssue',
    effectiveDelayDays: 0,
    validDays: 365,
    applicableTo: '适用于全平台模型按量计费',
    exchangeOnly: true,
    exchangeCost: 833.33,
    status: 'enabled',
    remark: '推广合伙人佣金兑换专用：消耗佣金 833.33 元兑换 1 张',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-25 10:00:00',
  },
]

/* ---------------- seed：券实例（五种状态各一条演示数据） ---------------- */

const VOUCHER_SEED: Voucher[] = [
  {
    id: 'vou_001',
    code: 'DQ-202609-000101',
    templateId: 'vt_002',
    templateName: '七夕限定模型券',
    faceValue: 50,
    balance: 0,
    scope: 'models',
    scopeModels: ['kimi-k3', 'glm-5.2'],
    accountId: 'ACC20260810PVPbI3MgE',
    accountName: '13811305182',
    phone: '138****5182',
    accountType: 'personal',
    source: 'targeted',
    status: 'usedUp',
    effectiveAt: demoVoucherStamp(0),
    expireAt: '2026-10-31 23:59:59',
    claimedAt: demoVoucherStamp(1),
    batchNo: demoBatchNo('01'),
    remark: '运营发放（9 月体验补偿）',
    operator: CURRENT_OPERATOR,
    createdAt: demoVoucherStamp(1),
  },
  {
    id: 'vou_002',
    code: 'DQ-202609-000102',
    templateId: 'vt_002',
    templateName: '七夕限定模型券',
    faceValue: 50,
    balance: 20,
    scope: 'models',
    scopeModels: ['kimi-k3', 'glm-5.2'],
    accountId: 'ACC20260810PVPbI3MgE',
    accountName: '13811305182',
    phone: '138****5182',
    accountType: 'personal',
    source: 'targeted',
    status: 'active',
    effectiveAt: demoVoucherStamp(2),
    expireAt: '2026-10-31 23:59:59',
    claimedAt: demoVoucherStamp(3),
    batchNo: demoBatchNo('02'),
    remark: '运营发放（合作伙伴中秋补偿）',
    operator: CURRENT_OPERATOR,
    createdAt: demoVoucherStamp(3),
  },
  {
    id: 'vou_009',
    code: 'DQ-202608-000077',
    templateId: 'vt_001',
    templateName: '新人体验券',
    faceValue: 10,
    balance: 10,
    scope: 'all',
    accountId: 'ACC20260814lyfMj9dPB',
    accountName: 'lyfyyds',
    accountType: 'personal',
    source: 'targeted',
    status: 'expired',
    effectiveAt: demoVoucherStamp(5),
    expireAt: demoVoucherStamp(7),
    claimedAt: demoVoucherStamp(5),
    batchNo: demoBatchNo('03'),
    operator: CURRENT_OPERATOR,
    createdAt: demoVoucherStamp(5),
  },
  {
    id: 'vou_010',
    code: 'DQ-202609-000110',
    templateId: 'vt_002',
    templateName: '七夕限定模型券',
    faceValue: 50,
    balance: 0,
    scope: 'models',
    scopeModels: ['kimi-k3', 'glm-5.2'],
    accountId: 'ACC20260805p6UJUPOi',
    accountName: '13355949369',
    phone: '133****9369',
    accountType: 'personal',
    source: 'batch',
    status: 'void',
    effectiveAt: demoVoucherStamp(9),
    expireAt: '2026-10-31 23:59:59',
    claimedAt: demoVoucherStamp(10),
    batchNo: demoBatchNo('04'),
    remark: '已作废：误发账户，已回收',
    operator: CURRENT_OPERATOR,
    createdAt: demoVoucherStamp(10),
  },
  {
    id: 'vou_012',
    code: 'DQ-202609-000112',
    templateId: 'vt_005',
    templateName: '国庆限定模型券',
    faceValue: 20,
    balance: 20,
    scope: 'all',
    accountId: 'ACC20260810PVPbI3MgE',
    accountName: '13811305182',
    phone: '138****5182',
    accountType: 'personal',
    source: 'batch',
    status: 'notEffective',
    effectiveAt: '2026-10-01 00:00:00',
    expireAt: '2026-10-07 23:00:00',
    claimedAt: demoVoucherStamp(60),
    batchNo: demoBatchNo('05'),
    remark: '国庆预热：批量提前发放，10 月 1 日 00:00 起生效',
    operator: CURRENT_OPERATOR,
    createdAt: demoVoucherStamp(60),
  },
  /**
   * 佣金兑换历史券：券码 / 面额 / 归属账户与兑券记录种子（promoExchangeSeed）一一对齐，
   * 兑换发生时点早于固定面额档位，故挂在历史模板快照「佣金兑换券」下。
   */
  {
    id: 'vou_ex_001',
    code: 'DQ-202608-000081',
    templateId: 'vt_ex_500',
    templateName: '佣金兑换券',
    faceValue: 360,
    balance: 360,
    scope: 'all',
    accountId: 'ACC20260810PVPbI3MgE',
    accountName: '张明',
    phone: '138****5182',
    accountType: 'personal',
    source: 'exchange',
    status: 'active',
    effectiveAt: '2026-08-18 14:26:35',
    expireAt: '2026-11-16 14:26:35',
    claimedAt: '2026-08-18 14:26:35',
    remark: '推广合伙人佣金兑换：消耗 300 元佣金兑换 360 元券',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-08-18 14:26:35',
  },
  {
    id: 'vou_ex_002',
    code: 'DQ-202609-000093',
    templateId: 'vt_ex_500',
    templateName: '佣金兑换券',
    faceValue: 480,
    balance: 480,
    scope: 'all',
    accountId: 'ACC20260810PVPbI3MgE',
    accountName: '张明',
    phone: '138****5182',
    accountType: 'personal',
    source: 'exchange',
    status: 'active',
    effectiveAt: '2026-09-16 11:08:52',
    expireAt: '2026-12-15 11:08:52',
    claimedAt: '2026-09-16 11:08:52',
    remark: '推广合伙人佣金兑换：消耗 400 元佣金兑换 480 元券',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-16 11:08:52',
  },
  {
    id: 'vou_ex_003',
    code: 'DQ-202608-000078',
    templateId: 'vt_ex_240',
    templateName: '佣金兑换券',
    faceValue: 288,
    balance: 288,
    scope: 'all',
    accountId: 'ACC20260718LThn4Kd2',
    accountName: '李虎',
    phone: '139****8843',
    accountType: 'personal',
    source: 'exchange',
    status: 'active',
    effectiveAt: '2026-08-08 16:42:19',
    expireAt: '2026-11-06 16:42:19',
    claimedAt: '2026-08-08 16:42:19',
    remark: '推广合伙人佣金兑换：消耗 240 元佣金兑换 288 元券',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-08-08 16:42:19',
  },
]

/* ---------------- seed：发放任务 ---------------- */

const VOUCHER_TASK_SEED: VoucherIssueTask[] = [
  {
    id: 'vit_001',
    name: '中秋合作伙伴批量发放',
    templateId: 'vt_002',
    templateName: '七夕限定模型券',
    targetDesc: '圈选条件：标签含「合作伙伴」的个人账号',
    accountScope: 'partial',
    targetAccounts: ['ACC20260805p6UJUPOi'],
    schedule: 'once',
    firing: 'immediate',
    total: 1,
    success: 1,
    fail: 0,
    lastRunIssued: 1,
    runs: [{ at: '2026-09-14 10:00:00', issued: 1, skipped: 0, trigger: 'auto' }],
    status: 'done',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-14 10:00:00',
  },
  {
    id: 'vit_002',
    name: '企业权益月度发放（9 月起）',
    templateId: 'vt_003',
    templateName: '企业月度权益券',
    targetDesc: '圈选条件：签约月度权益的账号',
    accountScope: 'partial',
    targetAccounts: ['ACC20260814G3RJUGglg'],
    schedule: 'monthly',
    firing: 'immediate',
    nextRunAt: '2026-10-01 00:00:00',
    total: 1,
    success: 1,
    fail: 0,
    lastRunIssued: 1,
    runs: [{ at: '2026-09-20 16:00:00', issued: 1, skipped: 0, trigger: 'auto' }],
    status: 'running',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-20 16:00:00',
  },
  {
    id: 'vit_003',
    name: '国庆预热·新人体验券定时发放',
    templateId: 'vt_001',
    templateName: '新人体验券',
    targetDesc: '圈选条件：9 月新注册且未领取过新人券的个人账号',
    accountScope: 'partial',
    targetAccounts: ['ACC20260814lyfMj9dPB', 'ACC20260810PVPbI3MgE'],
    schedule: 'once',
    firing: 'scheduled',
    scheduledAt: '2026-10-08 10:00:00',
    nextRunAt: '2026-10-08 10:00:00',
    total: 0,
    success: 0,
    fail: 0,
    status: 'running',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-22 15:30:00',
  },
  {
    id: 'vit_004',
    name: '合作伙伴答谢券批量补发',
    templateId: 'vt_002',
    templateName: '七夕限定模型券',
    targetDesc: '圈选条件：标签含「核心合作伙伴」的个人账号',
    accountScope: 'partial',
    targetAccounts: ['ACC20260805nCS9F4QYv', 'ACC20260805p6UJUPOi', 'ACC20260805kVDg6e9tu'],
    schedule: 'once',
    firing: 'immediate',
    total: 3,
    success: 2,
    fail: 1,
    lastRunIssued: 2,
    runs: [{ at: '2026-09-18 11:00:00', issued: 2, skipped: 1, trigger: 'auto' }],
    status: 'done',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-18 11:00:00',
  },
  {
    id: 'vit_005',
    name: 'KA 企业月度权益发放',
    templateId: 'vt_003',
    templateName: '企业月度权益券',
    targetDesc: '圈选条件：签约年度框架的 KA 企业账号',
    accountScope: 'partial',
    targetAccounts: ['ACC20260801ACME0001', 'ACC20260802TECH0001'],
    schedule: 'monthly',
    firing: 'immediate',
    nextRunAt: '2026-10-05 10:00:00',
    total: 2,
    success: 2,
    fail: 0,
    lastRunIssued: 2,
    runs: [{ at: '2026-09-05 10:00:00', issued: 2, skipped: 0, trigger: 'auto' }],
    status: 'paused',
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-05 10:00:00',
  },
]

/* ---------------- seed：代金券池流水（fundAccount=voucher，按账户券池串链） ---------------- */

const VLEDGER_BASE = {
  fundAccount: 'voucher' as const,
  operator: CURRENT_OPERATOR,
}

/** 券池流水与代表券同源：时刻、流水号、批次号全部由演示锚点派生，保证余额链与券行时间线一致 */
const VOUCHER_LEDGER_SEED: AccountLedger[] = [
  {
    ...VLEDGER_BASE,
    id: 'vledger_01',
    serialNo: demoLedgerSerial('DJQFF', 1, '101233'),
    operatedAt: demoVoucherStamp(1),
    operatorPhone: '—',
    operatorAccountId: '—',
    operationType: 'voucher_issue',
    amountBefore: 0,
    amountChange: 50,
    amountAfter: 50,
    remark: `后台发放：七夕限定模型券（批次 ${demoBatchNo('01')}）`,
    voucherCode: 'DQ-202609-000101',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_02',
    serialNo: demoLedgerSerial('DJQFF', 3, '204561'),
    operatedAt: demoVoucherStamp(3),
    operatorPhone: '—',
    operatorAccountId: '—',
    operationType: 'voucher_issue',
    amountBefore: 50,
    amountChange: 50,
    amountAfter: 100,
    remark: `后台发放：七夕限定模型券（批次 ${demoBatchNo('02')}）`,
    voucherCode: 'DQ-202609-000102',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_03',
    serialNo: demoLedgerSerial('DJQDK', 21, '330001'),
    operatedAt: demoVoucherStamp(21),
    operatorPhone: '138****5182',
    operatorAccountId: 'ACC20260810PVPbI3MgE',
    operationType: 'voucher_deduct',
    amountBefore: 100,
    amountChange: 30,
    amountAfter: 70,
    remark: 'kimi-k3—模型调用消费 ¥30.00，全部由代金券抵扣',
    voucherCode: 'DQ-202609-000101',
    relatedBizNo: 'XF-20260915-884122',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_04',
    serialNo: demoLedgerSerial('DJQDK', 31, '440002'),
    operatedAt: demoVoucherStamp(31),
    operatorPhone: '138****5182',
    operatorAccountId: 'ACC20260810PVPbI3MgE',
    operationType: 'voucher_deduct',
    amountBefore: 70,
    amountChange: 20,
    amountAfter: 50,
    remark: 'glm-5.2—模型调用消费 ¥50.00，本券抵扣 ¥20.00',
    voucherCode: 'DQ-202609-000101',
    relatedBizNo: 'XF-20260916-227309',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_05',
    serialNo: demoLedgerSerial('DJQDK', 31, '440003'),
    operatedAt: demoVoucherStamp(31),
    operatorPhone: '138****5182',
    operatorAccountId: 'ACC20260810PVPbI3MgE',
    operationType: 'voucher_deduct',
    amountBefore: 50,
    amountChange: 30,
    amountAfter: 20,
    remark: 'glm-5.2—模型调用消费 ¥50.00，本券抵扣 ¥30.00',
    voucherCode: 'DQ-202609-000102',
    relatedBizNo: 'XF-20260916-227309',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_07',
    serialNo: demoLedgerSerial('DJQFF', 5, '771122'),
    operatedAt: demoVoucherStamp(5),
    operatorPhone: '—',
    operatorAccountId: '—',
    operationType: 'voucher_issue',
    amountBefore: 0,
    amountChange: 10,
    amountAfter: 10,
    remark: `后台发放：新人体验券（批次 ${demoBatchNo('03')}）`,
    voucherCode: 'DQ-202608-000077',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_08',
    serialNo: demoLedgerSerial('DJQFF', 10, '883344'),
    operatedAt: demoVoucherStamp(10),
    operatorPhone: '—',
    operatorAccountId: '—',
    operationType: 'voucher_issue',
    amountBefore: 0,
    amountChange: 50,
    amountAfter: 50,
    remark: `批量发放：七夕限定模型券（批次 ${demoBatchNo('04')}）`,
    voucherCode: 'DQ-202609-000110',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_10',
    serialNo: demoLedgerSerial('DJQZF', 40, '107788'),
    operatedAt: demoVoucherStamp(40),
    operatorPhone: '—',
    operatorAccountId: '—',
    operationType: 'voucher_void',
    amountBefore: 50,
    amountChange: 50,
    amountAfter: 0,
    remark: '代金券作废：误发账户，已回收',
    voucherCode: 'DQ-202609-000110',
  },
  {
    ...VLEDGER_BASE,
    id: 'vledger_12',
    serialNo: demoLedgerSerial('DJQFF', 60, '121122'),
    operatedAt: demoVoucherStamp(60),
    operatorPhone: '—',
    operatorAccountId: '—',
    operationType: 'voucher_issue',
    amountBefore: 20,
    amountChange: 20,
    amountAfter: 40,
    remark: `批量发放：国庆限定模型券（批次 ${demoBatchNo('05')}）`,
    voucherCode: 'DQ-202609-000112',
  },
]

/* ---------------- 通用实体存储（localStorage + 订阅） ---------------- */

function makeVoucherStore<T>(key: string, seedRows: T[], revive?: (rows: T[]) => T[]) {
  let state: T[] = (() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as T[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const rows = revive ? revive(parsed) : parsed
          if (rows !== parsed) localStorage.setItem(key, JSON.stringify(rows))
          return rows
        }
      }
    } catch {}
    localStorage.setItem(key, JSON.stringify(seedRows))
    return seedRows
  })()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())
  /** 跨标签页同步：后台与控制台常在不同标签页打开，localStorage 写入后需通知其他标签页重渲染 */
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key || e.newValue == null || e.newValue === JSON.stringify(state)) return
      try {
        const parsed = JSON.parse(e.newValue) as T[]
        if (!Array.isArray(parsed)) return
        state = revive ? revive(parsed) : parsed
        notify()
      } catch {}
    })
  }
  return {
    subscribe: (cb: () => void) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    get: () => state,
    set: (next: T[] | ((prev: T[]) => T[])) => {
      state = typeof next === 'function' ? (next as (prev: T[]) => T[])(state) : next
      localStorage.setItem(key, JSON.stringify(state))
      notify()
    },
  }
}

/* ---------------- 存量数据一次性归一化（券模板 + 发放任务） ---------------- */

/**
 * 券模板历史键：v4 及之前把自然周期做成「生效方式 + 周期内第几天 + 时刻」的可配置模型；
 * v5 为固定模型，v6 新增「国庆限定模型券」，回捞 v5 时按 id 追加缺失的种子模板（只补不删，保留用户自建模板）。
 */
const LEGACY_VOUCHER_TEMPLATE_KEYS = ['zsdd_voucher_templates_v5', 'zsdd_voucher_templates_v4']

/** 已废弃的自然周期字段：周期锚点、生效方式、第几天生效、生效时刻、旧版截止口径 */
const LEGACY_PERIOD_FIELDS = ['periodAnchor', 'periodStartMode', 'periodStartDay', 'periodStartHour', 'periodEndType']

/** 旧版种子的自然周期备注写死了「次月生效」「发放时刻起生效」，与现行「周期第一天 00:00:00 起生效」矛盾，命中原文时一次性刷新 */
const LEGACY_PERIOD_REMARKS: Record<string, string> = {
  '每月 20 日跑批提前发放下月权益：次月 1 日 00:00 生效，次月最后一天 23:59:59 失效':
    '每月 20 日跑批发放当月权益：当月 1 日 00:00:00 起生效，当月最后一天 23:59:59 失效',
  '每月 20 日跑批发放当月权益：发放时刻起生效，当月最后一天 23:59:59 失效':
    '每月 20 日跑批发放当月权益：当月 1 日 00:00:00 起生效，当月最后一天 23:59:59 失效',
}

const readStoredRows = (key: string): Record<string, unknown>[] | null => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Record<string, unknown>[]) : null
  } catch {
    return null
  }
}

/** 模板行换算：删掉废弃字段；旧数据没有 periodUnit 时由旧版截止口径反推（quarterEnd→季度、weekEnd→周） */
const normalizeTemplateRow = (row: Record<string, unknown>) => {
  const next: Record<string, unknown> = { ...row }
  LEGACY_PERIOD_FIELDS.forEach((field) => delete next[field])
  if (next.validityType === 'naturalPeriod') {
    if (typeof next.periodUnit !== 'string') {
      next.periodUnit = row.periodEndType === 'quarterEnd' ? 'quarter' : row.periodEndType === 'weekEnd' ? 'week' : 'month'
    }
    if (typeof next.remark === 'string' && LEGACY_PERIOD_REMARKS[next.remark]) {
      next.remark = LEGACY_PERIOD_REMARKS[next.remark]
    }
  }
  /** 旧版固定日期只存到日，按当时的边界口径换算成整点时刻串；已是时刻串的原样保留 */
  if (next.validityType === 'fixedDate') {
    if (typeof next.fixedStart === 'string' && next.fixedStart.length === 10) {
      next.fixedStart = `${next.fixedStart} 00:00:00`
    }
    if (typeof next.fixedEnd === 'string' && next.fixedEnd.length === 10) {
      next.fixedEnd = `${next.fixedEnd} 23:00:00`
    }
  }
  return next
}

/**
 * 发放任务历史键：v2 用「生效时机 effect」描述周期任务何时开始跑，
 * v3 起统一为「首次发放时间 firing」（界面早期称「本次发放时间」）——券的生效/失效只由券模板决定，任务层只管发放动作；
 * v4 新增「本次发放数量 lastRunIssued」，存量行按累计成功数回推一次；
 * v5 新增「执行记录 runs」，存量行若已有成功发放但无记录，按 lastRunIssued 回填一条 auto 记录；
 * v6 补齐覆盖全部任务状态的演示任务（执行中/已完成/已中止），回捞时按 id 追加缺失的种子任务，仅迁移一次；
 * 任务状态精简为「执行中 / 已完成 / 已中止」三态，存量行的「待执行」归入「执行中」、「部分完成」归入「已完成」。
 */
const LEGACY_VOUCHER_TASK_KEYS = [
  'zsdd_voucher_issue_tasks_v5',
  'zsdd_voucher_issue_tasks_v4',
  'zsdd_voucher_issue_tasks_v3',
  'zsdd_voucher_issue_tasks_v2',
]

const LEGACY_TASK_EFFECT_FIRING: Record<string, VoucherTaskFiring> = {
  immediate: 'immediate',
  next_period: 'next_period',
}

const normalizeTaskRow = (row: Record<string, unknown>) => {
  const next: Record<string, unknown> = { ...row }
  const legacyFiring = typeof next.effect === 'string' ? LEGACY_TASK_EFFECT_FIRING[next.effect] : undefined
  delete next.effect
  if (next.firing !== 'immediate' && next.firing !== 'scheduled' && next.firing !== 'next_period') {
    next.firing = legacyFiring ?? 'immediate'
  }
  if (typeof next.lastRunIssued !== 'number' && typeof next.success === 'number' && next.success > 0) {
    next.lastRunIssued = next.success
  }
  if (!Array.isArray(next.runs) && typeof next.success === 'number' && next.success > 0) {
    next.runs = [
      {
        at: String(next.createdAt ?? ''),
        issued: typeof next.lastRunIssued === 'number' ? next.lastRunIssued : next.success,
        skipped: typeof next.fail === 'number' ? next.fail : 0,
        trigger: 'auto',
      },
    ]
  }
  /** 任务状态精简：存量行的「待执行」归入「执行中」，「部分完成」归入「已完成」 */
  if (next.status === 'draft') next.status = 'running'
  if (next.status === 'partial') next.status = 'done'
  return next
}

/**
 * 启动时把 localStorage 里的券模板与发放任务换算到新模型，写回当前键位，因此是幂等的：
 * - 当前键有数据 → 就地归一化；为空 → 回捞历史键的自建数据（历史键保留不动，便于回滚）；两者皆空则交给种子
 * - 回捞时按 id 追加缺失的种子行（只补不删）：模板 v5→v6 补「国庆限定模型券」，任务 v5→v6 补三种新演示任务
 * - 固定日期模板旧的「只到日」配置换算为整点时刻串（生效 00:00、失效 23:00），已发出的券不回溯
 * - 兑换专用档位补齐后续新增的「兑换金额」字段：仅缺失时按种子补值，已配置过的保留原值
 * - 券实例与券池流水不回捞：演示数据裁剪为「五种状态各一条」属于删除类变更，回捞无法删掉存量多余行，直接按新种子重建
 * - 券池流水另做同键 remark 就地刷新：旧「券 + 现金混付」口径备注一次性改为全额券抵扣口径
 * - 五种状态的代表券与其券池流水按演示锚点对齐：存量同 id 行只刷新时间轴字段（券的时刻与批次、流水的时刻与流水号），
 *   锚点每天前进一次，存量数据因此始终排在按发放时间倒序的列表第一页，五种状态各占一行
 */
function migrateVoucherData() {
  const storedTemplates = readStoredRows(VOUCHER_TEMPLATE_STORAGE_KEY)
  if (storedTemplates) {
    /** 存量模板按 id 回捞缺失的种子模板（只补不删），保证新增的兑换专用券档位能出现在老浏览器 */
    const storedIds = new Set(storedTemplates.map((r) => String(r.id)))
    const missingSeeds = VOUCHER_TEMPLATE_SEED.filter((tpl) => !storedIds.has(tpl.id)).map(
      (tpl) => ({ ...tpl }) as unknown as Record<string, unknown>,
    )
    const normalized = [...storedTemplates, ...missingSeeds].map(normalizeTemplateRow)
    /** 兑换专用券有效期统一为 1 年：存量模板按种子口径定向回刷（只动这 4 个档位） */
    const exchangeSeedIds = new Set(VOUCHER_TEMPLATE_SEED.filter((t) => t.exchangeOnly).map((t) => t.id))
    const seeded = normalized.map((row) => {
      const seed = exchangeSeedIds.has(String(row.id)) ? VOUCHER_TEMPLATE_SEED.find((t) => t.id === String(row.id)) : undefined
      if (!seed) return row
      /** 「兑换金额」为后续新增字段：存量兑换档位缺失时按种子补值，已配置过的（含手工改过的）不动 */
      return { ...row, validDays: seed.validDays, exchangeCost: row.exchangeCost ?? seed.exchangeCost }
    })
    if (JSON.stringify(seeded) !== JSON.stringify(storedTemplates)) {
      localStorage.setItem(VOUCHER_TEMPLATE_STORAGE_KEY, JSON.stringify(seeded))
    }
  } else {
    for (const legacyKey of LEGACY_VOUCHER_TEMPLATE_KEYS) {
      const legacy = readStoredRows(legacyKey)
      if (!legacy) continue
      const rows = legacy.map(normalizeTemplateRow)
      if (legacyKey === 'zsdd_voucher_templates_v5') {
        const existingIds = new Set(rows.map((r) => String(r.id)))
        for (const seedTpl of VOUCHER_TEMPLATE_SEED) {
          if (!existingIds.has(seedTpl.id)) rows.push({ ...seedTpl } as unknown as Record<string, unknown>)
        }
      }
      localStorage.setItem(VOUCHER_TEMPLATE_STORAGE_KEY, JSON.stringify(rows))
      break
    }
  }

  const storedTasks = readStoredRows(VOUCHER_TASK_STORAGE_KEY)
  if (storedTasks) {
    const normalizedTasks = storedTasks.map(normalizeTaskRow)
    if (JSON.stringify(normalizedTasks) !== JSON.stringify(storedTasks)) {
      localStorage.setItem(VOUCHER_TASK_STORAGE_KEY, JSON.stringify(normalizedTasks))
    }
  } else {
    for (const legacyKey of LEGACY_VOUCHER_TASK_KEYS) {
      const legacy = readStoredRows(legacyKey)
      if (!legacy) continue
      const rows = legacy.map(normalizeTaskRow)
      if (legacyKey === 'zsdd_voucher_issue_tasks_v5') {
        const existingIds = new Set(rows.map((r) => String(r.id)))
        for (const seedTask of VOUCHER_TASK_SEED) {
          if (!existingIds.has(seedTask.id)) rows.push({ ...seedTask } as unknown as Record<string, unknown>)
        }
      }
      localStorage.setItem(VOUCHER_TASK_STORAGE_KEY, JSON.stringify(rows))
      break
    }
  }

  /**
   * 存量券池流水：「glm-5.2 消费 ¥50」由单张券抵扣升级为两张券组合抵扣。
   * 按业务指纹（券池抵扣 + 券码 000102 + 关联业务号 XF-20260916-227309）命中原流水，
   * 将其重写为券 000101 抵扣 ¥20，并在其后插入券 000102 抵扣 ¥30 的新行，
   * 两行共用同一关联业务号；兼容「券 + 现金混付」「全额券抵扣」两种历史备注口径。
   */
  const VLEDGER_COMBO_BIZ_NO = 'XF-20260916-227309'
  const VLEDGER_COMBO_SECOND_ID = 'vledger_05'
  const storedVledgers = readStoredRows(VOUCHER_LEDGER_STORAGE_KEY)
  if (storedVledgers && !storedVledgers.some((row) => String(row.id) === VLEDGER_COMBO_SECOND_ID)) {
    const nextVledgers: Record<string, unknown>[] = []
    for (const row of storedVledgers) {
      const isComboRow =
        String(row.operationType) === 'voucher_deduct' &&
        String(row.voucherCode) === 'DQ-202609-000102' &&
        String(row.relatedBizNo) === VLEDGER_COMBO_BIZ_NO
      if (!isComboRow) {
        nextVledgers.push(row)
        continue
      }
      nextVledgers.push({
        ...row,
        amountBefore: 70,
        amountChange: 20,
        amountAfter: 50,
        remark: 'glm-5.2—模型调用消费 ¥50.00，本券抵扣 ¥20.00',
        voucherCode: 'DQ-202609-000101',
      })
      nextVledgers.push({
        ...row,
        id: VLEDGER_COMBO_SECOND_ID,
        serialNo: 'DJQDK-260916110247440003',
        amountBefore: 50,
        amountChange: 30,
        amountAfter: 20,
        remark: 'glm-5.2—模型调用消费 ¥50.00，本券抵扣 ¥30.00',
      })
    }
    localStorage.setItem(VOUCHER_LEDGER_STORAGE_KEY, JSON.stringify(nextVledgers))
  }

  /** 存量券实例：组合抵扣后两张券的余额与状态互换（000101 已用完、000102 剩余 ¥20），券池总余额不变 */
  const pickFields = (source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> => {
    const picked: Record<string, unknown> = {}
    for (const key of keys) if (source[key] !== undefined) picked[key] = source[key]
    return picked
  }
  const demoVoucherById = new Map<string, Record<string, unknown>>(
    VOUCHER_SEED.filter((row) => DEMO_VOUCHER_SEED_IDS.includes(row.id)).map((row) => [
      row.id,
      row as unknown as Record<string, unknown>,
    ]),
  )
  const demoVledgerById = new Map<string, Record<string, unknown>>(
    VOUCHER_LEDGER_SEED.map((row) => [row.id, row as unknown as Record<string, unknown>]),
  )
  const DEMO_VOUCHER_FIELDS = ['effectiveAt', 'expireAt', 'claimedAt', 'batchNo', 'createdAt'] as const
  const DEMO_VLEDGER_FIELDS = ['operatedAt', 'serialNo', 'remark'] as const

  const storedVouchers = readStoredRows(VOUCHER_STORAGE_KEY)
  if (storedVouchers) {
    /** 佣金兑换历史券（只补不删）：保证老浏览器的代金券列表也能按「佣金兑换」来源筛出种子兑券 */
    const voucherIds = new Set(storedVouchers.map((row) => String(row.id)))
    const missingExchangeVouchers = VOUCHER_SEED.filter(
      (v) => v.source === 'exchange' && !voucherIds.has(v.id),
    ).map((v) => ({ ...v }) as unknown as Record<string, unknown>)
    const nextVouchers = [...storedVouchers, ...missingExchangeVouchers].map((row) => {
      const demo = demoVoucherById.get(String(row.id))
      const aligned = demo ? { ...row, ...pickFields(demo, DEMO_VOUCHER_FIELDS) } : row
      /** 早期版本兑换生成的券来源记为后台发放，按备注口径回刷为「佣金兑换」 */
      if (String(aligned.remark ?? '').startsWith('推广合伙人佣金兑换')) return { ...aligned, source: 'exchange' }
      if (String(aligned.code) === 'DQ-202609-000101') return { ...aligned, balance: 0, status: 'usedUp' }
      if (String(aligned.code) === 'DQ-202609-000102') return { ...aligned, balance: 20, status: 'active' }
      return aligned
    })
    if (JSON.stringify(nextVouchers) !== JSON.stringify(storedVouchers)) {
      localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(nextVouchers))
    }
  }

  /** 存量券池流水：只刷新时刻、流水号与批次备注三列，余额链（前/变/后）保持不动 */
  const storedVledgersForAnchor = readStoredRows(VOUCHER_LEDGER_STORAGE_KEY)
  if (storedVledgersForAnchor) {
    const nextVledgers = storedVledgersForAnchor.map((row) => {
      const demo = demoVledgerById.get(String(row.id))
      return demo ? { ...row, ...pickFields(demo, DEMO_VLEDGER_FIELDS) } : row
    })
    if (JSON.stringify(nextVledgers) !== JSON.stringify(storedVledgersForAnchor)) {
      localStorage.setItem(VOUCHER_LEDGER_STORAGE_KEY, JSON.stringify(nextVledgers))
    }
  }
}

migrateVoucherData()

const voucherTemplateStore = makeVoucherStore<VoucherTemplate>(VOUCHER_TEMPLATE_STORAGE_KEY, VOUCHER_TEMPLATE_SEED)
const vouchersStore = makeVoucherStore<Voucher>(VOUCHER_STORAGE_KEY, VOUCHER_SEED)
const voucherTaskStore = makeVoucherStore<VoucherIssueTask>(VOUCHER_TASK_STORAGE_KEY, VOUCHER_TASK_SEED)
const voucherLedgerStore = makeVoucherStore<AccountLedger>(VOUCHER_LEDGER_STORAGE_KEY, VOUCHER_LEDGER_SEED)

export const subVoucherLedgers = voucherLedgerStore.subscribe
export const getVoucherLedgersSnapshot = voucherLedgerStore.get

/* ---------------- hooks ---------------- */

export function useVoucherTemplates() {
  return useSyncExternalStore(voucherTemplateStore.subscribe, voucherTemplateStore.get)
}
export function useVouchers() {
  return useSyncExternalStore(vouchersStore.subscribe, vouchersStore.get)
}
export function useVoucherIssueTasks() {
  return useSyncExternalStore(voucherTaskStore.subscribe, voucherTaskStore.get)
}

/* ---------------- 派生工具 ---------------- */

/** 券池余额 = 该账户名下所有券（含已过期未用完）余额合计 */
export function voucherPoolBalance(vouchers: Voucher[], accountId: string): number {
  return roundAmount(
    vouchers.filter((v) => v.accountId === accountId).reduce((sum, v) => sum + v.balance, 0),
    6,
  )
}

/** 按当前时间实时推导展示态（作废/已用完为终态，其余按生效与到期时间纠偏） */
export function liveVoucherStatus(v: Voucher, now = nowStamp()): VoucherStatus {
  if (v.status === 'void' || v.status === 'usedUp') return v.status
  if (v.status === 'expired') return 'expired'
  if (v.effectiveAt && v.effectiveAt > now) return 'notEffective'
  if (v.expireAt && v.expireAt < now) return 'expired'
  if (v.status === 'notEffective') return 'active'
  return v.status
}

/**
 * 券有效期定期巡检：把「到达生效时间」的待生效券落盘为生效中、把「到达失效时间」的券落盘为已过期，
 * 返回本次被纠正的券条数。作废 / 已用完 / 已过期为终态，不回改。
 */
export function sweepVoucherStatuses(): number {
  const now = nowStamp()
  let fixed = 0
  vouchersStore.set((prev) => {
    const next = prev.map((v) => {
      const target = liveVoucherStatus(v, now)
      if (target === v.status) return v
      fixed += 1
      return { ...v, status: target }
    })
    /** 无变化时不写 localStorage，避免无谓的订阅刷新 */
    return fixed === 0 ? prev : next
  })
  return fixed
}

/** 依据模板有效期类型，解析券到账时刻对应的生效/到期时间 */
function resolveValidity(tpl: VoucherTemplate | undefined, claimedAt: string): { effectiveAt?: string; expireAt?: string } {
  if (!tpl) return {}
  if (tpl.validityType === 'fixedDate') {
    /** 模板即配了生效/失效时刻（精确到小时），直接沿用，不再拼接默认时分秒 */
    return { effectiveAt: tpl.fixedStart, expireAt: tpl.fixedEnd }
  }
  if (tpl.validityType === 'naturalPeriod') {
    return naturalPeriodValidity(tpl, claimedAt)
  }
  /** 发放后按天：生效 = 发放日+n天 00:00:00（不受发放时刻时分秒影响），到期 = 生效日+m-1天 23:59:59 */
  const eff = stampToDate(claimedAt)
  eff.setDate(eff.getDate() + (tpl.effectiveDelayDays ?? 0))
  const effectiveAt = fmtStamp(new Date(eff.getFullYear(), eff.getMonth(), eff.getDate(), 0, 0, 0))
  // 模板「长期有效」开关打开时不落 validDays，此处即不计算到期时刻
  const expireAt = tpl.validDays
    ? fmtStamp(
        (() => {
          const exp = new Date(eff.getFullYear(), eff.getMonth(), eff.getDate())
          exp.setDate(exp.getDate() + Math.max(tpl.validDays - 1, 0))
          exp.setHours(23, 59, 59)
          return exp
        })(),
      )
    : undefined
  return { effectiveAt, expireAt }
}

/** 追加一条券池流水（券行与现金行以 relatedBizNo 配对，券侧只影响券池） */
function appendVoucherLedgerRow(row: {
  operationType: 'voucher_issue' | 'voucher_deduct' | 'voucher_void'
  prefix: string
  amountBefore: number
  amount: number
  operatedAt: string
  remark: string
  voucherCode?: string
  relatedBizNo?: string
  operatorPhone: string
  operatorAccountId: string
}) {
  const after =
    row.operationType === 'voucher_issue'
      ? roundAmount(row.amountBefore + row.amount, 6)
      : roundAmount(row.amountBefore - row.amount, 6)
  const ledger: AccountLedger = {
    id: `vledger_${uid()}`,
    serialNo: ledgerSerial(row.prefix),
    operatedAt: row.operatedAt,
    operatorPhone: row.operatorPhone,
    operatorAccountId: row.operatorAccountId,
    operationType: row.operationType,
    amountBefore: roundAmount(row.amountBefore, 6),
    amountChange: row.amount,
    amountAfter: after,
    remark: row.remark,
    fundAccount: 'voucher',
    voucherCode: row.voucherCode,
    relatedBizNo: row.relatedBizNo,
    operator: CURRENT_OPERATOR,
  }
  voucherLedgerStore.set((prev) => [ledger, ...prev])
}

/* ---------------- 写操作：券模板 ---------------- */

export function createVoucherTemplate(input: Omit<VoucherTemplate, 'id' | 'createdAt' | 'operator'>): VoucherTemplate {
  const t: VoucherTemplate = { ...input, id: `vtpl_${uid()}`, createdAt: nowStamp(), operator: CURRENT_OPERATOR }
  voucherTemplateStore.set((prev) => [t, ...prev])
  return t
}

export function updateVoucherTemplate(id: string, patch: Partial<VoucherTemplate>) {
  voucherTemplateStore.set((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
}

export function removeVoucherTemplate(id: string): { ok: boolean; msg: string } {
  const issued = vouchersStore.get().some((v) => v.templateId === id)
  if (issued) return { ok: false, msg: '该模板已发出过券，建议停用而非删除' }
  voucherTemplateStore.set((prev) => prev.filter((t) => t.id !== id))
  return { ok: true, msg: '模板已删除' }
}

/* ---------------- 写操作：发放（单个 / 批量） ---------------- */

export function issueVouchers(
  templateId: string,
  accounts: VoucherIssueAccount[],
  opts: { source?: VoucherSource; remark?: string } = {},
): { batchNo: string; issued: Voucher[]; skipped: { accountId: string; reason: string }[] } {
  const now = nowStamp()
  const tpl = voucherTemplateStore.get().find((t) => t.id === templateId)
  if (!tpl) return { batchNo: '', issued: [], skipped: accounts.map((a) => ({ accountId: a.accountId, reason: '券模板不存在' })) }
  if (tpl.status !== 'enabled') {
    return { batchNo: '', issued: [], skipped: accounts.map((a) => ({ accountId: a.accountId, reason: '模板已停用，请先启用' })) }
  }
  const batchNo = genBatchNo('FB')
  const existing = vouchersStore.get()
  const taken = new Set(existing.map((v) => v.code))
  const issued: Voucher[] = []
  const skipped: { accountId: string; reason: string }[] = []
  const poolBefore = new Map<string, number>()
  const poolOf = (id: string) => {
    if (!poolBefore.has(id)) poolBefore.set(id, voucherPoolBalance(existing, id))
    return poolBefore.get(id) as number
  }
  const { effectiveAt, expireAt } = resolveValidity(tpl, now)
  // 补发到已过期的固定日期区间时，直接落「已过期」，避免账面出现可用假象
  const status: VoucherStatus =
    expireAt && expireAt < now ? 'expired' : effectiveAt && effectiveAt > now ? 'notEffective' : 'active'
  for (const acct of accounts) {
    if (acct.accountType === 'sub') {
      skipped.push({ accountId: acct.accountId, reason: '企业子账号不支持发放代金券' })
      continue
    }
    const code = genBillVoucherCode(taken)
    taken.add(code)
    const v: Voucher = {
      id: `vou_${uid()}`,
      code,
      templateId: tpl.id,
      templateName: tpl.name,
      faceValue: tpl.faceValue,
      balance: tpl.faceValue,
      scope: tpl.scope,
      scopeModels: tpl.scopeModels ? [...tpl.scopeModels] : undefined,
      accountId: acct.accountId,
      accountName: acct.accountName,
      phone: acct.phone,
      accountType: acct.accountType,
      source: opts.source ?? 'targeted',
      status,
      effectiveAt,
      expireAt,
      claimedAt: now,
      batchNo,
      remark: opts.remark,
      operator: CURRENT_OPERATOR,
      createdAt: now,
    }
    issued.push(v)
    const before = poolOf(acct.accountId)
    poolBefore.set(acct.accountId, roundAmount(before + tpl.faceValue, 6))
    appendVoucherLedgerRow({
      operationType: 'voucher_issue',
      prefix: 'DJQFF',
      amountBefore: before,
      amount: tpl.faceValue,
      operatedAt: now,
      remark: `代金券发放：${tpl.name}（批次 ${batchNo}）`,
      voucherCode: code,
      operatorPhone: '—',
      operatorAccountId: '—',
    })
  }
  if (issued.length > 0) vouchersStore.set((prev) => [...issued, ...prev])
  return { batchNo, issued, skipped }
}

/* ---------------- 写操作：券作废 ---------------- */

export function voidVoucher(id: string, reason: string): { ok: boolean; msg: string } {
  const v = vouchersStore.get().find((x) => x.id === id)
  if (!v) return { ok: false, msg: '券不存在' }
  /** 与消费抵扣同口径：按实时状态拦截，作废仅对「未生效 / 生效中」的券开放 */
  const live = liveVoucherStatus(v)
  if (live === 'void') return { ok: false, msg: '该券已作废' }
  if (live === 'usedUp') return { ok: false, msg: '已用完的券无需作废' }
  if (live === 'expired') return { ok: false, msg: '已过期的券无需作废' }
  const now = nowStamp()
  if (v.accountId && v.balance > 0) {
    appendVoucherLedgerRow({
      operationType: 'voucher_void',
      prefix: 'DJQZF',
      amountBefore: voucherPoolBalance(vouchersStore.get(), v.accountId),
      amount: v.balance,
      operatedAt: now,
      remark: `代金券作废：${reason || '未填写原因'}`,
      voucherCode: v.code,
      operatorPhone: '—',
      operatorAccountId: '—',
    })
  }
  vouchersStore.set((prev) =>
    prev.map((x) => (x.id === id ? { ...x, status: 'void' as VoucherStatus, balance: 0, remark: x.remark ? `${x.remark}｜已作废：${reason}` : `已作废：${reason}` } : x)),
  )
  return { ok: true, msg: '券已作废' }
}

/* ---------------- 写操作：券消费抵扣（原型模拟） ---------------- */

/**
 * 模拟一笔走券消费：扣减券余额并写 DJQDK 券池流水，
 * 让「创建 → 发放 → 使用 → 记账」在原型内可实机走通（真实计费按模板抵扣顺序执行）。
 */
export function consumeVoucher(
  id: string,
  amount: number,
  opts: { model?: string } = {},
): { ok: boolean; msg: string } {
  const v = vouchersStore.get().find((x) => x.id === id)
  if (!v) return { ok: false, msg: '券不存在' }
  const live = liveVoucherStatus(v)
  if (live === 'void') return { ok: false, msg: '该券已作废' }
  if (live === 'usedUp') return { ok: false, msg: '该券余额已用完' }
  if (live === 'expired') return { ok: false, msg: '该券已过期，无法抵扣' }
  if (live === 'notEffective') return { ok: false, msg: '该券尚未生效，无法抵扣' }
  const deducted = roundAmount(amount, 6)
  if (!(deducted > 0)) return { ok: false, msg: '抵扣金额需大于 0' }
  if (deducted > v.balance) return { ok: false, msg: `抵扣金额不能超过券余额 ${v.balance}` }
  if (v.scope === 'models' && v.scopeModels && v.scopeModels.length > 0) {
    if (!opts.model) return { ok: false, msg: '该券仅限指定模型消费，请选择模型' }
    if (!v.scopeModels.includes(opts.model)) {
      return { ok: false, msg: `${opts.model} 不在该券适用范围（${v.scopeModels.join('、')}）内` }
    }
  }
  const now = nowStamp()
  const relatedBizNo = `XF-${ymdCompact(now)}-${String(Math.floor(Math.random() * 900000) + 100000)}`
  appendVoucherLedgerRow({
    operationType: 'voucher_deduct',
    prefix: 'DJQDK',
    amountBefore: voucherPoolBalance(vouchersStore.get(), v.accountId ?? ''),
    amount: deducted,
    operatedAt: now,
    remark: `代金券抵扣${opts.model ? `（${opts.model}）` : ''}：${v.templateName}`,
    voucherCode: v.code,
    relatedBizNo,
    operatorPhone: v.phone ?? '—',
    operatorAccountId: v.accountId ?? '—',
  })
  const nextBalance = roundAmount(v.balance - deducted, 6)
  vouchersStore.set((prev) =>
    prev.map((x) => (x.id === id ? { ...x, balance: nextBalance, status: nextBalance <= 0 ? ('usedUp' as VoucherStatus) : x.status } : x)),
  )
  return { ok: true, msg: '抵扣成功，已写入券池流水（DJQDK）' }
}

/* ---------------- 写操作：发放任务 ---------------- */

export function createVoucherIssueTask(input: {
  name: string
  templateId: string
  accounts: VoucherIssueAccount[]
  accountScope: VoucherTaskAccountScope
  schedule: VoucherTaskSchedule
  firing: VoucherTaskFiring
  scheduledAt?: string
  periodDeadline?: string
}): { ok: boolean; msg: string } {
  const tpl = voucherTemplateStore.get().find((t) => t.id === input.templateId)
  if (!tpl) return { ok: false, msg: '请选择券模板' }
  /** 需求：所有发券动作均需校验券模板是否启用，模板停用不可创建发放任务 */
  if (tpl.status !== 'enabled') return { ok: false, msg: '卡券已停用，请重新选择' }
  /** 任务名称不可重复 */
  if (voucherTaskStore.get().some((t) => t.name === input.name)) return { ok: false, msg: '任务名称不可重复' }
  if (input.accounts.length === 0) return { ok: false, msg: '请至少选择一个目标账号' }
  const now = nowStamp()
  const periodic = input.schedule !== 'once'
  if (input.firing === 'next_period' && !periodic) return { ok: false, msg: '单次发放不支持下一周期自动发放' }
  if (input.firing === 'scheduled') {
    if (!input.scheduledAt) return { ok: false, msg: '请选择指定发放时间' }
    if (input.scheduledAt <= now) return { ok: false, msg: '发放时间不可早于当前时间' }
  }
  if (periodic && input.periodDeadline && input.periodDeadline <= now) {
    return { ok: false, msg: '发放截止日期需大于当前时间' }
  }
  const base = {
    id: `vit_${uid()}`,
    name: input.name,
    templateId: tpl.id,
    templateName: tpl.name,
    accountScope: input.accountScope,
    targetAccounts: input.accounts.map((a) => a.accountId),
    schedule: input.schedule,
    periodDeadline: periodic ? input.periodDeadline : undefined,
    operator: CURRENT_OPERATOR,
    createdAt: now,
  }
  /** 指定时间发放 / 下一周期自动发放：登记任务但零发放，等时刻到了再执行；按需求，新任务状态统一为「执行中」 */
  if (input.firing !== 'immediate') {
    const unit = taskPeriodUnit(input.schedule) ?? 'month'
    const nextRunAt =
      input.firing === 'scheduled' ? (input.scheduledAt as string) : periodRunStamp(stampToDate(now), unit, 1)
    const task: VoucherIssueTask = {
      ...base,
      firing: input.firing,
      scheduledAt: input.firing === 'scheduled' ? input.scheduledAt : undefined,
      total: 0,
      success: 0,
      fail: 0,
      status: 'running',
      nextRunAt,
    }
    voucherTaskStore.set((prev) => [task, ...prev])
    return { ok: true, msg: '保存成功' }
  }
  /** 立即发放：单次一次发完，周期先发本周期再按周期续发 */
  const result = issueVouchers(tpl.id, input.accounts, { source: 'batch', remark: `发放任务：${input.name}` })
  if (!periodic) {
    const task: VoucherIssueTask = {
      ...base,
      firing: input.firing,
      total: input.accounts.length,
      success: result.issued.length,
      fail: result.skipped.length,
      lastRunIssued: result.issued.length,
      runs: [{ at: now, issued: result.issued.length, skipped: result.skipped.length, trigger: 'auto' }],
      status: 'done',
    }
    voucherTaskStore.set((prev) => [task, ...prev])
    return { ok: true, msg: '保存成功' }
  }
  const rawNext = periodRunStamp(stampToDate(now), taskPeriodUnit(input.schedule) ?? 'month', 1)
  /** 下一周期已超过发放截止日期：本周期发完即收口为已完成，不再排期 */
  const pastDeadline = Boolean(input.periodDeadline) && rawNext > (input.periodDeadline as string)
  const task: VoucherIssueTask = {
    ...base,
    firing: input.firing,
    total: input.accounts.length,
    success: result.issued.length,
    fail: result.skipped.length,
    lastRunIssued: result.issued.length,
    runs: [{ at: now, issued: result.issued.length, skipped: result.skipped.length, trigger: 'auto' }],
    status: pastDeadline ? 'done' : 'running',
    nextRunAt: pastDeadline ? undefined : rawNext,
  }
  voucherTaskStore.set((prev) => [task, ...prev])
  return { ok: true, msg: '保存成功' }
}

/** 执行一次任务（周期任务补跑，或提前执行未到点的执行中任务）；trigger 区分列表手动与到点自动，写入执行记录 */
export function runVoucherIssueTaskNow(
  id: string,
  trigger: 'auto' | 'manual' = 'auto',
): { ok: boolean; msg: string } {
  const task = voucherTaskStore.get().find((t) => t.id === id)
  if (!task) return { ok: false, msg: '任务不存在' }
  if (task.status === 'paused') return { ok: false, msg: '任务已中止，请先恢复' }
  if (task.status === 'done') return { ok: false, msg: '单次任务已执行完毕' }
  const accounts = task.targetAccounts.map(findDemoAccount).filter((a): a is VoucherIssueAccount => Boolean(a))
  const result = issueVouchers(task.templateId, accounts, { source: 'batch', remark: `发放任务执行：${task.name}` })
  const now = nowStamp()
  const unit = taskPeriodUnit(task.schedule)
  voucherTaskStore.set((prev) =>
    prev.map((t) => {
      if (t.id !== id) return t
      const patch = {
        total: t.total + accounts.length,
        success: t.success + result.issued.length,
        fail: t.fail + result.skipped.length,
        lastRunIssued: result.issued.length,
        runs: [...(t.runs ?? []), { at: now, issued: result.issued.length, skipped: result.skipped.length, trigger }],
      }
      if (!unit) {
        /** 单次任务执行一次即终态，清空待执行时刻 */
        return { ...t, ...patch, status: 'done' as VoucherIssueTask['status'], nextRunAt: undefined }
      }
      /** 周期任务继续按周期续发，下次时刻自本次执行所在周期顺延一个周期；顺延后超过发放截止日期则收口为已完成 */
      const next = periodRunStamp(stampToDate(now), unit, 1)
      if (t.periodDeadline && next > t.periodDeadline) {
        return { ...t, ...patch, status: 'done' as VoucherIssueTask['status'], nextRunAt: undefined }
      }
      return { ...t, ...patch, status: 'running' as VoucherIssueTask['status'], nextRunAt: next }
    }),
  )
  return { ok: true, msg: `本次执行：成功 ${result.issued.length}，跳过 ${result.skipped.length}` }
}

/** 到点自动触发：把已过发放时刻、尚未发过券的任务补跑，返回触发条数；已过发放截止日期的直接收口为已完成、不发券 */
export function runDueVoucherIssueTasks(): number {
  const now = nowStamp()
  const due = voucherTaskStore.get().filter(
    (t) => t.status === 'running' && t.total === 0 && Boolean(t.nextRunAt) && (t.nextRunAt as string) <= now,
  )
  let fired = 0
  due.forEach((t) => {
    if (t.periodDeadline && now > t.periodDeadline) {
      voucherTaskStore.set((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, status: 'done' as VoucherIssueTask['status'], nextRunAt: undefined } : x)),
      )
      return
    }
    runVoucherIssueTaskNow(t.id)
    fired += 1
  })
  return fired
}

/**
 * 中止 / 恢复发放任务。中止后任务不再被自动触发；
 * 恢复时先检查发放截止日期——已超过截止日期的直接变为「已完成」，否则按是否已发放过回落到「执行中 / 终态」。
 * 返回变更后的任务状态，供页面按结果提示。
 */
export function setVoucherTaskPaused(id: string, paused: boolean): VoucherIssueTask['status'] | undefined {
  const now = nowStamp()
  let result: VoucherIssueTask['status'] | undefined
  voucherTaskStore.set((prev) =>
    prev.map((t) => {
      if (t.id !== id) return t
      if (paused) {
        result = 'paused'
        return { ...t, status: result }
      }
      /** 恢复前校验截止日期：已超过发放截止日期则不再执行，收口为已完成 */
      if (t.periodDeadline && now > t.periodDeadline) {
        result = 'done'
        return { ...t, status: result, nextRunAt: undefined }
      }
      /** 未发过券的任务统一回「执行中」，单次已发放过的任务回「已完成」终态 */
      const resumed: VoucherIssueTask['status'] =
        t.firing !== 'immediate' && t.total === 0
          ? 'running'
          : t.schedule === 'once'
            ? 'done'
            : 'running'
      result = resumed
      return { ...t, status: resumed }
    }),
  )
  return result
}

/* ==================== 推广合伙人（分销）：store + 种子数据 + 动作 ==================== */

/** 官网域名：推广邀请链接与落地页共用 */
export const PROMO_SITE = 'https://zsdodo.com'
/** 提现门槛（元）：单笔最低可提金额 */
export const PROMO_WITHDRAW_MIN = 100
/** 佣金兑换代金券加兑比例：1 元佣金兑 1.2 元面额券 */
export const PROMO_VOUCHER_RATE = 1.2
/** 兑换所得代金券有效期（天） */
export const PROMO_VOUCHER_VALID_DAYS = 365
/** 见面礼金额（元）：被邀人实名 + 首笔现金消耗后，双方各得一张等额无门槛券 */
export const PROMO_GIFT_AMOUNT = 20

/** v4：邀请/实名/首耗计数与「被邀请人名单 + 分佣明细」对齐（12/8/5、8/5/3） */
const PROMO_PARTNER_STORAGE_KEY = 'zsdd_promo_partners_v4'
const PROMO_REBATE_STORAGE_KEY = 'zsdd_promo_rebate_v3'
const PROMO_COMMISSION_STORAGE_KEY = 'zsdd_promo_commissions_v9'
const PROMO_WITHDRAW_STORAGE_KEY = 'zsdd_promo_withdraws_v4'
const PROMO_EXCHANGE_STORAGE_KEY = 'zsdd_promo_exchanges_v1'
/** v3：名单种子补齐「邀请归属活动 id」（按 id 只补不删的迁移无法回填旧行，故升版让旧缓存失效） */
const PROMO_INVITEE_STORAGE_KEY = 'zsdd_promo_invitees_v3'

const promoRebateSeed: ModelRebateRule[] = [
  {
    id: 'pr_001',
    modelName: 'DODO-OG-G-6-Astra',
    category: 'self',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 20,
    campaign: true,
    boostRate: 40,
    campaignStartAt: '2026-09-01',
    campaignEndAt: '2026-09-30',
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-08-25 14:20:00',
  },
  {
    id: 'pr_002',
    modelName: 'DODO-OG-G-5-6-Sol',
    category: 'self',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 15,
    campaign: false,
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-08-25 14:21:00',
  },
  {
    id: 'pr_003',
    modelName: 'DODO-Vision-4',
    category: 'self',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 18,
    campaign: false,
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-08-25 14:22:00',
  },
  {
    id: 'pr_004',
    modelName: 'DODO-Veo-Fast',
    category: 'self',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 18,
    campaign: true,
    boostRate: 30,
    campaignStartAt: '2026-08-01',
    campaignEndAt: '2026-09-20',
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-09-21 10:00:00',
  },
  {
    id: 'pr_005',
    modelName: 'DeepSeek-V4',
    category: 'third',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 10,
    campaign: false,
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-08-25 14:24:00',
  },
  {
    id: 'pr_006',
    modelName: 'GLM-5.3',
    category: 'third',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 10,
    campaign: false,
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-08-25 14:25:00',
  },
  {
    id: 'pr_007',
    modelName: 'Kimi-K3',
    category: 'third',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 8,
    campaign: false,
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-08-25 14:26:00',
  },
  {
    id: 'pr_008',
    modelName: 'Qwen3.8-Max',
    category: 'third',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 8,
    campaign: false,
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-08-25 14:27:00',
  },
  {
    id: 'pr_009',
    modelName: 'Doubao-Seed-2.0',
    category: 'third',
    multiplierName: '标准倍率',
    modelMultiplier: 1,
    rate: 8,
    campaign: false,
    page: 'official',
    effectiveAt: '2026-08-01',
    status: 'off',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-09-10 09:30:00',
  },
  {
    id: 'pr_010',
    modelName: 'DeepSeek-V4',
    category: 'third',
    multiplierName: '尊享加速倍率',
    modelMultiplier: 2,
    rate: 10,
    campaign: true,
    boostRate: 25,
    campaignStartAt: '2026-09-15',
    campaignEndAt: '2026-10-15',
    page: 'external',
    activityUrl: 'https://partner.example.com/deepseek-v4-boost',
    effectiveAt: '2026-09-15',
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: '2026-09-14 16:40:00',
  },
]

const promoPartnerSeed: PromoPartner[] = [
  {
    id: 'pp_001',
    accountId: CURRENT_CONSOLE_USER.accountId,
    nickname: CURRENT_CONSOLE_USER.nickname,
    phone: CURRENT_CONSOLE_USER.phone,
    inviteCode: 'ZM8K2P7Q',
    inviteUrl: `${PROMO_SITE}/promo?code=ZM8K2P7Q`,
    status: 'active',
    inviteCount: 12,
    verifiedCount: 8,
    firstConsumeCount: 5,
    totalCommission: 1286.4,
    availableCommission: 386.4,
    exchangedCommission: 700,
    withdrawnCommission: 200,
    enrolledAt: '2026-07-12 10:23:41',
  },
  {
    id: 'pp_002',
    accountId: 'ACC20260718LThn4Kd2',
    nickname: '李虎',
    phone: '13922618843',
    inviteCode: 'LH3F9W2X',
    inviteUrl: `${PROMO_SITE}/promo?code=LH3F9W2X`,
    status: 'active',
    inviteCount: 8,
    verifiedCount: 5,
    firstConsumeCount: 3,
    totalCommission: 620.5,
    availableCommission: 180.5,
    exchangedCommission: 240,
    withdrawnCommission: 200,
    enrolledAt: '2026-07-25 16:02:18',
  },
  {
    id: 'pp_003',
    accountId: 'ACC20260802WYs7Pn5c',
    nickname: '刘思远',
    phone: '15801237765',
    inviteCode: 'LY6Q4T8M',
    inviteUrl: `${PROMO_SITE}/promo?code=LY6Q4T8M`,
    status: 'active',
    inviteCount: 5,
    verifiedCount: 3,
    firstConsumeCount: 3,
    totalCommission: 158.2,
    availableCommission: 158.2,
    exchangedCommission: 0,
    withdrawnCommission: 0,
    enrolledAt: '2026-08-06 11:47:53',
  },
  {
    id: 'pp_004',
    accountId: 'ACC20260815CJv2Rk9e',
    nickname: '陈静',
    phone: '13755620931',
    inviteCode: 'CJ2N7B5V',
    inviteUrl: `${PROMO_SITE}/promo?code=CJ2N7B5V`,
    status: 'frozen',
    inviteCount: 23,
    verifiedCount: 4,
    firstConsumeCount: 1,
    totalCommission: 40,
    availableCommission: 40,
    exchangedCommission: 0,
    withdrawnCommission: 0,
    enrolledAt: '2026-08-20 20:15:07',
  },
  {
    id: 'pp_005',
    accountId: 'ACC20260828SYw8Gh3j',
    nickname: '孙悦',
    phone: '18611094527',
    inviteCode: 'SY9D3K6P',
    inviteUrl: `${PROMO_SITE}/promo?code=SY9D3K6P`,
    status: 'active',
    inviteCount: 3,
    verifiedCount: 2,
    firstConsumeCount: 2,
    totalCommission: 96.8,
    availableCommission: 96.8,
    exchangedCommission: 0,
    withdrawnCommission: 0,
    enrolledAt: '2026-09-02 09:36:12',
  },
]

const promoCommissionSeed: CommissionRecord[] = [
  {
    id: 'pc_001',
    partnerId: 'pp_001',
    partnerName: '张明',
    kind: 'gift',
    inviteeName: '王晓军',
    inviteeAccountId: 'ACC20260718WXj3Tq8s',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-07-20 15:12:03',
  },
  {
    id: 'pc_002',
    partnerId: 'pp_001',
    partnerName: '张明',
    kind: 'consume',
    inviteeName: '王晓军',
    inviteeAccountId: 'ACC20260718WXj3Tq8s',
    modelName: 'DeepSeek-V4',
    modelMultiplierName: '标准倍率',
    consumeAmount: 1200,
    rate: 10,
    amount: 120,
    campaignId: 'pc_007',
    at: '2026-08-03 11:26:47',
  },
  {
    id: 'pc_003',
    partnerId: 'pp_001',
    partnerName: '张明',
    kind: 'consume',
    inviteeName: '周涛',
    inviteeAccountId: 'ACC20260805ZT6mKp2d',
    modelName: 'DODO-OG-G-6-Astra',
    modelMultiplierName: '标准倍率',
    consumeAmount: 500,
    rate: 40,
    amount: 200,
    note: '限时推广活动期间计佣：标准 20% × 2',
    campaignId: 'pc_001',
    at: '2026-09-08 20:41:15',
  },
  {
    id: 'pc_004',
    partnerId: 'pp_001',
    partnerName: '张明',
    kind: 'consume',
    inviteeName: '陈婧',
    inviteeAccountId: 'ACC20260812CJ9wLn4h',
    modelName: 'GLM-5.3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 800,
    rate: 10,
    amount: 80,
    campaignId: 'pc_007',
    at: '2026-08-21 09:05:32',
  },
  {
    id: 'pc_005',
    partnerId: 'pp_001',
    partnerName: '张明',
    kind: 'consume',
    inviteeName: '吴桐',
    inviteeAccountId: 'ACC20260904WT2xRv7k',
    modelName: 'Kimi-K3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 350,
    rate: 8,
    amount: 28,
    campaignId: 'pc_007',
    at: '2026-09-12 17:38:56',
  },
  {
    id: 'pc_007',
    partnerId: 'pp_001',
    partnerName: '张明',
    kind: 'consume',
    inviteeName: '郑好',
    inviteeAccountId: 'ACC20260918ZH5yBc3m',
    modelName: 'Qwen3.8-Max',
    modelMultiplierName: '标准倍率',
    consumeAmount: 200,
    rate: 8,
    amount: 16,
    campaignId: 'pc_007',
    at: '2026-09-26 14:55:09',
  },
  {
    id: 'pc_008',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'gift',
    inviteeName: '高翔',
    inviteeAccountId: 'ACC20260729GX8dFp6t',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-08-02 13:44:29',
  },
  {
    id: 'pc_009',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'consume',
    inviteeName: '高翔',
    inviteeAccountId: 'ACC20260729GX8dFp6t',
    modelName: 'DODO-OG-G-5-6-Sol',
    modelMultiplierName: '标准倍率',
    consumeAmount: 900,
    rate: 15,
    amount: 135,
    campaignId: 'pc_007',
    at: '2026-08-25 19:20:41',
  },
  {
    id: 'pc_010',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'consume',
    inviteeName: '赵倩',
    inviteeAccountId: 'ACC20260901ZQ4hNs9r',
    modelName: 'DODO-Vision-4',
    modelMultiplierName: '标准倍率',
    consumeAmount: 420,
    rate: 18,
    amount: 75.6,
    campaignId: 'pc_007',
    at: '2026-09-10 16:08:23',
  },
  {
    id: 'pc_012',
    partnerId: 'pp_004',
    partnerName: '陈静',
    kind: 'gift',
    inviteeName: '徐磊',
    inviteeAccountId: 'ACC20260820XL7kQw2v',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-08-28 19:24:52',
  },
  {
    id: 'pc_013',
    partnerId: 'pp_004',
    partnerName: '陈静',
    kind: 'consume',
    inviteeName: '徐磊',
    inviteeAccountId: 'ACC20260820XL7kQw2v',
    modelName: 'Kimi-K3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 250,
    rate: 8,
    amount: 20,
    campaignId: 'pc_007',
    at: '2026-09-02 08:49:16',
  },
  {
    id: 'pc_014',
    partnerId: 'pp_005',
    partnerName: '孙悦',
    kind: 'gift',
    inviteeName: '马骏',
    inviteeAccountId: 'ACC20260902MJ3pVt8x',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-09-06 10:22:35',
  },
  {
    id: 'pc_015',
    partnerId: 'pp_005',
    partnerName: '孙悦',
    kind: 'consume',
    inviteeName: '马骏',
    inviteeAccountId: 'ACC20260902MJ3pVt8x',
    modelName: 'DeepSeek-V4',
    modelMultiplierName: '尊享加速倍率',
    consumeAmount: 768,
    rate: 10,
    amount: 76.8,
    campaignId: 'pc_002',
    at: '2026-09-15 21:07:48',
  },
  {
    id: 'pc_016',
    partnerId: 'pp_005',
    partnerName: '孙悦',
    kind: 'consume',
    inviteeName: '冯雪',
    inviteeAccountId: 'ACC20260917FX6rHy5w',
    modelName: 'Qwen3.8-Max',
    modelMultiplierName: '标准倍率',
    consumeAmount: 105,
    rate: 8,
    amount: 8.4,
    campaignId: 'pc_007',
    at: '2026-09-24 15:41:07',
  },
  {
    id: 'pc_017',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'consume',
    inviteeName: '高翔',
    inviteeAccountId: 'ACC20260729GX8dFp6t',
    modelName: 'DeepSeek-V4',
    modelMultiplierName: '标准倍率',
    consumeAmount: 1500,
    rate: 10,
    amount: 150,
    campaignId: 'pc_007',
    at: '2026-08-11 10:23:08',
  },
  {
    id: 'pc_018',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'consume',
    inviteeName: '林晓东',
    inviteeAccountId: 'ACC20260810Lxd2Km7q',
    modelName: 'GLM-5.3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 1200,
    rate: 10,
    amount: 120,
    campaignId: 'pc_007',
    at: '2026-08-30 14:07:52',
  },
  {
    id: 'pc_019',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'consume',
    inviteeName: '高翔',
    inviteeAccountId: 'ACC20260729GX8dFp6t',
    modelName: 'DODO-OG-G-6-Astra',
    modelMultiplierName: '标准倍率',
    consumeAmount: 260,
    rate: 40,
    amount: 104,
    note: '限时推广活动期间计佣：标准 20% × 2',
    campaignId: 'pc_001',
    at: '2026-09-09 21:16:33',
  },
  {
    id: 'pc_020',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'consume',
    inviteeName: '王裕民',
    inviteeAccountId: 'ACC20260908Wym5Tc3e',
    modelName: 'Qwen3.8-Max',
    modelMultiplierName: '标准倍率',
    consumeAmount: 960,
    rate: 8,
    amount: 76.8,
    campaignId: 'pc_007',
    at: '2026-09-17 11:42:26',
  },
  {
    id: 'pc_021',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'consume',
    inviteeName: '林晓东',
    inviteeAccountId: 'ACC20260810Lxd2Km7q',
    modelName: 'GLM-5.3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 147,
    rate: 10,
    amount: 14.7,
    campaignId: 'pc_003',
    at: '2026-09-27 19:54:03',
  },
  {
    id: 'pc_022',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'consume',
    inviteeName: '周逸群',
    inviteeAccountId: 'ACC20260905Zyq7Hn2f',
    modelName: 'DODO-OG-G-6-Astra',
    modelMultiplierName: '标准倍率',
    consumeAmount: 100,
    rate: 40,
    amount: 40,
    note: '限时推广活动期间计佣：标准 20% × 2',
    campaignId: 'pc_001',
    at: '2026-09-12 20:05:44',
  },
  {
    id: 'pc_023',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'consume',
    inviteeName: '赵倩',
    inviteeAccountId: 'ACC20260901ZQ4hNs9r',
    modelName: 'Kimi-K3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 75,
    rate: 8,
    amount: 6,
    campaignId: 'pc_007',
    at: '2026-09-16 09:31:12',
  },
  {
    id: 'pc_024',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'consume',
    inviteeName: '钱峰',
    inviteeAccountId: 'ACC20260910Qf4Rw8jd',
    modelName: 'DeepSeek-V4',
    modelMultiplierName: '标准倍率',
    consumeAmount: 200,
    rate: 10,
    amount: 20,
    campaignId: 'pc_003',
    at: '2026-09-21 15:26:39',
  },
  {
    id: 'pc_025',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'consume',
    inviteeName: '赵倩',
    inviteeAccountId: 'ACC20260901ZQ4hNs9r',
    modelName: 'GLM-5.3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 166,
    rate: 10,
    amount: 16.6,
    campaignId: 'pc_003',
    at: '2026-09-29 22:13:57',
  },
  {
    id: 'pc_027',
    partnerId: 'pp_005',
    partnerName: '孙悦',
    kind: 'consume',
    inviteeName: '马骏',
    inviteeAccountId: 'ACC20260902MJ3pVt8x',
    modelName: 'DODO-OG-G-6-Astra',
    modelMultiplierName: '标准倍率',
    consumeAmount: 15,
    rate: 40,
    amount: 6,
    note: '限时推广活动期间计佣：标准 20% × 2',
    campaignId: 'pc_001',
    at: '2026-09-19 12:08:45',
  },
  {
    id: 'pc_028',
    partnerId: 'pp_005',
    partnerName: '孙悦',
    kind: 'consume',
    inviteeName: '冯雪',
    inviteeAccountId: 'ACC20260917FX6rHy5w',
    modelName: 'GLM-5.3',
    modelMultiplierName: '标准倍率',
    consumeAmount: 35,
    rate: 10,
    amount: 3.5,
    campaignId: 'pc_003',
    at: '2026-09-28 17:35:21',
  },
  {
    id: 'pc_029',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'gift',
    inviteeName: '林晓东',
    inviteeAccountId: 'ACC20260810Lxd2Km7q',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-08-18 09:47:15',
  },
  {
    id: 'pc_030',
    partnerId: 'pp_002',
    partnerName: '李虎',
    kind: 'gift',
    inviteeName: '王裕民',
    inviteeAccountId: 'ACC20260908Wym5Tc3e',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-09-14 10:26:48',
  },
  {
    id: 'pc_031',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'gift',
    inviteeName: '赵倩',
    inviteeAccountId: 'ACC20260901ZQ4hNs9r',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-09-08 11:32:07',
  },
  {
    id: 'pc_032',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'gift',
    inviteeName: '周逸群',
    inviteeAccountId: 'ACC20260905Zyq7Hn2f',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-09-12 19:58:36',
  },
  {
    id: 'pc_033',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    kind: 'gift',
    inviteeName: '钱峰',
    inviteeAccountId: 'ACC20260910Qf4Rw8jd',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-09-18 14:05:52',
  },
  {
    id: 'pc_034',
    partnerId: 'pp_005',
    partnerName: '孙悦',
    kind: 'gift',
    inviteeName: '冯雪',
    inviteeAccountId: 'ACC20260917FX6rHy5w',
    amount: 20,
    note: '被邀人完成实名认证并产生首笔现金消耗，双方各得 20 元无门槛券',
    at: '2026-09-22 09:53:26',
  }
]

/** 被邀请人名单：合伙人「分销数据」的邀请漏斗明细，是否产生消费由分佣明细派生；campaignId 为该次邀请归属的分销活动 */
const promoInviteeSeed: PromoInvitee[] = [
  { id: 'pi_001', partnerId: 'pp_001', nickname: '王晓军', phone: '13920013771', accountId: 'ACC20260718WXj3Tq8s', registeredAt: '2026-07-18 15:13:29' },
  { id: 'pi_002', partnerId: 'pp_001', nickname: '陆一鸣', phone: '13520027542', accountId: 'ACC20260718jHj64cx4', registeredAt: '2026-07-18 09:26:58' },
  { id: 'pi_003', partnerId: 'pp_001', nickname: '范晓东', phone: '13620041313', accountId: 'ACC20260729ThTECM7C', registeredAt: '2026-07-29 16:39:27' },
  { id: 'pi_004', partnerId: 'pp_001', nickname: '周涛', phone: '13720055084', accountId: 'ACC20260805ZT6mKp2d', registeredAt: '2026-08-05 10:52:56' },
  { id: 'pi_005', partnerId: 'pp_001', nickname: '柯振宇', phone: '15020068855', accountId: 'ACC202608093s3PMVfM', registeredAt: '2026-08-09 17:05:25' },
  { id: 'pi_006', partnerId: 'pp_001', nickname: '陈婧', phone: '15120082626', accountId: 'ACC20260812CJ9wLn4h', registeredAt: '2026-08-12 11:18:54' },
  { id: 'pi_007', partnerId: 'pp_001', nickname: '沈亦然', phone: '15820096397', accountId: 'ACC20260817bAbXV5qV', registeredAt: '2026-08-17 18:31:23' },
  { id: 'pi_008', partnerId: 'pp_001', nickname: '袁小满', phone: '15920110168', accountId: 'ACC20260827KaKxvDYv', registeredAt: '2026-08-27 12:44:52', campaignId: 'pc_004' },
  { id: 'pi_009', partnerId: 'pp_001', nickname: '吴桐', phone: '18620123939', accountId: 'ACC20260904WT2xRv7k', registeredAt: '2026-09-04 19:57:21', campaignId: 'pc_001' },
  { id: 'pi_010', partnerId: 'pp_001', nickname: '邓佳宁', phone: '18820137710', accountId: 'ACC20260907UjUFDN8D', registeredAt: '2026-09-07 13:10:50', campaignId: 'pc_001' },
  { id: 'pi_011', partnerId: 'pp_001', nickname: '崔浩然', phone: '13320151481', accountId: 'ACC20260915uTufdnGd', registeredAt: '2026-09-15 20:23:19', campaignId: 'pc_002' },
  { id: 'pi_012', partnerId: 'pp_001', nickname: '郑好', phone: '13020165252', accountId: 'ACC20260918ZH5yBc3m', registeredAt: '2026-09-18 14:36:48', campaignId: 'pc_002' },
  { id: 'pi_013', partnerId: 'pp_002', nickname: '高翔', phone: '13120179023', accountId: 'ACC20260729GX8dFp6t', registeredAt: '2026-07-29 08:49:17' },
  { id: 'pi_014', partnerId: 'pp_002', nickname: '潘越', phone: '15220192794', accountId: 'ACC20260801cBcYW6rW', registeredAt: '2026-08-01 15:02:46' },
  { id: 'pi_015', partnerId: 'pp_002', nickname: '林晓东', phone: '13820206565', accountId: 'ACC20260810Lxd2Km7q', registeredAt: '2026-08-10 09:15:15', campaignId: 'pc_003' },
  { id: 'pi_016', partnerId: 'pp_002', nickname: '汪思聪', phone: '13920220336', accountId: 'ACC20260812mKm86ez6', registeredAt: '2026-08-12 16:28:44' },
  { id: 'pi_017', partnerId: 'pp_002', nickname: '龚子墨', phone: '13520234107', accountId: 'ACC20260824VkVGEP9E', registeredAt: '2026-08-24 10:41:13' },
  { id: 'pi_018', partnerId: 'pp_002', nickname: '白宇辰', phone: '13620247878', accountId: 'ACC20260901vUvgepHe', registeredAt: '2026-09-01 17:54:42', campaignId: 'pc_001' },
  { id: 'pi_019', partnerId: 'pp_002', nickname: '王裕民', phone: '13720261649', accountId: 'ACC20260908Wym5Tc3e', registeredAt: '2026-09-08 11:07:11', campaignId: 'pc_001' },
  { id: 'pi_020', partnerId: 'pp_002', nickname: '秦朗', phone: '15020275420', accountId: 'ACC20260913D4DrpxSp', registeredAt: '2026-09-13 18:20:40' },
  { id: 'pi_021', partnerId: 'pp_003', nickname: '尹佳怡', phone: '15120289191', accountId: 'ACC20260816dCdZX7sX', registeredAt: '2026-08-16 12:33:09' },
  { id: 'pi_022', partnerId: 'pp_003', nickname: '赵倩', phone: '15820302962', accountId: 'ACC20260901ZQ4hNs9r', registeredAt: '2026-09-01 19:46:38', campaignId: 'pc_003' },
  { id: 'pi_023', partnerId: 'pp_003', nickname: '易承轩', phone: '15920316733', accountId: 'ACC20260904nMn97fA7', registeredAt: '2026-09-04 13:59:07', campaignId: 'pc_001' },
  { id: 'pi_024', partnerId: 'pp_003', nickname: '周逸群', phone: '18620330504', accountId: 'ACC20260905Zyq7Hn2f', registeredAt: '2026-09-05 20:12:36', campaignId: 'pc_001' },
  { id: 'pi_025', partnerId: 'pp_003', nickname: '钱峰', phone: '18820344275', accountId: 'ACC20260910Qf4Rw8jd', registeredAt: '2026-09-10 14:25:05', campaignId: 'pc_003' },
  { id: 'pi_026', partnerId: 'pp_004', nickname: '徐磊', phone: '13320358046', accountId: 'ACC20260820XL7kQw2v', registeredAt: '2026-08-20 08:38:34' },
  { id: 'pi_027', partnerId: 'pp_004', nickname: '常若溪', phone: '13020371817', accountId: 'ACC20260821E5EsqyTq', registeredAt: '2026-08-21 15:51:03' },
  { id: 'pi_028', partnerId: 'pp_004', nickname: '武天翊', phone: '13120385588', accountId: 'ACC20260824eDe2Y8tY', registeredAt: '2026-08-24 09:04:32' },
  { id: 'pi_029', partnerId: 'pp_004', nickname: '瞿颖', phone: '15220399359', accountId: 'ACC20260826PdPAyG3y', registeredAt: '2026-08-26 16:17:01' },
  { id: 'pi_030', partnerId: 'pp_004', nickname: '夏梓涵', phone: '13820413130', accountId: 'ACC20260827pNpa8gB8', registeredAt: '2026-08-27 10:30:30' },
  { id: 'pi_031', partnerId: 'pp_004', nickname: '鲍启航', phone: '13920426901', accountId: 'ACC20260829XnXJGRbG', registeredAt: '2026-08-29 17:43:59', campaignId: 'pc_004' },
  { id: 'pi_032', partnerId: 'pp_004', nickname: '樊书豪', phone: '13520440672', accountId: 'ACC20260901xWxjgrKg', registeredAt: '2026-09-01 11:56:28', campaignId: 'pc_001' },
  { id: 'pi_033', partnerId: 'pp_004', nickname: '茉莉', phone: '13620454443', accountId: 'ACC202609017w7TRZkR', registeredAt: '2026-09-01 18:09:57' },
  { id: 'pi_034', partnerId: 'pp_004', nickname: '盛晓月', phone: '13720468214', accountId: 'ACC20260903F6FtrzUr', registeredAt: '2026-09-03 12:22:26' },
  { id: 'pi_035', partnerId: 'pp_004', nickname: '米晓东', phone: '15020481985', accountId: 'ACC20260906fEf3Z9uZ', registeredAt: '2026-09-06 19:35:55', campaignId: 'pc_001' },
  { id: 'pi_036', partnerId: 'pp_004', nickname: '屈嘉树', phone: '15120495756', accountId: 'ACC20260906QeQBzH4z', registeredAt: '2026-09-06 13:48:24' },
  { id: 'pi_037', partnerId: 'pp_004', nickname: '游承志', phone: '15820509527', accountId: 'ACC20260908qPqb9hC9', registeredAt: '2026-09-08 20:01:53' },
  { id: 'pi_038', partnerId: 'pp_004', nickname: '来牧之', phone: '15920523298', accountId: 'ACC20260911YpYKHScH', registeredAt: '2026-09-11 14:14:22' },
  { id: 'pi_039', partnerId: 'pp_004', nickname: '时宁', phone: '18620537069', accountId: 'ACC20260911yXykhsMh', registeredAt: '2026-09-11 08:27:51', campaignId: 'pc_004' },
  { id: 'pi_040', partnerId: 'pp_004', nickname: '慕青', phone: '18820550840', accountId: 'ACC202609138x8US2mS', registeredAt: '2026-09-13 15:40:20' },
  { id: 'pi_041', partnerId: 'pp_004', nickname: '纪修远', phone: '13320564611', accountId: 'ACC20260916G7GusAVs', registeredAt: '2026-09-16 09:53:49' },
  { id: 'pi_042', partnerId: 'pp_004', nickname: '舒明轩', phone: '13020578382', accountId: 'ACC20260916gFg42av2', registeredAt: '2026-09-16 16:06:18' },
  { id: 'pi_043', partnerId: 'pp_004', nickname: '路遥', phone: '13120592153', accountId: 'ACC20260918RfRCAJ5A', registeredAt: '2026-09-18 10:19:47' },
  { id: 'pi_044', partnerId: 'pp_004', nickname: '郜锦程', phone: '15220605924', accountId: 'ACC20260921rQrcajDa', registeredAt: '2026-09-21 17:32:16' },
  { id: 'pi_045', partnerId: 'pp_004', nickname: '郗云帆', phone: '13820619695', accountId: 'ACC20260921ZqZMJTdJ', registeredAt: '2026-09-21 11:45:45' },
  { id: 'pi_046', partnerId: 'pp_004', nickname: '仝振国', phone: '13920633466', accountId: 'ACC20260924zYzmjtNj', registeredAt: '2026-09-24 18:58:14' },
  { id: 'pi_047', partnerId: 'pp_004', nickname: '訾明辉', phone: '13520647237', accountId: 'ACC202609269y9VT3nT', registeredAt: '2026-09-26 12:11:43' },
  { id: 'pi_048', partnerId: 'pp_004', nickname: '宿雨桐', phone: '13620661008', accountId: 'ACC20260926H8HvtBWt', registeredAt: '2026-09-26 19:24:12' },
  { id: 'pi_049', partnerId: 'pp_005', nickname: '马骏', phone: '13720674779', accountId: 'ACC20260902MJ3pVt8x', registeredAt: '2026-09-02 13:37:41', campaignId: 'pc_001' },
  { id: 'pi_050', partnerId: 'pp_005', nickname: '房思远', phone: '15020688550', accountId: 'ACC20260909SgSDBK6B', registeredAt: '2026-09-09 20:50:10' },
  { id: 'pi_051', partnerId: 'pp_005', nickname: '冯雪', phone: '15120702321', accountId: 'ACC20260917FX6rHy5w', registeredAt: '2026-09-17 14:03:39', campaignId: 'pc_003' }
]

const promoWithdrawSeed: WithdrawRequest[] = [
  {
    id: 'pw_001',
    partnerId: 'pp_001',
    partnerName: '张明',
    accountName: '张明',
    accountNo: '6222021234567890123',
    bankName: '中国工商银行',
    amount: 300,
    tax: 24,
    period: '2026-09',
    status: 'pending',
    appliedAt: '2026-09-25 18:31:22',
  },
  {
    id: 'pw_002',
    partnerId: 'pp_002',
    partnerName: '李虎',
    accountName: '李虎',
    accountNo: '6217001234567891234',
    bankName: '中国建设银行',
    amount: 200,
    tax: 16,
    period: '2026-08',
    status: 'approved',
    appliedAt: '2026-08-27 10:12:05',
    reviewedAt: '2026-08-31 15:00:00',
    reviewer: CURRENT_OPERATOR,
  },
  {
    id: 'pw_003',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    accountName: '刘思远',
    accountNo: '6228481234567892345',
    bankName: '中国农业银行',
    amount: 150,
    tax: 12,
    period: '2026-09',
    status: 'rejected',
    appliedAt: '2026-09-20 09:47:56',
    reviewedAt: '2026-09-23 11:20:00',
    reviewer: CURRENT_OPERATOR,
    rejectReason: '收款人姓名与账户实名认证信息不一致，请修改后重新提交',
  },
  {
    id: 'pw_005',
    partnerId: 'pp_001',
    partnerName: '张明',
    accountName: '张明',
    accountNo: '6222021234567890123',
    bankName: '中国工商银行',
    amount: 150,
    tax: 12,
    period: '2026-08',
    status: 'rejected',
    appliedAt: '2026-08-15 10:26:48',
    reviewedAt: '2026-08-18 09:40:00',
    reviewer: CURRENT_OPERATOR,
    rejectReason: '收款银行账号有误，已退回可用佣金，请核对后重新提交',
  },
  {
    id: 'pw_004',
    partnerId: 'pp_001',
    partnerName: '张明',
    accountName: '张明',
    accountNo: '6222021234567890123',
    bankName: '中国工商银行',
    amount: 200,
    tax: 16,
    period: '2026-08',
    status: 'approved',
    appliedAt: '2026-08-26 20:05:31',
    reviewedAt: '2026-08-31 15:02:00',
    reviewer: CURRENT_OPERATOR,
  },
  {
    id: 'pw_006',
    partnerId: 'pp_002',
    partnerName: '李虎',
    accountName: '李虎',
    accountNo: '6217001234567891234',
    bankName: '中国建设银行',
    amount: 160,
    tax: 12.8,
    period: '2026-10',
    status: 'pending',
    appliedAt: '2026-10-03 09:12:40',
  },
  {
    id: 'pw_007',
    partnerId: 'pp_003',
    partnerName: '刘思远',
    accountName: '刘思远',
    accountNo: '6228481234567892345',
    bankName: '中国农业银行',
    amount: 120,
    tax: 9.6,
    period: '2026-10',
    status: 'pending',
    appliedAt: '2026-10-02 17:45:08',
  },
]

/** 兑券记录种子：兑换即时到账，佣金合计与合伙人 exchangedCommission 严格对齐 */
const promoExchangeSeed: ExchangeRecord[] = [
  {
    id: 'pe_001',
    partnerId: 'pp_001',
    partnerName: '张明',
    commission: 300,
    rate: PROMO_VOUCHER_RATE,
    faceValue: 360,
    status: 'issued',
    voucherCode: 'DQ-202608-000081',
    at: '2026-08-18 14:26:35',
    expireAt: '2026-11-16 14:26:35',
  },
  {
    id: 'pe_002',
    partnerId: 'pp_001',
    partnerName: '张明',
    commission: 400,
    rate: PROMO_VOUCHER_RATE,
    faceValue: 480,
    status: 'issued',
    voucherCode: 'DQ-202609-000093',
    at: '2026-09-16 11:08:52',
    expireAt: '2026-12-15 11:08:52',
  },
  {
    id: 'pe_003',
    partnerId: 'pp_002',
    partnerName: '李虎',
    commission: 240,
    rate: PROMO_VOUCHER_RATE,
    faceValue: 288,
    status: 'issued',
    voucherCode: 'DQ-202608-000078',
    at: '2026-08-08 16:42:19',
    expireAt: '2026-11-06 16:42:19',
  },
]

/**
 * 提现记录历史键：v2 新增演示账号张明的「已驳回」样例（pw_005），v3 起统一为自愈迁移，
 * v4 为提现申请新增「开户行」字段；
 * 浏览器可能在种子更新前就用旧数据初始化过存储，导致新增的演示记录永远补不进去，
 * 因此不按版本号重置，而是按 id「只补不删」回捞缺失的种子行，用户自建的提现申请原样保留。
 */
const LEGACY_PROMO_WITHDRAW_KEYS = ['zsdd_promo_withdraws_v3', 'zsdd_promo_withdraws_v2', 'zsdd_promo_withdraws_v1']

function migratePromoWithdrawData() {
  const backfillMissingSeeds = (rows: Record<string, unknown>[]) => {
    const existingIds = new Set(rows.map((r) => String(r.id)))
    const missing = promoWithdrawSeed.filter((seedRow) => !existingIds.has(seedRow.id))
    /** 旧版本存量行没有开户行，按 id 回填种子演示值，用户自建行保持原样 */
    const bankNameById = new Map(promoWithdrawSeed.map((seedRow) => [seedRow.id, seedRow.bankName]))
    return rows.map((r) =>
      r.bankName || !bankNameById.has(String(r.id)) ? r : { ...r, bankName: bankNameById.get(String(r.id)) },
    ).concat(missing as unknown as Record<string, unknown>[])
  }

  const current = readStoredRows(PROMO_WITHDRAW_STORAGE_KEY)
  if (current) {
    const merged = backfillMissingSeeds(current)
    if (merged.length !== current.length) {
      localStorage.setItem(PROMO_WITHDRAW_STORAGE_KEY, JSON.stringify(merged))
    }
    return
  }

  for (const legacyKey of LEGACY_PROMO_WITHDRAW_KEYS) {
    const legacy = readStoredRows(legacyKey)
    if (!legacy) continue
    localStorage.setItem(PROMO_WITHDRAW_STORAGE_KEY, JSON.stringify(backfillMissingSeeds(legacy)))
    break
  }
}

migratePromoWithdrawData()

/**
 * 被邀请人名单是新增数据源：浏览器可能在种子更新前就初始化过存储，
 * 因此同样按 id「只补不删」回捞缺失的种子行，用户在推广落地页自助绑定的记录原样保留。
 */
function migratePromoInviteeData() {
  const current = readStoredRows(PROMO_INVITEE_STORAGE_KEY)
  if (!current) return
  const existingIds = new Set(current.map((r) => String(r.id)))
  const missing = promoInviteeSeed.filter((seedRow) => !existingIds.has(seedRow.id))
  if (missing.length > 0) {
    localStorage.setItem(PROMO_INVITEE_STORAGE_KEY, JSON.stringify([...current, ...missing]))
  }
}

migratePromoInviteeData()

const promoPartnerStore = makeVoucherStore<PromoPartner>(PROMO_PARTNER_STORAGE_KEY, promoPartnerSeed)
const promoRebateStore = makeVoucherStore<ModelRebateRule>(PROMO_REBATE_STORAGE_KEY, promoRebateSeed)
const promoCommissionStore = makeVoucherStore<CommissionRecord>(PROMO_COMMISSION_STORAGE_KEY, promoCommissionSeed)
const promoWithdrawStore = makeVoucherStore<WithdrawRequest>(PROMO_WITHDRAW_STORAGE_KEY, promoWithdrawSeed)
const promoExchangeStore = makeVoucherStore<ExchangeRecord>(PROMO_EXCHANGE_STORAGE_KEY, promoExchangeSeed)
const promoInviteeStore = makeVoucherStore<PromoInvitee>(PROMO_INVITEE_STORAGE_KEY, promoInviteeSeed)

export function usePromoPartners(): PromoPartner[] {
  return useSyncExternalStore(promoPartnerStore.subscribe, promoPartnerStore.get)
}

export function usePromoRebateRules(): ModelRebateRule[] {
  return useSyncExternalStore(promoRebateStore.subscribe, promoRebateStore.get)
}

export function usePromoCommissions(): CommissionRecord[] {
  return useSyncExternalStore(promoCommissionStore.subscribe, promoCommissionStore.get)
}

export function usePromoWithdraws(): WithdrawRequest[] {
  return useSyncExternalStore(promoWithdrawStore.subscribe, promoWithdrawStore.get)
}

export function usePromoExchanges(): ExchangeRecord[] {
  return useSyncExternalStore(promoExchangeStore.subscribe, promoExchangeStore.get)
}

export function usePromoInvitees(): PromoInvitee[] {
  return useSyncExternalStore(promoInviteeStore.subscribe, promoInviteeStore.get)
}

/** 限时推广活动是否处于活动期（按日期比较，活动结束日当天 23:59:59 前仍算活动期） */
export function isPromoCampaignActive(rule: ModelRebateRule): boolean {
  if (!rule.campaign || !rule.campaignStartAt || !rule.campaignEndAt) return false
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  return rule.campaignStartAt <= todayStr && todayStr <= rule.campaignEndAt
}

/** 当前实际计佣比例：活动期内取加倍返佣比例，未配置加倍比例时兜底为标准比例 */
export function promoEffectiveRate(rule: ModelRebateRule): number {
  return isPromoCampaignActive(rule) ? rule.boostRate ?? rule.rate : rule.rate
}

/** 生成新邀请码：大写字母 + 数字混合，剔除易混淆的 I/O/0/1 */
const genInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i += 1) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/**
 * 推广合伙人建档（静默）：同一账户重复建档时直接返回已有记录；
 * 新记录带专属邀请码与邀请链接，佣金余额全部从 0 开始。
 */
export function enrollPromoPartner(user: GroupOwner): { ok: boolean; msg: string; partner?: PromoPartner } {
  const existing = promoPartnerStore.get().find((p) => p.accountId === user.accountId)
  if (existing) return { ok: true, msg: '您已是推广合伙人', partner: existing }
  const code = genInviteCode()
  const partner: PromoPartner = {
    id: `pp_${uid()}`,
    accountId: user.accountId,
    nickname: user.nickname,
    phone: user.phone,
    inviteCode: code,
    inviteUrl: `${PROMO_SITE}/promo?code=${code}`,
    status: 'active',
    inviteCount: 0,
    verifiedCount: 0,
    firstConsumeCount: 0,
    totalCommission: 0,
    availableCommission: 0,
    exchangedCommission: 0,
    withdrawnCommission: 0,
    enrolledAt: nowStamp(),
  }
  promoPartnerStore.set((prev) => [partner, ...prev])
  return { ok: true, msg: '专属推广链接已生成', partner }
}

/**
 * 活动分享链接：指向与当前站点同源的通用活动落地页（?share=<活动id>）。
 * 后台分享时不带邀请码；带 inviteCode 时为分销商专属链接，客户经此链接注册可按活动 + 邀请人归因计佣。
 */
export function buildCampaignInviteUrl(campaignId: string, inviteCode?: string): string {
  const qs = `share=${campaignId}${inviteCode ? `&code=${inviteCode}` : ''}`
  try {
    const { origin, pathname } = window.location
    return `${origin}${pathname}?${qs}`
  } catch {
    return `?${qs}`
  }
}

/** 落地页登录态：分销商领取专属链接后，把身份持久化在本地，下次打开直接可见（原型用 localStorage 模拟登录） */
const PROMO_SESSION_KEY = 'zsdd_promo_session_v1'
export interface PromoSession {
  phone: string
  partnerId: string
}

export function getPromoSession(): PromoSession | null {
  try {
    const raw = localStorage.getItem(PROMO_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PromoSession
    return parsed && parsed.phone && parsed.partnerId ? parsed : null
  } catch {
    return null
  }
}

export function clearPromoSession(): void {
  try {
    localStorage.removeItem(PROMO_SESSION_KEY)
  } catch {
    /** 忽略隐私模式下的存储异常 */
  }
}

/**
 * 分销商以手机号领取专属推广链接：命中已有合伙人档案则复用其邀请码，否则新建并生成邀请码，
 * 领取成功后写入本地登录态。落地页据此展示「属于当前登录人」的专属码，不同分销商互不串号。
 */
export function claimPromoPartnerByPhone(phone: string): { ok: boolean; msg: string; partner?: PromoPartner } {
  const clean = phone.trim()
  if (!/^1\d{10}$/.test(clean)) return { ok: false, msg: '请输入正确的手机号' }
  const existing = promoPartnerStore.get().find((p) => p.phone === clean)
  if (existing) {
    try {
      localStorage.setItem(PROMO_SESSION_KEY, JSON.stringify({ phone: clean, partnerId: existing.id }))
    } catch {
      /** 忽略隐私模式下的存储异常 */
    }
    return { ok: true, msg: '欢迎回来，已为你找回专属链接', partner: existing }
  }
  const code = genInviteCode()
  const partner: PromoPartner = {
    id: `pp_${uid()}`,
    accountId: `ACC${clean}`,
    nickname: `分销商${clean.slice(-4)}`,
    phone: clean,
    inviteCode: code,
    inviteUrl: `${PROMO_SITE}/promo?code=${code}`,
    status: 'active',
    inviteCount: 0,
    verifiedCount: 0,
    firstConsumeCount: 0,
    totalCommission: 0,
    availableCommission: 0,
    exchangedCommission: 0,
    withdrawnCommission: 0,
    enrolledAt: nowStamp(),
  }
  promoPartnerStore.set((prev) => [partner, ...prev])
  try {
    localStorage.setItem(PROMO_SESSION_KEY, JSON.stringify({ phone: clean, partnerId: partner.id }))
  } catch {
    /** 忽略隐私模式下的存储异常 */
  }
  return { ok: true, msg: '专属推广链接已生成', partner }
}

/** 后台冻结 / 解冻合伙人 */
export function setPromoPartnerStatus(id: string, status: PromoPartnerStatus): void {
  promoPartnerStore.set((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
}

/**
 * 邀请关系绑定：最终用户通过带邀请码的专属链接（?share=<活动id>&code=<邀请码>）注册登录后，
 * 与该分销员建立绑定关系。同一手机号只绑定一次（先到先得），首次绑定使分销员邀请人数 +1。
 */
const PROMO_INVITEE_BINDING_KEY = 'zsdd_promo_invitee_bindings_v1'

export interface InviteeBinding {
  /** 被邀请用户手机号 */
  phone: string
  /** 绑定的分销员邀请码 */
  inviteCode: string
  /** 绑定的分销员 id */
  partnerId: string
  /** 绑定来源活动 id */
  campaignId: string
  boundAt: string
}

function readInviteeBindings(): InviteeBinding[] {
  try {
    const raw = localStorage.getItem(PROMO_INVITEE_BINDING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InviteeBinding[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getInviteeBindingByPhone(phone: string): InviteeBinding | null {
  return readInviteeBindings().find((b) => b.phone === phone) ?? null
}

export function saveInviteeBinding(
  inviteCode: string,
  phone: string,
  campaignId: string,
): { ok: boolean; msg: string; partner?: PromoPartner } {
  const clean = phone.trim()
  if (!/^1\d{10}$/.test(clean)) return { ok: false, msg: '请输入正确的手机号' }
  const partner = promoPartnerStore.get().find((p) => p.inviteCode === inviteCode.trim().toUpperCase())
  if (!partner) return { ok: false, msg: '邀请码无效，请通过有效的推广链接进入' }
  const bindings = readInviteeBindings()
  const self = bindings.find((b) => b.phone === clean)
  if (self) {
    if (self.partnerId === partner.id) return { ok: true, msg: '您已绑定该邀请人', partner }
    return { ok: false, msg: '该账号已绑定其他邀请人', partner }
  }
  if (clean === partner.phone) return { ok: false, msg: '不能通过自己的推广链接注册', partner }
  const binding: InviteeBinding = {
    phone: clean,
    inviteCode: partner.inviteCode,
    partnerId: partner.id,
    campaignId,
    boundAt: nowStamp(),
  }
  try {
    localStorage.setItem(PROMO_INVITEE_BINDING_KEY, JSON.stringify([...bindings, binding]))
  } catch {
    /** 忽略隐私模式下的存储异常 */
  }
  promoPartnerStore.set((prev) =>
    prev.map((p) => (p.id === partner.id ? { ...p, inviteCount: p.inviteCount + 1 } : p)),
  )
  /** 同步写入被邀请人名单，保证合伙人「分销数据」的邀请人数与名单明细一致；活动链接注册时带上活动归属 */
  promoInviteeStore.set((prev) => [
    ...prev,
    {
      id: `pi_${Date.now()}`,
      partnerId: partner.id,
      phone: clean,
      registeredAt: binding.boundAt,
      campaignId: campaignId || undefined,
    },
  ])
  return { ok: true, msg: '邀请关系绑定成功', partner }
}

/**
 * 兑换档位消耗佣金：直接取券模板配置的「兑换金额」，保留 2 位；
 * 存量兑换专用模板尚无该字段时，按旧的加兑比例兜底换算，避免出现 0 佣金档位。
 */
export const voucherExchangeCost = (tpl: Pick<VoucherTemplate, 'faceValue' | 'exchangeCost'>): number =>
  tpl.exchangeCost != null ? roundAmount(tpl.exchangeCost, 2) : roundAmount(tpl.faceValue / PROMO_VOUCHER_RATE, 2)

/** 兑换档位列表：取启用中的兑换专用券模板，按面额由小到大排列 */
export function getExchangeTiers(): VoucherTemplate[] {
  return voucherTemplateStore
    .get()
    .filter((t) => t.exchangeOnly && t.status === 'enabled')
    .slice()
    .sort((a, b) => a.faceValue - b.faceValue)
}

/** 后台预置的「新人券」模板 id：控制台概览第三步的领取入口以此券是否存在为准 */
export const NEWCOMER_VOUCHER_TEMPLATE_ID = 'vt_001'

/**
 * 新人券解析：优先按预置 id 命中，其次按券名含「新人 / 新用户」兜底（后台改名后仍能命中）。
 * 只有「存在且启用中」才算有券——后台删掉或停用这张券，前台概览就不再展示赠送入口。
 * 新人身份逻辑暂不处理，只由页面控制这张券是否展示。
 */
export function findNewcomerVoucher(templates: VoucherTemplate[]): VoucherTemplate | undefined {
  const hit =
    templates.find((t) => t.id === NEWCOMER_VOUCHER_TEMPLATE_ID) ??
    templates.find((t) => t.name.includes('新人') || t.name.includes('新用户'))
  return hit && hit.status === 'enabled' ? hit : undefined
}

/**
 * 佣金兑换代金券：只能兑换已存在的兑换专用券模板（固定面额档位），
 * 消耗佣金 = 券模板配置的兑换金额，余额不足时不可兑换；券按模板有效期规则即时落到账户。
 * 券写回代金券 store，管理后台代金券页可见。
 */
export function exchangeCommissionToVoucher(
  partnerId: string,
  templateId: string,
): { ok: boolean; msg: string; faceValue?: number } {
  const partner = promoPartnerStore.get().find((p) => p.id === partnerId)
  if (!partner) return { ok: false, msg: '合伙人不存在' }
  if (partner.status === 'frozen') return { ok: false, msg: '账号已冻结，暂不可兑换' }
  const tpl = voucherTemplateStore.get().find((t) => t.id === templateId)
  if (!tpl || !tpl.exchangeOnly) return { ok: false, msg: '代金券不存在' }
  if (tpl.status !== 'enabled') return { ok: false, msg: '该代金券已下架，暂不可兑换' }
  const commission = voucherExchangeCost(tpl)
  if (roundAmount(commission, 2) > roundAmount(partner.availableCommission, 2)) return { ok: false, msg: '可用佣金余额不足' }
  const faceValue = tpl.faceValue
  promoPartnerStore.set((prev) =>
    prev.map((p) =>
      p.id === partnerId
        ? {
            ...p,
            availableCommission: roundAmount(p.availableCommission - commission, 2),
            exchangedCommission: roundAmount(p.exchangedCommission + commission, 2),
          }
        : p,
    ),
  )
  const now = new Date()
  const nowStr = nowStamp()
  const seq = String(vouchersStore.get().length + 101).padStart(6, '0')
  const { effectiveAt, expireAt } = resolveValidity(tpl, nowStr)
  const voucher: Voucher = {
    id: `vou_${uid()}`,
    code: `DQ-${fmtStamp(now).slice(0, 7).replace('-', '')}-${seq}`,
    templateId: tpl.id,
    templateName: tpl.name,
    faceValue,
    balance: faceValue,
    scope: tpl.scope,
    scopeModels: tpl.scopeModels ? [...tpl.scopeModels] : undefined,
    accountId: partner.accountId,
    accountName: partner.nickname,
    phone: partner.phone,
    accountType: 'personal',
    source: 'exchange',
    status: 'active',
    effectiveAt: effectiveAt ?? nowStr,
    expireAt,
    claimedAt: nowStr,
    remark: `推广合伙人佣金兑换：消耗 ${roundAmount(commission, 2)} 元佣金兑换 ${faceValue} 元券`,
    operator: CURRENT_OPERATOR,
    createdAt: nowStr,
  }
  vouchersStore.set((prev) => [voucher, ...prev])
  appendVoucherLedgerRow({
    operationType: 'voucher_issue',
    prefix: 'DJQFF',
    amountBefore: voucherPoolBalance(vouchersStore.get().slice(1), partner.accountId),
    amount: faceValue,
    operatedAt: nowStr,
    remark: `推广合伙人佣金兑换发放「${tpl.name}」`,
    voucherCode: voucher.code,
    operatorPhone: partner.phone,
    operatorAccountId: partner.accountId,
  })
  const record: ExchangeRecord = {
    id: `pe_${uid()}`,
    partnerId,
    partnerName: partner.nickname,
    commission: roundAmount(commission, 2),
    /** 比例快照：按本次实际消耗的兑换金额反算，不再固定取加兑比例 */
    rate: commission > 0 ? roundAmount(faceValue / commission, 2) : PROMO_VOUCHER_RATE,
    faceValue,
    status: 'issued',
    voucherCode: voucher.code,
    at: nowStr,
    expireAt: expireAt ?? fmtStamp(new Date(now.getTime() + PROMO_VOUCHER_VALID_DAYS * 24 * 60 * 60 * 1000)),
  }
  promoExchangeStore.set((prev) => [record, ...prev])
  return { ok: true, msg: '兑换成功', faceValue }
}

/** 收款开户行 / 银行账号本地记忆：提交提现成功后保存，下次打开弹窗自动回填，免去重复输入 */
const WITHDRAW_ACCOUNT_STORAGE_KEY = 'zsdd_promo_withdraw_account_v1'
const WITHDRAW_BANK_STORAGE_KEY = 'zsdd_promo_withdraw_bank_v1'

function loadWithdrawField(key: string): string {
  try {
    const raw = localStorage.getItem(key)
    /** 历史脏数据兜底：旧版本可能把 null/undefined 字面量写进了存储 */
    if (!raw || raw === 'null' || raw === 'undefined') return ''
    return raw
  } catch {
    return ''
  }
}

function saveWithdrawField(key: string, value: string) {
  try {
    localStorage.setItem(key, value ?? '')
  } catch {
    /** 存储不可用时静默降级，不影响提现流程 */
  }
}

export function loadWithdrawAccountNo(): string {
  return loadWithdrawField(WITHDRAW_ACCOUNT_STORAGE_KEY)
}

export function saveWithdrawAccountNo(accountNo: string) {
  saveWithdrawField(WITHDRAW_ACCOUNT_STORAGE_KEY, accountNo)
}

export function loadWithdrawBankName(): string {
  return loadWithdrawField(WITHDRAW_BANK_STORAGE_KEY)
}

export function saveWithdrawBankName(bankName: string) {
  saveWithdrawField(WITHDRAW_BANK_STORAGE_KEY, bankName)
}

/**
 * 提交提现申请：满 100 元起提；提交即冻结对应佣金（可用 → 提现中），月结审核通过后打款。
 * 预扣个税按 8% 演示口径估算，实际以月结发放时核算为准。
 */
export function applyWithdraw(
  partnerId: string,
  amount: number,
  accountName: string,
  accountNo: string,
  bankName: string,
): { ok: boolean; msg: string } {
  const partner = promoPartnerStore.get().find((p) => p.id === partnerId)
  if (!partner) return { ok: false, msg: '合伙人不存在' }
  if (partner.status === 'frozen') return { ok: false, msg: '账号已冻结，暂不可提现' }
  if (promoWithdrawStore.get().some((w) => w.partnerId === partnerId && w.status === 'pending')) {
    return { ok: false, msg: '已有提现申请待审核，请等待处理后再申请' }
  }
  if (amount < PROMO_WITHDRAW_MIN) return { ok: false, msg: `单笔提现需满 ${PROMO_WITHDRAW_MIN} 元` }
  if (roundAmount(amount, 2) > roundAmount(partner.availableCommission, 2)) return { ok: false, msg: '可用佣金余额不足' }
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const period = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  const req: WithdrawRequest = {
    id: `pw_${uid()}`,
    partnerId,
    partnerName: partner.nickname,
    accountName,
    bankName,
    accountNo,
    amount: roundAmount(amount, 2),
    tax: roundAmount(amount * 0.08, 2),
    period,
    status: 'pending',
    appliedAt: nowStamp(),
  }
  promoWithdrawStore.set((prev) => [req, ...prev])
  saveWithdrawAccountNo(accountNo)
  saveWithdrawBankName(bankName)
  promoPartnerStore.set((prev) =>
    prev.map((p) =>
      p.id === partnerId
        ? {
            ...p,
            availableCommission: roundAmount(p.availableCommission - amount, 2),
            withdrawnCommission: roundAmount(p.withdrawnCommission + amount, 2),
          }
        : p,
    ),
  )
  return { ok: true, msg: '提现申请已提交，审核通过后 1-3 个工作日打款' }
}

/** 后台审核提现：驳回时冻结金额退回可用佣金；通过即确认线下打款已完成，并记录打款时录入的实际扣税 */
export function reviewWithdraw(id: string, approve: boolean, reason?: string, tax?: number): { ok: boolean; msg: string } {
  const req = promoWithdrawStore.get().find((w) => w.id === id)
  if (!req) return { ok: false, msg: '提现申请不存在' }
  if (req.status !== 'pending') return { ok: false, msg: '该申请已处理' }
  promoWithdrawStore.set((prev) =>
    prev.map((w) =>
      w.id === id
        ? {
            ...w,
            status: approve ? 'approved' : 'rejected',
            reviewedAt: nowStamp(),
            reviewer: CURRENT_OPERATOR,
            tax: approve ? roundAmount(tax ?? 0, 2) : w.tax,
            rejectReason: approve ? undefined : reason || '资料核验不通过',
          }
        : w,
    ),
  )
  if (!approve) {
    promoPartnerStore.set((prev) =>
      prev.map((p) =>
        p.id === req.partnerId
          ? {
              ...p,
              availableCommission: roundAmount(p.availableCommission + req.amount, 2),
              withdrawnCommission: roundAmount(p.withdrawnCommission - req.amount, 2),
            }
          : p,
      ),
    )
  }
  return { ok: true, msg: approve ? '已通过，打款已完成' : '已驳回，金额退回佣金余额' }
}

/** 推广页面配置校验：「其他」渠道必须填写活动链接 */
function validatePromoPage(page: PromoActivityPage, activityUrl?: string): string | null {
  if (page === 'external' && !activityUrl?.trim()) return '推广页面为「其他」时，请填写活动链接'
  return null
}

/** 后台调整推广活动：比例 / 加倍返佣 / 限时活动 / 推广页面 / 上下线，保存即更新（计佣按每笔消耗当时生效的规则取比例） */
export function updateRebateRule(
  id: string,
  patch: {
    rate: number
    campaign: boolean
    boostRate?: number
    campaignStartAt?: string
    campaignEndAt?: string
    page: PromoActivityPage
    activityUrl?: string
    effectiveAt: string
    status: 'on' | 'off'
  },
): { ok: boolean; msg: string } {
  if (!(patch.rate > 0) || patch.rate > 50) return { ok: false, msg: '返佣比例需在 0 ~ 50% 之间' }
  if (patch.campaign) {
    if (!(patch.boostRate ?? 0) || (patch.boostRate ?? 0) <= patch.rate) return { ok: false, msg: '加倍返佣比例需大于标准返佣比例' }
    if (!patch.campaignStartAt || !patch.campaignEndAt) return { ok: false, msg: '请填写推广时间区间' }
    if (patch.campaignStartAt > patch.campaignEndAt) {
      return { ok: false, msg: '活动结束日期需晚于开始日期' }
    }
  }
  const pageErr = validatePromoPage(patch.page, patch.activityUrl)
  if (pageErr) return { ok: false, msg: pageErr }
  promoRebateStore.set((prev) =>
    prev.map((r) =>
      r.id === id
        ? {
            ...r,
            rate: patch.rate,
            campaign: patch.campaign,
            boostRate: patch.campaign ? patch.boostRate : undefined,
            campaignStartAt: patch.campaign ? patch.campaignStartAt : undefined,
            campaignEndAt: patch.campaign ? patch.campaignEndAt : undefined,
            page: patch.page,
            activityUrl: patch.page === 'external' ? patch.activityUrl?.trim() : undefined,
            effectiveAt: patch.effectiveAt,
            status: patch.status,
            operator: CURRENT_OPERATOR,
            updatedAt: nowStamp(),
          }
        : r,
    ),
  )
  return { ok: true, msg: '推广活动已保存' }
}

/** 后台删除推广活动：删除后该模型档位不再参与返佣计佣 */
export function deleteRebateRule(id: string): { ok: boolean; msg: string } {
  const exists = promoRebateStore.get().some((r) => r.id === id)
  if (!exists) return { ok: false, msg: '推广活动不存在或已被删除' }
  promoRebateStore.set((prev) => prev.filter((r) => r.id !== id))
  return { ok: true, msg: '已删除' }
}

/** 后台新增推广活动：从模型库选择模型 + 倍率档位，设置推广返佣比例、加倍返佣、推广时间与推广页面，保存后即参与计佣 */
export function addRebateRule(input: {
  modelName: string
  category: PromoModelCategory
  multiplierName: string
  modelMultiplier: number
  rate: number
  campaign: boolean
  boostRate?: number
  campaignStartAt?: string
  campaignEndAt?: string
  page: PromoActivityPage
  activityUrl?: string
  effectiveAt: string
}): { ok: boolean; msg: string } {
  if (!input.modelName) return { ok: false, msg: '请选择模型' }
  if (!input.multiplierName) return { ok: false, msg: '请选择倍率档位' }
  if (!(input.rate > 0) || input.rate > 50) return { ok: false, msg: '返佣比例需在 0 ~ 50% 之间' }
  if (input.campaign) {
    if (!(input.boostRate ?? 0) || (input.boostRate ?? 0) <= input.rate) return { ok: false, msg: '加倍返佣比例需大于标准返佣比例' }
    if (!input.campaignStartAt || !input.campaignEndAt) return { ok: false, msg: '请填写推广时间区间' }
    if (input.campaignStartAt > input.campaignEndAt) {
      return { ok: false, msg: '活动结束日期需晚于开始日期' }
    }
  }
  const pageErr = validatePromoPage(input.page, input.activityUrl)
  if (pageErr) return { ok: false, msg: pageErr }
  const exists = promoRebateStore.get().some((r) => r.modelName === input.modelName && r.multiplierName === input.multiplierName)
  if (exists) return { ok: false, msg: '该模型的该档位已配置推广活动，请勿重复添加' }
  const rule: ModelRebateRule = {
    id: `pr_${uid()}`,
    modelName: input.modelName,
    category: input.category,
    multiplierName: input.multiplierName,
    modelMultiplier: input.modelMultiplier,
    rate: input.rate,
    campaign: input.campaign,
    boostRate: input.campaign ? input.boostRate : undefined,
    campaignStartAt: input.campaign ? input.campaignStartAt : undefined,
    campaignEndAt: input.campaign ? input.campaignEndAt : undefined,
    page: input.page,
    activityUrl: input.page === 'external' ? input.activityUrl?.trim() : undefined,
    effectiveAt: input.effectiveAt,
    status: 'on',
    operator: CURRENT_OPERATOR,
    updatedAt: nowStamp(),
  }
  promoRebateStore.set((prev) => [rule, ...prev])
  return { ok: true, msg: '推广活动已添加' }
}

/* ------------------------------ 推广活动（活动主体） ------------------------------ */

const PROMO_CAMPAIGN_STORAGE_KEY = 'zsdd_promo_campaigns_v7'

const promoCampaignSeed: PromoCampaign[] = [
  {
    id: 'pc_006',
    name: '全平台模型通用返佣',
    startAt: '2026-10-01',
    endAt: '2026-10-31',
    scope: 'all',
    defaultRate: 10,
    webPromo: true,
    models: [
      { modelName: 'Doubao-Seedream-5.0-Pro', category: 'third', multiplierName: '尊享加速倍率', modelMultiplier: 2, rate: 10, boost: true, boostRate: 20 },
      { modelName: 'DODO-AC-Ultra-5', category: 'self', multiplierName: '尊享加速倍率', modelMultiplier: 2, rate: 10, boost: true, boostRate: 20 },
    ],
    status: 'on',
    stats: { views: 0, visitors: 0, clicks: 0, newUsers: 0, firstConsumeUsers: 0, consumeAmount: 0, commissionAmount: 0 },
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-28 09:30:00',
    updatedAt: '2026-09-28 09:30:00',
  },
  {
    id: 'pc_001',
    name: '9月旗舰模型加倍返佣',
    startAt: '2026-09-01',
    endAt: '2026-09-30',
    scope: 'partial',
    webPromo: false,
    models: [
      { modelName: 'DODO-OG-G-6-Astra', category: 'self', multiplierName: '标准倍率', modelMultiplier: 1, rate: 20, boost: true, boostRate: 40 },
    ],
    status: 'on',
    stats: { views: 12860, visitors: 5420, clicks: 2380, newUsers: 486, firstConsumeUsers: 214, consumeAmount: 186400, commissionAmount: 37280 },
    operator: CURRENT_OPERATOR,
    createdAt: '2026-08-25 14:20:00',
    updatedAt: '2026-09-28 10:05:00',
  },
  {
    id: 'pc_002',
    name: 'DeepSeek-V4 尊享加速站外专享',
    startAt: '2026-09-15',
    endAt: '2026-10-15',
    webPromo: false,
    models: [
      { modelName: 'DeepSeek-V4', category: 'third', multiplierName: '尊享加速倍率', modelMultiplier: 2, rate: 10, boost: true, boostRate: 25 },
    ],
    status: 'on',
    stats: { views: 4260, visitors: 1980, clicks: 860, newUsers: 152, firstConsumeUsers: 61, consumeAmount: 42600, commissionAmount: 8520 },
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-14 16:40:00',
    updatedAt: '2026-09-26 15:30:00',
  },
  {
    id: 'pc_003',
    name: '秋季三方模型分销',
    startAt: '2026-09-20',
    endAt: '2026-10-31',
    webPromo: false,
    models: [
      { modelName: 'DeepSeek-V4', category: 'third', multiplierName: '标准倍率', modelMultiplier: 1, rate: 10, boost: false },
      { modelName: 'GLM-5.3', category: 'third', multiplierName: '标准倍率', modelMultiplier: 1, rate: 10, boost: false },
      { modelName: 'Kimi-K3', category: 'third', multiplierName: '标准倍率', modelMultiplier: 1, rate: 8, boost: false },
    ],
    status: 'on',
    stats: { views: 3150, visitors: 1420, clicks: 540, newUsers: 96, firstConsumeUsers: 38, consumeAmount: 21800, commissionAmount: 2180 },
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-18 11:00:00',
    updatedAt: '2026-09-25 09:12:00',
  },
  {
    id: 'pc_004',
    name: 'Veo 视频模型加倍返佣收官',
    startAt: '2026-08-01',
    endAt: '2026-09-20',
    webPromo: false,
    models: [
      { modelName: 'DODO-Veo-Fast', category: 'self', multiplierName: '标准倍率', modelMultiplier: 1, rate: 18, boost: true, boostRate: 30 },
    ],
    status: 'on',
    stats: { views: 9640, visitors: 4120, clicks: 1760, newUsers: 342, firstConsumeUsers: 158, consumeAmount: 128900, commissionAmount: 32225 },
    operator: CURRENT_OPERATOR,
    createdAt: '2026-07-28 10:30:00',
    updatedAt: '2026-09-20 23:59:00',
  },
  {
    id: 'pc_005',
    name: 'Doubao 新模型试分销',
    startAt: '2026-10-01',
    endAt: '2026-10-20',
    webPromo: false,
    models: [],
    status: 'off',
    stats: { views: 0, visitors: 0, clicks: 0, newUsers: 0, firstConsumeUsers: 0, consumeAmount: 0, commissionAmount: 0 },
    operator: CURRENT_OPERATOR,
    createdAt: '2026-09-22 17:45:00',
    updatedAt: '2026-09-24 14:10:00',
  },
  {
    /**
     * 长期常规分销活动：每笔消耗计佣都必须归属一个活动，因此常规返佣也建为一条长周期活动，
     * 各模型比例与「模型返佣设置」中的标准比例一致（收益明细档位恒为 ×1）；不在控制台活动列表露出。
     */
    id: 'pc_007',
    name: '平台模型常规分销',
    startAt: '2026-08-01',
    endAt: '2026-12-31',
    scope: 'partial',
    webPromo: false,
    showInList: false,
    models: [
      { modelName: 'DODO-OG-G-5-6-Sol', category: 'self', multiplierName: '标准倍率', modelMultiplier: 1, rate: 15, boost: false },
      { modelName: 'DODO-Vision-4', category: 'self', multiplierName: '标准倍率', modelMultiplier: 1, rate: 18, boost: false },
      { modelName: 'DeepSeek-V4', category: 'third', multiplierName: '标准倍率', modelMultiplier: 1, rate: 10, boost: false },
      { modelName: 'GLM-5.3', category: 'third', multiplierName: '标准倍率', modelMultiplier: 1, rate: 10, boost: false },
      { modelName: 'Kimi-K3', category: 'third', multiplierName: '标准倍率', modelMultiplier: 1, rate: 8, boost: false },
      { modelName: 'Qwen3.8-Max', category: 'third', multiplierName: '标准倍率', modelMultiplier: 1, rate: 8, boost: false },
    ],
    status: 'on',
    stats: { views: 0, visitors: 0, clicks: 0, newUsers: 0, firstConsumeUsers: 0, consumeAmount: 0, commissionAmount: 0 },
    operator: CURRENT_OPERATOR,
    createdAt: '2026-07-25 10:00:00',
    updatedAt: '2026-08-01 09:00:00',
  },
]

/** 活动档位行唯一键：模型名 + 档位名 */
export const PROMO_ROW_KEY = (row: { modelName: string; multiplierName: string }) =>
  `${row.modelName}::${row.multiplierName}`

const promoCampaignStore = makeVoucherStore<PromoCampaign>(PROMO_CAMPAIGN_STORAGE_KEY, promoCampaignSeed)

/**
 * 全量「模型 × 档位」返佣池：所有已上架模型的全部 API 倍率档位。
 * 适用范围为「全平台模型」的活动以此为准 —— 后台配置页、官网推广页、控制台活动列表共用同一口径。
 */
export function buildModelRatePool(models: ModelItem[]): PromoCampaignModel[] {
  const seen = new Set<string>()
  const list: PromoCampaignModel[] = []
  for (const model of models) {
    if (!model.online) continue
    const cfgs = model.apiConfigs ?? []
    const tiers = cfgs.length
      ? cfgs.map((cfg) => ({
          multiplierName: cfg.multiplierName?.trim() || '标准倍率',
          modelMultiplier: cfg.modelMultiplier ?? 1,
        }))
      : [{ multiplierName: '标准倍率', modelMultiplier: 1 }]
    for (const tier of tiers) {
      const row: PromoCampaignModel = {
        modelName: model.name,
        category: model.vendor === '智算多多' ? 'self' : 'third',
        multiplierName: tier.multiplierName,
        modelMultiplier: tier.modelMultiplier,
        enabled: true,
        rate: 0,
        boost: false,
      }
      const key = PROMO_ROW_KEY(row)
      if (seen.has(key)) continue
      seen.add(key)
      list.push(row)
    }
  }
  return list
}

/**
 * 全平台模型活动自愈：把模型池里尚未落库的档位按活动默认返佣比例补齐并持久化。
 * 覆盖三种场景：历史活动 models 为空、新建活动、平台新增模型后需自动按默认比例配置。
 * 只负责「哪些模型参与返佣」，不改动「是否在官网上架」——官网上架始终由人工开关决定。
 * 返回是否发生写入。
 */
export function syncAllScopeCampaignModels(): boolean {
  const pool = buildModelRatePool(getModelListSnapshot())
  if (pool.length === 0) return false
  let changed = false
  const next = promoCampaignStore.get().map((c) => {
    if (c.scope !== 'all') return c
    const saved = c.models ?? []
    const missing = pool.filter((r) => !saved.some((m) => PROMO_ROW_KEY(m) === PROMO_ROW_KEY(r)))
    if (missing.length === 0) return c
    changed = true
    const rate = c.defaultRate ?? 10
    return { ...c, models: [...saved, ...missing.map((r) => ({ ...r, rate }))] }
  })
  if (changed) promoCampaignStore.set(next)
  return changed
}

syncAllScopeCampaignModels()

export function usePromoCampaigns(): PromoCampaign[] {
  return useSyncExternalStore(promoCampaignStore.subscribe, promoCampaignStore.get)
}

/** 官网推广活动：全平台仅允许一个活动开启官网推广，官网「推广合伙人」页用其模型返佣比例展示。
 * 优先取「推广期内」的活动，避免历史活动即便已过期仍长期占用官网展位、把当期活动挤掉。 */
export function useWebPromoCampaign(): PromoCampaign | null {
  const campaigns = usePromoCampaigns()
  return useMemo(() => {
    const candidates = campaigns.filter((c) => c.webPromo && c.status === 'on')
    return candidates.find(isCampaignInPeriod) ?? candidates[0] ?? null
  }, [campaigns])
}

/** 活动是否处于推广期（仅按日期判断，不含启用/停用状态；结束日当天仍算活动中） */
export function isCampaignInPeriod(campaign: PromoCampaign): boolean {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  return campaign.startAt <= todayStr && todayStr <= campaign.endAt
}

/** 活动阶段：按活动时间范围自动判断（未开始 / 进行中 / 已结束），不由人工设置 */
export function getCampaignPhase(campaign: PromoCampaign): 'pending' | 'ongoing' | 'ended' {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  if (todayStr < campaign.startAt) return 'pending'
  if (todayStr > campaign.endAt) return 'ended'
  return 'ongoing'
}

/** 校验活动模型的档位倍率：模型必填、比例范围、加倍比例、活动内模型+档位查重 */
function validateCampaignModels(models: PromoCampaignModel[]): string | null {
  if (models.length === 0) return '请至少添加一个分销模型'
  const seen = new Set<string>()
  for (const m of models) {
    if (!m.modelName) return '请选择分销模型'
    if (!m.multiplierName) return `请选择「${m.modelName}」的模型档位`
    if (!(m.rate > 0) || m.rate > 50) return `「${m.modelName} · ${m.multiplierName}」返佣比例需在 0 ~ 50% 之间`
    if (m.boost) {
      if (!(m.boostRate ?? 0) || (m.boostRate ?? 0) <= m.rate) return `「${m.modelName} · ${m.multiplierName}」加倍返佣比例需大于标准返佣比例`
    }
    const key = `${m.modelName}::${m.multiplierName}`
    if (seen.has(key)) return `「${m.modelName} · ${m.multiplierName}」重复添加，请勿重复配置`
    seen.add(key)
  }
  return null
}

/** 校验活动公共字段：名称必填、推广时间必选且结束不早于开始、全平台范围需配默认返佣比例 */
function validateCampaignBase(
  input: { name: string; startAt: string; endAt: string; scope?: PromoCampaignScope; defaultRate?: number },
): string | null {
  if (!input.name.trim()) return '请填写活动名称'
  if (!input.startAt || !input.endAt) return '请选择活动时间范围'
  if (input.startAt > input.endAt) return '分销结束日期需晚于开始日期'
  if (input.scope === 'all' && !(input.defaultRate && input.defaultRate > 0 && input.defaultRate <= 50)) {
    return '全平台模型适用范围需配置 0 ~ 50% 之间的默认返佣比例'
  }
  return null
}

/** 后台新建推广活动：活动名称 + 时间范围 + 适用范围 + 是否官网推广，新建即为计佣中，推广模型在活动创建后配置 */
export function addPromoCampaign(input: {
  name: string
  startAt: string
  endAt: string
  scope: PromoCampaignScope
  defaultRate?: number
  webPromo: boolean
  showInList: boolean
}): { ok: boolean; msg: string } {
  const baseErr = validateCampaignBase(input)
  if (baseErr) return { ok: false, msg: baseErr }
  const stamp = nowStamp()
  const campaign: PromoCampaign = {
    id: `pc_${uid()}`,
    name: input.name.trim(),
    startAt: input.startAt,
    endAt: input.endAt,
    scope: input.scope,
    defaultRate: input.scope === 'all' ? input.defaultRate : undefined,
    webPromo: input.webPromo,
    showInList: input.showInList,
    models: [],
    status: 'on',
    stats: { views: 0, visitors: 0, clicks: 0, newUsers: 0, firstConsumeUsers: 0, consumeAmount: 0, commissionAmount: 0 },
    operator: CURRENT_OPERATOR,
    createdAt: stamp,
    updatedAt: stamp,
  }
  promoCampaignStore.set((prev) =>
    input.webPromo ? [campaign, ...prev.map((c) => ({ ...c, webPromo: false }))] : [campaign, ...prev],
  )
  syncAllScopeCampaignModels()
  return { ok: true, msg: '活动已创建' }
}

/** 后台编辑推广活动：名称 / 时间范围 / 适用范围 / 是否官网推广，计佣状态经操作列「暂停/恢复」单独维护 */
export function updatePromoCampaign(
  id: string,
  patch: {
    name: string
    startAt: string
    endAt: string
    scope: PromoCampaignScope
    defaultRate?: number
    webPromo: boolean
    showInList: boolean
  },
): { ok: boolean; msg: string } {
  const exists = promoCampaignStore.get().some((c) => c.id === id)
  if (!exists) return { ok: false, msg: '活动不存在或已被删除' }
  const baseErr = validateCampaignBase(patch)
  if (baseErr) return { ok: false, msg: baseErr }
  promoCampaignStore.set((prev) =>
    prev.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          name: patch.name.trim(),
          startAt: patch.startAt,
          endAt: patch.endAt,
          scope: patch.scope,
          defaultRate: patch.scope === 'all' ? patch.defaultRate : undefined,
          webPromo: patch.webPromo,
          showInList: patch.showInList,
          operator: CURRENT_OPERATOR,
          updatedAt: nowStamp(),
        }
      }
      return patch.webPromo && c.webPromo ? { ...c, webPromo: false } : c
    }),
  )
  syncAllScopeCampaignModels()
  return { ok: true, msg: '活动已更新' }
}

/** 后台配置活动推广模型：整体替换该活动的模型列表，传空数组表示清空 */
export function setPromoCampaignModels(id: string, models: PromoCampaignModel[]): { ok: boolean; msg: string } {
  const exists = promoCampaignStore.get().some((c) => c.id === id)
  if (!exists) return { ok: false, msg: '活动不存在或已被删除' }
  if (models.length > 0) {
    const modelErr = validateCampaignModels(models)
    if (modelErr) return { ok: false, msg: modelErr }
  }
  promoCampaignStore.set((prev) =>
    prev.map((c) => (c.id === id ? { ...c, models, operator: CURRENT_OPERATOR, updatedAt: nowStamp() } : c)),
  )
  return { ok: true, msg: '模型配置已保存' }
}

/** 后台暂停 / 恢复活动计佣：暂停后该活动不再产生返佣，活动数据保留；已结束的活动不可再暂停 */
export function setPromoCampaignStatus(id: string, status: 'on' | 'off'): { ok: boolean; msg: string } {
  const target = promoCampaignStore.get().find((c) => c.id === id)
  if (!target) return { ok: false, msg: '活动不存在或已被删除' }
  if (status === 'off' && getCampaignPhase(target) === 'ended') {
    return { ok: false, msg: '活动已结束，无需暂停' }
  }
  promoCampaignStore.set((prev) =>
    prev.map((c) => (c.id === id ? { ...c, status, operator: CURRENT_OPERATOR, updatedAt: nowStamp() } : c)),
  )
  return { ok: true, msg: status === 'on' ? '已恢复计佣' : '已暂停计佣' }
}

/** 后台切换活动是否在控制台活动列表展示：关闭后列表不再露出，已有推广链接仍可访问 */
export function setPromoCampaignShowInList(id: string, showInList: boolean): { ok: boolean; msg: string } {
  const exists = promoCampaignStore.get().some((c) => c.id === id)
  if (!exists) return { ok: false, msg: '活动不存在或已被删除' }
  promoCampaignStore.set((prev) =>
    prev.map((c) => (c.id === id ? { ...c, showInList, operator: CURRENT_OPERATOR, updatedAt: nowStamp() } : c)),
  )
  return { ok: true, msg: showInList ? '已在活动列表展示' : '已在活动列表隐藏' }
}

/** 后台删除推广活动 */
export function deletePromoCampaign(id: string): { ok: boolean; msg: string } {
  const exists = promoCampaignStore.get().some((c) => c.id === id)
  if (!exists) return { ok: false, msg: '活动不存在或已被删除' }
  promoCampaignStore.set((prev) => prev.filter((c) => c.id !== id))
  return { ok: true, msg: '已删除' }
}
