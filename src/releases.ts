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
  /** 本次迭代涉及的视图（可选，默认 admin） */
  views?: ('admin' | 'console' | 'website')[]
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

  /** ===== v1.2.0：Token Plan FAQ + 调整配额功能迭代（2026-08-20） ===== */
  'v1.2.0': {
    title: 'v1.2.0 Token Plan FAQ & 调整配额迭代',
    routeKeys: ['tokenPlan', 'accountList'],
    views: ['admin', 'console'],
    note: '1. 控制台 Token Plan 概览页：FAQ内容更新、使用步骤样式优化\n2. 管理后台账户列表：调整配额弹窗支持模型多选、批量替换、限额等级验证',
  },

  /** ===== v1.3.0：资源包购买 + 用量统计 + Token Plan 订阅迭代（2026-08-25） ===== */
  'v1.3.0': {
    title: 'v1.3.0 资源包购买 & 用量统计 & 订阅迭代',
    routeKeys: ['tokenPlan'],
    views: ['admin', 'console'],
    note: [
      '1. 资源包购买：订单摘要新增原价/优惠明细，支付跳转微信支付页',
      '2. 资源包购买：协议文案改为「套餐购买协议」，去掉演示环境提示',
      '3. 用量统计：模型筛选新增「全部」选项，默认选中全部模型',
      '4. 我的订阅：API KEY 升级为列表管理（增删/重置/显隐/复制）',
      '5. 我的订阅：模型列表操作列调整（查看详情/复制Model ID）',
      '6. 管理后台：套餐弹窗「推荐标签」开关改为「产品标签」输入框（最多6字）',
    ].join('\n'),
  },

  /** ===== 2.0：定时充值任务受众类型 & 已执行任务 & 选择账户搜索迭代（2026-08-26 起） ===== */
  '2.0': {
    title: '2.0 定时充值任务迭代',
    routeKeys: ['rechargeTask'],
    views: ['admin'],
    note: [
      '1. 新增/编辑任务：增加任务受众类型字段（按标签/按用户）',
      '   · 按标签：下方多选已创建的标签，至少选一个',
      '   · 按用户：打开选择账户弹窗，支持搜索（昵称/账户ID/标签），已实名显示实名+昵称+账户ID，未实名显示昵称+账户ID；已选可取消；多个已选折叠为 +N',
      '2. 操作栏：移除「编辑覆盖账户」，新增「已执行任务」按钮',
      '3. 已执行任务弹窗：按运行时间倒序，展示已成功执行账户数 / 应执行账户数（如 8/10）',
      '4. 列表新增「任务受众类型」列：按标签展示标签数量（hover 显示具体标签），按用户显示「按用户」',
    ].join('\n'),
  },
}

export const LATEST_RELEASE = Object.keys(RELEASES).slice(-1)[0] ?? 'v1.0.0'
