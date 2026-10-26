import { useMemo, useState } from 'react'
import { Typography, Button, Segmented, Space, Modal, Tag, message } from 'antd'
import {
  CheckOutlined,
  CodeOutlined,
  ToolOutlined,
  ThunderboltFilled,
  ThunderboltOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'
import { useModels, usePlanModels, useTokenPlans } from '../store'
import { calcPlanDiscountedPrice, type TokenPlan } from '../types'
import { modelTypeLabel, SHOW_ENTERPRISE } from '../constants'

const { Title, Text, Paragraph } = Typography

const HERO_BG = new URL('../assets/web-tokenplan-hero.jpg', import.meta.url).href

/** 支持的 AI 工具品牌图标（来自各品牌官网，本地化存放）；accent 为品牌主色，用于图标光晕与三点装饰 */
const AI_TOOLS = [
  { name: 'Claude Code', icon: new URL('../assets/ai-tool-claude.png', import.meta.url).href, accent: '#f0774c', lines: ['Anthropic Claude', '智能编码助手'] },
  { name: 'Codex', icon: new URL('../assets/ai-tool-codex.svg', import.meta.url).href, accent: '#9aa3af', lines: ['OpenAI 官方', '编码智能体'] },
  { name: 'WorkBuddy', icon: new URL('../assets/ai-tool-workbuddy.svg', import.meta.url).href, accent: '#2ecf9e', lines: ['你的 AI 编程', '协作伙伴'] },
  { name: 'TraeWork', icon: new URL('../assets/ai-tool-traework.png', import.meta.url).href, accent: '#9aa3af', lines: ['AI 驱动的', '开发工作流'] },
  { name: 'CodeBuddy', icon: new URL('../assets/ai-tool-codebuddy.svg', import.meta.url).href, accent: '#7b7bff', lines: ['智能编码助手', '高效编程'] },
  { name: 'TraeCode', icon: new URL('../assets/ai-tool-traecode.png', import.meta.url).href, accent: '#34d399', lines: ['新一代 AI', '编程工具'] },
  { name: 'OpenCode', icon: new URL('../assets/ai-tool-opencode.png', import.meta.url).href, accent: '#9aa3af', lines: ['开源 AI 编码', '解决方案'] },
  { name: 'Cursor', icon: new URL('../assets/ai-tool-cursor.png', import.meta.url).href, accent: '#9aa3af', lines: ['AI 优先的', '代码编辑器'] },
  { name: 'OpenClaw', icon: new URL('../assets/ai-tool-openclaw.png', import.meta.url).href, accent: '#ef5350', lines: ['开源 AI 模型', '运行平台'] },
]

/** 套餐默认模型清单：后台未为该套餐配置模型时回退使用（与控制台订购页一致） */
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

interface Props {
  /** 点击「立即订阅」：由外层决定跳转（未登录先进登录页，登录后落到该套餐的结算页；传 null 表示企业版 mock 卡，落 Token Plan 概览） */
  onSubscribe?: (plan: TokenPlan | null) => void
}

export default function OfficialWebPage({ onSubscribe }: Props) {
  const { plans } = useTokenPlans()
  const [subTab, setSubTab] = useState<'personal' | 'team'>('personal')

  const displayedPlans = useMemo(() => plans.filter((p) => p.status === 'on' && p.level !== 'max'), [plans])

  /** 卡片悬浮态：套餐卡片使用 */
  const [hoverPlanId, setHoverPlanId] = useState<string | null>(null)

  /** 可用模型：后台「配置模型」优先（可见、按名称去重），未配置回退默认清单——与控制台订购页同规则 */
  const { planModels } = usePlanModels()
  const { models } = useModels()
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

  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [modalPlanTitle, setModalPlanTitle] = useState('')
  const [modalModels, setModalModels] = useState<{ name: string; type: string }[]>([])

  const heroFeatures = [
    {
      icon: <CodeOutlined />,
      iconBg: '#e8f0ff',
      iconColor: '#2f6bff',
      title: '全模型一站式体验',
      desc: '一个 API Key，畅用无限可能。在统一订阅体系下，无缝调用文本、语音、图像等全域 AI 能力。',
      tags: ['qwen3.6-flash', 'glm-5.2', 'deepseek-v4-pro', 'wan2.7-image-pro'],
      deco: (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <rect x="14" y="30" width="28" height="8" rx="3" fill="#c7daff" />
          <rect x="17" y="21" width="22" height="8" rx="3" fill="#9cbcff" />
          <rect x="20" y="12" width="16" height="8" rx="3" fill="#2f6bff" opacity="0.85" />
          <rect x="14" y="42" width="28" height="6" rx="3" fill="#e3ecff" />
        </svg>
      ),
    },
    {
      icon: <ToolOutlined />,
      iconBg: '#e6f7f1',
      iconColor: '#13b58a',
      title: '兼容主流 Coding/Agent 工具',
      desc: '无缝对接你常用的开发工具与 Agent 框架，开箱即用。',
      deco: (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <rect x="8" y="14" width="40" height="28" rx="4" fill="#e3ecff" />
          <rect x="8" y="14" width="40" height="7" rx="4" fill="#c7daff" />
          <circle cx="13" cy="17.5" r="1.4" fill="#2f6bff" opacity="0.6" />
          <rect x="13" y="26" width="18" height="3" rx="1.5" fill="#9cbcff" />
          <rect x="13" y="32" width="26" height="3" rx="1.5" fill="#c7daff" />
        </svg>
      ),
    },
    {
      icon: <ThunderboltFilled />,
      iconBg: '#fff3e6',
      iconColor: '#ff8f1f',
      title: '极致性价比，预算可控',
      desc: '透明计费，无隐藏费用，按量使用，成本精准可控。',
      deco: (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <rect x="10" y="28" width="8" height="18" rx="2" fill="#c7daff" />
          <rect x="24" y="20" width="8" height="26" rx="2" fill="#9cbcff" />
          <rect x="38" y="10" width="8" height="36" rx="2" fill="#2f6bff" opacity="0.85" />
        </svg>
      ),
    },
  ]

  const pricingFeatures = (plan: (typeof displayedPlans)[number]) => {
    const credits = plan.usageLimit >= 10000 ? `${(plan.usageLimit / 10000).toFixed(0).replace(/\.0$/, '')}万` : plan.usageLimit
    const base = [`${credits} Credits / 天`]
    if (plan.level === 'lite') {
      base.push('支持文本、语音等基础模型', '无限调用频率，90+ 模型与 harness 工具', '可同时支持 1-2 个 Agent 并发')
    } else if (plan.level === 'standard') {
      base.push('4 倍于 Lite 套餐用量', '享受 Lite 套餐的所有权益', '可同时支持 3-4 个 Agent 并发')
    } else {
      base.push('16 倍于 Lite 套餐用量', '享受 Standard 套餐的所有权益', '可同时支持 6-8 个 Agent 并发')
    }
    return base
  }

  /** 企业版套餐（点击「企业版」时展示） */
  const TEAM_PLANS = [
    { name: '团队版', price: 899, features: ['10 席位共享使用', '3亿+ Credits / 1天', '团队协作与用量管理', '优先客服支持', '可同时支持 10+ Agent 并发'] },
    { name: '企业版', price: 2999, hot: true, features: ['50 席位共享使用', '15亿+ Credits / 1天', 'API 接入与系统集成', '专属客户经理', 'SLA 99.9% 保障'] },
    { name: '旗舰版', contactSales: true, features: ['不限席位', '私有化部署', '定制模型与配额', '7×24 专属支持', '专属合规与安全方案'] },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#e9eef8',
        fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* ============ Hero ============ */}
      <section style={{ height: 290 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '118px 40px 0', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Title level={1} style={{ fontSize: 46, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.25 }}>
            Token Plan{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #2f6bff 0%, #7b5cff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              重磅上线
            </span>
          </Title>
          <Paragraph style={{ fontSize: 15, color: '#4e5969', margin: '16px 0 0' }}>
            低成本畅用主流大模型，AI 创作与开发更高效。
            <a
              onClick={() => onSubscribe?.(null)}
              style={{ marginLeft: 12, color: '#2f6bff', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              立即体验 Token Plan <ArrowRightOutlined style={{ transform: 'rotate(-45deg)', fontSize: 12 }} />
            </a>
          </Paragraph>
          <div style={{ display: 'flex', gap: 32, marginTop: 22 }}>
            {[
              { icon: <DollarOutlined />, text: '低成本调用' },
              { icon: <SafetyCertificateOutlined />, text: '稳定可靠' },
              { icon: <ThunderboltFilled />, text: '极速响应' },
              { icon: <GlobalOutlined />, text: '全面兼容' },
            ].map((it) => (
              <span key={it.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4e5969' }}>
                <span style={{ color: '#2f6bff', fontSize: 15 }}>{it.icon}</span>
                {it.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 特性手风琴（浅蓝底） ============ */}
      <section style={{ padding: '68px 24px 16px' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(47,107,255,0.08)',
            padding: '8px 28px',
          }}
        >
          {heroFeatures.map((f, idx) => {
            return (
              <div
                key={f.title}
                style={{ borderBottom: idx < heroFeatures.length - 1 ? '1px solid #f0f2f5' : 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', padding: '18px 0' }}>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: f.iconBg,
                      color: f.iconColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </span>
                  <div style={{ flex: 1, marginLeft: 16 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: '#86909c' }}>{f.desc}</div>
                  </div>
                  <span style={{ flexShrink: 0, marginLeft: 16 }}>{f.deco}</span>
                </div>
                {f.tags && (
                  <div style={{ padding: '0 0 16px 56px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {f.tags.map((t) => (
                      <span
                        key={t}
                        style={{ background: '#f5f6f8', color: '#4e5969', borderRadius: 16, padding: '5px 14px', fontSize: 13 }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ============ 定价区 ============ */}
        <div id="tp-section-tokenPlan" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 0 0', scrollMarginTop: 80 }}>
          <Title level={2} style={{ textAlign: 'center', margin: 0, fontSize: 32, color: '#1a1a1a', fontWeight: 700 }}>
            <Space size={8} align="center">
              首发 · 限时优惠
              <RequirementDot
                title="首发 · 限时优惠 — 需求点"
                sections={[
                  {
                    label: '',
                    items: [
                      '1. 展示后台配置的上架的套餐，根据排序数字由小到大（页面从左到右）展示。',
                      '2. 设置产品标签的，在右上角展示产品标签的文字。',
                      '3. 设置「默认选中产品」的，该产品默认选中；鼠标悬浮到其他套餐时，选中其他套餐，默认选中套餐不再选中；鼠标不在任何套餐悬浮时，恢复默认状态，选中配置为「默认选中产品」的套餐。',
                      '4. 如未设置划线价，则不展示划线价；不展示划线价时，售价后带单位，如「/月」。',
                      '5. 套餐卡片在价格下方展示 Token 量，取自后台套餐配置，如「Token 量：100,000 Tokens」。',
                      '6. 套餐卡片展示可用模型，与控制台订购页同规则：优先取后台「配置模型」（仅可见、按名称去重），未配置回退默认清单；最多展示 3 个，其余「+N 更多」，点击打开全量模型弹窗，弹窗顶部提示模型不定期上下架规则。',
                      '7. 点击「立即订阅」：已登录的直接跳转到结算页面；未登录的，需要先登录，然后跳转到当前套餐的结算页面。',
                    ],
                  },
                ]}
              />
            </Space>
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#86909c', margin: '10px 0 36px', fontSize: 14 }}>
            请根据自身需求和团队规模灵活订阅
          </Paragraph>

          {SHOW_ENTERPRISE && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Segmented
              value={subTab}
              onChange={(v) => setSubTab(v as 'personal' | 'team')}
              options={[
                { label: '个人版', value: 'personal' },
                { label: '企业版', value: 'team' },
              ]}
            />
          </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {SHOW_ENTERPRISE && subTab === 'team'
              ? TEAM_PLANS.map((tp) => {
                  const isHot = tp.hot
                  return (
                    <div
                      key={tp.name}
                      style={{
                        position: 'relative',
                        borderRadius: 16,
                        padding: 24,
                        background: isHot ? '#161a26' : '#fff',
                        boxShadow: isHot ? '0 16px 40px rgba(20,24,38,0.25)' : '0 10px 30px rgba(31,45,80,0.08)',
                      }}
                    >
                      {isHot && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -12,
                            right: 20,
                            background: '#ff4d4f',
                            color: '#fff',
                            borderRadius: 10,
                            padding: '3px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          Hot
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isHot ? '#fff' : '#2f6bff', marginRight: 8 }} />
                        <span style={{ fontSize: 16, fontWeight: 600, color: isHot ? '#fff' : '#1a1a1a' }}>{tp.name}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                        {tp.contactSales ? (
                          <span style={{ fontSize: 30, fontWeight: 700, color: isHot ? '#fff' : '#1a1a1a', lineHeight: 1.1 }}>联系我们</span>
                        ) : (
                          <>
                            <span style={{ fontSize: 38, fontWeight: 700, color: isHot ? '#fff' : '#1a1a1a', lineHeight: 1.1 }}>¥{tp.price}</span>
                            <span style={{ fontSize: 15, color: isHot ? 'rgba(255,255,255,0.85)' : '#a9b0bd' }}>/月</span>
                          </>
                        )}
                      </div>

                      <div style={{ borderTop: `1px solid ${isHot ? 'rgba(255,255,255,0.1)' : '#f0f2f5'}`, paddingTop: 14, marginBottom: 20 }}>
                        {tp.features.map((feat, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, fontSize: 13, color: isHot ? 'rgba(255,255,255,0.85)' : '#4e5969' }}>
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: isHot ? 'rgba(217,181,106,0.2)' : '#e6f6ee',
                                color: isHot ? '#d9b56a' : '#34b580',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                marginRight: 10,
                                flexShrink: 0,
                              }}
                            >
                              <CheckOutlined />
                            </span>
                            {feat}
                          </div>
                        ))}
                      </div>

                      <Button
                        block
                        size="large"
                        onClick={() => { if (tp.contactSales) { message.success('已提交咨询，销售将尽快联系您') } else { onSubscribe?.(null) } }}
                        style={{
                          height: 40,
                          borderRadius: 8,
                          fontWeight: 500,
                          border: 'none',
                          background: isHot ? '#fff' : '#2f6bff',
                          color: isHot ? '#1a1a1a' : '#fff',
                        }}
                      >
                        {tp.contactSales ? '联系销售' : '立即订阅'}
                      </Button>
                    </div>
                  )
                })
              : displayedPlans.map((plan) => {
              const originalPrice = plan.originalPrice ?? plan.price
              const discounted = calcPlanDiscountedPrice(plan.price, plan.discount ?? 100)
              const isHot = plan.level === 'standard'
              // 默认高亮中间热销卡；套餐区内有悬浮卡时切换为悬浮卡，移开后回到默认
              const planAreaHover = hoverPlanId !== null && !hoverPlanId.startsWith('pack-')
              const isHighlighted = planAreaHover ? hoverPlanId === plan.id : isHot
              return (
                <div
                  key={plan.id}
                  onMouseEnter={() => setHoverPlanId(plan.id)}
                  onMouseLeave={() => setHoverPlanId(null)}
                  style={{
                    position: 'relative',
                    borderRadius: 16,
                    padding: 24,
                    background: isHighlighted ? '#f0f6ff' : '#fff',
                    border: isHighlighted ? '2px solid #2f6bff' : '2px solid #eef0f4',
                    boxShadow: isHighlighted
                      ? '0 0 0 4px rgba(47,107,255,0.14), 0 22px 52px rgba(47,107,255,0.28)'
                      : '0 10px 30px rgba(31,45,80,0.08)',
                    transform: isHighlighted ? 'translateY(-12px) scale(1.02)' : 'none',
                    transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s ease, background .25s ease',
                    cursor: 'pointer',
                  }}
                >
                  {plan.productTag && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -13,
                        right: 24,
                        background: '#2f6bff',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '3px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {plan.productTag}
                    </span>
                  )}
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{plan.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 38, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.1 }}>
                      ¥{discounted.toFixed(2)}
                    </span>
                    {plan.originalPrice != null && plan.originalPrice > 0 ? (
                      <span style={{ fontSize: 14, color: '#a9b0bd', textDecoration: 'line-through' }}>
                        ¥{originalPrice.toFixed(2)}/月
                      </span>
                    ) : (
                      // 未设置划线价时不展示划线价，售价后带单位
                      <span style={{ fontSize: 14, color: '#86909c' }}>/月</span>
                    )}
                  </div>

                  {/* Token 量：价格下方分割线后加粗展示（来自后台套餐配置的 totalTokens） */}
                  <div
                    style={{
                      borderTop: '1px solid #f0f2f5',
                      paddingTop: 14,
                      marginBottom: 14,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1a1a1a',
                    }}
                  >
                    Token 量：{(plan.totalTokens ?? 0).toLocaleString()} Tokens
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    {pricingFeatures(plan).map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, fontSize: 13, color: '#4e5969' }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: '#e6f6ee',
                            color: '#34b580',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            marginRight: 10,
                            flexShrink: 0,
                          }}
                        >
                          <CheckOutlined />
                        </span>
                        {feat}
                      </div>
                    ))}

                    {/* 可用模型：与控制台订购页同规则 */}
                    {(() => {
                      const ms = modelsOfPlan(plan)
                      const MAX_SHOW = 3
                      const showModels = ms.slice(0, MAX_SHOW)
                      const hasMore = ms.length > MAX_SHOW
                      return (
                        <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px dashed #e5e7eb' }}>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            可用模型（{ms.length}个）
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
                                  setModalModels(ms)
                                  setModelModalOpen(true)
                                }}
                                style={{
                                  margin: 0,
                                  borderRadius: 4,
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  background: '#f0f6ff',
                                  borderColor: '#2f6bff',
                                  color: '#2f6bff',
                                  cursor: 'pointer',
                                }}
                              >
                                +{ms.length - MAX_SHOW} 更多
                              </Tag>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <Button
                    block
                    size="large"
                    onClick={() => onSubscribe?.(plan)}
                    style={{
                      height: 40,
                      borderRadius: 8,
                      fontWeight: 500,
                      border: 'none',
                      background: isHighlighted ? 'linear-gradient(90deg, #2f6bff 0%, #5b8cff 100%)' : '#e8efff',
                      color: isHighlighted ? '#fff' : '#2f6bff',
                      boxShadow: isHighlighted ? '0 8px 20px rgba(47,107,255,0.35)' : 'none',
                      transition: 'background .25s ease, color .25s ease, box-shadow .25s ease',
                    }}
                  >
                    立即订阅
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 可用模型弹窗（套餐卡片「+N 更多」） */}
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
                style={{ margin: 0, borderRadius: 4, fontSize: 11 }}
                color={m.type.includes('文本') ? 'blue' : m.type.includes('图像') ? 'purple' : 'orange'}
              >
                {m.type}
              </Tag>
            </div>
          ))}
        </div>
      </Modal>

      {/* ============ 加油包（官网宣传，无实际产品） ============ */}
      <section id="tp-section-resourcePack" style={{ padding: '98px 24px 0', scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', margin: 0, fontSize: 30, color: '#1a1a1a', fontWeight: 700 }}>
            低价大额度加油包，赋能业务高效落地
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#86909c', margin: '10px 0 24px', fontSize: 14 }}>
            大额度一次补足，灵活叠加不清零！
          </Paragraph>
          {/* 浅蓝渐变底带 + 白色卡片（1:1 参考图样式） */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              background: 'linear-gradient(180deg, #edf3fe 0%, #f2f1fb 100%)',
              borderRadius: 24,
              padding: '40px 28px',
            }}
          >
            {[
              { icon: <DollarOutlined />, name: '大额补给', desc: '一次性补足 Tokens 额度，减少充值频次，业务持续在线。' },
              { icon: <AppstoreOutlined />, name: '灵活叠加', desc: '额度可与套餐叠加使用，按需补充，互不冲突。' },
              { icon: <GlobalOutlined />, name: '多模覆盖', desc: '文本、图像、语音等多种模型额度通用，一个加油包全搞定。' },
              { icon: <ThunderboltOutlined />, name: '长效可用', desc: '超长有效期，额度未用完不清零，安心规划业务用量。' },
            ].map((item) => (
              <div
                key={item.name}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '40px 24px 32px',
                  textAlign: 'center',
                  boxShadow: '0 12px 30px rgba(93,124,255,0.10)',
                }}
              >
                {/* 3D 托盘式图标：斜置托盘 + 圆形徽章 + 底部投影 */}
                <span style={{ position: 'relative', width: 96, height: 88, display: 'inline-block', marginBottom: 20 }}>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 84,
                      height: 30,
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, #f0f5ff 0%, #dce7fc 100%)',
                      boxShadow: '0 10px 18px rgba(93,124,255,0.22)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #eef4ff 100%)',
                      border: '1px solid #e2ebff',
                      color: '#2f6bff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      boxShadow: '0 10px 20px rgba(93,124,255,0.16)',
                    }}
                  >
                    {item.icon}
                  </span>
                </span>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 }}>{item.name}</div>
                <div style={{ fontSize: 14, color: '#7a8aa8', lineHeight: 1.9, minHeight: 54 }}>{item.desc}</div>
                <span
                  style={{
                    display: 'block',
                    width: 36,
                    height: 3,
                    borderRadius: 2,
                    background: '#2f6bff',
                    opacity: 0.85,
                    margin: '20px auto 0',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 支持的 AI 工具 ============ */}
      <section
        id="tp-section-aiTools"
        style={{
          padding: '84px 24px 110px',
          scrollMarginTop: 80,
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', margin: 0, fontSize: 42, color: '#1a1a1a', fontWeight: 800, letterSpacing: 1 }}>
            支持的{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #2f6bff 0%, #7b5cff 55%, #22c55e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AI
            </span>{' '}
            工具
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#4e5969', margin: '16px 0 0', fontSize: 15 }}>
            Token Plan 支持兼容 <span style={{ color: '#7b5cff', fontWeight: 500 }}>OpenAI</span> /{' '}
            <span style={{ color: '#22c55e', fontWeight: 500 }}>Anthropic</span> 协议的主流工具
          </Paragraph>
          <style>{`
            .ai-tool-item { transition: transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1); }
            .ai-tool-item:hover { transform: translateY(-10px); }
            .ai-tool-item .ai-tool-icon { transition: transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1); }
            .ai-tool-item:hover .ai-tool-icon { transform: scale(1.15) rotate(-3deg); }
            .ai-tool-item .ai-tool-glow { opacity: 0.6; transform: translateX(-50%); transition: opacity 0.35s ease, transform 0.35s ease; }
            .ai-tool-item:hover .ai-tool-glow { opacity: 1; transform: translateX(-50%) scaleX(1.2); }
            .ai-tool-item .ai-tool-name { transition: color 0.3s ease; }
            .ai-tool-item:hover .ai-tool-name { color: var(--accent); }
            .ai-tool-item .ai-tool-dot { transition: transform 0.3s ease; }
            .ai-tool-item:hover .ai-tool-dot { transform: scale(1.35); }
            .ai-tool-item:hover .ai-tool-dot:nth-child(2) { transition-delay: 0.06s; }
            .ai-tool-item:hover .ai-tool-dot:nth-child(3) { transition-delay: 0.12s; }
          `}</style>
        </div>

        {/* 双行静态展示：首行 5 个、次行 4 个，居中排布 */}
        {[AI_TOOLS.slice(0, 5), AI_TOOLS.slice(5)].map((rowTools, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              columnGap: 24,
              rowGap: 40,
              marginTop: rowIdx === 0 ? 64 : 44,
              padding: '0 24px',
            }}
          >
            {rowTools.map((tool) => (
              <div
                key={tool.name}
                className="ai-tool-item"
                style={{
                  width: 224,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  ...({ '--accent': tool.accent } as Record<string, string>),
                }}
              >
                {/* 图标 + 品牌色光晕 */}
                <span style={{ position: 'relative', width: 96, height: 96, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span
                    className="ai-tool-glow"
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: '50%',
                      width: 92,
                      height: 24,
                      borderRadius: '50%',
                      background: `${tool.accent}40`,
                      filter: 'blur(9px)',
                    }}
                  />
                  <img
                    className="ai-tool-icon"
                    src={tool.icon}
                    alt={tool.name}
                    style={{ position: 'relative', width: 72, height: 72, objectFit: 'contain', display: 'block' }}
                  />
                </span>
                <div className="ai-tool-name" style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', margin: '20px 0 10px' }}>
                  {tool.name}
                </div>
                {tool.lines.map((line) => (
                  <div key={line} style={{ fontSize: 13, color: '#86909c', lineHeight: 1.9 }}>
                    {line}
                  </div>
                ))}
                <span style={{ display: 'inline-flex', gap: 6, marginTop: 16 }}>
                  {[0.9, 0.45, 0.22].map((o) => (
                    <span key={o} className="ai-tool-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: tool.accent, opacity: o }} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* ============ 页脚版权 ============ */}
      <footer style={{ textAlign: 'center', color: '#a9b0bd', fontSize: 13, padding: '14px 0 22px' }}>
        © 2026 智算多多 · 让 AI 更简单
      </footer>
    </div>
  )
}
