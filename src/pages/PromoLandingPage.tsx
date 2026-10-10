import { useMemo, useState } from 'react'
import { Button, Tag, Typography, message } from 'antd'
import {
  CheckCircleFilled,
  DownOutlined,
  GiftOutlined,
  RightOutlined,
  ShareAltOutlined,
  ThunderboltOutlined,
  UpOutlined,
} from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'
import {
  PROMO_GIFT_AMOUNT,
  isCampaignInPeriod,
  useWebPromoCampaign,
} from '../store'

const { Title, Paragraph } = Typography

interface Props {
  onGoConsole?: () => void
}

/** 模型返佣比例列表默认最多展示条数，超出时收起并展示「更多」按钮 */
const MODEL_PREVIEW_LIMIT = 10

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2f6bff 0%, #597ef7 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const stepIcon: Record<number, React.ReactNode> = {
  0: <ShareAltOutlined />,
  1: <ThunderboltOutlined />,
  2: <GiftOutlined />,
}

const PROMO_MODEL_INTRO: Record<string, string> = {
  'DODO-OG-G-6-Astra': '旗舰大模型，长上下文与复杂推理之选',
  'DODO-OG-G-5-6-Sol': '全场景均衡，高性价比之选',
  'DODO-Vision-4': '视觉理解与多模态图文分析',
  'DODO-Veo-Fast': '快速视频生成，出片更快',
  'DeepSeek-V4': '开源实力派，强推理、低价格',
  'GLM-5.3': '对话与工具调用全能选手',
  'Kimi-K3': '超长上下文智能助手',
  'Qwen3.8-Max': '生态成熟的通用大模型',
  'Doubao-Seed-2.0': '多模态通用大模型',
}

const steps = [
  {
    title: '邀请好友',
    desc: '一键分享，邀请好友注册体验',
    perks: [
      { key: '专属链接 · 邀请码', desc: '一键复制，微信、社群、博客随处可发。' },
      { key: '智能生成专属海报', desc: '专属海报，好友扫码直达注册页。' },
    ],
  },
  {
    title: '消耗计佣',
    desc: '好友实名，双方得礼；产生消耗，秒速返佣',
    perks: [
      { key: '免费体验', desc: '好友实名后，立赠一张代金券。' },
      {
        key: '持续返佣',
        desc: '好友每笔现金消耗，按模型比例即时计佣。',
      },
    ],
  },
  {
    title: '佣金发放',
    desc: '真金白银自动入账，可取可兑，灵活自由',
    perks: [
      {
        key: '佣金兑券',
        desc: '佣金可按档位兑换平台代金券，即时到账。',
      },
      { key: '随时提现', desc: '满门槛即可申请提现，审批通过秒到账。' },
    ],
  },
]

const redlines = [
  {
    no: '01',
    title: '只奖真实消费',
    desc: '见面礼与返佣均以被邀请人完成实名认证并产生真实现金消耗为准，注册不算数。',
  },
  {
    no: '02',
    title: '券支付不计佣',
    desc: '用代金券抵扣的消耗部分不参与计佣，只对现金支付的部分计佣，账单明细可逐笔核对。',
  },
  {
    no: '03',
    title: '自邀无效',
    desc: '邀请自己或同一实名主体的互邀不计佣，一经发现刷单现象冻结推广资格。',
  },
]

const faqs = [
  {
    q: '我赚的佣金什么时候变成「可用」？',
    a: `好友产生现金消费后，立即计佣，钱包可查；到达提现门槛，即可提交申请，审批通过后秒到账。`,
  },
  {
    q: '参与推广需要费用或门槛吗？',
    a: `不需要。0 门槛免费参与，开通后即可获得你的专属邀请链接与海报，分享给好友即可开始赚佣金。`,
  },
  {
    q: '返佣能持续多久？',
    a: `自好友首笔现金消耗起开始，好友的每笔现金消耗都为你持续计佣，直到推广活动取消。`,
  },
  {
    q: '每笔佣金按哪个比例算？',
    a: '以每笔消耗当时生效的规则为快照：限时推广活动期间按活动设置的加倍返佣比例计佣，活动结束自动回落；历史流水不随后续规则调整而改变。',
  },
]

const sectionTitleStyle: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 44,
  fontWeight: 800,
  lineHeight: 1.3,
  marginTop: 0,
  marginBottom: 16,
  color: '#141a26',
}

const sectionSubStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#7c8698',
  fontSize: 17,
  lineHeight: 1.9,
  marginBottom: 72,
}

export default function PromoLandingPage({ onGoConsole }: Props) {
  const webCampaign = useWebPromoCampaign()

  /**
   * 返佣比例展示行完全跟随后台「官网上架」活动配置：
   * 未开启官网上架、或该活动未配置返佣模型时，rateRows 为空，
   * 页面顶部的加倍横幅、「查看返佣比例」按钮与下方返佣比例列表一并不展示。
   * 列表按当前返佣比例倒序展示。
   */
  const rateRows = useMemo(() => {
    if (!webCampaign || webCampaign.models.length === 0) return []
    const inPeriod = isCampaignInPeriod(webCampaign)
    return webCampaign.models
      .map((m) => ({
        id: `${webCampaign.id}_${m.modelName}_${m.multiplierName}`,
        modelName: m.modelName,
        intro:
          PROMO_MODEL_INTRO[m.modelName] ??
          (m.category === 'self' ? '智算多多主推模型' : '平台接入的主流模型'),
        multiplier: m.modelMultiplier,
        nowRate: m.boost && inPeriod ? (m.boostRate ?? m.rate) : m.rate,
        boosting: m.boost && inPeriod,
      }))
      .sort((a, b) => b.nowRate - a.nowRate)
  }, [webCampaign])
  const hasRates = rateRows.length > 0
  const campaignActive = useMemo(() => rateRows.some((r) => r.boosting), [rateRows])

  /** 超过 10 条时默认收起，点「更多」展开全部，可再收起 */
  const [ratesExpanded, setRatesExpanded] = useState(false)
  const canExpandRates = rateRows.length > MODEL_PREVIEW_LIMIT
  const visibleRateRows = canExpandRates && !ratesExpanded ? rateRows.slice(0, MODEL_PREVIEW_LIMIT) : rateRows

  const [hoverStep, setHoverStep] = useState(-1)

  const goConsole = () => {
    if (onGoConsole) {
      onGoConsole()
      return
    }
    message.info('请前往控制台 · 推广合伙人 获取专属推广链接')
  }

  const scrollToRates = () => {
    const el = document.getElementById('promo-rates')
    if (!el) return
    const scroller = document.querySelector('main.ant-layout-content')
    if (scroller) {
      const top =
        scroller.scrollTop +
        (el.getBoundingClientRect().top - scroller.getBoundingClientRect().top) -
        16
      scroller.scrollTo({ top, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div style={{ background: '#fff' }}>
      {/* ================= Hero：居中大标题 + 通栏产品预览 ================= */}
      <section
        style={{
          background:
            'radial-gradient(56% 46% at 50% -8%, #e7efff 0%, rgba(231,239,255,0) 70%), linear-gradient(180deg, #fafcff 0%, #ffffff 100%)',
          padding: '104px 24px 120px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          {campaignActive && (
            <div style={{ marginBottom: 32 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 18px',
                    borderRadius: 999,
                    background: '#fff7f0',
                    border: '1px solid #ffbb96',
                    color: '#d4380d',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#fa541c',
                      display: 'inline-block',
                    }}
                  />
                  限时推广 · 指定模型活动期间加倍返佣
                </span>
                <RequirementDot
                  title="加倍返佣横幅 · 需求说明"
                  sections={[
                    {
                      label: '需求内容',
                      items: [
                        '1.如后台添加的分销活动，没有设置在官网推广，则此处不展示；',
                        '2.如设置在官网推广，则检查活动是否有模型配置为加倍分佣，如设置，则展示此处，文案为「限时推广 · 指定模型活动期间加倍返佣」；',
                        '3.如没有模型设置加倍，则不展示。',
                      ],
                    },
                  ]}
                />
              </span>
            </div>
          )}
          <div
            style={{
              color: '#2f6bff',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 6,
              marginBottom: 20,
            }}
          >
            推 广 合 伙 人 计 划
          </div>
          <Title
            level={1}
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: 1,
              marginBottom: 28,
              color: '#141a26',
            }}
          >
            分享一条链接
            <br />
            <span style={{ ...gradientText, whiteSpace: 'nowrap' }}>最高返 40% 佣金</span>
          </Title>
          <Paragraph
            style={{
              fontSize: 18,
              color: '#5c6577',
              lineHeight: 2,
              maxWidth: 720,
              margin: '0 auto 44px',
            }}
          >
            邀请好友，用智算多多——双方有礼，长期返佣，随时兑现
          </Paragraph>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              type="primary"
              size="large"
              onClick={goConsole}
              style={{ borderRadius: 8, height: 52, padding: '0 40px', fontSize: 16, fontWeight: 600 }}
            >
              立即获取专属推广链接
            </Button>
            {hasRates && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <Button
                  size="large"
                  onClick={scrollToRates}
                  style={{ borderRadius: 8, height: 52, padding: '0 32px', fontSize: 16 }}
                >
                  查看返佣比例 <DownOutlined />
                </Button>
                <RequirementDot
                  title="查看返佣比例按钮 · 需求说明"
                  sections={[
                    {
                      label: '需求内容',
                      items: [
                        '1.活动未设置返佣模型，则此处不展示；',
                        '2.如设置后，此处展示按钮，点击后锚定到下方模型返佣比例部分；',
                        '3.点击“立即获取专属推广链接”未登录的跳转到登录页面。登录后跳转到控制台，推广合伙人页面。如已登录，则直接跳转到推广合伙人页面；',
                        '4.底部的按钮同此处一样处理。',
                      ],
                    },
                  ]}
                />
              </span>
            )}
          </div>
          <div style={{ marginTop: 28, color: '#98a1b3', fontSize: 14, letterSpacing: 1 }}>
            0 门槛参与 · 0 垫资 · 专属链接即刻可用
          </div>

          {/* 通栏产品预览（浏览器窗口样式） */}
          <div
            style={{
              maxWidth: 1040,
              margin: '80px auto 0',
              borderRadius: 16,
              border: '1px solid #e3e9f4',
              background: '#fff',
              boxShadow: '0 40px 90px rgba(15,35,95,.14)',
              overflow: 'hidden',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 20px',
                borderBottom: '1px solid #eef1f7',
                background: '#f8fafd',
              }}
            >
              <span style={{ display: 'inline-flex', gap: 7 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f5222d', opacity: 0.55 }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#faad14', opacity: 0.55 }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#d3d9e4' }} />
              </span>
              <span
                style={{
                  flex: 1,
                  maxWidth: 420,
                  margin: '0 auto',
                  background: '#fff',
                  border: '1px solid #e6ebf4',
                  borderRadius: 999,
                  padding: '4px 16px',
                  fontSize: 12,
                  color: '#8a94a6',
                  textAlign: 'center',
                }}
              >
                zhisuanduoduo.com/console/promo
              </span>
            </div>
            <div style={{ padding: '32px 44px 36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <span style={{ color: '#141a26', fontSize: 18, fontWeight: 700 }}>我的推广中心</span>
                <span
                  style={{
                    fontSize: 12,
                    color: '#389e0d',
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 999,
                    padding: '3px 12px',
                  }}
                >
                  ● 推广中
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr',
                  gap: 44,
                  alignItems: 'start',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: '#8a94a6', marginBottom: 10 }}>专属邀请链接</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderRadius: 10,
                      background: '#eef4ff',
                      border: '1px solid #d6e4ff',
                      padding: '12px 16px',
                      marginBottom: 20,
                    }}
                  >
                    <span
                      style={{
                        color: '#3d4a63',
                        fontSize: 14,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      zhisuanduoduo.com/register?ref=ZS8F2K
                    </span>
                    <span style={{ color: '#2f6bff', fontSize: 13, flexShrink: 0 }}>复制链接</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#8a94a6', marginBottom: 10 }}>邀请码</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        letterSpacing: 4,
                        color: '#141a26',
                        background: '#f6f8fc',
                        border: '1px dashed #c9d5ea',
                        borderRadius: 10,
                        padding: '8px 18px',
                      }}
                    >
                      ZS8F2K
                    </span>
                    <span style={{ fontSize: 13, color: '#2f6bff' }}>生成海报</span>
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #eef1f7', paddingLeft: 44 }}>
                  <div style={{ fontSize: 13, color: '#8a94a6', marginBottom: 6 }}>可用佣金（元）</div>
                  <div style={{ ...gradientText, fontSize: 52, fontWeight: 800, lineHeight: 1.15, marginBottom: 24 }}>
                    1,286.40
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                      ['本月佣金', '¥ 428.60'],
                      ['累计已结算', '¥ 2,148.80'],
                      ['邀请 / 实名 / 首耗', '23 / 18 / 12'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 12, color: '#8a94a6', marginBottom: 6 }}>{k}</div>
                        <div style={{ fontSize: 19, fontWeight: 700, color: '#141a26' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {[
                    ['好友 徐** 消费 DeepSeek-V4', '+ ¥ 76.80'],
                    ['好友 马** 完成首充', `+ ¥ ${PROMO_GIFT_AMOUNT}.00`],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 13,
                        padding: '10px 0',
                        borderTop: '1px dashed #eef0f4',
                      }}
                    >
                      <span style={{ color: '#5c6577' }}>{k}</span>
                      <span style={{ color: '#389e0d', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 三步赚佣金 + 关键数字 ================= */}
      <section style={{ padding: '48px 24px 84px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={sectionTitleStyle}>
          三步赚佣金
        </Title>
        <Paragraph style={sectionSubStyle}>无需素材、无需垫资，一条链接就能开始。</Paragraph>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 69,
              left: '16%',
              right: '16%',
              borderTop: '1px dashed #d6e0f5',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, position: 'relative' }}>
            {steps.map((s, idx) => (
              <div
                key={s.title}
                onMouseEnter={() => setHoverStep(idx)}
                onMouseLeave={() => setHoverStep(-1)}
                style={{
                  textAlign: 'center',
                  padding: '36px 28px 28px',
                  background: '#f9fbff',
                  border: '1px solid #e6eeff',
                  borderRadius: 16,
                  transform: hoverStep === idx ? 'translateY(-4px)' : 'none',
                  transition: 'transform .25s',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 24px',
                    borderRadius: 18,
                    background: '#fff',
                    border: '1px solid #d6e4ff',
                    color: '#2f6bff',
                    fontSize: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stepIcon[idx]}
                </div>
                <div style={{ color: '#9db4e8', fontSize: 13, fontWeight: 700, letterSpacing: 4, marginBottom: 10 }}>
                  STEP {idx + 1}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#141a26', marginBottom: 12 }}>{s.title}</div>
                <div style={{ fontSize: 14.5, color: '#6b7385', lineHeight: 1.9 }}>{s.desc}</div>
                <div style={{ borderTop: '1px dashed #dfe7f5', margin: '22px 0 6px' }} />
                {s.perks.map((p) => (
                  <div key={p.key} style={{ display: 'flex', gap: 10, textAlign: 'left', padding: '9px 2px 0' }}>
                    <CheckCircleFilled style={{ color: '#2f6bff', fontSize: 14, marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#141a26' }}>{p.key}</div>
                      <div style={{ fontSize: 13, color: '#7c8698', lineHeight: 1.8, marginTop: 2 }}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 模型返佣比例（随后台「官网上架」活动配置展示） ================= */}
      {hasRates && (
      <section id="promo-rates" style={{ padding: '40px 24px 73px', maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Title level={2} style={{ ...sectionTitleStyle, marginBottom: 0 }}>
            模型返佣比例
          </Title>
          <RequirementDot
            title="模型返佣比例 · 需求说明"
            sections={[
              {
                label: '需求内容',
                items: [
                  '1.如活动未设置为官网推广，或设置后未配置模型，此处不展示；',
                  '2.如设置为官网推广且配置了模型，此处按照配置的模型返佣比例倒序展示，最多展示 10 条；',
                  '3.超过 10 条展示「更多」，点击后支持展开查看，支持收起；',
                  '4.如有模型设置加倍分佣，则展示「佣金加倍」。',
                ],
              },
            ]}
          />
        </div>
        <Paragraph style={{ ...sectionSubStyle, marginBottom: 24 }}>
          主推模型返佣更高，活动期享加倍返佣
        </Paragraph>
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e8edf6',
            boxShadow: '0 20px 48px rgba(15,35,95,.07)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px 1fr',
              padding: '20px 36px',
              background: '#f6f8fc',
              color: '#5c6577',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span>模型</span>
            <span style={{ textAlign: 'center' }}>模型档位</span>
            <span style={{ textAlign: 'right' }}>返佣比例</span>
          </div>
          {visibleRateRows.map((r, idx) => {
            const inCampaign = r.boosting
            const nowRate = r.nowRate
            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 1fr',
                  padding: '22px 36px',
                  alignItems: 'center',
                  borderTop: '1px solid #eef1f7',
                  background: inCampaign ? '#fff7f0' : idx % 2 === 1 ? '#fafbfd' : '#fff',
                }}
              >
                <span>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#141a26' }}>
                    {r.modelName}
                  </span>
                  <span style={{ display: 'block', fontSize: 13, color: '#8a93a6', marginTop: 4 }}>
                    {r.intro}
                  </span>
                </span>
                <span style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: inCampaign ? 17 : 15,
                      fontWeight: 700,
                      color: inCampaign ? '#d4380d' : '#8a93a6',
                    }}
                  >
                    {r.multiplier}x
                  </span>
                </span>
                <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      fontSize: inCampaign ? 19 : 16,
                      fontWeight: 700,
                      color: inCampaign ? '#d4380d' : '#39404f',
                    }}
                  >
                    {nowRate}%
                  </span>
                  {inCampaign && (
                    <Tag color="volcano" style={{ borderRadius: 999, margin: 0 }}>
                      佣金加倍
                    </Tag>
                  )}
                </span>
              </div>
            )
          })}
          {canExpandRates && (
            <div style={{ padding: '12px 0 16px', textAlign: 'center', borderTop: '1px solid #eef1f7' }}>
              <Button
                type="text"
                style={{ color: '#2f6bff', fontWeight: 600 }}
                icon={ratesExpanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setRatesExpanded((v) => !v)}
              >
                {ratesExpanded ? '收起' : '更多'}
              </Button>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', color: '#98a1b3', fontSize: 13, marginTop: 24 }}>
          计佣只算现金消耗，代金券抵扣部分不计佣；返佣比例为每笔消耗当时的规则快照。
        </div>
      </section>
      )}

      {/* ================= 三条红线 ================= */}
      <section style={{ padding: '48px 24px 84px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2} style={sectionTitleStyle}>
          规则透明，长期共赢
        </Title>
        <Paragraph style={sectionSubStyle}>计佣口径、结算时点全部公开可查</Paragraph>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 56 }}>
          {redlines.map((r) => (
            <div key={r.no} style={{ borderTop: '3px solid #2f6bff', paddingTop: 32 }}>
              <div style={{ ...gradientText, fontSize: 40, fontWeight: 800, marginBottom: 16 }}>{r.no}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#141a26', marginBottom: 14 }}>{r.title}</div>
              <div style={{ fontSize: 15, color: '#6b7385', lineHeight: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 常见问题 ================= */}
      <section style={{ background: '#f7f9fc', padding: '48px 24px 84px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <Title level={2} style={{ ...sectionTitleStyle, marginBottom: 64 }}>
            常见问题
          </Title>
          {faqs.map((f, idx) => (
            <div
              key={f.q}
              style={{
                background: '#fff',
                border: '1px solid #eef0f4',
                borderRadius: 12,
                padding: '28px 32px',
                marginBottom: idx === faqs.length - 1 ? 0 : 16,
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ ...gradientText, fontSize: 17, fontWeight: 800, flexShrink: 0 }}>Q</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#141a26' }}>{f.q}</span>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ color: '#2f6bff', fontSize: 17, fontWeight: 800, flexShrink: 0 }}>A</span>
                <span style={{ fontSize: 15, color: '#6b7385', lineHeight: 2 }}>{f.a}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 底部 CTA ================= */}
      <section style={{ padding: '24px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            borderRadius: 24,
            border: '1px solid #dbe6ff',
            background: 'linear-gradient(180deg, #eef4ff 0%, #f8faff 100%)',
            padding: '84px 32px',
            textAlign: 'center',
          }}
        >
          <Title level={2} style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.3, marginTop: 0, marginBottom: 20, color: '#141a26' }}>
            分享一条链接，<span style={gradientText}>最高返 40%</span>
          </Title>
          <Paragraph style={{ color: '#5c6577', fontSize: 17, marginBottom: 48 }}>
            登录智算多多控制台，进入「推广合伙人」，专属链接即刻可用。
          </Paragraph>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              type="primary"
              size="large"
              onClick={goConsole}
              style={{ borderRadius: 8, height: 52, padding: '0 44px', fontSize: 16, fontWeight: 600 }}
            >
              前往控制台获取推广链接 <RightOutlined />
            </Button>
            {hasRates && (
              <Button
                size="large"
                onClick={scrollToRates}
                style={{ borderRadius: 8, height: 52, padding: '0 32px', fontSize: 16 }}
              >
                再看看返佣比例
              </Button>
            )}
          </div>
          <div style={{ marginTop: 44, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['0 门槛参与', '双向见面礼', '持续返佣', '提现全程可查'].map((t) => (
              <span
                key={t}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#5c6577', fontSize: 14 }}
              >
                <CheckCircleFilled style={{ color: '#2f6bff' }} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
