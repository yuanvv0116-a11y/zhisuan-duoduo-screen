import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Card, DatePicker, Select, Space, Table, Tag, Tooltip, Typography, message, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AccountBookOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileProtectOutlined,
  FunnelPlotOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useChannelModels, useChannels } from '../store'
import RequirementDot from '../components/RequirementDot'
import SearchField from '../components/SearchField'
import { GRAN_META, MAX_WINDOW_POINTS, apiNameOf, buildPerfBoard, fmtNum } from '../perfBoard'
import type {
  ChannelRow,
  Granularity,
  IntervalRow,
  Metrics,
  PerfBoard,
  TrendPoint,
} from '../perfBoard'

const { Text } = Typography
const { RangePicker } = DatePicker

const EMPTY = <Text type="secondary">—</Text>

/* ---------------- 悬浮说明：公式 / 采样聚合 / 告警阈值 ---------------- */

function Tip({ formula, sample, warn }: { formula: string; sample?: string; warn?: string }) {
  return (
    <Tooltip
      title={
        <div style={{ maxWidth: 340, lineHeight: 1.7 }}>
          <div>{`公式：${formula}`}</div>
          {sample && <div>{`采样与聚合：${sample}`}</div>}
          {warn && <div>{`告警阈值：${warn}`}</div>}
        </div>
      }
    >
      <Text type="secondary" style={{ cursor: 'help' }}>
        <QuestionCircleOutlined />
      </Text>
    </Tooltip>
  )
}

function SectionTitle({ text, tip }: { text: string; tip?: ReactNode }) {
  const { token } = theme.useToken()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 14px' }}>
      <span style={{ width: 3, height: 15, borderRadius: 2, background: token.colorPrimary, display: 'inline-block' }} />
      <span style={{ fontSize: 15, fontWeight: 600 }}>{text}</span>
      {tip}
    </div>
  )
}

/* ---------------- KPI 概览卡 ---------------- */

interface Kpi {
  label: string
  value: string
  unit?: string
  sub?: ReactNode
  icon: ReactNode
  bg: string
  tip?: ReactNode
}

function KpiCard({ data }: { data: Kpi }) {
  return (
    <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ flex: 1, minWidth: 170 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {data.label}
            </Text>
            {data.tip}
          </div>
          <div>
            <span style={{ fontSize: 24, fontWeight: 600 }}>{data.value}</span>
            {data.unit && <span style={{ fontSize: 13, color: '#8c8c8c', marginLeft: 4 }}>{data.unit}</span>}
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
            flex: 'none',
          }}
        >
          {data.icon}
        </div>
      </div>
    </Card>
  )
}

/* ---------------- 内联 SVG 折线图（项目不引入图表库） ---------------- */

function niceTop(max: number): number {
  const raw = (max > 0 ? max : 1) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw - 1e-12) ?? 10 * mag
  return step * 4
}

function TrendChart({
  series,
  digits,
  yFloor,
  yTop,
  threshold,
  suffix = '',
  height = 236,
}: {
  series: { name: string; color: string; points: TrendPoint[] }[]
  digits?: number
  yFloor?: number
  yTop?: number
  threshold?: { value: number; label: string }
  suffix?: string
  height?: number
}) {
  const { token } = theme.useToken()
  const W = 880
  const H = height
  const padL = 62
  const padR = 18
  const padT = 14
  const padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = Math.max(series[0]?.points.length ?? 0, 2)
  const flat = series.flatMap((s) => s.points.map((p) => p.value)).filter((v) => Number.isFinite(v))
  const dataMax = flat.length ? Math.max(...flat) : 1
  const dataMin = flat.length ? Math.min(...flat) : 0
  const top = yTop ?? niceTop(Math.max(dataMax, threshold ? threshold.value * 1.25 : 0))
  const bottom =
    yFloor !== undefined ? Math.max(0, Math.floor(Math.min(yFloor, dataMin) * 10) / 10) : 0
  const fmt = (v: number) => `${fmtNum(v, digits ?? (v >= 100 ? 0 : v >= 10 ? 1 : 2))}${suffix}`
  const x = (i: number) => padL + (innerW * i) / (n - 1)
  const y = (v: number) =>
    padT + innerH * (1 - (Math.min(top, Math.max(bottom, v)) - bottom) / Math.max(top - bottom, 1e-9))
  const ticks = [0, 1, 2, 3, 4].map((i) => bottom + ((top - bottom) * i) / 4)
  const slot = innerW / (n - 1)
  const labelEvery = Math.max(1, Math.ceil(n / 8))
  const anomalyIdx = new Set<number>()
  series.forEach((s) => {
    s.points.forEach((p, i) => {
      if (p.anomaly) anomalyIdx.add(i)
    })
  })
  const anomalies = [...anomalyIdx].sort((a, b) => a - b)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        {series.map((s) => (
          <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <i style={{ width: 10, height: 3, borderRadius: 2, background: s.color, display: 'inline-block' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {s.name}
            </Text>
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img">
        {ticks.map((t) => (
          <g key={`t-${t}`}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke={token.colorSplit}
              strokeDasharray={t === bottom ? undefined : '4 4'}
            />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={token.colorTextQuaternary}>
              {fmt(t)}
            </text>
          </g>
        ))}
        {anomalies.map((i) => (
          <rect
            key={`band-${i}`}
            x={Math.max(padL, x(i) - slot / 2)}
            y={padT}
            width={Math.min(W - padR, x(i) + slot / 2) - Math.max(padL, x(i) - slot / 2)}
            height={innerH}
            fill={token.colorError}
            opacity={0.08}
          />
        ))}
        {threshold && threshold.value < top && (
          <g>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(threshold.value)}
              y2={y(threshold.value)}
              stroke={token.colorWarning}
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
            <text x={W - padR} y={y(threshold.value) - 6} textAnchor="end" fontSize={11} fill={token.colorWarning}>
              {threshold.label}
            </text>
          </g>
        )}
        {series.map((s) => (
          <path
            key={s.name}
            d={s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
          />
        ))}
        {series.map((s) =>
          s.points.map((p, i) => (
            <circle
              key={`${s.name}-${i}`}
              cx={x(i)}
              cy={y(p.value)}
              r={p.anomaly ? 4 : 2.2}
              fill={p.anomaly ? token.colorError : s.color}
              stroke={p.anomaly ? token.colorBgContainer : undefined}
              strokeWidth={p.anomaly ? 1.5 : undefined}
            />
          )),
        )}
        {(series[0]?.points ?? []).map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={`lb-${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={token.colorTextQuaternary}>
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}

/* ---------------- 分布条形列表 ---------------- */

function BarList({ items, color }: { items: { label: string; count: number; pct: number }[]; color?: string }) {
  const { token } = theme.useToken()
  const max = Math.max(...items.map((i) => i.pct), 1)
  return (
    <div>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <span style={{ width: 62, fontSize: 12, flex: 'none' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {it.label}
            </Text>
          </span>
          <span style={{ flex: 1, height: 10, borderRadius: 5, background: token.colorFillQuaternary }}>
            <i
              style={{
                display: 'block',
                height: '100%',
                width: `${(it.pct / max) * 100}%`,
                borderRadius: 5,
                background: color ?? token.colorPrimary,
              }}
            />
          </span>
          <span style={{ width: 86, textAlign: 'right', fontSize: 12, flex: 'none' }}>{fmtNum(it.count)} 次</span>
          <span style={{ width: 48, textAlign: 'right', fontSize: 12, flex: 'none' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {it.pct}%
            </Text>
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- 延迟分解堆叠条 ---------------- */

const SEG_COLORS = ['colorInfo', 'colorPrimary', 'colorWarning', 'colorSuccess'] as const

function StackBar({ m }: { m: Metrics }) {
  const { token } = theme.useToken()
  const segs = [
    { label: '排队等待', value: m.queue },
    { label: '网络往返', value: m.network },
    { label: '预填充 Prefill', value: m.prefill },
    { label: '解码生成 Decode', value: m.decode },
  ]
  const colors = [token[SEG_COLORS[0]], token[SEG_COLORS[1]], token[SEG_COLORS[2]], token[SEG_COLORS[3]]]
  const sum = segs.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: token.colorFillQuaternary }}>
        {segs.map((s, i) => (
          <span key={s.label} style={{ width: `${(s.value / sum) * 100}%`, background: colors[i] }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginTop: 12 }}>
        {segs.map((s, i) => (
          <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: colors[i], display: 'inline-block' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {s.label}
            </Text>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{`${fmtNum(s.value, 2)} 秒`}</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {`${((s.value / sum) * 100).toFixed(1)}%`}
            </Text>
          </span>
        ))}
        <span style={{ fontSize: 13 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            合计
          </Text>
          <span style={{ fontWeight: 600, marginLeft: 6 }}>{`${fmtNum(sum, 2)} 秒`}</span>
        </span>
      </div>
    </div>
  )
}

/* ---------------- 小组件：迷你指标 ---------------- */

function MiniMetric({
  label,
  value,
  unit,
  sub,
  tip,
}: {
  label: string
  value: string
  unit?: string
  sub?: ReactNode
  tip?: ReactNode
}) {
  return (
    <div style={{ flex: 1, minWidth: 132, border: '1px solid #eef0f4', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Text>
        {tip}
      </div>
      <div style={{ fontSize: 19, fontWeight: 600 }}>
        {value}
        {unit && (
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
            {unit}
          </Text>
        )}
      </div>
      {sub && (
        <div style={{ marginTop: 6, minHeight: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {sub}
          </Text>
        </div>
      )}
    </div>
  )
}

/* ---------------- 通用格式化与容器 ---------------- */

const sec = (v: number, d = 2) => `${fmtNum(v, d)} 秒`
const pc = (v: number, d = 2) => `${fmtNum(v, d)}%`
const yuan = (v: number, d = 2) => `¥${fmtNum(v, d)}`

function Delta({ label, value, goodWhenUp = true }: { label: string; value: number; goodWhenUp?: boolean }) {
  const { token } = theme.useToken()
  const flat = Math.abs(value) < 0.05
  const color = flat ? token.colorTextSecondary : (value > 0) === goodWhenUp ? token.colorSuccess : token.colorError
  return (
    <span>
      {label}
      <span style={{ color, marginLeft: 4, fontWeight: 600 }}>
        {flat ? '持平' : `${value > 0 ? '+' : ''}${fmtNum(value, 1)}%`}
      </span>
    </span>
  )
}

function BoardCard({
  title,
  tip,
  desc,
  children,
}: {
  title: string
  tip?: ReactNode
  desc?: ReactNode
  children: ReactNode
}) {
  return (
    <Card
      variant="borderless"
      styles={{ body: { padding: 16 } }}
      style={{ marginBottom: 16 }}
      title={
        <Space size={6}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
          {tip}
        </Space>
      }
      extra={
        desc ? (
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {desc}
          </Text>
        ) : undefined
      }
    >
      {children}
    </Card>
  )
}

function MiniRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '0 0 4px' }}>{children}</div>
}

/* ---------------- 区块一：监控总览 ---------------- */

function OverviewSection({ board }: { board: PerfBoard }) {
  const { token } = theme.useToken()
  const m = board.total
  const cards: Kpi[] = [
    {
      label: '请求总数',
      value: fmtNum(m.req),
      unit: '次',
      icon: <ApiOutlined />,
      bg: token.colorPrimary,
      sub: `输入 ${fmtNum(m.inTok)} + 输出 ${fmtNum(m.outTok)} Token`,
      tip: <Tip formula="窗口内已完成区间的请求数之和（Σ 区间请求数）" sample="各区间按 5 分钟步长独立计数后相加，区间可加" />,
    },
    {
      label: '平均 QPS',
      value: fmtNum(m.qps, 2),
      unit: '次 / 秒',
      icon: <ThunderboltOutlined />,
      bg: '#13c2c2',
      sub: (
        <Space size={12} wrap>
          <Delta label="环比" value={board.momQps} />
          <Delta label="昨日同比" value={board.dodQps} />
        </Space>
      ),
      tip: (
        <Tip
          formula="QPS = 请求总数 ÷ 窗口秒数；RPM = QPS × 60"
          sample="按窗口边界对齐聚合，环比取上一等长窗口，同比取昨日同刻窗口"
          warn="QPS 突增较 EWMA(α=0.3) 基线偏离 3σ 即标注异动区间"
        />
      ),
    },
    {
      label: 'Token 吞吐',
      value: fmtNum(m.tokenTps, 1),
      unit: 'Token / 秒',
      icon: <FunnelPlotOutlined />,
      bg: '#fa541c',
      sub: `输入侧 ${fmtNum(m.inTps, 1)} Token/秒`,
      tip: <Tip formula="Token 吞吐 = 输出 Token 总量 ÷ 窗口秒数" sample="流式与非流式统一按完成时刻归集" />,
    },
    {
      label: 'P95 延迟',
      value: sec(m.p95),
      icon: <ClockCircleOutlined />,
      bg: '#722ed1',
      sub: `窗口最大 P99 ${sec(board.maxP99)}`,
      tip: (
        <Tip
          formula="P95：窗口内 95% 请求的总耗时 ≤ 该值"
          sample="各区间百分位按请求数加权合并（T-Digest 等价的近似合并）"
          warn="P95 > 10 秒告警，P99 > 30 秒严重"
        />
      ),
    },
    {
      label: '请求成功率',
      value: pc(m.sr),
      icon: <FileProtectOutlined />,
      bg: '#52c41a',
      sub: `剔除客户端错误口径 ${pc(m.srExcl)}`,
      tip: (
        <Tip
          formula="成功率 = 成功请求数 ÷ 总请求数；可用率 = (成功 + 客户端错误 + 内容安全) ÷ 总请求数"
          sample="4xx 与内容安全过滤计为「非平台责任」，故单列剔除口径"
          warn="5 分钟窗口成功率 < 95% 触发 P0"
        />
      ),
    },
    {
      label: '总成本',
      value: yuan(m.cost),
      icon: <DollarOutlined />,
      bg: '#faad14',
      sub: (
        <Space size={12} wrap>
          <span>上周同比 <Delta label="" value={board.wowCost} goodWhenUp={false} /></span>
          <span>{`无效消耗 ${yuan(m.wasteCost)}（${pc(m.wasteRate, 1)}）`}</span>
        </Space>
      ),
      tip: (
        <Tip
          formula="成本 = Σ(输入 Token × 输入单价 + 输出 Token × 输出单价) ÷ 1,000,000"
          sample="单价取自渠道模型配置的 ¥/Mt 定价，按请求完成时刻计入；无效消耗为失败请求已计费的算力成本（按平均输入 + 35% 平均输出折算），括号内为占总成本比例"
          warn="小时成本同比上周同期涨幅 > 50% 预警"
        />
      ),
    },
    {
      label: '千 Token 成本',
      value: `¥${fmtNum(m.costPer1k, 3)}`,
      unit: '/ 1K Token',
      icon: <AccountBookOutlined />,
      bg: '#f5222d',
      sub: `每元产出 ${fmtNum(m.tokensPerYuan)} Token`,
      tip: (
        <Tip
          formula="千 Token 成本 = 总成本 ÷ (输入 + 输出 Token) × 1000"
          sample="与「每元产出 Token」互为倒数，用于横向比价"
        />
      ),
    },
  ]
  return (
    <BoardCard
      title="监控总览"
      desc={`${board.points} × ${GRAN_META[board.gran].label}区间 · 仅统计已完成区间`}
      tip={
        <Tip
          formula={`统计窗口：${board.windowLabel}`}
          sample={`${board.scopeLabel} · 区间粒度 ${GRAN_META[board.gran].label} · ${board.retention}`}
        />
      }
    >
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {cards.map((c) => (
          <KpiCard key={c.label} data={c} />
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Space size={20} wrap split={<span style={{ color: token.colorSplit }}>|</span>}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {`峰值并发 ${fmtNum(board.peakConcurrency, 1)}（并发 = Σ 请求耗时 ÷ 窗口秒数）`}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {`最低区间成功率 ${pc(board.minSr)} @ ${board.minSrLabel}`}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {`窗口最大 P99 ${sec(board.maxP99)}`}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {`EWMA(α=0.3) 偏离 3σ 区间数 ${board.ewmaFlags}`}
          </Text>
        </Space>
      </div>
    </BoardCard>
  )
}

/* ---------------- 区块二：趋势分析 ---------------- */

function ChartBlock({ title, tip, children }: { title: string; tip?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionTitle text={title} tip={tip} />
      {children}
    </div>
  )
}

function TrendSection({ board }: { board: PerfBoard }) {
  const { token } = theme.useToken()
  const latColor: Record<string, string> = {
    p50: token.colorInfo,
    p95: token.colorWarning,
    p99: token.colorError,
  }
  const succColor: Record<string, string> = {
    main: token.colorPrimary,
    alt: token.colorSuccess,
  }
  const succMin = Math.min(...board.series.success.flatMap((s) => s.points.map((p) => p.value)), 100)
  return (
    <BoardCard title="趋势分析" desc="横轴为已完成区间；红色区间为该图 EWMA 单边检测命中的异常时段（成功率只看下跌、延迟与吞吐只看上涨，均为 3σ）">
      <ChartBlock
        title={`请求速率 QPS（${GRAN_META[board.gran].label}区间）`}
        tip={
          <Tip
            formula="区间 QPS = 该区间请求数 ÷ 区间秒数"
            sample={`窗口 ${board.points} 个 ${GRAN_META[board.gran].label}区间，各区间独立计数后逐点绘制`}
          />
        }
      >
        <TrendChart series={[{ name: 'QPS', color: token.colorPrimary, points: board.series.qps }]} />
      </ChartBlock>
      <ChartBlock
        title="Token 吞吐（每秒输出 Token）"
        tip={<Tip formula="区间吞吐 = 该区间输出 Token 总量 ÷ 区间秒数" sample="含流式增量输出的累计 Token" />}
      >
        <TrendChart series={[{ name: '输出 Token / 秒', color: token.colorSuccess, points: board.series.tps }]} />
      </ChartBlock>
      <ChartBlock
        title="延迟分位趋势（P50 / P95 / P99）"
        tip={
          <Tip
            formula="各区间独立计算分位后，跨渠道 / 模型按请求数加权合并"
            warn="P95 > 10 秒告警；P99 环比跳变 > 50% 关注"
          />
        }
      >
        <TrendChart
          series={board.series.latency.map((s) => ({ name: s.label, color: latColor[s.color], points: s.points }))}
          suffix="s"
          yFloor={Math.min(...board.series.latency.flatMap((s) => s.points.map((p) => p.value)))}
        />
      </ChartBlock>
      <ChartBlock
        title="请求成功率趋势"
        tip={
          <Tip
            formula="区间成功率 = 该区间成功请求数 ÷ 该区间总请求数"
            sample="剔除客户端错误口径同时展示，用于区分平台责任与调用方责任"
            warn="连续 3 个区间 < 99% 触发 P0"
          />
        }
      >
        <TrendChart
          series={board.series.success.map((s) => ({ name: s.label, color: succColor[s.color], points: s.points }))}
          digits={2}
          suffix="%"
          yFloor={Math.min(succMin, 99) - 1}
          yTop={100}
        />
      </ChartBlock>
      <ChartBlock
        title="首 Token 延迟趋势（TTFT P95）"
        tip={
          <Tip
            formula="TTFT = 首个 Token 到达时间 − 请求发送时间；图中取区间 P95"
            sample="仅统计流式请求；非流式请求无 TTFT / TPOT"
            warn="TTFT P95 > 3 秒告警，> 5 秒严重"
          />
        }
      >
        {board.total.hasStream ? (
          <TrendChart
            series={[{ name: 'TTFT P95', color: token.colorPrimary, points: board.series.ttft }]}
            suffix="s"
            threshold={{ value: 3, label: '告警阈值 3 秒' }}
          />
        ) : (
          <div style={{ padding: '28px 0', textAlign: 'center' }}>
            <Text type="secondary">当前统计范围内无流式请求，TTFT / TPOT 不适用</Text>
          </div>
        )}
      </ChartBlock>
    </BoardCard>
  )
}

/* ---------------- 区块三：时延分析 ---------------- */

interface PctRow {
  key: string
  name: string
  value: string
  note: string
  tip?: ReactNode
}

function LatencySection({ board }: { board: PerfBoard }) {
  const m = board.total
  const rows: PctRow[] = [
    {
      key: 'mean',
      name: '平均延迟',
      value: sec(m.meanLat),
      note: '受长尾拉高，通常高于 P50',
      tip: <Tip formula="平均延迟 = Σ 单请求总耗时 ÷ 请求数" sample="以「总耗时乘积和」保存，跨区间可精确合并" />,
    },
    {
      key: 'p50',
      name: 'P50',
      value: sec(m.p50),
      note: '50% 请求 ≤ 该值，约 0.78 × 平均延迟',
      tip: <Tip formula="P50 = 中位数延迟（50% 请求总耗时 ≤ 该值）" sample="T-Digest 分位草图，区间合并时按请求数加权" />,
    },
    {
      key: 'p90',
      name: 'P90',
      value: sec(m.p90),
      note: '约 1.6 × 平均延迟，用于观察分布右移',
      tip: <Tip formula="P90 = 90% 请求总耗时 ≤ 该值" sample="按请求数加权合并各区间 P90" />,
    },
    {
      key: 'p95',
      name: 'P95',
      value: sec(m.p95),
      note: 'SLA 主口径，约 2.15 × 平均延迟',
      tip: (
        <Tip
          formula="P95 = 95% 请求总耗时 ≤ 该值"
          sample="按请求数加权合并各区间 P95；渠道健康度以「基线 P95 ÷ 实际 P95」评分"
          warn="P95 > 10 秒告警"
        />
      ),
    },
    {
      key: 'p99',
      name: 'P99',
      value: sec(m.p99),
      note: '长尾监控，约 3.4 × 平均延迟',
      tip: (
        <Tip
          formula="P99 = 99% 请求总耗时 ≤ 该值"
          sample="按请求数加权合并各区间 P99，并保存平方和以计算离散度"
          warn="P99 > 30 秒严重告警"
        />
      ),
    },
    {
      key: 'cv',
      name: 'P99 变异系数',
      value: fmtNum(m.p99cv, 3),
      note: 'σ(P99) ÷ E(P99)，衡量长尾稳定性',
      tip: (
        <Tip
          formula="P99 变异系数 = 标准差(P99) ÷ 均值(P99)"
          sample="由各区间 P99 的均值与平方和合并计算"
          warn="> 0.5 判定长尾抖动，需排查个别渠道 / 模型"
        />
      ),
    },
  ]
  const cols: ColumnsType<PctRow> = [
    {
      title: '分位指标',
      dataIndex: 'name',
      width: 150,
      render: (v: string, r) => (
        <Space size={4}>
          <span>{v}</span>
          {r.tip}
        </Space>
      ),
    },
    { title: '数值', dataIndex: 'value', width: 110, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    {
      title: '计算口径与告警建议',
      dataIndex: 'note',
      ellipsis: true,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
  ]
  return (
    <BoardCard
      title="时延分析"
      desc="总延迟 = 排队等待 + 网络往返 + 预填充 + 解码生成"
      tip={
        <Tip
          formula="延迟分解：单请求总耗时按时间戳拆为排队 / 网络 / Prefill / Decode 四段后求均值"
          sample="四段乘积和分别保存，合并后恒等于平均延迟"
        />
      }
    >
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 5, minWidth: 420 }}>
          <SectionTitle text="延迟分位" />
          <Table<PctRow> rowKey="key" size="small" columns={cols} dataSource={rows} pagination={false} />
        </div>
        <div style={{ flex: 4, minWidth: 320 }}>
          <SectionTitle
            text="平均延迟分解"
            tip={
              <Tip
                formula="各段占比 = Σ 该段耗时 ÷ 请求数；四段之和 = 平均延迟"
                sample="流式请求的 Decode 段取首 Token 之后的生成耗时"
              />
            }
          />
          <StackBar m={m} />
          <MiniRow>
            <MiniMetric
              label="TTFT 平均"
              value={m.hasStream ? sec(m.ttftMean) : '—'}
              sub={m.hasStream ? '首 Token 到达' : '无流式请求'}
              tip={
                <Tip
                  formula="TTFT = 首个 Token 到达时间 − 请求发送时间"
                  sample="仅流式请求参与统计"
                  warn="P95 > 3 秒告警，> 5 秒严重"
                />
              }
            />
            <MiniMetric
              label="TTFT P95"
              value={m.hasStream ? sec(m.ttftP95) : '—'}
              sub="流式体验主口径"
              tip={<Tip formula="区间内 95% 流式请求的 TTFT ≤ 该值" warn="P95 > 3 秒告警" />}
            />
            <MiniMetric
              label="TPOT"
              value={m.hasStream ? `${fmtNum(m.tpot * 1000, 1)} 毫秒` : '—'}
              sub="单 Token 生成耗时"
              tip={
                <Tip
                  formula="TPOT = 解码总耗时 ÷ 输出 Token 数（仅流式）"
                  sample="与 TPS 互为倒数关系，衡量生成速度"
                  warn="> 50 毫秒 / Token 判定生成偏慢"
                />
              }
            />
            <MiniMetric
              label="超时率（> 60 秒）"
              value={pc(m.timeoutRate)}
              sub={`窗口最大 P99 ${sec(board.maxP99)}`}
              tip={
                <Tip
                  formula="超时率 = 总耗时 > 60 秒的请求 ÷ 总请求数"
                  sample="由 P50 / P90 / P95 / P99 锚点构造分段线性 CDF 后反推尾部占比"
                  warn="> 1% 触发 P1"
                />
              }
            />
          </MiniRow>
        </div>
      </div>
    </BoardCard>
  )
}

/* ---------------- 区块四：吞吐与并发 ---------------- */

function ThroughputSection({ board }: { board: PerfBoard }) {
  const { token } = theme.useToken()
  const m = board.total
  return (
    <BoardCard
      title="吞吐与并发"
      desc="并发与队列均为窗口均值"
      tip={
        <Tip
          formula="并发 = Σ 请求耗时 ÷ 窗口秒数（Little 定律）；队列长度 = Σ 排队等待时长 ÷ 窗口秒数"
          warn="平均排队 > 500 毫秒告警"
        />
      }
    >
      <MiniRow>
        <MiniMetric
          label="平均 QPS"
          value={fmtNum(m.qps, 2)}
          sub={`RPM ${fmtNum(m.rpm, 1)}`}
          tip={<Tip formula="QPS = 请求总数 ÷ 窗口秒数；RPM = QPS × 60" />}
        />
        <MiniMetric
          label="平均并发"
          value={fmtNum(m.concurrency, 1)}
          sub={`峰值 ${fmtNum(board.peakConcurrency, 1)}`}
          tip={<Tip formula="平均并发 = Σ 单请求耗时 ÷ 窗口秒数" sample="等价于 Little 定律的稳态在途请求数" />}
        />
        <MiniMetric
          label="平均队列长度"
          value={fmtNum(m.queueLen, 2)}
          sub={`平均排队 ${fmtNum(m.waitMs, 1)} 毫秒`}
          tip={
            <Tip
              formula="队列长度 = Σ 排队等待时长 ÷ 窗口秒数；平均排队 = Σ 排队等待 ÷ 请求数"
              warn="平均排队 > 500 毫秒告警"
            />
          }
        />
        <MiniMetric
          label="输出 Token 吞吐"
          value={`${fmtNum(m.tokenTps, 1)}`}
          unit="Token/秒"
          sub={`输出 ${fmtNum(m.outTok)} Token`}
          tip={<Tip formula="输出吞吐 = 输出 Token 总量 ÷ 窗口秒数" />}
        />
        <MiniMetric
          label="输入 Token 吞吐"
          value={`${fmtNum(m.inTps, 1)}`}
          unit="Token/秒"
          sub={`输入 ${fmtNum(m.inTok)} Token`}
          tip={<Tip formula="输入吞吐 = 输入 Token 总量 ÷ 窗口秒数" />}
        />
        <MiniMetric
          label="平均单次输出"
          value={`${fmtNum(m.req > 0 ? m.outTok / m.req : 0, 0)}`}
          unit="Token"
          sub={`单次输入 ${fmtNum(m.req > 0 ? m.inTok / m.req : 0, 0)} Token`}
          tip={<Tip formula="平均输出长度 = 输出 Token 总量 ÷ 请求数" sample="与下方长度分布互为验证" />}
        />
      </MiniRow>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <SectionTitle
            text="输出长度分布"
            tip={
              <Tip
                formula="按单请求输出 Token 数落入的区间计数，占比 = 区间请求数 ÷ 总请求数"
                sample="区间口径：&lt;100 / 100-500 / 500-1K / 1-2K / 2-4K / 4K+"
              />
            }
          />
          <BarList items={board.outBuckets} color={token.colorPrimary} />
        </div>
        <div style={{ flex: 1, minWidth: 300 }}>
          <SectionTitle
            text="输入长度分布"
            tip={
              <Tip
                formula="按单请求输入 Token 数落入的区间计数"
                sample="区间口径：&lt;1K / 1-4K / 4-16K / 16-64K / 64K+，长上下文成本主要由该分布决定"
              />
            }
          />
          <BarList items={board.inBuckets} color={token.colorInfo} />
        </div>
      </div>
    </BoardCard>
  )
}

/* ---------------- 区块五：质量与错误 ---------------- */

function QualitySection({ board }: { board: PerfBoard }) {
  const { token } = theme.useToken()
  const m = board.total
  const anomalyCols: ColumnsType<IntervalRow> = [
    { title: '采集时段', dataIndex: 'fullLabel', width: 140, fixed: 'left' },
    { title: '请求数', dataIndex: 'req', width: 92, render: (v: number) => fmtNum(v) },
    {
      title: '成功率',
      dataIndex: 'sr',
      width: 96,
      render: (v: number) => <span style={{ color: token.colorError, fontWeight: 600 }}>{pc(v)}</span>,
    },
    { title: '剔除客户端错误', dataIndex: 'srExcl', width: 140, render: (v: number) => pc(v) },
    { title: 'P95 延迟', dataIndex: 'p95', width: 104, render: (v: number) => sec(v) },
    { title: '限流率', dataIndex: 'throttleRate', width: 96, render: (v: number) => pc(v) },
  ]
  const errorCols: ColumnsType<{ code: string; label: string; category: string; count: number; pct: number }> = [
    { title: '错误码', dataIndex: 'code', width: 190, render: (v: string) => <Text code>{v}</Text> },
    { title: '错误说明', dataIndex: 'label', ellipsis: true, render: (v: string) => <span>{v}</span> },
    {
      title: '归类',
      dataIndex: 'category',
      width: 120,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
    { title: '次数', dataIndex: 'count', width: 92, render: (v: number) => fmtNum(v) },
    {
      title: '占错误比',
      dataIndex: 'pct',
      width: 104,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{pc(v, 1)}</span>,
    },
  ]
  const anomalies = board.intervals.filter((i) => i.anomalous)
  return (
    <BoardCard
      title="质量与错误"
      desc={`错误分类口径 6 类 · 窗口内异常区间 ${anomalies.length} 个`}
      tip={
        <Tip
          formula="错误归类：4xx → 客户端错误；429 → 被限流；5xx → 上游服务错误；超时 / 连接异常 / 内容安全过滤单列"
          sample="成功 + 六类错误 = 请求总数（恒等校验）"
        />
      }
    >
      <MiniRow>
        <MiniMetric
          label="请求成功率"
          value={pc(m.sr)}
          sub={`剔除客户端错误 ${pc(m.srExcl)}`}
          tip={<Tip formula="成功率 = 成功请求数 ÷ 总请求数" warn="< 95% 触发 P0，< 99% 触发 P1" />}
        />
        <MiniMetric
          label="限流率"
          value={pc(m.throttleRate)}
          sub="429 占总请求"
          tip={
            <Tip
              formula="限流率 = 429 响应数 ÷ 总请求数"
              sample="含 RPM / TPM / 日配额三类限额触发的拒绝"
              warn="> 2% 预警，> 5% 严重并自动降权路由"
            />
          }
        />
        <MiniMetric
          label="重试率"
          value={pc(m.retryRate)}
          sub={`重试成功率 ${pc(m.retrySuccRate, 1)}`}
          tip={
            <Tip
              formula="重试率 = 发起重试的请求数 ÷ 总请求数；重试成功率 = 重试后成功数 ÷ 重试请求数"
              warn="重试率 > 5% 说明上游不稳或超时阈值过紧"
            />
          }
        />
        <MiniMetric
          label="截断率"
          value={pc(m.truncRate)}
          sub="finish_reason = length"
          tip={
            <Tip
              formula="截断率 = 输出被 max_tokens 截断的成功请求 ÷ 成功请求数"
              sample="截断意味着用户未拿到完整答案，计入质量分惩罚"
              warn="> 10% 建议调大 max_tokens 或换长输出模型"
            />
          }
        />
        <MiniMetric
          label="首次失败率"
          value={pc(m.firstFailRate)}
          sub="不含重试后成功"
          tip={
            <Tip
              formula="首次失败率 = 首次请求即失败的请求数 ÷ 总请求数"
              sample="剔除重试掩盖，反映真实上游可用性"
              warn="> 3% 触发渠道降权"
            />
          }
        />
        <MiniMetric
          label="缓存命中率"
          value={pc(m.cacheHitRate, 1)}
          sub={`节省 ${yuan(m.cacheSaved)}`}
          tip={
            <Tip
              formula="缓存命中率 = 命中缓存的输入 Token ÷ 输入 Token 总量"
              sample="节省额按缓存输入 0.6 元 / 百万 Token 计价"
            />
          }
        />
      </MiniRow>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <SectionTitle text="错误分类分布" />
          <BarList items={board.errorCats} color={token.colorError} />
        </div>
        <div style={{ flex: 1.3, minWidth: 340 }}>
          <SectionTitle
            text="高频错误 Top"
            tip={<Tip formula="按错误码聚合窗口内失败次数，占错误比 = 该错误码次数 ÷ 失败总次数" />}
          />
          <Table
            rowKey="code"
            size="small"
            columns={errorCols}
            dataSource={board.topErrors}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionTitle
          text="异常区间明细"
          tip={
            <Tip
              formula="异常区间 = 区间成功率低于 EWMA(α=0.1) 滚动基线 3σ 以上，单边判定（仅下跌）"
              sample="基线由左向右递推，首个区间作初值，无流量区间不参与"
              warn="绝对阈值建议：P0 成功率 < 95%、P1 < 98%"
            />
          }
        />
        {anomalies.length ? (
          <Table<IntervalRow>
            rowKey="label"
            size="small"
            columns={anomalyCols}
            dataSource={anomalies.slice().sort((a, b) => a.sr - b.sr).slice(0, 8)}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <div style={{ padding: '12px 0' }}>
            <Text type="secondary">当前窗口内无异常区间（各区间成功率均未跌破 EWMA 滚动基线 −3σ）</Text>
          </div>
        )}
      </div>
    </BoardCard>
  )
}

/* ---------------- 配额进度条 ---------------- */

function QuotaCell({ used, limit }: { used: number; limit: number }) {
  const { token } = theme.useToken()
  const pct = limit > 0 ? (used / limit) * 100 : 0
  const color = pct >= 100 ? token.colorError : pct >= 90 ? token.colorWarning : token.colorPrimary
  return (
    <div style={{ minWidth: 118 }}>
      <div style={{ fontSize: 13 }}>{`${fmtNum(used)} / ${fmtNum(limit)}`}</div>
      <div style={{ height: 4, borderRadius: 2, background: token.colorFillQuaternary, margin: '4px 0 3px' }}>
        <i
          style={{
            display: 'block',
            height: '100%',
            width: `${Math.min(100, pct)}%`,
            borderRadius: 2,
            background: color,
          }}
        />
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {`${fmtNum(pct, 1)}%`}
      </Text>
    </div>
  )
}

/* ---------------- 区块六：渠道健康度与配额 ---------------- */

function HealthSection({ board }: { board: PerfBoard }) {
  const { token } = theme.useToken()
  const live = board.channels.filter((c) => c.metrics.hasData)
  const worst = live.slice().sort((a, b) => a.score - b.score)[0]
  const quotaRisky = board.channels.filter((c) => c.dailyProjPct > 90)
  const throttleWorst = live.slice().sort((a, b) => b.metrics.throttleRate - a.metrics.throttleRate)[0]
  const colorOf = (v: number) => (v >= 85 ? token.colorSuccess : v >= 70 ? token.colorWarning : token.colorError)
  const cols: ColumnsType<ChannelRow> = [
    { title: '渠道名称', dataIndex: 'channelName', width: 150, fixed: 'left', ellipsis: true },
    {
      title: '健康度',
      dataIndex: 'score',
      width: 104,
      render: (v: number, r) =>
        r.metrics.hasData ? (
          <span style={{ color: colorOf(v), fontSize: 16, fontWeight: 600 }}>{fmtNum(v, 1)}</span>
        ) : (
          <Tag>无流量</Tag>
        ),
    },
    {
      title: '分项（成功 / 延迟 / 限流 / 首失败）',
      key: 'parts',
      width: 232,
      render: (_: unknown, r) =>
        r.metrics.hasData ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {`${fmtNum(r.srScore, 1)} / ${fmtNum(r.latScore, 1)} / ${fmtNum(r.rlScore, 1)} / ${fmtNum(r.ffScore, 1)}`}
          </Text>
        ) : (
          EMPTY
        ),
    },
    {
      title: '请求成功率',
      key: 'sr',
      width: 108,
      render: (_: unknown, r) => (r.metrics.hasData ? pc(r.metrics.sr) : EMPTY),
    },
    {
      title: 'P95 延迟',
      key: 'p95',
      width: 104,
      render: (_: unknown, r) => (r.metrics.hasData ? sec(r.metrics.p95) : EMPTY),
    },
    {
      title: '限流率',
      key: 'rl',
      width: 96,
      render: (_: unknown, r) =>
        r.metrics.hasData ? (
          <span style={{ color: r.metrics.throttleRate > 2 ? token.colorError : undefined }}>{pc(r.metrics.throttleRate)}</span>
        ) : (
          EMPTY
        ),
    },
    {
      title: 'RPM 使用 / 限额',
      key: 'rpm',
      width: 148,
      render: (_: unknown, r) => <QuotaCell used={r.rpmUsed} limit={r.rpmLimit} />,
    },
    {
      title: 'TPM 使用 / 限额',
      key: 'tpm',
      width: 156,
      render: (_: unknown, r) => <QuotaCell used={r.tpmUsed} limit={r.tpmLimit} />,
    },
    {
      title: '日请求配额',
      key: 'daily',
      width: 156,
      render: (_: unknown, r) => <QuotaCell used={r.dailyReqUsed} limit={r.dailyReqLimit} />,
    },
    {
      title: '预计日终使用率',
      dataIndex: 'dailyProjPct',
      width: 148,
      render: (v: number, r) =>
        r.dailyReqLimit > 0 ? (
          <span style={{ color: v >= 100 ? token.colorError : v > 90 ? token.colorWarning : undefined, fontWeight: 600 }}>
            {`${fmtNum(v, 1)}%`}
          </span>
        ) : (
          EMPTY
        ),
    },
    {
      title: '当日成本',
      dataIndex: 'dailyCost',
      width: 110,
      render: (v: number) => yuan(v),
    },
    {
      title: '最低区间成功率',
      key: 'minsr',
      width: 178,
      render: (_: unknown, r) =>
        r.metrics.hasData ? (
          <div>
            <span style={{ color: r.minSr < 99 ? token.colorError : undefined, fontWeight: 600 }}>{pc(r.minSr)}</span>
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
              {r.minSrLabel}
            </Text>
          </div>
        ) : (
          EMPTY
        ),
    },
  ]
  return (
    <BoardCard
      title="渠道健康度与配额"
      desc="按渠道聚合当前窗口全部模型，限额取自渠道模型配置"
      tip={
        <Tip
          formula="健康度 = 成功率分 40 + 延迟分 25 + 限流分 20 + 首次失败分 15"
          sample="延迟分 = 25 × 基线 P95 ÷ 实际 P95，基线 P95 取各渠道 P95 中位数；限流分 = 20 × (1 − 限流率 × 20)；首次失败分 = 15 × (1 − 首次失败率 × 5)"
          warn="健康度 < 70 分触发 P2，并建议自动降权路由"
        />
      }
    >
      <MiniRow>
        <MiniMetric
          label="最低渠道健康度"
          value={worst ? `${fmtNum(worst.score, 1)} 分` : '—'}
          sub={worst ? worst.channelName : '当前筛选无数据'}
          tip={<Tip formula="健康度 = 40 + 25 + 20 + 15 四项之和" sample="取当前窗口内有流量渠道的最低分" />}
        />
        <MiniMetric
          label="配额风险渠道"
          value={`${quotaRisky.length} 个`}
          sub={quotaRisky.length ? quotaRisky.map((c) => c.channelName).join('、') : '预计日终使用率均 ≤ 90%'}
          tip={
            <Tip
              formula="预计日终使用率 = 当日累计请求 ÷ 日配额 ÷ 当日流量进度"
              sample="流量进度按全天曲线折算，随统计时刻推进逐步收敛为真实日终值"
              warn="> 90% 关注，≥ 100% 触发"
            />
          }
        />
        <MiniMetric
          label="限流最高渠道"
          value={throttleWorst ? pc(throttleWorst.metrics.throttleRate) : '—'}
          sub={throttleWorst ? throttleWorst.channelName : '—'}
          tip={<Tip formula="限流率 = 429 响应数 ÷ 该渠道总请求数" warn="> 2% 预警，> 5% 严重" />}
        />
        <MiniMetric
          label="渠道覆盖数"
          value={`${board.channels.length} 个`}
          sub={`有流量 ${live.length} 个`}
          tip={<Tip formula="窗口内出现在请求日志中的渠道数" sample="无流量渠道保留展示并标记为不适用" />}
        />
      </MiniRow>

      <Table<ChannelRow>
        rowKey="channelId"
        size="small"
        columns={cols}
        dataSource={board.channels}
        scroll={{ x: 'max-content' }}
        style={{ marginTop: 8 }}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
      />
    </BoardCard>
  )
}


/** 看板固定按 5 分钟区间聚合，不再对外提供粒度选择 */
const GRAN: Granularity = '5m'
/** 区间步长（毫秒）与单窗最长跨度：受数据层「单窗最多 MAX_WINDOW_POINTS 个区间」约束 */
const STEP_MS = GRAN_META[GRAN].stepSec * 1000
const MAX_WINDOW_MS = MAX_WINDOW_POINTS * STEP_MS

interface BoardQuery {
  channelId: string
  apiName: string
  modelName: string
  /** 自定义统计窗口；为空时统计最近 GRAN_META[GRAN].points 个已完成区间 */
  range: [Dayjs, Dayjs] | null
}

/** 下拉筛选用空串表示「全部」，与数据层的真值判断口径一致 */
const DEFAULT_QUERY: BoardQuery = { channelId: '', apiName: '', modelName: '', range: null }
const ALL_OPTION = { label: '全部', value: '' }

const REQUIREMENT_SECTIONS = [
  {
    label: '功能需求',
    items: [
      '「渠道统计与性能分析」页面的第二个 Tab，按《模型监控看板 — 指标定义与算法方案》落地时延、吞吐、质量、成本、系统健康五类指标。',
      '看板固定按 5 分钟区间聚合，支持渠道名称、API名称、模型名称与时间范围四项筛选，前三项均可选「全部」；点击搜索才刷新看板。',
      'API名称取自渠道商管理中该渠道的 API 配置（渠道模型关联的那一组，未关联时取启用中的第一组）；选定渠道后 API名称与模型名称选项随之收窄。',
      '时间范围不选时默认统计最近 72 个已完成区间（6 小时），可选任意区间，单窗最长 24 小时；起止时间对齐区间边界后统计。',
      '看板自上而下为：监控总览、趋势分析、时延分析、吞吐与并发、质量与错误、渠道健康度与配额六个区块。',
      '每个指标在标题悬浮层给出精确计算公式、采样与聚合口径、建议告警阈值。',
    ],
  },
  {
    label: '数据与口径',
    items: [
      '统计窗口起止均对齐区间边界，仅统计已完成的区间，进行中的当前区间不计入，避免尾部数据未齐导致指标虚低。',
      '指标以「计数 + 乘积和」保存，任意跨度的合并结果与按明细重算一致；百分位由 T-Digest 草图按请求数加权合并近似。',
      '恒等式校验：成功 + 六类错误 = 请求总数；排队 + 网络 + 预填充 + 解码 = 平均延迟；输入成本 + 输出成本 = 总成本；流式 + 非流式 = 全部请求。',
      '成本按渠道模型定价（¥ / 百万 Token）计算：成本 = Token 数 × 单价 ÷ 1,000,000。',
      '异常区间、渠道健康度与「查看性能」弹窗、模型性能明细（小时）同源，同筛选条件下数值一致。',
    ],
  },
]

/** 「性能分析」Tab 的需求点入口，供「渠道统计与性能分析」页面的 Tab 栏右侧复用 */
export function PerfRequirementDot() {
  return <RequirementDot title="性能分析需求" sections={REQUIREMENT_SECTIONS} />
}

export default function ModelPerfBoard() {
  const { token } = theme.useToken()
  const { channels } = useChannels()
  const { channelModels: items } = useChannelModels()
  const [draft, setDraft] = useState<BoardQuery>(DEFAULT_QUERY)
  const [applied, setApplied] = useState<BoardQuery>(DEFAULT_QUERY)

  const board = useMemo(
    () =>
      buildPerfBoard(channels, items, {
        gran: GRAN,
        channelId: applied.channelId || undefined,
        apiName: applied.apiName || undefined,
        modelName: applied.modelName || undefined,
        range: applied.range ? { from: applied.range[0].valueOf(), to: applied.range[1].valueOf() } : undefined,
      }),
    [channels, items, applied],
  )

  /** 渠道 × 模型 × API 的关联关系，用于级联收窄下拉选项 */
  const pairs = useMemo(
    () => items.map((it) => ({ channelId: it.channelId, modelName: it.modelName, apiName: apiNameOf(it, channels) })),
    [items, channels],
  )

  const channelOptions = useMemo(
    () => [ALL_OPTION, ...channels.map((c) => ({ label: c.name, value: c.id }))],
    [channels],
  )

  const apiOptions = useMemo(() => {
    const names: string[] = []
    pairs.forEach((p) => {
      if (draft.channelId && p.channelId !== draft.channelId) return
      if (p.apiName && !names.includes(p.apiName)) names.push(p.apiName)
    })
    return [ALL_OPTION, ...names.map((n) => ({ label: n, value: n }))]
  }, [pairs, draft.channelId])

  const modelOptions = useMemo(() => {
    const names: string[] = []
    pairs.forEach((p) => {
      if (draft.channelId && p.channelId !== draft.channelId) return
      if (draft.apiName && p.apiName !== draft.apiName) return
      if (!names.includes(p.modelName)) names.push(p.modelName)
    })
    return [ALL_OPTION, ...names.map((n) => ({ label: n, value: n }))]
  }, [pairs, draft.channelId, draft.apiName])

  const apiInScope = (apiName: string, channelId: string) =>
    pairs.some((p) => p.apiName === apiName && (!channelId || p.channelId === channelId))

  const modelInScope = (modelName: string, channelId: string, apiName: string) =>
    pairs.some(
      (p) =>
        p.modelName === modelName &&
        (!channelId || p.channelId === channelId) &&
        (!apiName || p.apiName === apiName),
    )

  /** 上级筛选变化后，下级已选值若不在新范围内则回到「全部」 */
  const onChannelChange = (channelId: string) => {
    const apiName = draft.apiName && apiInScope(draft.apiName, channelId) ? draft.apiName : ''
    const modelName =
      draft.modelName && modelInScope(draft.modelName, channelId, apiName) ? draft.modelName : ''
    setDraft({ ...draft, channelId, apiName, modelName })
  }

  const onApiChange = (apiName: string) => {
    const modelName =
      draft.modelName && modelInScope(draft.modelName, draft.channelId, apiName) ? draft.modelName : ''
    setDraft({ ...draft, apiName, modelName })
  }

  const onSearch = () => {
    if (draft.range) {
      const span = draft.range[1].valueOf() - draft.range[0].valueOf()
      if (span < STEP_MS) {
        message.error(`时间范围不足一个 ${GRAN_META[GRAN].label}区间，请重新选择`)
        return
      }
      if (span > MAX_WINDOW_MS) {
        message.error(`时间范围最长 ${MAX_WINDOW_MS / 3600000} 小时，请缩小后重新搜索`)
        return
      }
    }
    setApplied(draft)
  }

  const divider = (
    <Text type="secondary" style={{ fontSize: 12 }}>
      |
    </Text>
  )

  return (
    <div>
      <Card variant="borderless" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <SearchField label="渠道名称">
            <Select
              style={{ width: 180 }}
              showSearch
              optionFilterProp="label"
              value={draft.channelId}
              options={channelOptions}
              onChange={onChannelChange}
            />
          </SearchField>
          <SearchField label="API名称">
            <Select
              style={{ width: 200 }}
              showSearch
              optionFilterProp="label"
              value={draft.apiName}
              options={apiOptions}
              onChange={onApiChange}
            />
          </SearchField>
          <SearchField label="模型名称">
            <Select
              style={{ width: 220 }}
              showSearch
              optionFilterProp="label"
              value={draft.modelName}
              options={modelOptions}
              onChange={(v: string) => setDraft({ ...draft, modelName: v })}
            />
          </SearchField>
          <SearchField label="时间范围">
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: 360 }}
              value={draft.range}
              onChange={(v) => setDraft({ ...draft, range: v as [Dayjs, Dayjs] | null })}
              disabledDate={(d) => d.valueOf() > Date.now() || d.isBefore(dayjs().subtract(30, 'day'), 'day')}
              presets={[
                { label: '最近 1 小时', value: [dayjs().subtract(1, 'hour'), dayjs()] },
                { label: '最近 6 小时', value: [dayjs().subtract(6, 'hour'), dayjs()] },
                { label: '最近 24 小时', value: [dayjs().subtract(24, 'hour'), dayjs()] },
              ]}
            />
          </SearchField>
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setDraft(DEFAULT_QUERY)
                  setApplied(DEFAULT_QUERY)
                }}
              >
                重置
              </Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
                搜索
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      <div
        style={{
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 8,
          border: `1px solid ${token.colorSplit}`,
          background: token.colorFillQuaternary,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 12 }}>
          统计窗口：<Text strong style={{ fontSize: 12 }}>{board.windowLabel}</Text>
        </Text>
        {divider}
        <Text type="secondary" style={{ fontSize: 12 }}>
          采样 {board.points} 个 {GRAN_META[board.gran].label}区间（仅统计已完成区间 · {board.retention}）
        </Text>
        {divider}
        <Text type="secondary" style={{ fontSize: 12 }}>
          统计范围 {board.scopeLabel}
        </Text>
      </div>

      {board.hasData ? (
        <>
          <OverviewSection board={board} />
          <TrendSection board={board} />
          <LatencySection board={board} />
          <ThroughputSection board={board} />
          <QualitySection board={board} />
          <HealthSection board={board} />
        </>
      ) : (
        <Card variant="borderless" styles={{ body: { padding: 48 } }} style={{ marginBottom: 16, textAlign: 'center' }}>
          <Text type="secondary">当前筛选条件下窗口内无请求数据，请调整渠道名称、API名称、模型名称或时间范围后重新搜索</Text>
        </Card>
      )}
    </div>
  )
}
