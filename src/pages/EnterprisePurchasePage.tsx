import { useState } from 'react'
import { Card, Typography, Button, Tag } from 'antd'
import { RightOutlined, ArrowLeftOutlined, ApiOutlined, PayCircleOutlined, ThunderboltFilled, UsergroupAddOutlined, FunctionOutlined, AppstoreOutlined, ThunderboltOutlined, CheckOutlined, BulbOutlined, RocketOutlined, ExperimentOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const ENTERPRISE_PLANS = [
  {
    id: 'light',
    name: '标准套餐',
    subtitle: '享超低单价，适合快速接入、轻量化使用 AI 能力的企业',
    price: '100.00',
    originalPrice: '120.00',
    unit: '元/月',
    features: [
      '智能配置：系统自动匹配模型，覆盖 GLM、Kimi、MiniMax 等多种大模型',
      '团队管理：多 API Key 用量管控，兼顾协作效率与权限管理',
      '预算优化：包月订阅制，企业预算规划更清晰、管理更便捷',
    ],
    models: [
      { name: 'Qwen3.6-27B', type: '文本' },
      { name: 'DODO-AC-Ultra-5', type: '文本' },
      { name: 'Doubao-Seedream-5.0', type: '图像' },
    ],
    totalModelCount: 27,
    bgGradient: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 50%, #f5f0ff 100%)',
    btnText: '立即订阅',
  },
  {
    id: 'pro',
    name: '尊享套餐',
    subtitle: '支持超高并发，提供极具竞争力的用量和价格，适合有规模化 AI 使用需求的大中型企业',
    price: '1000.00',
    originalPrice: '1200.00',
    unit: '元/月',
    features: [
      '灵活选择：多模型自由选配，覆盖 GLM、Kimi、MiniMax 等多种大模型',
      '精细管理：多 API Key 精细化管控，适配企业复杂团队架构与用量分配需求',
      '预算可控：包月订阅制，企业预算统筹更高效，成本管理更精准',
    ],
    models: [
      { name: 'Qwen3.6-72B', type: '文本' },
      { name: 'DODO-AC-Pro-5', type: '文本' },
      { name: 'DeepSeek-V4-Pro', type: '文本' },
    ],
    totalModelCount: 27,
    bgGradient: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 50%, #f5f0ff 100%)',
    btnText: '立即订阅',
  },
]

const ADVANTAGES = [
  {
    icon: <ApiOutlined />,
    title: '一站畅享主流大模型',
    desc: '支持 GLM、Kimi、Qwen等多家模型，按需调用，无需逐家签约对接',
    color: '#52c41a',
    bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    icon: <PayCircleOutlined />,
    title: '低价套餐锁定成本',
    desc: '购买套餐，调用时按实际用量扣减，规避超支风险',
    color: '#fa8c16',
    bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    icon: <ThunderboltFilled />,
    title: '即买即用、超简单',
    desc: '按需创建API Key，分发团队成员即可开始使用',
    color: '#2f6bff',
    bgColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    icon: <UsergroupAddOutlined />,
    title: '团队用量尽在掌握',
    desc: '支持为团队成员分配限额，有效控制成本',
    color: '#722ed1',
    bgColor: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
]

const SCENES = [
  {
    title: '内部研发提效',
    desc: '兼容多种编程工具，提升研发效率',
    icon: <FunctionOutlined />,
    color: '#667eea',
    bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    title: 'C端产品',
    desc: '支持多种应用工具，快速落地',
    icon: <AppstoreOutlined />,
    color: '#43e97b',
    bgGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    title: '运营提效',
    desc: '使用平台Agent提升运营效率',
    icon: <BulbOutlined />,
    color: '#fa709a',
    bgGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
]

interface Props {
  onBack: () => void
  onBuy: (plan: typeof ENTERPRISE_PLANS[0]) => void
}

export default function EnterprisePurchasePage({ onBack, onBuy }: Props) {
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null)
  const [hoveredAdvantageIdx, setHoveredAdvantageIdx] = useState<number | null>(null)
  const [hoveredSceneIdx, setHoveredSceneIdx] = useState<number | null>(null)

  const handleBuy = (plan: typeof ENTERPRISE_PLANS[0]) => {
    onBuy(plan)
  }

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8ecf0',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <a
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              fontSize: 14,
              color: '#5a6474',
              textDecoration: 'none',
            }}
          >
            <ArrowLeftOutlined />
            返回
          </a>
          <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>Token Plan 企业版</span>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px' }}>

        {/* 页面标题 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontSize: 22 }}>Token Plan 企业版</Title>
            <Text type="secondary" style={{ fontSize: 13, marginTop: 6, display: 'block' }}>
              面向企业客户的大模型订阅套餐，支持团队管理与集中控费
            </Text>
          </div>
        </div>

        {/* 套餐卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 40, alignItems: 'stretch' }}>
          {ENTERPRISE_PLANS.map((plan) => {
            const isHovered = hoveredPlanId === plan.id
            return (
              <Card
                key={plan.id}
                styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: isHovered ? '2px solid #7c5cfc' : '1px solid #e8ecf0',
                  background: '#fff',
                  boxShadow: isHovered ? '0 4px 16px rgba(124,92,252,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
                onMouseEnter={() => setHoveredPlanId(plan.id)}
                onMouseLeave={() => setHoveredPlanId(null)}
              >
                {/* 头部 */}
                <div
                  style={{
                    padding: '24px 28px',
                    background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 50%, #f5f0ff 100%)',
                    borderBottom: '1px solid #e8ecf0',
                    minHeight: 110,
                  }}
                >
                  <Text strong style={{ fontSize: 18, color: '#111827', display: 'block', marginBottom: 8 }}>
                    {plan.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>{plan.subtitle}</Text>
                </div>

                {/* 内容区 */}
                <div style={{ padding: '24px 28px', flex: 1 }}>
                  {/* 价格 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: '#ff6b35' }}>¥{plan.price}</span>
                    <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>{plan.unit}</span>
                    {plan.originalPrice && (
                      <span style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through', marginLeft: 8 }}>
                        ¥{plan.originalPrice}
                      </span>
                    )}
                  </div>

                  {/* 特性列表 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <CheckOutlined style={{ color: '#2f6bff', fontSize: 12, marginTop: 4, flexShrink: 0 }} />
                        <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7 }}>{f}</Text>
                      </div>
                    ))}
                  </div>

                  {/* 可用模型 */}
                  <div style={{ paddingTop: 16, borderTop: '1px dashed #e5e7eb' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      可用模型（{plan.totalModelCount}个）
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {plan.models.map((m) => (
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
                      {plan.totalModelCount > plan.models.length && (
                        <Tag
                          style={{
                            margin: 0,
                            borderRadius: 4,
                            fontSize: 11,
                            padding: '2px 8px',
                            background: 'transparent',
                            borderColor: '#e5e7eb',
                            color: '#2f6bff',
                          }}
                        >
                          +{plan.totalModelCount - plan.models.length} 更多
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>

                {/* 按钮区 */}
                <div style={{ padding: '0 28px 28px', marginTop: 'auto' }}>
                  <Button
                    block
                    size="large"
                    style={{
                      height: 44,
                      borderRadius: 8,
                      background: isHovered ? '#2f6bff' : '#fff',
                      color: isHovered ? '#fff' : '#1a1a1a',
                      borderColor: isHovered ? '#2f6bff' : '#e0e0e0',
                      fontWeight: 500,
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => handleBuy(plan)}
                  >
                    {plan.btnText}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        {/* 产品优势 */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 22, background: 'linear-gradient(180deg, #2f6bff 0%, #52c41a 100%)', borderRadius: 2 }} />
            <Text strong style={{ fontSize: 20, color: '#111827' }}>
              产品优势
            </Text>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {ADVANTAGES.map((item, i) => {
              const isHovered = hoveredAdvantageIdx === i
              return (
              <div
                key={i}
                onMouseEnter={() => setHoveredAdvantageIdx(i)}
                onMouseLeave={() => setHoveredAdvantageIdx(null)}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${isHovered ? item.color : '#f0f0f0'}`,
                  background: '#fff',
                  padding: '32px 24px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 20px 40px rgba(0,0,0,0.12), 0 0 0 3px ${item.color}20`
                    : '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                }}
              >
                {/* 图标 */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: item.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    color: '#fff',
                    marginBottom: 20,
                    boxShadow: isHovered
                      ? `0 12px 28px rgba(0,0,0,0.2), 0 0 20px ${item.color}40`
                      : '0 8px 20px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isHovered ? 'scale(1.1) rotate(-5deg)' : 'scale(1) rotate(0)',
                  }}
                >
                  {item.icon}
                </div>
                {/* 标题 */}
                <Text strong style={{ fontSize: 16, color: '#111827', display: 'block', marginBottom: 8, transition: 'color 0.3s' }}>
                  {item.title}
                </Text>
                {/* 装饰线 */}
                <div
                  style={{
                    width: isHovered ? 48 : 32,
                    height: 3,
                    background: item.color,
                    borderRadius: 2,
                    marginBottom: 12,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
                {/* 描述 */}
                <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8, transition: 'color 0.3s' }}>
                  {item.desc}
                </Text>
              </div>
              )
            })}
          </div>
        </div>

        {/* 使用场景 */}
        <div>
          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 22, background: 'linear-gradient(180deg, #2f6bff 0%, #fa8c16 100%)', borderRadius: 2 }} />
            <Text strong style={{ fontSize: 20, color: '#111827' }}>
              使用场景
            </Text>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {SCENES.map((scene, i) => {
              const isHovered = hoveredSceneIdx === i
              return (
              <div
                key={i}
                onMouseEnter={() => setHoveredSceneIdx(i)}
                onMouseLeave={() => setHoveredSceneIdx(null)}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${isHovered ? scene.color : '#f0f0f0'}`,
                  background: '#fff',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 24px 48px rgba(0,0,0,0.15), 0 0 0 4px ${scene.color}15`
                    : '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                }}
              >
                {/* 渐变头部 */}
                <div
                  style={{
                    height: 140,
                    background: scene.bgGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* 装饰圆 */}
                  <div
                    style={{
                      position: 'absolute',
                      width: 160,
                      height: 160,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.12)',
                      top: -60,
                      right: -40,
                      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'scale(1.2) rotate(10deg)' : 'scale(1) rotate(0)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      bottom: -30,
                      left: -20,
                      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'scale(1.3) rotate(-15deg)' : 'scale(1) rotate(0)',
                    }}
                  />
                  {/* 图标容器 */}
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 24,
                      background: 'rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 36,
                      color: '#fff',
                      zIndex: 1,
                      border: '2px solid rgba(255,255,255,0.5)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'scale(1.15) translateY(-5deg)' : 'scale(1) translateY(0)',
                      boxShadow: isHovered ? '0 16px 32px rgba(0,0,0,0.25)' : 'none',
                    }}
                  >
                    {scene.icon}
                  </div>
                </div>
                {/* 内容区 */}
                <div style={{ padding: '24px 20px', transition: 'padding 0.3s' }}>
                  <Text
                    strong
                    style={{
                      fontSize: 16,
                      color: isHovered ? scene.color : '#111827',
                      display: 'block',
                      marginBottom: 8,
                      transition: 'color 0.3s',
                    }}
                  >
                    {scene.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#6b7280',
                      lineHeight: 1.7,
                      transition: 'color 0.3s',
                    }}
                  >
                    {scene.desc}
                  </Text>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
