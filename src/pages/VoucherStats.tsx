import { useMemo, useState } from 'react'
import { Card, Col, Input, Progress, Row, Space, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AccountBookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  GiftOutlined,
  HistoryOutlined,
  HourglassOutlined,
  InfoCircleOutlined,
  StopOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import PageShell from '../components/PageShell'
import SearchField from '../components/SearchField'
import RequirementDot from '../components/RequirementDot'
import { liveVoucherStatus, useVoucherTemplates, useVouchers } from '../store'
import { roundAmount } from '../types'
import type { Voucher, VoucherStatus } from '../types'

const { Text } = Typography

interface Filters {
  /** 券名称（券模板名）关键词，空为全部 */
  templateName: string
}

const EMPTY_FILTERS: Filters = { templateName: '' }

/** 金额展示口径：¥ + 两位小数（余额按 6 位存储，展示前收敛到 2 位） */
const money = (n: number) => `¥${roundAmount(n, 2).toFixed(2)}`

/** 按已生效的搜索条件过滤券台账：券名称按模板名做关键词模糊匹配 */
const applyFilters = (list: Voucher[], f: Filters): Voucher[] => {
  const kw = f.templateName.trim()
  if (!kw) return list
  return list.filter((v) => v.templateName.includes(kw))
}

/* ---------------- 统计卡（复用同组统计页的图标砖样式） ---------------- */

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
  sub: string
  icon: React.ReactNode
  /** 指标口径说明，label 后的 info 图标悬浮展示 */
  tooltip?: React.ReactNode
}) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          <div style={{ marginTop: 8, minHeight: 18 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {sub}
            </Text>
          </div>
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

/* ---------------- 按券模板汇总 ---------------- */

interface TemplateRow {
  key: string
  name: string
  /** 券模板创建时间，列表按该字段倒序展示 */
  createdAt: string
  count: number
  /** 面额合计：该模板下所有券的面额之和，包括作废的券 */
  faceTotal: number
  /** 作废总金额：已作废券的面额之和 */
  voidAmount: number
  /** 剩余余额 = 面额合计 − 作废总金额 − 已使用总额 */
  balanceTotal: number
  usedTotal: number
  /** 使用率 = 已使用总额 ÷（面额合计 − 作废总金额） */
  usedRate: number | null
  expiredCount: number
  voidCount: number
}

const summarizeByTemplate = (
  list: Voucher[],
  createdAtById: Record<string, string>,
): TemplateRow[] => {
  const map = new Map<string, TemplateRow>()
  for (const v of list) {
    const live = liveVoucherStatus(v)
    let row = map.get(v.templateId)
    if (!row) {
      row = {
        key: v.templateId,
        name: v.templateName,
        createdAt: createdAtById[v.templateId] ?? '',
        count: 0,
        faceTotal: 0,
        voidAmount: 0,
        balanceTotal: 0,
        usedTotal: 0,
        usedRate: null,
        expiredCount: 0,
        voidCount: 0,
      }
      map.set(v.templateId, row)
    }
    row.count += 1
    /** 面额合计包括作废的券，因此所有券都要累加面额 */
    row.faceTotal = roundAmount(row.faceTotal + v.faceValue, 2)
    if (live === 'void') {
      row.voidCount += 1
      row.voidAmount = roundAmount(row.voidAmount + v.faceValue, 2)
    } else {
      row.usedTotal = roundAmount(row.usedTotal + (v.faceValue - v.balance), 2)
    }
    if (live === 'expired') row.expiredCount += 1
  }
  return [...map.values()]
    .map((r) => {
      /** 有效发放面额 = 面额合计 − 作废总金额，即未作废券的面额之和 */
      const validFace = roundAmount(r.faceTotal - r.voidAmount, 2)
      return {
        ...r,
        /** 剩余余额 = 面额合计 − 作废总金额 − 已使用总额 */
        balanceTotal: roundAmount(r.faceTotal - r.voidAmount - r.usedTotal, 2),
        /** 使用率 = 已使用总额 ÷（面额合计 − 作废总金额），有效发放面额为 0 时不展示 */
        usedRate: validFace > 0 ? r.usedTotal / validFace : null,
      }
    })
    /**
     * 列表按券模板创建时间倒序。createdAt 为 `YYYY-MM-DD HH:mm:ss`，
     * 字典序即时间序，故用字符串比较，避免 Date 解析该非 ISO 格式的区域差异。
     * 创建时间缺失（模板已删除但券仍在）或相同时，退化为按发放张数倒序。
     */
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.count - a.count)
}

/* ---------------- 页面 ---------------- */

export default function VoucherStats() {
  const vouchers = useVouchers()
  const templates = useVoucherTemplates()
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS)

  const filtered = useMemo(() => applyFilters(vouchers, applied), [vouchers, applied])

  /** 券模板创建时间索引，用于列表按创建时间倒序 */
  const createdAtById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of templates) map[t.id] = t.createdAt
    return map
  }, [templates])

  const stats = useMemo(() => {
    const statusCounts: Record<VoucherStatus, number> = {
      notEffective: 0,
      active: 0,
      usedUp: 0,
      expired: 0,
      void: 0,
    }
    let faceTotal = 0
    let usedAmount = 0
    let pendingAmount = 0
    let invalidAmount = 0
    let neverUsedCount = 0
    let usedUpCount = 0
    let validCount = 0
    for (const v of filtered) {
      const live = liveVoucherStatus(v)
      statusCounts[live] += 1
      /** 面额合计为所有券的面额总和（包括作废的），故先累加再做作废分流 */
      faceTotal = roundAmount(faceTotal + v.faceValue, 2)
      if (live === 'void') {
        /**
         * 已作废券：面额计入失效金额（已作废金额总和）。
         * 作废是把未消费的券整张回收，不是实际消费，因此不计入已使用金额，
         * 也不参与待使用金额与「一次都没用过 / 完全用完」的张数口径。
         */
        invalidAmount = roundAmount(invalidAmount + v.faceValue, 2)
        continue
      }
      validCount += 1
      usedAmount = roundAmount(usedAmount + (v.faceValue - v.balance), 2)
      /**
       * 金额分流按状态白名单显式判定，不用「非过期即待使用」的排除法，
       * 避免将来新增状态或脏余额被误计入待使用金额。
       * 待使用金额 = 待生效 + 生效中券的剩余余额之和；
       * 失效金额 = 已过期券的剩余余额之和 + 已作废券的面额之和。
       * 「已用完」为余额归零的终态，三者相加仍满足：已使用 + 待使用 + 失效 = 面额合计。
       */
      if (live === 'notEffective' || live === 'active') {
        pendingAmount = roundAmount(pendingAmount + v.balance, 2)
      } else if (live === 'expired') {
        /** 过期券中因过期而失效的金额 = 过期时未消费完的剩余余额 */
        invalidAmount = roundAmount(invalidAmount + v.balance, 2)
      }
      if (v.balance >= v.faceValue) neverUsedCount += 1
      if (v.balance <= 0) usedUpCount += 1
    }
    return {
      totalCount: filtered.length,
      validCount,
      statusCounts,
      faceTotal,
      usedAmount,
      pendingAmount,
      invalidAmount,
      neverUsedCount,
      usedUpCount,
    }
  }, [filtered])

  /** 状态分布占比分母：累计发放 */
  const pct = (n: number) =>
    stats.totalCount > 0 ? `${((n / stats.totalCount) * 100).toFixed(1)}%` : '—'

  const rows = useMemo(
    () => summarizeByTemplate(filtered, createdAtById),
    [filtered, createdAtById],
  )

  const columns: ColumnsType<TemplateRow> = [
    { title: '券名称', dataIndex: 'name', fixed: 'left', width: 180 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (s: string) => (s ? s : <Text type="secondary">—</Text>),
    },
    { title: '发放张数', dataIndex: 'count', width: 110, render: (n: number) => `${n} 张` },
    {
      title: '面额合计',
      dataIndex: 'faceTotal',
      width: 130,
      render: (n: number) => money(n),
    },
    {
      title: '作废总金额',
      dataIndex: 'voidAmount',
      width: 130,
      render: (n: number) => (n > 0 ? money(n) : <Text type="secondary">—</Text>),
    },
    {
      title: '已使用',
      dataIndex: 'usedTotal',
      width: 130,
      render: (n: number) => money(n),
    },
    {
      title: '剩余余额',
      dataIndex: 'balanceTotal',
      width: 130,
      render: (n: number) => money(n),
    },
    {
      title: '使用率',
      dataIndex: 'usedRate',
      width: 180,
      render: (rate: number | null) =>
        rate == null ? (
          <Text type="secondary">—</Text>
        ) : (
          <Tooltip title={`已使用总额 ÷（面额合计 − 作废总金额）= ${(rate * 100).toFixed(1)}%`}>
            <Progress percent={Math.round(rate * 100)} size="small" style={{ maxWidth: 140 }} />
          </Tooltip>
        ),
    },
    {
      title: '已过期',
      dataIndex: 'expiredCount',
      width: 100,
      render: (n: number) => (n > 0 ? `${n} 张` : <Text type="secondary">—</Text>),
    },
    {
      title: '已作废',
      dataIndex: 'voidCount',
      width: 100,
      render: (n: number) => (n > 0 ? `${n} 张` : <Text type="secondary">—</Text>),
    },
  ]

  return (
    <PageShell
      breadcrumb={['统计与分析', '代金券统计']}
      breadcrumbExtra={
        <RequirementDot
          title="代金券统计 · 需求说明"
          sections={[
            {
              label: '需求内容',
              items: [
                '1.面额合计应为（所有券的面额总和，包括作废的）；',
                '2.已使用的，就是已实际消费的面额之和。',
                '3.待使用金额为【（待生效的）+（已生效的券的余额）】总和',
                '4.失效金额为已过期的金额总和+已作废金额总和。',
                '5.一次都没用过的为：券金额=余额的，未作废券总和；占比为一次都没用过/未作废的券总数；占比改为“有效占比”',
                '6.完全用完为，券余额为0的未作废券总和；占比为全用完/未作废的券总数；占比改为“有效占比”',
              ],
            },
          ]}
        />
      }
      topExtra={
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="累计发放"
                value={String(stats.totalCount)}
                unit="张"
                sub=""
                icon={<GiftOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="待生效"
                value={String(stats.statusCounts.notEffective)}
                unit="张"
                sub={`占比 ${pct(stats.statusCounts.notEffective)}`}
                icon={<HourglassOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="生效中"
                value={String(stats.statusCounts.active)}
                unit="张"
                sub={`占比 ${pct(stats.statusCounts.active)}`}
                icon={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="已用完"
                value={String(stats.statusCounts.usedUp)}
                unit="张"
                sub={`占比 ${pct(stats.statusCounts.usedUp)}`}
                icon={<FileDoneOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="已过期"
                value={String(stats.statusCounts.expired)}
                unit="张"
                sub={`占比 ${pct(stats.statusCounts.expired)}`}
                icon={<ClockCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="已作废"
                value={String(stats.statusCounts.void)}
                unit="张"
                sub={`占比 ${pct(stats.statusCounts.void)}`}
                icon={<StopOutlined />}
              />
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="面额合计"
                value={money(stats.faceTotal)}
                unit=""
                sub="所有状态的代金券面值总和"
                icon={<AccountBookOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="已使用金额"
                value={money(stats.usedAmount)}
                unit=""
                sub="面额总和-余额总和"
                icon={<ThunderboltOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="待使用金额"
                value={money(stats.pendingAmount)}
                unit=""
                sub="待使用余额+生效状态券余额"
                icon={<WalletOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="失效金额"
                value={money(stats.invalidAmount)}
                unit=""
                sub="已作废的余额总和+已过期的余额总和"
                icon={<CloseCircleOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="失效金额占比"
                value={stats.faceTotal > 0 ? `${((stats.invalidAmount / stats.faceTotal) * 100).toFixed(1)}%` : '—'}
                unit=""
                sub="失效金额/面额合计"
                icon={<HistoryOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <StatCard
                label="完全用完"
                value={String(stats.usedUpCount)}
                unit="张"
                sub={`完全用完的券占发放总数的${pct(stats.usedUpCount)}`}
                icon={<TrophyOutlined />}
              />
            </Col>
          </Row>
        </>
      }
      searchFields={
        <SearchField label="券名称">
          <Input
            allowClear
            placeholder="请输入券名称"
            value={draft.templateName}
            onChange={(e) => setDraft({ templateName: e.target.value })}
            onPressEnter={() => setApplied(draft)}
            style={{ width: 220 }}
          />
        </SearchField>
      }
      onSearch={() => setApplied(draft)}
      onReset={() => {
        setDraft(EMPTY_FILTERS)
        setApplied(EMPTY_FILTERS)
      }}
      listTitle="按券模板汇总"
      total={rows.length}
      hideTotal
      titleExtra={
        <RequirementDot
          title="代金券统计需求"
          sections={[
            {
              label: '需求内容',
              items: [
                '1.列表按照券模版创建时间倒序展示，展示字段如图；',
                '2.支持根据券名称模糊搜索；',
                '3.面额合计包括作废的券。',
                '4.剩余余额=面额合计-作废总金额-已使用总额；',
                '5.使用率=已使用总额/面额合计-作废总金额；',
              ],
            },
          ]}
        />
      }
    >
      <Table<TemplateRow>
        rowKey="key"
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showTotal: (t) => `共 ${t} 个模板`,
          showSizeChanger: false,
        }}
      />
    </PageShell>
  )
}
