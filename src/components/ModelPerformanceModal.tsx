import { useMemo } from 'react'
import { Button, Card, Descriptions, Modal, Space, Table, Tooltip, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ClockCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  HourglassOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { Channel, ChannelModelItem, PerfHourPoint, PerfHourStat } from '../types'
import {
  buildModelPerformance,
  channelModelPerf,
  latencyScale,
  PERF_NORMAL_RATE_THRESHOLD,
  PERF_STATUS_META,
  tokenRateMetrics,
} from '../perf'
import RequirementDot from './RequirementDot'

const { Text } = Typography

/** 档位视角：从模型详情「分档定价」的某个倍率档位进入时带入，用于说明这份性能属于哪个模型的哪一档倍率 */
export interface PerfTierContext {
  modelName: string
  tierName: string
  rate: number
}

interface Props {
  open: boolean
  model: ChannelModelItem | null
  channels: Channel[]
  onClose: () => void
  /** 点击「查看全部」跳转到「模型性能明细（小时）」页面，并把该渠道模型名称回填到搜索栏自动搜索 */
  onViewHourlyDetail?: (item: ChannelModelItem) => void
  /**
   * 传入即进入「档位视角」（模型详情 · 分档定价 · 查看性能）：
   * 顶部基础信息改为模型名称 / 模型档位 / 倍率，指标卡与两张趋势图统一按近 24 小时口径，
   * 且不再展示「24h性能 明细」表与跳转明细页的入口。
   * 不传时维持后台「渠道模型管理」原有形态。
   */
  tier?: PerfTierContext
}

const chartClamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * 两张趋势图（首 Token 延迟趋势 / 请求成功趋势）上下对照，横轴必须完全一致：
 * 同一小时时间序列、同一标签格式（带日期，避免 24 点跨两天时被读成同一天）、同一标签密度。
 * 抽成共享常量，防止后续迭代时两张图再次各写各的。
 */
const TREND_LABEL_EVERY = 3
const trendLabelOf = (p: PerfHourPoint) => p.fullLabel

/** 24h 明细行：小时桶自带的吞吐 / 延迟 / 命中率 / 成功率，外加按指标卡算法派生的单请求 TPS 与 TPOT */
type HourRow = PerfHourStat & { requestTps: number; tpot: number }

/** 内联 SVG 折线图（项目不引入图表库） */
function LineChart({
  points,
  yMax,
  yMin = 0,
  ticks,
  color,
  yFormat,
  labelOf,
  labelEvery,
  markAnomalies = false,
}: {
  points: PerfHourPoint[]
  yMax: number
  yMin?: number
  ticks: number[]
  color: string
  yFormat: (v: number) => string
  labelOf: (p: PerfHourPoint) => string
  labelEvery: number
  /** 异常小时是否用红色时段带 + 红点强调（请求成功趋势图使用） */
  markAnomalies?: boolean
}) {
  const { token } = theme.useToken()
  const W = 880
  const H = 250
  const padL = 62
  const padR = 18
  const padT = 14
  const padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const x = (i: number) => padL + (innerW * i) / Math.max(points.length - 1, 1)
  const y = (v: number) => padT + innerH * (1 - (chartClamp(v, yMin, yMax) - yMin) / (yMax - yMin))
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const slot = innerW / Math.max(points.length - 1, 1)
  const baseline = y(yMin)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke={token.colorSplit}
            strokeDasharray={t === yMin ? undefined : '4 4'}
          />
          <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={token.colorTextQuaternary}>
            {yFormat(t)}
          </text>
        </g>
      ))}
      {markAnomalies &&
        points.map((p, i) => {
          if (!p.anomaly) return null
          const left = Math.max(padL, x(i) - slot / 2)
          const right = Math.min(W - padR, x(i) + slot / 2)
          return (
            <rect
              key={`ab-${i}`}
              x={left}
              y={padT}
              width={right - left}
              height={innerH}
              fill={token.colorError}
              opacity={0.08}
            />
          )
        })}
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {markAnomalies &&
        points.map((p, i) =>
          p.anomaly ? (
            <line
              key={`ad-${i}`}
              x1={x(i)}
              x2={x(i)}
              y1={y(p.value)}
              y2={baseline}
              stroke={token.colorError}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.7}
            />
          ) : null,
        )}
      {points.map((p, i) => {
        const low = p.value < yMin + (yMax - yMin) * 0.25
        const anomalyFill = markAnomalies || low ? token.colorError : token.colorWarning
        return (
          <circle
            key={`${p.label}-${i}`}
            cx={x(i)}
            cy={y(p.value)}
            r={p.anomaly ? 4 : 2.6}
            fill={p.anomaly ? anomalyFill : color}
            stroke={p.anomaly && markAnomalies ? token.colorBgContainer : undefined}
            strokeWidth={p.anomaly && markAnomalies ? 1.5 : undefined}
          />
        )
      })}
      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text key={`lb-${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={token.colorTextQuaternary}>
            {labelOf(p)}
          </text>
        ) : null,
      )}
    </svg>
  )
}

function SectionTitle({
  icon,
  title,
  extra,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc?: string
  extra?: React.ReactNode
}) {
  const { token } = theme.useToken()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ color: token.colorTextQuaternary, fontSize: 15, marginTop: 2 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
          {desc && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {desc}
            </Text>
          )}
        </div>
      </div>
      {extra}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  footer,
  tip,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
  color?: string
  footer?: string
  /** 指标算法说明，鼠标悬浮问号图标展示 */
  tip?: string
}) {
  const { token } = theme.useToken()
  return (
    <Card variant="borderless" styles={{ body: { padding: '14px 16px' } }} style={{ flex: '1 1 160px' }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        <span style={{ marginRight: 4 }}>{icon}</span>
        {label}
        {tip && (
          <Tooltip title={tip} styles={{ root: { maxWidth: 320 } }}>
            <QuestionCircleOutlined
              style={{ marginLeft: 4, fontSize: 12, color: token.colorTextQuaternary }}
            />
          </Tooltip>
        )}
      </Text>
      <div style={{ fontSize: 24, fontWeight: 600, lineHeight: '34px', color }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </div>
      {footer && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {footer}
        </Text>
      )}
    </Card>
  )
}

/** 「N 起事件」悬浮层：逐条展示异常事件的具体时间与异常描述 */
function AnomalyTip({ events }: { events: (PerfHourPoint & { current: boolean })[] }) {
  return (
    <div style={{ maxWidth: 300 }}>
      {events.map((e, i) => (
        <div key={e.fullLabel} style={{ marginBottom: i === events.length - 1 ? 0 : 10 }}>
          <div style={{ fontWeight: 600 }}>{e.at ?? e.fullLabel}</div>
          <div>{`异常描述：${e.cause ?? '成功率骤降'}`}</div>
        </div>
      ))}
    </div>
  )
}

export default function ModelPerformanceModal({
  open,
  model,
  channels,
  onClose,
  onViewHourlyDetail,
  tier,
}: Props) {
  const { token } = theme.useToken()
  const perf = useMemo(() => (model ? buildModelPerformance(model, channels) : null), [model, channels])
  const summary = useMemo(() => (model ? channelModelPerf(model) : null), [model])
  /** 请求成功趋势图的异常小时明细：供「N 起事件」悬浮层展示事件时间与异常详情 */
  const anomalyEvents = useMemo(() => {
    if (!perf) return [] as (PerfHourPoint & { current: boolean })[]
    const last = perf.availabilityTrend.length - 1
    return perf.availabilityTrend.map((p, i) => ({ ...p, current: i === last })).filter((p) => p.anomaly)
  }, [perf])

  /**
   * 档位视角下的指标卡口径：只取近 24 小时的逐小时均值。
   * 与「分档定价」表里的延迟、吞吐同源（同一批小时桶），因此弹窗数值与打开它的那一行对得上；
   * 后台渠道模型视角仍用全部采集周期的均值（perf.*）。
   */
  const perf24 = useMemo(() => {
    const stats = perf?.hourlyStats ?? []
    const mean = (pick: (s: PerfHourStat) => number) =>
      stats.length ? stats.reduce((sum, s) => sum + pick(s), 0) / stats.length : 0
    return {
      tps: mean((s) => s.tps),
      avgLatency: mean((s) => s.avgLatency),
      avgFirstTokenLatency: mean((s) => s.firstTokenLatency),
      cacheHitRate: mean((s) => s.cacheHitRate),
      successRate: mean((s) => s.successRate),
      anomalyHours: stats.filter((s) => s.anomaly).length,
    }
  }, [perf])
  /** 指标卡取值：档位视角取近 24 小时均值，后台渠道模型视角取全部采集周期均值 */
  const throughput = tier ? perf24.tps : perf?.tps ?? 0
  const avgLatency = tier ? perf24.avgLatency : perf?.avgLatency ?? 0
  const ttft = tier ? perf24.avgFirstTokenLatency : perf?.avgFirstTokenLatency ?? 0
  const metric = {
    /** Token 吞吐量：窗口内所有并发请求的聚合速率 */
    throughput,
    /** TPS：单请求速率 = Token 吞吐量 ÷ 平均并发，因此恒低于吞吐量 */
    ...tokenRateMetrics(summary ?? {}, throughput, avgLatency, ttft),
    avgLatency,
    ttft,
    /** 缓存命中率：命中缓存的输入 Token ÷ 输入 Token 总量 */
    cacheHitRate: tier ? perf24.cacheHitRate : perf?.cacheHitRate ?? 0,
    successRate: tier ? perf24.successRate : perf?.successRate ?? 0,
    anomalyHours: tier ? perf24.anomalyHours : perf?.weekAnomalyHours ?? 0,
  }

  /** 逐小时明细行：TPS 与 TPOT 不在小时桶里，按指标卡同一算法现算，保证列值与卡片口径、明细页数值完全同源 */
  const hourlyRows: HourRow[] = useMemo(
    () =>
      (perf?.hourlyStats ?? []).map((s) => {
        const rate = tokenRateMetrics(summary ?? {}, s.tps, s.avgLatency, s.firstTokenLatency)
        return { ...s, requestTps: rate.tps, tpot: rate.tpot }
      }),
    [perf, summary],
  )

  /** 明细单元格：0 视为无数据统一显示「—」，保留位数与单位与上方指标卡逐项一致 */
  const hourCell = (v: number, digits: number, unit: string) =>
    v ? <Text>{`${v.toFixed(digits)} ${unit}`}</Text> : <Text type="secondary">—</Text>

  /** 逐小时明细列：与上方 7 张指标卡同名同口径，时间从当前时刻向历史回溯 24 小时 */
  const hourColumns: ColumnsType<HourRow> = [
    {
      title: '时间',
      dataIndex: 'fullLabel',
      width: 170,
      fixed: 'left',
      render: (v: string, r) => (
        <Text
          strong={r.current}
          style={{
            color: r.anomaly ? token.colorError : r.current ? token.colorPrimary : token.colorText,
          }}
        >
          {v}
          {r.current && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
              本小时
            </Text>
          )}
        </Text>
      ),
    },
    {
      title: 'TPS',
      dataIndex: 'requestTps',
      width: 110,
      render: (v: number) => hourCell(v, 1, 't/s'),
    },
    {
      title: '首 Token 延迟 (TTFT)',
      dataIndex: 'firstTokenLatency',
      width: 170,
      render: (v: number) => hourCell(v, 2, 's'),
    },
    {
      title: '平均延迟',
      dataIndex: 'avgLatency',
      width: 110,
      render: (v: number) => hourCell(v, 2, 's'),
    },
    {
      title: '每个 Token 生成时间 (TPOT)',
      dataIndex: 'tpot',
      width: 200,
      render: (v: number) => hourCell(v, 1, 'ms'),
    },
    {
      title: 'Token 吞吐量',
      dataIndex: 'tps',
      width: 140,
      render: (v: number) => hourCell(v, 1, 't/s'),
    },
    {
      title: '缓存命中率',
      dataIndex: 'cacheHitRate',
      width: 120,
      render: (v: number) => hourCell(v, 1, '%'),
    },
    {
      title: '请求成功率',
      dataIndex: 'successRate',
      width: 130,
      render: (v: number, r) => {
        if (!v) return <Text type="secondary">—</Text>
        const bad = r.anomaly || v < PERF_NORMAL_RATE_THRESHOLD
        return (
          <Text style={{ color: bad ? token.colorError : token.colorSuccess, fontWeight: 600 }}>
            {v.toFixed(2)}%
          </Text>
        )
      },
    },
  ]

  const scale = perf ? latencyScale(perf.firstTokenTrend) : { yMax: 100, ticks: [0, 20, 40, 60, 80, 100] }
  const idle = summary?.noTraffic
  const dash = (v: number, digits: number) => (v ? v.toFixed(digits) : '—')

  /** 弹窗顶部基础信息：渠道模型视角为渠道名称 / API 名称 / API 地址，档位视角为模型名称 / 模型档位 / 倍率，末尾统一带最新状态 */
  const channel = useMemo(
    () => (model ? channels.find((c) => c.id === model.channelId) ?? null : null),
    [model, channels],
  )
  const credential = useMemo(() => {
    if (!channel) return null
    const list = channel.apiCredentials ?? []
    return list.find((x) => x.id === model?.credentialId) ?? list[0] ?? null
  }, [channel, model])
  const statusColor = (tone: 'success' | 'danger') => (tone === 'success' ? token.colorSuccess : token.colorError)
  const abnormal = summary?.status === 'error'
  const empty = <Text type="secondary">—</Text>

  return (
    <Modal
      centered
      open={open && !!model && !!perf}
      width={960}
      destroyOnClose
      title={
        <Space size={6}>
          模型性能
          <RequirementDot
            title="模型性能 · 弹窗展示说明"
            sections={[
              {
                label: '弹窗展示',
                items: [
                  '顶部展示渠道名称 / API名称 / API地址（地址超长省略并悬浮显示完整值）/最新状态（取该模型最新一次访问的结果，正常为绿色、异常为红色）。',
                ],
              },
              {
                label: '指标算法',
                items: [
                  '统计数据统一取近 24 小时信息，算法如下：',
                  'TPS（t/s，保留 1 位小数）：成功请求输出的 Token 总量 ÷ 有效请求总耗时（秒）。',
                  '首 Token 延迟 TTFT（s，保留 2 位小数）：（首个 Token 到达时间 − 请求发送时间）之和 ÷ 成功请求数。',
                  '平均延迟（s，保留 2 位小数）：（响应完成时间 − 请求发送时间）之和 ÷ 成功请求数，即单请求总耗时。',
                  '每个 Token 生成时间 TPOT（ms，保留 1 位小数）：（总耗时 − TTFT）÷ 输出 Token 数。',
                  'Token 吞吐量（t/s，保留 1 位小数）：24h 总输出 Token 数 ÷ 24h×3600。',
                  '缓存命中率（%，保留 1 位小数）：命中缓存的输入 Token ÷ 输入 Token 总量。',
                  '请求成功率（%，保留 2 位小数）：成功请求数 ÷ 总请求数，卡底补充「N 个异常」；异常时数值显红、正常时显绿。',
                  '该周期无数据时，所有指标数值统一显示「—」。',
                ],
              },
              {
                label: '趋势图展示逻辑',
                items: [
                  '两张图横轴完全一致：最近 24 小时逐小时时间序列、同一标签格式（带日期，避免跨两天被读成同一天）、每 3 个刻度显示 1 个标签，便于上下对齐比对。',
                  '只有请求成功趋势图做异常标注：异常小时展示红色大圆点。',
                ],
              },
              {
                label: '24h性能 明细表',
                items: [
                  '倒序展示最近 24h 数据，列与上方指标卡一致（TPS、首 Token 延迟 TTFT、平均延迟、每个 Token 生成时间 TPOT、Token 吞吐量、缓存命中率、请求成功率），数值位数与单位同卡片逐项对应；点击查看全部，跳转到模型性能明细页面，并在搜索框中展示当前渠道和模型。',
                ],
              },
            ]}
          />
        </Space>
      }
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      styles={{ body: { maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 } }}
    >
      {perf && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: token.colorFillQuaternary,
              borderRadius: 8,
              padding: '10px 16px 4px',
            }}
          >
            <Descriptions size="small" column={2}>
              {tier ? (
                <>
                  <Descriptions.Item label="模型名称">{tier.modelName}</Descriptions.Item>
                  <Descriptions.Item label="模型档位">{tier.tierName}</Descriptions.Item>
                  <Descriptions.Item label="倍率">{`${tier.rate}x`}</Descriptions.Item>
                </>
              ) : (
                <>
                  <Descriptions.Item label="渠道名称">{channel?.name ?? empty}</Descriptions.Item>
                  <Descriptions.Item label="API名称">{credential?.apiName ?? empty}</Descriptions.Item>
                  <Descriptions.Item label="API地址">
                    {credential?.apiUrl ? (
                      <Tooltip title={credential.apiUrl}>
                        <span
                          style={{
                            display: 'inline-block',
                            maxWidth: 320,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'bottom',
                          }}
                        >
                          {credential.apiUrl}
                        </span>
                      </Tooltip>
                    ) : (
                      empty
                    )}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="最新状态">
                {summary ? (
                  <Space size={6}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: statusColor(PERF_STATUS_META[summary.status].tone),
                      }}
                    />
                    <Text style={{ color: statusColor(PERF_STATUS_META[summary.status].tone) }}>
                      {PERF_STATUS_META[summary.status].label}
                    </Text>
                  </Space>
                ) : (
                  empty
                )}
              </Descriptions.Item>
            </Descriptions>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <StatCard
              icon={<DashboardOutlined />}
              label="TPS"
              value={dash(metric.tps, 1)}
              unit={idle ? undefined : 't/s'}
              tip="算法：成功请求输出的 Token 总量 ÷ 有效请求总耗时（秒）"
            />
            <StatCard
              icon={<FieldTimeOutlined />}
              label="首 Token 延迟 (TTFT)"
              value={dash(metric.ttft, 2)}
              unit={idle ? undefined : 's'}
              tip="算法：（首个 Token 到达时间 − 请求发送时间）之和 ÷ 成功请求数"
            />
            <StatCard
              icon={<ClockCircleOutlined />}
              label="平均延迟"
              value={dash(metric.avgLatency, 2)}
              unit={idle ? undefined : 's'}
              tip="算法：（响应完成时间 − 请求发送时间）之和 ÷ 成功请求数，即单请求总耗时"
            />
            <StatCard
              icon={<HourglassOutlined />}
              label="每个 Token 生成时间 (TPOT)"
              value={dash(metric.tpot, 1)}
              unit={idle ? undefined : 'ms'}
              footer={idle || !metric.outTokens ? undefined : `平均输出 ${metric.outTokens} Token`}
              tip="算法：（总耗时 − TTFT）÷ 输出 Token 数"
            />
            <StatCard
              icon={<ThunderboltOutlined />}
              label="Token 吞吐量"
              value={dash(metric.throughput, 1)}
              unit={idle ? undefined : 't/s'}
              footer={idle || !summary?.concurrency ? undefined : `约 ${summary.concurrency} 路并发`}
              tip="算法：总输出 Token 数 ÷ 时间窗口"
            />
            <StatCard
              icon={<DatabaseOutlined />}
              label="缓存命中率"
              value={dash(metric.cacheHitRate, 1)}
              unit={idle ? undefined : '%'}
              tip="算法：命中缓存的输入 Token ÷ 输入 Token 总量"
            />
            <StatCard
              icon={<SafetyCertificateOutlined />}
              label="请求成功率"
              value={idle ? '—' : `${metric.successRate.toFixed(2)}%`}
              color={idle ? undefined : abnormal ? token.colorError : token.colorSuccess}
              footer={idle ? undefined : `${metric.anomalyHours} 个异常`}
              tip="算法：成功请求数 ÷ 总请求数"
            />
          </div>

          <Card variant="borderless" styles={{ body: { padding: 16 } }}>
            <SectionTitle
              icon={<FieldTimeOutlined />}
              title={tier ? '首 Token 延迟趋势（24h）' : '首 Token 延迟趋势'}
              desc={tier ? '近 24 小时逐小时首 Token 平均延迟' : '首 Token 平均延迟'}
            />
            <LineChart
              points={perf.firstTokenTrend}
              yMax={scale.yMax}
              ticks={scale.ticks}
              color={token.colorPrimary}
              yFormat={(v) => `${Math.round(v)} ms`}
              labelOf={trendLabelOf}
              labelEvery={TREND_LABEL_EVERY}
            />
          </Card>

          <Card variant="borderless" styles={{ body: { padding: 16 } }}>
            <SectionTitle
              icon={<SafetyCertificateOutlined />}
              title={tier ? '请求成功趋势（24h）' : '请求成功趋势'}
              desc={tier ? '近 24 小时逐小时请求成功率' : '请求成功率'}
              extra={
                perf.anomalyBuckets > 0 ? (
                  <Tooltip title={<AnomalyTip events={anomalyEvents} />}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: token.colorWarning,
                        fontWeight: 600,
                        cursor: 'default',
                      }}
                    >
                      <WarningOutlined />
                      {perf.anomalyBuckets} 起事件
                    </span>
                  </Tooltip>
                ) : (
                  undefined
                )
              }
            />
            <LineChart
              points={perf.availabilityTrend}
              yMax={100}
              yMin={40}
              ticks={[40, 50, 60, 70, 80, 90, 100]}
              color={token.colorSuccess}
              yFormat={(v) => `${Math.round(v)}%`}
              labelOf={trendLabelOf}
              labelEvery={TREND_LABEL_EVERY}
              markAnomalies
            />
            {perf.anomalyBuckets > 0 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      marginRight: 6,
                      borderRadius: 2,
                      background: token.colorError,
                      opacity: 0.24,
                    }}
                  />
                  异常小时（成功率骤降）
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      marginRight: 6,
                      borderRadius: '50%',
                      background: token.colorSuccess,
                    }}
                  />
                  正常小时
                </Text>
              </div>
            )}
          </Card>

          {!tier && (
            <Card variant="borderless" styles={{ body: { padding: 16 } }}>
              <SectionTitle
                icon={<ClockCircleOutlined />}
                title="24h性能 明细"
                desc="与上方指标卡同一套统计项的逐小时明细，更长周期请到明细页查看"
                extra={
                  <Button
                    type="link"
                    size="small"
                    onClick={() => model && onViewHourlyDetail?.(model)}
                  >
                    查看全部
                    <RightOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                  </Button>
                }
              />
              <Table<HourRow>
                rowKey="fullLabel"
                size="middle"
                pagination={false}
                dataSource={hourlyRows}
                columns={hourColumns}
                scroll={{ x: 'max-content', y: 380 }}
              />
            </Card>
          )}
        </div>
      )}
    </Modal>
  )
}
