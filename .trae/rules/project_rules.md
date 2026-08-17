# 智算多多 · 渠道商管理原型 — 项目规则

> 本文件是本项目的**长期约束**。任何迭代（新增页面、修改样式、加字段）都必须先读本文件并严格遵守，以保证跨会话的风格统一。定位：**需求原型**（风格统一优先，不做过度工程化拆分）。

## 0. 技术栈与运行
- Vite + React 18 + TypeScript + Ant Design 5（antd）+ zhCN locale。
- 状态：localStorage 存储 + useSyncExternalStore（见 `src/store.ts`），无后端。
- 开发服务器端口：**5180**（`npm run dev -- --port 5180 --strictPort`，5173 常被占用）。
- 每次改完必须跑 `npx tsc -b --pretty false` 校验通过（开启 noUnusedLocals，未使用的 import/变量要清理）。

## 1. 设计 Token（唯一来源）
- 主色（品牌蓝）：`#2f6bff` —— 按钮、Logo、选中态、Switch、链接、主操作。
- 圆角：`borderRadius: 8`。
- 页面背景：`#f0f2f5`；卡片 / Header / Sider：白色 `#fff`。
- 分割线：`#eef0f4`（主）/ `#f0f0f0`。
- 文字：正文深灰 `#333`；次要信息用 `<Text type="secondary">`（灰）。
- 主题统一在 `src/main.tsx` 的 ConfigProvider 配置，禁止在页面里散写主色十六进制。

## 2. 整体布局（对齐真实智算多多后台）
从外到内固定为三块：
1. **顶部 Header**（56px，白底）：`智` 方块 Logo +「智算多多后台管理系统」+ 快捷入口（官方网站 / Token工厂）+ 右上账号下拉（admin2）。
2. **左侧 Sider**（200px，`theme="light"` 浅色白底，inline 多级菜单）：选中项蓝字。菜单**按需精简**，当前仅「渠道管理 › 渠道商管理」，新增菜单往 `App.tsx` 的 `items` 里加。
3. **右侧内容区**（浅灰底，padding 16）：面包屑 → 搜索卡片 → 列表卡片。

## 3. 页面结构规范（列表页）
统一使用「面包屑 + 搜索卡 + 列表卡」骨架，优先复用 `src/components/PageShell.tsx`：
- **面包屑**：体现层级，如「渠道管理 / 渠道商管理」。
- **搜索卡**（独立白卡）：每个条件用「标签：+ 控件」形式，一行排列；末尾放主色「搜索」+ 默认「重置」按钮；**点击搜索才过滤，不做实时过滤**；输入框回车等同搜索。
- **列表卡**（独立白卡）：卡头左「XX 列表 +『共 N 条记录』」，右「+ 新增XX」主色按钮；下方 Table。

## 4. 组件用法约定
- 卡片：`variant="borderless"`，body padding 16，卡片间距 16。
- 表格 Table：`rowKey`；`pagination` 用 `showTotal: t => 共 ${t} 条记录`；`scroll={{ x: 'max-content' }}`；首列与「操作」列 `fixed`；超长字段 `ellipsis` + `Tooltip`；**空值统一显示 `—`**（`<Text type="secondary">—</Text>`）。
- 敏感字段（如 API Key）：默认脱敏（首尾各 4 位 + `****`），行内提供「显示/隐藏」👁 与「复制」📋 两个 text 图标按钮。优先复用 `SecretCell`。
- 状态字段：列表内用 `Switch`（size small，启用/停用）直接切换。
- 操作列：`type="link"` 文字按钮「编辑 / 删除」，删除必须 `Popconfirm` 二次确认。
- 弹窗：新增/编辑用 `Modal`（`centered`、`width` 约 520、`destroyOnClose`、okText「保存」cancelText「取消」），**不用右侧 Drawer**。表单 `layout="vertical"`。

## 5. 文案与交互习惯
- 实体统一称「渠道商」。
- 操作反馈用 `message.success/error`：如「已复制」「渠道已启用」「渠道已停用」「渠道已创建/更新」「已删除」。
- 字段值有无：一定有值的字段（如操作人 operator）直接展示；可能为空的字段（联系人/联系方式/备注）用 `—` 兜底。

## 6. 数据模型要点（见 `src/types.ts`）
- `Channel`：`name` 渠道名、`apiName` API名称、`apiUrl` API地址、`apiKey`、`status`(enabled/disabled)、`contact?`/`phone?`/`remark?` 选填、`operator` 操作人(必填,系统自动写入)、`createdAt`。
- 新增渠道弹窗字段：渠道名称/API名称/API地址/API Key 必填；联系人/联系方式/备注选填；渠道状态默认启用可关。
- `operator` 与 `createdAt` 由 store 在 `addChannel` 时自动写入，不在表单手填。
- localStorage key 目前为 `zsdd_channels_v5`；改动 seed 结构时递增版本号。

## 7. 迭代自查清单（每次改动前后过一遍）
- [ ] 主色/圆角/背景是否用了本文件 Token，没散写十六进制？
- [ ] 新列表页是否用了「面包屑+搜索卡+列表卡」骨架（PageShell）？
- [ ] 搜索是否「标签:控件 + 搜索/重置 + 点击才过滤」？
- [ ] 表格空值 `—`、超长 ellipsis+Tooltip、分页「共 N 条记录」？
- [ ] 敏感字段脱敏+显隐+复制（SecretCell）？状态用 Switch？删除有 Popconfirm？
- [ ] 新增/编辑用 Modal 不用 Drawer？
- [ ] `npx tsc -b` 通过、无未使用导入？
- [ ] 需要参考标准样式时，查看设计规范页 `src/pages/StyleGuide.tsx`。
