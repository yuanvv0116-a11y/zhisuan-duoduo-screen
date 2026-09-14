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
 *   管理后台左侧菜单只会显示 routeKeys 中声明的路由入口。
 *   控制台菜单在 RouteKey 体系之外（Token工厂二级菜单、费用二级菜单），
 *   用 consoleKeys 声明：`tf:<FactoryMenu>` / `billing:<BillingSubPage>`，
 *   评审时控制台顶部导航与对应二级菜单只会显示声明的入口。
 *   未声明的页面仍可手动输入地址访问（便于联调），评审员从菜单不会看到。
 */

import type { RouteKey } from './App'

export interface ReleaseItem {
  title: string
  routeKeys: (RouteKey | '*')[]
  /**
   * 本次涉及的控制台菜单（可选，不写表示控制台不做裁剪）
   * - `tf:plaza` 模型广场 / `tf:experience` 体验语言模型 / `tf:usage` 用量统计
   * - `tf:apiKey` API Key管理 / `tf:myGroups` 模型分组 / `tf:quota` 配额管理 / `tf:pricing` 模型费率
   * - `billing:accountOverview` 账户概览 / `billing:accountDetail` 账户明细 / `billing:recharge` 充值记录
   * - `billing:orderDetail` 订单明细 / `billing:consumption` 消费明细 / `billing:invoice` 发票信息
   */
  consoleKeys?: string[]
  note?: string
  /** 本次迭代涉及的视图（可选，默认 admin） */
  views?: ('admin' | 'console' | 'website')[]
  /** 发布日期 YYYY-MM-DD */
  publishedAt?: string
}

/** 评审模式下控制台需要放行的菜单集合，null 表示该侧不做裁剪 */
export interface ConsoleScope {
  factory: string[] | null
  billing: string[] | null
}

/** 解析某个版本的控制台菜单范围；未声明 consoleKeys 时返回 null（完全放开） */
export function parseConsoleScope(release: ReleaseItem | null | undefined): ConsoleScope | null {
  const keys = release?.consoleKeys
  if (!keys || keys.length === 0) return null
  const factory = keys.filter((k) => k.startsWith('tf:')).map((k) => k.slice(3))
  const billing = keys.filter((k) => k.startsWith('billing:')).map((k) => k.slice('billing:'.length))
  return { factory: factory.length ? factory : null, billing: billing.length ? billing : null }
}

export const RELEASES: Record<string, ReleaseItem> = {
  /** ===== 首个完整版本（2026-08-17）：全量功能 ===== */
  'v1.0.0': {
    title: 'v1.0.0 首个完整版本',
    routeKeys: ['*'],
    note: '渠道商 / 账户 / 模型 / 资源包 / 定时充值任务 / 设计规范',
    publishedAt: '2026-08-17',
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
    publishedAt: '',
  },

  /** ===== v1.2.0：Token Plan FAQ + 调整配额功能迭代（2026-08-20） ===== */
  'v1.2.0': {
    title: 'v1.2.0 Token Plan FAQ & 调整配额迭代',
    routeKeys: ['tokenPlan', 'accountList'],
    views: ['admin', 'console'],
    publishedAt: '2026-08-20',
    note: [
      '1. [tokenPlan]控制台 Token Plan 概览页：FAQ内容更新、使用步骤样式优化',
      '2. [accountList]管理后台账户列表：调整配额弹窗支持模型多选、批量替换、限额等级验证',
    ].join('\n'),
  },

  /** ===== v1.3.0：资源包购买 + 用量统计 + Token Plan 订阅迭代（2026-08-25） ===== */
  'v1.3.0': {
    title: 'v1.3.0 资源包购买 & 用量统计 & 订阅迭代',
    routeKeys: ['tokenPlan'],
    views: ['admin', 'console'],
    publishedAt: '2026-08-25',
    note: [
      '1. [tokenPlan]资源包购买：订单摘要新增原价/优惠明细，支付跳转微信支付页',
      '2. [tokenPlan]资源包购买：协议文案改为「套餐购买协议」，去掉演示环境提示',
      '3. [tokenPlan]用量统计：模型筛选新增「全部」选项，默认选中全部模型',
      '4. [tokenPlan]我的订阅：API KEY 升级为列表管理（增删/重置/显隐/复制）',
      '5. [tokenPlan]我的订阅：模型列表操作列调整（查看详情/复制Model ID）',
      '6. [tokenPlan]管理后台：套餐弹窗「推荐标签」开关改为「产品标签」输入框（最多6字）',
    ].join('\n'),
  },

  /** ===== 2.0：定时充值任务受众类型 & 已执行任务 & 选择账户搜索迭代（2026-08-31 发布） ===== */
  '2.0': {
    title: '2.0 定时充值任务迭代',
    routeKeys: ['rechargeTask'],
    views: ['admin'],
    publishedAt: '2026-08-31',
    note: [
      '1. [rechargeTask]新增/编辑任务：增加任务受众类型（按标签/按用户）',
      '2. [rechargeTask]操作栏：新增「已执行任务」按钮，移除「编辑覆盖账户」',
      '3. [rechargeTask]已执行任务弹窗：展示运行时间、状态、已执行/目标账户数',
      '4. [rechargeTask]列表新增「任务受众类型」列：按标签/按用户展示',
    ].join('\n'),
  },

  /** ===== 2.1：模型倍率体系 + 渠道性能 + Token工厂控制台迭代（2026-09-14 发布） ===== */
  '2.1': {
    title: '2.1 模型倍率与渠道性能迭代',
    routeKeys: ['models', 'modelGroups', 'channels', 'channelModels', 'modelHourlyPerf', 'channelBill', 'userConsumeBill', 'channelFeeDetail'],
    consoleKeys: ['tf:plaza', 'tf:experience', 'tf:apiKey', 'tf:myGroups', 'billing:consumption'],
    views: ['admin', 'console'],
    publishedAt: '2026-09-14',
    note: [
      '1. [models]模型列表：API 配置口径统一为「渠道 - API - 倍率名称 - 倍率x」，新增「是否可用」状态',
      '· 删除模型时同步将其从所有模型分组中移出',
      '2. [modelGroups]模型分组（管理后台）：新增页面，官方分组 / 用户自定义分组双 Tab',
      '· 列表展示分组名称、组内模型信息（模型名称 / 渠道 / 倍率）、描述、是否对外展示、展示顺序、操作人、用户信息',
      '· 新增/编辑分组弹窗按倍率名称、倍率、渠道、API 名称、模型类型、生产商筛选挑选模型',
      '3. [channels]渠道商管理：单个渠道支持配置多组 API，状态、倍率、操作人下沉到 API 维度',
      '· API Key 默认脱敏，行内支持显示/隐藏与一键复制',
      '4. [channelModels]渠道模型管理：列表新增模型最新状态、24h 成功率、平均延迟、TTFT、TPOT',
      '· 行内「查看性能」弹窗展示 TPS、首 Token 延迟、每 Token 生成耗时等指标，可跳转小时明细',
      '5. [modelHourlyPerf]模型性能明细（小时）：新增页面，按小时粒度展示请求量、成功率与延迟分位',
      '· 从「查看性能」弹窗点「查看全部」自动带入渠道 + 模型并搜索',
      '6. [channelBill]渠道对账单：结算口径由「API 数」改为「API 启用数」',
      '7. [userConsumeBill]用户消费账单：新增页面，账单管理 › 用户消费账单，逐条展示用户模型调用与扣账',
      '· 搜索区支持月份快捷区间、自定义起止时间、渠道、操作人 ID、扣账账户 ID/手机号、账户类型、模型、调用状态、资源包',
      '· 调用明细列表：操作人与扣账账户分列展示（手机号/账户 ID/API Key 脱敏）、模型三行（模型 + 端点 + 渠道别名倍率）',
      '· 计费项按「输入 / 输出 / 缓存 / 缓存创建 / 缓存读取」逐项拆分用量与费用，另含媒体信息、资源包、调用状态',
      '· 「调用时间」后新增「倍率信息」列：展示倍率名称与倍率（取自模型 API 配置）',
      '· 右上角「导出数据」按当前筛选结果导出 CSV',
      '8. [tf:plaza]模型广场：卡片式模型列表 + 模型详情页',
      '· 分档定价按「倍率名称」展开档位，展示模型倍率、成功率、延迟、吞吐、所属分组',
      '· 档位支持「加入分组」，一个分组只允许加入一个模型的一种倍率，冲突时给出提示',
      '· 接入示例展示 API Key（含关联分组）、Rate Limits 与多语言调用示例',
      '9. [tf:apiKey]API Key 管理：创建密钥支持选择模型分组，分组名悬浮展示组内模型倍率',
      '· 密钥脱敏展示，支持显示/隐藏与复制；密钥列表持久化',
      '10. [tf:myGroups]模型分组（控制台）：我的分组 / 官方分组双 Tab',
      '· 我的分组：支持增删改查、每人限 10 个、组内模型可查看详情与移除（二次确认）',
      '· 组内模型信息点击展示「模型名称 / 倍率名称 / 倍率 / 模型价格详情」列表',
      '· 官方分组：只读展示分组名称、组内模型、模型倍率、价格、描述，无操作列',
      '11. [tf:experience]体验语言模型：新增聊天体验台',
      '· 模型选择改为「模型 → 档位 - 倍率」级联选择',
      '· 模型对比：整页多模型并排对比，模型信息前支持选择 API 密钥',
      '12. [billing:consumption]费用 › 消费明细：计费项拆分为「用量 + 费用」两行',
      '· 产品名称后新增「倍率信息」列（倍率名称 + 倍率），顶部汇总新增「费用总额（元）」',
      '13. [channelFeeDetail]渠道费用明细：「计费方式」后新增「倍率信息」列（倍率名称 + 倍率）',
    ].join('\n'),
  },
}

export const LATEST_RELEASE = Object.keys(RELEASES).slice(-1)[0] ?? 'v1.0.0'
