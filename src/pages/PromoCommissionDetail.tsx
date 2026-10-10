import { useMemo, useState } from 'react'
import { Button, Card, Col, DatePicker, Input, Row, Select, Space, Table, Tooltip, Typography, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import { maskName } from '../components/SecretCell'
import { useModels, usePromoCampaigns, usePromoCommissions, usePromoPartners } from '../store'
import type { CommissionRecord, PromoCampaign } from '../types'
import { roundAmount } from '../types'

const { RangePicker } = DatePicker
const { Text } = Typography

const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

/** CSV 单元格：统一加引号并转义内部双引号 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** 从「分销合伙人」跳转带入时按分销员 id 精确过滤，避免昵称模糊搜索串号 */
interface Query {
  partner: string
  invitee: string
  /** 计佣时间范围（含首尾当天，格式 YYYY-MM-DD） */
  dateRange: [string, string] | null
  campaignId: string
  partnerId: string
}

const EMPTY_QUERY: Query = { partner: '', invitee: '', dateRange: null, campaignId: 'all', partnerId: '' }

/** 通用档位默认倍率：模型列表查不到该档位配置时兜底（与后台档位预设 标准1x/尊享加速2x/独享资源3x 对齐） */
const GENERIC_MULTIPLIER: Record<string, number> = {
  标准倍率: 1,
  尊享加速倍率: 2,
  独享资源倍率: 3,
}

interface Props {
  /** 从「分销合伙人 › 分佣明细」跳转带入的分销员：进入页面即按该分销员完成搜索 */
  initialFilter?: CommissionDetailFilter
}

/** 由「分销合伙人」页「分佣明细」带入的查询条件：按分销员 id 精确过滤 */
export interface CommissionDetailFilter {
  partnerId: string
  partnerName: string
}

export default function PromoCommissionDetail({ initialFilter }: Props = {}) {
  const allCommissions = usePromoCommissions()
  /** 分佣明细只关注消耗返佣；见面礼属于邀请奖励，在「分销合伙人 › 分销数据」中体现 */
  const commissions = useMemo(() => allCommissions.filter((c) => c.kind === 'consume'), [allCommissions])
  const campaigns = usePromoCampaigns()
  const partners = usePromoPartners()
  const { models } = useModels()

  /** 模型档位 → 倍率数值：优先取「模型列表」中该模型该档位的 API 配置，查不到时回退通用档位预设 */
  const multiplierMap = useMemo(() => {
    const m = new Map<string, number>()
    models.forEach((model) => {
      model.apiConfigs?.forEach((cfg) => {
        const name = cfg.multiplierName?.trim()
        if (!name || cfg.modelMultiplier == null) return
        m.set(`${model.name}__${name}`, cfg.modelMultiplier)
      })
    })
    return m
  }, [models])

  const resolveMultiplier = (modelName: string | undefined, tierName: string): number | undefined => {
    if (modelName) {
      const hit = multiplierMap.get(`${modelName}__${tierName}`)
      if (hit != null) return hit
    }
    return GENERIC_MULTIPLIER[tierName]
  }

  const campaignById = useMemo(() => {
    const m = new Map<string, PromoCampaign>()
    campaigns.forEach((c) => m.set(c.id, c))
    return m
  }, [campaigns])

  /** 合伙人 id -> 账户ID，用于「分销员」列昵称下方展示账户ID */
  const accountIdByPartnerId = useMemo(() => {
    const m = new Map<string, string>()
    partners.forEach((p) => m.set(p.id, p.accountId))
    return m
  }, [partners])

  const seeded: Query = initialFilter
    ? { ...EMPTY_QUERY, partner: initialFilter.partnerName, partnerId: initialFilter.partnerId }
    : EMPTY_QUERY
  const [partnerKw, setPartnerKw] = useState(seeded.partner)
  const [inviteeKw, setInviteeKw] = useState(seeded.invitee)
  const [rangeKw, setRangeKw] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [campaignKw, setCampaignKw] = useState(seeded.campaignId)
  const [query, setQuery] = useState<Query>(seeded)

  const handleSearch = () =>
    setQuery({
      partner: partnerKw.trim(),
      invitee: inviteeKw.trim(),
      dateRange: rangeKw && rangeKw[0] && rangeKw[1] ? [rangeKw[0].format('YYYY-MM-DD'), rangeKw[1].format('YYYY-MM-DD')] : null,
      campaignId: campaignKw,
      partnerId: '',
    })
  const handleReset = () => {
    setPartnerKw('')
    setInviteeKw('')
    setRangeKw(null)
    setCampaignKw('all')
    setQuery(EMPTY_QUERY)
  }

  const filtered = useMemo(() => {
    const partner = query.partner.toLowerCase()
    const invitee = query.invitee.toLowerCase()
    return commissions
      .filter((c) => {
        const matchPartnerId = !query.partnerId || c.partnerId === query.partnerId
        const matchPartner = !partner || c.partnerName.toLowerCase().includes(partner) || c.partnerId.toLowerCase().includes(partner)
        const matchInvitee = !invitee || (c.inviteeName ?? '').toLowerCase().includes(invitee) || (c.inviteeAccountId ?? '').toLowerCase().includes(invitee)
        const day = c.at.slice(0, 10)
        const matchDate = !query.dateRange || (day >= query.dateRange[0] && day <= query.dateRange[1])
        const matchCampaign = query.campaignId === 'all' || c.campaignId === query.campaignId
        return matchPartnerId && matchPartner && matchInvitee && matchDate && matchCampaign
      })
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [commissions, query])

  /** 搜索结果统计：条数、佣金、涉及分销员；未提现 = 涉及分销员当前的可用佣金合计（不含已兑券 / 已提现） */
  const stats = useMemo(() => {
    let commissionAmount = 0
    let consumeAmount = 0
    const partnerSet = new Set<string>()
    filtered.forEach((c) => {
      partnerSet.add(c.partnerId)
      commissionAmount += c.amount
      consumeAmount += c.consumeAmount ?? 0
    })
    let unwithdrawnAmount = 0
    partners.forEach((p) => {
      if (partnerSet.has(p.id)) unwithdrawnAmount += p.availableCommission
    })
    return {
      count: filtered.length,
      partnerCount: partnerSet.size,
      commissionAmount,
      consumeAmount,
      unwithdrawnAmount,
    }
  }, [filtered, partners])

  const campaignText = (id?: string) => (id ? campaignById.get(id)?.name ?? '—' : '—')

  const handleExport = () => {
    if (!filtered.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    const header = ['计佣时间', '分销员', '分销员ID', '被邀请人', '被邀请人账户ID', '计佣模型', '模型档位', '档位倍率', '活动', '现金消耗（元）', '计佣比例（%）', '佣金金额（元）']
    const lines = [header.map(csvCell).join(',')]
    filtered.forEach((c) => {
      const tier = c.modelMultiplierName
      lines.push(
        [
          c.at,
          maskName(c.partnerName),
          c.partnerId,
          c.inviteeName ? maskName(c.inviteeName) : '—',
          c.inviteeAccountId ?? '—',
          c.modelName ?? '—',
          tier ?? '—',
          !tier ? '—' : (resolveMultiplier(c.modelName, tier) ?? '—'),
          campaignText(c.campaignId),
          c.consumeAmount == null ? '—' : roundAmount(c.consumeAmount, 2).toFixed(2),
          c.rate == null ? '—' : c.rate,
          c.amount.toFixed(2),
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
    a.download = `分佣明细_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  const dash = <Text type="secondary">—</Text>

  const columns: ColumnsType<CommissionRecord> = [
    { title: '计佣时间', dataIndex: 'at', width: 170, fixed: 'left' },
    {
      title: '分销员',
      dataIndex: 'partnerName',
      width: 180,
      render: (v: string, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{maskName(v)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {accountIdByPartnerId.get(row.partnerId) ?? row.partnerId}
          </Text>
        </Space>
      ),
    },
    {
      title: '被邀请人',
      dataIndex: 'inviteeName',
      width: 180,
      render: (v: string | undefined, row) => {
        if (!v && !row.inviteeAccountId) return dash
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{v ? maskName(v) : dash}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.inviteeAccountId ?? '—'}
            </Text>
          </Space>
        )
      },
    },
    {
      title: '计佣模型',
      dataIndex: 'modelName',
      width: 170,
      render: (v?: string) => v || dash,
    },
    {
      title: '模型档位',
      dataIndex: 'modelMultiplierName',
      width: 130,
      render: (v: string | undefined, row) => {
        if (!v) return dash
        const multiplier = resolveMultiplier(row.modelName, v)
        return (
          <Space direction="vertical" size={0}>
            <span>{v}</span>
            {multiplier != null && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {multiplier}x
              </Text>
            )}
          </Space>
        )
      },
    },
    {
      title: '活动',
      dataIndex: 'campaignId',
      width: 200,
      render: (v?: string) => {
        if (!v) return dash
        const campaign = campaignById.get(v)
        if (!campaign) return dash
        return (
          <Space direction="vertical" size={0}>
            <span>{campaign.name}</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {campaign.id}
            </Text>
          </Space>
        )
      },
    },
    {
      title: '现金消耗',
      dataIndex: 'consumeAmount',
      width: 110,
      align: 'right',
      render: (v?: number) => (v == null ? dash : money(v)),
    },
    {
      title: '计佣比例',
      dataIndex: 'rate',
      width: 100,
      align: 'right',
      render: (v?: number) => (v == null ? dash : `${v}%`),
    },
    {
      title: '佣金金额',
      dataIndex: 'amount',
      width: 110,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{money(v)}</span>,
    },
  ]

  return (
    <PageShell
      breadcrumb={['分销管理', '分佣明细']}
      searchFields={
        <>
          <SearchField label="分销员">
            <Input
              placeholder="请输入昵称 / ID"
              allowClear
              style={{ width: 180 }}
              value={partnerKw}
              onChange={(e) => setPartnerKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="被邀请人">
            <Input
              placeholder="请输入昵称 / 账户ID"
              allowClear
              style={{ width: 170 }}
              value={inviteeKw}
              onChange={(e) => setInviteeKw(e.target.value)}
              onPressEnter={handleSearch}
            />
          </SearchField>
          <SearchField label="计佣时间">
            <RangePicker
              allowClear
              value={rangeKw}
              onChange={(v) => setRangeKw(v as [Dayjs | null, Dayjs | null] | null)}
            />
          </SearchField>
          <SearchField label="活动">
            <Select
              style={{ width: 200 }}
              value={campaignKw}
              onChange={setCampaignKw}
              options={[
                { value: 'all', label: '全部' },
                ...campaigns.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </SearchField>
        </>
      }
      onSearch={handleSearch}
      onReset={handleReset}
      listTitle="分佣明细列表"
      total={filtered.length}
      titleExtra={
        <RequirementDot
          title="分佣明细 · 需求说明"
          sections={[
            {
              label: '需求内容',
              items: [
                '1.列表按照分佣时间倒序展示；',
                '2.支持根据以上条件搜索；导出搜索后结果，导出字段同列表；',
                '3.涉及分销员为，所有分佣人员去重复；',
                '4.现金消耗合计为分佣涉及的交易，实际消费金额总和；',
                '5.分佣合计就是分佣总额，未提现=分佣总额-已提现-已申请提现待审核-已对券；',
              ],
            },
            {
              label: '6.分佣逻辑',
              items: [
                '用户消费时，检查用户是否绑定分佣关系。未绑定，则不处理分佣逻辑；',
                '绑定后，则检查分销人员状态是否正常，是否可以分佣金，不正常则不需要继续处理；',
                '如分销人员支持分佣，则寻找当前模型都存在在哪些分佣活动中，且要求活动为进行中状态。如均不在进行中，则不分佣；',
                '如在进行中，则寻找该模型倍率，分佣最高的活动，按照佣金比例计算佣金。',
                '佣金支持8位小数。（如果为分销者按日结算，则向上取到小数点后2位）',
              ],
            },
          ]}
        />
      }
      listActions={
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
      }
    >
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              记录数
            </Text>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.count}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              涉及分销员
            </Text>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.partnerCount}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              现金消耗合计
            </Text>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{money(stats.consumeAmount)}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              佣金合计
            </Text>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
              {money(stats.commissionAmount)}
              <Tooltip title="未提现 = 当前筛选结果涉及分销员的可用佣金合计（不含已兑券、已提现）">
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
                  （未提现：{money(stats.unwithdrawnAmount)}）
                </Text>
              </Tooltip>
            </div>
          </Card>
        </Col>
      </Row>
      <Table<CommissionRecord>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        pagination={{
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
        }}
      />
    </PageShell>
  )
}
