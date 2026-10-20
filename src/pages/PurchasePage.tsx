import { Fragment, useMemo, useState } from 'react'
import { Card, Typography, Space, Button, Collapse, Tabs, Divider, Modal, Tag, message } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { useModels, usePlanModels, useTokenPlans } from '../store'
import { calcPlanDiscountedPrice, type TokenPlan } from '../types'
import { modelTypeLabel, SHOW_ENTERPRISE } from '../constants'

const PLAN_MODELS: Record<string, { name: string; type: string }[]> = {
  lite: [
    { name: 'Qwen3.6-27B', type: '文本' },
    { name: 'DODO-AC-Ultra-5', type: '文本' },
    { name: 'Doubao-Seedream-5.0', type: '图像' },
    { name: 'DeepSeek-V4-Flash', type: '文本' },
  ],
  standard: [
    { name: 'Qwen3.6-27B', type: '文本' },
    { name: 'Qwen3.6-72B', type: '文本' },
    { name: 'DODO-AC-Ultra-5', type: '文本' },
    { name: 'Doubao-Seedream-5.0-Pro', type: '图像' },
    { name: 'Doubao-Seedance-2.0', type: '视频' },
    { name: 'DeepSeek-V4', type: '文本' },
  ],
  pro: [
    { name: 'Qwen3.6-27B', type: '文本' },
    { name: 'Qwen3.6-72B', type: '文本' },
    { name: 'GLM-5.2-FP8', type: '文本' },
    { name: 'GLM-5.2', type: '文本' },
    { name: 'DODO-AC-Ultra-5', type: '文本' },
    { name: 'DODO-AC-Pro-5', type: '文本' },
    { name: 'Doubao-Seedream-5.0-Pro', type: '图像' },
    { name: 'Doubao-Seedance-2.0', type: '视频' },
    { name: 'DeepSeek-V4', type: '文本' },
    { name: 'DeepSeek-V4-Pro', type: '文本' },
  ],
}

const { Title, Text } = Typography

const PLAN_FEATURES: Record<string, { text: string; tooltip?: string }[]> = {
  lite: [
    { text: '2,500 Credits / 7天', tooltip: 'Credits' },
    { text: '文本、图像等多模态模型' },
    { text: '联网搜索与 Harness 工具' },
    { text: '可同时支持 1-2 个 Agent 并发运行' },
  ],
  standard: [
    { text: '10,000 Credits / 7天', tooltip: 'Credits' },
    { text: '享受 Lite 套餐所有权益' },
    { text: '4x Lite 套餐用量' },
    { text: '可同时支持 3-4 个 Agent 并发运行' },
  ],
  pro: [
    { text: '40,000 Credits / 7天', tooltip: 'Credits' },
    { text: '享受 Standard 套餐所有权益' },
    { text: '16x Lite 套餐用量' },
    { text: '可同时支持 6-8 个 Agent 并发运行' },
  ],
}

const FAQS: Record<string, { q: string; a: string }[]> = {
  purchase: [
    { q: 'Token Plan 提供哪些版本？', a: 'Token Plan 提供个人版和企业版。个人版包含 Lite、Standard、Pro 三档套餐；企业版则提供标准和高级两个档位，可支持多人使用和控费。' },
    { q: 'Token Plan 个人版和企业版有什么区别？', a: '个人版需要个人实名认证，仅支持1人使用。企业版需要完成企业认证，支持团队使用、统一支付、集中管理成员和用量，更适合多人协作的企业团队。在开发性能方面，企业版也能满足企业更高的要求。' },
    { q: '可以同时订阅多个吗？', a: '每个实名认证主体下，不同版本（个人版、企业版）的 Token Plan 订阅各限购一个。' },
    { q: '套餐是否支持退订？', a: '个人版和企业版 Token Plan 均不支持退订，订阅前请确认好套餐选择。' },
  ],
  billing: [
    { q: '抵扣规则是什么？', a: 'Token Plan 使用统一用量单位 token。实际消耗取决于每个任务中输入 Token、缓存 Token 和输出 Token 的组合。优先从套餐额度抵扣，额度用尽后从现金账户抵扣，全部用尽后服务暂停。' },
    { q: '套餐额度是否能够多人共用？', a: 'Token Plan 企业版支持按团队成员独立分配额度，Token Plan 团队版 - 共享用量包可以跨席位共同抵扣。' },
    { q: '续费后额度如何计算？', a: '续费仅延长订阅有效期，不会补充当前计费周期的额度。新周期的额度将在当前周期结束后发放。' },
    { q: '套餐额度用完了怎么办？', a: '可购买加油包补充额度，或等待下一计费周期额度重置。' },
  ],
  integration: [
    { q: '套餐有效期为多久？', a: '套餐有效期根据购买情况自动计算。以月付为例，自订阅成功当日开始计算。如3月15日 13点订阅，支持使用到 4月15日 23:59。' },
    { q: '可以修改套餐吗？', a: '订阅套餐后，在用量或时间未结束之前，不支持修改。用量或时间结束后，可重新选择套餐。' },
    { q: '套餐支持自动续费吗？', a: '暂不支持自动续费。' },
  ],
  product: [
    { q: 'Token Plan 可以生成多个 API Key 吗？', a: '当前每个个人用户支持创建 5 个 API Key，企业支持创建 10 个。如果密钥泄漏，可在「控制台 » Token 工厂 » API Key 管理」页面重置以生成新密钥，重置后原密钥立即失效。' },
    { q: '如何查看套餐用量？', a: '在「我的订阅」页面可以刷新和查看用量消耗情况。' },
  ],
}

const FAQ_TAB_LABELS: Record<string, string> = {
  purchase: '订阅',
  billing: '计费与额度',
  integration: '套餐规则',
  product: '其他',
}

// 开关关闭时：过滤掉提及企业版的 FAQ 条目，整组为空则隐藏该分组（FAQS 原文不删）
const FAQ_GROUPS: { key: string; label: string; items: { q: string; a: string }[] }[] = Object.entries(FAQS)
  .map(([key, items]) => ({
    key,
    label: FAQ_TAB_LABELS[key],
    items: SHOW_ENTERPRISE ? items : items.filter((f) => !f.q.includes('企业') && !f.a.includes('企业')),
  }))
  .filter((g) => g.items.length > 0)

const STEPS = [
   { num: 1, title: '选择套餐', desc: '根据您的使用需求，选择并订阅合适的 Token Plan 套餐。' },
  { num: 2, title: '获取密钥', desc: '登录控制台，在“Token plan”→“我的订阅”→“专属 API KEY”中，创建您的专属 API-Key。' },
  { num: 3, title: '开发调用', desc: '在“我的订阅”→“可使用模型”中挑选适配您业务场景的大模型，调用模型服务，让 AI 生产力为您的代码赋能。' },
]

/* 步骤插画：购物袋 / 钥匙 / 代码窗口（紫色系） */
const STEP_ICONS = [
  <svg key="bag" width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="12" y="22" width="40" height="34" rx="6" fill="#e4dcff" />
    <path d="M22 26V20a10 10 0 0 1 20 0v6" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
    <circle cx="46" cy="46" r="9" fill="#7c5cfc" />
    <path d="M42 46l3 3 5.5-5.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="key" width="64" height="64" viewBox="0 0 64 64" fill="none">
    <circle cx="24" cy="26" r="13" fill="#a78bfa" />
    <circle cx="24" cy="26" r="5" fill="#f6f4fe" />
    <path d="M33 34l18 18" stroke="#7c5cfc" strokeWidth="7" strokeLinecap="round" />
    <path d="M43 44l6-6M48 49l6-6" stroke="#7c5cfc" strokeWidth="5" strokeLinecap="round" />
  </svg>,
  <svg key="code" width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="8" y="14" width="48" height="38" rx="6" fill="#a78bfa" />
    <circle cx="16" cy="22" r="2.6" fill="#fff" />
    <circle cx="24" cy="22" r="2.6" fill="#e4dcff" />
    <path d="M26 32l-7 6 7 6M38 32l7 6-7 6" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
]

const HERO_POINTS = ['灵活扩展', '质优价低', '安全可靠']

const PLAN_THEMES: Record<string, { icon: string; iconBg: string }> = {
  lite: { icon: '🌱', iconBg: '#e6f7ec' },
  standard: { icon: '💎', iconBg: '#f1edff' },
  pro: { icon: '👑', iconBg: '#fff4e0' },
}

export default function PurchasePage({
  onBuy,
  onEnterprise,
  onOpenUsageGuide,
}: {
  onBuy?: (plan: TokenPlan) => void
  onEnterprise?: () => void
  onOpenUsageGuide?: () => void
}) {
  const { plans } = useTokenPlans()
  const displayedPlans = useMemo(() => plans.filter((p) => p.status === 'on' && p.level !== 'max'), [plans])
  const { planModels } = usePlanModels()
  const { models } = useModels()

  /** 后台「配置模型」优先：本套餐配置过的模型按名称去重展示；未配置时回退写死的 PLAN_MODELS */
  const modelsOfPlan = useMemo(() => {
    const typeByName = new Map(models.map((m) => [m.name, m.type]))
    return (plan: TokenPlan): { name: string; type: string }[] => {
      const rows = planModels.filter((r) => r.planId === plan.id && r.visible !== false)
      if (rows.length === 0) return PLAN_MODELS[plan.level ?? ''] || []
      const seen = new Set<string>()
      const out: { name: string; type: string }[] = []
      for (const r of rows) {
        if (seen.has(r.modelName)) continue
        seen.add(r.modelName)
        out.push({ name: r.modelName, type: modelTypeLabel(typeByName.get(r.modelName) ?? 'text') })
      }
      return out
    }
  }, [planModels, models])
  const [purchased, setPurchased] = useState<Record<string, boolean>>({})
  const [activeFaqTab, setActiveFaqTab] = useState(FAQ_GROUPS[0].key)
  const [activeFaqKey, setActiveFaqKey] = useState<string | string[]>(FAQ_GROUPS[0].items[0].q)
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [modalPlanTitle, setModalPlanTitle] = useState('')
  const [modalModels, setModalModels] = useState<{ name: string; type: string }[]>([])

  const handleSubscribe = (planId: string) => {
    const plan = displayedPlans.find((p) => p.id === planId)
    if (!plan) return
    if (onBuy) {
      onBuy(plan)
    } else {
      setPurchased((prev) => ({ ...prev, [planId]: true }))
      message.success('订阅成功')
    }
  }

  const currentFaq = FAQ_GROUPS.find((g) => g.key === activeFaqTab)?.items ?? []
  const handleFaqTabChange = (key: string) => {
    setActiveFaqTab(key)
    const first = FAQ_GROUPS.find((g) => g.key === key)?.items[0]?.q
    if (first) setActiveFaqKey(first)
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* Hero 区（含顶栏），浅紫渐变 */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #f1efff 0%, #f7f6ff 55%, #fdfdff 100%)',
          overflow: 'hidden',
        }}
      >
        {/* 顶栏 */}
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '20px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <a
            onClick={onOpenUsageGuide}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 14,
              color: '#111827',
              fontWeight: 500,
              background: '#fff',
              borderRadius: 8,
              padding: '8px 16px',
              border: '1px solid #e8ecf0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M7 3H14L19 8V21H7V3Z" stroke="#111827" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M14 3V8H19" stroke="#111827" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M10 13H16M10 17H16" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            使用指南
          </a>
        </div>
        {/* 装饰：左侧渐变方块 */}
        <div
          style={{
            position: 'absolute',
            left: '9%',
            top: 120,
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)',
            transform: 'rotate(-8deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(124,92,252,0.12)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M7 17L17 7M17 7H9M17 7V15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* 装饰：右侧渐变方块 */}
        <div
          style={{
            position: 'absolute',
            right: '10%',
            top: 130,
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
            transform: 'rotate(10deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(124,92,252,0.12)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.5 8.5L21 9L16 14L17.5 20.5L12 17L6.5 20.5L8 14L3 9L9.5 8.5L12 2Z" fill="white" opacity="0.9" />
          </svg>
        </div>

        {/* Hero 文案 */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px 24px 68px' }}>
          <Title level={1} style={{ margin: 0, fontSize: 40, fontWeight: 800, color: '#171a2b', letterSpacing: 1 }}>
            选择适合你的 <span style={{ color: '#7c5cfc' }}>Token Plan</span>
          </Title>
          <div style={{ marginTop: 18, fontSize: 14, lineHeight: 2, color: '#6b7280' }}>
            面向开发者的 AI 大模型订阅服务，兼容主流编程与智能体框架。固定月费，畅用旗舰级模型
            <br />
            以更低成本，助力个人与企业开发者高效构建 AI 应用
          </div>
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
            {HERO_POINTS.map((p) => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1f2937', fontWeight: 500 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#2f6bff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 主内容（单列居中） */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 40px 40px' }}>
        {/* 套餐卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>
          {displayedPlans.map((plan) => {
            const discounted =
              typeof (plan as any).discountPrice === 'number' &&
              (plan as any).discountPrice > 0
                ? (plan as any).discountPrice
                : calcPlanDiscountedPrice(plan.price, plan.discount ?? 100)
            const isFullPrice = +(discounted.toFixed(4)) >= +(plan.price.toFixed(4))
            const isStandard = plan.level === 'standard'
            const isHovered = hoveredPlanId === plan.id

            return (
              <Card
                key={plan.id}
                styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: isStandard
                    ? '1.5px solid #7c5cfc'
                    : isHovered
                      ? '1.5px solid #7c5cfc'
                      : '1px solid #e8ecf0',
                  background: '#fff',
                  boxShadow: isHovered
                    ? '0 14px 36px rgba(124,92,252,0.25)'
                    : isStandard
                      ? '0 6px 20px rgba(124,92,252,0.12)'
                      : '0 1px 2px rgba(0,0,0,0.03)',
                  transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                  height: '100%',
                }}
                onMouseEnter={() => setHoveredPlanId(plan.id)}
                onMouseLeave={() => setHoveredPlanId(null)}
              >
                {isStandard && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #7c5cfc 0%, #8b6cff 100%)',
                      color: '#fff',
                      padding: '4px 22px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: '0 0 10px 10px',
                      letterSpacing: 2,
                    }}
                  >
                    推荐
                  </div>
                )}

                <div style={{ padding: isStandard ? '30px 20px 0' : '24px 20px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: PLAN_THEMES[plan.level ?? '']?.iconBg ?? '#f0f4ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 17,
                        flexShrink: 0,
                      }}
                    >
                      {PLAN_THEMES[plan.level ?? '']?.icon ?? '📦'}
                    </div>
                    <Text strong style={{ fontSize: 15, color: '#111827' }}>{plan.name}</Text>
                  </div>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      lineHeight: 1.7,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: 61,
                    }}
                  >
                    {plan.subtitle}
                  </Text>
                </div>

                <div style={{ padding: '14px 20px 0' }}>
                  <Space align="baseline" size={4}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: '#ff6b35' }}>¥{discounted.toFixed(0)}</span>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>/月</span>
                    {plan.showOriginalPrice &&
                    typeof plan.originalPrice === 'number' &&
                    plan.originalPrice > 0 ? (
                      <Text delete style={{ marginLeft: 6, fontSize: 13, color: '#9ca3af' }}>
                        ¥{plan.originalPrice.toFixed(0)}/月
                      </Text>
                    ) : (
                      !isFullPrice && (
                        <Text delete style={{ marginLeft: 6, fontSize: 13, color: '#9ca3af' }}>
                          ¥{plan.price.toFixed(0)}/月
                        </Text>
                      )
                    )}
                  </Space>
                </div>

                <Divider style={{ margin: '12px 20px', borderColor: '#f0f0f0' }} />

                <div style={{ padding: '0 20px', flex: 1 }}>
                  {/* 总 Token 量：来自后台套餐配置的 totalTokens */}
                  <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    Token 量：{(plan.totalTokens ?? 0).toLocaleString()} Tokens
                  </div>
                  {(plan.summaryItems && plan.summaryItems.length > 0
                    ? plan.summaryItems.map((text) => ({ text }))
                    : PLAN_FEATURES[plan.level ?? ''] ?? []
                  ).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8, fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>
                      <span style={{ marginRight: 6, fontSize: 12, color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f.text}
                    </div>
                  ))}

                  {/* 可用模型 */}
                  {(() => {
                    const models = modelsOfPlan(plan)
                    const MAX_SHOW = 3
                    const showModels = models.slice(0, MAX_SHOW)
                    const hasMore = models.length > MAX_SHOW
                    return (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e5e7eb' }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                          可用模型（{models.length}个）
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {showModels.map((m) => (
                            <Tag
                              key={m.name}
                              style={{
                                margin: 0,
                                borderRadius: 4,
                                fontSize: 11,
                                padding: '2px 8px',
                                background: '#f5f7fa',
                                borderColor: '#e5e7eb',
                                color: '#4b5563',
                              }}
                            >
                              {m.name}
                            </Tag>
                          ))}
                          {hasMore && (
                            <Tag
                              onClick={() => {
                                setModalPlanTitle(plan.name)
                                setModalModels(models)
                                setModelModalOpen(true)
                              }}
                              style={{
                                margin: 0,
                                borderRadius: 4,
                                fontSize: 11,
                                padding: '2px 8px',
                                background: 'transparent',
                                borderColor: '#e5e7eb',
                                color: '#2f6bff',
                                cursor: 'pointer',
                              }}
                            >
                              +{models.length - MAX_SHOW} 更多
                            </Tag>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div style={{ padding: '24px 20px 24px' }}>
                  <Button
                    block
                    size="large"
                    style={{
                      height: 40,
                      borderRadius: 8,
                      ...(isStandard
                        ? {
                            background: 'linear-gradient(135deg, #7c5cfc 0%, #8b6cff 100%)',
                            borderColor: 'transparent',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(124,92,252,0.3)',
                          }
                        : {
                            background: isHovered ? '#f8f9fb' : '#fff',
                            color: '#1a1a1a',
                            borderColor: isHovered ? '#7c5cfc' : '#e0e0e0',
                          }),
                      fontWeight: 500,
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      {purchased[plan.id] ? '✓ 已订阅' : isStandard ? '推荐订阅 →' : '立即订阅'}
                    </span>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        {/* 企业版订阅（开关关闭时不展示） */}
        {SHOW_ENTERPRISE && (
        <Card
          styles={{ body: { padding: '20px 24px' } }}
          style={{
            marginTop: 24,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #f8f7ff 0%, #f0ebff 100%)',
            border: '1px solid #efe9ff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7c5cfc 0%, #597ef7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="7" r="4" stroke="white" strokeWidth="2"/>
                <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19.005 15.13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11682 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <Text strong style={{ fontSize: 15, color: '#111827', display: 'block', marginBottom: 4 }}>需要企业版套餐？</Text>
              <Text style={{ fontSize: 13, lineHeight: 1.7, color: '#4b5563' }}>
                企业版套餐是面向企业客户的大模型订阅套餐，价格更经济，能满足团队管理、预算可控的核心诉求，助力企业 AI 规模化应用与协作提效。
              </Text>
            </div>
            <Button
              style={{
                background: '#1a1a1a',
                borderColor: '#1a1a1a',
                borderRadius: 8,
                height: 36,
                padding: '0 20px',
                fontWeight: 500,
                fontSize: 13,
                color: '#fff',
                cursor: 'pointer',
              }}
              onClick={() => onEnterprise?.()}
            >
              企业订阅 <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          </div>
        </Card>
        )}

        {/* 使用步骤：横向三环节 */}
        <div
          style={{
            marginTop: 48,
            marginBottom: 48,
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #e8ecf0',
            padding: '32px 40px 40px',
          }}
        >
          {/* 居中标题：两侧点缀菱形与横线 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 28 }}>
            <span style={{ width: 90, height: 1, background: 'linear-gradient(90deg, transparent, #d6ccff)' }} />
            <span style={{ color: '#7c5cfc', fontSize: 13 }}>✦</span>
            <Text strong style={{ fontSize: 20, color: '#171a2b', letterSpacing: 2 }}>使用步骤</Text>
            <span style={{ color: '#7c5cfc', fontSize: 13 }}>✦</span>
            <span style={{ width: 90, height: 1, background: 'linear-gradient(90deg, #d6ccff, transparent)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {STEP_ICONS.map((icon, idx) => {
              const step = STEPS[idx]
              return (
                <Fragment key={step.num}>
                  {idx > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                      <span style={{ color: '#7c5cfc', fontSize: 20, fontWeight: 700 }}>&gt;</span>
                    </div>
                  )}
                  <div
                    style={{
                      position: 'relative',
                      flex: 1,
                      background: '#f6f4fe',
                      borderRadius: 14,
                      padding: '34px 26px 30px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: -14,
                        left: 18,
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: '#7c5cfc',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 15,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {step.num}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>{icon}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#171a2b', marginBottom: 16 }}>{step.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 2, color: '#6b7280', textAlign: 'left' }}>{step.desc}</div>
                  </div>
                </Fragment>
              )
            })}
          </div>
        </div>

        {/* 广告位（已隐藏） */}
        <div
          style={{
            display: 'none',
            position: 'relative',
            width: '100%',
            marginTop: 24,
            borderRadius: 16,
            padding: '44px 48px',
            background: 'linear-gradient(135deg, #f4f2ff 0%, #f8f5ff 50%, #f2f4ff 100%)',
            border: '1px solid #eae7ff',
            overflow: 'hidden',
          }}
        >
          {/* 背景装饰 */}
          <div
            style={{
              position: 'absolute',
              top: -80,
              right: 200,
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,92,252,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -100,
              left: -50,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(89,126,247,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 40 }}>
            {/* 左侧文字区 */}
            <div style={{ flex: 1, zIndex: 1 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#171a2b', lineHeight: 1.4, marginBottom: 14 }}>
                Build the next generation
                <br />
                of <span style={{ color: '#7c5cfc' }}>AI applications</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: '#5a6474', marginBottom: 26 }}>
                集成多种领先模型与工具，提供稳定、灵活、易用的 API 服务
              </div>

              {/* 搜索输入框 */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#fff',
                  borderRadius: 999,
                  padding: '10px 14px 10px 20px',
                  boxShadow: '0 4px 16px rgba(124,92,252,0.06)',
                  minWidth: 340,
                  border: '1px solid #ebeef5',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#8b93a5" strokeWidth="2" />
                  <path d="M21 21L16.65 16.65" stroke="#8b93a5" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span style={{ flex: 1, fontSize: 13, color: '#8b93a5' }}>
                  Search API key or model...
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c5cfc 0%, #597ef7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(124,92,252,0.3)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 右侧图片区 */}
            <div style={{ position: 'relative', width: 360, height: 220, flexShrink: 0, zIndex: 1 }}>
              {/* 浏览器主窗口 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 10,
                  width: 240,
                  height: 130,
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 8px 28px rgba(124,92,252,0.1)',
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c4b5fd' }} />
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa' }} />
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c4b5fd' }} />
                </div>
                <div style={{ width: '60%', height: 6, background: 'linear-gradient(90deg, #e9d5ff, #dbeafe)', borderRadius: 3, marginBottom: 6 }} />
                <div style={{ width: '85%', height: 6, background: 'linear-gradient(90deg, #ede9fe, #e0e7ff)', borderRadius: 3 }} />
              </div>

              {/* 侧边面板 */}
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: 200,
                  height: 170,
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 10px 36px rgba(124,92,252,0.12)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {/* Search API key 项 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#9ca3af' }}>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>Search API key</span>
                </div>

                {/* QWEN 项（高亮） */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(124,92,252,0.06)',
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: 'linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L14.5 8.5L21 9L16 14L17.5 20.5L12 17L6.5 20.5L8 14L3 9L9.5 8.5L12 2Z" stroke="#7c5cfc" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, color: '#5b21b6', fontWeight: 700 }}>QWEN</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4L16 12L4 20V4Z" fill="#7c5cfc" opacity="0.85" />
                    </svg>
                  </div>
                </div>

                {/* DeepSeek 项 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: '#e8f4ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                    }}
                  >
                    🐋
                  </div>
                  <span style={{ fontSize: 11, color: '#5a6474' }}>DeepSeek</span>
                </div>

                {/* AI Tool 项 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#9ca3af' }}>
                    <path d="M6 8L12 4L18 8L12 12L6 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M6 12L12 16L18 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 11, color: '#5a6474' }}>AI Tool</span>
                </div>
              </div>

              {/* 悬浮标签 Token plan */}
              <div
                style={{
                  position: 'absolute',
                  left: -30,
                  top: 40,
                  background: '#fff',
                  borderRadius: 999,
                  padding: '8px 18px 8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 6px 24px rgba(124,92,252,0.12)',
                  border: '1px solid rgba(255,255,255,1)',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #7c5cfc 0%, #597ef7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'rotate(-6deg)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L13.5 8.5L20 9.5L15 14.5L16.5 21L12 17.5L7.5 21L9 14.5L4 9.5L10.5 8.5L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a3a' }}>Token plan</span>
              </div>
            </div>
          </div>
        </div>

        {/* 常见问题 */}
        <div style={{ marginTop: 24 }}>
          <Card
              styles={{ body: { padding: '24px 28px' } }}
              style={{ borderRadius: 12, border: '1px solid #e8ecf0', height: '100%' }}
            >
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 16, color: '#111827', letterSpacing: '0.5px' }}>常见问题</Text>
              </div>
              <Tabs
                activeKey={activeFaqTab}
                onChange={handleFaqTabChange}
                items={FAQ_GROUPS.map((g) => ({ key: g.key, label: g.label }))}
                style={{ marginBottom: 4 }}
                size="small"
              />
              <Collapse
                accordion
                size="small"
                activeKey={activeFaqKey}
                onChange={(key) => setActiveFaqKey((key as unknown as string) || '')}
                expandIconPosition="end"
                style={{ border: 'none', background: 'transparent' }}
                items={currentFaq.map((f) => ({
                  key: f.q,
                  label: <Text style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{f.q}</Text>,
                  children: <Text style={{ lineHeight: 1.9, color: '#4b5563', fontSize: 13 }}>{f.a}</Text>,
                  style: {
                    border: 'none',
                    background: '#f8f9fb',
                    borderRadius: 8,
                    marginBottom: 8,
                  },
                  headerStyle: {
                    background: 'transparent',
                    borderBottom: 'none',
                    padding: '10px 12px',
                    borderRadius: 8,
                  },
                  bodyStyle: {
                    background: 'transparent',
                    borderBottom: 'none',
                    padding: '0 12px 12px',
                  },
                }))}
              />
            </Card>
        </div>
      </div>

      {/* 可用模型弹窗 */}
      <Modal
        title={modalPlanTitle}
        open={modelModalOpen}
        onCancel={() => setModelModalOpen(false)}
        footer={null}
        width={520}
        centered
      >
        <div style={{ marginBottom: 12, fontSize: 12, color: '#8b93a5', lineHeight: 1.7, background: '#f8f9fb', padding: '8px 12px', borderRadius: 6 }}>
          为持续优化用户体验，平台将不定期上架新模型并下架低效模型。订阅套餐即视为同意本规则。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {modalModels.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#f8f9fb',
                borderRadius: 8,
              }}
            >
              <Text strong style={{ fontSize: 13 }}>{m.name}</Text>
              <Tag
                style={{
                  margin: 0,
                  borderRadius: 4,
                  fontSize: 11,
                }}
                color={m.type.includes('文本') ? 'blue' : m.type.includes('图像') ? 'purple' : 'orange'}
              >
                {m.type}
              </Tag>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}