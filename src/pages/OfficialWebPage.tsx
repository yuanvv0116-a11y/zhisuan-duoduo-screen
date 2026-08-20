import { useMemo, useState } from 'react'
import { Typography, Space, Card, Button, Tag, Divider, Segmented } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useTokenPlans } from '../store'
import { calcPlanDiscountedPrice } from '../types'

const { Title, Text, Paragraph } = Typography

const AI_TOOLS = [
  { name: 'Qwen Code', icon: '💎' },
  { name: 'Cline', icon: '🎯' },
  { name: 'Claude Code', icon: '✨' },
  { name: 'Cursor', icon: '🎨' },
  { name: 'OpenCode', icon: '🖥️' },
  { name: 'Codex', icon: '🧬' },
  { name: 'Kilo CLI', icon: '🔧' },
  { name: 'OpenClaw', icon: '🐙' },
]

export default function OfficialWebPage() {
  const { plans } = useTokenPlans()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [subTab, setSubTab] = useState<'personal' | 'team'>('personal')

  const displayedPlans = useMemo(() => plans.filter((p) => p.status === 'on'), [plans])

  const heroFeatures = [
    {
      icon: '</>',
      title: '全模态一站式体验',
      desc: '一个 API Key，解锁无限可能。在统一订阅体系下，无缝调用文本、语音、图像等全模态 AI 能力。',
      children: (
        <div style={{ paddingLeft: 24, marginTop: 12 }}>
          <div style={{ background: '#f7f8fa', borderRadius: 8, padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['qwen3.6-flash', 'glm-5.2', 'deepseek-v4-pro', 'wan2.7-image-pro'].map((m) => (
              <Tag key={m} style={{ borderRadius: 16, padding: '4px 12px' }}>{m}</Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: '🛠',
      title: '兼容主流 Coding/Agent 工具',
      desc: '无缝对接你喜爱的开发工具与 Agent 框架，开箱即用。',
    },
    {
      icon: '⚡',
      title: '极致性价比，预算可控',
      desc: '透明计费，无隐藏费用，按需使用，成本精准可控。',
    },
  ]

  const [openFeature, setOpenFeature] = useState<string | null>('全模态一站式体验')

  const pricingFeatures = (plan: typeof displayedPlans[0]) => {
    const base = [
      `${plan.usageLimit >= 10000 ? `${(plan.usageLimit / 1000).toFixed(0)}万` : plan.usageLimit} Credits / ${plan.validityValue}天`,
    ]
    if (plan.level === 'lite') {
      base.push('支持文本、视觉等多模态模型', '支持联网搜索、知识检索等 harness 工具', '可同时支持 1-2 个 Agent 并发运行')
    } else if (plan.level === 'standard') {
      base.push('4 倍于 Lite 套餐用量', '享受 Lite 套餐的所有权益', '可同时支持 3-4 个 Agent 并发运行')
    } else {
      base.push('16 倍于 Lite 套餐用量', '享受 Standard 套餐的所有权益', '可同时支持 6-8 个 Agent 并发运行')
    }
    return base
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* 顶部 Tab 导航 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#fff',
          zIndex: 10,
          padding: '16px 0',
          borderBottom: '1px solid #eef0f4',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              background: '#f7f8fa',
              borderRadius: 24,
              padding: 4,
              display: 'inline-flex',
              gap: 4,
            }}
          >
            <div
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                background: '#1a1a1a',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#52c41a' }} />
              Token Plan
            </div>
            <div
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                color: '#666',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              API价格
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Hero Section */}
        <section style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
          <Title level={1} style={{ fontSize: 56, fontWeight: 700, marginBottom: 16 }}>
            Token Plan{' '}
            <span style={{ background: 'linear-gradient(135deg, #2f6bff 0%, #597ef7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              重磅升级
            </span>
          </Title>
          <Paragraph style={{ fontSize: 17, color: '#555', marginBottom: 24 }}>
            个人版上线 · 团队版降价 · 低成本畅用 Qwen3.8-Max，AI 创作与开发更高效。
            <a style={{ color: '#2f6bff', marginLeft: 8 }}>Token Plan ↗</a>
          </Paragraph>
        </section>

        {/* Features Section */}
        <section style={{ padding: '40px 24px', marginBottom: 40 }}>
          <div style={{ background: '#f7f8fa', borderRadius: 16, padding: 32 }}>
            {heroFeatures.map((f, idx) => {
              const isOpen = openFeature === f.title
              return (
                <div key={f.title} style={{ marginBottom: idx < heroFeatures.length - 1 ? 24 : 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                    }}
                    onClick={() => setOpenFeature(isOpen ? null : f.title)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 20, fontFamily: 'monospace' }}>{f.icon}</span>
                        <Title level={4} style={{ margin: 0 }}>
                          {f.title}
                        </Title>
                      </div>
                      <Paragraph style={{ color: '#666', margin: 0, paddingLeft: 32 }}>
                        {f.desc}
                      </Paragraph>
                    </div>
                    <PlusOutlined style={{ color: '#999', fontSize: 14, marginTop: 8 }} />
                  </div>
                  {isOpen && f.children && (
                    <div style={{ marginTop: 16, paddingLeft: 32 }}>{f.children}</div>
                  )}
                  {isOpen && <Divider style={{ margin: '16px 0' }} />}
                </div>
              )
            })}
          </div>
        </section>

        {/* Pricing Section */}
        <section style={{ padding: '40px 24px', marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 8, fontSize: 36 }}>
            Token Plan <span style={{ color: '#2f6bff' }}>限时优惠</span>
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>
            Token Plan 支持个人版与团队版，请根据自身需求和团队规模灵活订阅。
          </Paragraph>

          {/* 个人版/团队版 Tab */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Segmented
              value={subTab}
              onChange={(v) => setSubTab(v as any)}
              options={[
                { label: '个人版', value: 'personal' },
                { label: '团队版', value: 'team' },
              ]}
            />
          </div>

          {/* 月付/季付/年付 */}
          <div style={{ background: '#f7f8fa', borderRadius: 16, padding: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <Segmented
                value={billingCycle}
                onChange={(v) => setBillingCycle(v as any)}
                options={[
                  { label: '月付', value: 'monthly' },
                  { label: '季付', value: 'quarterly' },
                  { label: '年付', value: 'yearly' },
                ]}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24,
                maxWidth: 900,
                margin: '0 auto',
              }}
            >
              {displayedPlans.map((plan) => {
                const originalPrice = plan.price
                const discounted = calcPlanDiscountedPrice(plan.price, plan.discount)
                const isPro = plan.level === 'pro'

                return (
                  <Card
                    key={plan.id}
                    styles={{ body: { padding: 28 } }}
                    style={{
                      borderRadius: 12,
                      border: '1px solid #eef0f4',
                      position: 'relative',
                      background: isPro ? '#1a1a1a' : '#fff',
                      color: isPro ? '#fff' : 'inherit',
                    }}
                  >
                    {isPro && (
                      <Tag
                        color="red"
                        style={{
                          position: 'absolute',
                          top: -10,
                          right: 16,
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      >
                        Hot
                      </Tag>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isPro ? '#fff' : '#2f6bff',
                          marginRight: 8,
                        }}
                      />
                      <Title
                        level={4}
                        style={{
                          margin: 0,
                          color: isPro ? '#fff' : '#1a1a1a',
                        }}
                      >
                        {plan.name} 套餐
                      </Title>
                    </div>

                    <div style={{ margin: '16px 0' }}>
                      <Space align="baseline">
                        <span
                          style={{
                            fontSize: 36,
                            fontWeight: 700,
                            color: isPro ? '#fff' : '#1a1a1a',
                          }}
                        >
                          ¥{discounted.toFixed(2)}
                        </span>
                        <span style={{ color: isPro ? 'rgba(255,255,255,0.5)' : '#999' }}>
                          ¥{originalPrice.toFixed(2)}/月
                        </span>
                      </Space>
                    </div>

                    <Divider style={{ borderColor: isPro ? 'rgba(255,255,255,0.1)' : '#eef0f4', margin: '16px 0' }} />

                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {pricingFeatures(plan).map((feat, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: isPro ? 'rgba(255,255,255,0.7)' : '#333',
                            fontSize: 13,
                          }}
                        >
                          <span style={{ marginRight: 8 }}>💡</span>
                          {feat}
                        </div>
                      ))}
                    </Space>

                    <Button
                      block
                      size="large"
                      style={{
                        marginTop: 24,
                        height: 44,
                        borderRadius: 8,
                        background: isPro ? '#fff' : 'transparent',
                        color: isPro ? '#1a1a1a' : '#2f6bff',
                        borderColor: isPro ? '#fff' : '#2f6bff',
                        fontWeight: 500,
                      }}
                    >
                      立即订阅
                    </Button>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Supported AI Tools */}
        <section style={{ padding: '40px 24px', marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 8, fontSize: 32 }}>
            支持的 AI 工具
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>
            Token Plan 支持兼容 OpenAI / Anthropic 协议的主流工具
            <a style={{ color: '#2f6bff', marginLeft: 8 }}>了解更多 ↗</a>
          </Paragraph>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            {AI_TOOLS.map((tool) => (
              <Card
                key={tool.name}
                style={{
                  borderRadius: 12,
                  textAlign: 'center',
                  border: '1px solid #eef0f4',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                styles={{ body: { padding: 20 } }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{tool.icon}</div>
                <Text strong>{tool.name}</Text>
              </Card>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: '32px 24px',
            borderTop: '1px solid #eef0f4',
            textAlign: 'center',
            color: '#999',
            fontSize: 13,
          }}
        >
          © 2026 智算多多 · 让 AI 更简单
        </footer>
      </div>
    </div>
  )
}
