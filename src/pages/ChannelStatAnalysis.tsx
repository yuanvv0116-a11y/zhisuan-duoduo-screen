import { useMemo, useState } from 'react'
import {
  Card,
  DatePicker,
  Button,
  Select,
  Space,
  Segmented,
  Typography,
} from 'antd'
import {
  WalletOutlined,
  AccountBookOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  FireOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import RequirementDot from '../components/RequirementDot'

const { Text } = Typography
const { RangePicker } = DatePicker
/* ---------------- 数据 ---------------- */
const DATES = [
  '07-15', '07-16', '07-17', '07-18', '07-19', '07-20', '07-21', '07-22', '07-23', '07-24',
  '07-25', '07-26', '07-27', '07-28', '07-29', '07-30', '07-31', '08-01', '08-02', '08-03',
  '08-04', '08-05', '08-06', '08-07', '08-08', '08-09', '08-10', '08-11', '08-12', '08-13',
]

const OVERALL = [
  180.42, 320.15, 385.66, 60.12, 95.3, 300.55, 520.88, 480.21, 405.36, 950.73,
  100.18, 42.11, 468.237, 430.65, 1850.32, 1780.44, 650.51, 80.96, 3950.77, 5400.12,
  2350.66, 2560.48, 3380.84, 450.22, 150.1, 1980.65, 2050.33, 3080.52, 1350.19, 900.4,
]

// 对应的成本（大幅波动，使利润有正有负、红绿分明，用于利润对比）
const COST = OVERALL.map((v, i) => +(v * (0.5 + ((i * 3) % 8) * 0.11)).toFixed(2))

// 选中渠道模型的收入 / 成本（模型级）
const MODEL_REVENUE = OVERALL.map((v, i) => +(v * (0.7 + (i % 4) * 0.05)).toFixed(2))
// 成本系数在 0.45~1.4 大幅波动，使利润明显有正有负（红/绿分明）
const MODEL_COST = MODEL_REVENUE.map((v, i) => +(v * (0.45 + ((i * 5) % 10) * 0.105)).toFixed(2))

const MAX_Y = 6000
const Y_TICKS = [0, 1000, 2000, 3000, 4000, 5000, 6000]

/* ---------------- 统计卡 ---------------- */
interface StatCardData {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
  bg: string
}

const STAT_CARDS: StatCardData[] = [
  { label: '总收入', value: '3.58', unit: '万元', icon: <WalletOutlined />, bg: '#2f6bff' },
  { label: '渠道成本总额', value: '2.16', unit: '万元', icon: <AccountBookOutlined />, bg: '#fa541c' },
  { label: '渠道数量', value: '8', unit: '个', icon: <DatabaseOutlined />, bg: '#52c41a' },
  { label: '渠道模型数量', value: '34', unit: '个', icon: <AppstoreOutlined />, bg: '#fa8c16' },
  { label: '调用次数', value: '17.95', unit: '万次', icon: <ThunderboltOutlined />, bg: '#8c8c8c' },
  { label: '消耗 Tokens 总数', value: '11.38', unit: 'B', icon: <FireOutlined />, bg: '#f5222d' },
  { label: '生成图片总数', value: '169', unit: '张', icon: <PictureOutlined />, bg: '#faad14' },
  { label: '生成视频总时长', value: '775', unit: '秒', icon: <VideoCameraOutlined />, bg: '#2f6bff' },
]

function StatCard({ data }: { data: StatCardData }) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>{data.label}</Text>
          </div>
          <div>
            <span style={{ fontSize: 24, fontWeight: 600 }}>{data.value}</span>
            <span style={{ fontSize: 13, color: '#8c8c8c', marginLeft: 4 }}>{data.unit}</span>
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

/* ---------------- 趋势图（纯 SVG） ---------------- */
const W = 1200
const H = 340
const PAD = { left: 48, right: 20, top: 20, bottom: 28 }
const innerW = W - PAD.left - PAD.right
const innerH = H - PAD.top - PAD.bottom

const px = (i: number) => PAD.left + (i / (DATES.length - 1)) * innerW
const py = (v: number) => PAD.top + innerH - (Math.min(v, MAX_Y) / MAX_Y) * innerH

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

// Catmull-Rom 插值：把稀疏点加密为平滑曲线上的密集采样点
function densify(vals: number[], step = 12) {
  const out: number[] = []
  const n = vals.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = vals[i - 1] ?? vals[i]
    const p1 = vals[i]
    const p2 = vals[i + 1]
    const p3 = vals[i + 2] ?? p2
    for (let t = 0; t < step; t++) {
      const s = t / step
      const s2 = s * s
      const s3 = s2 * s
      const v =
        0.5 *
        (2 * p1 +
          (-p0 + p2) * s +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * s3)
      out.push(v)
    }
  }
  out.push(vals[n - 1])
  return out
}

/* ---------------- 成本 vs 消费 利润对比图（纯 SVG） ---------------- */
interface ProfitChartProps {
  amount: number[]
  cost: number[]
  amountLabel: string
  costLabel: string
}

function ProfitCompareChart({ amount, cost, amountLabel, costLabel }: ProfitChartProps) {
  const [hover, setHover] = useState<number | null>(null)

  const amountPts = useMemo(() => amount.map((v, i) => ({ x: px(i), y: py(v) })), [amount])
  const costPts = useMemo(() => cost.map((v, i) => ({ x: px(i), y: py(v) })), [cost])

  // 逐段生成利润填充：收入>成本为正(绿)，收入<成本为负(红)；交叉点处分割
  const { posPath, negPath } = useMemo(() => {
    const pos: string[] = []
    const neg: string[] = []
    const quad = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) =>
      `M ${ax} ${ay} L ${bx} ${by} L ${cx} ${cy} L ${dx} ${dy} Z`

    // 加密采样，使填充边界与平滑曲线贴合
    const STEP = 12
    const da = densify(amount, STEP)
    const dc = densify(cost, STEP)
    const m = da.length
    // 加密后每个采样点对应的 x（与原始索引线性映射）
    const dx = (k: number) => px((k / (m - 1)) * (DATES.length - 1))

    for (let i = 0; i < m - 1; i++) {
      const x1 = dx(i)
      const x2 = dx(i + 1)
      const a1 = py(da[i])
      const a2 = py(da[i + 1])
      const c1 = py(dc[i])
      const c2 = py(dc[i + 1])
      const d1 = da[i] - dc[i]
      const d2 = da[i + 1] - dc[i + 1]
      if (d1 >= 0 && d2 >= 0) {
        pos.push(quad(x1, a1, x2, a2, x2, c2, x1, c1))
      } else if (d1 <= 0 && d2 <= 0) {
        neg.push(quad(x1, a1, x2, a2, x2, c2, x1, c1))
      } else {
        const t = d1 / (d1 - d2)
        const xm = x1 + (x2 - x1) * t
        const am = a1 + (a2 - a1) * t
        const cm = c1 + (c2 - c1) * t
        if (d1 >= 0) {
          pos.push(quad(x1, a1, xm, am, xm, cm, x1, c1))
          neg.push(quad(xm, am, x2, a2, x2, c2, xm, cm))
        } else {
          neg.push(quad(x1, a1, xm, am, xm, cm, x1, c1))
          pos.push(quad(xm, am, x2, a2, x2, c2, xm, cm))
        }
      }
    }
    return { posPath: pos.join(' '), negPath: neg.join(' ') }
  }, [amount, cost])

  const colW = innerW / DATES.length

  return (
    <div style={{ position: 'relative' }}>
      {/* 图例 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#5a6474' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: '#2f6bff', marginRight: 5 }} />
          {amountLabel}
        </span>
        <span style={{ fontSize: 12, color: '#5a6474' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: '#fa541c', marginRight: 5 }} />
          {costLabel}
        </span>
        <span style={{ fontSize: 12, color: '#5a6474' }}>
          <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, background: '#52c41a', opacity: 0.5, marginRight: 5 }} />
          正利润
        </span>
        <span style={{ fontSize: 12, color: '#5a6474' }}>
          <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, background: '#f5222d', opacity: 0.5, marginRight: 5 }} />
          负利润
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52c41a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#52c41a" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5222d" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#f5222d" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Y 轴网格线 + 刻度 */}
        {Y_TICKS.map((t) => {
          const y = py(t)
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#eef0f4" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#8c8c8c">
                {t.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* X 轴刻度（隔一天显示） */}
        {DATES.map((d, i) =>
          i % 2 === 0 ? (
            <text key={d} x={px(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#8c8c8c">
              2026-{d}
            </text>
          ) : null,
        )}

        {/* 利润区域填充：正利润绿色，负利润红色 */}
        {posPath && <path d={posPath} fill="url(#profitFill)" />}
        {negPath && <path d={negPath} fill="url(#lossFill)" />}

        {/* 成本线 */}
        <path d={smoothPath(costPts)} fill="none" stroke="#fa541c" strokeWidth={2} />
        {/* 收入线 */}
        <path d={smoothPath(amountPts)} fill="none" stroke="#2f6bff" strokeWidth={2} />

        {amountPts.map((p, i) => (
          <circle key={`a${i}`} cx={p.x} cy={p.y} r={hover === i ? 4 : 2.5} fill="#2f6bff" />
        ))}
        {costPts.map((p, i) => (
          <circle key={`c${i}`} cx={p.x} cy={p.y} r={hover === i ? 4 : 2.5} fill="#fa541c" />
        ))}

        {/* 悬浮竖线 */}
        {hover !== null && (
          <line x1={px(hover)} y1={PAD.top} x2={px(hover)} y2={PAD.top + innerH} stroke="#c7d2fe" strokeWidth={1} />
        )}

        {/* 透明列，用于捕获 hover */}
        {DATES.map((d, i) => (
          <rect
            key={`h${i}`}
            x={px(i) - colW / 2}
            y={PAD.top}
            width={colW}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${(px(hover) / W) * 100}%`,
            top: 40,
            transform: 'translateX(-50%)',
            background: '#fff',
            border: '1px solid #eef0f4',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
        >
          <div style={{ marginBottom: 6, color: '#333' }}>2026-{DATES[hover]}</div>
          <div style={{ color: '#5a6474' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: '#2f6bff', marginRight: 6 }} />
            {amountLabel}：{amount[hover].toFixed(2)}
          </div>
          <div style={{ color: '#5a6474', marginTop: 2 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: '#fa541c', marginRight: 6 }} />
            {costLabel}：{cost[hover].toFixed(2)}
          </div>
          {(() => {
            const profit = amount[hover] - cost[hover]
            const isPos = profit >= 0
            return (
              <div style={{ color: isPos ? '#389e0d' : '#cf1322', marginTop: 2, fontWeight: 600 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: isPos ? '#52c41a' : '#f5222d', marginRight: 6 }} />
                利润：{profit.toFixed(2)}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

/* ---------------- 页面 ---------------- */
const CHANNEL_OPTIONS = ['生数科技-国内', '阿里云', '电信-国际', '火山', '智算多多-新疆', '智算多多-北京'].map((c) => ({ value: c, label: c }))
const MODEL_OPTIONS = [{ value: 'all', label: '全部' }, ...['Kimi-K2.6', 'deepseek-v4-flash', 'Qwen-Max', 'GPT-4o'].map((m) => ({ value: m, label: m }))]
const COMPARE_CHANNEL_OPTIONS = [
  { value: 'all', label: '全部' },
  ...[
    '生数科技-国内',
    '京西智谷',
    '火山',
    '电信-国际',
    '天翼云-国内',
    '智算多多-北京',
    '智算多多-新疆',
    '阿里云',
  ].map((c) => ({ value: c, label: c })),
]
export default function ChannelStatAnalysis() {
  const [range, setRange] = useState('近30天')
  const [compareModel, setCompareModel] = useState('all')
  // 默认取当前渠道下的一个随机模型（排除“全部”）；无模型时回退为“全部”
  const [modelSel, setModelSel] = useState<string>(() => {
    const pool = MODEL_OPTIONS.filter((o) => o.value !== 'all')
    return pool.length ? pool[Math.floor(Math.random() * pool.length)].value : 'all'
  })

  return (
    <div>
      {/* 标题 + 需求点 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>渠道统计分析</Text>
        <RequirementDot
          title="渠道统计分析"
          sections={[
            {
              label: '',
              items: [
                '1.总消费金额改为“总收入”（第一个数值）。',
                '2.模型成本与消费金额对比，改为“渠道成本与收入”，里面的“消费金额”改为“收入”，并增加利润，利润=消费的金额（收入）-成本，不再展示柱状图。',
                '3.模型消费趋势改为“模型成本与收入”，展示的是选中的渠道模型的成本与实际收入，利润计算同上，中间的利润用明显的颜色表示，不再展示柱状图。',
                '4.模型数量改为“渠道模型数量”，展示所有渠道模型（包括启用和禁用）。',
                '5.渠道成本与收入、模型成本与收入后面的下拉框增加“全部”，统计当前搜索条件下搜索的全部渠道的成本与收入、全部模型的成本与收入（此时全部渠道与全部渠道模型应该是相同的图形）。',
                '6.模型成本与收入的默认值是当前搜索条件下、当前选中渠道下的一个随机模型（不是全部，如果没有模型，则为全部）。',
              ],
            },
          ]}
        />
      </div>

      {/* 搜索栏 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Text>日期范围：</Text>
          <RangePicker style={{ width: 260 }} />
          <Segmented
            options={['今日', '近7天', '近30天', '近90天']}
            value={range}
            onChange={(v) => setRange(v as string)}
          />
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Select style={{ width: 150 }} defaultValue="all" options={[{ value: 'all', label: '全部渠道' }, ...CHANNEL_OPTIONS]} />
              <Button icon={<ReloadOutlined />}>重置</Button>
              <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
            </Space>
          </div>
        </div>
      </Card>

      {/* 统计卡 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {STAT_CARDS.map((c) => (
          <StatCard key={c.label} data={c} />
        ))}
      </div>

      {/* 渠道成本与收入 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ marginRight: 12 }}>渠道成本与收入</Text>
          <Select
            size="small"
            style={{ width: 160 }}
            value={compareModel}
            onChange={setCompareModel}
            options={COMPARE_CHANNEL_OPTIONS}
          />
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
            两线之间的绿色区域为利润
          </Text>
        </div>
        <ProfitCompareChart amount={OVERALL} cost={COST} amountLabel="收入" costLabel="成本" />
      </Card>

      {/* 模型成本与收入 */}
      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ marginRight: 12 }}>模型成本与收入</Text>
          <Select
            size="small"
            style={{ width: 160 }}
            value={modelSel}
            onChange={setModelSel}
            options={MODEL_OPTIONS}
          />
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
            展示选中渠道模型的成本与实际收入，两线之间的绿色区域为利润
          </Text>
        </div>
        <ProfitCompareChart amount={MODEL_REVENUE} cost={MODEL_COST} amountLabel="收入" costLabel="成本" />
      </Card>
    </div>
  )
}
