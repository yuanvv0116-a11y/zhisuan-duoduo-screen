import { useMemo } from 'react'
import { Card, Table, Tabs, Typography, Space, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { RELEASES, LATEST_RELEASE } from '../releases'

const { Text } = Typography

/* ---------------- 菜单映射（复制自 App.tsx FULL_MENU 的结构快照） ---------------- */
interface MenuGroup {
  groupKey: string
  groupLabel: string
  children: { key: string; label: string }[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    groupKey: 'userTeamGroup',
    groupLabel: '用户与团队管理',
    children: [
      { key: 'userList', label: '用户列表' },
      { key: 'userTag', label: '用户标签' },
    ],
  },
  {
    groupKey: 'accountGroup',
    groupLabel: '账户管理',
    children: [
      { key: 'accountList', label: '账户列表' },
      { key: 'rechargeTask', label: '定时充值任务' },
      { key: 'voucherIssueCenter', label: '代金券' },
    ],
  },
  {
    groupKey: 'modelGroup',
    groupLabel: '模型管理',
    children: [
      { key: 'models', label: '模型列表' },
      { key: 'modelGroups', label: '模型分组' },
    ],
  },
  {
    groupKey: 'tokenPlanGroup',
    groupLabel: 'Token Plan',
    children: [
      { key: 'tokenPlan', label: '套餐管理' },
      { key: 'resourcePack', label: '加油包管理' },
    ],
  },
  {
    groupKey: 'promoGroup',
    groupLabel: '分销管理',
    children: [
      { key: 'promoRebateConfig', label: '分销活动' },
      { key: 'promoCommissionDetail', label: '分佣明细' },
      { key: 'promoPartnerManage', label: '分销合伙人' },
      { key: 'promoSettleAudit', label: '提现审核与兑券' },
      { key: 'promoStats', label: '分销统计' },
    ],
  },
  {
    groupKey: 'channelGroup',
    groupLabel: '渠道管理',
    children: [
      { key: 'channels', label: '渠道管理' },
      { key: 'channelModels', label: '渠道模型管理' },
      { key: 'modelHourlyPerf', label: '模型性能明细（小时）' },
      { key: 'channelBill', label: '渠道对账单' },
      { key: 'channelFeeDetail', label: '渠道费用明细' },
    ],
  },
  {
    groupKey: 'statGroup',
    groupLabel: '统计与分析',
    children: [
      { key: 'channelStat', label: '渠道统计与性能分析' },
      { key: 'modelUsageStat', label: '模型使用统计分析' },
      { key: 'modelUsageDetail', label: '模型使用明细' },
      { key: 'planStats', label: '加油包与套餐统计' },
      { key: 'voucherStats', label: '代金券统计' },
    ],
  },
  {
    groupKey: 'billGroup',
    groupLabel: '账单管理',
    children: [
      { key: 'planBill', label: '套餐与加油包账单' },
      { key: 'userConsumeBill', label: '用户消费账单' },
    ],
  },
  {
    /** 控制台菜单不在 RouteKey 体系内，用 `tf:` / `billing:` 前缀定位（见 releases.ts consoleKeys） */
    groupKey: 'consoleFactoryGroup',
    groupLabel: '控制台 › Token工厂',
    children: [
      { key: 'tf:plaza', label: '模型广场' },
      { key: 'tf:experience', label: '体验语言模型' },
      { key: 'tf:usage', label: '用量统计' },
      { key: 'tf:apiKey', label: 'API Key管理' },
      { key: 'tf:myGroups', label: '模型分组' },
      { key: 'tf:quota', label: '配额管理' },
      { key: 'tf:pricing', label: '模型费率' },
    ],
  },
  {
    groupKey: 'consoleBillingGroup',
    groupLabel: '控制台 › 费用',
    children: [
      { key: 'billing:accountOverview', label: '账户概览' },
      { key: 'billing:voucher', label: '代金券' },
      { key: 'billing:accountDetail', label: '账户明细' },
      { key: 'billing:recharge', label: '充值记录' },
      { key: 'billing:orderDetail', label: '订单明细' },
      { key: 'billing:consumption', label: '消费明细' },
      { key: 'billing:invoice', label: '发票信息' },
    ],
  },
  {
    groupKey: 'consolePromoGroup',
    groupLabel: '控制台',
    children: [{ key: 'console', label: '推广合伙人' }],
  },
  {
    groupKey: 'websiteGroup',
    groupLabel: '官方网站',
    children: [
      { key: 'promoLanding', label: '推广合伙人' },
      { key: 'promoInviteeLanding', label: '被邀请人落地页' },
    ],
  },
  {
    groupKey: 'other',
    groupLabel: '其他',
    children: [{ key: 'otherRequirements', label: '其他需求' }],
  },
]

/** 根据 routeKey 返回 [菜单组名, 菜单项名]，找不到返回 ['其他', routeKey] */
function findMenuLabel(routeKey: string): [string, string] {
  if (routeKey === 'global') return ['全局', '全局调整']
  for (const g of MENU_GROUPS) {
    const c = g.children.find((x) => x.key === routeKey)
    if (c) return [g.groupLabel, c.label]
  }
  return ['其他', routeKey]
}

/** 根据 routeKey 返回所属平台：管理后台 / 控制台 / 官方网站 / 全局 */
function findPlatform(routeKey: string): string {
  if (routeKey === 'global' || routeKey === 'admin') return routeKey === 'global' ? '全局' : '管理后台'
  if (routeKey.startsWith('tf:') || routeKey.startsWith('billing:') || routeKey === 'console') return '控制台'
  if (routeKey === 'promoLanding' || routeKey === 'promoInviteeLanding') return '官方网站'
  return '管理后台'
}

/* ---------------- 分销返佣流程图（泳道时序） ---------------- */
type FlowShape = 'cap' | 'soft' | 'focus' | 'diamond'
type FlowItem =
  | {
      kind: 'self'
      lane: number
      label: string
      sub?: string
      shape: FlowShape
      /** 菱形横向分支：同排朝目标泳道引出「是/否」箭头 + 结果胶囊 */
      out?: { to: number; label: string; target: string }
      /** 菱形纵向主线出口标签（画在菱形下顶点下方） */
      vlabel?: string
    }
  | {
      kind: 'msg'
      from: number
      to: number
      label: string
      sub?: string
      focus?: boolean
      labelBelow?: boolean
    }

const FLOW_LANES = [
  { name: '客户', x: 120 },
  { name: '分销', x: 350 },
  { name: '平台', x: 580 },
]

const FLOW_ITEMS: FlowItem[] = [
  { kind: 'self', lane: 2, label: '创建分销活动', shape: 'soft' },
  { kind: 'self', lane: 2, label: '设置返佣模型及比例', shape: 'soft' },
  { kind: 'msg', from: 2, to: 1, label: '发送分销链接' },
  { kind: 'msg', from: 1, to: 0, label: '选择活动并分享' },
  { kind: 'msg', from: 0, to: 2, label: '通过链接注册', sub: '绑定分销关系' },
  { kind: 'msg', from: 0, to: 2, label: '在平台产生消费' },
  {
    kind: 'self',
    lane: 2,
    label: '判断现金消费',
    shape: 'diamond',
    out: { to: 1, label: '否', target: '不返佣 · 结束' },
    vlabel: '是',
  },
  { kind: 'self', lane: 2, label: '按模型找活动分佣', sub: '取最高比例 · 记录活动', shape: 'focus' },
  { kind: 'msg', from: 2, to: 1, label: '每日结算入账', focus: true, labelBelow: true },
  {
    kind: 'self',
    lane: 1,
    label: '满足最低提现要求',
    shape: 'diamond',
    out: { to: 2, label: '是', target: '满足则申请提现' },
    vlabel: '否',
  },
  { kind: 'self', lane: 1, label: '不满足 · 不可提现', shape: 'cap' },
  { kind: 'self', lane: 2, label: '打款成功 · 设置为通过', shape: 'soft' },
  { kind: 'self', lane: 2, label: '打款失败 · 驳回提现申请', shape: 'soft' },
  { kind: 'self', lane: 1, label: '兑换代金券', sub: '兑券分支 · 实时到账', shape: 'cap' },
]

/** 按泳道 x 方向计算胶囊越界修正量，保证不出画布 */
function fitShift(cx: number, w: number): number {
  const left = cx - w / 2
  const right = cx + w / 2
  if (left < 52) return 52 - left
  if (right > 708) return 708 - right
  return 0
}

/** 统一算盒子/胶囊宽度：主行与副行取宽者 + 左右留白，避免副行压字 */
function flowBoxW(label: string, sub?: string): number {
  return Math.max(label.length * 14, sub ? sub.length * 12.5 : 0) + 40
}

function buildFlowPlan(items: FlowItem[]): {
  steps: { item: FlowItem; y: number; h: number }[]
  totalH: number
} {
  const steps: { item: FlowItem; y: number; h: number }[] = []
  let cursor = 170
  for (const it of items) {
    if (it.kind === 'self') {
      const h = it.shape === 'diamond' ? 66 : it.sub ? 44 : 40
      steps.push({ item: it, y: cursor, h })
      cursor += h + 40
    } else {
      const capsuleH = it.sub ? 44 : 40
      const lineOffset = it.labelBelow ? 18 : capsuleH + 18
      steps.push({ item: it, y: cursor + lineOffset - 20, h: 40 })
      cursor += capsuleH + 32 + 36
    }
  }
  return { steps, totalH: cursor + 8 }
}

function FlowDiagram() {
  const { token } = theme.useToken()
  const plan = useMemo(() => buildFlowPlan(FLOW_ITEMS), [])
  const lifelineBottom = plan.totalH - 20

  const actorBox = (lane: (typeof FLOW_LANES)[number]) => (
    <g key={lane.name}>
      <rect
        x={lane.x - 70}
        y={62}
        width={140}
        height={52}
        rx={token.borderRadius}
        fill={token.colorBgContainer}
        stroke={lane.name === '分销' ? token.colorPrimary : token.colorBorderSecondary}
        strokeWidth={lane.name === '分销' ? 1.6 : 1.2}
      />
      <text
        x={lane.x}
        y={94}
        textAnchor="middle"
        fontSize={token.fontSize}
        fontWeight={token.fontWeightStrong}
        fill={token.colorText}
      >
        {lane.name}
      </text>
    </g>
  )

  const renderStep = (s: { item: FlowItem; y: number; h: number }, idx: number) => {
    const it = s.item
    if (it.kind === 'self') {
      const cx = FLOW_LANES[it.lane].x
      const cy = s.y + s.h / 2
      if (it.shape === 'diamond') {
        const hw = Math.max(80, it.label.length * 8 + 24)
        const hh = 33
        const q = 8
        const path = [
          `M ${cx - hw + q} ${cy - hh}`,
          `L ${cx + hw - q} ${cy - hh}`,
          `L ${cx + hw} ${cy}`,
          `L ${cx + hw - q} ${cy + hh}`,
          `L ${cx - hw + q} ${cy + hh}`,
          `L ${cx - hw} ${cy}`,
          'Z',
        ].join(' ')
        const out = it.out
        const outDir = out ? (FLOW_LANES[out.to].x > cx ? 1 : -1) : 0
        const targetW = out ? flowBoxW(out.target) : 0
        const targetCx = out ? FLOW_LANES[out.to].x + fitShift(FLOW_LANES[out.to].x, targetW) : 0
        const branchX1 = cx + outDir * hw
        const branchX2 = targetCx - outDir * (targetW / 2 + 2)
        return (
          <g key={idx}>
            <path d={path} fill={token.colorFillQuaternary} stroke={token.colorBorder} strokeWidth={1.4} />
            {it.sub ? (
              <>
                <text x={cx} y={cy - 3} textAnchor="middle" fontSize={token.fontSize} fontWeight={token.fontWeightStrong} fill={token.colorText}>
                  {it.label}
                </text>
                <text x={cx} y={cy + 15} textAnchor="middle" fontSize={token.fontSizeSM} fill={token.colorTextSecondary}>
                  {it.sub}
                </text>
              </>
            ) : (
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize={token.fontSize} fontWeight={token.fontWeightStrong} fill={token.colorText}>
                {it.label}
              </text>
            )}
            {out && (
              <>
                <line
                  x1={branchX1}
                  y1={cy}
                  x2={branchX2}
                  y2={cy}
                  stroke={token.colorTextTertiary}
                  strokeWidth={1.2}
                  markerEnd="url(#flowArrowGray)"
                />
                <text
                  x={(cx + outDir * hw + targetCx) / 2}
                  y={cy - 8}
                  textAnchor="middle"
                  fontSize={token.fontSizeSM}
                  fontWeight={token.fontWeightStrong}
                  fill={token.colorTextSecondary}
                >
                  {out.label}
                </text>
                <rect
                  x={targetCx - targetW / 2}
                  y={cy - 17}
                  width={targetW}
                  height={34}
                  rx={17}
                  fill={token.colorBgContainer}
                  stroke={token.colorBorder}
                  strokeWidth={1.2}
                />
                <text x={targetCx} y={cy + 5} textAnchor="middle" fontSize={token.fontSizeSM} fontWeight={token.fontWeightStrong} fill={token.colorTextSecondary}>
                  {out.target}
                </text>
              </>
            )}
            {it.vlabel && (
              <>
                <line x1={cx} y1={cy + hh} x2={cx} y2={cy + hh + 32} stroke={token.colorTextTertiary} strokeWidth={1.2} markerEnd="url(#flowArrowGray)" />
                <text x={cx + 10} y={cy + hh + 22} textAnchor="start" fontSize={token.fontSizeSM} fontWeight={token.fontWeightStrong} fill={token.colorTextSecondary}>
                  {it.vlabel}
                </text>
              </>
            )}
          </g>
        )
      }
      const w = flowBoxW(it.label, it.sub)
      const fill =
        it.shape === 'focus' ? token.colorPrimaryBg : it.shape === 'soft' ? token.colorFillQuaternary : token.colorBgContainer
      const stroke = it.shape === 'focus' ? token.colorPrimary : token.colorBorder
      return (
        <g key={idx}>
          <rect x={cx - w / 2} y={s.y} width={w} height={s.h} rx={token.borderRadius} fill={fill} stroke={stroke} strokeWidth={1.3} />
          {it.sub ? (
            <>
              <text x={cx} y={cy - 3} textAnchor="middle" fontSize={token.fontSize} fontWeight={token.fontWeightStrong} fill={token.colorText}>
                {it.label}
              </text>
              <text x={cx} y={cy + 15} textAnchor="middle" fontSize={token.fontSizeSM} fill={token.colorTextSecondary}>
                {it.sub}
              </text>
            </>
          ) : (
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize={token.fontSize} fontWeight={token.fontWeightStrong} fill={token.colorText}>
              {it.label}
            </text>
          )}
        </g>
      )
    }
    if (it.kind === 'msg') {
      const fromX = FLOW_LANES[it.from].x
      const toX = FLOW_LANES[it.to].x
      const y = s.y + s.h / 2
      const dir = toX > fromX ? 1 : -1
      const lineEnd = toX - dir * 5
      const stroke = it.focus ? token.colorPrimary : token.colorTextTertiary
      const midX = (fromX + toX) / 2
      const capsuleW = flowBoxW(it.label, it.sub)
      const capsuleH = it.sub ? 44 : 40
      const capsuleY = it.labelBelow ? y + 14 : y - 14 - capsuleH
      const cx = midX + fitShift(midX, capsuleW)
      return (
        <g key={idx}>
          <line x1={fromX + dir * 6} y1={y} x2={lineEnd} y2={y} stroke={stroke} strokeWidth={it.focus ? 1.8 : 1.2} markerEnd={it.focus ? 'url(#flowArrowPrimary)' : 'url(#flowArrowGray)'} />
          <rect
            x={cx - capsuleW / 2}
            y={capsuleY}
            width={capsuleW}
            height={capsuleH}
            rx={token.borderRadius}
            fill={it.focus ? token.colorPrimaryBg : token.colorBgContainer}
            stroke={it.focus ? token.colorPrimary : token.colorBorder}
            strokeWidth={1.3}
          />
          {it.sub ? (
            <>
              <text x={cx} y={capsuleY + 19} textAnchor="middle" fontSize={token.fontSize} fontWeight={token.fontWeightStrong} fill={token.colorText}>
                {it.label}
              </text>
              <text x={cx} y={capsuleY + 35} textAnchor="middle" fontSize={token.fontSizeSM} fill={token.colorTextSecondary}>
                {it.sub}
              </text>
            </>
          ) : (
            <text x={cx} y={capsuleY + capsuleH / 2 + 5} textAnchor="middle" fontSize={token.fontSize} fontWeight={token.fontWeightStrong} fill={token.colorText}>
              {it.label}
            </text>
          )}
        </g>
      )
    }
    return null
  }

  return (
    <svg viewBox={`0 0 720 ${plan.totalH}`} width="100%" style={{ maxWidth: 660, display: 'block', margin: '0 auto' }} role="img" aria-label="分销返佣三角色流程图">
      <defs>
        <marker id="flowArrowGray" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M1 1 L7 4 L1 7 Z" fill={token.colorTextTertiary} />
        </marker>
        <marker id="flowArrowPrimary" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M1 1 L7 4 L1 7 Z" fill={token.colorPrimary} />
        </marker>
      </defs>
      {plan.steps.slice(0, -1).map((a, i) => {
        const b = plan.steps[i + 1]
        const ax = a.item.kind === 'self' ? FLOW_LANES[a.item.lane].x : FLOW_LANES[a.item.to].x
        const bx = b.item.kind === 'self' ? FLOW_LANES[b.item.lane].x : FLOW_LANES[b.item.from].x
        if (ax !== bx) return null
        const x = ax
        let y1: number
        let y2: number
        let arrow = true
        if (a.item.kind === 'self') {
          const acy = a.y + a.h / 2
          const bottom = a.item.shape === 'diamond' ? acy + 33 : a.y + a.h
          if (a.item.shape === 'diamond' && a.item.vlabel) {
            y1 = bottom + 34
            arrow = false
          } else {
            y1 = bottom
          }
        } else {
          y1 = a.y + a.h / 2
        }
        if (b.item.kind === 'self') {
          y2 = b.item.shape === 'diamond' ? b.y + b.h / 2 - 33 : b.y
        } else {
          y2 = b.y + b.h / 2
          arrow = false
        }
        if (y2 - y1 < 6) return null
        return (
          <line
            key={`c${i}`}
            x1={x}
            y1={y1}
            x2={x}
            y2={y2 - (arrow ? 2 : 0)}
            stroke={token.colorTextTertiary}
            strokeWidth={1.2}
            markerEnd={arrow ? 'url(#flowArrowGray)' : undefined}
          />
        )
      })}
      {FLOW_LANES.map(actorBox)}
      {FLOW_LANES.map((lane) => (
        <line key={lane.name} x1={lane.x} y1={122} x2={lane.x} y2={lifelineBottom} stroke={token.colorTextQuaternary} strokeWidth={1} strokeDasharray="4 4" />
      ))}
      {plan.steps.map(renderStep)}
    </svg>
  )
}

/* ---------------- note 解析 ---------------- */
interface ParsedItem {
  /** 原序号（1,2,3...） */
  seq: number
  /** 归属 routeKey */
  routeKey: string
  /** 主功能描述（不含序号和 [routeKey]） */
  main: string
  /** 子项列表 */
  sub: string[]
}

function parseNote(note: string | undefined): ParsedItem[] {
  if (!note) return []
  const lines = note.split('\n').filter((l) => l.trim().length > 0)
  const result: ParsedItem[] = []
  let last: ParsedItem | null = null
  const mainRe = /^(\d+)\.\s*(?:\[([\w:*-]+)\]\s*)?(.*)$/
  const subRe = /^\s*[·•\-]\s*(.*)$/

  for (const raw of lines) {
    const line = raw
    const mm = line.match(mainRe)
    if (mm) {
      const [, seqStr, rk, content] = mm as unknown as [string, string, string, string]
      const routeKey = rk ?? ''
      last = { seq: Number(seqStr), routeKey, main: content.trim(), sub: [] }
      result.push(last)
      continue
    }
    const sm = line.match(subRe)
    if (sm && last) {
      last.sub.push((sm[1] as string).trim())
      continue
    }
    if (last) {
      last.main = last.main + ' ' + line.trim()
    } else {
      last = {
        seq: result.length + 1,
        routeKey: '',
        main: line.trim(),
        sub: [],
      }
      result.push(last)
    }
  }
  return result
}

/* ---------------- 行级数据 ---------------- */
interface RowData {
  seq: number
  routeKey: string
  platform: string
  menuGroup: string
  menuLabel: string
  menuPath: string
  main: string
  sub: string[]
  /** 用于 antd rowSpan：同菜单第一次出现为 N，其余为 0 */
  rowSpan: number
  /** 用于 antd rowSpan：同平台连续段首行为 N，其余为 0 */
  platformRowSpan: number
}

export default function VersionChangelog() {
  const version = LATEST_RELEASE
  const release = RELEASES[version]

  const { rows, totalFeatures } = useMemo(() => {
    if (!release) return { rows: [] as RowData[], totalFeatures: 0 }
    const items = parseNote(release.note)

    const defaultRouteKey =
      release.routeKeys.includes('*') ? '' : (release.routeKeys[0] as string) ?? ''

    const processed = items.map<ParsedItem>((it) => ({
      ...it,
      routeKey: it.routeKey || defaultRouteKey,
    }))

    const rows: RowData[] = processed.map<RowData>((it) => {
      const [g, l] = findMenuLabel(it.routeKey)
      return {
        seq: it.seq,
        routeKey: it.routeKey,
        platform: findPlatform(it.routeKey),
        menuGroup: g,
        menuLabel: l,
        menuPath: `${g} › ${l}`,
        main: it.main,
        sub: it.sub,
        rowSpan: 1,
        platformRowSpan: 1,
      }
    })

    // 按连续段计算 rowSpan：段首行 = 段长度，其余 = 0（同平台/同菜单条目连续时合并单元格）
    const setSpans = (key: 'menuPath' | 'platform', field: 'rowSpan' | 'platformRowSpan') => {
      let start = 0
      for (let i = 1; i <= rows.length; i++) {
        if (i === rows.length || rows[i]![key] !== rows[start]![key]) {
          rows[start]![field] = i - start
          for (let j = start + 1; j < i; j++) rows[j]![field] = 0
          start = i
        }
      }
    }
    setSpans('platform', 'platformRowSpan')
    setSpans('menuPath', 'rowSpan')
    return { rows, totalFeatures: items.length }
  }, [release])

  const columns: ColumnsType<RowData> = [
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 90,
      onCell: (r) => ({ rowSpan: r.platformRowSpan }),
    },
    {
      title: '功能地址',
      dataIndex: 'menuPath',
      key: 'menuPath',
      width: 220,
      render: (_v: string, r) => r.menuPath,
      onCell: (r) => ({ rowSpan: r.rowSpan }),
    },
    {
      title: '需求简述',
      dataIndex: 'main',
      key: 'main',
      render: (_v, r) => (
        <Space direction="vertical" size={4} style={{ display: 'flex' }}>
          <Space size={6} align="start">
            <Text
              style={{
                display: 'inline-block',
                minWidth: 20,
                color: '#2f6bff',
                fontWeight: 600,
              }}
            >
              {r.seq}.
            </Text>
            <Text>{r.main}</Text>
          </Space>
          {r.sub.length > 0 && (
            <Space direction="vertical" size={2} style={{ paddingLeft: 26 }}>
              {r.sub.map((s, idx) => (
                <Text type="secondary" key={idx} style={{ lineHeight: '20px' }}>
                  · {s}
                </Text>
              ))}
            </Space>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <Text strong style={{ fontSize: 16 }}>
          v{version.startsWith('v') ? version.slice(1) : version} 版本需求
          {release?.publishedAt && (
            <>
              <Text type="secondary" style={{ marginLeft: 32, fontWeight: 400 }}>
                发布时间：{release.publishedAt}
              </Text>
            </>
          )}
        </Text>
      </Card>

      <Card variant="borderless" styles={{ body: { padding: 16 } }}>
        <Tabs
          items={[
            {
              key: 'features',
              label: '版本需求',
              children: (
                <Table
                  rowKey={(r) => `${r.seq}-${r.routeKey}-${r.menuLabel}`}
                  columns={columns}
                  dataSource={rows}
                  pagination={false}
                  scroll={{ x: 800 }}
                  size="middle"
                  bordered
                  locale={{ emptyText: <Text type="secondary">该版本暂无功能说明</Text> }}
                />
              ),
            },
            {
              key: 'flow',
              label: '分销返佣流程',
              children: <FlowDiagram />,
            },
          ]}
        />
      </Card>
    </Space>
  )
}
