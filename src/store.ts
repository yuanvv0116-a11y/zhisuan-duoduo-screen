import { useCallback, useSyncExternalStore } from 'react'
import type {
  Channel,
  ChannelModelItem,
  ModelItem,
  ResourcePack,
  TokenPlan,
  AccountLedger,
  OrderDetail,
} from './types'
import { calcPlanDiscountedPrice } from './types'

const STORAGE_KEY = 'zsdd_channels_v5'

const uid = () => Math.random().toString(36).slice(2, 10)

const CURRENT_OPERATOR = '管理员'

const seed: Channel[] = [
  {
    id: uid(),
    name: '阿里云百炼',
    apiName: '阿里云-华东主站',
    apiUrl: 'https://dashscope.aliyuncs.com/api/v1',
    apiKey: 'sk-aliyun-east-demo',
    status: 'enabled',
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
    id: uid(),
    name: '腾讯云 TI',
    apiName: '腾讯云-广州主站',
    apiUrl: 'https://tione.tencentcloudapi.com',
    apiKey: 'sk-tencent-gz-demo',
    status: 'enabled',
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

const MODEL_STORAGE_KEY = 'zsdd_channel_models_v3'

const modelSeed: ChannelModelItem[] = [
  {
    id: uid(),
    modelName: 'Qwen-Turbo 对话',
    channelId: state[0]?.id ?? '',
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
    channelId: state[0]?.id ?? '',
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
    channelId: state[0]?.id ?? '',
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
    channelId: state[0]?.id ?? '',
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
    channelId: state[1]?.id ?? '',
    modelCode: 'ti-a100-train',
    endpoints: [
      { endpointKey: 'chat_completions', mappingUrl: '/v1/chat/completions' },
    ],
    operator: '李强',
    createdAt: '2026-02-05',
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

let modelState: ChannelModelItem[] = loadModels()
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

const MODEL_LIST_STORAGE_KEY = 'zsdd_models_v2'

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
        channelId: state[0]?.id ?? '',
        modelCode: 'qwen-turbo',
        weight: 60,
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
        channelId: state[1]?.id ?? '',
        modelCode: 'ti-a100-train',
        weight: 40,
        endpointMappings: [
          { endpointKey: '/v1/images/generations', mappingUrl: '/v2/images/generations' },
        ],
        queueEnabled: false,
        queueLimit: 1,
        timeout: 30000,
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
        channelId: state[0]?.id ?? '',
        modelCode: 'qwen-turbo',
        weight: 100,
        endpointMappings: [
          { endpointKey: '/v1/chat/completions', mappingUrl: '/compatible-mode/v1/chat/completions' },
        ],
        queueEnabled: true,
        queueLimit: 50,
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
  },
]

function loadModelList(): ModelItem[] {
  try {
    const raw = localStorage.getItem(MODEL_LIST_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ModelItem[]
  } catch {
    /* ignore */
  }
  localStorage.setItem(MODEL_LIST_STORAGE_KEY, JSON.stringify(modelListSeed))
  return modelListSeed
}

let modelListState: ModelItem[] = loadModelList()
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
