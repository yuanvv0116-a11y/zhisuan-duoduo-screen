import { useState, useMemo } from 'react'
import { Card, Checkbox, Button, Tag, Switch, message } from 'antd'
import { WechatOutlined, ArrowLeftOutlined, InfoCircleOutlined, CheckCircleFilled } from '@ant-design/icons'
import type { AgreementType } from './AgreementPage'

interface PayData {
  duration: Duration
  total: number
  orderNo: string
}

interface PlanInfo {
  id: string
  name: string
  subtitle: string
  price: string
  originalPrice: string
  unit: string
  features: string[]
  models: { name: string; type: string }[]
  totalModelCount: number
  bgGradient: string
}

interface Props {
  plan: PlanInfo
  onBack: () => void
  onPay: (data: PayData) => void
  onOpenAgreement?: (type: AgreementType) => void
}

type Duration = 'month' | 'quarter' | 'year'

const DURATION_OPTIONS: { value: Duration; label: string; tag?: string }[] = [
  { value: 'month', label: '月付' },
  { value: 'quarter', label: '季付', tag: '9折' },
  { value: 'year', label: '年付', tag: '8折' },
]

const MULTIPLIER: Record<Duration, number> = { month: 1, quarter: 3, year: 12 }
const DISCOUNT: Record<Duration, number> = { month: 1, quarter: 0.9, year: 0.8 }

const DURATION_LABEL: Record<Duration, string> = { month: '月付', quarter: '季付', year: '年付' }

const PURCHASE_RULES = [
  {
    title: '计费规则',
    tag: '计费规则',
    items: ['包月订阅模式', '不支持退订'],
  },
  {
    title: '变更规则',
    tag: '变更规则',
    desc: '订阅套餐在用量或周期未结束之前，不支持修改。套餐结束后，可重新选择套餐。超出月度总额度后调用将被阻断，可购买加油包补充额度。',
  },
  {
    title: '抵扣规则',
    tag: '抵扣规则',
    desc: '套餐额度需在订阅周期内用完。周期内未耗尽额度将自动清零，不顺延到下期。',
  },
]

export default function EnterpriseCheckoutPage({ plan, onBack, onPay, onOpenAgreement }: Props) {
  const [duration, setDuration] = useState<Duration>('month')
  const [autoRenew, setAutoRenew] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const basePrice = parseFloat(plan.price)
  const total = useMemo(() => {
    return (basePrice * MULTIPLIER[duration] * DISCOUNT[duration]).toFixed(2)
  }, [duration, basePrice])

  const originalTotal = useMemo(() => {
    return (basePrice * MULTIPLIER[duration]).toFixed(2)
  }, [duration, basePrice])

  const durationLabel = useMemo(() => {
    const now = new Date()
    const endDate = new Date(now)
    const months = MULTIPLIER[duration]
    endDate.setMonth(endDate.getMonth() + months)
    const y = endDate.getFullYear()
    const m = String(endDate.getMonth() + 1).padStart(2, '0')
    const d = String(endDate.getDate()).padStart(2, '0')
    return `${DURATION_LABEL[duration]}（到期：${y}-${m}-${d}）`
  }, [duration])

  const quotaLabel = useMemo(() => {
    const quotaPerMonth = plan.id === 'light' ? '5,000万' : '10万'
    const unit = plan.id === 'light' ? 'tokens/月' : '积分/月'
    return `${quotaPerMonth} ${unit}`
  }, [plan.id])

  const generateOrderNo = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = String(Math.floor(Math.random() * 100000000000000)).padStart(15, '0')
    return `${y}${m}${d}${rand}`
  }

  const handlePay = () => {
    if (!agreeTerms) {
      message.warning('请先阅读并同意服务协议')
      return
    }
    const orderNo = generateOrderNo()
    onPay({
      duration,
      total: parseFloat(total),
      orderNo,
    })
  }

  const QUOTA_PER_MONTH = plan.id === 'light' ? '5,000万' : '10万'
  const QUOTA_UNIT = plan.id === 'light' ? 'Token' : '积分'

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
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
          <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>购买 Token Plan 企业版套餐</span>
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#111827', margin: 0 }}>
            购买 Token Plan 企业版套餐
          </h2>
        </div>

        {/* 购买须知提示 */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '14px 20px',
            background: '#fffbe6',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            color: '#614700',
            lineHeight: 1.6,
            border: '1px solid #ffe58f',
          }}
        >
          <Tag color="gold" style={{ margin: 0, flexShrink: 0, height: 22, lineHeight: '20px' }}>
            购买须知
          </Tag>
          <span>
            一个账号仅支持购买一个企业版套餐。Token 套餐一经订阅开通，不支持退费、降配，请您确认需求后再下单支付。
          </span>
        </div>

        {/* 两栏布局 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* 左栏 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 购买须知 */}
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>购买须知</span>}
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: 24 } }}
            >
              {PURCHASE_RULES.map((rule) => (
                <div
                  key={rule.title}
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color="blue" style={{ margin: 0, height: 22, lineHeight: '20px', flexShrink: 0 }}>
                      {rule.tag}
                    </Tag>
                    {rule.items?.map((item, i) => (
                      <span key={i} style={{ fontSize: 14, color: '#374151' }}>
                        <CheckCircleFilled style={{ color: '#52c41a', marginRight: 4 }} />
                        {item}
                      </span>
                    ))}
                    {rule.desc && (
                      <span style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7 }}>
                        {rule.desc}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Card>

            {/* 套餐配置 */}
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>套餐配置</span>}
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: 24 } }}
            >
              {/* 支持模型 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
                  支持模型（为优化使用，期间可能有部分调整）
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
                  {plan.models.map((m) => m.name).join('、')}
                </div>
              </div>

              {/* 套餐详情卡 */}
              <div
                style={{
                  padding: 20,
                  background: plan.id === 'light'
                    ? 'linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 50%, #f5f0ff 100%)'
                    : '#f5f7fa',
                  borderRadius: 8,
                  border: plan.id === 'light' ? '2px solid #2f6bff' : '1px solid #e8ecf0',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
                  {plan.subtitle}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#ff6b35' }}>
                    ¥{plan.price}
                  </span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>/月</span>
                  {plan.originalPrice && (
                    <span
                      style={{
                        fontSize: 13,
                        color: '#9ca3af',
                        textDecoration: 'line-through',
                        marginLeft: 4,
                      }}
                    >
                      ¥{plan.originalPrice}/月
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {plan.id === 'light' ? (
                    <>
                      <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#52c41a', fontSize: 12 }}>●</span>
                        每订阅月：{QUOTA_PER_MONTH} {QUOTA_UNIT}
                      </div>
                      <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#52c41a', fontSize: 12 }}>●</span>
                        支持 {plan.totalModelCount} 种模型使用
                      </div>
                      <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#52c41a', fontSize: 12 }}>●</span>
                        适合企业快速接入、轻量化使用
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#52c41a', fontSize: 12 }}>●</span>
                        每订阅月：{QUOTA_PER_MONTH} {QUOTA_UNIT}
                      </div>
                      <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#52c41a', fontSize: 12 }}>●</span>
                        支持 {plan.totalModelCount} 种模型使用
                      </div>
                      <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#52c41a', fontSize: 12 }}>●</span>
                        适合规模化 AI 使用需求
                      </div>
                    </>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    padding: '10px 12px',
                    background: '#fff',
                    borderRadius: 6,
                    border: '1px dashed #e8ecf0',
                  }}
                >
                  企业套餐统一支付、集中管理成员和用量。一经订阅开通，不支持退费、降配，请谨慎选择。
                </div>
              </div>

              {/* 订阅时长选择 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, fontWeight: 500 }}>
                  订阅时长
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = duration === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setDuration(opt.value)}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? '#2f6bff' : '#e5e7eb'}`,
                          background: isSelected ? '#f0f5ff' : '#fff',
                          color: isSelected ? '#2f6bff' : '#374151',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 13,
                          transition: 'all 0.2s',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{opt.label}</span>
                        {opt.tag && (
                          <span
                            style={{
                              fontSize: 11,
                              color: '#2f6bff',
                              background: '#e6f4ff',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            {opt.tag}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 自动续费 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 4 }}>
                    自动续费
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                    到期后将从账户中自动续费，可在订阅管理中随时取消，账户余额不足，会导致扣费失败，无法继续使用。
                  </div>
                </div>
                <Switch
                  checked={autoRenew}
                  onChange={(checked) => setAutoRenew(checked)}
                />
              </div>
            </Card>
          </div>

          {/* 右栏 - 订单摘要 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>订单摘要</span>}
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>套餐版本</span>
                  <span style={{ color: '#111827', fontSize: 14, fontWeight: 500 }}>{plan.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>订阅时长</span>
                  <span style={{ color: '#111827', fontSize: 14 }}>{durationLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>额度</span>
                  <span style={{ color: '#111827', fontSize: 14 }}>{quotaLabel}</span>
                </div>
              </div>

              <div style={{ margin: '16px 0', borderTop: '1px dashed #e8ecf0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontSize: 14 }}>原价</span>
                  <span style={{ color: '#9ca3af', fontSize: 14, textDecoration: 'line-through' }}>
                    ¥{originalTotal}
                  </span>
                </div>
                {duration !== 'month' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontSize: 14 }}>优惠</span>
                    <span style={{ color: '#f59e0b', fontSize: 14 }}>
                      -¥{(parseFloat(originalTotal) - parseFloat(total)).toFixed(2)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 10,
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  <span style={{ color: '#111827', fontSize: 15, fontWeight: 500 }}>应付</span>
                  <span style={{ color: '#ff6b35', fontSize: 20, fontWeight: 700 }}>
                    ¥{total}
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 4 }}>
                      （{DURATION_LABEL[duration]}）
                    </span>
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, fontWeight: 500 }}>
                  支付方式
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    border: '1.5px solid #2f6bff',
                    borderRadius: 8,
                    background: '#f0f5ff',
                  }}
                >
                  <WechatOutlined style={{ color: '#07c160', fontSize: 20 }} />
                  <span style={{ color: '#2f6bff', fontSize: 14, fontWeight: 500 }}>微信支付</span>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <Checkbox checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>
                    我已阅读并同意
                    <a
                      onClick={() => onOpenAgreement?.('subscription')}
                      style={{ color: '#2f6bff', margin: '0 4px', cursor: 'pointer' }}
                    >
                      《套餐购买协议》
                    </a>
                    <a
                      onClick={() => onOpenAgreement?.('renewal')}
                      style={{ color: '#2f6bff', margin: '0 4px', cursor: 'pointer' }}
                    >
                      《订阅及续费协议》
                    </a>
                  </span>
                </Checkbox>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <Button
                  size="large"
                  onClick={onBack}
                  style={{ flex: 1, height: 44, borderRadius: 8 }}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={handlePay}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 8,
                    background: '#2f6bff',
                    borderColor: '#2f6bff',
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  去支付
                </Button>
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  background: '#f0f5ff',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.6,
                  display: 'flex',
                  gap: 6,
                }}
              >
                <InfoCircleOutlined style={{ flexShrink: 0, marginTop: 2, color: '#2f6bff' }} />
                <span>
                  点击"去支付"即表示同意套餐规则，套餐一经订阅开通不支持退费、降配。实际扣费以账单为准。
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
