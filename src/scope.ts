/**
 * 分支作用域工具（支持多分支）
 * ------------------------------------------------------------
 * 每个分支在 SCOPES 注册表中声明一条配置，
 * 访问 ?scope=<name> 时只展示该分支新增的页面和数据。
 *
 * 新建分支时，往 SCOPES 里加一条即可：
 *
 *   'billing-v2': {
 *     label: '账单 V2 预览',
 *     date: '2026-09-01',
 *     routeKeys: ['planBill', 'planStats'],
 *   },
 *
 * 然后访问 https://xxx.netlify.app/?scope=billing-v2
 */

import type { RouteKey } from './App'

export interface ScopeConfig {
  /** 展示名称（显示在顶部提示条） */
  label: string
  /** 分界日期：此日期之后创建的数据才算「新」 */
  date: string
  /** 该分支新增/涉及的路由 key */
  routeKeys: RouteKey[]
}

/** 分支作用域注册表 */
export const SCOPES: Record<string, ScopeConfig> = {
  /** ===== new-features 分支（2026-08-26 起）===== */
  new: {
    label: '新功能预览',
    date: '2026-08-26',
    routeKeys: [
      'rechargeTask', // 定时充值任务：受众类型 / 已执行任务弹窗 / 选择账户搜索
    ],
  },

  /** ===== 模板：复制一份、改 key 即可 =====
  'feature-xxx': {
    label: 'XXX 功能预览',
    date: '2026-09-01',
    routeKeys: ['planBill', 'planStats'],
  },
  */
}

/** 从 URL 读取 scope 参数 */
export function getScopeFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const sp = new URLSearchParams(window.location.search)
  return sp.get('scope')
}

/** 获取当前作用域配置（无 scope 参数或未注册时返回 null） */
export function getActiveScope(): ScopeConfig | null {
  const name = getScopeFromUrl()
  if (!name) return null
  return SCOPES[name] ?? null
}

/** 当前是否处于某个分支作用域 */
export function isInScope(): boolean {
  return getActiveScope() !== null
}

/** 获取当前作用域的 date（无作用域时返回 null，表示不过滤） */
export function getScopeDate(): string | null {
  return getActiveScope()?.date ?? null
}

/** 获取当前作用域的路由 key 列表 */
export function getScopeRouteKeys(): RouteKey[] {
  return getActiveScope()?.routeKeys ?? []
}

/**
 * 按作用域过滤数据。
 * - 无作用域：原样返回
 * - 有作用域：只保留 createdAt >= 作用域 date 的记录
 */
export function filterByScope<T>(items: T[], getDate: (item: T) => string): T[] {
  const date = getScopeDate()
  if (!date) return items
  return items.filter((item) => getDate(item) >= date)
}
