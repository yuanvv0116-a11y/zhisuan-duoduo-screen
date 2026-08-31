import { useState, useMemo } from 'react'
import { Card, Checkbox, Button, Tag, Divider, Switch, message } from 'antd'
import {
  WechatOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import type { TokenPlan, PlanDurationOption } from '../types'
import {
  calcPlanDiscountedPrice,
  formatDurationText,
  PLAN_DURATION_UNIT_META,
} from '../types'
import type { AgreementType } from './AgreementPage'

interface PayData {
  /** 选中的订阅时长索引，对应 plan.durations 中的位置 */
  durationIdx: number
  /** 选中的订阅时长选项（完整对象，方便上层使用） */
  durationOption: PlanDurationOption
  total: number
  orderNo: string
}

interface Props {
  plan: TokenPlan
  onBack: () => void
  onPay: (data: PayData) => void
  onOpenAgreement?: (type: AgreementType) => void
  /** 是否为续费模式 */
  isRenew?: boolean
  /** 续费模式下的现有到期日期（YYYY-MM-DD） */
  renewEndDate?: string
}

const PLAN_MODELS: Record<string, { name: string; type: string }[]> = {
  lite: [
    { name: 'Qwen3.6-27B', type: '文本' },
    { name: 'DODO-AC-Ultra-5', type: '文本' },
    { name: 'Doubao-Seedream-5.0', type: '图像' },
    { name: 'DeepSeek-V4-Flash', type: '文本' },
  ],
  standard: [
    { name: 'Qwen3.6-27B', type: '文本' },
    { name: 'Qwen3.6-72B', type: '文本' },
    { name: 'DODO-AC-Ultra-5', type: '文本' },
    { name: 'Doubao-Seedream-5.0-Pro', type: '图像' },
    { name: 'Doubao-Seedance-2.0', type: '视频' },
    { name: 'DeepSeek-V4', type: '文本' },
  ],
  pro: [
    { name: 'Qwen3.6-27B', type: '文本' },
    { name: 'Qwen3.6-72B', type: '文本' },
    { name: 'GLM-5.2-FP8', type: '文本' },
    { name: 'GLM-5.2', type: '文本' },
    { name: 'DODO-AC-Ultra-5', type: '文本' },
    { name: 'DODO-AC-Pro-5', type: '文本' },
    { name: 'Doubao-Seedream-5.0-Pro', type: '图像' },
    { name: 'Doubao-Seedance-2.0', type: '视频' },
    { name: 'DeepSeek-V4', type: '文本' },
    { name: 'DeepSeek-V4-Pro', type: '文本' },
  ],
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

/** 把「月」为单位的小数，转成对应 Date 上加月份（四舍五入到最近的月边界 + 天/周用天数补） */
function addMonthsLoose(date: Date, months: number): Date {
  const d = new Date(date)
  // 先加整数月
  const wholeMonths = Math.floor(months)
  d.setMonth(d.getMonth() + wholeMonths)
  // 余数转成天数（1 个月按 30 天）
  const remainDays = Math.max(0, Math.round((months - wholeMonths) * 30))
  if (remainDays > 0) d.setDate(d.getDate() + remainDays)
  return d
}

export default function PurchaseCheckout({ plan, onBack, onPay, onOpenAgreement, isRenew = false, renewEndDate }: Props) {
  const durations = plan.durations?.length
    ? plan.durations
    : [{ label: '月付', months: 1, discount: 100, finalPrice: plan.discountPrice ?? plan.price }]

  const [durationIdx, setDurationIdx] = useState<number>(0)
  const [autoRenew, setAutoRenew] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const currentDuration = durations[Math.min(durationIdx, durations.length - 1)]
  const monthsPerUnit = PLAN_DURATION_UNIT_META[plan.validityUnit]?.monthsPerUnit ?? 1
  const totalMonths = currentDuration.months
  const unitPrice =
    (typeof plan.discountPrice === 'number' ? plan.discountPrice : calcPlanDiscountedPrice(plan.price, plan.discount ?? 100)) / monthsPerUnit
  // 售价按「1 个 validityUnit」对应的金额显示；卡片展示用 /单位 字
  const pricePerUnit = +(plan.price / monthsPerUnit).toFixed(2)
  const discountedPerUnit = +(
    (typeof plan.discountPrice === 'number' ? plan.discountPrice : calcPlanDiscountedPrice(plan.price, plan.discount ?? 100)) / monthsPerUnit
  ).toFixed(2)

  const total = currentDuration.finalPrice
  // 原价 = plan.price × 总时长（以 validityUnit 为基准的个数）
  const totalCount = totalMonths / monthsPerUnit || 1
  const originalTotal = +(plan.price * totalCount).toFixed(2)
  const savings = Math.max(0, +(originalTotal - total).toFixed(2))

  const levelLabel = plan.level === 'lite' ? '入门' : plan.level === 'standard' ? '标准' : '专业'
  const levelColor = plan.level === 'lite' ? 'green' : plan.level === 'standard' ? 'blue' : 'purple'
  const models: { name: string; type: string }[] = PLAN_MODELS[plan.level ?? ''] || []

  const durationText = formatDurationText(totalMonths, plan.validityUnit)
  const unitSuffix = PLAN_DURATION_UNIT_META[plan.validityUnit]?.unitSingle ?? '月'
  const usageUnitSuffix = plan.validityUnit === 'day'
    ? '天'
    : plan.validityUnit === 'week'
    ? '周'
    : plan.validityUnit === 'month'
    ? '月'
    : plan.validityUnit === 'quarter'
    ? '季'
    : '年'

  const expireDate = useMemo(() => {
    const d = addMonthsLoose(new Date(), totalMonths)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [totalMonths])

  const handleConfirm = () => {
    if (!agreeTerms) {
      message.warning('请先阅读并同意服务协议')
      return
    }
    onPay({
      durationIdx,
      durationOption: currentDuration,
      total,
      orderNo: generateOrderNo(),
    })
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
          <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{isRenew ? 'Token Plan 个人版套餐 续费' : '购买 Token Plan 个人版套餐'}</span>
        </div>
      </div>

      {/* 内容区 */}
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '24px 24px 80px',
        }}
      >
        {/* 页面标题 */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#111827', margin: 0 }}>
            {isRenew ? 'Token Plan 个人版套餐 续费' : '购买 Token Plan 个人版套餐'}
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
            {isRenew
              ? `续费后，将在现有结束日期（到期时间：${renewEndDate ?? '—'}）后，延续本次订阅时长，一经续订，不支退换，请谨慎操作`
              : '一个账号仅支持购买一个个人版套餐。Token 套餐一经订阅开通，不支持退费、降配，请您确认需求后再下单支付。'}
          </span>
        </div>

        {/* 主体内容 */}
        <div
          style={{
            display: 'flex',
            gap: 24,
          }}
        >
        {/* 左侧：购买须知 + 套餐配置 + 时长 + 自动续费 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card
            title={
              <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>购买须知</span>
            }
            style={{ borderRadius: 10, border: '1px solid #e8ecf0' }}
            styles={{ body: { padding: '4px 20px' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px dashed #f0f0f0' }}>
                <Tag color="blue" style={{ margin: 0, flexShrink: 0 }}>计费规则</Tag>
                <span style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                  <span style={{ color: '#52c41a' }}>✓</span> 订阅模式　<span style={{ color: '#faad14' }}>⦿</span> 不支持退订
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px dashed #f0f0f0' }}>
                <Tag color="blue" style={{ margin: 0, flexShrink: 0 }}>变更规则</Tag>
                <span style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                  订阅套餐在用量或周期未结束之前，不支持修改。套餐结束后，可重新选择套餐。超出总额度后调用将被阻断，可购买资源包补充额度。
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
                <Tag color="blue" style={{ margin: 0, flexShrink: 0 }}>抵扣规则</Tag>
                <span style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
                  套餐额度需在订阅周期内用完，开通自动续费后下一个周期会恢复额度。周期内未耗尽额度将自动清零，不顺延到下期。
                </span>
              </div>
            </div>
          </Card>

          {/* 套餐配置 */}
          <Card
            title={
              <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>套餐配置</span>
            }
            style={{ borderRadius: 10, border: '1px solid #e8ecf0' }}
            styles={{ body: { padding: '20px' } }}
          >
            {/* 支持模型 */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 8 }}>支持模型（为优化使用，期间可能有部分调整）</div>
              <div style={{ fontSize: 13, color: '#333', lineHeight: 1.8 }}>
                {models.map((m, i) => (
                  <span key={m.name}>
                    <span style={{ color: '#111827' }}>{m.name}</span>
                    {i < models.length - 1 && <span style={{ color: '#c0c4cc', margin: '0 4px' }}>,</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* 套餐卡片 */}
            <div>
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: '1px solid #2f6bff',
                  background: 'linear-gradient(135deg, #f0f7ff 0%, #e0ecff 100%)',
                }}
              >
                {/* 标题行 */}
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                    {plan.name}
                  </span>
                  {plan.productTag && (
                    <Tag
                      color="blue"
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        padding: '1px 6px',
                      }}
                    >
                      {plan.productTag}
                    </Tag>
                  )}
                  <Tag
                    color={levelColor as any}
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      padding: '1px 6px',
                    }}
                  >
                    {levelLabel}
                  </Tag>
                </div>

                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                  {plan.subtitle}
                </div>

                {/* 价格 */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#ff6b35' }}>
                    ¥{discountedPerUnit.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>/{unitSuffix}</span>
                  {plan.showOriginalPrice &&
                  typeof plan.originalPrice === 'number' &&
                  plan.originalPrice > 0 ? (
                    <span
                      style={{
                        fontSize: 13,
                        color: '#9ca3af',
                        textDecoration: 'line-through',
                      }}
                    >
                      ¥{(plan.originalPrice / monthsPerUnit).toFixed(2)}/{unitSuffix}
                    </span>
                  ) : pricePerUnit > discountedPerUnit ? (
                    <span
                      style={{
                        fontSize: 13,
                        color: '#9ca3af',
                        textDecoration: 'line-through',
                      }}
                    >
                      ¥{pricePerUnit.toFixed(2)}/{unitSuffix}
                    </span>
                  ) : null}
                </div>

                {/* 特性列表 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#52c41a', fontSize: 12 }}>⊙</span>
                    每订阅{usageUnitSuffix}：{plan.usageLimit.toLocaleString()} Token
                  </div>
                  <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#52c41a', fontSize: 12 }}>⊙</span>
                    支持 {models.length} 种模型使用
                  </div>
                  <div style={{ fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#52c41a', fontSize: 12 }}>⊙</span>
                    {plan.level === 'lite' ? '适合入门探索、原型验证' : plan.level === 'standard' ? '适合日常办公和开发' : '适合高并发深度应用'}
                  </div>
                </div>

                {/* 分割线 */}
                <Divider style={{ margin: '12px 0' }} />

                {/* 限制说明 */}
                <div style={{ fontSize: 12, color: '#8b93a5', lineHeight: 1.8 }}>
                  个人套餐为订阅人独享，禁止共享。一经订阅开通，不支持退费、降配，请谨慎选择。
                </div>
              </div>
            </div>
          </Card>

          {/* 订阅时长 + 自动续费 */}
          <Card
            style={{ borderRadius: 10, border: '1px solid #e8ecf0' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            {/* 订阅时长 */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 88, fontSize: 14, color: '#374151', flexShrink: 0 }}>订阅时长</div>
              <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                {durations.map((opt, idx) => {
                  const selected = durationIdx === idx
                  const showDiscount = opt.discount < 100
                  return (
                    <div
                      key={idx}
                      onClick={() => setDurationIdx(idx)}
                      style={{
                        minWidth: 100,
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: selected ? '2px solid #2f6bff' : '1px solid #e8ecf0',
                        background: selected ? '#f0f5ff' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: selected ? 600 : 400,
                          color: selected ? '#2f6bff' : '#111827',
                        }}
                      >
                        {opt.label || formatDurationText(opt.months, plan.validityUnit)}
                      </div>
                      {showDiscount && (
                        <div style={{ fontSize: 11, color: '#ff6b35' }}>{opt.discount}折</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 自动续费 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 88, fontSize: 14, color: '#374151', flexShrink: 0 }}>自动续费</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  到期后将从账户中自动续费，可在订阅管理中随时取消，账户余额不足，会导致扣费失败，无法继续使用。
                </div>
                <Switch checked={autoRenew} onChange={setAutoRenew} />
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧：订单摘要 */}
        <div style={{ width: 340, position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <div
            style={{
              borderRadius: 12,
              border: '1px solid #e8ecf0',
              background: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* 订单摘要头 */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>订单摘要</div>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* 套餐信息 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>套餐版本</span>
                <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>
                  {plan.name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>订阅时长</span>
                <span style={{ fontSize: 13, color: '#111827' }}>
                  {currentDuration.label || durationText}（到期：{expireDate}）
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>额度</span>
                <span style={{ fontSize: 13, color: '#111827' }}>
                  {plan.usageLimit.toLocaleString()} Token/{usageUnitSuffix}
                </span>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* 价格明细 */}
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, color: '#6b7280' }}>优惠</span>
                    <span style={{ fontSize: 13, color: '#52c41a' }}>-¥{savings.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* 应付 */}
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
                  <span style={{ fontSize: 12, color: '#8b93a5', marginLeft: 2 }}>
                    （{durationText}）
                  </span>
                </div>
              </div>

              {/* 支付方式 */}
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
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <WechatOutlined
                      style={{
                        color: '#09bb07',
                        fontSize: 20,
                      }}
                    />
                    <span style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>微信支付</span>
                  </div>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#2f6bff',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                  >
                    ✓
                  </div>
                </div>
              </div>

              {/* 协议勾选 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  marginBottom: 16,
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 1.6,
                }}
              >
                <Checkbox
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  我已阅读并同意
                  <a
                    onClick={(e) => {
                      e.preventDefault()
                      onOpenAgreement?.('subscription')
                    }}
                    style={{ color: '#2f6bff', cursor: 'pointer' }}
                  >
                    《服务协议》
                  </a>
                  与
                  <a
                    onClick={(e) => {
                      e.preventDefault()
                      onOpenAgreement?.('subscription')
                    }}
                    style={{ color: '#2f6bff', cursor: 'pointer' }}
                  >
                    《隐私政策》
                  </a>
                  ，确认订阅
                  <a
                    onClick={(e) => {
                      e.preventDefault()
                      onOpenAgreement?.('subscription')
                    }}
                    style={{ color: '#2f6bff', cursor: 'pointer' }}
                  >
                    《套餐购买协议》
                  </a>
                </span>
              </div>

              {/* 去支付按钮 */}
              <Button
                type="primary"
                size="large"
                block
                onClick={handleConfirm}
                style={{
                  height: 44,
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(47, 107, 255, 0.25)',
                  marginBottom: 8,
                }}
              >
                去支付 ¥{total.toFixed(2)}
              </Button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#9ca3af',
                }}
              >
                <InfoCircleOutlined />
                <span>支付成功后将自动开始服务，可在「我的订阅」中查看</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
