import { useMemo } from 'react'
import { Card, Table, Typography, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { RELEASES, LATEST_RELEASE } from '../releases'

const { Title, Text } = Typography

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
    ],
  },
  {
    groupKey: 'modelGroup',
    groupLabel: '模型管理',
    children: [
      { key: 'models', label: '模型列表' },
      { key: 'resourcePack', label: '资源包管理' },
      { key: 'tokenPlan', label: 'Token Plan' },
    ],
  },
  {
    groupKey: 'channelGroup',
    groupLabel: '渠道管理',
    children: [
      { key: 'channels', label: '渠道管理' },
      { key: 'channelModels', label: '渠道模型管理' },
      { key: 'channelBill', label: '渠道对账单' },
      { key: 'channelFeeDetail', label: '渠道费用明细' },
    ],
  },
  {
    groupKey: 'statGroup',
    groupLabel: '统计与分析',
    children: [
      { key: 'channelStat', label: '渠道统计分析' },
      { key: 'modelUsageStat', label: '模型使用统计分析' },
      { key: 'modelUsageDetail', label: '模型使用明细' },
      { key: 'planStats', label: '资源包与套餐统计' },
    ],
  },
  {
    groupKey: 'billGroup',
    groupLabel: '账单管理',
    children: [{ key: 'planBill', label: '套餐与资源包账单' }],
  },
  {
    groupKey: 'other',
    groupLabel: '其他',
    children: [{ key: 'otherRequirements', label: '其他需求' }],
  },
]

/** 根据 routeKey 返回 [菜单组名, 菜单项名]，找不到返回 ['其他', routeKey] */
function findMenuLabel(routeKey: string): [string, string] {
  for (const g of MENU_GROUPS) {
    const c = g.children.find((x) => x.key === routeKey)
    if (c) return [g.groupLabel, c.label]
  }
  return ['其他', routeKey]
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
  const mainRe = /^(\d+)\.\s*(?:\[([a-zA-Z*_-]+)\]\s*)?(.*)$/
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
  menuGroup: string
  menuLabel: string
  menuPath: string
  main: string
  sub: string[]
  /** 用于 antd rowSpan：同菜单第一次出现为 N，其余为 0 */
  rowSpan: number
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

    // 按 menuPath 分组计算 rowSpan
    const byPath: Record<string, number> = {}
    for (const it of processed) {
      const [g, l] = findMenuLabel(it.routeKey)
      byPath[`${g} › ${l}`] = (byPath[`${g} › ${l}`] || 0) + 1
    }
    const consumed: Record<string, number> = {}

    const rows: RowData[] = processed.map<RowData>((it) => {
      const [g, l] = findMenuLabel(it.routeKey)
      const path = `${g} › ${l}`
      const total = byPath[path] ?? 1
      const used = consumed[path] ?? 0
      const rowSpan = used === 0 ? total : 0
      consumed[path] = used + 1
      return {
        seq: it.seq,
        routeKey: it.routeKey,
        menuGroup: g,
        menuLabel: l,
        menuPath: path,
        main: it.main,
        sub: it.sub,
        rowSpan,
      }
    })
    return { rows, totalFeatures: items.length }
  }, [release])

  const columns: ColumnsType<RowData> = [
    {
      title: '所属菜单',
      dataIndex: 'menuPath',
      key: 'menuPath',
      width: 260,
      render: (_v: string, r) => r.menuPath,
      onCell: (r) => ({ rowSpan: r.rowSpan }),
    },
    {
      title: '功能说明',
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
        <Space size={24} style={{ display: 'flex' }} align="center" wrap>
          <Title level={4} style={{ margin: 0 }}>
            功能列表
          </Title>
          <Text strong style={{ fontSize: 16 }}>
            v{version.startsWith('v') ? version.slice(1) : version} 版本需求
            {release?.publishedAt && (
              <>
                <Text type="secondary" style={{ marginLeft: 16, fontWeight: 400 }}>
                  发布时间：{release.publishedAt}
                </Text>
              </>
            )}
          </Text>
        </Space>
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
