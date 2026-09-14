import type {
  Channel,
  ChannelModelItem,
  ChannelModelPerf,
  HourlyPerfEvent,
  HourlyPerfRow,
  ModelPerformance,
  ModelPerfStatus,
  PerfHourPoint,
  PerfHourStat,
} from './types'

/** 模型最新状态的展示文案：只有正常、异常两种 */
export const PERF_STATUS_META: Record<ModelPerfStatus, { label: string; tone: 'success' | 'danger' }> = {
  normal: { label: '正常', tone: 'success' },
  error: { label: '异常', tone: 'danger' },
}

/** 判定阈值：24h 访问成功率达到该值视为正常，否则为异常 */
export const PERF_NORMAL_RATE_THRESHOLD = 99

/**
 * 比率着色阈值：成功率等比率类指标按三档着色 —— ≥ PERF_NORMAL_RATE_THRESHOLD 绿、
 * ≥ PERF_WARN_RATE_THRESHOLD 橙、其余红。渠道模型管理、模型性能弹窗、模型性能明细共用这一套口径。
 */
export const PERF_WARN_RATE_THRESHOLD = 80

/** 异常小时的错误类型候选（原型悬浮层「异常明细」，按种子确定性选取） */
const ANOMALY_CAUSES = ['上游服务 502 Bad Gateway', '网关请求超时 504', '访问被限流 429 Too Many Requests', '上游连接被重置']

/** 内置渠道模型的性能种子：modelCode → 性能概要 */
const seedPerfByModelCode: Record<string, ChannelModelPerf> = {
  'qwen-turbo': { status: 'normal', successRate24h: 99.82, latency: 1.24, throughput: 1284.6, anomalyBuckets: 2, cacheHit: 68.4 },
  'qwen-plus': { status: 'normal', successRate24h: 99.21, latency: 2.86, throughput: 642.4, anomalyBuckets: 1, cacheHit: 52.7 },
  'qwen-max-longcontext': { status: 'error', successRate24h: 97.45, latency: 8.72, throughput: 214.8, anomalyBuckets: 2, cacheHit: 21.3 },
  'text-embedding-v3': { status: 'error', successRate24h: 0, latency: 0, throughput: 0, anomalyBuckets: 0, noTraffic: true },
  'ti-a100-train': { status: 'normal', successRate24h: 99.95, latency: 42.5, throughput: 58.3, anomalyBuckets: 0, cacheHit: 8.6 },
  'qwen-vl-max': { status: 'error', successRate24h: 98.06, latency: 6.41, throughput: 176.2, anomalyBuckets: 2, cacheHit: 15.2 },
  'hunyuan-pro': { status: 'normal', successRate24h: 99.48, latency: 3.15, throughput: 486.9, anomalyBuckets: 1, cacheHit: 43.9 },
  'deepseek-v4-pro': { status: 'error', successRate24h: 95.73, latency: 16.19, throughput: 353.2, anomalyBuckets: 4, cacheHit: 31.6 },
  'deepseek-v4-flash': { status: 'normal', successRate24h: 99.62, latency: 1.86, throughput: 1024.7, anomalyBuckets: 0, cacheHit: 74.2 },
  'glm-5.3': { status: 'error', successRate24h: 96.88, latency: 11.34, throughput: 96.4, anomalyBuckets: 3, cacheHit: 26.8 },
}

/** 字符串哈希，保证同一行数据每次刷新得到同一组性能指标 */
function hashCode(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 由哈希派生 [0,1) 的伪随机数（mulberry32 单步） */
function rand01(seed: number, salt: number): number {
  let t = (seed + Math.imul(salt + 1, 0x6d2b79f5)) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** 新增行没有历史监控数据时，按 id 确定性派生一份，保证列表不出现空值 */
function derivePerf(item: ChannelModelItem): ChannelModelPerf {
  const h = hashCode(`${item.id}|${item.modelCode}`)
  const roll = h % 100
  // 约每 5 条派生 1 条异常；成功率决定状态，两者口径保持一致
  const successRate24h =
    roll < 78
      ? round(clamp(99.1 + rand01(h, 1) * 0.85, PERF_NORMAL_RATE_THRESHOLD, 100), 2)
      : round(clamp(92 + rand01(h, 1) * 6.6, 40, PERF_NORMAL_RATE_THRESHOLD - 0.01), 2)
  const status: ModelPerfStatus = successRate24h >= PERF_NORMAL_RATE_THRESHOLD ? 'normal' : 'error'
  const bad = status === 'error'
  return {
    status,
    successRate24h,
    latency: round((bad ? 7.4 : 1.6) + rand01(h, 2) * (bad ? 8.6 : 2.4), 2),
    throughput: round((bad ? 140 : 720) + rand01(h, 3) * 380, 1),
    anomalyBuckets: bad ? 2 + Math.floor(rand01(h, 4) * 4) : Math.floor(rand01(h, 4) * 2),
    cacheHit: round((bad ? 18 : 42) + rand01(h, 5) * 40, 1),
  }
}

/**
 * 首 Token 延迟占整段耗时的期望比例。逐小时在 28%~58% 之间波动（见 hourlyFirstTokenLatency），
 * 行级概要取其中值，保证「TTFT」与「首 Token 延迟趋势」图的均值口径一致。
 */
const TTFT_RATIO = 0.43

/**
 * 补齐 Token 生成口径（TTFT / 平均输出 Token 数 / TPOT / 平均并发）。
 * 种子表只给延迟与吞吐基线，派生指标统一在这里生成，避免逐条维护；
 * 口径自上而下：先定单流解码速度（TPOT），再还原单请求输出量与平均并发，
 * 保证「Token 吞吐量 = 单请求 TPS × 平均并发」在数量级上说得通。
 */
function withTokenMetrics(item: ChannelModelItem, p: ChannelModelPerf): ChannelModelPerf {
  if (p.noTraffic || !p.latency || !p.throughput) {
    return { ...p, ttft: 0, tpot: 0, outTokens: 0, concurrency: 0 }
  }
  const h = hashCode(`${item.id}|${item.modelCode}`)
  const bad = p.status === 'error'
  // 单流解码速度：正常通道 8~28 毫秒 / Token，异常通道 24~54 毫秒 / Token（> 50 判定生成偏慢）
  const tpot = round((bad ? 24 : 8) + rand01(h, 9) * (bad ? 30 : 20), 1)
  const ttft = round(p.latency * TTFT_RATIO, 2)
  // 单请求平均输出 Token 数 = 解码耗时（总耗时 − TTFT）÷ TPOT
  const outTokens = Math.round(clamp(((p.latency - ttft) * 1000) / tpot, 32, 2048))
  // 平均并发 = 聚合 Token 吞吐量 ÷ 单请求速率（输出 Token 数 ÷ 平均延迟）
  const concurrency = round(clamp((p.throughput * p.latency) / outTokens, 1, 48), 1)
  return { ...p, ttft, tpot, outTokens, concurrency }
}

/** 读取某条渠道模型的性能概要：已存字段 → 内置种子 → 按 id 确定性派生 */
export function channelModelPerf(item: ChannelModelItem): ChannelModelPerf {
  return withTokenMetrics(item, item.perf ?? seedPerfByModelCode[item.modelCode] ?? derivePerf(item))
}

/**
 * 由「窗口聚合 Token 吞吐量」还原单请求口径，保证悬浮层里的算法公式与展示数值严格自洽：
 * TPS（单请求速率）= Token 吞吐量 ÷ 平均并发；TPOT =（平均延迟 − TTFT）× 1000 ÷ 平均输出 Token 数。
 */
export function tokenRateMetrics(
  base: Pick<ChannelModelPerf, 'outTokens' | 'concurrency'>,
  windowThroughput: number,
  avgLatency: number,
  ttft: number,
): { tps: number; tpot: number; outTokens: number } {
  const concurrency = base.concurrency || 1
  const tps = windowThroughput / concurrency
  const outTokens = base.outTokens || Math.max(24, Math.round(tps * avgLatency))
  const tpot = outTokens > 0 ? round(Math.max(0, avgLatency - ttft) * 1000 / outTokens, 1) : 0
  return { tps, tpot, outTokens }
}

/** 纵轴刻度：返回一个「好看」的最大值与 5 等分刻度 */
function axisScale(max: number): { yMax: number; ticks: number[] } {
  const raw = (max * 1.25) / 5
  const safe = raw > 0 ? raw : 1
  const mag = 10 ** Math.floor(Math.log10(safe))
  const norm = safe / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 3 ? 3 : norm <= 5 ? 5 : 10) * mag
  return { yMax: step * 5, ticks: [0, 1, 2, 3, 4, 5].map((i) => round(step * i, 4)) }
}

/** 补零：1 位数字转 2 位字符串 */
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 小时刻度：从当前时刻向历史回溯 N 小时，数组最后一项即正在进行中的当前小时 */
function hourPoints(count = 24): { label: string; fullLabel: string }[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getTime() - (count - 1 - i) * 3600_000)
    const hh = String(d.getHours()).padStart(2, '0')
    return { label: `${hh}:00`, fullLabel: `${d.getMonth() + 1}月${d.getDate()}日 ${hh}时` }
  })
}

/** 把逐小时权重归一为均值 1，保证近 24 小时逐小时明细的均值能与该模型的 24h 基线指标对得上 */
function normalizeWeights(weights: number[]): number[] {
  const avg = weights.reduce((s, w) => s + w, 0) / (weights.length || 1)
  return avg > 0 ? weights.map((w) => w / avg) : weights.map(() => 0)
}

/** 首 Token 平均延迟：同一小时内（首个 Token 到达时间 − 请求发送时间）之和 ÷ 该小时请求数，量级取该小时平均会话时长的 28%~58% */
function hourlyFirstTokenLatency(avgLatency: number, roll: number): number {
  return avgLatency ? round(avgLatency * (0.28 + roll * 0.3), 2) : 0
}

/** 构造「查看性能」弹窗所需的全部数据 */
export function buildModelPerformance(item: ChannelModelItem, channels: Channel[]): ModelPerformance {
  const p = channelModelPerf(item)
  const creds = channels.find((c) => c.id === item.channelId)?.apiCredentials ?? []
  /** 无流量（如模型已下线、API 配置全部停用）：曲线与逐小时明细全部置空展示 */
  const noTraffic = !!p.noTraffic || (creds.length > 0 && creds.every((c) => c.status !== 'enabled'))
  const h = hashCode(`${item.id}|${item.modelCode}|grp`)
  /** 缓存命中率基线：种子表未给值（如历史存量数据）时按同一哈希派生，保证指标不出现空值 */
  const cacheHitBase = noTraffic ? 0 : clamp(p.cacheHit ?? round(40 + rand01(h, 5) * 45, 1), 0, 100)

  /** 最近 7 天的小时刻度：末尾 24 个即当前 24h 窗口（趋势图与弹窗明细），全量供「模型性能明细（小时）」页摊平 */
  const weekScale = hourPoints(7 * 24)
  const scale = weekScale.slice(-24)
  const spike = 6 + (h % 14)
  const buckets = clamp(p.anomalyBuckets, 0, 20)
  // 异常小时等距散布；步长与 24 可能不互质，撞车时向前挪一格，保证有限步内一定填满
  const anomalySet = new Set<number>()
  const step = 5 + (h % 4)
  let idx = buckets > 0 ? 23 : h % 24
  for (let k = 0; k < buckets; k += 1) {
    let guard = 0
    while (anomalySet.has(idx) && guard < 24) {
      idx = (idx + 1) % 24
      guard += 1
    }
    anomalySet.add(idx)
    idx = (idx + step) % 24
  }

  const latencyWeights = normalizeWeights(
    scale.map((_, i) => (noTraffic ? 0 : (0.55 + rand01(h, i + 41) * 0.85) * (i === spike ? 2.1 : 1))),
  )
  const tpsWeights = normalizeWeights(scale.map((_, i) => (noTraffic ? 0 : 0.45 + rand01(h, i + 11) * 1.1)))

  /** 逐小时整段响应耗时基线曲线（毫秒）：弹窗不再直接绘制，仅供 statsAsc 派生平均会话时长与首 Token 延迟 */
  const latencyTrend: PerfHourPoint[] = scale.map((s, i) => ({
    ...s,
    value: round(latencyWeights[i] * p.latency * 1000, 0),
    anomaly: false,
  }))

  const availabilityTrend: PerfHourPoint[] = scale.map((s, i) => {
    const bad = anomalySet.has(i)
    const depth = i === 23 && buckets > 0 ? 0.42 + rand01(h, i + 77) * 0.08 : 0.6 + rand01(h, i + 77) * 0.34
    const value =
      noTraffic ? 0 : bad ? round(clamp(p.successRate24h * depth, 40, 100), 1) : round(clamp(p.successRate24h + rand01(h, i + 61) * 0.5, 40, 100), 2)
    if (!bad || noTraffic) return { ...s, value, anomaly: false }
    /** 异常悬浮层明细：发生时刻在该小时内确定性取值、精确到秒；异常描述按种子选取 */
    const mm = String(Math.floor(rand01(h, i + 101) * 60)).padStart(2, '0')
    const ss = String(Math.floor(rand01(h, i + 111) * 60)).padStart(2, '0')
    return {
      ...s,
      value,
      anomaly: true,
      at: `${s.fullLabel}${mm}分${ss}秒`,
      cause: ANOMALY_CAUSES[Math.floor(rand01(h, i + 131) * ANOMALY_CAUSES.length)],
    }
  })

  /** 逐小时明细（时间正序）：与两张趋势图同源，展示时再倒序为「当前小时 → 历史」 */
  const statsAsc: PerfHourStat[] = scale.map((s, i) => {
    const avgLatency = round(latencyTrend[i].value / 1000, 2)
    return {
      label: s.label,
      fullLabel: s.fullLabel,
      current: i === scale.length - 1,
      tps: round(tpsWeights[i] * p.throughput, 1),
      avgLatency,
      firstTokenLatency: hourlyFirstTokenLatency(avgLatency, rand01(h, i + 421)),
      cacheHitRate: noTraffic ? 0 : round(clamp(cacheHitBase + (rand01(h, i + 431) - 0.5) * 8, 0, 100), 1),
      successRate: availabilityTrend[i].value,
      anomaly: availabilityTrend[i].anomaly,
    }
  })

  /** 首 Token 延迟趋势：直接取逐小时明细的 firstTokenLatency（换算为毫秒），与「首 Token 平均延迟」卡片、「模型性能明细（小时）」页同列完全同源 */
  const firstTokenTrend: PerfHourPoint[] = statsAsc.map((s) => ({
    label: s.label,
    fullLabel: s.fullLabel,
    value: Math.round(s.firstTokenLatency * 1000),
    anomaly: false,
  }))

  /** 7 天窗口里更早的 144 小时：与近 24h 同一模型种子派生，量级与正常/异常分布保持同一口径 */
  const olderStats: PerfHourStat[] = weekScale.slice(0, -24).map((s, i) => {
    if (noTraffic) {
      return { ...s, current: false, tps: 0, avgLatency: 0, firstTokenLatency: 0, cacheHitRate: 0, successRate: 0, anomaly: false }
    }
    const bad = rand01(h, i + 281) < 0.05
    const avgLatency = round(p.latency * (0.55 + rand01(h, i + 241) * 0.85), 2)
    return {
      ...s,
      current: false,
      tps: round(p.throughput * (0.45 + rand01(h, i + 211) * 1.1), 1),
      avgLatency,
      firstTokenLatency: hourlyFirstTokenLatency(avgLatency, rand01(h, i + 521)),
      cacheHitRate: round(clamp(cacheHitBase + (rand01(h, i + 531) - 0.5) * 8, 0, 100), 1),
      successRate: bad
        ? round(clamp(p.successRate24h * (0.6 + rand01(h, i + 287) * 0.34), 40, 100), 1)
        : round(clamp(p.successRate24h + rand01(h, i + 291) * 0.5, 40, 100), 2),
      anomaly: bad,
    }
  })

  /** 逐小时异常事件明细（时间正序，与 [...olderStats, ...statsAsc] 严格同序）：
   *  近 24h 直接复用趋势图上的 at/cause，保证与弹窗悬浮层逐字一致；更早的小时按同一算法合成。 */
  const weekEventsAsc: HourlyPerfEvent[][] = [
    ...olderStats.map((s, i) =>
      s.anomaly
        ? [
            {
              at: `${s.fullLabel}${pad2(Math.floor(rand01(h, i + 301) * 60))}分${pad2(
                Math.floor(rand01(h, i + 311) * 60),
              )}秒`,
              cause: ANOMALY_CAUSES[Math.floor(rand01(h, i + 331) * ANOMALY_CAUSES.length)],
            },
          ]
        : [],
    ),
    ...statsAsc.map((s, i) => {
      const point = availabilityTrend[i]
      return point.anomaly && point.at && point.cause ? [{ at: point.at, cause: point.cause }] : []
    }),
  ]

  /** 头部指标卡口径：全部已采集数据的逐小时均值，与「模型性能明细（小时）」页完全同源 */
  const allStatsAsc = [...olderStats, ...statsAsc]
  const meanOf = (pick: (stat: PerfHourStat) => number) =>
    allStatsAsc.reduce((sum, s) => sum + pick(s), 0) / (allStatsAsc.length || 1)

  return {
    tps: round(meanOf((s) => s.tps), 1),
    avgLatency: round(meanOf((s) => s.avgLatency), 2),
    avgFirstTokenLatency: round(meanOf((s) => s.firstTokenLatency), 2),
    cacheHitRate: round(meanOf((s) => s.cacheHitRate), 1),
    successRate: round(meanOf((s) => s.successRate), 2),
    anomalyBuckets: buckets,
    weekAnomalyHours: allStatsAsc.filter((s) => s.anomaly).length,
    hourlyStats: [...statsAsc].reverse(),
    longHourlyStats: [...olderStats, ...statsAsc].reverse(),
    weekEvents: [...weekEventsAsc].reverse(),
    firstTokenTrend,
    availabilityTrend,
  }
}

/** 「模型性能明细（小时）」页数据：把全部渠道模型最近 7 天的逐小时明细摊平成一张可搜索、可导出的明细表 */
export function buildHourlyPerfRows(channels: Channel[], items: ChannelModelItem[]): HourlyPerfRow[] {
  const now = new Date()
  const rows: HourlyPerfRow[] = []
  for (const item of items) {
    const perf = buildModelPerformance(item, channels)
    /** 行级平均并发与平均输出 Token 数：与「查看性能」弹窗同一份概要，用于把逐小时聚合吞吐还原为单请求口径 */
    const summary = channelModelPerf(item)
    const channelName = channels.find((c) => c.id === item.channelId)?.name ?? ''
    perf.longHourlyStats.forEach((s, j) => {
      const d = new Date(now.getTime() - j * 3600_000)
      /** 与弹窗指标卡完全同源的派生：TPS = 该小时吞吐 ÷ 平均并发，TPOT =（平均延迟 − TTFT）÷ 平均输出 Token 数 */
      const rate = tokenRateMetrics(summary, s.tps, s.avgLatency, s.firstTokenLatency)
      rows.push({
        key: `${item.id}|${s.fullLabel}`,
        collectedAt: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:00`,
        collectedTs: d.getTime(),
        channelId: item.channelId,
        channelName,
        modelName: item.modelName,
        events: perf.weekEvents[j] ?? [],
        /** 首 Token 平均延迟：与弹窗「首 Token 延迟 (TTFT)」卡片同源（同一个小时桶的 firstTokenLatency） */
        firstTokenLatency: s.firstTokenLatency,
        /** Token 吞吐量：该小时的窗口聚合速率（PerfHourStat.tps 即聚合吞吐） */
        throughput: s.tps,
        tps: round(rate.tps, 1),
        tpot: rate.tpot,
        /** 缓存命中率：与弹窗「缓存命中率」卡片同源（同一个小时桶的 cacheHitRate） */
        cacheHitRate: s.cacheHitRate,
        /** 平均延迟：完整响应耗时，与弹窗「平均延迟」卡片同源 */
        avgLatency: s.avgLatency,
        requestSuccessRate: s.successRate,
      })
    })
  }
  return rows.sort((a, b) => b.collectedTs - a.collectedTs || a.modelName.localeCompare(b.modelName))
}

/** 图表刻度复用：首 Token 延迟趋势的纵轴；全 0（如模型无流量）时给出固定量程，避免出现 0 ms / 1 ms 的退化刻度 */
export function latencyScale(points: PerfHourPoint[]): { yMax: number; ticks: number[] } {
  const max = Math.max(...points.map((p) => p.value))
  if (max < 1) return { yMax: 1000, ticks: [0, 200, 400, 600, 800, 1000] }
  return axisScale(max)
}
