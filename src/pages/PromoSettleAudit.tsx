import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import { maskName } from '../components/SecretCell'
import RequirementDot from '../components/RequirementDot'
import {
  liveVoucherStatus,
  reviewWithdraw,
  usePromoExchanges,
  usePromoPartners,
  usePromoWithdraws,
  useVouchers,
} from '../store'
import type { ExchangeRecord, WithdrawRequest, WithdrawStatus } from '../types'
import { VOUCHER_STATUS_COLOR, VOUCHER_STATUS_LABEL, WITHDRAW_STATUS_LABEL } from '../types'
import { roundAmount } from '../types'

const { RangePicker } = DatePicker
const { Text } = Typography

const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

/** 绑定打款微信号（演示数据，脱敏展示） */
const WITHDRAW_WECHAT_MASKED = 'wx_****8866'

/** CSV 单元格：统一加引号并转义内部双引号 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

const withdrawStatusTag = (s: WithdrawStatus) =>
  s === 'pending' ? (
    <Tag color="orange">{WITHDRAW_STATUS_LABEL[s]}</Tag>
  ) : s === 'approved' ? (
    <Tag color="green">{WITHDRAW_STATUS_LABEL[s]}</Tag>
  ) : (
    <Tag color="red">{WITHDRAW_STATUS_LABEL[s]}</Tag>
  )

export default function PromoSettleAudit() {
  const withdraws = usePromoWithdraws()
  const exchanges = usePromoExchanges()
  const vouchers = useVouchers()
  const partners = usePromoPartners()

  const [activeTab, setActiveTab] = useState<'withdraw' | 'exchange'>('withdraw')

  interface WithdrawQuery {
    partner: string
    phone: string
    wechat: string
    status: 'all' | WithdrawStatus
    dateRange: [string, string] | null
  }
  const EMPTY_WITHDRAW_QUERY: WithdrawQuery = {
    partner: '',
    phone: '',
    wechat: '',
    status: 'all',
    dateRange: null,
  }
  const [wPartner, setWPartner] = useState('')
  const [wPhone, setWPhone] = useState('')
  const [wWechat, setWWechat] = useState('')
  const [wStatus, setWStatus] = useState<'all' | WithdrawStatus>('all')
  const [wRange, setWRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [wQuery, setWQuery] = useState<WithdrawQuery>(EMPTY_WITHDRAW_QUERY)

  interface ExchangeQuery {
    partner: string
    phone: string
    dateRange: [string, string] | null
  }
  const EMPTY_EXCHANGE_QUERY: ExchangeQuery = { partner: '', phone: '', dateRange: null }
  const [ePartner, setEPartner] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eRange, setERange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [eQuery, setEQuery] = useState<ExchangeQuery>(EMPTY_EXCHANGE_QUERY)

  const [rejectTarget, setRejectTarget] = useState<WithdrawRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  /** 通过提现弹窗：勾选「已打款」后录入实际扣税，确认后才置为已通过 */
  const [approveTarget, setApproveTarget] = useState<WithdrawRequest | null>(null)
  const [approvePaid, setApprovePaid] = useState(false)
  /** 实际扣税（元），默认 0，勾选「已打款」后在弹窗中录入 */
  const [approveTax, setApproveTax] = useState<number | null>(0)

  /** 分销人 id -> 手机号，用于按「分销人手机」过滤（提现/兑券记录只存 partnerId + 昵称） */
  const phoneByPartnerId = useMemo(() => {
    const map = new Map<string, string>()
    partners.forEach((p) => map.set(p.id, p.phone))
    return map
  }, [partners])

  /** 分销人 id -> 账户ID，用于「分销人」列昵称下方展示账户ID */
  const accountIdByPartnerId = useMemo(() => {
    const map = new Map<string, string>()
    partners.forEach((p) => map.set(p.id, p.accountId))
    return map
  }, [partners])

  const toRange = (r: [Dayjs | null, Dayjs | null] | null): [string, string] | null =>
    r && r[0] && r[1] ? [r[0].format('YYYY-MM-DD'), r[1].format('YYYY-MM-DD')] : null

  const inRange = (at: string, range: [string, string] | null) =>
    !range || (at.slice(0, 10) >= range[0] && at.slice(0, 10) <= range[1])

  const handleSearch = () => {
    setWQuery({
      partner: wPartner.trim(),
      phone: wPhone.trim(),
      wechat: wWechat.trim(),
      status: wStatus,
      dateRange: toRange(wRange),
    })
    setEQuery({ partner: ePartner.trim(), phone: ePhone.trim(), dateRange: toRange(eRange) })
  }
  const handleReset = () => {
    setWPartner('')
    setWPhone('')
    setWWechat('')
    setWStatus('all')
    setWRange(null)
    setWQuery(EMPTY_WITHDRAW_QUERY)
    setEPartner('')
    setEPhone('')
    setERange(null)
    setEQuery(EMPTY_EXCHANGE_QUERY)
  }

  const filteredWithdraws = useMemo(() => {
    return withdraws
      .filter((w) => {
        const partnerPhone = phoneByPartnerId.get(w.partnerId) ?? ''
        const matchPartner = !wQuery.partner || w.partnerName.includes(wQuery.partner)
        const matchPhone = !wQuery.phone || partnerPhone.includes(wQuery.phone)
        const matchWechat = !wQuery.wechat || WITHDRAW_WECHAT_MASKED.includes(wQuery.wechat)
        const matchStatus = wQuery.status === 'all' || w.status === wQuery.status
        const matchRange = inRange(w.appliedAt, wQuery.dateRange)
        return matchPartner && matchPhone && matchWechat && matchStatus && matchRange
      })
      .slice()
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  }, [withdraws, wQuery, phoneByPartnerId])

  const pendingCount = useMemo(() => withdraws.filter((w) => w.status === 'pending').length, [withdraws])

  /** 统计基于全量数据（不随搜索变化）：成功提现总额 = 已通过申请的提现金额合计 */
  const withdrawStats = useMemo(() => {
    let approvedAmount = 0
    withdraws.forEach((w) => {
      if (w.status === 'approved') {
        approvedAmount += w.amount
      }
    })
    return { approvedAmount }
  }, [withdraws])

  /** 成功兑券总额 = 兑券记录的券面额合计（兑券即时到账、无驳回），同时统计消耗佣金 */
  const exchangeStats = useMemo(() => {
    let faceValue = 0
    let commission = 0
    exchanges.forEach((e) => {
      faceValue += e.faceValue
      commission += e.commission
    })
    return { faceValue, commission }
  }, [exchanges])

  const filteredExchanges = useMemo(() => {
    return exchanges
      .filter((e) => {
        const partnerPhone = phoneByPartnerId.get(e.partnerId) ?? ''
        const matchPartner = !eQuery.partner || e.partnerName.includes(eQuery.partner)
        const matchPhone = !eQuery.phone || partnerPhone.includes(eQuery.phone)
        const matchRange = inRange(e.at, eQuery.dateRange)
        return matchPartner && matchPhone && matchRange
      })
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [exchanges, eQuery, phoneByPartnerId])

  /** 兑券记录的券状态：按券码回查代金券池取实时状态；券池查不到时按有效期兜底推断 */
  const exchangeVoucherStatus = (row: ExchangeRecord) => {
    const voucher = vouchers.find((v) => v.code === row.voucherCode)
    if (voucher) return liveVoucherStatus(voucher)
    return row.expireAt <= new Date().toISOString().slice(0, 19).replace('T', ' ') ? 'expired' : 'active'
  }

  /** 按当前筛选结果导出 CSV（不只当前页），字段与兑券记录列表一致 */
  const handleExchangeExport = () => {
    if (!filteredExchanges.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    const header = ['兑换时间', '分销人', '分销人ID', '手机号码', '消耗佣金（元）', '券面额（元）', '券码', '券有效期至', '券状态']
    const lines = [header.map(csvCell).join(',')]
    filteredExchanges.forEach((e) => {
      lines.push(
        [
          e.at,
          maskName(e.partnerName),
          accountIdByPartnerId.get(e.partnerId) ?? '—',
          phoneByPartnerId.get(e.partnerId) ?? '—',
          roundAmount(e.commission, 2).toFixed(2),
          roundAmount(e.faceValue, 2).toFixed(2),
          e.voucherCode,
          e.expireAt,
          VOUCHER_STATUS_LABEL[exchangeVoucherStatus(e)],
        ]
          .map(csvCell)
          .join(','),
      )
    })
    /** 前置 BOM，保证 Excel 直接打开时中文不乱码 */
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    a.download = `兑券记录_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filteredExchanges.length} 条记录`)
  }

  const handleApprove = () => {
    if (!approveTarget) return
    if (!approvePaid) {
      message.error('请先完成打款并勾选「已打款」')
      return
    }
    const res = reviewWithdraw(approveTarget.id, true, undefined, approveTax ?? 0)
    message.success(res.ok ? res.msg : res.msg)
    setApproveTarget(null)
    setApprovePaid(false)
    setApproveTax(0)
  }

  const handleReject = () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      message.error('请填写驳回原因')
      return
    }
    const res = reviewWithdraw(rejectTarget.id, false, rejectReason.trim())
    message.success(res.ok ? res.msg : res.msg)
    setRejectTarget(null)
    setRejectReason('')
  }

  const withdrawColumns: ColumnsType<WithdrawRequest> = [
    { title: '申请时间', dataIndex: 'appliedAt', fixed: 'left', width: 170 },
    {
      title: '分销人',
      dataIndex: 'partnerName',
      width: 170,
      render: (v: string, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{maskName(v)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {accountIdByPartnerId.get(row.partnerId) ?? '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: '收款微信',
      key: 'wechat',
      width: 140,
      render: () => <Text>{WITHDRAW_WECHAT_MASKED}</Text>,
    },
    {
      title: '提现金额',
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{money(v)}</span>,
    },
    {
      title: '预扣个税',
      dataIndex: 'tax',
      width: 100,
      align: 'right',
      render: (v: number, row) =>
        row.status === 'rejected' ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text type="secondary">-{money(v)}</Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: WithdrawStatus) => withdrawStatusTag(s),
    },
    {
      title: '审核信息',
      key: 'review',
      width: 240,
      ellipsis: { showTitle: false },
      render: (_, row) => {
        if (row.status === 'pending') return <Text type="secondary">—</Text>
        const text =
          row.status === 'rejected' && row.rejectReason
            ? `${row.reviewedAt ?? ''} · ${row.reviewer ?? ''} · ${row.rejectReason}`
            : `${row.reviewedAt ?? ''} · ${row.reviewer ?? ''}`
        return (
          <Tooltip title={text} placement="topLeft">
            <Text type="secondary" style={{ fontSize: 12 }}>
              {text}
            </Text>
          </Tooltip>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 130,
      render: (_, row) =>
        row.status === 'pending' ? (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => {
                setApprovePaid(false)
                setApproveTax(0)
                setApproveTarget(row)
              }}
            >
              通过
            </Button>
            <Button
              type="link"
              size="small"
              danger
              style={{ padding: 0 }}
              onClick={() => {
                setRejectReason('')
                setRejectTarget(row)
              }}
            >
              驳回
            </Button>
          </Space>
        ) : (
          <Text type="secondary">已处理</Text>
        ),
    },
  ]

  const exchangeColumns: ColumnsType<ExchangeRecord> = [
    { title: '兑换时间', dataIndex: 'at', fixed: 'left', width: 170 },
    {
      title: '分销人',
      dataIndex: 'partnerName',
      width: 170,
      render: (v: string, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{maskName(v)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {accountIdByPartnerId.get(row.partnerId) ?? '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: '消耗佣金',
      dataIndex: 'commission',
      width: 110,
      align: 'right',
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 500 }}>-{money(v)}</span>,
    },
    {
      title: '券面额',
      dataIndex: 'faceValue',
      width: 110,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{money(v)}</span>,
    },
    {
      title: '券码',
      dataIndex: 'voucherCode',
      width: 180,
      render: (code: string) => <Text copyable={{ text: code }}>{code}</Text>,
    },
    { title: '券有效期至', dataIndex: 'expireAt', width: 170 },
    {
      title: '券状态',
      key: 'voucherStatus',
      width: 90,
      render: (_, row) => {
        const status = exchangeVoucherStatus(row)
        return <Tag color={VOUCHER_STATUS_COLOR[status]}>{VOUCHER_STATUS_LABEL[status]}</Tag>
      },
    },
  ]

  const searchBarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  }

  const withdrawSearchBar = (
    <div style={searchBarStyle}>
      <SearchField label="分销人">
        <Input
          placeholder="请输入分销人昵称"
          allowClear
          style={{ width: 160 }}
          value={wPartner}
          onChange={(e) => setWPartner(e.target.value)}
          onPressEnter={handleSearch}
        />
      </SearchField>
      <SearchField label="分销人手机">
        <Input
          placeholder="请输入手机号码"
          allowClear
          style={{ width: 160 }}
          value={wPhone}
          onChange={(e) => setWPhone(e.target.value)}
          onPressEnter={handleSearch}
        />
      </SearchField>
      <SearchField label="收款微信">
        <Input
          placeholder="请输入收款微信"
          allowClear
          style={{ width: 160 }}
          value={wWechat}
          onChange={(e) => setWWechat(e.target.value)}
          onPressEnter={handleSearch}
        />
      </SearchField>
      <SearchField label="状态">
        <Select
          style={{ width: 120 }}
          value={wStatus}
          onChange={setWStatus}
          options={[
            { value: 'all', label: '全部' },
            { value: 'pending', label: WITHDRAW_STATUS_LABEL.pending },
            { value: 'approved', label: WITHDRAW_STATUS_LABEL.approved },
            { value: 'rejected', label: WITHDRAW_STATUS_LABEL.rejected },
          ]}
        />
      </SearchField>
      <SearchField label="申请时间">
        <RangePicker allowClear value={wRange} onChange={(v) => setWRange(v as [Dayjs | null, Dayjs | null] | null)} />
      </SearchField>
      <Space>
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
    </div>
  )

  const exchangeSearchBar = (
    <div style={searchBarStyle}>
      <SearchField label="分销人">
        <Input
          placeholder="请输入分销人昵称"
          allowClear
          style={{ width: 160 }}
          value={ePartner}
          onChange={(e) => setEPartner(e.target.value)}
          onPressEnter={handleSearch}
        />
      </SearchField>
      <SearchField label="分销人手机">
        <Input
          placeholder="请输入手机号码"
          allowClear
          style={{ width: 160 }}
          value={ePhone}
          onChange={(e) => setEPhone(e.target.value)}
          onPressEnter={handleSearch}
        />
      </SearchField>
      <SearchField label="兑换时间">
        <RangePicker allowClear value={eRange} onChange={(v) => setERange(v as [Dayjs | null, Dayjs | null] | null)} />
      </SearchField>
      <Space>
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
    </div>
  )

  return (
    <>
      <PageShell
        breadcrumb={['分销管理', '提现审核与兑券']}
        listTitle={activeTab === 'withdraw' ? '提现审核' : '兑券记录'}
        total={activeTab === 'withdraw' ? filteredWithdraws.length : filteredExchanges.length}
        hideTotal
      >
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'withdraw' | 'exchange')}
          items={[
            {
              key: 'withdraw',
              label: (
                <Space size={6}>
                  {pendingCount > 0 ? `提现审核（${pendingCount}）` : '提现审核'}
                  <RequirementDot
                    title="提现审核 · 需求说明"
                    sections={[
                      {
                        label: '需求内容',
                        items: [
                          '1.页面按照提现申请时间倒序展示；',
                          '2.支持根据页面搜索条件搜索，均支持模糊搜索；',
                          '3.成功提现总额=已通过审核的总额；',
                          '4.待审核的，展示通过驳回按钮；点击通过，需要填写打款信息，扣税金额支持4位小数。确认通过，正式扣除佣金可提现金额。状态变为已通过；\n驳回，则需要写明理由，确认后，将冻结的申请金额返还到可提现金额中。',
                        ],
                      },
                    ]}
                  />
                </Space>
              ),
              children: (
                <>
                  {withdrawSearchBar}
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          成功提现总额
                        </Text>
                        <Tooltip title="已通过（打款已完成）提现申请的提现金额合计" placement="top">
                          <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
                            {money(withdrawStats.approvedAmount)}
                          </div>
                        </Tooltip>
                      </Card>
                    </Col>
                  </Row>
                  <Table
                    rowKey="id"
                    size="middle"
                    columns={withdrawColumns}
                    dataSource={filteredWithdraws}
                    scroll={{ x: 'max-content' }}
                    pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条记录` }}
                  />
                </>
              ),
            },
            {
              key: 'exchange',
              label: (
                <Space size={6}>
                  兑券记录
                  <RequirementDot
                    title="兑券记录 · 需求说明"
                    sections={[
                      {
                        label: '需求内容',
                        items: [
                          '1.页面按照兑换时间倒序展示；',
                          '2.支持根据页面信息搜索；',
                          '3.成功兑券金额为代金券的面额总和，消耗佣金为实际支付佣金总额；',
                        ],
                      },
                    ]}
                  />
                </Space>
              ),
              children: (
                <>
                  {exchangeSearchBar}
                  <Row gutter={16} align="bottom" style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          成功兑券总额
                        </Text>
                        <Tooltip title="兑券记录的券面额合计（兑券即时到账、无驳回）" placement="top">
                          <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a', lineHeight: 1.4 }}>
                            {money(exchangeStats.faceValue)}
                          </div>
                        </Tooltip>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          消耗佣金 {money(exchangeStats.commission)}
                        </Text>
                      </Card>
                    </Col>
                    <Col flex="auto" style={{ textAlign: 'right' }}>
                      <Button icon={<DownloadOutlined />} onClick={handleExchangeExport}>
                        导出
                      </Button>
                    </Col>
                  </Row>
                  <Table
                    rowKey="id"
                    size="middle"
                    columns={exchangeColumns}
                    dataSource={filteredExchanges}
                    scroll={{ x: 'max-content' }}
                    pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条记录` }}
                  />
                </>
              ),
            },
          ]}
        />
      </PageShell>

      <Modal
        centered
        destroyOnClose
        width={520}
        title="驳回提现申请"
        open={!!rejectTarget}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onOk={handleReject}
        onCancel={() => setRejectTarget(null)}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            分销人 {rejectTarget ? maskName(rejectTarget.partnerName) : ''} · 提现 {rejectTarget ? money(rejectTarget.amount) : ''}，驳回后金额将退回其可用佣金余额。
          </Text>
        </div>
        <Input.TextArea
          rows={3}
          maxLength={100}
          showCount
          placeholder="请填写驳回原因，将同步展示给分销人"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={520}
        title="通过提现申请"
        open={!!approveTarget}
        okText="确认通过"
        cancelText="取消"
        onOk={handleApprove}
        onCancel={() => {
          setApproveTarget(null)
          setApprovePaid(false)
          setApproveTax(0)
        }}
      >
        <Descriptions column={1} size="small" labelStyle={{ width: 110 }}>
          <Descriptions.Item label="申请提现金额">
            <Text strong>{approveTarget ? money(approveTarget.amount) : '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="是否已打款">
            <Checkbox checked={approvePaid} onChange={(e) => setApprovePaid(e.target.checked)}>
              已打款
            </Checkbox>
          </Descriptions.Item>
          {approvePaid && (
            <>
              <Descriptions.Item label="扣税">
                <InputNumber
                  min={0}
                  precision={2}
                  value={approveTax}
                  onChange={(v) => setApproveTax(v)}
                  addonBefore="¥"
                  style={{ width: 160 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="实际打款">
                <Text strong>{money((approveTarget?.amount ?? 0) - (approveTax ?? 0))}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="收款微信">{WITHDRAW_WECHAT_MASKED}</Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Modal>
    </>
  )
}
