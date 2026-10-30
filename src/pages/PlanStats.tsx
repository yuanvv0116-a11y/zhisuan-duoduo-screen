import { useState } from 'react'
import {
  Breadcrumb,
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Segmented,
  DatePicker,
} from 'antd'
import {
  AppstoreOutlined,
  RocketOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { SHOW_ENTERPRISE } from '../constants'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography
const { RangePicker } = DatePicker

/* ---------------- 加油包销售统计 ---------------- */
const RESOURCE_PACK_SUMMARY = {
  soldCount: 186,
  soldAmount: 58647,
  cost: 21230,
  profit: 37417,
  consumption: 42580,
}

/* ---------------- 套餐销售统计 ---------------- */
const PLAN_SUMMARY = {
  soldCount: 342,
  soldAmount: 128568,
  cost: 52300,
  profit: 76268,
  consumption: 96120,
}

/* ---------------- Token统计 ---------------- */
const TOKEN_STATS = {
  total: 12_860_000_000,
  consumed: 8_540_000_000,
  expired: 1_286_000_000,
}

/* ---------------- 热门套餐TOP5 ---------------- */
interface RankItem {
  rank: number
  name: string
  type: string
  soldCount: number
  soldAmount: number
  profit: number
  profitRate: number
}

const HOT_PLANS: RankItem[] = [
  { rank: 1, name: '新手套餐（Lite）', type: '个人版', soldCount: 156, soldAmount: 6084, profit: 3312, profitRate: 54.4 },
  { rank: 2, name: 'Token Plan 个人版套餐', type: '个人版', soldCount: 98, soldAmount: 56448, profit: 31200, profitRate: 55.3 },
  { rank: 3, name: '企业团队版套餐', type: '企业版', soldCount: 42, soldAmount: 67958, profit: 40774, profitRate: 60.0 },
  { rank: 4, name: 'Token Plan 标准版', type: '个人版', soldCount: 28, soldAmount: 19572, profit: 9200, profitRate: 47.0 },
  { rank: 5, name: '企业旗舰版套餐', type: '企业版', soldCount: 18, soldAmount: 37566, profit: 21782, profitRate: 58.0 },
]

/* ---------------- 热门加油包TOP5 ---------------- */
const HOT_RESOURCE_PACKS: RankItem[] = [
  { rank: 1, name: '豆包大模型2.1 特价尊享包', type: '加油包', soldCount: 68, soldAmount: 20332, profit: 12180, profitRate: 59.9 },
  { rank: 2, name: '豆包图像创作模型5.0', type: '加油包', soldCount: 45, soldAmount: 8955, profit: 5370, profitRate: 60.0 },
  { rank: 3, name: '豆包声音复刻模型2.0', type: '加油包', soldCount: 32, soldAmount: 12768, profit: 7656, profitRate: 60.0 },
  { rank: 4, name: '私人投研分析部加油包', type: '加油包', soldCount: 28, soldAmount: 27972, profit: 11190, profitRate: 40.0 },
  { rank: 5, name: 'GPT-4o畅享包', type: '加油包', soldCount: 13, soldAmount: 8620, profit: 5172, profitRate: 60.0 },
]

function OverviewCard() {
  const totalCost = RESOURCE_PACK_SUMMARY.cost + PLAN_SUMMARY.cost
  const totalSoldAmount = RESOURCE_PACK_SUMMARY.soldAmount + PLAN_SUMMARY.soldAmount
  const totalProfit = RESOURCE_PACK_SUMMARY.profit + PLAN_SUMMARY.profit
  const profitRate = ((totalProfit / totalSoldAmount) * 100).toFixed(1)
  const tokenFailRate = ((TOKEN_STATS.expired / TOKEN_STATS.total) * 100).toFixed(1)

  const formatToken = (v: number) => {
    if (v >= 1_0000_0000) return (v / 1_0000_0000).toFixed(2) + ' 亿'
    if (v >= 1_0000) return (v / 1_0000).toFixed(2) + ' 万'
    return v.toLocaleString()
  }

  return (
    <Card variant="borderless" styles={{ body: { padding: 20 } }}>
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#722ed115',
              color: '#722ed1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            <RocketOutlined />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Token Plan套餐总数</Text>
            </div>
            <div>
              <span style={{ fontSize: 26, fontWeight: 600, color: '#333' }}>{SHOW_ENTERPRISE ? 5 : 3}</span>
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>个</Text>
            </div>
          </div>
        </div>

        <div style={{ width: 1, background: '#eef0f4', margin: '0 8px' }} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#2f6bff15',
              color: '#2f6bff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            <AppstoreOutlined />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>加油包总数</Text>
            </div>
            <div>
              <span style={{ fontSize: 26, fontWeight: 600, color: '#333' }}>5</span>
              <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>个</Text>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: '#eef0f4', margin: '16px 0' }} />

      {/* 金额汇总 */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>总销售金额</Text>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#2f6bff', marginTop: 4 }}>
              ¥{totalSoldAmount.toLocaleString()}
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>总成本</Text>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#fa541c', marginTop: 4 }}>
              ¥{totalCost.toLocaleString()}
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              总利润 <Tag color={Number(profitRate) >= 50 ? 'green' : 'orange'} style={{ borderRadius: 4, marginLeft: 4 }}>
                {profitRate}%
              </Tag>
            </Text>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#52c41a', marginTop: 4 }}>
              ¥{totalProfit.toLocaleString()}
            </div>
          </div>
        </Col>
      </Row>

      <div style={{ height: 1, background: '#eef0f4', margin: '16px 0' }} />

      {/* Token统计 */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>总 Token 数</Text>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#333', marginTop: 4 }}>
              {formatToken(TOKEN_STATS.total)}
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已消耗 Token 数</Text>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#2f6bff', marginTop: 4 }}>
              {formatToken(TOKEN_STATS.consumed)}
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已失效 Token 数</Text>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#fa541c', marginTop: 4 }}>
              {formatToken(TOKEN_STATS.expired)}
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Token 失效率
              <Tag color={Number(tokenFailRate) >= 20 ? 'red' : Number(tokenFailRate) >= 10 ? 'orange' : 'green'} style={{ borderRadius: 4, marginLeft: 4 }}>
                {tokenFailRate}%
              </Tag>
            </Text>
            <div style={{ fontSize: 20, fontWeight: 600, color: Number(tokenFailRate) >= 20 ? '#ff4d4f' : Number(tokenFailRate) >= 10 ? '#fa8c16' : '#52c41a', marginTop: 4 }}>
              {tokenFailRate}%
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  )
}

function SummaryBlock({
  title,
  soldCount,
  soldAmount,
  cost,
  profit,
  color,
  icon,
}: {
  title: string
  soldCount: number
  soldAmount: number
  cost: number
  profit: number
  color: string
  icon: React.ReactNode
}) {
  const profitRate = ((profit / soldAmount) * 100).toFixed(1)
  return (
    <Card variant="borderless" styles={{ body: { padding: 20 } }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${color}15`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>{title}</span>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>销售数量</Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#333' }}>
              {soldCount.toLocaleString()}
              <Text type="secondary" style={{ fontSize: 13, marginLeft: 4 }}>个</Text>
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>销售金额</Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color }}>
              ¥{soldAmount.toLocaleString()}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>成本</Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#fa541c' }}>
              ¥{cost.toLocaleString()}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                利润 <Tag color={Number(profitRate) >= 50 ? 'green' : 'orange'} style={{ borderRadius: 4, marginLeft: 4 }}>
                  {profitRate}%
                </Tag>
              </Text>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#52c41a' }}>
              ¥{profit.toLocaleString()}
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  )
}

function RankingTable({
  dataSource,
  title,
}: {
  dataSource: RankItem[]
  title: string
}) {
  const columns: ColumnsType<RankItem> = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      render: (v: number) => {
        const colors = ['#ff4d4f', '#fa8c16', '#faad14', '#8c8c8c', '#8c8c8c']
        const icons = ['🥇', '🥈', '🥉', '4', '5']
        return (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: colors[v - 1] || '#8c8c8c',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: v <= 3 ? 14 : 13,
              fontWeight: 600,
            }}
          >
            {icons[v - 1]}
          </div>
        )
      },
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '销售数量',
      dataIndex: 'soldCount',
      key: 'soldCount',
      width: 100,
      align: 'right',
      render: (v: number) => (
        <span style={{ fontWeight: 500 }}>{v.toLocaleString()} 个</span>
      ),
    },
    {
      title: '销售金额',
      dataIndex: 'soldAmount',
      key: 'soldAmount',
      width: 130,
      align: 'right',
      render: (v: number) => <span style={{ color: '#333' }}>¥{v.toLocaleString()}</span>,
    },
    {
      title: '利润',
      dataIndex: 'profit',
      key: 'profit',
      width: 150,
      align: 'right',
      render: (v: number, r) => {
        const good = r.profitRate >= 50
        return (
          <div>
            <div style={{ color: good ? '#52c41a' : '#fa541c', fontWeight: 600 }}>
              ¥{v.toLocaleString()}
            </div>
            <Tag color={good ? 'green' : 'orange'} style={{ borderRadius: 4, marginTop: 2 }}>
              利润率 {r.profitRate}%
            </Tag>
          </div>
        )
      },
    },
  ]

  return (
    <Card
      variant="borderless"
      styles={{ body: { padding: 16 } }}
      style={{ height: '100%' }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrophyOutlined style={{ color: '#faad14', fontSize: 18 }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
        </div>
      }
    >
      <Table<RankItem>
        rowKey="rank"
        dataSource={dataSource}
        pagination={false}
        size="small"
        columns={columns}
      />
    </Card>
  )
}

export default function PlanStats() {
  const [period, setPeriod] = useState<string>('all')

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: '统计与分析' }, { title: '加油包与套餐统计' }]}
      />

      {/* 时间筛选 */}
      <Card
        variant="borderless"
        styles={{ body: { padding: '12px 16px' } }}
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RangePicker placeholder={['开始日期', '结束日期']} style={{ width: 260 }} />
            <Text>统计周期：</Text>
            <Segmented
              value={period}
              onChange={(v) => setPeriod(v as string)}
              options={[
                { label: '近7天', value: '7d' },
                { label: '近30天', value: '30d' },
                { label: '本月', value: 'month' },
                { label: '全部时间', value: 'all' },
              ]}
            />
            <RequirementDot
              title="统计周期 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1.默认按照全部时间搜索。 近30天为从当日-30天到当日；本月为从本月1日到此刻；',
                  ],
                },
              ]}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              数据截止至：2026-08-26 23:59:59
            </Text>
            <RequirementDot
              title="加油包与套餐统计 — 需求点"
              sections={[
                {
                  label: '',
                  items: [
                    '1. 筛选：支持开始/结束日期范围搜索；统计周期快捷切换（近7天/近30天/本月/全部时间），默认全部时间；页面右上角展示数据截止时间。',
                    '2. 概览：Token Plan套餐总数、加油包总数在前；总成本、总销售金额、总利润（标注利润率）居中；总 Token 数、已消耗、已失效、Token 失效率在后。',
                    '3. 销售统计：套餐销售统计在左、加油包销售统计在右，各卡片展示销售数量、销售金额、成本、利润（利润率≥50% 绿色标签）。',
                    '4. 排行榜：热门套餐 TOP 5、热门加油包 TOP 5，按销售数量倒序，展示排名、名称、销售数量、销售金额、利润与利润率；不足 5 条按实际条数展示，两张榜单卡片等高。',
                    '5. 类型、版本等枚举字段一律纯文字展示，不加彩色标签。',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 概览统计卡片 */}
      <OverviewCard />

      {/* 销售统计对比 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <SummaryBlock
            title="套餐销售统计"
            icon={<RocketOutlined />}
            color="#722ed1"
            soldCount={PLAN_SUMMARY.soldCount}
            soldAmount={PLAN_SUMMARY.soldAmount}
            cost={PLAN_SUMMARY.cost}
            profit={PLAN_SUMMARY.profit}
          />
        </Col>
        <Col xs={24} lg={12}>
          <SummaryBlock
            title="加油包销售统计"
            icon={<AppstoreOutlined />}
            color="#2f6bff"
            soldCount={RESOURCE_PACK_SUMMARY.soldCount}
            soldAmount={RESOURCE_PACK_SUMMARY.soldAmount}
            cost={RESOURCE_PACK_SUMMARY.cost}
            profit={RESOURCE_PACK_SUMMARY.profit}
          />
        </Col>
      </Row>

      {/* 热门排行榜 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <RankingTable
            dataSource={
              SHOW_ENTERPRISE
                ? HOT_PLANS
                : HOT_PLANS.filter((p) => p.type !== '企业版').map((p, i) => ({ ...p, rank: i + 1 }))
            }
            title="热门套餐 TOP 5"
          />
        </Col>
        <Col xs={24} lg={12}>
          <RankingTable dataSource={HOT_RESOURCE_PACKS} title="热门加油包 TOP 5" />
        </Col>
      </Row>
    </div>
  )
}
