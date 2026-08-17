import type { SettlementMethod, BillingType, ModelType, PricingMode } from './types'

export const SETTLEMENT_METHODS: {
  value: SettlementMethod
  label: string
  desc: string
}[] = [
  { value: 'prepaid', label: '预付费（先充值后使用）', desc: '账户余额扣减，余额不足停止服务' },
  { value: 'postpaid', label: '后付费（按账期结算）', desc: '按周期出账后付款' },
  { value: 'credit', label: '授信额度', desc: '给予信用额度，超额停止服务' },
  { value: 'monthly', label: '包年包月', desc: '固定周期一次性付费' },
]

export const BILLING_TYPES: {
  value: BillingType
  label: string
  desc: string
}[] = [
  { value: 'token', label: '按 Token 计费', desc: '区分输入/输出，单位：元/千Tokens' },
  { value: 'call', label: '按调用次数', desc: '每次调用固定价格，单位：元/次' },
  { value: 'gpu_hour', label: '按 GPU 时长', desc: '按算力卡时计费，单位：元/卡时' },
  { value: 'package', label: '包年包月', desc: '固定周期资源包' },
  { value: 'tiered', label: '阶梯计费', desc: '用量越多单价越低' },
  { value: 'free', label: '免费', desc: '不计费' },
]

export const CURRENCIES = [
  { value: 'CNY', label: '人民币 (CNY ¥)' },
  { value: 'USD', label: '美元 (USD $)' },
]

export const BILLING_CYCLES = [
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
]

export const settlementLabel = (v: SettlementMethod) =>
  SETTLEMENT_METHODS.find((s) => s.value === v)?.label ?? v

export const billingLabel = (v: BillingType) =>
  BILLING_TYPES.find((b) => b.value === v)?.label ?? v

export const SYSTEM_ENDPOINTS: {
  key: string
  label: string
  url: string
  desc: string
}[] = [
  { key: 'chat_completions', label: 'Chat Completions', url: '/v1/chat/completions', desc: '对话补全' },
  { key: 'completions', label: 'Completions', url: '/v1/completions', desc: '文本补全' },
  { key: 'embeddings', label: 'Embeddings', url: '/v1/embeddings', desc: '向量嵌入' },
  { key: 'images_generations', label: 'Images Generations', url: '/v1/images/generations', desc: '文生图' },
  { key: 'audio_speech', label: 'Audio Speech', url: '/v1/audio/speech', desc: '语音合成' },
  { key: 'audio_transcriptions', label: 'Audio Transcriptions', url: '/v1/audio/transcriptions', desc: '语音转写' },
  { key: 'rerank', label: 'Rerank', url: '/v1/rerank', desc: '重排序' },
]

export const endpointLabel = (key: string) =>
  SYSTEM_ENDPOINTS.find((e) => e.key === key)?.label ?? key

export const MODEL_TYPES: { value: ModelType; label: string; color: string }[] = [
  { value: 'text', label: '文本生成', color: 'blue' },
  { value: 'image', label: '图像生成', color: 'green' },
  { value: 'video', label: '视频生成', color: 'purple' },
  { value: 'audio', label: '音频生成', color: 'orange' },
  { value: 'embedding', label: '向量嵌入', color: 'cyan' },
]

export const modelTypeLabel = (v: ModelType) =>
  MODEL_TYPES.find((t) => t.value === v)?.label ?? v

export const modelTypeColor = (v: ModelType) =>
  MODEL_TYPES.find((t) => t.value === v)?.color ?? 'default'

export const MODALS = [
  { value: '文本', label: '文本' },
  { value: '图像', label: '图像' },
  { value: '音频', label: '音频' },
  { value: '视频', label: '视频' },
]

export const PRICING_MODES: { value: PricingMode; label: string; color: string }[] = [
  { value: 'token', label: '按 token 计费', color: 'blue' },
  { value: 'call', label: '按调用次数计费', color: 'geekblue' },
  { value: 'image_quality', label: '按图片质量计费', color: 'purple' },
  { value: 'video_quality_token', label: '按视频质量token计费', color: 'green' },
  { value: 'free', label: '免费', color: 'default' },
]

export const pricingModeLabel = (v: PricingMode) =>
  PRICING_MODES.find((p) => p.value === v)?.label ?? v

export const pricingModeColor = (v: PricingMode) =>
  PRICING_MODES.find((p) => p.value === v)?.color ?? 'default'

export const MODEL_CONFIG_ENDPOINTS: string[] = [
  '/v1/messages',
  '/v1/chat/completions',
  '/v1/completions',
  '/v1/images/generations',
  '/v1/images/edits',
  '/v1/videos',
  '/v1/videos/{taskId}',
  '/v1/videos/{taskId}/content',
  '/contents/generations/tasks',
  '/contents/generations/tasks/{taskId}',
  '/images/generations',
  '/vidu/ent/v2/reference2image',
  '/vidu/ent/v2/reference2image/{taskId}',
  '/vidu/ent/v2/text2video',
  '/vidu/ent/v2/text2video/{taskId}',
  '/vidu/ent/v2/img2video',
  '/vidu/ent/v2/img2video/{taskId}',
  '/vidu/ent/v2/reference2video',
  '/vidu/ent/v2/reference2video/{taskId}',
]
