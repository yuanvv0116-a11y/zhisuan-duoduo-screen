export type ChannelStatus = 'enabled' | 'disabled'

export type SettlementMethod =
  | 'prepaid'
  | 'postpaid'
  | 'credit'
  | 'monthly'

export type BillingType =
  | 'token'
  | 'call'
  | 'gpu_hour'
  | 'package'
  | 'tiered'
  | 'free'

export interface ChannelModel {
  id: string
  modelName: string
  billingType: BillingType
  inputPrice?: number
  outputPrice?: number
  callPrice?: number
  gpuHourPrice?: number
  unit?: string
  remark?: string
}

export interface SettlementConfig {
  method: SettlementMethod
  currency: string
  billingCycle?: 'day' | 'week' | 'month'
  creditLimit?: number
  taxRate?: number
  remark?: string
}

export interface Channel {
  id: string
  name: string
  apiName: string
  apiUrl: string
  apiKey: string
  status: ChannelStatus
  contact?: string
  phone?: string
  remark?: string
  operator: string
  createdAt: string
  settlement: SettlementConfig
  models: ChannelModel[]
}

export interface EndpointMapping {
  endpointKey: string
  mappingUrl: string
}

export interface ChannelModelItem {
  id: string
  modelName: string
  channelId: string
  modelCode: string
  endpoints: EndpointMapping[]
  operator: string
  createdAt: string
  costConfig?: ModelCostConfig
}

export type CostPriceType =
  | 'token'
  | 'image_quality'
  | 'image_token'
  | 'video_quality'
  | 'video_quality_token'
  | 'vidu_image_quality'

export interface CostTier {
  label: string
  price: number
}

export interface ModelCostConfig {
  priceType: CostPriceType
  inputPrice?: number
  outputPrice?: number
  cachedEnabled?: boolean
  cachedPrice?: number
  cacheCreatePrice?: number
  cacheReadPrice?: number
  tiers?: CostTier[]
}

export type ModelType = 'text' | 'image' | 'video' | 'audio' | 'embedding'
export type PricingMode = 'token' | 'call' | 'image_quality' | 'video_quality_token' | 'free'

export interface ModelApiConfig {
  id: string
  channelId: string
  channelModelId?: string
  modelCode: string
  weight: number
  endpointMappings: EndpointMapping[]
  queueEnabled: boolean
  queueLimit: number
  timeout: number
}

export interface ModelItem {
  id: string
  logo: string
  name: string
  vendor: string
  type: ModelType
  inputModals: string[]
  outputModals: string[]
  maxOutputToken: number
  pricingMode: PricingMode
  hot: boolean
  deepThinking: boolean
  sort: number
  online: boolean
  onlineAt: string
  modelCode?: string
  contextWindow?: number
  intro?: string
  docTags?: string[]
  configEndpoints?: string[]
  apiConfigs?: ModelApiConfig[]
}

/* ---------------- 资源包 ---------------- */

/** 包内模型阶梯定价模式 */
export type PackPricingMode =
  | 'token_ladder' // 按 Token 用量阶梯折扣（仅 token 计费模型）
  | 'amount_ladder' // 按消费金额阶梯折扣（所有计费形式通用）

/** 阶梯定价档位 */
export interface PackPricingTier {
  /** 区间开始：token_ladder 为累计 Token 数量；amount_ladder 为累计消费金额（元） */
  start: number
  /** 区间结束：token_ladder 为累计 Token 数量；amount_ladder 为累计消费金额（元） */
  threshold: number
  /** 折扣百分比 1-100，如 90 = 9折；阶梯越后折扣越低（越便宜） */
  discount: number
}

/** Token 定价明细（元/千Token） */
export interface TokenPriceBreakdown {
  /** 输入 Token 单价 */
  input: number
  /** 输出 Token 单价 */
  output: number
  /** 缓存读取 Token 单价 */
  cacheRead: number
  /** 缓存创建 Token 单价 */
  cacheCreate: number
}

/** 包内模型定价 + 配额 */
export interface PackModelPricing {
  modelId: string
  modelName: string
  /** 继承原模型计费形式 */
  pricingMode: PricingMode
  /** 包内阶梯定价模式 */
  packPricingMode: PackPricingMode
  /** Token 计费：明细单价（元/千Token，只读）；非Token计费：output=统一单价，其它为0 */
  basePrices: TokenPriceBreakdown
  /** 单位说明，如「元/千Token」「元/次」（只读，根据计费形式） */
  baseUnit: string
  /** 阶梯列表 */
  tiers: PackPricingTier[]
  /** RPM 配额 */
  rpm: number
  /** TPM 配额 */
  tpm: number
}

/** 资源包 */
export interface ResourcePack {
  id: string
  /** 资源包名称 */
  name: string
  /** 资源包编码 */
  code: string
  /** 上架 / 下架 */
  status: 'on' | 'off'
  /** 包内模型定价列表（模型单独计价） */
  models: PackModelPricing[]
  operator: string
  createdAt: string
}
