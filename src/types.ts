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
  /** 上架 / 下架 */
  status: 'on' | 'off'
  /** 包内模型定价列表（模型单独计价） */
  models: PackModelPricing[]
  operator: string
  createdAt: string
}

/* ---------------- Token 套餐 ---------------- */

/** 套餐级别 */
export type PlanLevel = 'lite' | 'standard' | 'pro' | 'max'

/** 套餐版本：个人版 / 企业版 */
export type PlanType = 'personal' | 'enterprise'

/** 订阅时长选项 */
export interface PlanDurationOption {
  /** 显示名称，如 月付/季付/年付 */
  label: string
  /** 时长（月），如 1/3/12 */
  months: number
  /** 折扣 0-100，100 = 不打折 */
  discount: number
  /** 折后价（原价 × 月数 × 折扣/100） */
  finalPrice: number
}

/** 有效期单位 */
export type PlanValidityUnit = 'day' | 'week' | 'month' | 'quarter' | 'year'

/** 把「有效期单位」对应的时长倍率 / 展示单位 / label 前缀 统一起来 */
export const PLAN_DURATION_UNIT_META: Record<
  PlanValidityUnit,
  {
    /** 1 个展示单位 = months 多少个月（用于计算日期、存储 months 字段） */
    monthsPerUnit: number
    /** 单个时长的展示后缀（无数字时的「月/周/天」） */
    unitSingle: string
    /** 数字后跟随的展示后缀（如「3 个月」「5 天」） */
    unitPlural: string
    /** 金额选项 label 前缀，最终拼成「X日付」「X月付」 */
    payPrefix: string
    /** 后台订阅时长列的「时长（月）」 → 「时长（天）」等 */
    formLabel: string
    /** 前台展示用的短单位（放在下拉框，如「3个月」「7天」） */
    shortUnit: string
  }
> = {
  day: {
    monthsPerUnit: 1 / 30,
    unitSingle: '天',
    unitPlural: '天',
    payPrefix: '日付',
    formLabel: '时长（天）',
    shortUnit: '天',
  },
  week: {
    monthsPerUnit: 7 / 30,
    unitSingle: '周',
    unitPlural: '周',
    payPrefix: '周付',
    formLabel: '时长（周）',
    shortUnit: '周',
  },
  month: {
    monthsPerUnit: 1,
    unitSingle: '个月',
    unitPlural: '个月',
    payPrefix: '月付',
    formLabel: '时长（月）',
    shortUnit: '个月',
  },
  quarter: {
    monthsPerUnit: 3,
    unitSingle: '季',
    unitPlural: '季',
    payPrefix: '季付',
    formLabel: '时长（季）',
    shortUnit: '季',
  },
  year: {
    monthsPerUnit: 12,
    unitSingle: '年',
    unitPlural: '年',
    payPrefix: '年付',
    formLabel: '时长（年）',
    shortUnit: '年',
  },
}

/** 存储 months → 展示用的「X 个单位」整数 */
export const durationToDisplayUnits = (
  months: number,
  unit: PlanValidityUnit,
): number => {
  const meta = PLAN_DURATION_UNIT_META[unit]
  const raw = months / meta.monthsPerUnit
  return Math.max(1, Math.round(raw))
}

/** 展示的「X 个单位」整数 → 存储 months */
export const displayUnitsToMonths = (
  displayUnits: number,
  unit: PlanValidityUnit,
): number => {
  const meta = PLAN_DURATION_UNIT_META[unit]
  return displayUnits * meta.monthsPerUnit
}

/** 生成订阅时长选项的 label：如「1日付」「3周付」「1个月付」「1季付」 */
export const buildDurationLabel = (
  displayUnits: number,
  unit: PlanValidityUnit,
): string => {
  const { payPrefix } = PLAN_DURATION_UNIT_META[unit]
  return `${displayUnits}${payPrefix}`
}

/** 前台展示「X个月（到期：YYYY-MM-DD）」里的前半段 */
export const formatDurationText = (
  months: number,
  unit: PlanValidityUnit,
): string => {
  const n = durationToDisplayUnits(months, unit)
  const meta = PLAN_DURATION_UNIT_META[unit]
  return `${n}${meta.shortUnit}`
}

/** 用量限制周期单位（在有效期内，每个周期的 Token 限额） */
export type PlanUsagePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/** Token 套餐 */
export interface TokenPlan {
  id: string
  /** 套餐名称 */
  name: string
  /** 副标题 */
  subtitle?: string
  /** 套餐级别（保留兼容，不在表单展示） */
  level?: PlanLevel
  /** 套餐版本：个人版 / 企业版 */
  planType: PlanType
  /** 摘要（按条展示） */
  summaryItems?: string[]
  /** 售价（元） */
  price: number
  /** 折扣价（元），折后售价，不填等于售价 */
  discountPrice: number
  /** 默认折扣（0-100，兼容旧字段） */
  discount?: number
  /** 是否在前台展示原价（开启后卡片上会展示划线原价） */
  showOriginalPrice?: boolean
  /** 划掉展示的原价（元），仅 showOriginalPrice=true 时有效 */
  originalPrice?: number
  /** 订阅时长选项（不同时长不同折扣） */
  durations: PlanDurationOption[]
  /** 产品标签（最多6个字） */
  productTag: string
  /** 套餐总 Token 量（有效期内的总量，非周期额度） */
  totalTokens: number
  /** 是否启用用量限制（关闭即周期内无 Token 上限） */
  usageLimitEnabled: boolean
  /** 用量限制数值（Token 数量），仅 usageLimitEnabled=true 时有效 */
  usageLimit: number
  /** 用量限制周期单位：在有效期内每个周期的 Token 限额，仅 usageLimitEnabled=true 时有效 */
  usagePeriod: PlanUsagePeriod
  /** 有效期数值 */
  validityValue: number
  /** 有效期单位 */
  validityUnit: PlanValidityUnit
  /** 是否支持自动续费 */
  autoRenew: boolean
  /** 上下架状态 */
  status: 'on' | 'off'
  /** 包含的模型 ID 列表 */
  modelIds: string[]
  /** 操作人 */
  operator: string
  /** 创建时间 */
  createdAt: string
}

/** 折后价 = 售价 × 折扣 ÷ 100；折扣为 0 时返回原价（不打折） */
export const calcPlanDiscountedPrice = (price: number, discount: number): number => {
  if (discount <= 0) return price
  return Math.round(price * discount) / 100
}

/* ============================== 费用管理 - 账户明细 ============================== */

/** 操作类型 */
export type AccountOperationType =
  | 'model_consume'
  | 'recharge'
  | 'plan_subscribe'
  | 'resource_pack_buy'
  | 'refund'
  | 'adjust'

export const ACCOUNT_OPERATION_LABEL: Record<AccountOperationType, string> = {
  model_consume: '模型调用消费',
  recharge: '账户充值',
  plan_subscribe: '套餐订阅',
  resource_pack_buy: '资源包购买',
  refund: '退款',
  adjust: '余额调整',
}

/** 账户明细（流水） */
export interface AccountLedger {
  id: string
  /** 流水号，MXXF-前缀 + 数字 */
  serialNo: string
  /** 操作时间（YYYY-MM-DD HH:mm:ss） */
  operatedAt: string
  /** 操作人手机号（脱敏 183****9299） */
  operatorPhone: string
  /** 操作人账号 ID（如 ACC202605090005） */
  operatorAccountId: string
  /** 操作类型 */
  operationType: AccountOperationType
  /** 变动前金额（元） */
  amountBefore: number
  /** 变动金额（元），消费为负数、充值/退款为正数 */
  amountChange: number
  /** 变动后金额（元） */
  amountAfter: number
  /** 备注，可能包含模型名等 */
  remark?: string
  /** 操作人姓名（预留，当前不展示） */
  operator?: string
}

/* ============================== 费用管理 - 订单明细 ============================== */

/** 订单明细 Tab 类别（不含云私订单明细） */
export type OrderDetailTab = 'resourcePack' | 'subscription'

export const ORDER_DETAIL_TAB_LABEL: Record<OrderDetailTab, string> = {
  resourcePack: '资源包订单明细',
  subscription: '订阅套餐明细',
}

/** 订单类型 */
export type OrderType = 'gift' | 'purchase' | 'renew' | 'refund'

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  gift: '赠送',
  purchase: '新购',
  renew: '续费',
  refund: '退款',
}

/** 订单状态 */
export type OrderStatus = 'paid' | 'pending' | 'refunded' | 'cancelled'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  paid: '已支付',
  pending: '待支付',
  refunded: '已退款',
  cancelled: '已取消',
}

/** 产品类型 */
export type OrderProductType = 'tokensPack' | 'plan'

export const ORDER_PRODUCT_TYPE_LABEL: Record<OrderProductType, string> = {
  tokensPack: '资源包',
  plan: 'Token Plan',
}

/** 资源状态 */
export type ResourceStatus = 'active' | 'expired' | 'inactive'

export const RESOURCE_STATUS_LABEL: Record<ResourceStatus, string> = {
  active: '生效中',
  expired: '已失效',
  inactive: '未生效',
}

/** 订单明细条目 */
export interface OrderDetail {
  id: string
  /** 订单所属 tab */
  tab: OrderDetailTab
  /** 客户 ID（超长，展示时 ellipsis） */
  customerId: string
  /** 产品类型：Tokens包 / 订阅套餐 */
  productType: OrderProductType
  /** 模型/产品名（可能带前缀【实名认证】【新用户专享】等，超长 ellipsis） */
  productName: string
  /** 订单号 */
  orderNo: string
  /** 订单类型 */
  orderType: OrderType
  /** 创建时间（YYYY-MM-DD HH:mm:ss） */
  createdAt: string
  /** 资源发放时间（YYYY-MM-DD HH:mm:ss） */
  grantedAt: string
  /** 订单状态 */
  status: OrderStatus
  /** 订单金额（元） */
  amount: number
  /** 支付时间 */
  payAt?: string
  /** 官网目录总价 */
  originalPrice?: number
  /** 优惠金额 */
  discountAmount?: number
  /** 优惠券金额 */
  couponAmount?: number
  /** 订阅名称 */
  planName?: string
  /** 套餐/席位名称 */
  seatName?: string
  /** 资源状态 */
  resourceStatus?: ResourceStatus
  /** 失效时间 */
  expireAt?: string
  /** 总量 */
  totalTokens?: string
  /** 余量 */
  remainingTokens?: string
  /** 支付渠道 */
  paymentChannel?: string
}
