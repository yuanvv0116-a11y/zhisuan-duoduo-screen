import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Table, Tag, Typography, message, theme } from 'antd'
import {
  ClockCircleOutlined,
  CopyOutlined,
  LinkOutlined,
  LoginOutlined,
  DownOutlined,
  UpOutlined,
  SafetyCertificateFilled,
  PayCircleFilled,
  BarChartOutlined,
} from '@ant-design/icons'
import {
  buildCampaignInviteUrl,
  clearPromoSession,
  isCampaignInPeriod,
  usePromoCampaigns,
  usePromoPartners,
  type PromoSession,
} from '../store'

const { Title, Text } = Typography

interface Props {
  campaignId: string
  /** 登录成功后进入控制台「推广合伙人」页 */
  onEnterConsole?: () => void
}

/** 随包本地图：new URL + import.meta.url 在 dev/build 下均可正确解析，且不受 base:'./' 子路径部署影响 */
const HERO_BG = new URL('../assets/hero-bg.jpg', import.meta.url).href

/** 模型返佣列表默认最多展示条数，超出时收起并展示「更多」按钮 */
const MODEL_PREVIEW_LIMIT = 10

const copyText = async (value: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      message.success('已复制')
      return
    } catch {
      /** 剪贴板 API 被拒绝时走 execCommand 兜底 */
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    message.success('已复制')
  } catch {
    message.error('复制失败')
  }
}

export default function PromoShareLandingPage({ campaignId, onEnterConsole }: Props) {
  const { token } = theme.useToken()
  const campaigns = usePromoCampaigns()
  const partners = usePromoPartners()

  /** 分享落地页不恢复登录态：每次通过分享链接进入都视为新访客，始终展示登录入口，
   * 便于反复测试登录流程；登录成功后进入控制台，专属链接在控制台「推广合伙人」页查看 */
  const [session] = useState<PromoSession | null>(null)
  useEffect(() => {
    clearPromoSession()
  }, [])

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  )
  const me = useMemo(
    () => (session ? partners.find((p) => p.id === session.partnerId) ?? null : null),
    [partners, session],
  )

  const inPeriod = !!campaign && isCampaignInPeriod(campaign) && campaign.status === 'on'
  const inviteUrl = useMemo(
    () => (campaign && me ? buildCampaignInviteUrl(campaign.id, me.inviteCode) : ''),
    [campaign, me],
  )

  const campaignName = campaign?.name ?? ''
  /** 含空格的活动名按首个空格拆两行展示；标题统一白色，金色只留给下方返佣比例，避免同色抢焦点 */
  const nameSplit = useMemo(() => {
    const idx = campaignName.indexOf(' ')
    return idx > 0
      ? { head: campaignName.slice(0, idx), tail: campaignName.slice(idx + 1) }
      : { head: campaignName, tail: '' }
  }, [campaignName])
  /** 标题字号按最长一行字数自适应收缩（全角按 1、半角按 0.58 估算宽度） */
  const titleSize = useMemo(() => {
    const width = (s: string) =>
      [...s].reduce((acc, ch) => acc + (/[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.58), 0)
    const units = Math.max(width(nameSplit.head), width(nameSplit.tail))
    return Math.max(30, Math.min(54, Math.floor(600 / Math.max(units, 1))))
  }, [nameSplit])

  const rows = useMemo(
    () =>
      (campaign?.models ?? [])
        .filter((m) => m.enabled !== false)
        .map((m) => ({
          key: `${m.modelName}::${m.multiplierName}`,
          modelName: m.modelName,
          multiplierName: m.multiplierName,
          multiplier: m.modelMultiplier,
          rate: m.boost && inPeriod ? (m.boostRate ?? m.rate) : m.rate,
          boosting: m.boost && inPeriod,
        })),
    [campaign, inPeriod],
  )
  const maxRate = useMemo(() => Math.max(0, ...rows.map((r) => r.rate)), [rows])

  /** 超过 10 条时默认收起，点「更多」展开全部 */
  const [modelsExpanded, setModelsExpanded] = useState(false)
  const canExpand = rows.length > MODEL_PREVIEW_LIMIT
  const visibleRows = canExpand && !modelsExpanded ? rows.slice(0, MODEL_PREVIEW_LIMIT) : rows

  /** 登录获得链接：进入原型内置登录页（?login=1），登录成功后直接进入控制台「推广合伙人」 */
  const goLogin = () => {
    window.location.href = `${window.location.pathname}?share=${encodeURIComponent(campaignId)}&login=1`
  }

  if (!campaign) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f7f9fc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 40,
        }}
      >
        <div style={{ fontSize: 56 }}>🔍</div>
        <Title level={3} style={{ margin: 0 }}>
          活动不存在或链接有误
        </Title>
        <Text type="secondary">请联系活动提供方重新获取推广链接</Text>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <section
        style={{
          background:
            'linear-gradient(90deg, rgba(4,11,38,.78) 0%, rgba(4,11,38,.42) 42%, rgba(4,11,38,0) 68%), ' +
            `#040b26 url(${HERO_BG}) center / cover no-repeat`,
          padding: '112px 24px 132px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 24,
            right: 24,
            zIndex: 2,
            maxWidth: 1080,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: '#2f6bff',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            智
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>智算多多</span>
        </div>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            {!inPeriod && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 14px',
                  borderRadius: 999,
                  marginBottom: 18,
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.18)',
                  color: '#9fb0cf',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                当前不在活动期内
              </span>
            )}
            <Title
              level={1}
              style={{
                fontSize: titleSize,
                fontWeight: 800,
                lineHeight: 1.18,
                letterSpacing: 1,
                marginBottom: 14,
                color: '#fff',
              }}
            >
              {nameSplit.tail ? (
                <>
                  {nameSplit.head}
                  <br />
                  {nameSplit.tail}
                </>
              ) : (
                nameSplit.head
              )}
            </Title>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,.62)', marginBottom: 36 }}>
              分享推广，好友购买即享返佣
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 2 }}>返佣高达</div>
                <span
                  style={{
                    fontSize: 64,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    background: 'linear-gradient(120deg, #ffedb8 0%, #f2c268 55%, #e9a13c 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {maxRate}%
                </span>
              </div>
              <div
                style={{
                  padding: '14px 22px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.16)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.65)', fontSize: 13, marginBottom: 4 }}>
                  <ClockCircleOutlined />
                  活动时间
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                  {campaign.startAt} 至 {campaign.endAt}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 24px', marginTop: -76, position: 'relative', zIndex: 3 }}>
        <div
          style={{
            maxWidth: 980,
            margin: '0 auto',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 20px 56px rgba(9,20,48,.14)',
            padding: '26px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 300, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <span
              style={{
                flex: '0 0 auto',
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: `${token.colorPrimary}14`,
                color: token.colorPrimary,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              <LinkOutlined />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#141a26' }}>专属推广链接</span>
                {me && (
                  <Tag color="gold" style={{ borderRadius: 999, margin: 0 }}>
                    邀请码 {me.inviteCode}
                  </Tag>
                )}
              </div>
              <div style={{ color: '#8a93a6', fontSize: 13, lineHeight: 1.7 }}>
                {me ? (
                  '好友通过此链接注册并实名，即计入你的推广业绩，按本活动比例持续返佣。'
                ) : (
                  <>
                    登录后即可生成你的专属推广链接
                    <br />
                    好友通过链接注册并购买，即可获得返佣
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: '0 1 auto' }}>
            {me ? (
              <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Input
                    value={inviteUrl}
                    readOnly
                    prefix={<LinkOutlined style={{ color: token.colorTextTertiary }} />}
                    style={{ width: 360, maxWidth: '100%', height: 46, borderRadius: 8 }}
                    allowClear={false}
                  />
                  <Button
                    type="primary"
                    size="large"
                    icon={<CopyOutlined />}
                    disabled={!inviteUrl}
                    onClick={() => copyText(inviteUrl)}
                    style={{ borderRadius: 8, height: 46, padding: '0 28px', fontWeight: 600 }}
                  >
                    复制链接
                  </Button>
                </div>
                {onEnterConsole && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, fontSize: 12 }}
                    onClick={onEnterConsole}
                  >
                    进入控制台查看更多活动
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  size="large"
                  icon={<LoginOutlined />}
                  onClick={goLogin}
                  style={{ borderRadius: 10, height: 48, padding: '0 34px', fontSize: 16, fontWeight: 600 }}
                >
                  登录获得链接
                </Button>
                <span style={{ color: '#98a1b3', fontSize: 12 }}>登录后自动生成专属链接</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: '64px 24px 72px', background: '#fff' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Title level={2} style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#141a26' }}>
              <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 5, verticalAlign: 'middle', margin: '0 16px' }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: token.colorPrimary, opacity: 0.45 }} />
                <span style={{ width: 20, height: 3, borderRadius: 2, background: token.colorPrimary }} />
              </span>
              本活动返佣比例
              <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 5, verticalAlign: 'middle', margin: '0 16px' }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: token.colorPrimary, opacity: 0.45 }} />
                <span style={{ width: 20, height: 3, borderRadius: 2, background: token.colorPrimary }} />
              </span>
            </Title>
            <div style={{ marginTop: 8, color: '#98a1b3', fontSize: 14 }}>
              {inPeriod ? '好友每笔现金消耗，按下方比例为你持续返佣' : '当前不在活动期内，以下为活动配置的比例存档'}
            </div>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#98a1b3' }}>
              该活动暂未配置推广模型，请联系活动提供方
            </div>
          ) : (
            <>
              <div style={{ border: '1px solid #eef0f4', borderRadius: 12, overflow: 'hidden' }}>
                <Table
                  rowKey="key"
                  pagination={false}
                  dataSource={visibleRows}
                  scroll={{ x: 'max-content' }}
                  columns={[
                    {
                      title: '模型名称',
                      dataIndex: 'modelName',
                      render: (v: string) => (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${token.colorPrimary} 0%, #7b9dff 100%)`,
                              color: '#fff',
                              fontSize: 13,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {v.charAt(0)}
                          </span>
                          <span style={{ fontWeight: 600, color: '#141a26' }}>{v}</span>
                        </span>
                      ),
                    },
                    {
                      title: '模型档位',
                      dataIndex: 'multiplierName',
                      render: (v: string, row) => (
                        <Tag style={{ borderRadius: 999, margin: 0 }}>
                          {row.multiplier}x · {v}
                        </Tag>
                      ),
                    },
                    {
                      title: '返佣比例',
                      dataIndex: 'rate',
                      render: (v: number, row) => (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: row.boosting ? '#fa541c' : '#d46b08' }}>
                            {v}%
                          </span>
                          {row.boosting && <Tag color="volcano" style={{ margin: 0, borderRadius: 999 }}>加倍中</Tag>}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>

              {canExpand && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button
                    type="text"
                    style={{ color: token.colorPrimary, fontWeight: 600 }}
                    icon={modelsExpanded ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setModelsExpanded((v) => !v)}
                  >
                    {modelsExpanded ? '收起' : '更多'}
                  </Button>
                </div>
              )}

              <div
                style={{
                  marginTop: 24,
                  background: '#f4f7fe',
                  borderRadius: 14,
                  padding: '22px 12px',
                  display: 'flex',
                  flexWrap: 'wrap',
                }}
              >
                {[
                  {
                    icon: <SafetyCertificateFilled />,
                    title: '安全可靠',
                    lines: ['官方正版服务', '安全稳定有保障'],
                  },
                  {
                    icon: <PayCircleFilled />,
                    title: '高额返佣',
                    lines: [maxRate > 0 ? `返佣比例高达${maxRate}%` : '返佣按活动配置结算', '收益更丰厚'],
                  },
                  {
                    icon: <BarChartOutlined />,
                    title: '实时结算',
                    lines: ['收益实时统计', '提现快速到账'],
                  },
                ].map((item) => (
                  <div key={item.title} style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0 20px' }}>
                    <span
                      style={{
                        flex: '0 0 auto',
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: '#fff',
                        color: token.colorPrimary,
                        fontSize: 20,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#141a26', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#8a93a6', lineHeight: 1.7 }}>
                        {item.lines[0]}
                        <br />
                        {item.lines[1]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <div style={{ padding: '22px 24px', borderTop: '1px solid #eef0f4', textAlign: 'center', color: '#9aa3b2', fontSize: 12 }}>
        本活动最终解释权归智算多多官方所有&nbsp;&nbsp;如有任何疑问，请联系客服咨询
      </div>
    </div>
  )
}
