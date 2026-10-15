import { useMemo, useState } from 'react'
import { Typography, Space, Card, Button, Tag, Divider, Segmented, message } from 'antd'
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

interface Props {
  onNavigateTokenPlan?: () => void
}

export default function OfficialWebPage({ onNavigateTokenPlan }: Props) {
  const { plans } = useTokenPlans()
  const [subTab, setSubTab] = useState<'personal' | 'team'>('personal')

  const displayedPlans = useMemo(() => plans.filter((p) => p.status === 'on' && p.level !== 'max'), [plans])

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
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Hero Section */}
        <section style={{ padding: '80px 24px 40px', textAlign: 'center' }}>
          <Title level={1} style={{ fontSize: 56, fontWeight: 700, marginBottom: 16 }}>
            Token Plan{' '}
            <span style={{ background: 'linear-gradient(135deg, #2f6bff 0%, #597ef7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              重磅上线
            </span>
          </Title>
          <Paragraph style={{ fontSize: 17, color: '#555', marginBottom: 24 }}>
            低成本畅用主流大模型，AI 创作与开发更高效。
            <a style={{ color: '#2f6bff', marginLeft: 8, cursor: 'pointer' }} onClick={onNavigateTokenPlan}>Token Plan ↗</a>
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
            请根据自身需求和团队规模灵活订阅
          </Paragraph>

          {/* 个人版/团队版 Tab */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Segmented
              value={subTab}
              onChange={(v) => setSubTab(v as any)}
              options={[
                { label: '个人版', value: 'personal' },
                { label: '企业版', value: 'team' },
              ]}
            />
          </div>

          {/* 月付/季付/年付 */}
          <div style={{ background: '#f7f8fa', borderRadius: 16, padding: 40 }}>
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
                const discounted = calcPlanDiscountedPrice(plan.price, plan.discount ?? 100)
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

        {/* Ad Banner */}
        <section style={{ padding: '0 24px', marginBottom: 24 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #eef4ff 0%, #f5f0ff 50%, #f0f4ff 100%)',
              borderRadius: 16,
              padding: '32px 40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 32,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title level={3} style={{ margin: '0 0 20px', fontSize: 24, color: '#1a1a2e' }}>
                海量模型低价上线，助力行业AI创新
              </Title>
              <Button
                type="primary"
                size="large"
                style={{ background: '#2f6bff', borderRadius: 8, padding: '0 32px', height: 44, fontSize: 15 }}
              >
                立即体验
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
              {[
                { icon: '🗣️', name: '语言模型', value: '1500万+tokens' },
                { icon: '🎙️', name: '语音模型', value: '100万+字符' },
                { icon: '👁️', name: '视觉模型', value: '850万+tokens' },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '20px 24px',
                    textAlign: 'center',
                    minWidth: 130,
                    boxShadow: '0 2px 8px rgba(47, 107, 255, 0.08)',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: '#2f6bff', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resource Pack Showcase */}
        <section style={{ padding: '40px 24px', marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 8, fontSize: 32 }}>
            低价大额度资源包，赋能业务高效落地
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>
            精选多款旗舰模型，限时优惠发布！
          </Paragraph>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            {[
              {
                name: 'Qwen-Max特价尊享包',
                desc: '千问旗舰模型，支持 1M 无损上下文，长程任务执行更稳定，工程规范遵循更可靠。',
                price: '189.90',
                specs: [
                  { label: 'token总量', value: '1亿 Qwen-Max' },
                  { label: '有效期', value: '3个月' },
                ],
              },
              {
                name: 'GPT-4o 畅享包',
                desc: 'GPT-4o 全能模型，支持多模态理解与生成，覆盖文本、图像、音频等多场景。',
                price: '299.00',
                specs: [
                  { label: 'token总量', value: '5000万 GPT-4o' },
                  { label: '有效期', value: '3个月' },
                ],
              },
              {
                name: 'Claude-Opus 旗舰包',
                desc: 'Claude 最高级模型，擅长复杂推理与长文本分析，适合深度研究与内容创作。',
                price: '359.00',
                specs: [
                  { label: 'token总量', value: '3000万 Claude-Opus' },
                  { label: '有效期', value: '3个月' },
                ],
              },
              {
                name: '豆包图像创作包',
                desc: '豆包图像生成模型，支持多种风格与分辨率，适合营销素材与视觉创意场景。',
                price: '99.00',
                specs: [
                  { label: '图片总量', value: '5000张' },
                  { label: '有效期', value: '1个月' },
                ],
              },
              {
                name: '豆包声音复刻包',
                desc: '豆包声音复刻模型，支持秒级音色克隆与多风格合成，适合配音与有声书场景。',
                price: '49.00',
                specs: [
                  { label: '字符总量', value: '200万字符' },
                  { label: '有效期', value: '6个月' },
                ],
              },
              {
                name: 'Deepseek-R1 推理包',
                desc: 'Deepseek 推理模型，擅长数学与代码推理，适合复杂逻辑分析与算法辅助场景。',
                price: '159.00',
                specs: [
                  { label: 'token总量', value: '8000万 Deepseek-R1' },
                  { label: '有效期', value: '3个月' },
                ],
              },
            ].map((pack) => (
              <Card
                key={pack.name}
                hoverable
                style={{
                  borderRadius: 8,
                  border: '1px solid #eef0f4',
                  background: '#fff',
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: '24px 24px 20px' } }}
                onClick={() => message.info(`即将跳转到 ${pack.name} 购买页面`)}
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>
                  {pack.name}
                </div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.8, marginBottom: 16, minHeight: 60 }}>
                  {pack.desc}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, color: '#ff7875', marginRight: 2 }}>¥</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#ff7875', lineHeight: 1 }}>{pack.price}</span>
                </div>
                <div style={{ borderTop: '1px solid #eef0f4', paddingTop: 12, marginBottom: 16 }}>
                  {pack.specs.map((s) => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#999' }}>{s.label}</span>
                      <span style={{ color: '#333', textAlign: 'right' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <Button
                  type="primary"
                  block
                  style={{ height: 36 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    message.success(`已选择 ${pack.name}，即将跳转购买`)
                  }}
                >
                  立即购买
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Supported AI Tools */}
        <section style={{ padding: '40px 24px', marginBottom: 40 }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 8, fontSize: 32 }}>
            支持的 AI 工具
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>
            Token Plan 支持兼容 OpenAI / Anthropic 协议的主流工具
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
      </div>
    </div>
  )
}
