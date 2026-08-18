/**
 * 发布版本清单
 * ------------------------------------------------------------
 * 每次发布新版本，往 RELEASES 里加一条：
 *   - version:     版本号（对应 Git Tag，如 v1.1.0）
 *   - title:       本次需求标题
 *   - routeKeys:   本次涉及的页面路由 key（来自 App.tsx 的 RouteKey 联合类型）
 *                  空数组表示什么都不显示；写 ['*'] 表示全量
 *   - note:        评审时展示的变更说明（可选）
 *
 * 评审时访问：/?review=<version>
 *   例如：https://xxx.netlify.app/?review=v1.1.0
 *   左侧菜单只会显示 routeKeys 中声明的路由入口。
 *   未声明的页面仍可手动输入地址访问（便于联调），评审员从菜单不会看到。
 */

import type { RouteKey } from './App'

export interface ReleaseItem {
  title: string
  routeKeys: (RouteKey | '*')[]
  note?: string
}

export const RELEASES: Record<string, ReleaseItem> = {
  /** ===== 首个完整版本（2026-08-17）：全量功能 ===== */
  'v1.0.0': {
    title: 'v1.0.0 首个完整版本',
    routeKeys: ['*'],
    note: '渠道商 / 账户 / 模型 / 资源包 / 定时充值任务 / 设计规范',
  },

  /** ===== 下次需求模板：复制一份、改 version/title/routeKeys/note 即可 =====
   *  使用示例：
   *  - 新增了 2 个功能（比如路由 X、Y），改了 10 个中的 3 个（路由 A、B、C）
   *  - routeKeys 里就放 [X, Y, A, B, C]
   *  - 评审员访问 ?review=v1.1.0 时只会看到这 5 个菜单入口
   */
  'v1.1.0': {
    title: 'v1.1.0 下次需求 — 请按需填写',
    routeKeys: ['*'],
    note: '在这里填写本次变更（2 新增 + 3 修改等）的说明',
  },
}

export const LATEST_RELEASE = Object.keys(RELEASES).slice(-1)[0] ?? 'v1.0.0'
