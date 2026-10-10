import { useMemo } from 'react'
import { Button, Card, Col, Row, Space, Table, Tooltip, Typography, message } from 'antd'
import {
  AccountBookOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import { maskName } from '../components/SecretCell'
import { getCampaignPhase, usePromoCampaigns, usePromoCommissions, usePromoInvitees, usePromoPartners } from '../store'
import type { PromoCampaign } from '../types'
import { CAMPAIGN_PHASE_LABEL, roundAmount } from '../types'

const { Text } = Typography

const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

/** CSV 单元格：统一加引号并转义内部双引号 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/* ---------------- 统计卡（与「代金券统计」同源的图标砖样式） ---------------- */

function StatCard({
  label,
  value,
  unit,
  sub,
  icon,
  tooltip,
}: {
  label: string
  value: string
  unit: string
  sub?: string
  icon: React.ReactNode
  tooltip?: React.ReactNode
}) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 16, height: '100%' } }} style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {label}
              </Text>
              {tooltip && (
                <Tooltip title={tooltip}>
                  <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                </Tooltip>
              )}
            </Space>
          </div>
          <div>
            <span style={{ fontSize: 26, fontWeight: 600 }}>{value}</span>
            <span style={{ marginLeft: 4, fontSize: 13, color: '#8c8c8c' }}>{unit}</span>
          </div>
          {sub && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {sub}
              </Text>
            </div>
          )}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#2f6bff15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2f6bff',
            fontSize: 22,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

/* ---------------- 邀请 → 转化消费（邀请总人数 → 转化消费人数） ---------------- */

interface SettleItem {
  key: string;
  label: string;
  value: string;
  tooltip: string;
}

function SettleListCard({ header, items }: { header: SettleItem; items: SettleItem[] }) {
  return (
    <Card
      variant="borderless"
      styles={{ body: { padding: 16, height: '100%', display: 'flex', alignItems: 'stretch', gap: 24 } }}
      style={{ height: '100%' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ marginBottom: 10 }}>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {header.label}
            </Text>
            <Tooltip title={header.tooltip} placement="top">
              <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
            </Tooltip>
          </Space>
        </div>
        <span style={{ fontSize: 26, fontWeight: 600 }}>{header.value}</span>
      </div>
      <div style={{ width: 1, background: '#eef0f4' }} />
      <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {items.map((it, idx) => (
          <div
            key={it.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: idx === 0 ? 0 : 10,
              paddingBottom: idx === items.length - 1 ? 0 : 10,
              borderTop: idx === 0 ? 'none' : '1px solid #eef0f4',
            }}
          >
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {it.label}
              </Text>
              <Tooltip title={it.tooltip} placement="top">
                <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{it.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FunnelCard({
  inviteCount,
  consumedCount,
  rate,
}: {
  inviteCount: number
  consumedCount: number
  rate: number | null
}) {
  const pct = rate == null ? 0 : rate * 100
  return (
    <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          邀请 → 转化消费
        </Text>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 22, borderRadius: 4, background: '#f0f2f5', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 4, background: '#91b4ff' }} />
          </div>
          <div style={{ width: 190, fontSize: 12, whiteSpace: 'nowrap' }}>
            邀请总人数 <span style={{ fontSize: 16, fontWeight: 600 }}>{inviteCount}</span> 人
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 22, borderRadius: 4, background: '#f0f2f5', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: '#2f6bff' }} />
          </div>
          <div style={{ width: 190, fontSize: 12, whiteSpace: 'nowrap' }}>
            转化消费人数 <span style={{ fontSize: 16, fontWeight: 600 }}>{consumedCount}</span> 人
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ---------------- 按活动汇总行（口径与「分销活动 › 分销数据」弹窗完全一致） ---------------- */

interface CampaignRow {
  key: string
  campaign: PromoCampaign
  partnerCount: number
  inviteCount: number
  consumedCount: number
  consumeAmount: number
  commissionAmount: number
}

/* ---------------- 分销员排行行 ---------------- */

interface PartnerRow {
  key: string
  nickname: string
  accountId: string
  inviteCount: number
  consumedCount: number
  consumeAmount: number
  commissionAmount: number
}

export default function PromoStats() {
  const allCommissions = usePromoCommissions()
  const invitees = usePromoInvitees()
  const partners = usePromoPartners()
  const campaigns = usePromoCampaigns()

  /** 统计只看消耗返佣；见面礼属邀请奖励，不计入消费与分佣大盘 */
  const commissions = useMemo(() => allCommissions.filter((c) => c.kind === 'consume'), [allCommissions])

  /** 转化消费人数：按分佣明细里该被邀请人的计佣记录判定，不在名单上冗余存储 */
  const consumedKeySet = useMemo(() => {
    const s = new Set<string>()
    commissions.forEach((c) => {
      const key = c.inviteeAccountId || c.inviteeName
      if (key && key !== '—') s.add(key)
    })
    return s
  }, [commissions])

  /**
   * 分销员行集合：与「分销活动 › 活动数据」弹窗同口径，成功邀请注册即为分销员（有消耗计佣 ∪ 有邀请归属），
   * 保证「只邀请了人、还没产生消费」的分销员也进榜，且排行榜行数 = 分销员数量卡。
   */
  const partnerRows = useMemo<PartnerRow[]>(() => {
    const map = new Map<string, PartnerRow>()
    const ensure = (id: string, fallbackName: string): PartnerRow => {
      let row = map.get(id)
      if (!row) {
        const p = partners.find((x) => x.id === id)
        row = {
          key: id,
          nickname: p?.nickname ?? fallbackName,
          accountId: p?.accountId ?? '—',
          inviteCount: 0,
          consumedCount: 0,
          consumeAmount: 0,
          commissionAmount: 0,
        }
        map.set(id, row)
      }
      return row
    }
    commissions.forEach((c) => {
      const row = ensure(c.partnerId, c.partnerName)
      row.consumeAmount += c.consumeAmount ?? 0
      row.commissionAmount += c.amount
    })
    invitees.forEach((i) => {
      const row = ensure(i.partnerId, i.partnerId)
      row.inviteCount += 1
      const key = i.accountId || i.nickname
      if (key && consumedKeySet.has(key)) row.consumedCount += 1
    })
    return Array.from(map.values()).sort((a, b) => b.commissionAmount - a.commissionAmount || b.inviteCount - a.inviteCount)
  }, [commissions, invitees, partners, consumedKeySet])

  const overview = useMemo(() => {
    let consumeAmount = 0
    let commissionAmount = 0
    commissions.forEach((c) => {
      consumeAmount += c.consumeAmount ?? 0
      commissionAmount += c.amount
    })
    const inviteCount = invitees.length
    const consumedCount = consumedKeySet.size
    return {
      partnerCount: partnerRows.length,
      inviteCount,
      consumedCount,
      consumeAmount,
      commissionAmount,
      rate: inviteCount > 0 ? consumedCount / inviteCount : null,
    }
  }, [commissions, invitees, consumedKeySet, partnerRows])

  /* ---------------- 佣金去向（按分销员档案实时值） ---------------- */

  const settle = useMemo(() => {
    let available = 0
    let exchanged = 0
    let withdrawn = 0
    partners.forEach((p) => {
      available += p.availableCommission
      exchanged += p.exchangedCommission
      withdrawn += p.withdrawnCommission
    })
    return { available, exchanged, withdrawn }
  }, [partners])

  /* ---------------- 按活动汇总 ---------------- */

  const campaignRows = useMemo<CampaignRow[]>(() => {
    return campaigns
      .map((c) => {
        const list = commissions.filter((x) => x.campaignId === c.id)
        /** 分销员数量与「活动数据」弹窗同口径：有消耗计佣 ∪ 邀请归属该活动 */
        const partnerSet = new Set<string>()
        const inviteeSet = new Set<string>()
        let consumeAmount = 0
        let commissionAmount = 0
        list.forEach((x) => {
          partnerSet.add(x.partnerId)
          const key = x.inviteeAccountId || x.inviteeName
          if (key && key !== '—') inviteeSet.add(key)
          consumeAmount += x.consumeAmount ?? 0
          commissionAmount += x.amount
        })
        const campaignInvitees = invitees.filter((i) => i.campaignId === c.id)
        campaignInvitees.forEach((i) => partnerSet.add(i.partnerId))
        const inviteCount = campaignInvitees.length
        return {
          key: c.id,
          campaign: c,
          partnerCount: partnerSet.size,
          inviteCount,
          consumedCount: inviteeSet.size,
          consumeAmount,
          commissionAmount,
        }
      })
      .filter((r) => r.partnerCount > 0 || r.inviteCount > 0 || r.commissionAmount > 0)
      .sort((a, b) => b.commissionAmount - a.commissionAmount)
  }, [campaigns, commissions, invitees])

  const handleExport = () => {
    if (!campaignRows.length) {
      message.warning('暂无可导出数据')
      return
    }
    const header = ['分销活动', '活动ID', '活动状态', '活动时间', '分销员数量', '消费人数', '消费金额（元）', '分佣金额（元）']
    const lines = [header.map(csvCell).join(',')]
    campaignRows.forEach((r) => {
      lines.push(
        [
          r.campaign.name,
          r.campaign.id,
          CAMPAIGN_PHASE_LABEL[getCampaignPhase(r.campaign)],
          `${r.campaign.startAt} ~ ${r.campaign.endAt}`,
          r.partnerCount,
          r.consumedCount,
          roundAmount(r.consumeAmount, 2).toFixed(2),
          roundAmount(r.commissionAmount, 2).toFixed(2),
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
    a.download = `分销统计_${ts.getFullYear()}${pad2(ts.getMonth() + 1)}${pad2(ts.getDate())}_${pad2(ts.getHours())}${pad2(ts.getMinutes())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${campaignRows.length} 个活动`)
  }

  const dash = <Text type="secondary">—</Text>

  const columns: ColumnsType<CampaignRow> = [
    {
      title: '分销活动',
      dataIndex: ['campaign', 'name'],
      fixed: 'left',
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.campaign.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.campaign.id}
          </Text>
        </Space>
      ),
    },
    {
      title: '活动状态',
      key: 'phase',
      width: 110,
      render: (_, row) => CAMPAIGN_PHASE_LABEL[getCampaignPhase(row.campaign)],
    },
    {
      title: '活动时间',
      key: 'period',
      width: 200,
      render: (_, row) => <Text>{`${row.campaign.startAt} ~ ${row.campaign.endAt}`}</Text>,
    },
    { title: '分销员数量', dataIndex: 'partnerCount', width: 120, align: 'right', render: (v: number) => `${v} 人` },
    { title: '消费人数', dataIndex: 'consumedCount', width: 130, align: 'right', render: (v: number) => `${v} 人` },
    {
      title: '消费金额',
      dataIndex: 'consumeAmount',
      width: 130,
      align: 'right',
      render: (v: number) => (v > 0 ? money(v) : dash),
    },
    {
      title: '分佣金额',
      dataIndex: 'commissionAmount',
      width: 130,
      align: 'right',
      render: (v: number) => (v > 0 ? <span style={{ fontWeight: 500 }}>{money(v)}</span> : dash),
    },
  ]

  const rankBadge = (i: number) => {
    const colors = ['#ff4d4f', '#fa8c16', '#faad14']
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: i < 3 ? colors[i] : '#eef0f4',
          color: i < 3 ? '#fff' : '#8c8c8c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {i + 1}
      </div>
    )
  }

  const partnerColumns: ColumnsType<PartnerRow> = [
    {
      title: '排名',
      key: 'rank',
      width: 64,
      align: 'center',
      render: (_, _row, i) => rankBadge(i),
    },
    {
      title: '分销员',
      key: 'partner',
      fixed: 'left',
      width: 180,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{maskName(row.nickname)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.accountId === '—' ? '—' : row.accountId}
          </Text>
        </Space>
      ),
    },
    { title: '邀请人数', dataIndex: 'inviteCount', width: 100, align: 'right', render: (v: number) => `${v} 人` },
    { title: '转化消费人数', dataIndex: 'consumedCount', width: 120, align: 'right', render: (v: number) => `${v} 人` },
    {
      title: '消费金额',
      dataIndex: 'consumeAmount',
      width: 120,
      align: 'right',
      render: (v: number) => (v > 0 ? money(v) : dash),
    },
    {
      title: '分佣金额',
      dataIndex: 'commissionAmount',
      width: 130,
      align: 'right',
      render: (v: number) => (v > 0 ? <span style={{ fontWeight: 500 }}>{money(v)}</span> : dash),
    },
  ]

  return (
    <PageShell
      breadcrumb={['分销管理', '分销统计']}
      breadcrumbExtra={
        <RequirementDot
          title="分销统计 · 需求说明"
          sections={[
            {
              label: '需求内容',
              items: [
                '1.分销员数量=成功建立分销关系的人佣人数去重复；',
                '2.邀请人数=成功建立分销关系的去重复客户人数总和；\n    转化消费=消费过的客户人数去重复后的总和；',
                '3.其他同页面',
              ],
            },
          ]}
        />
      }
      topExtra={
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} xl={8}>
              <StatCard
                label="分销员数量"
                value={String(overview.partnerCount)}
                unit="人"
                sub="成功建立分销关系即为分销员"
                icon={<TeamOutlined />}
              />
            </Col>
            <Col xs={24} xl={16}>
              <FunnelCard
                inviteCount={overview.inviteCount}
                consumedCount={overview.consumedCount}
                rate={overview.rate}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="stretch">
            <Col xs={24} xl={8}>
              <StatCard
                label="分销消费总额"
                value={money(overview.consumeAmount)}
                unit=""
                icon={<AccountBookOutlined />}
                tooltip="计算佣金的每笔正常消费总额"
              />
            </Col>
            <Col xs={24} xl={16}>
              <SettleListCard
                header={{
                  key: 'commission',
                  label: '分佣总额',
                  value: money(overview.commissionAmount),
                  tooltip: '分佣总额 = 每次分佣模型的消费金额 × 该模型分佣比例的总和',
                }}
                items={[
                  { key: 'withdrawn', label: '已提现', value: money(settle.withdrawn), tooltip: '已提现 = 已申请提现 + 已提现成功' },
                  { key: 'exchanged', label: '已兑换', value: money(settle.exchanged), tooltip: '兑换为代金券的佣金' },
                  { key: 'available', label: '未提现', value: money(settle.available), tooltip: '未提现 = 分佣总额 - 已提现 - 已申请冻结 - 已兑换' },
                ]}
              />
            </Col>
          </Row>

          <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }} title="分销员排行榜">
            <Table<PartnerRow>
              rowKey="key"
              size="small"
              columns={partnerColumns}
              dataSource={partnerRows}
              scroll={{ x: 'max-content' }}
              pagination={{ pageSize: 5, size: 'small', showSizeChanger: false, showTotal: (t) => `共 ${t} 人` }}
            />
          </Card>
        </>
      }
      listTitle="按分销活动汇总"
      total={campaignRows.length}
      hideTotal
      listActions={
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
      }
    >
      <Table<CampaignRow>
        rowKey="key"
        size="middle"
        columns={columns}
        dataSource={campaignRows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `共 ${t} 个活动` }}
      />
    </PageShell>
  )
}
