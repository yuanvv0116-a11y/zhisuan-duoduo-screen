import { useCallback, useSyncExternalStore } from 'react'
import type {
  Channel,
  ChannelModelItem,
  GroupOwner,
  ModelApiConfig,
  ModelItem,
  ModelGroup,
  ResourcePack,
  TokenPlan,
  AccountLedger,
  OrderDetail,
} from './types'
import { calcPlanDiscountedPrice } from './types'

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

const LEDGER_STORAGE_KEY = 'zsdd_account_ledgers_v1'

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
  }))
  return [...extras, ...seed]
}

const LEDGER_SEED: AccountLedger[] = buildLedgerSeed()

function loadLedgers(): AccountLedger[] {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AccountLedger[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
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

export function useAccountLedgers() {
  const ledgers = useSyncExternalStore(subscribeLedgers, getLedgersSnapshot)
  return ledgers
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
