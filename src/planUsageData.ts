/* ---------------- 套餐用量查询 / 套餐消耗明细：共享 mock 数据 ---------------- */

export type ProductKind = 'plan' | 'pack'

export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  plan: '套餐',
  pack: '加油包',
}

export const PRODUCT_KIND_COLOR: Record<ProductKind, string> = {
  plan: 'geekblue',
  pack: 'purple',
}

export type UsageStatus = 'active' | 'expired' | 'inactive'

export const USAGE_STATUS_LABEL: Record<UsageStatus, string> = {
  active: '使用中',
  expired: '已过期',
  inactive: '未生效',
}

export const USAGE_STATUS_COLOR: Record<UsageStatus, string> = {
  active: 'green',
  expired: 'default',
  inactive: 'gold',
}

/** 一条「某人买了某套餐/加油包」的用量记录 */
export interface UsageRow {
  key: string
  orderNo: string
  userName: string
  phone: string
  accountId: string
  productName: string
  productKind: ProductKind
  /** 实付金额（元） */
  amount: number
  totalTokens: number
  usedTokens: number
  validFrom: string
  validTo: string
  status: UsageStatus
}

export const remainingTokens = (r: UsageRow) => Math.max(0, r.totalTokens - r.usedTokens)

export const maskPhone = (p: string) => `${p.slice(0, 3)}****${p.slice(7)}`

export const formatTokens = (n: number) => n.toLocaleString('en-US')

/* 产品语料与 store 种子一致：新手/进阶/专业套餐 + 全能大模型套餐 A / 视觉创作包（加油包） */
export const USAGE_ROWS: UsageRow[] = [
  {
    key: 'u1', orderNo: 'TP2026100100012', userName: '张薇宁', phone: '13810023456',
    accountId: 'ACC20260312Ab1Cg7Hn', productName: '新手套餐（Lite）', productKind: 'plan',
    amount: 60, totalTokens: 3500000, usedTokens: 2847321,
    validFrom: '2026-10-01', validTo: '2026-10-31', status: 'active',
  },
  {
    key: 'u2', orderNo: 'RP2026091500031', userName: '张薇宁', phone: '13810023456',
    accountId: 'ACC20260312Ab1Cg7Hn', productName: '全能大模型套餐 A', productKind: 'pack',
    amount: 999, totalTokens: 50000000, usedTokens: 31205887,
    validFrom: '2026-09-15', validTo: '2026-10-15', status: 'expired',
  },
  {
    key: 'u3', orderNo: 'TP2026100500021', userName: '李晨浩', phone: '15921778800',
    accountId: 'ACC202605090005', productName: '专业套餐（Pro）', productKind: 'plan',
    amount: 599, totalTokens: 400000000, usedTokens: 392617400,
    validFrom: '2026-10-05', validTo: '2026-11-04', status: 'active',
  },
  {
    key: 'u4', orderNo: 'RP2026101200047', userName: '李晨浩', phone: '15921778800',
    accountId: 'ACC202605090005', productName: '视觉创作包', productKind: 'pack',
    amount: 299, totalTokens: 10000000, usedTokens: 4158002,
    validFrom: '2026-10-12', validTo: '2027-01-11', status: 'active',
  },
  {
    key: 'u5', orderNo: 'TP2026080300008', userName: '王雨桐', phone: '18601122334',
    accountId: 'ACC20260605Rt9Lp3WqZ', productName: '新手套餐（Lite）', productKind: 'plan',
    amount: 39, totalTokens: 3500000, usedTokens: 3500000,
    validFrom: '2026-08-03', validTo: '2026-09-02', status: 'expired',
  },
  {
    key: 'u6', orderNo: 'TP2026100800019', userName: '陈佳林', phone: '13520258106',
    accountId: 'ACC20260414Yh6Nc2FdK', productName: '进阶套餐（Standard）', productKind: 'plan',
    amount: 199, totalTokens: 100000000, usedTokens: 68904113,
    validFrom: '2026-10-08', validTo: '2026-11-07', status: 'active',
  },
  {
    key: 'u7', orderNo: 'RP2026092000028', userName: '陈佳林', phone: '13520258106',
    accountId: 'ACC20260414Yh6Nc2FdK', productName: '视觉创作包', productKind: 'pack',
    amount: 299, totalTokens: 10000000, usedTokens: 9231477,
    validFrom: '2026-09-20', validTo: '2026-12-19', status: 'active',
  },
  {
    key: 'u8', orderNo: 'RP2026071000003', userName: '陈佳林', phone: '13520258106',
    accountId: 'ACC20260414Yh6Nc2FdK', productName: '全能大模型套餐 A', productKind: 'pack',
    amount: 999, totalTokens: 50000000, usedTokens: 50000000,
    validFrom: '2026-07-10', validTo: '2026-08-09', status: 'expired',
  },
  {
    key: 'u9', orderNo: 'TP2026101000024', userName: '刘沛然', phone: '13701234567',
    accountId: 'ACC20260801Kq8Zx2VbN', productName: '进阶套餐（Standard）', productKind: 'plan',
    amount: 537.3, totalTokens: 300000000, usedTokens: 143607250,
    validFrom: '2026-10-10', validTo: '2027-01-09', status: 'active',
  },
  {
    key: 'u10', orderNo: 'RP2026101800052', userName: '赵敏雪', phone: '13622334455',
    accountId: 'ACC20260720Nc4Td6YeL', productName: '全能大模型套餐 A', productKind: 'pack',
    amount: 999, totalTokens: 50000000, usedTokens: 0,
    validFrom: '2026-11-01', validTo: '2026-12-01', status: 'inactive',
  },
  {
    key: 'u11', orderNo: 'TP2026101800053', userName: '孙浩杰', phone: '13911226677',
    accountId: 'ACC20260908Fz2Gh5JkM', productName: '专业套餐（Pro）', productKind: 'plan',
    amount: 599, totalTokens: 400000000, usedTokens: 26118940,
    validFrom: '2026-10-18', validTo: '2026-11-17', status: 'active',
  },
  {
    key: 'u12', orderNo: 'TP2026090600016', userName: '孙浩杰', phone: '13911226677',
    accountId: 'ACC20260908Fz2Gh5JkM', productName: '新手套餐（Lite）', productKind: 'plan',
    amount: 60, totalTokens: 3500000, usedTokens: 1204660,
    validFrom: '2026-09-06', validTo: '2026-10-05', status: 'expired',
  },
  {
    key: 'u13', orderNo: 'TP2026093000041', userName: '周思远', phone: '13455667788',
    accountId: 'ACC20260612Vb7Nm1QsX', productName: '进阶套餐（Standard）', productKind: 'plan',
    amount: 199, totalTokens: 100000000, usedTokens: 99998112,
    validFrom: '2026-09-30', validTo: '2026-10-29', status: 'active',
  },
  {
    key: 'u14', orderNo: 'TP2026081500011', userName: '周思远', phone: '13455667788',
    accountId: 'ACC20260612Vb7Nm1QsX', productName: '新手套餐（Lite）', productKind: 'plan',
    amount: 60, totalTokens: 3500000, usedTokens: 3205770,
    validFrom: '2026-08-15', validTo: '2026-09-14', status: 'expired',
  },
]

/* ---------------- 消耗明细 ---------------- */

/** 一次调用从某个套餐/加油包扣减额度产生的一条消耗记录 */
export interface ConsumeRow {
  key: string
  /** 对应的用量行 key（查看消耗明细弹窗按此过滤） */
  usageKey: string
  orderNo: string
  userName: string
  phone: string
  accountId: string
  productName: string
  productKind: ProductKind
  model: string
  endpoint: string
  /** 渠道模型别名，如 111--deepseek-v4-flash--0.5 */
  accountAlias: string
  callTime: string
  rate: number
  inputTokens: number
  outputTokens: number
  cacheCreateTokens: number
  cacheReadTokens: number
  /** 成本价（元） */
  cost: number
}

const MODELS = ['deepseek-v4-flash', 'deepseek-v4-pro', 'qwen3-max', 'glm-4.6', 'kimi-k2']
const CHANNEL_IDS = [111, 214, 306, 427, 518]
const RATES = [0.5, 0.8, 1, 1.2, 2]
const ENDPOINT = '/v1/chat/completions'

/** 元/千Token：输入、输出、缓存创建、缓存读取 */
const PRICES: Record<string, { input: number; output: number; cacheCreate: number; cacheRead: number }> = {
  'deepseek-v4-flash': { input: 1, output: 2, cacheCreate: 1.2, cacheRead: 0.02 },
  'deepseek-v4-pro': { input: 3, output: 6, cacheCreate: 3.6, cacheRead: 0.06 },
  'qwen3-max': { input: 2.4, output: 9.6, cacheCreate: 3, cacheRead: 0.48 },
  'glm-4.6': { input: 1, output: 4, cacheCreate: 1.5, cacheRead: 0.2 },
  'kimi-k2': { input: 2, output: 8, cacheCreate: 2.5, cacheRead: 0.5 },
}

/* 确定性伪随机（原型数据必须可复现，不用 Math.random） */
function makeRand(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function hashSeed(s: string): number {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483647
  return h
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4

const pad = (n: number) => String(n).padStart(2, '0')

function fmtDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 为一条用量行生成 6-11 条消耗明细；token 总量按权重分摊，与该行的「已用 Tokens」口径自洽 */
export function buildConsumeRows(u: UsageRow): ConsumeRow[] {
  if (u.status === 'inactive' || u.usedTokens <= 0) return []
  const rand = makeRand(hashSeed(u.key))
  const n = 6 + Math.floor(rand() * 6)

  const weights: number[] = []
  for (let i = 0; i < n; i++) weights.push(0.4 + rand())
  const wSum = weights.reduce((a, b) => a + b, 0)

  const from = new Date(`${u.validFrom}T00:00:00`).getTime()
  const to = new Date(`${u.validTo}T23:59:59`).getTime()
  const upper = Math.min(to, u.status === 'active' ? Date.now() : to)

  const rows: ConsumeRow[] = []
  for (let i = 0; i < n; i++) {
    const callTotal = Math.round((u.usedTokens * weights[i]) / wSum)
    const input = Math.max(1, Math.round(callTotal * (0.5 + rand() * 0.25)))
    const output = Math.max(1, Math.round(callTotal * (0.1 + rand() * 0.1)))
    const cacheRead = Math.round(callTotal * (rand() * 0.15))
    const cacheCreate = Math.round(callTotal * (rand() * 0.08))

    const model = MODELS[Math.floor(rand() * MODELS.length)]
    const rate = RATES[Math.floor(rand() * RATES.length)]
    const channelId = CHANNEL_IDS[Math.floor(rand() * CHANNEL_IDS.length)]
    const ts = new Date(from + rand() * Math.max(0, upper - from))
    const price = PRICES[model]
    const cost = round4(
      ((input * price.input + output * price.output + cacheCreate * price.cacheCreate + cacheRead * price.cacheRead) /
        1000) *
        rate,
    )

    rows.push({
      key: `${u.key}-c${i + 1}`,
      usageKey: u.key,
      orderNo: u.orderNo,
      userName: u.userName,
      phone: u.phone,
      accountId: u.accountId,
      productName: u.productName,
      productKind: u.productKind,
      model,
      endpoint: ENDPOINT,
      accountAlias: `${channelId}--${model}--${rate}`,
      callTime: fmtDateTime(ts),
      rate,
      inputTokens: input,
      outputTokens: output,
      cacheCreateTokens: cacheCreate,
      cacheReadTokens: cacheRead,
      cost,
    })
  }
  rows.sort((a, b) => (a.callTime < b.callTime ? 1 : -1))
  return rows
}

/** 全量消耗明细（套餐消耗明细页数据源），按调用时间倒序 */
export const CONSUME_ROWS: ConsumeRow[] = USAGE_ROWS.flatMap(buildConsumeRows).sort((a, b) =>
  a.callTime < b.callTime ? 1 : -1,
)
