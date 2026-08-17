import { useState } from 'react'
import { Card, DatePicker, Button, Space, Segmented, Typography, Breadcrumb, Tag, Modal, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  TeamOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  AccountBookOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  RightOutlined,
} from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography
const { RangePicker } = DatePicker

/* ---------------- 使用概览卡 ---------------- */
interface OverviewCard {
  label: string
  value: string
  unit: string
  sub?: string
  icon: React.ReactNode
  bg: string
  extra?: React.ReactNode
}

const OVERVIEW: OverviewCard[] = [
  { label: '活跃用户数', value: '51', unit: '人', sub: '占比 53.13% · 共 96 人', icon: <TeamOutlined />, bg: '#2f6bff' },
  { label: '活跃模型数', value: '34', unit: '个', sub: '占比 58.62% · 共 58 个', icon: <AppstoreOutlined />, bg: '#722ed1' },
  { label: '调用模型总次数', value: '17.88', unit: '万次', sub: '人均 3505.16 次', icon: <PhoneOutlined />, bg: '#13c2c2' },
  { label: '消耗总 token 数', value: '11.39', unit: 'B', sub: '人均 223.3M', icon: <ThunderboltOutlined />, bg: '#52c41a' },
  {
    label: '成本总额',
    value: '2.19',
    unit: '万元',
    sub: '人均 429.6 元',
    icon: <AccountBookOutlined />,
    bg: '#fa541c',
    extra: (
      <RequirementDot
        title="成本总额"
        sections={[
          {
            label: '',
            items: '增加成本总额，计算搜索时间范围内的渠道模型成本，人均 = 成本 / 活跃人数。',
          },
        ]}
      />
    ),
  },
  { label: '消费总金额', value: '3.66', unit: '万元', sub: '人均 717.3 元', icon: <DollarOutlined />, bg: '#faad14' },
  { label: '生成图片数', value: '175', unit: '张', icon: <PictureOutlined />, bg: '#eb2f96' },
  { label: '生成视频总时长', value: '13.58', unit: '分钟', icon: <VideoCameraOutlined />, bg: '#f5222d' },
]

function OverviewCardItem({ data }: { data: OverviewCard }) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ flex: 1, minWidth: 170 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>{data.label}</Text>
            {data.extra}
          </div>
          <div>
            <span style={{ fontSize: 24, fontWeight: 600 }}>{data.value}</span>
            <span style={{ fontSize: 13, color: '#8c8c8c', marginLeft: 4 }}>{data.unit}</span>
          </div>
          <div style={{ marginTop: 8, minHeight: 18 }}>
            {data.sub && <Text type="secondary" style={{ fontSize: 12 }}>{data.sub}</Text>}
          </div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: data.bg,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          {data.icon}
        </div>
      </div>
    </Card>
  )
}

/* ---------------- 峰值统计卡 ---------------- */
interface PeakMetric {
  label: string
  value: string
}

function PeakCard({
  title,
  desc,
  time,
  metrics,
  color,
  bg,
}: {
  title: string
  desc: string
  time: string
  metrics: PeakMetric[]
  color: string
  bg: string
}) {
  return (
    <div style={{ flex: 1, background: bg, borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 6 }}>{desc}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color, fontSize: 22, fontWeight: 600 }}>
        <ClockCircleOutlined style={{ fontSize: 18 }} />
        {time}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#333' }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right', marginTop: 12 }}>
        <a style={{ color: '#8c8c8c', fontSize: 13 }}>
          点击查看明细 <RightOutlined style={{ fontSize: 10 }} />
        </a>
      </div>
    </div>
  )
}

/* ---------------- Top10 榜单 ---------------- */
interface RankItem {
  name: React.ReactNode
  key: string
  desc: React.ReactNode
  value: string
  subValue?: React.ReactNode
  color: string
}

function RankList({ title, items, onItemClick, titleExtra }: { title: string; items: RankItem[]; onItemClick?: (it: RankItem) => void; titleExtra?: React.ReactNode }) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ flex: 1, minWidth: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ width: 3, height: 14, background: '#2f6bff', borderRadius: 2, marginRight: 8 }} />
        <Text strong>{title}</Text>
        {titleExtra}
      </div>
      {items.map((it, i) => (
        <div
          key={it.key}
          onClick={() => onItemClick?.(it)}
          style={{ marginBottom: 14, cursor: onItemClick ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: i < 3 ? it.color : '#d9d9d9',
                color: '#fff',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: '#333' }}>{it.name}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{it.desc}</div>
            </div>
            <div style={{ marginLeft: 8, textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: '#333' }}>{it.value}</div>
              {it.subValue && <div style={{ fontSize: 12, marginTop: 2 }}>{it.subValue}</div>}
            </div>
            <RightOutlined style={{ fontSize: 10, color: '#c0c4cc', marginLeft: 8 }} />
          </div>
          <div style={{ height: 3, background: it.color, borderRadius: 2, marginTop: 8, opacity: i < 3 ? 1 : 0.3 }} />
        </div>
      ))}
    </Card>
  )
}

const TOKEN_TOP: RankItem[] = [
  { key: 't1', name: '黄*', desc: <>高频 deepseek-v4-flash · 91133 次调用</>, value: '4.89B', color: '#52c41a' },
  { key: 't2', name: '阳**招', desc: <>高频 qwen3.6-27b-nvfp4 · 44200 次调用</>, value: '2.15B', color: '#2f6bff' },
]

const CONSUME_TOP: RankItem[] = [
  {
    key: 'c1',
    name: '袁*巍',
    desc: <>高频 dodo-ac-ultra-4-8 · 3174 次调用</>,
    value: '6463.33元',
    subValue: <span style={{ color: '#389e0d' }}>利润 2585.34元</span>,
    color: '#faad14',
  },
  {
    key: 'c2',
    name: '刘*刚',
    desc: <>高频 dodo-ac-ultra-5 · 1996 次调用</>,
    value: '4568.78元',
    subValue: <span style={{ color: '#389e0d' }}>利润 1827.51元</span>,
    color: '#fa8c16',
  },
]

/* ---------------- 用户消费详情 ---------------- */
interface ConsumeDetailRow {
  key: string
  model: string
  callCount: number
  tokens: string
  cost: number
  amount: number
}

const CONSUME_DETAIL: Record<string, { user: string; callCount: number; tokensText: string; modelCount: number; totalCost: number; totalAmount: number; rows: ConsumeDetailRow[] }> = {
  c1: {
    user: '袁*巍',
    callCount: 4291,
    tokensText: '2.67B',
    modelCount: 3,
    totalCost: 3877.99,
    totalAmount: 6463.33,
    rows: [
      { key: 'r1', model: 'dodo-ac-ultra-4-8', callCount: 3174, tokens: '1.82B', cost: 2860.4, amount: 4767.33 },
      { key: 'r2', model: 'deepseek-v4-flash', callCount: 812, tokens: '0.64B', cost: 720.15, amount: 1200.25 },
      { key: 'r3', model: 'qwen3.6-27b-nvfp4', callCount: 305, tokens: '0.21B', cost: 297.44, amount: 495.75 },
    ],
  },
  c2: {
    user: '刘*刚',
    callCount: 2750,
    tokensText: '1.70B',
    modelCount: 3,
    totalCost: 2741.27,
    totalAmount: 4568.78,
    rows: [
      { key: 'r1', model: 'dodo-ac-ultra-5', callCount: 1996, tokens: '1.15B', cost: 1980.6, amount: 3301.0 },
      { key: 'r2', model: 'dodo-ac-ultra-4-8', callCount: 540, tokens: '0.42B', cost: 512.3, amount: 853.83 },
      { key: 'r3', model: 'Qwen-Max', callCount: 214, tokens: '0.13B', cost: 248.37, amount: 413.95 },
    ],
  },
}

const detailColumns: ColumnsType<ConsumeDetailRow> = [
  { title: '模型', dataIndex: 'model', key: 'model' },
  { title: '调用次数', dataIndex: 'callCount', key: 'callCount', align: 'right', render: (v: number) => v.toLocaleString() },
  { title: '消耗 Token', dataIndex: 'tokens', key: 'tokens', align: 'right' },
  { title: '成本', dataIndex: 'cost', key: 'cost', align: 'right', render: (v: number) => `${v.toFixed(2)}元` },
  { title: '利润', key: 'profit', align: 'right', render: (_: unknown, r: ConsumeDetailRow) => <span style={{ color: '#389e0d' }}>{(r.amount - r.cost).toFixed(2)}元</span> },
  { title: '消费金额', dataIndex: 'amount', key: 'amount', align: 'right', render: (v: number) => `${v.toFixed(2)}元` },
]

const MODEL_TOP: RankItem[] = [
  {
    key: 'm1',
    name: (
      <>
        deepseek-v4-flash <Tag color="green" style={{ marginLeft: 2 }}>深度求索</Tag>
      </>
    ),
    desc: <>25 人 · 5.84B · 3033.9元</>,
    value: '9.94万次',
    color: '#52c41a',
  },
  {
    key: 'm2',
    name: (
      <>
        qwen3.6-27b-nvfp4 <Tag color="blue" style={{ marginLeft: 2 }}>阿里</Tag>
      </>
    ),
    desc: <>11 人 · 2.12B · 907.54元</>,
    value: '4.41万次',
    color: '#2f6bff',
  },
]

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
    <span style={{ width: 3, height: 15, background: '#2f6bff', borderRadius: 2, marginRight: 8 }} />
    <Text strong style={{ fontSize: 15 }}>{children}</Text>
  </div>
)

export default function ModelUsageStat() {
  const [range, setRange] = useState('近30天')
  const [detailKey, setDetailKey] = useState<string | null>(null)
  const detail = detailKey ? CONSUME_DETAIL[detailKey] : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Breadcrumb items={[{ title: '统计与分析' }, { title: '模型使用统计分析' }]} />
      </div>

      {/* 搜索栏 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Text>日期范围：</Text>
          <RangePicker style={{ width: 260 }} />
          <Segmented
            options={['今日', '近7天', '近30天', '近90天', '近1年']}
            value={range}
            onChange={(v) => setRange(v as string)}
          />
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Button icon={<ReloadOutlined />}>重置</Button>
              <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
            </Space>
          </div>
        </div>
      </Card>

      {/* 使用概览 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <SectionTitle>使用概览</SectionTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {OVERVIEW.map((c) => (
            <OverviewCardItem key={c.label} data={c} />
          ))}
        </div>
      </Card>

      {/* 峰值统计 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <SectionTitle>峰值统计</SectionTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <PeakCard
            title="日峰值（按 token 消耗）"
            desc="搜索范围内 token 消耗最高的一天"
            time="2026-08-04"
            color="#389e0d"
            bg="#eafaf0"
            metrics={[
              { label: '峰值调用次数', value: '1.64万次' },
              { label: '峰值消耗 token', value: '1.34B' },
              { label: '峰值使用用户数', value: '22' },
            ]}
          />
          <PeakCard
            title="小时峰值（按 token 消耗）"
            desc="搜索范围内 token 消耗最高的一个小时"
            time="2026-08-04 16:00"
            color="#722ed1"
            bg="#f4effc"
            metrics={[
              { label: '峰值调用次数', value: '1504次' },
              { label: '峰值消耗 token', value: '158.72M' },
              { label: '峰值使用用户数', value: '10' },
            ]}
          />
        </div>
      </Card>

      {/* Top10 榜单 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <RankList title="用户 Token 消耗 Top10" items={TOKEN_TOP} />
        <RankList
          title="用户消费 Top10"
          items={CONSUME_TOP}
          onItemClick={(it) => setDetailKey(it.key)}
          titleExtra={
            <RequirementDot
              title="用户消费 Top10"
              sections={[
                {
                  label: '',
                  items: [
                    '1.用户消费排行增加利润，利润 = 搜索范围内的消费金额 - 成本；排行逻辑不变，仅增加利润值。',
                    '2.点击进入消费排行的详情，增加成本总额，并在列表中增加成本、利润。',
                  ],
                },
              ]}
            />
          }
        />
        <RankList title="热门模型 Top10" items={MODEL_TOP} />
      </div>

      {/* 用户消费详情 */}
      <Modal
        open={!!detail}
        title={detail ? `${detail.user} · 消费详情` : ''}
        onCancel={() => setDetailKey(null)}
        footer={<Button onClick={() => setDetailKey(null)}>关闭</Button>}
        width={760}
        centered
        destroyOnHidden
      >
        {detail && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 150px', background: '#eef4ff', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 6 }}>调用次数</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#2f6bff' }}>{detail.callCount.toLocaleString()} 次</div>
              </div>
              <div style={{ flex: '1 1 150px', background: '#eafaf0', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 6 }}>消耗 token</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#389e0d' }}>{detail.tokensText}</div>
              </div>
              <div style={{ flex: '1 1 150px', background: '#fffbe6', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 6 }}>消费金额</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#faad14' }}>{detail.totalAmount.toFixed(2)} 元</div>
              </div>
              <div style={{ flex: '1 1 150px', background: '#fff7f0', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 6 }}>成本总额</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#fa541c' }}>{detail.totalCost.toFixed(2)} 元</div>
              </div>
              <div style={{ flex: '1 1 150px', background: '#f4effc', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 6 }}>使用模型数</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#722ed1' }}>{detail.modelCount} 个</div>
              </div>
            </div>
            <SectionTitle>使用模型分布（按用户消费降序）</SectionTitle>
            <Table
              rowKey="key"
              size="small"
              columns={detailColumns}
              dataSource={detail.rows}
              pagination={false}
            />
          </>
        )}
      </Modal>
    </div>
  )
}
