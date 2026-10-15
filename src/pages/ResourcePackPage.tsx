import { useMemo, useState } from 'react'
import { Button, Card, Checkbox, Divider, Table, Tabs, Tag, Tooltip, message } from 'antd'
import {
  ArrowLeftOutlined,
  BookFilled,
  CodeFilled,
  InfoCircleOutlined,
  MinusOutlined,
  PlusOutlined,
  StarFilled,
  TagFilled,
  WechatOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PaymentPage from './PaymentPage'
import AgreementPage from './AgreementPage'
import type { AgreementType } from './AgreementPage'

type Pack = {
  id: string
  name: string
  desc: string
  price: number
  originalPrice: number
  benefit: string
}

const DESC_QWEN =
  '千问旗舰模型，支持 1M 无损上下文，长程任务执行更稳定，工程规范遵循更可靠。'
const DESC_DEEPSEEK =
  'DeepSeek-V4 是旗舰模型，拥有卓越的编程能力与更稳定的多步骤推理/执行能力。在执行复杂智能体任务提升明显，同时对话更自然。'
const DESC_WAN =
  '最新图像生成模型，文字渲染效果出众，兼顾全局指令理解与局部细节刻画，在海报、PPT、科普图等知识密集型场景效果佳。'
const DESC_HORSE =
  'HappyHorse 全新视频生成模型，支持文生视频、图生视频的高质量视频生成，画面流畅、细节丰富。'
const DESC_GLM =
  '智谱旗舰模型，支持 1M 无损上下文，长程任务执行更稳定，工程规范遵循更可靠。'

const PACKS: Pack[] = [
  { id: 'p1', name: 'Qwen-Max 特价尊享包', desc: DESC_QWEN, price: 189.9, originalPrice: 259.9, benefit: '包含1亿Qwen-Max（有效期3个月）' },
  { id: 'p2', name: 'Qwen-Max 特价尝鲜包', desc: DESC_QWEN, price: 39.9, originalPrice: 59.9, benefit: '包含2000万Qwen-Max（有效期1个月）' },
  { id: 'p3', name: 'DeepSeek-V4 8折特惠包', desc: DESC_DEEPSEEK, price: 56, originalPrice: 70, benefit: '包含3000万DeepSeek-V4（有效期1个月）' },
  { id: 'p4', name: 'DeepSeek-V4 3折尊享包', desc: DESC_DEEPSEEK, price: 199.9, originalPrice: 666, benefit: '包含1亿DeepSeek-V4（有效期3个月）' },
  { id: 'p5', name: 'Wan-Image 8折特惠包', desc: DESC_WAN, price: 40, originalPrice: 50, benefit: '包含1000张Wan-Image图像（有效期1个月）' },
  { id: 'p6', name: 'Wan-Image 3折尝鲜包', desc: DESC_WAN, price: 5.9, originalPrice: 19.9, benefit: '包含100张Wan-Image图像（有效期1个月）' },
  { id: 'p7', name: 'HappyHorse 视频8折特惠包', desc: DESC_HORSE, price: 28, originalPrice: 35, benefit: '包含10次HappyHorse视频生成（有效期1个月）' },
  { id: 'p8', name: 'GLM-5.2 3折尝鲜包', desc: DESC_GLM, price: 2.9, originalPrice: 9.9, benefit: '包含100万GLM-5.2（有效期1个月）' },
]

/** 加油包卡片左上角图标（按顺序循环使用） */
const PACK_ICONS = [
  { icon: <StarFilled />, bg: 'linear-gradient(135deg, #8a7bff, #4a5bf0)' },
  { icon: <BookFilled />, bg: 'linear-gradient(135deg, #35e0b0, #0db39a)' },
  { icon: <CodeFilled />, bg: 'linear-gradient(135deg, #5b8cff, #2f6bff)' },
  { icon: <TagFilled />, bg: 'linear-gradient(135deg, #ffbe4a, #ff8a2f)' },
]

const BUY_NOTES = [
  '资源包购买成功后立即生效，使用时优先扣减Token Plan  然后扣减资源包，资源包额度使用完后则扣减现金账户;',
  '资源包的有效期按照自然月计算，具体以页面为主，同时购买相同模型资源包使用时间不叠加；',
  '资源包购买后不支持退款；',
]

const BUY_NOTE_TAGS = ['生效规则', '有效期规则', '退款规则']

type MyPack = {
  id: string
  name: string
  source: string
  status: '可用' | '已失效'
  scene: string
  balance: string
  availableBalance: string
  purchaseAt: string
  startAt: string
  endAt: string
}

const MY_PACKS: MyPack[] = []

function InfoTitle({ label, tip }: { label: string; tip: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {label}
      <Tooltip title={tip}>
        <InfoCircleOutlined style={{ color: '#b0b6bf' }} />
      </Tooltip>
    </span>
  )
}

const MY_PACK_COLUMNS: ColumnsType<MyPack> = [
  {
    title: '资源包名称',
    dataIndex: 'name',
    width: 200,
    fixed: 'left',
    ellipsis: { showTitle: false },
    render: (v: string) => (
      <Tooltip title={v} placement="topLeft">
        <span style={{ color: '#111827', fontWeight: 500 }}>{v}</span>
      </Tooltip>
    ),
  },
  { title: '获取方式', dataIndex: 'source', width: 100 },
  {
    title: '资源包状态',
    dataIndex: 'status',
    width: 110,
    render: (v: MyPack['status']) =>
      v === '可用' ? (
        <Tag bordered={false} style={{ margin: 0, color: '#16a34a', background: '#f0fdf4' }}>
          可用
        </Tag>
      ) : (
        <Tag bordered={false} style={{ margin: 0, color: '#8c8c8c', background: '#f2f3f5' }}>
          已失效
        </Tag>
      ),
  },
  {
    title: <InfoTitle label="适用场景" tip="资源包可抵扣的使用场景" />,
    dataIndex: 'scene',
    width: 220,
    ellipsis: { showTitle: false },
    render: (v: string) => (
      <Tooltip title={v} placement="topLeft">
        <span>{v}</span>
      </Tooltip>
    ),
  },
  {
    title: <InfoTitle label="当前余额" tip="资源包当前剩余的总量" />,
    dataIndex: 'balance',
    width: 160,
  },
  {
    title: <InfoTitle label="当前可用余额" tip="资源包当前状态下实际可使用的余额" />,
    dataIndex: 'availableBalance',
    width: 170,
  },
  { title: '购买时间', dataIndex: 'purchaseAt', width: 160 },
  { title: '生效时间', dataIndex: 'startAt', width: 170 },
  { title: '到期时间', dataIndex: 'endAt', width: 170 },
]

export default function ResourcePackPage() {
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [buyPack, setBuyPack] = useState<Pack | null>(null)
  const [qty, setQty] = useState(1)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [packPayment, setPackPayment] = useState<{
    productName: string
    total: number
    orderNo: string
    qty: number
  } | null>(null)
  const [agreementView, setAgreementView] = useState<AgreementType | null>(null)

  const visibleMyPacks = useMemo(
    () => (onlyAvailable ? MY_PACKS.filter((p) => p.status === '可用') : MY_PACKS),
    [onlyAvailable]
  )

  const openCheckout = (pack: Pack) => {
    setBuyPack(pack)
    setQty(1)
    setAgreeTerms(false)
  }

  const total = buyPack ? Math.round(buyPack.price * qty * 100) / 100 : 0

  const handlePay = () => {
    if (!buyPack) return
    if (!agreeTerms) {
      message.warning('请先阅读并同意购买协议')
      return
    }
    const now = new Date()
    const orderNo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${now.getHours()}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    setPackPayment({
      productName: buyPack.name,
      total,
      orderNo,
      qty,
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
        qty={packPayment.qty}
        onBack={() => setPackPayment(null)}
        onPaymentSuccess={() => {
          message.success('支付成功，资源包已到账')
          setPackPayment(null)
          setBuyPack(null)
        }}
      />
    )
  }

  if (buyPack) {
    const benefitMatch = /^包含(.+?)（有效期(.+?)）$/.exec(buyPack.benefit)
    const packAmount = benefitMatch ? benefitMatch[1] : buyPack.benefit
    const packValidity = benefitMatch ? benefitMatch[2] : '—'
    const validityMonths = parseInt(packValidity, 10) || 0
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + validityMonths)
    const expiryText = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-${String(expiryDate.getDate()).padStart(2, '0')}`
    const packModel = buyPack.name.split(' ')[0]
    const amountMatch = /^([\d.]+)(万|亿)?(张|次)?/.exec(packAmount)
    const amountValue = amountMatch
      ? parseFloat(amountMatch[1]) * (amountMatch[2] === '亿' ? 100000000 : amountMatch[2] === '万' ? 10000 : 1)
      : 0
    const quotaText = amountMatch
      ? amountMatch[3]
        ? `${amountValue.toLocaleString('en-US')} ${amountMatch[3]}`
        : `${amountValue.toLocaleString('en-US')} Tokens`
      : packAmount
    const totalLabel = buyPack.benefit.includes('图像')
      ? '图像总量'
      : buyPack.benefit.includes('视频')
        ? '视频总量'
        : 'token总量'
    const originalTotal = Math.round(buyPack.originalPrice * qty * 100) / 100
    const savings = Math.round((buyPack.originalPrice - buyPack.price) * qty * 100) / 100
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
            <span
              onClick={() => setBuyPack(null)}
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
            <div style={{ fontSize: 13, color: '#8b93a5' }}>安全支付 · 实时到账</div>
          </div>
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
              购买加油包
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
              资源包购买成功后立即生效，一经购买不支持退款，请您确认需求后再下单支付。
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
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>资源包配置</span>
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
                      {buyPack.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                    {buyPack.desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: '#ff6b35' }}>
                      ¥{buyPack.price.toFixed(2)}
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
              </Card>

              <Card
                style={{ borderRadius: 10, border: '1px solid #e8ecf0' }}
                styles={{ body: { padding: '20px 24px' } }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 88, fontSize: 14, color: '#374151', flexShrink: 0 }}>
                    购买数量
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      width: 320,
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid #e8ecf0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      style={{
                        width: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f7fa',
                        borderRight: '1px solid #e8ecf0',
                        color: qty <= 1 ? '#c9cdd4' : '#5a6474',
                        cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <MinusOutlined />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        background: '#fff',
                        fontSize: 14,
                        color: '#111827',
                      }}
                    >
                      {qty}
                    </div>
                    <div
                      onClick={() => setQty((q) => q + 1)}
                      style={{
                        width: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f7fa',
                        borderLeft: '1px solid #e8ecf0',
                        color: '#5a6474',
                        cursor: 'pointer',
                      }}
                    >
                      <PlusOutlined />
                    </div>
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
                    <span style={{ fontSize: 13, color: '#6b7280' }}>资源包</span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, textAlign: 'right' }}>
                      {buyPack.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>可用模型</span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{packModel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>额度</span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, textAlign: 'right' }}>
                      {quotaText}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>订阅时长</span>
                    <span style={{ fontSize: 13, color: '#111827', textAlign: 'right' }}>
                      {packValidity}（到期：{expiryText}）
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>购买数量</span>
                    <span style={{ fontSize: 13, color: '#111827' }}>{qty} 个</span>
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
                      <span style={{ fontSize: 12, color: '#8b93a5', marginLeft: 2 }}>
                        （×{qty}）
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
                          onClick={() => setAgreementView('subscription')}
                          style={{ color: '#2f6bff', margin: '0 2px', cursor: 'pointer' }}
                        >
                          《套餐购买协议》
                        </a>
                      </span>
                    </Checkbox>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <Button
                  block
                  size="large"
                  onClick={() => setBuyPack(null)}
                  style={{ height: 46, borderRadius: 8, fontSize: 14, borderColor: '#e8ecf0' }}
                >
                  取消
                </Button>
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
                  点击“去支付”即表示同意资源包购买规则，资源包一经购买开通不支持退款。实际扣费以账单为准。
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100%' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #eef0f4',
          padding: '4px 24px 24px',
        }}
      >
        <Tabs
          defaultActiveKey="buy"
          items={[
            {
              key: 'buy',
              label: '购买加油包',
              children: (
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 16,
                      marginTop: 8,
                    }}
                  >
                    {PACKS.map((p, i) => {
                      const it = PACK_ICONS[i % PACK_ICONS.length]
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 12,
                            border: '1px solid #eef0f4',
                            background: '#fff',
                            boxShadow: '0 2px 8px rgba(15, 35, 95, 0.06)',
                            padding: 20,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 10,
                                background: it.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: 20,
                                flexShrink: 0,
                              }}
                            >
                              {it.icon}
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                              {p.name}
                            </span>
                          </div>
                          <div
                            style={{
                              marginTop: 12,
                              fontSize: 13,
                              color: '#6b7280',
                              lineHeight: 1.8,
                              minHeight: 70,
                            }}
                          >
                            {p.desc}
                          </div>
                          <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0 14px' }} />
                          <div style={{ marginBottom: 14 }}>
                            <span style={{ fontSize: 26, fontWeight: 700, color: '#f5222d' }}>
                              {p.price}
                            </span>
                            <span style={{ fontSize: 13, color: '#f5222d', marginLeft: 4 }}>元</span>
                          </div>
                          <Button type="primary" block onClick={() => openCheckout(p)}>
                            去购买
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ),
            },
            {
              key: 'mine',
              label: '我的加油包',
              children: (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      margin: '8px 0 12px',
                    }}
                  >
                    <Checkbox
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                    >
                      仅展示可用资源包
                    </Checkbox>
                    <Tooltip title="勾选后仅展示状态为「可用」的资源包">
                      <InfoCircleOutlined style={{ marginLeft: 6, color: '#b0b6bf' }} />
                    </Tooltip>
                  </div>
                  <Table<MyPack>
                    rowKey="id"
                    columns={MY_PACK_COLUMNS}
                    dataSource={visibleMyPacks}
                    scroll={{ x: 'max-content' }}
                    pagination={{
                      pageSize: 10,
                      showTotal: (t) => `共 ${t} 条记录`,
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
