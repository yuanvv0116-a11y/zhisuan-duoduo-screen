import { useMemo, type CSSProperties } from 'react'
import { Button } from 'antd'
import { ApiOutlined, ArrowRightOutlined, ThunderboltFilled, ToolFilled, UserOutlined } from '@ant-design/icons'
import { usePromoCampaigns, usePromoPartners } from '../store'

interface Props {
  campaignId: string
  /** 链接中的分销员邀请码 */
  inviteCode: string
}

const HERO_BG = new URL('../assets/invitee-hero.png', import.meta.url).href

const BRAND = '#2f6bff'
const ACCENT = '#14e0b0'
const CYAN = '#3fe0ff'
const NAVY = '#020618'
const CARD_TEXT = '#eaf2ff'
const CARD_SUB = '#8fb4e6'

/** 注册赠送额度：¥20 代金券，全页只取这一处 */
const GIFT_COUPON = '¥20'
/** 代金券折算的 Tokens 额度（≈ 号后的等价值） */
const GIFT_TOKENS = (25_000_000).toLocaleString('en-US')

/** 平台聚合的主流大模型 */
const MODELS = [
  { name: 'DeepSeek-V4', c: '#5570ff' },
  { name: 'DeepSeek-R1', c: '#4f8bff' },
  { name: 'Kimi-K3', c: '#dbe4ff' },
  { name: 'GLM-5.3', c: '#6a8dff' },
  { name: 'Qwen3.8-Max', c: '#8f7bff' },
  { name: 'Doubao-Seed-2.0', c: '#4aa8ff' },
  { name: 'Hunyuan-T1', c: '#38c6ff' },
  { name: 'MiniMax-M3', c: '#ff7a59' },
  { name: 'Step-3', c: '#2ee6c8' },
  { name: 'Llama-4', c: '#5b8cff' },
]

/** 支持直连的主流工具 */
const TOOLS = [
  { name: 'Claude Code', c: '#d97757' },
  { name: 'Codex', c: '#e8ecff' },
  { name: 'Cursor', c: '#b7c1d9' },
  { name: 'TRAE', c: '#8a5cf6' },
]

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  fontSize: 13,
  color: CARD_TEXT,
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(140,180,255,.22)',
  borderRadius: 999,
}

const ChipDot = ({ c }: { c: string }) => (
  <span
    style={{
      width: 16,
      height: 16,
      flexShrink: 0,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${c}, ${c}66)`,
      boxShadow: `0 0 8px ${c}55`,
    }}
  />
)

export default function PromoInviteeLandingPageV2({ campaignId, inviteCode }: Props) {
  const campaigns = usePromoCampaigns()
  const partners = usePromoPartners()

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  )
  const inviter = useMemo(
    () => partners.find((p) => p.inviteCode === inviteCode.trim().toUpperCase()) ?? null,
    [partners, inviteCode],
  )
  const goRegister = () => {
    window.location.href = `${window.location.pathname}?share=${encodeURIComponent(campaignId)}&code=${encodeURIComponent(inviteCode)}&login=1`
  }

  if (!campaign) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: NAVY,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>链接已失效</div>
          <div style={{ marginTop: 8, fontSize: 14, color: CARD_SUB }}>请让邀请人重新生成推广链接</div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: NAVY,
        fontFamily: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`,
      }}
    >
      {/* 背景图：AI 立方 + 星球弧线。竖版图按首屏高度承接并限宽居中，避免宽屏被横向铺满拉变形 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: NAVY,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'clamp(320px, 100vw, 720px)',
            aspectRatio: '2 / 3',
            background: `#020618 url(${HERO_BG}) no-repeat top center`,
            backgroundSize: '100% 100%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, ${NAVY} 0%, rgba(2,6,24,0) 26%, rgba(2,6,24,0) 74%, ${NAVY} 100%)`,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(2,6,24,0) 0%, rgba(2,6,24,.1) 42%, rgba(2,6,24,.72) 100%)',
        }}
      />

      <main
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          maxWidth: 640,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '56px 28px 0',
        }}
      >
        {/* 邀请人胶囊 */}
        {inviter ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 18px',
              fontSize: 14,
              color: '#fff',
              background: 'rgba(9,32,84,.55)',
              border: '1px solid rgba(80,160,255,.55)',
              borderRadius: 999,
              boxShadow: '0 0 14px rgba(47,107,255,.35)',
            }}
          >
            <UserOutlined style={{ color: CYAN }} />
            <span style={{ color: CYAN, fontWeight: 600 }}>{inviter.nickname}</span> 邀请您体验
          </span>
        ) : null}

        {/* 主标题 */}
        <div style={{ marginTop: 26, fontSize: 36, fontWeight: 800, lineHeight: 1.22, color: '#fff', letterSpacing: '.01em' }}>
          智算多多大模型
          <br />
          <span
            style={{
              background: `linear-gradient(92deg, ${CYAN}, ${ACCENT})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            服务平台
          </span>
        </div>

        {/* 副标语 */}
        <div style={{ marginTop: 14, fontSize: 14, letterSpacing: 3, color: CARD_SUB }}>
          AI · 多模型 · 更智能 · 更高效
        </div>

        {/* 赠送额度 */}
        <div
          style={{
            marginTop: 28,
            padding: '10px 22px',
            fontSize: 16,
            fontWeight: 600,
            color: '#fff',
            borderLeft: '1px solid rgba(110,190,255,.6)',
            borderRight: '1px solid rgba(110,190,255,.6)',
          }}
        >
          注册即送 <span style={{ color: CYAN, fontSize: 18, fontWeight: 700 }}>{GIFT_COUPON} 代金券</span> ≈{' '}
          <span style={{ color: CYAN, fontSize: 18, fontWeight: 700 }}>{GIFT_TOKENS}</span> Tokens
        </div>

        {/* 注册按钮 */}
        <div style={{ marginTop: 26 }}>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltFilled />}
            onClick={goRegister}
            style={{
              height: 52,
              minWidth: 250,
              fontSize: 17,
              fontWeight: 700,
              borderRadius: 26,
              border: 'none',
              background: `linear-gradient(90deg, ${BRAND}, ${ACCENT})`,
              boxShadow: '0 12px 30px rgba(47,107,255,.5)',
            }}
          >
            立即注册领取
            <ArrowRightOutlined style={{ marginLeft: 12 }} />
          </Button>
        </div>

        {/* 模型与工具卡片 */}
        <div
          style={{
            width: '100%',
            marginTop: 48,
            padding: '22px 20px',
            background: 'linear-gradient(180deg, rgba(13,34,84,.72), rgba(6,18,48,.84))',
            border: '1px solid rgba(70,140,255,.35)',
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 32px rgba(20,80,220,.32)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                <ApiOutlined style={{ color: '#6fa8ff' }} />
                主流大模型
              </div>
              <div style={{ marginTop: 6, marginLeft: 26, fontSize: 12, color: CYAN }}>一站式全部可用</div>
            </div>
            <span style={{ fontStyle: 'italic', fontWeight: 700, letterSpacing: 3, color: 'rgba(90,160,255,.65)' }}>////</span>
          </div>

          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {MODELS.map((m) => (
              <span key={m.name} style={chipStyle}>
                <ChipDot c={m.c} />
                {m.name}
              </span>
            ))}
          </div>

          <div style={{ height: 1, margin: '22px 0', background: 'rgba(120,160,220,.18)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700, color: '#fff' }}>
            <ToolFilled style={{ color: '#6fa8ff' }} />
            支持主流工具直连
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {TOOLS.map((t) => (
              <span key={t.name} style={chipStyle}>
                <ChipDot c={t.c} />
                {t.name}
              </span>
            ))}
          </div>
        </div>

        {/* 页脚 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '26px 0 28px',
          }}
        >
          <span style={{ width: 26, height: 1, background: 'linear-gradient(90deg, transparent, rgba(110,150,210,.5))' }} />
          <span style={{ fontSize: 12, color: '#5f7fb3' }}>
            本活动最终解释权归智算多多官方所有 · 如有任何疑问，请联系客服咨询
          </span>
          <span style={{ width: 26, height: 1, background: 'linear-gradient(90deg, rgba(110,150,210,.5), transparent)' }} />
        </div>
      </main>
    </div>
  )
}
