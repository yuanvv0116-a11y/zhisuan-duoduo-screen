import { useState } from 'react'
import { Button, Card, Checkbox, Divider, Modal, Space, Tag, Typography, message } from 'antd'
import {
  ArrowLeftOutlined,
  InfoCircleOutlined,
  WechatOutlined,
} from '@ant-design/icons'
import PaymentPage from './PaymentPage'
import AgreementPage from './AgreementPage'
import type { AgreementType } from './AgreementPage'
import RequirementDot from '../components/RequirementDot'

type Pack = {
  id: string
  name: string
  model: string
  desc: string
  price: number
  originalPrice: number
  benefit: string
}

const DESC_QWEN =
  '千问旗舰模型，支持 1M 无损上下文，长程任务执行更稳定，工程规范遵循更可靠。'

/** 加油包为固定单一档位，不可选择 */
const FIXED_PACK: Pack = {
  id: 'p1',
  name: 'Qwen-Max 特价尊享包',
  model: 'Qwen-Max',
  desc: DESC_QWEN,
  price: 189.9,
  originalPrice: 259.9,
  benefit: '包含1亿 Tokens（有效期1个月）',
}

const BUY_NOTES = [
  '加油包购买成功后立即生效，使用时优先扣减Token Plan 然后扣减加油包，加油包额度使用完后则扣减现金账户;',
  '加油包的有效期按照自然月计算，具体以页面为主，不支持同时购买多个加油包；',
  '加油包购买后不支持退款；',
]

const BUY_NOTE_TAGS = ['生效规则', '有效期规则', '退款规则']

const { Text } = Typography

/** 加油包支持模型（样式与 Token Plan 套餐一致） */
const PACK_MODELS: { name: string; type: string }[] = [
  { name: 'Qwen3.6-27B', type: '文本' },
  { name: 'DODO-AC-Ultra-5', type: '文本' },
  { name: 'Doubao-Seedream-5.0', type: '图像' },
  { name: 'DeepSeek-V4-Flash', type: '文本' },
  { name: 'GLM-5.2', type: '文本' },
  { name: 'HappyHorse', type: '视频' },
]

interface Props {
  /** 返回上一页（我的订阅）；不传则不展示返回入口 */
  onBack?: () => void
}

export default function ResourcePackPage({ onBack }: Props) {
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [packPayment, setPackPayment] = useState<{
    productName: string
    total: number
    orderNo: string
  } | null>(null)
  const [agreementView, setAgreementView] = useState<AgreementType | null>(null)
  /** 支持模型「+N」弹窗（与 Token Plan 套餐一致） */
  const [modelModalOpen, setModelModalOpen] = useState(false)

  const total = FIXED_PACK.price

  const handlePay = () => {
    if (!agreeTerms) {
      message.warning('请先阅读并同意《加油包购买协议》')
      return
    }
    const now = new Date()
    const orderNo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${now.getHours()}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    setPackPayment({
      productName: FIXED_PACK.name,
      total,
      orderNo,
    })
  }

  if (agreementView) {
    return <AgreementPage type={agreementView} onBack={() => setAgreementView(null)} />
  }

  if (packPayment) {
    return (
      <PaymentPage
        productName={packPayment.productName}
        total={packPayment.total}
        orderNo={packPayment.orderNo}
        onBack={() => setPackPayment(null)}
        onPaymentSuccess={() => {
          message.success('支付成功，加油包已到账')
          setPackPayment(null)
        }}
      />
    )
  }

  const benefitMatch = /^包含(.+?)（有效期(.+?)）$/.exec(FIXED_PACK.benefit)
  const packAmount = benefitMatch ? benefitMatch[1] : FIXED_PACK.benefit
  const packValidity = benefitMatch ? benefitMatch[2] : '—'
  const validityMonths = parseInt(packValidity, 10) || 0
  const expiryDate = new Date()
  expiryDate.setMonth(expiryDate.getMonth() + validityMonths)
  const expiryText = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`
  const amountMatch = /^([\d.]+)(万|亿)?(张|次)?/.exec(packAmount)
  const amountValue = amountMatch
    ? parseFloat(amountMatch[1]) * (amountMatch[2] === '亿' ? 100000000 : amountMatch[2] === '万' ? 10000 : 1)
    : 0
  const quotaText = amountMatch
    ? amountMatch[3]
      ? `${amountValue.toLocaleString('en-US')} ${amountMatch[3]}`
      : `${amountValue.toLocaleString('en-US')} Tokens`
    : packAmount
  const totalLabel = 'token总量'
  const originalTotal = FIXED_PACK.originalPrice
  const savings = Math.round((FIXED_PACK.originalPrice - FIXED_PACK.price) * 100) / 100

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100%' }}>
      <div style={{ width: '100%', background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
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
          {onBack ? (
            <span
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
                color: '#5a6474',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <ArrowLeftOutlined />
              返回
            </span>
          ) : (
            <span />
          )}
          <div style={{ fontSize: 13, color: '#8b93a5' }}>安全支付 · 实时到账</div>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            <Space size={8} align="center">
              购买加油包
              <RequirementDot
                title="加油包购买页需求说明"
                sections={[
                  {
                    label: '',
                    items: [
                      '1. 加油包为固定单一档位、不可选档：Qwen-Max 特价尊享包，售价 ¥189.9（原价 ¥259.9），包含 1 亿 Tokens，有效期 1 个月',
                      '2. 购买须知三条：生效规则（购买后立即生效，扣减顺序为 Token Plan → 加油包 → 现金账户）、有效期规则（加油包有效期按自然月，不支持同时购买多个）、退款规则（加油包不支持退款）',
                      '3. 加油包配置卡：名称、模型描述、价格、Token 总量、有效期、支持模型（展示 3 个，其余「+N 更多」打开全量模型弹窗，含模型不定期上下架规则提示）',
                      '4. 订单摘要：加油包名称、额度换算（100,000,000 Tokens）、有效期（到期日 = 订阅当月 + 1 个月）、原价划线、优惠金额、应付金额',
                      '5. 须勾选《加油包购买协议》方可支付：未勾选时支付按钮置灰禁用，点击提示「请先阅读并同意《加油包购买协议》」；点击协议名打开加油包协议页',
                      '6. 点击支付进入扫码支付页；支付成功提示「支付成功，加油包已到账」并返回上一页',
                      '7. 订单号生成规则：时间戳（YYYYMMDDHHMMSS）+ 4 位随机数；顶栏提供「返回」与「安全支付 · 实时到账」提示',
                    ],
                  },
                ]}
              />
            </Space>
          </h1>
        </div>

        <div
          style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            color: '#6b4e00',
          }}
        >
          <Tag color="gold" style={{ margin: 0, flexShrink: 0 }}>
            购买须知
          </Tag>
          <span style={{ flex: 1 }}>
            加油包购买成功后立即生效，一经购买不支持退款，请您确认需求后再下单支付。
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: 24,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card
              title={
                <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>购买说明</span>
              }
              style={{ borderRadius: 10, border: '1px solid #e8ecf0' }}
              styles={{ body: { padding: '4px 20px' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {BUY_NOTE_TAGS.map((t, i) => (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom:
                        i < BUY_NOTE_TAGS.length - 1 ? '1px dashed #f0f0f0' : undefined,
                    }}
                  >
                    <Tag color="blue" style={{ margin: 0, flexShrink: 0 }}>
                      {t}
                    </Tag>
                    <span style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                      {BUY_NOTES[i]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title={
                <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>加油包配置</span>
              }
              style={{ borderRadius: 10, border: '1px solid #e8ecf0' }}
              styles={{ body: { padding: 20 } }}
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: '1px solid #2f6bff',
                  background: 'linear-gradient(135deg, #f0f7ff 0%, #e0ecff 100%)',
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                    {FIXED_PACK.name}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                  {FIXED_PACK.desc}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#ff6b35' }}>
                    ¥{FIXED_PACK.price.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    gap: 24,
                    fontSize: 13,
                    color: '#4b5563',
                  }}
                >
                  <span>
                    {totalLabel}：{packAmount}
                  </span>
                  <span>有效期：{packValidity}</span>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 8 }}>
                  支持模型（{PACK_MODELS.length}个，为优化使用，期间可能有部分调整）
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(() => {
                    const MAX_SHOW = 3
                    const showModels = PACK_MODELS.slice(0, MAX_SHOW)
                    const hasMore = PACK_MODELS.length > MAX_SHOW
                    return (
                      <>
                        {showModels.map((m) => (
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
                        {hasMore && (
                          <Tag
                            onClick={() => setModelModalOpen(true)}
                            style={{
                              margin: 0,
                              borderRadius: 4,
                              fontSize: 11,
                              padding: '2px 8px',
                              background: 'transparent',
                              borderColor: '#e5e7eb',
                              color: '#2f6bff',
                              cursor: 'pointer',
                            }}
                          >
                            +{PACK_MODELS.length - MAX_SHOW} 更多
                          </Tag>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </Card>
          </div>

          <div style={{ position: 'sticky', top: 20 }}>
            <div
              style={{
                borderRadius: 12,
                border: '1px solid #e8ecf0',
                background: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>订单摘要</div>
              </div>

              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>加油包</span>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, textAlign: 'right' }}>
                    {FIXED_PACK.name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>额度</span>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, textAlign: 'right' }}>
                    {quotaText}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>有效期</span>
                  <span style={{ fontSize: 13, color: '#111827', textAlign: 'right' }}>
                    {packValidity}（到期：{expiryText}）
                  </span>
                </div>
                <Divider style={{ margin: '12px 0' }} />

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>原价</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: '#9ca3af',
                        textDecoration: 'line-through',
                      }}
                    >
                      ¥{originalTotal.toFixed(2)}
                    </span>
                  </div>
                  {savings > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>优惠</span>
                      <span style={{ fontSize: 13, color: '#52c41a' }}>-¥{savings.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>应付</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: '#ff6b35' }}>
                      ¥{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>支付方式</div>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #09bb07',
                      background: '#f0fff4',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <WechatOutlined style={{ color: '#09bb07', fontSize: 16 }} />
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>微信支付</span>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <Checkbox
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  >
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      我已阅读并同意
                      <a
                        onClick={() => setAgreementView('resourcePack')}
                        style={{ color: '#2f6bff', margin: '0 2px', cursor: 'pointer' }}
                      >
                        《加油包购买协议》
                      </a>
                    </span>
                  </Checkbox>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <Button
                block
                type="primary"
                size="large"
                onClick={handlePay}
                style={{
                  height: 46,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  background: agreeTerms ? '#2f6bff' : '#d9d9d9',
                  borderColor: agreeTerms ? '#2f6bff' : '#d9d9d9',
                  cursor: agreeTerms ? 'pointer' : 'not-allowed',
                }}
              >
                去支付
              </Button>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderRadius: 8,
                background: '#f8f9fb',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontSize: 12,
                color: '#6b7280',
                lineHeight: 1.6,
              }}
            >
              <InfoCircleOutlined style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                点击“去支付”即表示同意加油包购买规则，加油包一经购买开通不支持退款。实际扣费以账单为准。
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 可使用模型弹窗（与 Token Plan 套餐一致） */}
      <Modal
        title={FIXED_PACK.name}
        open={modelModalOpen}
        onCancel={() => setModelModalOpen(false)}
        footer={null}
        width={520}
        centered
      >
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: '#8b93a5',
            lineHeight: 1.7,
            background: '#f8f9fb',
            padding: '8px 12px',
            borderRadius: 6,
          }}
        >
          为持续优化用户体验，平台将不定期上架新模型并下架低效模型。购买加油包即视为同意本规则。
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {PACK_MODELS.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#f8f9fb',
                borderRadius: 8,
              }}
            >
              <Text strong style={{ fontSize: 13 }}>
                {m.name}
              </Text>
              <Tag
                style={{
                  margin: 0,
                  borderRadius: 4,
                  fontSize: 11,
                }}
                color={m.type === '文本' ? 'blue' : m.type === '图像' ? 'purple' : 'orange'}
              >
                {m.type}
              </Tag>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
