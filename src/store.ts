import { useCallback, useSyncExternalStore } from 'react'
import type { Channel, ChannelModelItem, ModelItem, ResourcePack } from './types'

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
