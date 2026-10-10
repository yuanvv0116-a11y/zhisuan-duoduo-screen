import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import { maskName } from '../components/SecretCell'
import {
  setPromoPartnerStatus,
  usePromoCommissions,
  usePromoInvitees,
  usePromoPartners,
} from '../store'
import type { PromoInvitee, PromoPartner, PromoPartnerStatus } from '../types'
import { PROMO_PARTNER_STATUS_LABEL } from '../types'
import { roundAmount } from '../types'

const { Text } = Typography

type StatusFilter = 'all' | 'active' | 'frozen'

/** 分销数据名单行：被邀请人基础信息 + 由分佣明细派生的消费状态与首次消费时间 */
type InviteeRow = Pick<PromoInvitee, 'id' | 'nickname' | 'phone' | 'accountId' | 'registeredAt'> & {
  consumed: boolean
  firstConsumedAt?: string
}

const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

const maskPhone = (v: string) => (v.length >= 11 ? `${v.slice(0, 3)}****${v.slice(-4)}` : v)

interface Props {
  /** 「分佣明细」跳转到「分销管理 › 分佣明细」页，并自动搜索该分销员 */
  onOpenCommissionDetail?: (p: PromoPartner) => void
}

export default function PromoPartnerManage({ onOpenCommissionDetail }: Props = {}) {
  const partners = usePromoPartners()
  const commissions = usePromoCommissions()
  const invitees = usePromoInvitees()

  const [accountIdKw, setAccountIdKw] = useState('')
  const [phoneKw, setPhoneKw] = useState('')
  const [nickKw, setNickKw] = useState('')
  const [statusKw, setStatusKw] = useState<StatusFilter>('all')
  const [query, setQuery] = useState<{
    accountId: string
    phone: string
    nickname: string
    status: StatusFilter
  }>({
    accountId: '',
    phone: '',
    nickname: '',
    status: 'all',
  })
  const [promoPartner, setPromoPartner] = useState<PromoPartner | null>(null)

  const handleSearch = () =>
    setQuery({
      accountId: accountIdKw.trim(),
      phone: phoneKw.trim(),
      nickname: nickKw.trim(),
      status: statusKw,
    })
  const handleReset = () => {
    setAccountIdKw('')
    setPhoneKw('')
    setNickKw('')
    setStatusKw('all')
    setQuery({ accountId: '', phone: '', nickname: '', status: 'all' })
  }

  const filtered = useMemo(() => {
    const accountId = query.accountId.toLowerCase()
    const phone = query.phone
    const nick = query.nickname.toLowerCase()
    return partners
      .filter((p) => {
        const matchAccountId = !accountId || p.accountId.toLowerCase().includes(accountId)
        const matchPhone = !phone || p.phone.includes(phone)
        const matchNick = !nick || p.nickname.toLowerCase().includes(nick)
        const matchStatus = query.status === 'all' || p.status === query.status
        return matchAccountId && matchPhone && matchNick && matchStatus
      })
      .slice()
      .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
  }, [partners, query])

  /**
   * 分销数据 = 被邀请人名单（邀请漏斗）。
   * 「是否产生消费」「首次消费时间」不在名单上冗余存储，统一由分佣明细的消耗返佣记录判定，保证与「分佣明细」同一口径。
   */
  const inviteeRows = useMemo<InviteeRow[]>(() => {
    if (!promoPartner) return []
    const firstConsumeAt = new Map<string, string>()
    commissions
      .filter((c) => c.partnerId === promoPartner.id && c.kind === 'consume')
      .forEach((c) => {
        const keys = [c.inviteeAccountId, c.inviteeName && c.inviteeName !== '—' ? c.inviteeName : undefined]
        keys.forEach((key) => {
          if (!key) return
          const prev = firstConsumeAt.get(key)
          if (!prev || c.at.localeCompare(prev) < 0) firstConsumeAt.set(key, c.at)
        })
      })
    return invitees
      .filter((r) => r.partnerId === promoPartner.id)
      .map((r) => {
        const firstConsumedAt =
          (r.accountId ? firstConsumeAt.get(r.accountId) : undefined) ?? firstConsumeAt.get(r.phone)
        return {
          id: r.id,
          nickname: r.nickname,
          phone: r.phone,
          accountId: r.accountId,
          registeredAt: r.registeredAt,
          consumed: Boolean(firstConsumedAt),
          firstConsumedAt,
        }
      })
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
  }, [commissions, invitees, promoPartner])

  const inviteeStats = useMemo(
    () => ({
      inviteCount: inviteeRows.length,
      consumedCount: inviteeRows.filter((r) => r.consumed).length,
    }),
    [inviteeRows],
  )

  const toggleStatus = (row: PromoPartner) => {
    const next: PromoPartnerStatus = row.status === 'active' ? 'frozen' : 'active'
    setPromoPartnerStatus(row.id, next)
    message.success(next === 'frozen' ? '合伙人已冻结' : '合伙人已解冻')
  }

  const [freezeRow, setFreezeRow] = useState<PromoPartner | null>(null)
  const [freezeBlockPayout, setFreezeBlockPayout] = useState(false)

  const confirmFreeze = () => {
    if (!freezeRow) return
    setPromoPartnerStatus(freezeRow.id, 'frozen')
    message.success(freezeBlockPayout ? '合伙人已冻结，且已禁止提现/兑换' : '合伙人已冻结')
    setFreezeRow(null)
    setFreezeBlockPayout(false)
  }

  const columns: ColumnsType<PromoPartner> = [
    {
      title: '账户信息',
      dataIndex: 'nickname',
      fixed: 'left',
      width: 150,
      render: (v: string, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{maskName(v)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.accountId}
          </Text>
        </Space>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      render: (v: string) => maskPhone(v),
    },
    {
      title: '邀请 / 首耗',
      key: 'funnel',
      width: 110,
      render: (_, row) => `${row.inviteCount} / ${row.firstConsumeCount}`,
    },
    {
      title: (
        <Tooltip title="累计佣金 = 可提现 + 已兑券 + 已提现">
          <span style={{ borderBottom: '1px dashed #bbb', cursor: 'help' }}>累计佣金</span>
        </Tooltip>
      ),
      dataIndex: 'totalCommission',
      width: 110,
      align: 'right',
      render: (v: number) => <Text style={{ fontWeight: 500 }}>{money(v)}</Text>,
    },
    {
      title: '可提现佣金',
      dataIndex: 'availableCommission',
      width: 110,
      align: 'right',
      render: (v: number) => <span style={{ color: '#2f6bff', fontWeight: 500 }}>{money(v)}</span>,
    },
    {
      title: '已兑券 / 已提现',
      key: 'used',
      width: 170,
      align: 'right',
      render: (_, row) => (
        <Text type="secondary">
          {money(row.exchangedCommission)} / {money(row.withdrawnCommission)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: PromoPartnerStatus, row) =>
        v === 'active' ? (
          <Switch
            size="small"
            checked
            checkedChildren={PROMO_PARTNER_STATUS_LABEL.active}
            unCheckedChildren="冻结"
            onChange={() => {
              setFreezeRow(row)
              setFreezeBlockPayout(false)
            }}
          />
        ) : (
          <Popconfirm
            title="确认解冻该合伙人？"
            okText="确认"
            cancelText="取消"
            onConfirm={() => toggleStatus(row)}
          >
            <Switch
              size="small"
              checked={false}
              checkedChildren={PROMO_PARTNER_STATUS_LABEL.active}
              unCheckedChildren="冻结"
            />
          </Popconfirm>
        ),
    },
    { title: '参与时间', dataIndex: 'enrolledAt', width: 170 },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 160,
      render: (_, row) => (
        <Space size={8}>
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onOpenCommissionDetail?.(row)}>
            分佣明细
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <PageShell
        breadcrumb={['分销管理', '分销合伙人']}
        searchFields={
          <>
            <SearchField label="账户ID">
              <Input
                placeholder="请输入账户ID"
                allowClear
                style={{ width: 180 }}
                value={accountIdKw}
                onChange={(e) => setAccountIdKw(e.target.value)}
                onPressEnter={handleSearch}
              />
            </SearchField>
            <SearchField label="手机号">
              <Input
                placeholder="请输入手机号"
                allowClear
                style={{ width: 180 }}
                value={phoneKw}
                onChange={(e) => setPhoneKw(e.target.value)}
                onPressEnter={handleSearch}
              />
            </SearchField>
            <SearchField label="昵称">
              <Input
                placeholder="请输入昵称"
                allowClear
                style={{ width: 180 }}
                value={nickKw}
                onChange={(e) => setNickKw(e.target.value)}
                onPressEnter={handleSearch}
              />
            </SearchField>
            <SearchField label="状态">
              <Select
                style={{ width: 140 }}
                value={statusKw}
                onChange={setStatusKw}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'active', label: '正常' },
                  { value: 'frozen', label: '已冻结' },
                ]}
              />
            </SearchField>
          </>
        }
        onSearch={handleSearch}
        onReset={handleReset}
        listTitle="合伙人列表"
        total={filtered.length}
        hideTotal
        titleExtra={
          <RequirementDot
            title="分销合伙人 · 需求说明"
            sections={[
              {
                label: '需求内容',
                items: [
                  '1.列表按照添加时间倒序展示；展示如图；',
                  '2.支持根据分销商手机号码模糊搜索根据昵称模糊搜索；',
                  '3.邀请，即为建立分佣关系数量；首耗为产生分佣人数去重复；',
                  '4.累计佣金 = 可提现 + 已兑券 + 已提现+已申请提现待审核；',
                  '5.点击分佣明细跳转到佣金明细页面，搜索到当前分销人；',
                  '6.点击冻结合伙人，则该合伙人不可再进行分佣但是可以提现分佣金账户的佣金； 如勾选禁止提现和兑换，则也不允许提现和兑换。',
                ],
              },
            ]}
          />
        }
      >
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 'max-content' }}
          pagination={{
            showSizeChanger: true,
          }}
        />
      </PageShell>

      <Modal
        centered
        destroyOnClose
        width={520}
        title="冻结合伙人"
        open={!!freezeRow}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onOk={confirmFreeze}
        onCancel={() => {
          setFreezeRow(null)
          setFreezeBlockPayout(false)
        }}
      >
        <div style={{ padding: '8px 0 4px' }}>
          <div style={{ fontSize: 15, lineHeight: 1.6 }}>
            冻结后将停止发放佣金，请在下方选择是否禁止提现/兑换？
          </div>
          <div style={{ marginTop: 24 }}>
            <Checkbox
              checked={freezeBlockPayout}
              onChange={(e) => setFreezeBlockPayout(e.target.checked)}
            >
              禁止提现和兑换
            </Checkbox>
          </div>
        </div>
      </Modal>

      <Modal
        centered
        destroyOnClose
        width={760}
        title="分销数据"
        open={!!promoPartner}
        footer={null}
        onCancel={() => setPromoPartner(null)}
      >
        {promoPartner && (
          <>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    邀请人数
                  </Text>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{inviteeStats.inviteCount}</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    转化消费人数
                  </Text>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{inviteeStats.consumedCount}</div>
                </Card>
              </Col>
            </Row>
            <Table<InviteeRow>
              rowKey="id"
              size="small"
              columns={[
                {
                  title: '被邀请人',
                  dataIndex: 'nickname',
                  width: 200,
                  fixed: 'left',
                  render: (v: string | undefined, row) => (
                    <Space direction="vertical" size={0}>
                      <span>{v ? maskName(v) : <Text type="secondary">—</Text>}</span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {row.accountId ?? '—'}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: '手机号',
                  dataIndex: 'phone',
                  width: 140,
                  render: (v: string) => maskPhone(v),
                },
                { title: '邀请注册时间', dataIndex: 'registeredAt', width: 180 },
                {
                  title: '首次消费时间',
                  dataIndex: 'firstConsumedAt',
                  width: 180,
                  render: (v: string | undefined) => v || <Text type="secondary">—</Text>,
                },
                {
                  title: '是否产生消费',
                  dataIndex: 'consumed',
                  width: 130,
                  fixed: 'right',
                  render: (v: boolean) => (v ? <Tag color="green">已产生消费</Tag> : <Tag>未产生消费</Tag>),
                },
              ]}
              dataSource={inviteeRows}
              scroll={{ x: 'max-content' }}
              pagination={{
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条记录`,
              }}
            />
          </>
        )}
      </Modal>
    </>
  )
}
