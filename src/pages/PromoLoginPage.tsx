import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Input, Tabs, Typography, message, theme } from 'antd'
import { LeftOutlined, MobileOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons'
import { claimPromoPartnerByPhone, CURRENT_CONSOLE_USER, saveInviteeBinding } from '../store'

const { Text } = Typography

/** 被邀请用户注册登录成功后回传给落地页的绑定结果 */
export interface InviteeLoginResult {
  phone: string
  inviterName: string
  inviteCode: string
}

interface Props {
  /** 来源活动 id：返回时回到该活动落地页 */
  share: string | null
  /** 分销员邀请码：有值时为「被邀请用户注册」模式，登录即完成邀请关系绑定 */
  inviteCode?: string | null
  /** 返回（回落地页或后台首页） */
  onBack: () => void
  /** 登录成功：分销商模式回传 null，被邀请用户模式回传绑定结果 */
  onSuccess: (invitee?: InviteeLoginResult) => void
}

/** 与官网登录页同源的随包背景图，保持品牌一致 */
const LOGIN_BG = new URL('../assets/hero-bg.jpg', import.meta.url).href

/** 演示环境验证码校验：6 位数字即可通过，无需真实短信通道 */
const CODE_RE = /^\d{6}$/

export default function PromoLoginPage({ share, inviteCode, onBack, onSuccess }: Props) {
  const { token } = theme.useToken()
  const [mode, setMode] = useState<'phone' | 'account'>('phone')
  const inviteeMode = !!inviteCode

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setInterval(() => setCountdown((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [countdown])

  const sendCode = () => {
    if (!/^1\d{10}$/.test(phone.trim())) {
      message.warning('请输入正确的手机号')
      return
    }
    setCountdown(60)
    message.success('验证码已发送，演示环境可输入任意 6 位数字')
  }

  const doLogin = () => {
    if (!agreed) {
      message.warning('请先阅读并同意《用户协议》和《隐私政策》')
      return
    }
    let loginPhone = phone.trim()
    if (mode === 'phone') {
      if (!/^1\d{10}$/.test(loginPhone)) {
        message.warning('请输入正确的手机号')
        return
      }
      if (!CODE_RE.test(code.trim())) {
        message.warning('请输入 6 位数字验证码')
        return
      }
    } else {
      if (!account.trim() || !password) {
        message.warning('请输入账号和密码')
        return
      }
      /** 演示环境账号密码登录：统一以控制台演示账号建立登录态 */
      loginPhone = CURRENT_CONSOLE_USER.phone
    }
    setSubmitting(true)
    if (inviteeMode) {
      /** 被邀请用户：静默建立邀请关系，不向用户提示绑定结果（绑定信息只服务于邀请人侧） */
      const res = saveInviteeBinding(inviteCode ?? '', loginPhone, share ?? '')
      setSubmitting(false)
      if (!res.ok || !res.partner) {
        message.error(res.msg)
        return
      }
      onSuccess({ phone: loginPhone, inviterName: res.partner.nickname, inviteCode: res.partner.inviteCode })
      return
    }
    const res = claimPromoPartnerByPhone(loginPhone)
    setSubmitting(false)
    if (!res.ok) {
      message.error(res.msg)
      return
    }
    message.success('登录成功')
    onSuccess()
  }

  const items = useMemo(
    () => [
      {
        key: 'phone',
        label: '手机号登录',
        children: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              size="large"
              prefix={<MobileOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="请输入手机号"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Input
                size="large"
                prefix={<SafetyOutlined style={{ color: token.colorTextQuaternary }} />}
                placeholder="请输入验证码"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onPressEnter={doLogin}
              />
              <Button size="large" style={{ flexShrink: 0 }} disabled={countdown > 0} onClick={sendCode}>
                {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
              </Button>
            </div>
          </div>
        ),
      },
      {
        key: 'account',
        label: '账号密码登录',
        children: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              size="large"
              prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="请输入账号 / 手机号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
            <Input.Password
              size="large"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={doLogin}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, phone, code, account, password, agreed, countdown, token],
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, #0a1638 0%, #040b26 55%, #0b1e4d 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `url(${LOGIN_BG}) center / cover no-repeat`,
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'absolute', top: 26, left: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: token.colorPrimary,
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
      <Button
        type="text"
        icon={<LeftOutlined />}
        onClick={onBack}
        style={{ position: 'absolute', top: 24, right: 32, color: 'rgba(255,255,255,.75)' }}
      >
        {share ? '返回活动页' : '返回'}
      </Button>

      <div
        style={{
          position: 'relative',
          width: 420,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 12,
          padding: '32px 36px 28px',
          boxShadow: '0 24px 64px rgba(2,8,30,.45)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2733', marginBottom: 4 }}>欢迎使用 智算多多</div>
        <div style={{ fontSize: 13, color: '#8a94a6', marginBottom: 18 }}>
          {inviteeMode ? '登录后即可开通并使用大模型服务' : '登录后即可生成专属推广链接，分享赚返佣'}
        </div>
        <Tabs activeKey={mode} onChange={(k) => setMode(k as 'phone' | 'account')} items={items} centered />
        <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 4 }}>
          <span style={{ fontSize: 12, color: '#8a94a6' }}>
            我已阅读并同意
            <a onClick={(e) => e.preventDefault()}>《用户协议》</a>和
            <a onClick={(e) => e.preventDefault()}>《隐私政策》</a>
          </span>
        </Checkbox>
        <Button
          type="primary"
          size="large"
          block
          loading={submitting}
          onClick={doLogin}
          style={{ marginTop: 16, height: 46, borderRadius: 8, fontSize: 16, fontWeight: 600 }}
        >
          登 录
        </Button>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            演示环境：验证码任意 6 位数字即可登录
          </Text>
        </div>
      </div>
    </div>
  )
}
