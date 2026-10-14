import { useMemo, useState } from 'react'
import { Typography, Button, Segmented, message } from 'antd'
import {
  CheckOutlined,
  CodeOutlined,
  ToolOutlined,
  ThunderboltFilled,
  ThunderboltOutlined,
  AppstoreOutlined,
  ApiOutlined,
  GlobalOutlined,
  LineChartOutlined,
  PictureOutlined,
  AudioOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { useTokenPlans } from '../store'
import { calcPlanDiscountedPrice } from '../types'
import { SHOW_ENTERPRISE } from '../constants'

const { Title, Text, Paragraph } = Typography

const HERO_BG = new URL('../assets/web-tokenplan-hero.jpg', import.meta.url).href

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

/** 资源包（按设计图 8 个） */
const RESOURCE_PACKS = [
  {
    name: 'Qwen-Max特价尊享包',
    icon: <AppstoreOutlined />,
    desc: '千亿级旗舰模型，支持 1M 超长上下文，长链任务处理更稳定。',
    price: '189.00',
    specs: [
      { label: 'token总量', value: '1亿 Qwen-Max' },
      { label: '有效期', value: '3个月' },
    ],
  },
  {
    name: 'GPT-4o 畅享包',
    icon: <ApiOutlined />,
    desc: 'GPT-4o 全能模型，支持多模态理解与生成。',
    price: '299.00',
    specs: [
      { label: 'token总量', value: '5000万 GPT-4o' },
      { label: '有效期', value: '3个月' },
    ],
  },
  {
    name: 'Claude-Opus 旗舰包',
    icon: <GlobalOutlined />,
    desc: 'Claude 最高性能模型，擅长复杂推理与文本分析，适合深度研究与内容创作。',
    price: '359.00',
    specs: [
      { label: 'token总量', value: '3000万 Claude-Opus' },
      { label: '有效期', value: '3个月' },
    ],
  },
  {
    name: 'Deepseek-R1 推理包',
    icon: <ThunderboltOutlined />,
    desc: 'Deepseek 推理模型，擅长推理与代码推理，适合复杂逻辑分析与算法辅助场景。',
    price: '159.00',
    specs: [
      { label: 'token总量', value: '8000万 Deepseek-R1' },
      { label: '有效期', value: '3个月' },
    ],
  },
  {
    name: '豆包图像创作包',
    icon: <PictureOutlined />,
    desc: '豆包图像生成模型，支持多种风格与分辨率，适合营销素材与视觉创意。',
    price: '99.00',
    specs: [
      { label: '图片总量', value: '5000张' },
      { label: '有效期', value: '1个月' },
    ],
  },
  {
    name: '豆包声音复刻包',
    icon: <AudioOutlined />,
    desc: '豆包声音复刻模型，支持秒级音色克隆与多风格生成，适合配音与有声书场景。',
    price: '49.00',
    specs: [
      { label: '字符总量', value: '200万字符' },
      { label: '有效期', value: '6个月' },
    ],
  },
  {
    name: 'Midjourney 绘图包',
    icon: <PictureOutlined />,
    desc: 'Midjourney 高质量绘图，美术级图像生成，激发无限灵感。',
    price: '129.00',
    specs: [
      { label: '图片总量', value: '3000张' },
      { label: '有效期', value: '3个月' },
    ],
  },
  {
    name: 'Suno 音乐创作包',
    icon: <SoundOutlined />,
    desc: 'Suno 音乐生成模型，快速生成高质量音乐，助力创作与商业应用。',
    price: '79.00',
    specs: [
      { label: '歌曲总量', value: '1000首' },
      { label: '有效期', value: '3个月' },
    ],
  },
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
      icon: <CodeOutlined />,
      iconBg: '#e8f0ff',
      iconColor: '#2f6bff',
      title: '全模型一站式体验',
      desc: '一个 API Key，畅用无限可能。在统一订阅体系下，无缝调用文本、语音、图像等全域 AI 能力。',
      tags: ['qwen3.6-flash', 'glm-5.2', 'deepseek-v4-pro', 'wan2.7-image-pro'],
    },
    {
      icon: <ToolOutlined />,
      iconBg: '#e6f7f1',
      iconColor: '#13b58a',
      title: '兼容主流 Coding/Agent 工具',
      desc: '无缝对接你常用的开发工具与 Agent 框架，开箱即用。',
    },
    {
      icon: <ThunderboltFilled />,
      iconBg: '#fff3e6',
      iconColor: '#ff8f1f',
      title: '极致性价比，预算可控',
      desc: '透明计费，无隐藏费用，按量使用，成本精准可控。',
    },
  ]

  const pricingFeatures = (plan: (typeof displayedPlans)[number]) => {
    const credits = plan.usageLimit >= 10000 ? `${(plan.usageLimit / 10000).toFixed(0).replace(/\.0$/, '')}万` : plan.usageLimit
    const base = [`${credits} Credits / 1天`]
    if (plan.level === 'lite') {
      base.push('支持文本、语音等多模态模型', '无限调用频率，90+ 模型与 harness 工具', '可同时支持 1-2 个 Agent 并发')
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
      <section style={{ height: 240 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '150px 40px 0', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Title level={1} style={{ fontSize: 46, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.25 }}>
            Token Plan <span style={{ color: '#2f6bff' }}>重磅上线</span>
          </Title>
          <Paragraph style={{ fontSize: 15, color: '#4e5969', margin: '16px 0 0' }}>
            低成本畅用主流大模型，AI 创作与开放更高效。
            <a style={{ color: '#2f6bff', marginLeft: 8, cursor: 'pointer' }} onClick={onNavigateTokenPlan}>
              Token Plan ↗
            </a>
          </Paragraph>
        </div>
      </section>

      {/* ============ 特性手风琴（浅蓝底） ============ */}
      <section style={{ padding: '88px 24px 16px' }}>
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
        <div id="tp-section-tokenPlan" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 0 28px', scrollMarginTop: 80 }}>
          <Title level={2} style={{ textAlign: 'center', margin: 0, fontSize: 32, color: '#1a1a1a', fontWeight: 700 }}>
            Token Plan <span style={{ color: '#2f6bff' }}>限时优惠</span>
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#86909c', margin: '10px 0 16px', fontSize: 14 }}>
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
                        onClick={() => message.success(tp.contactSales ? '已提交咨询，销售将尽快联系您' : `已选择 ${tp.name}，即将前往订阅`)}
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
              const originalPrice = plan.price
              const discounted = calcPlanDiscountedPrice(plan.price, plan.discount ?? 100)
              const isPro = plan.level === 'pro'
              return (
                <div
                  key={plan.id}
                  style={{
                    position: 'relative',
                    borderRadius: 16,
                    padding: 24,
                    background: isPro ? '#161a26' : '#fff',
                    boxShadow: isPro ? '0 16px 40px rgba(20,24,38,0.25)' : '0 10px 30px rgba(31,45,80,0.08)',
                  }}
                >
                  {isPro && (
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
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: isPro ? '#fff' : '#2f6bff', marginRight: 8 }} />
                    <span style={{ fontSize: 16, fontWeight: 600, color: isPro ? '#fff' : '#1a1a1a' }}>{plan.name} 套餐</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 38, fontWeight: 700, color: isPro ? '#fff' : '#1a1a1a', lineHeight: 1.1 }}>
                      ¥{discounted.toFixed(2)}
                    </span>
                    {isPro && <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>/月</span>}
                    <span style={{ fontSize: 14, color: isPro ? 'rgba(255,255,255,0.4)' : '#a9b0bd', textDecoration: 'line-through' }}>
                      ¥{originalPrice.toFixed(2)}/月
                    </span>
                  </div>

                  <div style={{ borderTop: `1px solid ${isPro ? 'rgba(255,255,255,0.1)' : '#f0f2f5'}`, paddingTop: 14, marginBottom: 20 }}>
                    {pricingFeatures(plan).map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 12, fontSize: 13, color: isPro ? 'rgba(255,255,255,0.85)' : '#4e5969' }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: isPro ? 'rgba(217,181,106,0.2)' : '#e6f6ee',
                            color: isPro ? '#d9b56a' : '#34b580',
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
                    onClick={() => message.success(`已选择 ${plan.name}，即将前往订阅`)}
                    style={{
                      height: 40,
                      borderRadius: 8,
                      fontWeight: 500,
                      border: 'none',
                      background: isPro ? '#fff' : '#2f6bff',
                      color: isPro ? '#1a1a1a' : '#fff',
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

      {/* ============ 蓝色 Banner ============ */}
      <section style={{ padding: '88px 24px 12px' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            background: 'linear-gradient(135deg, #e8f0fe 0%, #edf4ff 55%, #e4edfe 100%)',
            borderRadius: 16,
            padding: '22px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 0 }}>
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #8ab4ff 0%, #4d86ff 100%)',
                transform: 'rotate(45deg)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 8px 20px rgba(47,107,255,0.3)',
              }}
            >
              <AppstoreOutlined style={{ transform: 'rotate(-45deg)', color: '#fff', fontSize: 30 }} />
            </span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>
                模型普惠，创新到位
              </div>
              <Button type="primary" size="large" style={{ borderRadius: 8, height: 40, padding: '0 28px', fontWeight: 500 }}>
                立即体验
              </Button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            {[
              { icon: <AppstoreOutlined />, name: '主流模型' },
              { icon: <LineChartOutlined />, name: '极致性能' },
              { icon: <ThunderboltOutlined />, name: '便捷接入' },
            ].map((item) => (
              <div
                key={item.name}
                style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', textAlign: 'center', width: 148 }}
              >
                <div style={{ color: '#2f6bff', fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a1a' }}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 资源包 ============ */}
      <section id="tp-section-resourcePack" style={{ padding: '100px 24px 0', scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', margin: 0, fontSize: 30, color: '#1a1a1a', fontWeight: 700 }}>
            低价大额度资源包，赋能业务高效落地
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#86909c', margin: '10px 0 24px', fontSize: 14 }}>
            精选多款旗舰模型，限时优惠进行中！
          </Paragraph>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {RESOURCE_PACKS.map((pack) => (
              <div
                key={pack.name}
                style={{
                  border: '1px solid #eef0f4',
                  borderRadius: 12,
                  padding: 16,
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4d86ff 0%, #2f6bff 100%)',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {pack.icon}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3 }}>{pack.name}</span>
                </div>
                <div style={{ fontSize: 12, color: '#86909c', lineHeight: 1.8, marginBottom: 10, minHeight: 40 }}>{pack.desc}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#ff4d4f', marginRight: 2 }}>¥</span>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#ff4d4f', lineHeight: 1 }}>{pack.price}</span>
                </div>
                <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 8, marginBottom: 10 }}>
                  {pack.specs.map((s) => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#a9b0bd' }}>{s.label}</span>
                      <span style={{ color: '#4e5969', textAlign: 'right' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <Button
                  type="primary"
                  block
                  style={{ height: 32, borderRadius: 8, marginTop: 'auto' }}
                  onClick={() => message.success(`已选择 ${pack.name}，即将跳转购买`)}
                >
                  立即购买
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 支持的 AI 工具 ============ */}
      <section
        id="tp-section-aiTools"
        style={{
          padding: '80px 24px 32px',
          scrollMarginTop: 80,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', margin: 0, fontSize: 30, color: '#1a1a1a', fontWeight: 700 }}>
            支持的 AI 工具
          </Title>
          <Paragraph style={{ textAlign: 'center', color: '#86909c', margin: '10px 0 20px', fontSize: 14 }}>
            Token Plan 支持兼容 OpenAI / Anthropic 协议的主流工具
          </Paragraph>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {AI_TOOLS.map((tool) => (
              <div
                key={tool.name}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #eef0f4',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>{tool.icon}</span>
                <Text strong style={{ fontSize: 15, color: '#1a1a1a' }}>
                  {tool.name}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 页脚版权 ============ */}
      <footer style={{ textAlign: 'center', color: '#a9b0bd', fontSize: 13, padding: '14px 0 22px' }}>
        © 2026 智算多多 · 让 AI 更简单
      </footer>
    </div>
  )
}
