import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd'
import {
  DollarCircleOutlined,
  DownloadOutlined,
  KeyOutlined,
  MobileOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import PageShell from '../components/PageShell'
import RequirementDot from '../components/RequirementDot'
import { useChannels, useModels, useResourcePacks } from '../store'
import type { ModelItem } from '../types'

const { RangePicker } = DatePicker
const { Text } = Typography

/* ---------------- 行数据模型 ---------------- */

type AccountType = 'personal' | 'enterprise' | 'sub'

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  personal: '个人',
  enterprise: '企业',
  sub: '子账号',
}

/** 一条「用户消费账单」= 一次模型调用（含扣账主体、模型路由、各计费项 Token 与费用） */
type ConsumeRow = {
  key: string
  id: number
  operatorPhone: string
  operatorAccountId: string
  operatorApiKey: string
  accountId: string
  accountPhone: string
  accountType: AccountType
  modelCode: string
  endpoint: string
  alias: string
  multiplierName: string
  multiplier: number
  startAt: Dayjs
  endAt: Dayjs
  inputTokens: number
  inputFee: number
  outputTokens: number
  outputFee: number
  cacheTokens: number | null
  cacheFee: number | null
  cacheCreateTokens: number | null
  cacheCreateFee: number | null
  cacheReadTokens: number | null
  cacheReadFee: number | null
  media: string | null
  packName: string | null
  status: 'success' | 'fail'
}

/* ---------------- 脱敏规则 ---------------- */

/** 手机号：前 3 + **** + 后 4，如 201****0002 */
const maskPhone = (phone: string) => `${phone.slice(0, 3)}****${phone.slice(-4)}`
/** API Key：前缀 + 首 2 位 + ****** + 后 6 位，如 sk-nb******tcmgvb */
const maskApiKey = (key: string) => `${key.slice(0, 3)}${key.slice(3, 5)}******${key.slice(-6)}`

/* ---------------- 扣账账户语料（与账户列表 / 定时充值任务同一形态） ---------------- */

type AccountProfile = {
  phone: string
  accountId: string
  apiKey: string
  accountType: AccountType
  /** 子账号的扣账落到父企业账户 */
  parent?: { phone: string; accountId: string }
}

const ACCOUNTS: AccountProfile[] = [
  {
    phone: '20100000002',
    accountId: 'ACC20260817P9KZn3InE',
    apiKey: 'sk-nb7c1d9f2atcmgvb',
    accountType: 'personal',
  },
  {
    phone: '13800016888',
    accountId: 'ACC20260810PVPbI3MgE',
    apiKey: 'sk-qz41bd07c9xh2kfm',
    accountType: 'enterprise',
  },
  {
    phone: '13910007742',
    accountId: 'ACC20260723Kx2mQ8pLd',
    apiKey: 'sk-wm02f7bc41stgh9x',
    accountType: 'sub',
    parent: { phone: '13910007742', accountId: 'ACC20260723Ab7Ym4NcV' },
  },
  {
    phone: '18601122334',
    accountId: 'ACC20260605Rt9Lp3WqZ',
    apiKey: 'sk-hg83kq10d2mn4vte',
    accountType: 'personal',
  },
  {
    phone: '15921778800',
    accountId: 'ACC202605090005',
    apiKey: 'sk-pb55zn81we0rt7qc',
    accountType: 'enterprise',
  },
  {
    phone: '13520258106',
    accountId: 'ACC20260414Yh6Nc2FdK',
    apiKey: 'sk-jd19xt4bc7mp0lsw',
    accountType: 'sub',
    parent: { phone: '13520258106', accountId: 'ACC20260414Mz3Qw8BgT' },
  },
]

/* ---------------- 确定性伪随机（原型数据必须可复现，不用 Math.random） ---------------- */

function makeRand(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6
/** 费用口径：Token 数 ÷ 1000 × 元/千Token，与模型计费配置的单价单位一致 */
const calcFee = (tokens: number, pricePerK: number) => round6((tokens / 1000) * pricePerK)

/** 兜底单价（元/千Token）：仅用于模型未配置 token 计费的情况 */
const FALLBACK_PRICES: Record<string, { in: number; out: number }> = {
  'deepseek-v4-flash': { in: 0.001694, out: 0.005082 },
}
const DEFAULT_PRICES = { in: 0.0025, out: 0.01 }

type Price = {
  in: number
  out: number
  cached?: number
  cacheCreate?: number
  cacheRead?: number
  cachedEnabled: boolean
}

function resolvePrice(m: ModelItem): Price {
  const cost = m.costConfig
  if (cost?.priceType === 'token' && cost.inputPrice != null && cost.outputPrice != null) {
    return {
      in: cost.inputPrice,
      out: cost.outputPrice,
      cached: cost.cachedPrice ?? cost.inputPrice * 0.5,
      cacheCreate: cost.cacheCreatePrice ?? cost.inputPrice * 1.25,
      cacheRead: cost.cacheReadPrice ?? cost.inputPrice * 0.5,
      cachedEnabled: true,
    }
  }
  const fb = FALLBACK_PRICES[m.modelCode ?? ''] ?? DEFAULT_PRICES
  return { in: fb.in, out: fb.out, cached: fb.in * 0.5, cachedEnabled: true }
}

/* ---------------- 首屏 5 行按评审截图固定，保证「展示如图」可逐字核对 ---------------- */

const HEAD_MODEL = 'deepseek-v4-flash'
const CHAT_ENDPOINT = '/v1/chat/completions'

const HEAD_ROWS = [
  { input: 8939, inputFee: 0.015143, output: 874, outputFee: 0.004442, start: '10:23:54', end: '10:24:05' },
  { input: 4866, inputFee: 0.008244, output: 438, outputFee: 0.002226, start: '10:23:47', end: '10:23:53' },
  { input: 8549, inputFee: 0.014483, output: 477, outputFee: 0.002425, start: '10:23:40', end: '10:23:47' },
  { input: 9067, inputFee: 0.015356, output: 409, outputFee: 0.002079, start: '10:23:31', end: '10:23:40' },
  { input: 8017, inputFee: 0.013581, output: 474, outputFee: 0.002409, start: '10:23:23', end: '10:23:31' },
]

const TOP_ID = 349821
const TOTAL_ROWS = 60

/**
 * 生成调用明细：模型、渠道、资源包均取自 store，保证与模型列表 / 渠道管理 / 资源包管理口径一致；
 * 时间从当天上午起逐行向前回溯，近 3 个月内均有分布，因此「本月 / 上月 / 近 3 个月」都能筛到数据。
 */
function buildRows(
  models: ModelItem[],
  channelNameById: Map<string, string>,
  fallbackChannels: string[],
  packNames: string[],
): ConsumeRow[] {
  const pool = models.length ? models : []
  const rand = makeRand(20260914)
  const today = dayjs().format('YYYY-MM-DD')
  const anchor = dayjs(`${today} 10:23:23`)

  return Array.from({ length: TOTAL_ROWS }, (_, i) => {
    const id = TOP_ID - i
    const profile = ACCOUNTS[Math.floor(i / 4) % ACCOUNTS.length]
    const head = i < HEAD_ROWS.length ? HEAD_ROWS[i] : null
    const m = head
      ? pool.find((x) => x.modelCode === HEAD_MODEL)
      : pool.length
        ? pool[Math.floor(i / 3) % pool.length]
        : undefined
    const modelCode = m?.modelCode || m?.name || HEAD_MODEL
    const api = m?.apiConfigs?.[0]
    const channelName =
      channelNameById.get(api?.channelId ?? '') ??
      fallbackChannels[i % Math.max(fallbackChannels.length, 1)] ??
      '直连渠道'
    const multiplier = api?.modelMultiplier ?? 0.5
    const multiplierName = api?.multiplierName?.trim() || '默认倍率'
    const endpoint = head ? CHAT_ENDPOINT : (m?.configEndpoints?.[0] ?? CHAT_ENDPOINT)
    const alias = `${channelName}--${modelCode}--${multiplier}`
    const price: Price = m
      ? resolvePrice(m)
      : { in: FALLBACK_PRICES[HEAD_MODEL].in, out: FALLBACK_PRICES[HEAD_MODEL].out, cachedEnabled: false }
    const isMediaModel = !head && !!m && /image|video|audio/.test(String(m.type).toLowerCase())

    const slot = i - HEAD_ROWS.length
    const backDays = head ? 0 : slot < 25 ? slot * 0.55 : 15 + (slot - 25) * 2.4
    const backSeconds = head ? 0 : Math.round(backDays * 86400 + rand() * 3600)
    const startAt = head ? dayjs(`${today} ${head.start}`) : anchor.subtract(backSeconds, 'second')
    const duration = head ? dayjs(`${today} ${head.end}`).diff(startAt, 'second') : Math.round(3 + rand() * 25)
    const endAt = startAt.add(duration, 'second')

    const status: ConsumeRow['status'] = head ? 'success' : slot % 9 === 5 ? 'fail' : 'success'
    const inputTokens = head ? head.input : Math.round(600 + rand() * 12000)
    const outputTokens = head ? head.output : status === 'fail' ? 0 : Math.round(80 + rand() * 2600)
    const p = price

    const useCache = !head && !isMediaModel && p.cachedEnabled && rand() < 0.34
    const cacheTokens = useCache ? Math.round(inputTokens * (0.2 + rand() * 0.5)) : null
    const cacheFee = cacheTokens != null ? calcFee(cacheTokens, p.cached ?? p.in * 0.5) : null
    const useCacheCreate = !head && useCache && rand() < 0.3
    const cacheCreateTokens = useCacheCreate ? Math.round(inputTokens * (0.1 + rand() * 0.2)) : null
    const cacheCreateFee =
      cacheCreateTokens != null ? calcFee(cacheCreateTokens, p.cacheCreate ?? p.in * 1.25) : null
    const cacheReadTokens = useCache && !useCacheCreate ? cacheTokens : null
    const cacheReadFee = cacheReadTokens != null ? cacheFee : null

    return {
      key: String(id),
      id,
      operatorPhone: profile.phone,
      operatorAccountId: profile.accountId,
      operatorApiKey: profile.apiKey,
      accountId: profile.parent?.accountId ?? profile.accountId,
      accountPhone: profile.parent?.phone ?? profile.phone,
      accountType: profile.accountType,
      modelCode,
      endpoint,
      alias,
      multiplierName,
      multiplier,
      startAt,
      endAt,
      inputTokens,
      inputFee: head ? head.inputFee : calcFee(inputTokens, p.in),
      outputTokens,
      outputFee: head ? head.outputFee : calcFee(outputTokens, p.out),
      cacheTokens,
      cacheFee,
      cacheCreateTokens,
      cacheCreateFee,
      cacheReadTokens,
      cacheReadFee,
      media: isMediaModel ? (rand() > 0.5 ? `图片 ×${1 + Math.floor(rand() * 4)}` : `视频 · ${5 + Math.floor(rand() * 4) * 5} 秒`) : null,
      packName: packNames.length && i % 5 !== 1 ? packNames[i % packNames.length] : null,
      status,
    }
  })
}

/* ---------------- 查询条件 ---------------- */

type MonthPreset = 'this' | 'last' | 'three' | 'year'

const presetRange = (p: MonthPreset): [Dayjs, Dayjs] => {
  const now = dayjs()
  if (p === 'last') {
    const m = now.subtract(1, 'month')
    return [m.startOf('month'), m.endOf('month')]
  }
  if (p === 'three') return [now.subtract(2, 'month').startOf('month'), now.endOf('month')]
  if (p === 'year') return [now.startOf('year'), now.endOf('year')]
  return [now.startOf('month'), now.endOf('month')]
}

type Query = {
  range: [Dayjs, Dayjs] | null
  channel: string
  operator: string
  account: string
  accountType?: AccountType
  model?: string
  status?: 'success' | 'fail'
  pack?: string
}

const emptyQuery = (): Query => ({
  range: presetRange('this'),
  channel: '',
  operator: '',
  account: '',
  accountType: undefined,
  model: undefined,
  status: undefined,
  pack: undefined,
})

/* ---------------- 单元格小组件 ---------------- */

/** 手机号 / 账户 ID / API Key 三行式身份单元格 */
function IdentityCell({ lines }: { lines: { icon?: ReactNode; text: string; tip?: string }[] }) {
  return (
    <Space direction="vertical" size={2} style={{ whiteSpace: 'nowrap' }}>
      {lines.map((l, idx) => (
        <Tooltip key={`${idx}-${l.text}`} title={l.tip}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            {l.icon}
            {l.text}
          </span>
        </Tooltip>
      ))}
    </Space>
  )
}

/** Token 数 + 下方蓝色费用；空值统一「—」 */
function TokenFeeCell({
  tokens,
  fee,
  feeColor,
}: {
  tokens: number | null
  fee: number | null
  feeColor: string
}) {
  if (tokens == null) return <Text type="secondary">—</Text>
  return (
    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
      <div>{tokens.toLocaleString('en-US')}</div>
      {fee != null && <div style={{ fontSize: 12, color: feeColor }}>¥{fee.toFixed(6)}</div>}
    </div>
  )
}

/** 调用时间：上块为请求开始（蓝），下块为响应结束（橙） */
function CallTimeCell({ row, blue, orange }: { row: ConsumeRow; blue: string; orange: string }) {
  const block = (bg: string, color: string, time: Dayjs) => (
    <div
      style={{
        background: bg,
        color,
        borderRadius: 6,
        padding: '2px 10px',
        textAlign: 'center',
        fontSize: 12,
        lineHeight: '18px',
      }}
    >
      <div>{time.format('YYYY-MM-DD')}</div>
      <div>{time.format('HH:mm:ss')}</div>
    </div>
  )
  return (
    <Space direction="vertical" size={4} style={{ whiteSpace: 'nowrap' }}>
      <Tooltip title="请求发起时间">{block('#e6f4ff', blue, row.startAt)}</Tooltip>
      <Tooltip title={`响应结束时间 · 耗时 ${row.endAt.diff(row.startAt, 'second')} 秒`}>
        {block('#fff7e6', orange, row.endAt)}
      </Tooltip>
    </Space>
  )
}

/* ---------------- 页面 ---------------- */

export default function UserConsumeBill() {
  const { token } = theme.useToken()
  const { models } = useModels()
  const { channels } = useChannels()
  const { packs } = useResourcePacks()

  const [month, setMonth] = useState<MonthPreset>('this')
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(presetRange('this'))
  const [channel, setChannel] = useState('')
  const [operator, setOperator] = useState('')
  const [account, setAccount] = useState('')
  const [accountType, setAccountType] = useState<AccountType>()
  const [model, setModel] = useState<string>()
  const [status, setStatus] = useState<'success' | 'fail'>()
  const [pack, setPack] = useState<string>()
  const [query, setQuery] = useState<Query>(emptyQuery)

  const rows = useMemo(() => {
    const map = new Map(channels.map((c) => [c.id, c.name]))
    return buildRows(
      models,
      map,
      channels.map((c) => c.name),
      packs.map((p) => p.name),
    )
  }, [models, channels, packs])

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query.range) {
          const [from, to] = query.range
          if (r.startAt.isBefore(from) || r.startAt.isAfter(to)) return false
        }
        if (query.channel && !r.alias.toLowerCase().includes(query.channel.trim().toLowerCase())) return false
        if (query.operator && !r.operatorAccountId.toLowerCase().includes(query.operator.trim().toLowerCase())) {
          return false
        }
        if (query.account) {
          const kw = query.account.trim().toLowerCase()
          const hit =
            r.accountId.toLowerCase().includes(kw) ||
            r.accountPhone.includes(kw) ||
            maskPhone(r.accountPhone).includes(kw)
          if (!hit) return false
        }
        if (query.accountType && r.accountType !== query.accountType) return false
        if (query.model && r.modelCode !== query.model) return false
        if (query.status && r.status !== query.status) return false
        if (query.pack && r.packName !== query.pack) return false
        return true
      }),
    [rows, query],
  )

  const handleSearch = () =>
    setQuery({ range, channel, operator, account, accountType, model, status, pack })

  const handleReset = () => {
    setMonth('this')
    setRange(presetRange('this'))
    setChannel('')
    setOperator('')
    setAccount('')
    setAccountType(undefined)
    setModel(undefined)
    setStatus(undefined)
    setPack(undefined)
    setQuery(emptyQuery())
  }

  const handleExport = () => {
    if (!filtered.length) {
      message.warning('当前筛选结果为空，暂无可导出数据')
      return
    }
    const header = [
      'ID',
      '操作人手机号',
      '操作人账户ID',
      '操作人API Key',
      '扣账账户ID',
      '扣账账户手机号',
      '账户类型',
      '模型',
      '调用端点',
      '模型别名',
      '请求开始时间',
      '响应结束时间',
      '倍率名称',
      '倍率',
      '输入Token',
      '输入费用(元)',
      '输出Token',
      '输出费用(元)',
      '缓存Token',
      '缓存费用(元)',
      '缓存创建Token',
      '缓存创建费用(元)',
      '缓存读取Token',
      '缓存读取费用(元)',
      '媒体信息',
      '资源包',
      '调用状态',
    ]
    const lines = [header.map(csvCell).join(',')]
    filtered.forEach((r) =>
      lines.push(
        [
          r.id,
          maskPhone(r.operatorPhone),
          r.operatorAccountId,
          maskApiKey(r.operatorApiKey),
          r.accountId,
          maskPhone(r.accountPhone),
          ACCOUNT_TYPE_LABEL[r.accountType],
          r.modelCode,
          r.endpoint,
          r.alias,
          r.startAt.format('YYYY-MM-DD HH:mm:ss'),
          r.endAt.format('YYYY-MM-DD HH:mm:ss'),
          r.multiplierName,
          `${r.multiplier}x`,
          r.inputTokens,
          r.inputFee.toFixed(6),
          r.outputTokens,
          r.outputFee.toFixed(6),
          r.cacheTokens ?? '',
          r.cacheFee?.toFixed(6) ?? '',
          r.cacheCreateTokens ?? '',
          r.cacheCreateFee?.toFixed(6) ?? '',
          r.cacheReadTokens ?? '',
          r.cacheReadFee?.toFixed(6) ?? '',
          r.media ?? '',
          r.packName ?? '',
          r.status === 'success' ? '成功' : '失败',
        ]
          .map(csvCell)
          .join(','),
      ),
    )
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `用户消费账单_${dayjs().format('YYYYMMDD_HHmm')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filtered.length} 条记录`)
  }

  const modelOptions = useMemo(() => {
    const codes = Array.from(new Set(rows.map((r) => r.modelCode)))
    return codes.map((c) => ({ label: c, value: c }))
  }, [rows])

  const packOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.packName).filter(Boolean))).map((p) => ({ label: p as string, value: p as string })),
    [rows],
  )

  const breakRow = <div style={{ flexBasis: '100%', height: 0 }} />

  return (
    <PageShell
      breadcrumb={['账单管理', '用户消费账单']}
      listTitle="调用明细"
      total={filtered.length}
      hideTotal
      onSearch={handleSearch}
      onReset={handleReset}
      listActions={
        <>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出数据
          </Button>
          <RequirementDot
            title="用户消费账单 · 导出数据"
            sections={[
              {
                label: '',
                items: ['1.新增「倍率名称」「倍率」两列。'],
              },
            ]}
          />
        </>
      }
      searchFields={
        <>
          <Select
            style={{ width: 160 }}
            value={month}
            onChange={(v: MonthPreset) => {
              setMonth(v)
              setRange(presetRange(v))
            }}
            options={[
              { label: '本月', value: 'this' },
              { label: '上月', value: 'last' },
              { label: '近 3 个月', value: 'three' },
              { label: '本年', value: 'year' },
            ]}
          />
          <RangePicker
            allowClear
            value={range}
            onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
          />
          <Input
            style={{ width: 240 }}
            placeholder="搜索渠道"
            allowClear
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Input
            style={{ width: 240 }}
            placeholder="搜索操作人ID"
            allowClear
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            onPressEnter={handleSearch}
          />
          {breakRow}
          <Input
            style={{ width: 240 }}
            placeholder="搜索扣账账户ID、手机号码"
            allowClear
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            style={{ width: 160 }}
            placeholder="全部账户类型"
            allowClear
            value={accountType}
            onChange={setAccountType}
            options={(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((t) => ({
              label: ACCOUNT_TYPE_LABEL[t],
              value: t,
            }))}
          />
          <Select
            style={{ width: 200 }}
            placeholder="全部模型"
            allowClear
            showSearch
            optionFilterProp="label"
            value={model}
            onChange={setModel}
            options={modelOptions}
          />
          <Select
            style={{ width: 160 }}
            placeholder="全部调用状态"
            allowClear
            value={status}
            onChange={setStatus}
            options={[
              { label: '成功', value: 'success' },
              { label: '失败', value: 'fail' },
            ]}
          />
          <Select
            style={{ width: 200 }}
            placeholder="全部资源包"
            allowClear
            value={pack}
            onChange={setPack}
            options={packOptions}
          />
        </>
      }
    >
      <Table<ConsumeRow>
        rowKey="key"
        size="middle"
        dataSource={filtered}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
        }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 90, fixed: 'left' },
          {
            title: '操作人',
            key: 'operator',
            render: (_, r) => (
              <IdentityCell
                lines={[
                  {
                    icon: <MobileOutlined style={{ color: token.colorPrimary }} />,
                    text: maskPhone(r.operatorPhone),
                    tip: `手机号：${r.operatorPhone}`,
                  },
                  { text: r.operatorAccountId },
                  {
                    icon: <KeyOutlined style={{ color: token.colorTextQuaternary }} />,
                    text: maskApiKey(r.operatorApiKey),
                    tip: '本次调用使用的 API Key',
                  },
                ]}
              />
            ),
          },
          {
            title: '扣账账户',
            key: 'account',
            render: (_, r) => (
              <IdentityCell
                lines={[
                  {
                    icon: <MobileOutlined style={{ color: token.colorPrimary }} />,
                    text: maskPhone(r.accountPhone),
                    tip: `手机号：${r.accountPhone}`,
                  },
                  { text: r.accountId, tip: '实际扣减余额的账户' },
                ]}
              />
            ),
          },
          {
            title: '账户类型',
            dataIndex: 'accountType',
            render: (t: AccountType) => <Tag>{ACCOUNT_TYPE_LABEL[t]}</Tag>,
          },
          {
            title: '模型',
            key: 'model',
            render: (_, r) => (
              <Space direction="vertical" size={2} style={{ whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {r.modelCode}
                  <Tooltip title="按 Token 计费">
                    <DollarCircleOutlined style={{ color: token.colorWarning }} />
                  </Tooltip>
                </span>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {r.endpoint}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {r.alias}
                </Text>
              </Space>
            ),
          },
          {
            title: '调用时间',
            key: 'time',
            render: (_, r) => (
              <CallTimeCell row={r} blue={token.colorPrimary} orange={token.colorWarning} />
            ),
          },
          {
            title: (
              <Space size={6}>
                倍率信息
                <RequirementDot
                  title="新增列 · 倍率信息"
                  sections={[
                    {
                      label: '',
                      items: [
                        '1.位置：在「调用时间」后新增「倍率信息」列。',
                        '2.展示两行：上行倍率名称，下行倍率（数字 + x，如 2x）。',
                      ],
                    },
                  ]}
                />
              </Space>
            ),
            key: 'multiplier',
            render: (_, r) => (
              <Space direction="vertical" size={2} style={{ whiteSpace: 'nowrap' }}>
                <Text style={{ fontSize: 13 }}>{r.multiplierName}</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {r.multiplier}x
                </Text>
              </Space>
            ),
          },
          {
            title: '输入',
            key: 'input',
            align: 'right',
            render: (_, r) => (
              <TokenFeeCell tokens={r.inputTokens} fee={r.inputFee} feeColor={token.colorPrimary} />
            ),
          },
          {
            title: '输出',
            key: 'output',
            align: 'right',
            render: (_, r) => (
              <TokenFeeCell tokens={r.outputTokens} fee={r.outputFee} feeColor={token.colorPrimary} />
            ),
          },
          {
            title: '缓存',
            key: 'cache',
            align: 'right',
            render: (_, r) => (
              <TokenFeeCell tokens={r.cacheTokens} fee={r.cacheFee} feeColor={token.colorPrimary} />
            ),
          },
          {
            title: '缓存创建',
            key: 'cacheCreate',
            align: 'right',
            render: (_, r) => (
              <TokenFeeCell
                tokens={r.cacheCreateTokens}
                fee={r.cacheCreateFee}
                feeColor={token.colorPrimary}
              />
            ),
          },
          {
            title: '缓存读取',
            key: 'cacheRead',
            align: 'right',
            render: (_, r) => (
              <TokenFeeCell
                tokens={r.cacheReadTokens}
                fee={r.cacheReadFee}
                feeColor={token.colorPrimary}
              />
            ),
          },
          {
            title: '媒体信息',
            dataIndex: 'media',
            render: (v: string | null) =>
              v ? <Text style={{ whiteSpace: 'nowrap' }}>{v}</Text> : <Text type="secondary">—</Text>,
          },
          {
            title: '资源包',
            dataIndex: 'packName',
            render: (v: string | null) =>
              v ? (
                <Tooltip title="本次调用优先抵扣的资源包">
                  <Text style={{ whiteSpace: 'nowrap' }}>{v}</Text>
                </Tooltip>
              ) : (
                <Text type="secondary">—</Text>
              ),
          },
          {
            title: '调用状态',
            dataIndex: 'status',
            fixed: 'right',
            render: (s: ConsumeRow['status']) =>
              s === 'success' ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>,
          },
        ]}
      />
    </PageShell>
  )
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}
