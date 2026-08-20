import { useMemo, useState } from 'react'
import { Card, Typography, Space, Button, Collapse, Tabs, Divider, message } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { useTokenPlans } from '../store'
import { calcPlanDiscountedPrice } from '../types'

const { Title, Text, Paragraph } = Typography

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
    { q: '可以同时购买多个吗？', a: '每个实名认证主体下，不同版本（个人版、企业版）的 Token Plan 订阅各限购一个。' },
    { q: '套餐是否支持退订？', a: '个人版和企业版 Token Plan 均不支持退订，订阅前请确认好套餐选择。' },
  ],
  billing: [
    { q: '抵扣规则是什么？', a: 'Token Plan 使用统一用量单位 token。实际消耗取决于每个任务中输入 Token、缓存 Token 和输出 Token 的组合。优先从订阅额度抵扣，额度用尽后从钱包抵扣，全部用尽后服务暂停。' },
    { q: '订阅额度是否能够多人共用？', a: 'Token Plan 企业版支持按团队成员独立分配额度，Token Plan 团队版 - 共享用量包可以跨席位共同抵扣。' },
  ],
  integration: [
    { q: '如何获取 API Key？', a: '订阅成功后，进入「控制台 → 我的订阅」页面，即可获取该套餐专属的 API Key 和 Base URL，立即开始接入。' },
    { q: '支持哪些编程工具？', a: '支持主流 Coding/Agent 工具：Cline、Claude Code、Cursor、OpenCode、Codex、Kilo CLI 等，开箱即用。' },
    { q: '接入需要多长时间？', a: '获取 API Key 后，按照接入文档配置即可，通常 5 分钟内完成接入并开始调用。' },
  ],
  product: [
    { q: '支持哪些模型？', a: '支持主流文本、图像、视频模型，包括 qwen3.6、glm-5.2、deepseek-v4、wan2.7 等，模型库持续更新中。' },
    { q: '是否支持联网搜索？', a: '支持。所有套餐均内置联网搜索和知识检索能力，Agent 可直接调用获取实时信息。' },
    { q: '支持多少并发？', a: 'Lite 套餐支持 1-2 路并发，Standard 支持 3-4 路，Pro 支持 6-8 路，可满足不同规模的开发需求。' },
  ],
}

const STEPS = [
  { num: 1, title: '选购套餐', desc: '根据您的使用需求，选择并订阅合适的Token Plan套餐。' },
  { num: 2, title: '获取密钥', desc: '登录控制台，在"Token工厂">"配置管理">"API Key管理"中，创建您的专属API-Key。' },
  { num: 3, title: '选择模型', desc: '挑选适配您业务场景的大模型，或直接进入应用广场，体验各专业领域的成熟应用。' },
  { num: 4, title: '开发调用', desc: '集成API-Key，调用模型服务，让AI生产力为您的代码赋能。' },
]

const SELLING_POINTS = [
  { icon: '🧩', title: '多维度售卖', desc: '提供轻量、标准、专业等不同档位，匹配不同角色使用强度，自由搭配' },
  { icon: '🛡️', title: '数据安全', desc: '承诺不使用用户数据进行模型训练与服务优化，满足企业级数据隐私要求' },
  { icon: '🏢', title: '企业管理功能', desc: '提供团队管理，成本管控以及用量统计等功能，解决规模化使用难题' },
]

export default function PurchasePage() {
  const { plans } = useTokenPlans()
  const displayedPlans = useMemo(() => plans.filter((p) => p.status === 'on' && p.level !== 'max'), [plans])
  const [purchased, setPurchased] = useState<Record<string, boolean>>({})
  const [activeFaqTab, setActiveFaqTab] = useState('purchase')
  const [activeFaqKey, setActiveFaqKey] = useState<string | string[]>('Token Plan 提供哪些版本？')
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null)

  const handleSubscribe = (planId: string) => {
    setPurchased((prev) => ({ ...prev, [planId]: true }))
    message.success('订阅成功，即将跳转支付')
  }

  const currentFaq = FAQS[activeFaqTab]
  const handleFaqTabChange = (key: string) => {
    setActiveFaqTab(key)
    const first = FAQS[key]?.[0]?.q
    if (first) setActiveFaqKey(first)
  }

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
        {/* 页头 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <Title level={3} style={{ margin: 0 }}>Token Plan 概览</Title>
          <a style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: '#111827', fontWeight: 500, textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 13H16" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 17H14" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            使用指南
          </a>
        </div>

        {/* 左右布局 - 上半部分 */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 40, alignItems: 'start' }}>
          {/* 左侧 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* 产品介绍 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f6bff' }} />
                <Text strong style={{ fontSize: 16, color: '#111827', letterSpacing: '0.5px' }}>产品介绍</Text>
              </div>
              <Paragraph style={{ fontSize: 13, lineHeight: 1.9, color: '#4b5563', margin: 0 }}>
                Token Plan 是面向开发者的 AI 大模型订阅服务，提供多种文本、图像、视频模型的统一调用能力，兼容主流编程与智能体框架。固定月费订阅，系统自动扣费，助力个人或企业开发者高效构建 AI 应用。
              </Paragraph>
            </div>

            {/* 企业版订阅 */}
            <Card
              styles={{ body: { padding: '20px 24px' } }}
              style={{
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f8f7ff 0%, #f0ebff 100%)',
                border: '1px solid #efe9ff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #7c5cfc 0%, #597ef7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="7" r="4" stroke="white" strokeWidth="2"/>
                    <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19.005 15.13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11682 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <Text strong style={{ fontSize: 15, color: '#111827', letterSpacing: '0.3px' }}>需要企业版订阅？</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.7, display: 'block', marginBottom: 14, color: '#4b5563' }}>
                企业版套餐是面向企业客户的大模型订阅套餐，价格更经济，能满足团队管理、预算可控的核心诉求，助力企业 AI 规模化应用与协作提效。
              </Text>
              <Button
                block
                style={{
                  background: '#1a1a1a',
                  borderColor: '#1a1a1a',
                  borderRadius: 8,
                  height: 36,
                  fontWeight: 500,
                  fontSize: 13,
                  color: '#fff',
                }}
              >
                企业订阅 <RightOutlined style={{ fontSize: 10 }} />
              </Button>
            </Card>

            {/* 卖点展示 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {SELLING_POINTS.map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: '#f0f4ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <Text strong style={{ fontSize: 14, color: '#111827', display: 'block', marginBottom: 4, letterSpacing: '0.2px' }}>{item.title}</Text>
                    <Text style={{ fontSize: 13, lineHeight: 1.8, color: '#6b7280' }}>{item.desc}</Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* 套餐卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>
              {displayedPlans.map((plan) => {
                const discounted = calcPlanDiscountedPrice(plan.price, plan.discount)
                const isFullPrice = plan.discount >= 100
                const isStandard = plan.level === 'standard'
                const isPro = plan.level === 'pro'
                const isHovered = hoveredPlanId === plan.id

                return (
                  <Card
                    key={plan.id}
                    styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
                    style={{
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: isHovered ? '2px solid #7c5cfc' : '1px solid #e8ecf0',
                      background: '#fff',
                      boxShadow: isHovered ? '0 4px 16px rgba(124,92,252,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease',
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
                          top: 8,
                          right: 8,
                          background: '#7c5cfc',
                          color: '#fff',
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 500,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span>推荐</span>
                      </div>
                    )}

                    <div style={{ padding: '24px 20px 0' }}>
                      <Text strong style={{ fontSize: 15, color: '#111827', display: 'block', marginBottom: 6 }}>{plan.name}</Text>
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
                        {!isFullPrice && (
                          <Text delete style={{ marginLeft: 6, fontSize: 13, color: '#9ca3af' }}>¥{plan.price.toFixed(0)}/月</Text>
                        )}
                      </Space>
                    </div>

                    <Divider style={{ margin: '12px 20px', borderColor: '#f0f0f0' }} />

                    <div style={{ padding: '0 20px', flex: 1 }}>
                      {PLAN_FEATURES[plan.level]?.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8, fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>
                          <span style={{ marginRight: 6, fontSize: 12, color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>✓</span>
                          {f.text}
                        </div>
                      ))}
                    </div>

                    <div style={{ padding: '24px 20px 24px' }}>
                      <Button
                        block
                        size="large"
                        style={{
                          height: 36,
                          borderRadius: 8,
                          background: isHovered ? '#1a1a1a' : '#fff',
                          color: isHovered ? '#fff' : '#1a1a1a',
                          borderColor: isHovered ? '#1a1a1a' : '#e0e0e0',
                          fontWeight: 500,
                          fontSize: 13,
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

            {/* 广告位 */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                borderRadius: 12,
                padding: '36px 40px',
                background: 'linear-gradient(135deg, #f5f6ff 0%, #f8f4ff 50%, #f1f4ff 100%)',
                border: '1px solid #e8ecff',
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
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#0f0f23', marginBottom: 14 }}>
                    Token Plan
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a3a', marginBottom: 16 }}>
                    为开发者打造的现代化 AI 开发平台
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: '#5a6474', marginBottom: 28 }}>
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
                      minWidth: 320,
                      border: '1px solid #ebeef5',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="7" stroke="#8b93a5" strokeWidth="2" />
                      <path d="M21 21L16.65 16.65" stroke="#8b93a5" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span style={{ flex: 1, fontSize: 13, color: '#8b93a5' }}>
                      Build the next generation of AI applications
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
          </div>
        </div>

        {/* 下半部分 - 使用步骤和常见问题对齐 */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 40, marginTop: 28, alignItems: 'stretch' }}>
          {/* 使用步骤 */}
          <div>
            <Card
              styles={{ body: { padding: '24px 28px' } }}
              style={{ borderRadius: 12, border: '1px solid #e8ecf0', height: '100%' }}
            >
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 16, color: '#111827', letterSpacing: '0.5px' }}>使用步骤</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {STEPS.map((step, idx) => (
                  <div key={step.num} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: '#fff',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid #d1d5db',
                        }}
                      >
                        {step.num}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: '#e5e7eb', margin: '6px 0' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: idx < STEPS.length - 1 ? 16 : 0, paddingTop: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, color: '#111827' }}>{step.title}</div>
                      <Text style={{ fontSize: 12, lineHeight: 1.6, color: '#6b7280' }}>{step.desc}</Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 常见问题 */}
          <div>
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
                items={[
                  { key: 'purchase', label: '购买' },
                  { key: 'billing', label: '计费与额度' },
                  { key: 'integration', label: '接入与配置' },
                  { key: 'product', label: '产品功能' },
                ]}
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
      </div>
    </div>
  )
}
