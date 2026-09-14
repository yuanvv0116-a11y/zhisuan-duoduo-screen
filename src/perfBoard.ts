/**
 * 性能分析（原模型性能看板）· 指标计算层
 *
 * 口径来源：《模型监控看板 — 指标定义与算法方案》。本文件负责三件事：
 * 1) 按「聚合粒度 × 区间 × 渠道模型 × 请求类型」确定性派生原始明细（原型 mock，等价于原始请求日志的抽样聚合）；
 * 2) 用同一套累加器把明细聚合到 区间 / 窗口 / 渠道 / 模型 四个层级（跨区间可直接相加）；
 * 3) 由聚合结果计算全部指标、趋势序列、异常区间判定与渠道健康度。
 *
 * 所有指标都由同一批明细数字推导，因此「成功数 + 各类错误数 == 总请求数」
 * 「排队 + 网络 + 预填充 + 解码 == 总延迟」等恒等式在看板上天然成立。
 */
import type { Channel, ChannelModelItem } from './types'
import { channelModelPerf } from './perf'

export type Granularity = '1m' | '5m' | '1h' | '1d'

/** 请求类型只作为数据层内部的拆分维度（首 Token 延迟等指标仅对流式请求有定义），不作为看板筛选项 */
type PartKind = 'stream' | 'nostream'

/** 聚合粒度元数据：区间步长、区间数与原始数据保留周期 */
export const GRAN_META: Record<Granularity, { label: string; stepSec: number; points: number; retention: string }> = {
  '1m': { label: '1 分钟', stepSec: 60, points: 60, retention: '保留 30 天' },
  '5m': { label: '5 分钟', stepSec: 300, points: 72, retention: '保留 30 天' },
  '1h': { label: '1 小时', stepSec: 3600, points: 24, retention: '保留 1 年' },
  '1d': { label: '1 天', stepSec: 86400, points: 14, retention: '保留 3 年' },
}

/** 单个统计窗口最多包含的区间数（5 分钟 × 288 = 24 小时），限制趋势图采样点与窗口切片计算量 */
export const MAX_WINDOW_POINTS = 288

/* ------------------------------------------------------------------ 基础工具 */

function hashCode(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rand01(seed: number, salt: number): number {
  let t = (seed + Math.imul(salt + 2654435761 + Math.imul(salt, 0x27220a95), 0x6d2b79f5)) >>> 0
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

/** 日内流量曲线（24 点，均值约 1）：夜间低谷、上午与下午双高峰 */
const HOUR_PROFILE = [0.35, 0.22, 0.15, 0.12, 0.12, 0.16, 0.28, 0.5, 0.85, 1.15, 1.3, 1.25, 0.95, 1.05, 1.2, 1.25, 1.15, 1.05, 1.0, 1.05, 1.15, 1.1, 0.85, 0.55]
/** 周内曲线（按 getDay 索引，0 = 周日） */
const DAY_PROFILE = [0.78, 1.02, 1.05, 1.1, 1.08, 1.06, 0.86]
/** 全天曲线均值 / 周均值 / 平均负载系数：用于把日配额锚定到合理的「预计日终使用率」区间 */
const AVG_HOUR_SHAPE = HOUR_PROFILE.reduce((s, v) => s + v, 0) / HOUR_PROFILE.length
const AVG_DAY_SHAPE = DAY_PROFILE.reduce((s, v) => s + v, 0) / DAY_PROFILE.length
const AVG_LOAD = 0.5
/** 当日流量进度：截至给定时刻，按全天曲线应消耗的当日请求占比 */
function dayConsumeFraction(ms: number): number {
  const d = new Date(ms)
  const total = HOUR_PROFILE.reduce((s, v) => s + v, 0)
  let acc = 0
  for (let k = 0; k < d.getHours(); k += 1) acc += HOUR_PROFILE[k]
  acc += HOUR_PROFILE[d.getHours()] * (d.getMinutes() / 60 + d.getSeconds() / 3600)
  return clamp(acc / total, 0.02, 1)
}
/** 百分位相对均值的倍率（对数正态形态近似）：P50 / P90 / P95 / P99 */
const PCT_RATIO = [0.78, 1.6, 2.15, 3.4]

const HOUR_MS = 3600_000
const DAY_MS = 24 * HOUR_MS

export function fmtNum(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 10_000_000) return `${round(v / 10_000, 1).toLocaleString('zh-CN')} 万`
  return round(v, digits).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/* ------------------------------------------------------------- 模型静态参数 */

interface ModelConst {
  id: string
  modelName: string
  modelCode: string
  channelId: string
  channelName: string
  /** 关联的 API 名称（渠道下该模型使用的那组 API 配置） */
  apiName: string
  /** 容量吞吐（tokens/秒），取自渠道模型性能概要，与「查看性能」弹窗同源 */
  capacity: number
  /** 平均会话时长基线（秒） */
  latency: number
  /** 首 Token 延迟占平均会话时长的比例，与弹窗逐小时口径一致 */
  ttftRatio: number
  /** 正常区间成功率基线（百分比） */
  baseSr: number
  baseCache: number
  avgIn: number
  avgOut: number
  /** 每 Token 解码耗时（秒） */
  tpot: number
  /** 输入 / 输出单价（元 / 百万 Token），与「成本配置」一致 */
  inPrice: number
  outPrice: number
  rpmLimit: number
  tpmLimit: number
  dailyReqLimit: number
  /** 异常时段（绝对毫秒区间），与「查看性能」弹窗的异常小时同源 */
  episodes: { a: number; b: number }[]
  dead: boolean
}

/**
 * 解析渠道模型关联的 API 名称：优先取 credentialId 命中的那组 API 配置，
 * 未关联时按「启用中的第一组 → 第一组」兜底，与渠道商管理里 API 配置的展示顺序一致。
 */
export function apiNameOf(item: ChannelModelItem, channels: Channel[]): string {
  const creds = channels.find((c) => c.id === item.channelId)?.apiCredentials ?? []
  const hit = creds.find((cr) => cr.id === item.credentialId) ?? creds.find((cr) => cr.status === 'enabled') ?? creds[0]
  return hit?.apiName ?? ''
}

function buildModelConst(item: ChannelModelItem, channels: Channel[]): ModelConst {
  const p = channelModelPerf(item)
  const h = hashCode(`${item.id}|${item.modelCode}|board`)
  const channel = channels.find((c) => c.id === item.channelId)
  const dead = !!p.noTraffic || p.throughput <= 0
  const latency = dead ? 0 : p.latency
  const ttftRatio = 0.28 + rand01(h, 1) * 0.3
  const decodeMean = Math.max(0.05, latency * (1 - ttftRatio))
  // 单流解码速度由渠道吞吐上限派生（TPOT × 并发 ≈ 聚合吞吐），保证「输出长度 × 请求量」不超出容量
  const tpot = dead ? 0.02 : clamp(1 / (p.throughput * 0.15), 0.004, 0.045)
  const avgOut = dead ? 0 : Math.max(24, Math.round(decodeMean / tpot))
  const avgIn = Math.round(420 + rand01(h, 3) * 5200)
  const cost = item.costConfig
  const inPrice = cost?.inputPrice ?? round(0.6 + rand01(h, 4) * 22, 2)
  const outPrice = cost?.outputPrice ?? round(inPrice * (1.8 + rand01(h, 5) * 2.4), 2)
  const rpmBase = dead ? 0 : Math.max(2, Math.round((p.throughput * 60) / avgOut))
  const rpmLimit = Math.round(rpmBase * (1.25 + rand01(h, 7) * 1.15))
  const tpmLimit = Math.round(rpmBase * (avgIn + avgOut) * (1.3 + rand01(h, 8) * 1.2))
  // 日配额：锚定为「按平均速率跑满一天所需请求数」的 78%~120%，使预计日终使用率落在有区分度的区间
  const dailyReqLimit = Math.round((rpmBase * 1440 * AVG_HOUR_SHAPE * AVG_DAY_SHAPE * AVG_LOAD) / (0.78 + rand01(h, 9) * 0.42))
  const nowHour = Math.floor(Date.now() / HOUR_MS)
  const episodes: { a: number; b: number }[] = []
  const nBucket = dead ? 0 : p.anomalyBuckets
  for (let k = 0; k < nBucket; k += 1) {
    const offset = 1 + (hashCode(`${item.id}|ah|${k}`) % 23)
    const hourStart = (nowHour - offset) * HOUR_MS
    const m0 = 3 + Math.floor(rand01(h, 40 + k) * 42)
    const len = 4 + Math.floor(rand01(h, 60 + k) * 15)
    episodes.push({ a: hourStart + m0 * 60_000, b: hourStart + (m0 + len) * 60_000 })
  }
  return {
    id: item.id,
    modelName: item.modelName,
    modelCode: item.modelCode,
    channelId: item.channelId,
    channelName: channel?.name ?? item.channelId,
    apiName: apiNameOf(item, channels),
    capacity: p.throughput,
    latency,
    ttftRatio,
    baseSr: dead ? 0 : p.successRate24h,
    baseCache: dead ? 0 : p.cacheHit ?? 0,
    avgIn,
    avgOut,
    tpot,
    inPrice,
    outPrice,
    rpmLimit,
    tpmLimit,
    dailyReqLimit,
    episodes,
    dead,
  }
}

/** 区间 [t0,t1) 内与该模型异常时段的重叠比例（0~1） */
function overlapFraction(mc: ModelConst, t0: number, t1: number): number {
  if (!mc.episodes.length) return 0
  let mins = 0
  for (const ep of mc.episodes) {
    const a = Math.max(ep.a, t0)
    const b = Math.min(ep.b, t1)
    if (b > a) mins += (b - a) / 60_000
  }
  if (mins <= 0) return 0
  return clamp(mins / ((t1 - t0) / 60_000), 0, 1)
}

/* -------------------------------------------------------- 明细（单元格） */

/** 单元格：一个「区间 × 渠道模型 × 请求类型」的原始聚合明细（计数 + 各类乘积和） */
interface Cell {
  req: number
  fail: number
  ce: number
  rl: number
  se: number
  to: number
  cn: number
  cf: number
  ff: number
  rt: number
  rtf: number
  tr: number
  inTok: number
  outTok: number
  cacheTok: number
  slat: number
  sttft: number
  squ: number
  snet: number
  spre: number
  sdec: number
  sdecS: number
  outTokS: number
  reqS: number
  w50: number
  w90: number
  w95: number
  w99: number
  w99sq: number
  wt95: number
  costIn: number
  costOut: number
  waste: number
  outB: number[]
  inB: number[]
}

function emptyCell(): Cell {
  return {
    req: 0, fail: 0, ce: 0, rl: 0, se: 0, to: 0, cn: 0, cf: 0, ff: 0, rt: 0, rtf: 0, tr: 0,
    inTok: 0, outTok: 0, cacheTok: 0,
    slat: 0, sttft: 0, squ: 0, snet: 0, spre: 0, sdec: 0, sdecS: 0, outTokS: 0, reqS: 0,
    w50: 0, w90: 0, w95: 0, w99: 0, w99sq: 0, wt95: 0,
    costIn: 0, costOut: 0, waste: 0,
    outB: [0, 0, 0, 0, 0, 0],
    inB: [0, 0, 0, 0, 0],
  }
}

function mergeCell(a: Cell, b: Cell): Cell {
  return {
    req: a.req + b.req,
    fail: a.fail + b.fail,
    ce: a.ce + b.ce,
    rl: a.rl + b.rl,
    se: a.se + b.se,
    to: a.to + b.to,
    cn: a.cn + b.cn,
    cf: a.cf + b.cf,
    ff: a.ff + b.ff,
    rt: a.rt + b.rt,
    rtf: a.rtf + b.rtf,
    tr: a.tr + b.tr,
    inTok: a.inTok + b.inTok,
    outTok: a.outTok + b.outTok,
    cacheTok: a.cacheTok + b.cacheTok,
    slat: a.slat + b.slat,
    sttft: a.sttft + b.sttft,
    squ: a.squ + b.squ,
    snet: a.snet + b.snet,
    spre: a.spre + b.spre,
    sdec: a.sdec + b.sdec,
    sdecS: a.sdecS + b.sdecS,
    outTokS: a.outTokS + b.outTokS,
    reqS: a.reqS + b.reqS,
    w50: a.w50 + b.w50,
    w90: a.w90 + b.w90,
    w95: a.w95 + b.w95,
    w99: a.w99 + b.w99,
    w99sq: a.w99sq + b.w99sq,
    wt95: a.wt95 + b.wt95,
    costIn: a.costIn + b.costIn,
    costOut: a.costOut + b.costOut,
    waste: a.waste + b.waste,
    outB: a.outB.map((v, i) => v + b.outB[i]),
    inB: a.inB.map((v, i) => v + b.inB[i]),
  }
}

export const OUTPUT_LEN_BOUNDS = ['<100', '100-500', '500-1K', '1-2K', '2-4K', '4K+']
const OUTPUT_LEN_MID = [50, 280, 720, 1450, 2900, 5600]
export const INPUT_LEN_BOUNDS = ['<1K', '1-4K', '4-16K', '16-64K', '64K+']
const INPUT_LEN_MID = [500, 2300, 9000, 32_000, 100_000]

/** 按对数正态形态把请求数分配到长度区间（区间边界取文档建议的输入/输出长度分档） */
function distribute(total: number, midpoints: number[], mean: number, seed: number): number[] {
  const out = midpoints.map(() => 0)
  if (total <= 0 || mean <= 0) return out
  const w = midpoints.map((m) => Math.exp(-(((Math.log(m) - Math.log(mean)) ** 2) / (2 * 0.52 ** 2))))
  const sum = w.reduce((s, x) => s + x, 0) || 1
  let left = total
  for (let i = 0; i < out.length - 1; i += 1) {
    const v = Math.floor((total * w[i]) / sum + rand01(seed, 200 + i))
    out[i] = Math.min(left, Math.max(0, v))
    left -= out[i]
  }
  out[out.length - 1] = Math.max(0, left)
  return out
}

/** 模型内流式请求占比（确定性） */
function streamShare(mc: ModelConst): number {
  return clamp(0.4 + rand01(hashCode(`${mc.id}|kind`), 24), 0.2, 0.9)
}

/**
 * 最大余数法（Hamilton）整数分配。
 * 用于把窗口内的「失败总数」精确落到六类错误上：保证 Σ分类计数 === total，
 * 从而恒等式「成功 + 六类错误 = 请求总数」在任意聚合层级、任意切片下都成立
 * （逐类独立 Math.round 会让各类进位叠加，使合计超出 total）。
 * 只在最终聚合层调用一次，单元格与中间层保持浮点期望值，避免细粒度下的分布退化。
 */
function alloc(total: number, weights: number[]): number[] {
  const n = weights.length
  const out = new Array<number>(n).fill(0)
  const t = Math.max(0, Math.round(total))
  if (t === 0 || n === 0) return out
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0)
  const w = sum > 0 ? weights.map((x) => Math.max(0, x)) : new Array<number>(n).fill(1)
  const norm = sum > 0 ? sum : n
  let left = t
  const frac: { i: number; f: number }[] = []
  for (let i = 0; i < n; i += 1) {
    const raw = (t * w[i]) / norm
    const floor = Math.floor(raw)
    out[i] = floor
    left -= floor
    frac.push({ i, f: raw - floor })
  }
  frac.sort((a, b) => b.f - a.f)
  for (let k = 0; k < left; k += 1) out[frac[k % n].i] += 1
  return out
}

/**
 * 生成一个「区间 × 模型 × 流式/非流式」单元格。
 * 首 Token 延迟、解码耗时、TPOT 只对 stream=true 的请求有定义，因此这些字段只在流式单元格里累计。
 */
function cellFor(mc: ModelConst, t0: number, t1: number, kind: PartKind): Cell {
  const c = emptyCell()
  if (mc.dead) return c
  const stepSec = Math.max(1, (t1 - t0) / 1000)
  const d0 = new Date(t0)
  const h = hashCode(`${mc.id}|${mc.modelCode}|${Math.round(t0 / 1000)}`)
  // 日级抖动与负载系数按「模型 × 自然日」取常数：保证日内流量严格按 HOUR_PROFILE 分布，
  // 使「当日累计 ÷ 曲线进度」折算出的预计日终使用率在任何统计粒度下都自洽
  const hd = hashCode(`${mc.id}|${mc.modelCode}|${Math.floor(t0 / DAY_MS)}`)
  const shape = HOUR_PROFILE[d0.getHours()] * DAY_PROFILE[d0.getDay()] * (0.86 + rand01(hd, 10) * 0.3)
  // 渠道负载系数：全天平均占用容量约四成，高峰时段接近饱和但不越界
  const load = 0.38 + rand01(hd, 11) * 0.24
  const rpm = mc.avgOut > 0 ? (mc.capacity * 60) / mc.avgOut : 0
  const reqAll = Math.max(0, Math.round(rpm * shape * load * (stepSec / 60)))
  if (reqAll === 0) return c

  const f = overlapFraction(mc, t0, t1)
  const srNorm = clamp(mc.baseSr - 0.05 + rand01(h, 12) * 0.18, 50, 100)
  const srBad = clamp(mc.baseSr - (3.5 + rand01(h, 13) * 9.5), 78, 99.5)
  const sr = srNorm * (1 - f) + srBad * f
  const successAll = clamp(Math.round((reqAll * sr) / 100), 0, reqAll)
  const failAll = reqAll - successAll

  // 错误分类：正常时段以客户端参数错误与内容过滤为主，异常时段以限流 / 5xx / 超时 / 连接重置为主
  const wCe = 0.42 * (1 - f) + 0.04 * f
  const wCf = 0.1 * (1 - f) + 0.02 * f
  const wRl = 0.2 * (1 - f) + 0.42 * f
  const wSe = 0.1 * (1 - f) + 0.26 * f
  const wTo = 0.08 * (1 - f) + 0.2 * f
  const wCn = 0.1 * (1 - f) + 0.06 * f
  // 单元格层保留浮点期望值（Σ = failAll）：若在单元格层就整数化，
  // 分钟级每格失败数≈1 时会被最大权重类吞掉，导致细粒度下错误分布退化成单一类别
  const wSum = wCe + wCf + wRl + wSe + wCn + wTo
  const cat = (w: number) => (failAll * w) / wSum
  const ce = cat(wCe)
  const cf = cat(wCf)
  const rl = cat(wRl)
  const se = cat(wSe)
  const cn = cat(wCn)
  const to = cat(wTo)

  // 重试：只对首次失败的请求发起；首次失败数 ≥ 最终失败数
  const rr = 0.7
  const rtfRate = clamp(0.3 + rand01(h, 14) * 0.25 + f * 0.2, 0, 0.9)
  const ff = clamp(Math.round(failAll / Math.max(0.2, 1 - rr * (1 - rtfRate))), failAll, reqAll)
  const rt = Math.round(ff * rr)
  const rtf = clamp(failAll - ff + rt, 0, rt)

  // Token 与缓存
  const inTokAll = reqAll * mc.avgIn * (0.85 + rand01(h, 15) * 0.32)
  const outTokAll = successAll * mc.avgOut * (0.85 + rand01(h, 16) * 0.34)
  const cacheRate = clamp(mc.baseCache * (0.85 + rand01(h, 17) * 0.3), 0, 96)
  const trunc = Math.round(successAll * (0.004 + rand01(h, 18) * 0.03 + f * 0.02))

  // 延迟分解：排队 + 网络 + 预填充 = 首 Token 延迟；解码 = 总延迟 − 首 Token 延迟
  const latMul = 1 * (1 - f) + (1.55 + rand01(h, 19) * 1.35) * f
  const meanLatS = mc.latency * (0.9 + rand01(h, 20) * 0.2) * latMul
  const ttftMean = meanLatS * (mc.ttftRatio * (0.92 + rand01(h, 21) * 0.16))
  const queueMean = Math.min(ttftMean * 0.22, meanLatS * (0.02 + rand01(h, 22) * 0.05) * (1 + f * 2.4))
  const networkMean = Math.min(Math.max(0, ttftMean * 0.3 - queueMean), (0.03 + rand01(h, 23) * 0.035) * 2)
  const prefillMean = Math.max(0, ttftMean - queueMean - networkMean)
  const decodeMean = Math.max(0, meanLatS - ttftMean)

  // 百分位（乘积和形式保存，合并时按请求数加权，等价于 T-Digest 合并的原型近似）
  const p50 = meanLatS * Math.min(PCT_RATIO[0] * (0.95 + rand01(h, 30) * 0.12), 0.98)
  const p90 = meanLatS * PCT_RATIO[1] * (0.95 + rand01(h, 31) * 0.12)
  const p95 = meanLatS * PCT_RATIO[2] * (0.95 + rand01(h, 32) * 0.12)
  const p99 = Math.max(p95 * 1.05, meanLatS * PCT_RATIO[3] * (0.95 + rand01(h, 33) * 0.12))

  const full = emptyCell()
  full.req = reqAll
  full.fail = failAll
  full.ce = ce
  full.cf = cf
  full.rl = rl
  full.se = se
  full.cn = cn
  full.to = to
  full.ff = ff
  full.rt = rt
  full.rtf = rtf
  full.tr = trunc
  full.inTok = Math.round(inTokAll)
  full.outTok = Math.round(outTokAll)
  full.cacheTok = Math.round((inTokAll * cacheRate) / 100)
  full.squ = reqAll * queueMean
  full.snet = reqAll * networkMean
  full.spre = reqAll * prefillMean
  full.sdec = successAll * decodeMean
  full.slat = full.squ + full.snet + full.spre + full.sdec
  full.sttft = reqAll * ttftMean
  full.w50 = p50 * reqAll
  full.w90 = p90 * reqAll
  full.w95 = p95 * reqAll
  full.w99 = p99 * reqAll
  full.w99sq = p99 * p99 * reqAll
  full.wt95 = ttftMean * 1.9 * reqAll
  full.costIn = (full.inTok * mc.inPrice) / 1_000_000
  full.costOut = (full.outTok * mc.outPrice) / 1_000_000
  full.waste = (failAll * (mc.avgIn * mc.inPrice + 0.35 * mc.avgOut * mc.outPrice)) / 1_000_000
  full.outB = distribute(reqAll, OUTPUT_LEN_MID, mc.avgOut, h)
  full.inB = distribute(reqAll, INPUT_LEN_MID, mc.avgIn, h)

  const share = streamShare(mc)
  const ratio = kind === 'stream' ? share : 1 - share
  const keep = (v: number) => v * ratio
  const part = emptyCell()
  part.req = Math.round(keep(full.req))
  part.fail = Math.min(part.req, Math.round(keep(full.fail)))
  const catTotal = full.ce + full.cf + full.rl + full.se + full.cn + full.to
  const shareCat = (v: number) => (catTotal > 0 ? (part.fail * v) / catTotal : 0)
  part.ce = shareCat(full.ce)
  part.cf = shareCat(full.cf)
  part.rl = shareCat(full.rl)
  part.se = shareCat(full.se)
  part.cn = shareCat(full.cn)
  part.to = shareCat(full.to)
  part.ff = Math.min(part.req, Math.round(keep(full.ff)))
  part.rt = Math.min(part.ff, Math.round(keep(full.rt)))
  part.rtf = clamp(part.fail - part.ff + part.rt, 0, part.rt)
  part.tr = Math.round(keep(full.tr))
  part.inTok = Math.round(keep(full.inTok))
  part.outTok = Math.round(keep(full.outTok))
  part.cacheTok = Math.min(part.inTok, Math.round(keep(full.cacheTok)))
  part.squ = keep(full.squ)
  part.snet = keep(full.snet)
  part.spre = keep(full.spre)
  part.sdec = keep(full.sdec)
  part.slat = part.squ + part.snet + part.spre + part.sdec
  part.w50 = keep(full.w50)
  part.w90 = keep(full.w90)
  part.w95 = keep(full.w95)
  part.w99 = keep(full.w99)
  part.w99sq = keep(full.w99sq)
  part.costIn = keep(full.costIn)
  part.costOut = keep(full.costOut)
  part.waste = keep(full.waste)
  part.outB = full.outB.map(keep)
  part.inB = full.inB.map(keep)
  if (kind === 'stream') {
    part.reqS = part.req
    part.sttft = keep(full.sttft)
    part.wt95 = keep(full.wt95)
    part.sdecS = part.sdec
    part.outTokS = part.outTok
  }
  return part
}

/** 一个区间的单元格 = 流式 + 非流式两部分合并，流式部分单独提供首 Token 延迟等指标 */
function cellsOf(mc: ModelConst, t0: number, t1: number): Cell {
  return mergeCell(cellFor(mc, t0, t1, 'stream'), cellFor(mc, t0, t1, 'nostream'))
}

/* --------------------------------------------------------------- 累加器 */

const ACC_KEYS = [
  'req', 'fail', 'ce', 'rl', 'se', 'to', 'cn', 'cf', 'ff', 'rt', 'rtf', 'tr',
  'inTok', 'outTok', 'cacheTok', 'slat', 'sttft', 'squ', 'snet', 'spre', 'sdec', 'sdecS', 'outTokS', 'reqS',
  'w50', 'w90', 'w95', 'w99', 'w99sq', 'wt95', 'costIn', 'costOut', 'waste',
] as const

type AccKey = (typeof ACC_KEYS)[number]

export interface Acc {
  req: number
  fail: number
  ce: number
  rl: number
  se: number
  to: number
  cn: number
  cf: number
  ff: number
  rt: number
  rtf: number
  tr: number
  inTok: number
  outTok: number
  cacheTok: number
  slat: number
  sttft: number
  squ: number
  snet: number
  spre: number
  sdec: number
  sdecS: number
  outTokS: number
  reqS: number
  w50: number
  w90: number
  w95: number
  w99: number
  w99sq: number
  wt95: number
  costIn: number
  costOut: number
  waste: number
  outB: number[]
  inB: number[]
}

function newAcc(): Acc {
  return {
    req: 0, fail: 0, ce: 0, rl: 0, se: 0, to: 0, cn: 0, cf: 0, ff: 0, rt: 0, rtf: 0, tr: 0,
    inTok: 0, outTok: 0, cacheTok: 0,
    slat: 0, sttft: 0, squ: 0, snet: 0, spre: 0, sdec: 0, sdecS: 0, outTokS: 0, reqS: 0,
    w50: 0, w90: 0, w95: 0, w99: 0, w99sq: 0, wt95: 0,
    costIn: 0, costOut: 0, waste: 0,
    outB: [0, 0, 0, 0, 0, 0],
    inB: [0, 0, 0, 0, 0],
  }
}

function addInto(dst: Acc, c: Cell): void {
  for (const k of ACC_KEYS) dst[k] += c[k]
  for (let i = 0; i < 6; i += 1) dst.outB[i] += c.outB[i]
  for (let i = 0; i < 5; i += 1) dst.inB[i] += c.inB[i]
}

/** 累加器合并：跨区间直接相加，等价于把 1 分钟原始计数聚合到更粗粒度 */
function mergeAccInto(dst: Acc, src: Acc): void {
  for (const k of ACC_KEYS) dst[k] += src[k]
  for (let i = 0; i < 6; i += 1) dst.outB[i] += src.outB[i]
  for (let i = 0; i < 5; i += 1) dst.inB[i] += src.inB[i]
}

/* --------------------------------------------------------------- 指标 */

export interface Metrics {
  req: number
  /** 请求成功率（含 4xx 口径） */
  sr: number
  /** 请求成功率（剔除客户端错误口径） */
  srExcl: number
  qps: number
  rpm: number
  tokenTps: number
  inTps: number
  concurrency: number
  queueLen: number
  waitMs: number
  meanLat: number
  p50: number
  p90: number
  p95: number
  p99: number
  p99cv: number
  ttftMean: number
  ttftP95: number
  tpot: number
  queue: number
  network: number
  prefill: number
  decode: number
  timeoutRate: number
  throttleRate: number
  retryRate: number
  retrySuccRate: number
  truncRate: number
  firstFailRate: number
  inTok: number
  outTok: number
  cacheHitRate: number
  cacheSaved: number
  cost: number
  costIn: number
  costOut: number
  avgCost: number
  costPer1k: number
  tokensPerYuan: number
  wasteCost: number
  wasteRate: number
  hasStream: boolean
  hasData: boolean
}

/** 由百分位锚点构造分段线性 CDF：反推超时阈值之后的尾部占比 */
function cdfAt(p: { mean: number; p50: number; p90: number; p95: number; p99: number }, x: number): number {
  const pts: [number, number][] = [
    [0, 0],
    [p.mean * 0.4, 0.2],
    [p.p50, 0.5],
    [p.p90, 0.9],
    [p.p95, 0.95],
    [p.p99, 0.99],
    [Math.max(p.p99 * 1.35, p.mean * 6), 0.9995],
  ]
  if (x <= 0) return 0
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (x <= x1) return x1 <= x0 ? y1 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 1
}

function finalize(a: Acc, windowSec: number): Metrics {
  const hasData = a.req > 0
  const r = (v: number, d: number) => (hasData && Number.isFinite(v) ? round(v, d) : 0)
  const meanLat = hasData ? a.slat / a.req : 0
  const anchors = {
    mean: meanLat,
    p50: hasData ? a.w50 / a.req : 0,
    p90: hasData ? a.w90 / a.req : 0,
    p95: hasData ? a.w95 / a.req : 0,
    p99: hasData ? a.w99 / a.req : 0,
  }
  const p50 = Math.min(anchors.p50, meanLat)
  const p90 = Math.max(p50, anchors.p90)
  const p95 = Math.max(p90, anchors.p95)
  const p99 = Math.max(p95, anchors.p99)
  const pct = { mean: meanLat, p50, p90, p95, p99 }
  const eP99 = anchors.p99
  const varP99 = hasData ? Math.max(0, a.w99sq / a.req - eP99 * eP99) : 0
  const hasStream = a.reqS > 0
  const success = a.req - a.fail
  const ttftMean = hasStream ? a.sttft / a.reqS : 0
  const cost = a.costIn + a.costOut
  const totalTok = a.inTok + a.outTok
  return {
    req: a.req,
    sr: r((success / Math.max(1, a.req)) * 100, 2),
    srExcl: r(((success + a.ce + a.cf) / Math.max(1, a.req)) * 100, 2),
    qps: r(a.req / windowSec, 2),
    rpm: r((a.req / windowSec) * 60, 1),
    tokenTps: r(a.outTok / windowSec, 1),
    inTps: r(a.inTok / windowSec, 1),
    concurrency: r(a.slat / windowSec, 1),
    queueLen: r(a.squ / windowSec, 2),
    waitMs: r((a.squ / Math.max(1, a.req)) * 1000, 1),
    meanLat: r(meanLat, 2),
    p50: r(p50, 2),
    p90: r(p90, 2),
    p95: r(p95, 2),
    p99: r(p99, 2),
    p99cv: r(eP99 > 0 ? Math.sqrt(varP99) / eP99 : 0, 3),
    ttftMean: r(ttftMean, 2),
    ttftP95: r(hasStream ? a.wt95 / a.reqS : 0, 2),
    tpot: r(hasStream && a.outTokS > 0 ? a.sdecS / a.outTokS : 0, 4),
    queue: r(a.squ / Math.max(1, a.req), 2),
    network: r(a.snet / Math.max(1, a.req), 2),
    prefill: r(a.spre / Math.max(1, a.req), 2),
    decode: r(a.sdec / Math.max(1, a.req), 2),
    timeoutRate: r(clamp(1 - cdfAt(pct, 60), 0, 1) * 100, 2),
    throttleRate: r((a.rl / Math.max(1, a.req)) * 100, 2),
    retryRate: r((a.rt / Math.max(1, a.req)) * 100, 2),
    retrySuccRate: r(a.rt > 0 ? ((a.rt - a.rtf) / a.rt) * 100 : 0, 1),
    truncRate: r(success > 0 ? (a.tr / success) * 100 : 0, 2),
    firstFailRate: r((a.ff / Math.max(1, a.req)) * 100, 2),
    inTok: a.inTok,
    outTok: a.outTok,
    cacheHitRate: r(a.inTok > 0 ? (a.cacheTok / a.inTok) * 100 : 0, 1),
    cacheSaved: r((a.cacheTok * 0.6) / 1_000_000, 2),
    cost: r(cost, 2),
    costIn: r(a.costIn, 2),
    costOut: r(a.costOut, 2),
    avgCost: r((cost / Math.max(1, a.req)) * 1000, 3),
    costPer1k: r(totalTok > 0 ? (cost / totalTok) * 1000 : 0, 3),
    tokensPerYuan: r(cost > 0 ? a.outTok / cost : 0, 0),
    wasteCost: r(a.waste, 2),
    wasteRate: r(cost > 0 ? (a.waste / cost) * 100 : 0, 1),
    hasStream,
    hasData,
  }
}

/* ----------------------------------------------------------- 区间刻度 */

export interface Bucket {
  index: number
  from: number
  to: number
  label: string
  fullLabel: string
}

/** 区间边界的完整时间文案（月日 + 时分），左闭右开区间两端都用同一格式 */
function fullLabelOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 以 endAt 为右端点向前取 N 个「已完成」区间，按时间正序；endAt 缺省时即紧邻当前时刻的区间右端 */
export function bucketsOf(gran: Granularity, points: number = GRAN_META[gran].points, endAt?: number): Bucket[] {
  const step = GRAN_META[gran].stepSec * 1000
  const end = endAt ?? Math.floor(Date.now() / step) * step
  return Array.from({ length: points }, (_, i) => {
    const from = end - (points - i) * step
    const to = from + step
    const d = new Date(from)
    const short = gran === '1d' ? `${d.getMonth() + 1}/${d.getDate()}` : gran === '1h' ? `${pad(d.getHours())}:00` : `${pad(d.getHours())}:${pad(d.getMinutes())}`
    return {
      index: i,
      from,
      to,
      label: short,
      fullLabel: fullLabelOf(from),
    }
  })
}

/** 任意绝对时间窗口的累加器（切片步长不超过展示粒度，保证窗口可加） */
function rangeAcc(mcs: ModelConst[], gran: Granularity, fromMs: number, toMs: number): Acc {
  const acc = newAcc()
  const stepSec = Math.min(GRAN_META[gran].stepSec, 900)
  const step = stepSec * 1000
  for (let t = fromMs; t < toMs; t += step) {
    const to = Math.min(t + step, toMs)
    for (const mc of mcs) addInto(acc, cellsOf(mc, t, to))
  }
  return acc
}

/* --------------------------------------------------------- 看板数据结构 */

export interface IntervalRow extends Metrics {
  label: string
  fullLabel: string
  /** 该区间成功率被 EWMA(α=0.1, 3σ) 单边检测命中（仅看低于滚动基线的下跌） */
  anomalous: boolean
}

export interface ChannelRow {
  channelId: string
  channelName: string
  metrics: Metrics
  score: number
  srScore: number
  latScore: number
  rlScore: number
  ffScore: number
  baselineP95: number
  rpmLimit: number
  tpmLimit: number
  dailyReqLimit: number
  rpmUsed: number
  tpmUsed: number
  dailyReqUsed: number
  /** 预计日终配额使用率 = 当日累计 ÷ 日配额 ÷ 当日流量进度 */
  dailyProjPct: number
  dailyCost: number
  minSr: number
  minSrLabel: string
}

export interface TrendPoint {
  label: string
  fullLabel: string
  value: number
  anomaly: boolean
}

export interface SeriesSet {
  qps: TrendPoint[]
  tps: TrendPoint[]
  latency: { label: string; color: 'p50' | 'p95' | 'p99'; points: TrendPoint[] }[]
  success: { label: string; color: 'main' | 'alt'; points: TrendPoint[] }[]
  ttft: TrendPoint[]
}

export interface BoardInput {
  gran: Granularity
  channelId?: string
  apiName?: string
  modelName?: string
  /** 自定义统计窗口（绝对毫秒，左闭右开）；缺省时取最近 GRAN_META[gran].points 个已完成区间 */
  range?: { from: number; to: number } | null
}

export interface PerfBoard {
  gran: Granularity
  windowLabel: string
  retention: string
  stepSec: number
  points: number
  scopeLabel: string
  total: Metrics
  prev: Metrics
  momQps: number
  dodQps: number
  wowCost: number
  intervals: IntervalRow[]
  series: SeriesSet
  peakConcurrency: number
  minSr: number
  minSrLabel: string
  maxP99: number
  outBuckets: { label: string; count: number; pct: number }[]
  inBuckets: { label: string; count: number; pct: number }[]
  errorCats: { key: AccKey; label: string; count: number; pct: number }[]
  topErrors: { code: string; label: string; category: string; count: number; pct: number }[]
  channels: ChannelRow[]
  ewmaFlags: number
  hasData: boolean
}

const CAT_LABELS: { key: AccKey; label: string }[] = [
  { key: 'ce', label: '客户端错误 4xx' },
  { key: 'rl', label: '被限流 429' },
  { key: 'se', label: '上游服务错误 5xx' },
  { key: 'to', label: '请求超时' },
  { key: 'cn', label: '连接异常' },
  { key: 'cf', label: '内容安全过滤' },
]

const TOP_CODES: { code: string; label: string; category: string; key: AccKey; share: number }[] = [
  { code: '429', label: 'Too Many Requests（配额 / 速率超限）', category: '被限流', key: 'rl', share: 0.62 },
  { code: '504', label: 'Gateway Timeout（上游响应超时）', category: '请求超时', key: 'to', share: 0.55 },
  { code: '502', label: 'Bad Gateway（上游返回异常）', category: '上游服务错误', key: 'se', share: 0.44 },
  { code: '400', label: 'Bad Request（参数不合法）', category: '客户端错误', key: 'ce', share: 0.46 },
  { code: '500', label: 'Internal Server Error（上游内部错误）', category: '上游服务错误', key: 'se', share: 0.33 },
  { code: 'data_inspection_failed', label: '内容安全审核未通过', category: '内容安全过滤', key: 'cf', share: 0.71 },
  { code: 'ERR_CONNECTION_RESET', label: '上游连接被重置', category: '连接异常', key: 'cn', share: 0.58 },
  { code: '401', label: 'Invalid API Key（鉴权失败）', category: '客户端错误', key: 'ce', share: 0.24 },
  { code: '503', label: 'Service Unavailable（上游不可用）', category: '上游服务错误', key: 'se', share: 0.23 },
]

/**
 * EWMA 单边异常检测（文档 §7.3）。
 * EWMA_t = α·value_t + (1−α)·EWMA_{t−1}，标准差同样以指数加权方式递推；
 * 当前值相对「上一区间预测值」偏离超过 k 倍标准差且方向不利时判定为异常：
 * dir='down' 只看下降（成功率），dir='up' 只看上升（延迟 / QPS 突增）。
 * 无数据的区间（值为 0）不参与基线递推，也不标记。
 */
function ewmaAnomalies(values: number[], alpha: number, dir: 'up' | 'down', k = 3): boolean[] {
  const flags = values.map(() => false)
  let e = 0
  let ev = 0
  let init = false
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i]
    if (!Number.isFinite(v) || v <= 0) continue
    if (!init) {
      e = v
      init = true
      continue
    }
    const diff = v - e
    const sd = Math.sqrt(ev)
    if (sd > 1e-9 && Math.abs(diff) > k * sd && (dir === 'down' ? diff < 0 : diff > 0)) flags[i] = true
    e = alpha * v + (1 - alpha) * e
    ev = alpha * diff * diff + (1 - alpha) * ev
  }
  return flags
}

/* ------------------------------------------------------------- 主入口 */

/** 构建「性能分析」看板的全部数据：区间序列 + 总览 + 渠道 / 模型分层 + 告警判定 */
export function buildPerfBoard(channels: Channel[], items: ChannelModelItem[], input: BoardInput): PerfBoard {
  const { gran } = input
  const meta = GRAN_META[gran]
  const stepSec = meta.stepSec
  const stepMs = stepSec * 1000
  // 窗口对齐：起点向上取整、终点向下取整到区间边界，只统计完整的已完成区间；
  // 终点同时不得超过「紧邻当前的区间右端」，避免把进行中的区间算进来
  const lastCompleteEnd = Math.floor(Date.now() / stepMs) * stepMs
  const endAt = input.range ? Math.min(Math.floor(input.range.to / stepMs) * stepMs, lastCompleteEnd) : lastCompleteEnd
  const startAt = input.range
    ? Math.max(Math.ceil(input.range.from / stepMs) * stepMs, endAt - MAX_WINDOW_POINTS * stepMs)
    : endAt - meta.points * stepMs
  const points = clamp(Math.round((endAt - startAt) / stepMs), 1, MAX_WINDOW_POINTS)
  const windowSec = stepSec * points
  const consts = items.map((it) => buildModelConst(it, channels))
  const scoped = consts.filter((mc) => {
    if (input.channelId && mc.channelId !== input.channelId) return false
    if (input.apiName && mc.apiName !== input.apiName) return false
    if (input.modelName && mc.modelName !== input.modelName) return false
    return true
  })
  const buckets = bucketsOf(gran, points, endAt)
  const nowEnd = buckets[buckets.length - 1].to

  const intervalAccs: Acc[] = buckets.map(() => newAcc())
  const totalAcc = newAcc()
  for (const mc of scoped) {
    buckets.forEach((b, i) => {
      addInto(intervalAccs[i], cellsOf(mc, b.from, b.to))
    })
  }
  for (const a of intervalAccs) mergeAccInto(totalAcc, a)

  const base = buckets.map((b, i) => finalize(intervalAccs[i], stepSec))
  // 异常区间 = 成功率被 EWMA(α=0.1) 单边检测命中（仅看下降）的区间；
  // 不使用「< 99.5%」这类绝对线，绝对阈值（P0 < 95%、P1 < 98%）只作为悬浮层建议线展示
  const srOf = (m: Metrics): number => (m.hasData ? m.sr : 0)
  const srFlags = ewmaAnomalies(base.map(srOf), 0.1, 'down')
  const intervals: IntervalRow[] = base.map((m, i) => ({
    ...m,
    label: buckets[i].label,
    fullLabel: buckets[i].fullLabel,
    anomalous: srFlags[i],
  }))
  const total = finalize(totalAcc, windowSec)

  // 环比：上一个等长窗口
  const prevAcc = newAcc()
  for (const b of buckets) {
    for (const mc of scoped) addInto(prevAcc, cellsOf(mc, b.from - windowSec * 1000, b.to - windowSec * 1000))
  }
  const prev = finalize(prevAcc, windowSec)
  const momQps = prev.qps > 0 ? round(((total.qps - prev.qps) / prev.qps) * 100, 1) : 0

  // 同比：昨日同时段、上周同期（周同比）
  const dod = finalize(rangeAcc(scoped, gran, nowEnd - windowSec * 1000 - DAY_MS, nowEnd - DAY_MS), windowSec)
  const wow = finalize(rangeAcc(scoped, gran, nowEnd - windowSec * 1000 - 7 * DAY_MS, nowEnd - 7 * DAY_MS), windowSec)
  const dodQps = dod.qps > 0 ? round(((total.qps - dod.qps) / dod.qps) * 100, 1) : 0
  const wowCost = wow.cost > 0 ? round(((total.cost - wow.cost) / wow.cost) * 100, 1) : 0

  const tp = (pick: (m: Metrics) => number, alpha: number, dir: 'up' | 'down', flags?: boolean[]): TrendPoint[] => {
    const f = flags ?? ewmaAnomalies(base.map(pick), alpha, dir)
    return base.map((m, i) => ({
      label: buckets[i].label,
      fullLabel: buckets[i].fullLabel,
      value: pick(m),
      anomaly: f[i],
    }))
  }
  const series: SeriesSet = {
    qps: tp((m) => m.qps, 0.3, 'up'),
    tps: tp((m) => m.tokenTps, 0.3, 'up'),
    latency: [
      { label: 'P50', color: 'p50', points: tp((m) => m.p50, 0.3, 'up') },
      { label: 'P95', color: 'p95', points: tp((m) => m.p95, 0.3, 'up') },
      { label: 'P99', color: 'p99', points: tp((m) => m.p99, 0.3, 'up') },
    ],
    success: [
      { label: '含 4xx 口径', color: 'main', points: tp(srOf, 0.1, 'down', srFlags) },
      { label: '剔除 4xx 口径', color: 'alt', points: tp((m) => (m.hasData ? m.srExcl : 0), 0.1, 'down') },
    ],
    ttft: tp((m) => m.ttftP95, 0.3, 'up'),
  }

  let peakConcurrency = 0
  let minSr = 100
  let minSrLabel = '—'
  let maxP99 = 0
  for (const it of intervals) {
    peakConcurrency = Math.max(peakConcurrency, it.concurrency)
    maxP99 = Math.max(maxP99, it.p99)
    if (it.hasData && it.sr < minSr) {
      minSr = it.sr
      minSrLabel = it.fullLabel
    }
  }
  if (!total.hasData) {
    minSr = 0
    minSrLabel = '—'
  }

  const mkBuckets = (counts: number[], labels: string[]) => {
    const sum = counts.reduce((s, v) => s + v, 0) || 1
    return labels.map((label, i) => ({ label, count: counts[i], pct: round((counts[i] / sum) * 100, 1) }))
  }
  const outBuckets = mkBuckets(totalAcc.outB, OUTPUT_LEN_BOUNDS)
  const inBuckets = mkBuckets(totalAcc.inB, INPUT_LEN_BOUNDS)

  // 六类错误在最终聚合层一次性整数化：Σ分类计数 === 失败总数，
  // 恒等式「成功 + 六类错误 = 请求总数」在任何粒度与切片下都成立
  const catCounts = alloc(Math.round(totalAcc.fail), CAT_LABELS.map((cat) => totalAcc[cat.key]))
  const errorCats = CAT_LABELS.map((cat, i) => ({
    key: cat.key,
    label: cat.label,
    count: catCounts[i],
    pct: totalAcc.fail > 0 ? round((catCounts[i] / totalAcc.fail) * 100, 1) : 0,
  })).sort((a, b) => b.count - a.count)

  const topErrors = TOP_CODES.map((t) => {
    const count = Math.round(totalAcc[t.key] * t.share)
    return { code: t.code, label: t.label, category: t.category, count, pct: totalAcc.fail > 0 ? round((count / totalAcc.fail) * 100, 1) : 0 }
  })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // 渠道维度
  const byChannel = new Map<string, ModelConst[]>()
  for (const mc of scoped) {
    const list = byChannel.get(mc.channelId) ?? []
    list.push(mc)
    byChannel.set(mc.channelId, list)
  }
  const lastBucket = buckets[points - 1]
  const todayStart = new Date(new Date(nowEnd).setHours(0, 0, 0, 0)).getTime()
  /** 当日流量进度（按全天曲线折算），用于把「当日累计」折算成「预计日终使用率」 */
  const dayFrac = dayConsumeFraction(nowEnd)
  interface ChannelDraft {
    channelId: string
    channelName: string
    mcs: ModelConst[]
    acc: Acc
    dailyM: Metrics
    rpm: number
    tpm: number
    chMinSr: number
    chMinSrLabel: string
  }
  const channelRows: ChannelDraft[] = [...byChannel.entries()].map(([channelId, mcs]) => {
    const acc = newAcc()
    let rpm = 0
    let tpm = 0
    let chMinSr = 100
    let chMinSrLabel = '—'
    for (const mc of mcs) {
      for (const b of buckets) {
        const cell = cellsOf(mc, b.from, b.to)
        addInto(acc, cell)
        if (cell.req > 0) {
          const cellSr = ((cell.req - cell.fail) / cell.req) * 100
          if (cellSr < chMinSr) {
            chMinSr = cellSr
            chMinSrLabel = b.fullLabel
          }
        }
      }
      if (lastBucket) {
        const cell = cellsOf(mc, lastBucket.from, lastBucket.to)
        rpm += (cell.req * 60) / stepSec
        tpm += ((cell.inTok + cell.outTok) * 60) / stepSec
      }
    }
    // 当日累计口径固定为「窗口结束日 00:00 → 窗口右端」，与展示粒度无关（切片步长取 15 分钟）
    const daily = rangeAcc(mcs, '1h', todayStart, nowEnd)
    const dailyM = finalize(daily, Math.max(1, (nowEnd - todayStart) / 1000))
    return { channelId, channelName: mcs[0].channelName, mcs, acc, dailyM, rpm, tpm, chMinSr, chMinSrLabel }
  })

  const p95List = channelRows.map((c) => c.acc).map((a) => finalize(a, windowSec).p95).filter((v) => v > 0).sort((a, b) => a - b)
  const baselineP95 = p95List.length ? p95List[Math.floor(p95List.length / 2)] : 0

  const channelList: ChannelRow[] = channelRows.map(({ channelId, channelName, mcs, acc, dailyM, rpm, tpm, chMinSr, chMinSrLabel }) => {
    const m = finalize(acc, windowSec)
    const srScore = m.hasData ? Math.min(40, (m.sr / 100) * 40) : 0
    const latScore = m.hasData && baselineP95 > 0 && m.p95 > 0 ? clamp(25 * (baselineP95 / m.p95), 0, 25) : 0
    const rlScore = m.hasData ? clamp(20 * (1 - (m.throttleRate / 100) * 20), 0, 20) : 0
    const ffScore = m.hasData ? clamp(15 * (1 - (m.firstFailRate / 100) * 5), 0, 15) : 0
    return {
      channelId,
      channelName,
      metrics: m,
      score: round(srScore + latScore + rlScore + ffScore, 1),
      srScore: round(srScore, 1),
      latScore: round(latScore, 1),
      rlScore: round(rlScore, 1),
      ffScore: round(ffScore, 1),
      baselineP95: round(baselineP95, 2),
      rpmLimit: mcs.reduce((s, x) => s + x.rpmLimit, 0),
      tpmLimit: mcs.reduce((s, x) => s + x.tpmLimit, 0),
      dailyReqLimit: mcs.reduce((s, x) => s + x.dailyReqLimit, 0),
      rpmUsed: Math.round(rpm),
      tpmUsed: Math.round(tpm),
      dailyReqUsed: dailyM.req,
      dailyProjPct: (() => {
        const limit = mcs.reduce((s, x) => s + x.dailyReqLimit, 0)
        return limit > 0 ? round((dailyM.req / limit / dayFrac) * 100, 1) : 0
      })(),
      dailyCost: dailyM.cost,
      minSr: m.hasData ? round(chMinSr, 2) : 0,
      minSrLabel: chMinSrLabel,
    }
  }).sort((a, b) => b.metrics.req - a.metrics.req)

  const ewmaFlags = ewmaAnomalies(base.map((m) => m.p99), 0.3, 'up').filter(Boolean).length

  const lastBucketRow = buckets[points - 1]
  const channelName = input.channelId ? channels.find((c) => c.id === input.channelId)?.name : undefined

  return {
    gran,
    windowLabel: `${buckets[0].fullLabel} – ${fullLabelOf(lastBucketRow.to)}`,
    retention: meta.retention,
    stepSec,
    points,
    scopeLabel: `${channelName || '全部渠道'} · ${input.apiName || '全部API'} · ${input.modelName || '全部模型'}`,
    total,
    prev,
    momQps,
    dodQps,
    wowCost,
    intervals,
    series,
    peakConcurrency: round(peakConcurrency, 1),
    minSr: round(minSr, 2),
    minSrLabel,
    maxP99: round(maxP99, 2),
    outBuckets,
    inBuckets,
    errorCats,
    topErrors,
    channels: channelList,
    ewmaFlags,
    hasData: total.hasData,
  }
}