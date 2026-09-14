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

/** 渠道下的一组 API 配置（一个渠道可以有多个，一个配置可以关联多个模型） */
export interface ChannelApiCredential {
  id: string
  apiName: string
  apiUrl: string
  apiKey: string
  remark?: string
  /** 该组 API 配置自身的启用/停用状态（渠道不再有整体状态） */
  status: ChannelStatus
  /** 操作人：新增/编辑该组 API 配置时由系统自动写入 */
  operator?: string
  /** 创建时间：首次新增该组 API 配置时由系统自动写入 */
  createdAt?: string
}

export interface Channel {
  id: string
  name: string
  /** 渠道下的多组 API 配置，第一组（下标 0）为默认配置 */
  apiCredentials: ChannelApiCredential[]
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
  weight?: number
}

/** 渠道模型的最新运行状态（监控口径，只有正常/异常两种，区别于渠道/API 配置的启用停用） */
export type ModelPerfStatus = 'normal' | 'error'

/** 列表行内展示的性能概要（最近 24 小时） */
export interface ChannelModelPerf {
  /** 模型最新状态：24h 访问成功率 ≥ 99% 为正常，否则为异常 */
  status: ModelPerfStatus
  /** 24h 访问成功率，百分比数值 */
  successRate24h: number
  /** 24h 平均延迟，单位秒 */
  latency: number
  /** 24h 平均吞吐，单位 tokens/秒 */
  throughput: number
  /** 最近 24 小时的异常数量（内部按小时分桶统计，展示文案不带「桶」） */
  anomalyBuckets: number
  /** 24h 缓存命中率基线，百分比数值（命中缓存的输入 Token ÷ 输入 Token 总数） */
  cacheHit?: number
  /** 本周期内是否完全无流量（如模型已下线），无流量时各项指标展示 — */
  noTraffic?: boolean
  /** 24h 首 Token 延迟（TTFT），单位秒：（首个 Token 到达时间 − 请求发送时间）之和 ÷ 成功请求数 */
  ttft?: number
  /** 24h 平均输出 Token 数（单请求）：（平均延迟 − TTFT）÷ TPOT */
  outTokens?: number
  /** 24h 平均并发路数：Token 吞吐量 ÷ 单请求 TPS */
  concurrency?: number
  /** 24h 每个 Token 生成时间（TPOT），单位毫秒：（平均延迟 − TTFT）× 1000 ÷ 平均输出 Token 数 */
  tpot?: number
}

/** 性能弹窗「明细」表的单行：一个小时桶（从当前时刻向历史回溯 24 小时）的性能 */
export interface PerfHourStat {
  /** 小时刻度，如 18:00 */
  label: string
  /** 带日期的刻度，如 9月10日 18时 */
  fullLabel: string
  /** 是否为进行中的当前小时 */
  current: boolean
  /** 该小时的平均吞吐，单位 tokens/秒 */
  tps: number
  /** 该小时的平均会话时长（整段耗时），单位秒（响应完成时间 − 请求发送时间，即弹窗 24h 明细的「平均延迟」列） */
  avgLatency: number
  /** 该小时的首 Token 平均延迟，单位秒（首个 Token 到达时间 − 请求发送时间，恒 ≤ 同小时的 avgLatency） */
  firstTokenLatency: number
  /** 该小时的缓存命中率，百分比数值（命中缓存的输入 Token ÷ 输入 Token 总数） */
  cacheHitRate: number
  /** 该小时的请求成功率，百分比数值（与「请求成功趋势」图同源） */
  successRate: number
  /** 该小时是否发生异常 */
  anomaly: boolean
}

/** 24 小时折线的单个点位 */
export interface PerfHourPoint {
  /** 小时刻度，如 18:00 */
  label: string
  /** 带日期的刻度，如 9月10日 18时 */
  fullLabel: string
  value: number
  /** 「请求成功趋势」图里的异常小时 */
  anomaly: boolean
  /** 异常小时内的具体发生时刻，精确到秒，如 9月10日 18时23分07秒（仅「请求成功趋势」异常点提供，悬浮层用） */
  at?: string
  /** 异常描述（仅「请求成功趋势」异常点提供，悬浮层用） */
  cause?: string
}

/** 「查看性能」弹窗所需的完整数据集 */
export interface ModelPerformance {
  /** 头部指标卡：全部已采集数据的平均吞吐，单位 tokens/秒 */
  tps: number
  /** 头部指标卡：全部已采集数据的平均会话时长（响应完成时间 − 请求发送时间），单位秒 */
  avgLatency: number
  /** 头部指标卡：全部已采集数据的首 Token 平均延迟，单位秒（与明细页「首 Token 平均延迟」同源） */
  avgFirstTokenLatency: number
  /** 头部指标卡：全部已采集数据的缓存命中率，百分比数值 */
  cacheHitRate: number
  /** 头部指标卡：全部已采集数据的请求成功率，百分比数值 */
  successRate: number
  /** 近 24 小时内的异常小时数（趋势图与「N 起事件」悬浮层口径） */
  anomalyBuckets: number
  /** 全部已采集数据内的异常小时数，头部请求成功率卡片口径 */
  weekAnomalyHours: number
  /** 逐小时明细，按「当前小时 → 24 小时前」倒序排列 */
  hourlyStats: PerfHourStat[]
  /** 最近 7 天的逐小时明细（倒序）：弹窗明细只展示末尾 24 小时，全量供「模型性能明细（小时）」页使用 */
  longHourlyStats: PerfHourStat[]
  /** 与 longHourlyStats 同序（倒序）的逐小时异常事件明细，供「模型性能明细（小时）」页悬浮层展示 */
  weekEvents: HourlyPerfEvent[][]
  /** 首 Token 延迟趋势，单位毫秒（逐小时首 Token 平均延迟，与「首 Token 平均延迟」卡片同源） */
  firstTokenTrend: PerfHourPoint[]
  /** 请求成功趋势，单位百分比（逐小时请求成功率，与「请求成功率」卡片同源） */
  availabilityTrend: PerfHourPoint[]
}

/** 「模型性能明细（小时）」页：单个异常事件（异常数量悬浮层逐条展示） */
export interface HourlyPerfEvent {
  /** 异常发生的具体时间，精确到秒，如 9月11日 16时44分02秒 */
  at: string
  /** 异常描述，如 网关请求超时 504 */
  cause: string
}

/** 「模型性能明细（小时）」页的一行：某渠道模型在某个采集小时的运行明细 */
export interface HourlyPerfRow {
  /** 行唯一键：渠道模型 id + 采集小时 */
  key: string
  /** 采集时间（年月日时），如 2026-09-12 09:00 */
  collectedAt: string
  /** 采集时间对应的毫秒时间戳，用于时间范围过滤 */
  collectedTs: number
  channelId: string
  channelName: string
  modelName: string
  /** 该小时内的异常事件列表 */
  events: HourlyPerfEvent[]
  /** 该小时内（首个 Token 到达时间 − 请求发送时间）的平均值，单位秒（弹窗「首 Token 延迟 (TTFT)」同源） */
  firstTokenLatency: number
  /** 该小时 Token 吞吐量，tokens/秒：窗口内所有并发请求的聚合速率（弹窗「Token 吞吐量」同源） */
  throughput: number
  /** 该小时 TPS，tokens/秒：单请求速率 = Token 吞吐量 ÷ 平均并发，恒低于吞吐量 */
  tps: number
  /** 该小时每个 Token 生成时间（TPOT），单位毫秒：（平均延迟 − 首 Token 延迟）÷ 平均输出 Token 数 */
  tpot: number
  /** 该小时缓存命中率，百分比数值：命中缓存的输入 Token ÷ 输入 Token 总量 */
  cacheHitRate: number
  /** 该小时平均延迟，单位秒 */
  avgLatency: number
  /** 该小时实测请求成功率，百分比数值 */
  requestSuccessRate: number
}

export interface ChannelModelItem {
  id: string
  modelName: string
  channelId: string
  /** 关联的 API 配置 id（渠道下多组 API 配置中的一组） */
  credentialId?: string
  modelCode: string
  endpoints: EndpointMapping[]
  operator: string
  createdAt: string
  costConfig?: ModelCostConfig
  /** 性能概要；缺失时由 perf.ts 按 id 确定性推导 */
  perf?: ChannelModelPerf
}

export type CostPriceType =
  | 'token'
  | 'token_busy_idle'
  | 'token_ladder'
  | 'image_quality'
  | 'image_token'
  | 'video_quality'
  | 'video_quality_token'
  | 'vidu_image_quality'
  | 'video_ai_points'

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
  showReferencePrice?: boolean
}

export type ModelType = 'text' | 'image' | 'video' | 'audio' | 'embedding'
export type PricingMode = 'token' | 'call' | 'image_quality' | 'video_quality_token' | 'free'

export interface ModelApiConfig {
  id: string
  channelId: string
  /** 关联的 API 配置 id（渠道下多组 API 名称中的一组） */
  credentialId?: string
  channelModelId?: string
  modelCode: string
  /** 倍率名称：必填、小于 8 个字，同一模型的多组 API 配置之间不可重复 */
  multiplierName?: string
  modelMultiplier?: number
  channelEnabled?: boolean
  endpointMappings: EndpointMapping[]
  queueEnabled: boolean
  queueLimit: number
  timeout: number
}

/** 分组类型：official 官方分组（后台维护）、custom 用户自定义分组（用户在前台创建，后台不可增删改） */
export type ModelGroupType = 'official' | 'custom'

/** 创建分组的用户信息：仅用户自定义分组有值 */
export interface GroupOwner {
  /** 用户昵称 */
  nickname: string
  /** 手机号：存储完整号码，列表按中间 4 位脱敏展示，筛选时按完整号码匹配 */
  phone: string
  /** 账户ID */
  accountId: string
}

export interface ModelGroup {
  id: string
  name: string
  /** 分组类型：后台新增的一律为官方分组 */
  groupType: ModelGroupType
  modelIds: string[]
  /**
   * 倍率级引用：组内被勾选的 API 配置 id，由后台「添加模型」弹窗或控制台「分档定价 - 加入分组」写入。
   * 组内模型若命中了这些配置，则只展示被选中的倍率；未命中的模型仍按全部倍率展示。
   * 约束：仅用户自定义分组要求同一模型只能有一条倍率进组；后台官方分组可勾选同一模型的多条倍率。
   */
  configIds?: string[]
  description?: string
  /** 是否对外展示：仅官方分组有该状态，用户自定义分组无状态 */
  status?: 'enabled' | 'disabled'
  sort: number
  createdAt: string
  /** 操作人：官方分组为后台管理员，用户自定义分组为创建它的用户 */
  operator: string
  /** 创建用户：仅用户自定义分组展示，官方分组由后台管理员维护无此信息 */
  owner?: GroupOwner
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
  costConfig?: ModelCostConfig
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
