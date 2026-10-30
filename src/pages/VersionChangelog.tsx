import { useMemo } from 'react'
import { Card, Table, Typography, Space } from 'antd'
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
      { key: 'planUsage', label: '套餐用量查询' },
      { key: 'planConsumeDetail', label: '套餐消耗明细' },
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
      { key: 'planBill', label: '套餐与加油包订单' },
      { key: 'userConsumeBill', label: '用户消费账单' },
    ],
  },
  {
    /** 控制台 Token Plan 页面用 `plan:` 前缀定位（与 releases.ts consoleKeys 的 `plan` 入口对应） */
    groupKey: 'consolePlanGroup',
    groupLabel: '控制台 › Token Plan',
    children: [
      { key: 'plan:overview', label: 'Token Plan 概览' },
      { key: 'plan:mySub', label: '我的订阅（套餐+加油包）' },
      { key: 'plan:purchase', label: '套餐订购结算页' },
      { key: 'plan:renew', label: '套餐续费' },
      { key: 'plan:buyPack', label: '购买加油包' },
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
      { key: 'websiteTokenPlan', label: 'Token Plan' },
      { key: 'promoLanding', label: '推广合伙人' },
      { key: 'promoInviteeLanding', label: '被邀请人落地页' },
      { key: 'mobileGuide', label: '移动端引导页' },
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
  if (
    routeKey.startsWith('tf:') ||
    routeKey.startsWith('billing:') ||
    routeKey.startsWith('plan:') ||
    routeKey === 'console'
  ) {
    return '控制台'
  }
  if (
    routeKey === 'websiteTokenPlan' ||
    routeKey === 'promoLanding' ||
    routeKey === 'promoInviteeLanding' ||
    routeKey === 'mobileGuide'
  ) {
    return '官方网站'
  }
  return '管理后台'
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
      </Card>
    </Space>
  )
}
