import { useMemo, useState } from 'react'
import { Alert, Button, Card, Checkbox, Descriptions, InputNumber, Space, Switch, Tabs, Tag, Tooltip, Typography, message } from 'antd'
import { QuestionCircleOutlined, WechatOutlined } from '@ant-design/icons'
import {
  CURRENT_CONSOLE_USER,
  findDemoAccount,
  liveVoucherStatus,
  useAccountLedgers,
  useVouchers,
} from '../store'
import { roundAmount } from '../types'
import type { VoucherIssueAccount } from '../store'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography

/** 余额展示口径：¥ + 6 位小数（与余额存储精度一致） */
const money6 = (n: number) => `¥${roundAmount(n, 6).toFixed(6)}`

const AMOUNT_OPTIONS = [10, 20, 30, 50, 100]

/** 当前账户标识 */
function useCurrentAccount(): VoucherIssueAccount {
  return findDemoAccount(CURRENT_CONSOLE_USER.accountId) ?? {
    accountId: CURRENT_CONSOLE_USER.accountId,
    accountName: CURRENT_CONSOLE_USER.nickname,
    phone: CURRENT_CONSOLE_USER.phone,
    accountType: 'personal',
  }
}

/** 现金主账户金额区（浅色渐变底） */
function BalanceSection() {
  const ledgers = useAccountLedgers()

  const cashBalance = useMemo(() => {
    const cashLedger = ledgers.find((l) => l.fundAccount === 'cash')
    return cashLedger ? cashLedger.amountAfter : 0
  }, [ledgers])
  const arrears = 0

  const [alertOn, setAlertOn] = useState(true)
  const [threshold] = useState(301)

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #f2f7ff 0%, #f7fbff 55%, #fbfdff 100%)',
        borderRadius: 8,
        padding: '20px 24px',
        flex: 1,
      }}
    >
      <Space size={12} wrap style={{ marginBottom: 16 }}>
        <Text strong style={{ whiteSpace: 'nowrap' }}>
          现金主账户
        </Text>
        {alertOn && <Tag color="success">余额预警已开启</Tag>}
        <a onClick={() => message.info('原型演示：跳转充值记录')}>充值记录</a>
        <a onClick={() => message.info('原型演示：跳转申请退费')}>申请退费</a>
      </Space>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 0', alignItems: 'stretch' }}>
        <div style={{ paddingRight: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', whiteSpace: 'nowrap' }}>
            {money6(cashBalance)}
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #e8ebf2', padding: '0 40px' }}>
          <Space size={4} style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              可用余额
            </Text>
            <TooltipableHelp text="现金主账户中可立即用于消费抵扣的余额" />
          </Space>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#1f2937' }}>{money6(cashBalance)}</div>
        </div>
        <div style={{ borderLeft: '1px solid #e8ebf2', padding: '0 40px' }}>
          <Space size={4} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#f5222d' }}>欠费金额</Text>
            <TooltipableHelp text="已出账但尚未支付的欠费合计，欠费期间部分按量服务将受限" />
          </Space>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#f5222d' }}>{arrears > 0 ? money6(arrears) : '¥0'}</div>
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          余额动态实时守护，风险出现时将主动预警。
        </Text>
        <Space size={8}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            余额预警
          </Text>
          <Switch
            size="small"
            checked={alertOn}
            onChange={(v) => {
              setAlertOn(v)
              message.success(v ? '余额预警已开启' : '余额预警已关闭')
            }}
          />
          <Text type="secondary" style={{ fontSize: 13 }}>
            阈值 ¥{threshold}
          </Text>
          <a onClick={() => message.info('原型演示：预警阈值设置')}>设置</a>
        </Space>
      </div>
    </div>
  )
}

/** 口径说明问号：悬浮即时展示 antd Tooltip */
function TooltipableHelp({ text }: { text: string }) {
  return (
    <Tooltip title={text} mouseEnterDelay={0.1}>
      <span style={{ color: '#bfbfbf', cursor: 'help', display: 'inline-flex', padding: '0 2px' }}>
        <QuestionCircleOutlined />
      </span>
    </Tooltip>
  )
}

/** 将 Date 转为 'YYYY-MM-DD HH:mm:ss'，与券时间戳同格式，可直接字典序比较 */
const fmtStamp = (dt: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`
}

/** 即将过期口径：距当前时间 5 天内将到期的可用券 */
const EXPIRING_SOON_DAYS = 5

/** 卡券账户：可用代金券总额 + 即将过期金额（浅色渐变底） */
function VoucherAccountSection({ onViewVouchers }: { onViewVouchers?: () => void }) {
  const vouchers = useVouchers()
  const account = useCurrentAccount()

  const { usableTotal, expiringSoonTotal, expiringCount } = useMemo(() => {
    const nowStr = fmtStamp(new Date())
    const soonStr = fmtStamp(new Date(Date.now() + EXPIRING_SOON_DAYS * 86400000))
    const usable = vouchers.filter(
      (v) => v.accountId === account.accountId && liveVoucherStatus(v) === 'active',
    )
    const total = usable.reduce((sum, v) => sum + v.balance, 0)
    const expiring = usable.filter((v) => v.expireAt && v.expireAt > nowStr && v.expireAt <= soonStr)
    return {
      usableTotal: roundAmount(total, 6),
      expiringSoonTotal: roundAmount(expiring.reduce((sum, v) => sum + v.balance, 0), 6),
      expiringCount: expiring.length,
    }
  }, [vouchers, account.accountId])

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #fff7ed 0%, #fffaf3 55%, #fffdfb 100%)',
        borderRadius: 8,
        padding: '20px 24px',
        flex: 1,
      }}
    >
      <Space size={12} wrap style={{ marginBottom: 16 }}>
        <Text strong style={{ whiteSpace: 'nowrap' }}>
          卡券账户
        </Text>
        {expiringCount > 0 && (
          <Tag color="warning">
            {expiringCount} 张代金券即将过期
          </Tag>
        )}
        {onViewVouchers && (
          <>
            <a onClick={onViewVouchers}>查看代金券</a>
            <RequirementDot
              title="账户概览 · 卡券账户"
              sections={[
                {
                  label: '需求内容',
                  items: [
                    '1.可用代金券总额为用户已收到的待使用+已生效状态代金券总额-已生效代金券余额；',
                    '2.即将过期金额为代金券失效日期-当前日期<=5天的所有代金券的余额总和；',
                    '3.点击查看代金券，跳转到代金券列表；',
                  ],
                },
              ]}
            />
          </>
        )}
      </Space>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 0', alignItems: 'stretch' }}>
        <div style={{ paddingRight: 40 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            可用代金券总额
          </Text>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', whiteSpace: 'nowrap' }}>
            {money6(usableTotal)}
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #f0e4d6', padding: '0 40px' }}>
          <Space size={4} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#fa8c16' }}>即将过期金额</Text>
            <TooltipableHelp text={`将在 ${EXPIRING_SOON_DAYS} 天内到期的可用代金券余额合计，请及时使用`} />
          </Space>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#fa8c16' }}>
            {expiringSoonTotal > 0 ? money6(expiringSoonTotal) : '¥0'}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 账户充值：在线充值 / 对公账户 两个 Tab */
function RechargeSection() {
  const [amount, setAmount] = useState<number | null>(10)
  const [customAmount, setCustomAmount] = useState<number | null>(null)
  const [agreed, setAgreed] = useState(true)

  const finalAmount = amount === -1 ? customAmount : amount

  const handlePay = () => {
    if (!finalAmount || finalAmount <= 0) {
      message.warning('请选择或输入充值金额')
      return
    }
    if (!agreed) {
      message.warning('请先阅读并同意充值须知')
      return
    }
    message.success('充值支付成功')
  }

  const online = (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        <Text style={{ width: 60, flexShrink: 0 }}>选择金额</Text>
        <Space size={12} wrap>
          {AMOUNT_OPTIONS.map((v) => {
            const active = amount === v
            return (
              <div
                key={v}
                onClick={() => {
                  setAmount(v)
                  setCustomAmount(null)
                }}
                style={{
                  minWidth: 72,
                  padding: '6px 16px',
                  textAlign: 'center',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: `1px solid ${active ? '#2f6bff' : '#eef0f4'}`,
                  color: active ? '#2f6bff' : '#333',
                  background: '#fff',
                }}
              >
                {v}元
              </div>
            )
          })}
          <div
            onClick={() => setAmount(-1)}
            style={{
              minWidth: 88,
              padding: amount === -1 ? '2px 8px' : '6px 16px',
              textAlign: 'center',
              borderRadius: 8,
              cursor: 'pointer',
              border: `1px solid ${amount === -1 ? '#2f6bff' : '#eef0f4'}`,
              background: '#fff',
            }}
          >
            {amount === -1 ? (
              <InputNumber
                autoFocus
                min={1}
                variant="borderless"
                placeholder="自定义金额"
                style={{ width: 110 }}
                value={customAmount}
                onChange={(v) => setCustomAmount(v)}
              />
            ) : (
              <span style={{ color: '#333' }}>自定义金额</span>
            )}
          </div>
        </Space>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        <Text style={{ width: 60, flexShrink: 0 }}>支付方式</Text>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 20px',
            borderRadius: 8,
            border: '1px solid #2f6bff',
            color: '#333',
          }}
        >
          <WechatOutlined style={{ color: '#09bb07', fontSize: 16 }} />
          微信
        </div>
      </div>
      <div style={{ marginLeft: 84, marginBottom: 16 }}>
        <Button type="primary" style={{ width: 132 }} onClick={handlePay}>
          确认支付
        </Button>
      </div>
      <div style={{ marginLeft: 84 }}>
        <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
          <Text style={{ fontSize: 12 }}>
            我已知晓：充值金额为不支持直接退款，充值后可用于平台消费，具体以平台规则为准。
          </Text>
        </Checkbox>
      </div>
    </div>
  )

  const corporate = (
    <div style={{ padding: '8px 0' }}>
      <Descriptions column={1} size="small" labelStyle={{ width: 96, color: '#666' }}>
        <Descriptions.Item label="收款单位名称">智算多多科技有限公司</Descriptions.Item>
        <Descriptions.Item label="开户银行">招商银行北京分行营业部</Descriptions.Item>
        <Descriptions.Item label="银行账号">
          <Text copyable>1109 8765 4321 0987</Text>
        </Descriptions.Item>
      </Descriptions>
      <Alert
        style={{ marginTop: 16, maxWidth: 640 }}
        type="info"
        showIcon
        message="汇款注意事项"
        description={
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            1. 转账时请在附言中备注您的账户 ID，便于到账核对；
            <br />
            2. 对公汇款一般 1～3 个工作日到账，到账后自动计入现金主账户；
            <br />
            3. 如需开具增值税专用发票，请在「发票信息」中先完善开票资料。
          </div>
        }
      />
    </div>
  )

  return <Tabs items={[{ key: 'online', label: '在线充值', children: online }, { key: 'corporate', label: '对公账户', children: corporate }]} />
}

export default function AccountOverview({ onViewVouchers }: { onViewVouchers?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Space size={6} style={{ marginBottom: 12 }}>
          <Text strong style={{ fontSize: 15 }}>
            账户总览
          </Text>
        </Space>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 8,
              border: '1px solid #eef0f4',
              flex: '2 1 460px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
            bodyStyle={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <BalanceSection />
          </Card>
          <Card
            variant="borderless"
            style={{
              borderRadius: 8,
              border: '1px solid #eef0f4',
              flex: '1 1 300px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
            bodyStyle={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <VoucherAccountSection onViewVouchers={onViewVouchers} />
          </Card>
        </div>
      </div>

      <div>
        <Space size={6} style={{ marginBottom: 12 }}>
          <Text strong style={{ fontSize: 15 }}>
            账户充值
          </Text>
        </Space>
        <Card variant="borderless" style={{ borderRadius: 8, border: '1px solid #eef0f4' }} bodyStyle={{ padding: 16 }}>
          <RechargeSection />
        </Card>
      </div>
    </div>
  )
}
