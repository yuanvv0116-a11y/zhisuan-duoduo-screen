import { useState, useEffect, useMemo } from 'react'
import { Card, Button, Tag, message, Modal } from 'antd'
import {
  WechatOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  DownOutlined,
} from '@ant-design/icons'
import type { PlanDurationOption, PlanValidityUnit } from '../types'
import { PLAN_DURATION_UNIT_META, durationToDisplayUnits } from '../types'

type DurationProp = 'month' | 'quarter' | 'year' | PlanDurationOption

interface Props {
  productName: string
  total: number
  orderNo: string
  onBack: () => void
  onPaymentSuccess: () => void
  duration?: DurationProp
  validityUnit?: PlanValidityUnit
  qty?: number
}

function resolveDurationInfo(duration?: DurationProp, validityUnit?: PlanValidityUnit) {
  if (!duration) return null
  if (typeof duration === 'string') {
    const monthsMap: Record<string, number> = { month: 1, quarter: 3, year: 12 }
    const unit = validityUnit ?? 'month'
    const months = monthsMap[duration] ?? 1
    const labelMap: Record<string, string> = { month: '月付', quarter: '季付', year: '年付' }
    const unitMeta = PLAN_DURATION_UNIT_META[unit]
    const displayUnits = durationToDisplayUnits(months, unit)
    return {
      label: (labelMap[duration] as string) || `${displayUnits}${unitMeta.payPrefix}`,
      months,
      unit,
    }
  }
  return {
    label: duration.label,
    months: duration.months,
    unit: (validityUnit ?? 'month') as PlanValidityUnit,
  }
}

function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const time = `${now.getHours()}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${y}${m}${d}${time}${rand}`
}

const MOCK_QR = [
  '1111010101',
  '1010101010',
  '0111011101',
  '1011001110',
  '1110101101',
  '0101010101',
  '1111111010',
  '1010111001',
  '0101101101',
  '1100110011',
  '1010101010',
  '0111011101',
  '1110101101',
  '0101010101',
  '1111111010',
  '1010111001',
]

export default function PaymentPage({
  productName,
  total,
  orderNo,
  onBack,
  onPaymentSuccess,
  duration,
  validityUnit,
  qty,
}: Props) {
  const [countdown, setCountdown] = useState(15 * 60)
  const [paid, setPaid] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const displayOrderNo = useMemo(() => orderNo || generateOrderNo(), [orderNo])

  const durationInfo = useMemo(
    () => resolveDurationInfo(duration, validityUnit),
    [duration, validityUnit],
  )

  const unitPriceText = useMemo(() => {
    if (!durationInfo) return null
    const { months, unit } = durationInfo
    const monthsPerUnit = PLAN_DURATION_UNIT_META[unit]?.monthsPerUnit ?? 1
    const displayUnits = durationToDisplayUnits(months, unit)
    const pricePerUnit = +(total / Math.max(1, displayUnits)).toFixed(2)
    return `¥${pricePerUnit.toFixed(2)}/${PLAN_DURATION_UNIT_META[unit]?.unitSingle ?? '月'}`
  }, [durationInfo, total])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0')
  const ss = String(countdown % 60).padStart(2, '0')

  const handleMockPay = () => {
    setPaid(true)
  }

  const handleConfirmSuccess = () => {
    setPaid(false)
    onPaymentSuccess()
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 52px)', background: '#f0f2f5' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#5a6474' }}>
            <span>安全支付</span>
            <span style={{ color: '#2f6bff' }}>¥{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 主体 */}
      <div style={{ maxWidth: 760, margin: '24px auto', padding: '0 24px' }}>
        <Card
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          bodyStyle={{ padding: '32px 40px' }}
        >
          {/* 商品订单信息 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 28 }}>
            <div>
              <span style={{ fontSize: 14, color: '#6b7280' }}>商品订单：</span>
              <span style={{ fontSize: 14, color: '#111827', fontFamily: 'monospace' }}>
                {displayOrderNo}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 14, color: '#6b7280' }}>支付金额：</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>
                ¥{total.toFixed(2)}
              </span>
            </div>
            <a
              onClick={() => setShowDetail(!showDetail)}
              style={{
                fontSize: 13,
                color: '#2f6bff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              订单详情
              <DownOutlined style={{ fontSize: 10 }} />
            </a>
          </div>

          {showDetail && (
            <div
              style={{
                marginBottom: 28,
                padding: 16,
                background: '#f9fafb',
                borderRadius: 8,
                fontSize: 13,
                color: '#4b5563',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>商品</span>
                <span>{productName}</span>
              </div>
              {durationInfo && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>时长</span>
                    <span>{durationInfo.label}</span>
                  </div>
                  {unitPriceText && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span>单价</span>
                      <span>{unitPriceText}</span>
                    </div>
                  )}
                </>
              )}
              {qty && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>购买数量</span>
                  <span>{qty} 个</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>合计</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>¥{total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* 分隔线 */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: 28 }} />

          {/* 支付方式 */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>支付方式：</div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                border: '2px solid #09bb07',
                borderRadius: 8,
                background: '#f0fdf4',
              }}
            >
              <WechatOutlined style={{ fontSize: 20, color: '#09bb07' }} />
              <span style={{ fontSize: 14, color: '#09bb07', fontWeight: 600 }}>微信支付</span>
              <CheckCircleFilled style={{ fontSize: 14, color: '#09bb07' }} />
            </div>
          </div>

          {/* 二维码区域 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 60, alignItems: 'center', marginBottom: 16 }}>
            {/* 二维码 */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 200,
                  height: 200,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  position: 'relative',
                  margin: '0 auto',
                }}
              >
                {/* 模拟二维码 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(16, 1fr)',
                    gridTemplateRows: 'repeat(16, 1fr)',
                    width: '100%',
                    height: '100%',
                    gap: 1,
                  }}
                >
                  {Array.from({ length: 256 }).map((_, i) => {
                    const row = Math.floor(i / 16)
                    const col = i % 16
                    const isCorner =
                      (row < 3 && col < 3) ||
                      (row < 3 && col > 12) ||
                      (row > 12 && col < 3)
                    const fill = isCorner
                      ? true
                      : MOCK_QR[row % MOCK_QR.length][col] === '1'
                    return (
                      <div
                        key={i}
                        style={{
                          background: fill ? '#111' : '#fff',
                          borderRadius: fill && isCorner ? 0 : 0,
                        }}
                      />
                    )
                  })}
                </div>
                {/* 中心微信 Logo */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 36,
                    height: 36,
                    background: '#fff',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <WechatOutlined style={{ fontSize: 24, color: '#09bb07' }} />
                </div>
              </div>
              {/* 提示文字 */}
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 24px',
                  background: '#09bb07',
                  color: '#fff',
                  fontSize: 13,
                  borderRadius: 4,
                  display: 'inline-block',
                }}
              >
                请打开手机微信，扫一扫完成支付
              </div>
              {/* 倒计时 */}
              <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
                二维码将在 <span style={{ color: '#ef4444', fontWeight: 600 }}>{mm}:{ss}</span> 后过期
              </div>
            </div>

            {/* 手机示意图 */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 160,
                  height: 280,
                  background: '#1a1a1a',
                  borderRadius: 24,
                  padding: 8,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#2a2a2a',
                    borderRadius: 16,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* 顶部状态栏 */}
                  <div
                    style={{
                      height: 24,
                      background: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#fff',
                    }}
                  >
                    9:41
                  </div>
                  {/* 微信顶部栏 */}
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#2a2a2a',
                      color: '#fff',
                      fontSize: 11,
                      textAlign: 'center',
                      borderBottom: '1px solid #333',
                    }}
                  >
                    微信
                  </div>
                  {/* 扫一扫区域 */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 24,
                      padding: 20,
                    }}
                  >
                    {['朋友圈', '扫一扫', '摇一摇'].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            color: '#fff',
                          }}
                        >
                          {i === 0 ? '👥' : i === 1 ? '📷' : '📳'}
                        </div>
                        <span style={{ color: '#fff', fontSize: 12 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  {/* 底部指示条 */}
                  <div
                    style={{
                      height: 16,
                      background: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 3,
                        background: '#fff',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
                {/* 扫一扫高亮 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 10,
                    right: 10,
                    height: 32,
                    background: 'rgba(9, 187, 7, 0.3)',
                    border: '1px solid #09bb07',
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                打开微信「扫一扫」
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
            <Button
              onClick={onBack}
              style={{ height: 40, borderRadius: 8, fontSize: 14 }}
            >
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleMockPay}
              style={{
                height: 40,
                borderRadius: 8,
                fontSize: 14,
                background: '#09bb07',
                borderColor: '#09bb07',
              }}
            >
              我已支付完成
            </Button>
          </div>
        </Card>
      </div>

      {/* 支付成功弹窗 */}
      <Modal
        open={paid}
        centered
        width={400}
        footer={null}
        closable={false}
        maskClosable={false}
        destroyOnClose
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <CheckCircleFilled style={{ fontSize: 56, color: '#52c41a', marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            支付成功
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
            {durationInfo
              ? `您已成功订阅 ${productName}（${durationInfo.label}）`
              : `您已成功购买 ${productName}`}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>
            支付金额：¥{total.toFixed(2)}
          </div>
          <Button
            type="primary"
            size="large"
            block
            onClick={handleConfirmSuccess}
            style={{ height: 44, borderRadius: 8, background: '#2f6bff', borderColor: '#2f6bff' }}
          >
            确定
          </Button>
        </div>
      </Modal>
    </div>
  )
}
