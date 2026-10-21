import { useState, type CSSProperties } from 'react'
import { Button, message } from 'antd'
import { CheckOutlined, CopyOutlined, DesktopOutlined, ThunderboltFilled } from '@ant-design/icons'

/* 与被邀请人落地页同一视觉体系：深空底 + 品牌蓝绿渐变 */
const NAVY = '#020618'
const BRAND = '#2f6bff'
const ACCENT = '#14e0b0'
const CYAN = '#3fe0ff'
const TEXT = '#eaf2ff'
const SUB = '#8fb4e6'

/** 电脑端控制台地址 */
const PC_URL = 'https://console.zsdodo.com/#/workbench'

const MODELS = ['DeepSeek-V4', 'Kimi-K3', 'GLM-5.3', 'Qwen3.8-Max', 'Doubao-Seed-2.0', 'MiniMax-M3']

const STEPS = ['电脑浏览器打开地址', '登录当前账号', '开始使用模型']

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '5px 13px',
  fontSize: 12,
  color: TEXT,
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(140,180,255,.22)',
  borderRadius: 999,
}

export default function MobileGuidePage() {
  const [copied, setCopied] = useState(false)
  const [msgApi, msgHolder] = message.useMessage()

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(PC_URL)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = PC_URL
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    msgApi.success('地址已复制，请在电脑浏览器中打开')
    window.setTimeout(() => setCopied(false), 2400)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(620px 420px at 18% -8%, rgba(47,107,255,.4), transparent 70%),
          radial-gradient(520px 380px at 92% 12%, rgba(20,224,176,.22), transparent 70%),
          radial-gradient(760px 520px at 50% 122%, rgba(63,224,255,.14), transparent 70%),
          ${NAVY}`,
        fontFamily: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`,
        color: TEXT,
      }}
    >
      {msgHolder}
      <main
        style={{
          maxWidth: 440,
          margin: '0 auto',
          padding: '44px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})`,
            boxShadow: '0 10px 30px rgba(47,107,255,.55), 0 0 24px rgba(20,224,176,.35)',
          }}
        >
          <ThunderboltFilled style={{ fontSize: 34, color: '#fff' }} />
        </div>

        {/* 欢迎主标题 */}
        <div style={{ marginTop: 22, fontSize: 30, fontWeight: 800, lineHeight: 1.3 }}>
          欢迎使用
          <span
            style={{
              background: `linear-gradient(92deg, ${CYAN}, ${ACCENT})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            智算多多
          </span>
        </div>
        <div style={{ marginTop: 10, fontSize: 15, color: TEXT }}>
          主流模型 <span style={{ color: CYAN, fontWeight: 700 }}>畅享低价</span>，一个平台全部可用
        </div>

        {/* 模型胶囊 */}
        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {MODELS.map((m) => (
            <span key={m} style={chipStyle}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})`,
                }}
              />
              {m}
            </span>
          ))}
        </div>

        {/* 暂未开放移动端提示卡 */}
        <div
          style={{
            width: '100%',
            marginTop: 34,
            padding: '24px 20px',
            background: 'linear-gradient(180deg, rgba(13,34,84,.75), rgba(6,18,48,.88))',
            border: '1px solid rgba(70,140,255,.38)',
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 32px rgba(20,80,220,.35)',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(63,224,255,.12)',
                border: '1px solid rgba(63,224,255,.4)',
              }}
            >
              <DesktopOutlined style={{ fontSize: 20, color: CYAN }} />
            </span>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, color: '#fff' }}>
              为了方便您的使用，目前暂未开放移动端，请在<b style={{ color: CYAN }}>电脑端</b>访问：
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              color: CYAN,
              wordBreak: 'break-all',
              background: 'rgba(2,6,24,.66)',
              border: '1px solid rgba(63,224,255,.35)',
              borderRadius: 12,
            }}
          >
            {PC_URL}
          </div>

          <Button
            block
            size="large"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={copyUrl}
            style={{
              marginTop: 16,
              height: 48,
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 24,
              border: 'none',
              color: '#fff',
              background: copied
                ? `linear-gradient(90deg, #0fae7f, ${ACCENT})`
                : `linear-gradient(90deg, ${BRAND}, ${ACCENT})`,
              boxShadow: '0 10px 26px rgba(47,107,255,.45)',
            }}
          >
            {copied ? '已复制' : '复制电脑端地址'}
          </Button>

          {/* 三步引导 */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    background: `linear-gradient(135deg, ${BRAND}, ${ACCENT})`,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: SUB, textAlign: 'center' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 页脚 */}
        <div style={{ marginTop: 28, fontSize: 12, color: '#5f7fb3', textAlign: 'center' }}>
          您的账号与权益已同步，在电脑端登录即可继续使用
        </div>
      </main>
    </div>
  )
}
