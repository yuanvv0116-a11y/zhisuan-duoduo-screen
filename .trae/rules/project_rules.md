# 智算多多 · 渠道商管理原型 — 项目规则

> 本文件是本项目的**长期约束**。任何迭代（新增页面、修改样式、加字段）都必须先读本文件并严格遵守，以保证跨会话的风格统一。定位：**需求原型**（风格统一优先，不做过度工程化拆分）。

## 0. 技术栈与运行
- Vite + React 18 + TypeScript + Ant Design 5（antd）+ zhCN locale。
- 状态：localStorage 存储 + useSyncExternalStore（见 `src/store.ts`），无后端。
- 开发服务器端口：**5180**（`npm run dev -- --port 5180 --strictPort`，5173 常被占用）。
- **统一访问地址 `http://localhost:5180/`**：汇报、回归、发给用户的地址一律用它，禁止附加 `?t=xxx` 之类 cache-busting 查询参数。
- 「地址没变但改动不生效」优先怀疑 dev server 进程跑太久导致 watch/模块缓存失效（曾出现进程跑 21 天的情况），重启 dev server 即可解决，不要归因于用户浏览器缓存。
- **「部署本地」≠ 发布线上（重要，用户明确纠正过）**：用户说「部署本地 / 把本地代码部署一下」= 只启动/重启本地 dev server（`http://localhost:5180/`），**禁止** commit+push 到 `182.92.106.90:9001`。线上发布仅在用户明确说「上线 / 发布线上 / 部署线上」时才执行。
- 每次改完必须跑 `npx tsc -b --pretty false` 校验通过（开启 noUnusedLocals，未使用的 import/变量要清理）。
- 部署：`vite.config.ts` 固定 `base: './'`（产物用相对路径），`npm run build` 后的 `dist/` 是纯静态目录，可直接放到任意静态服务器的站点根目录或子目录（如 `/proto/`），无需重新构建。评审入口靠 URL 查询参数（`?review=<version>`），不依赖 history 路由，因此**不需要 SPA rewrite**。

## 0.1 部署信息速查（固定事实，跨会话直接引用，勿删）
- **项目**：`package.json` name `zhisuan-channel-settlement`（页面标题「智算多多 · 渠道结算中心」）；纯静态 SPA，无后端，数据存各自浏览器 localStorage。
- **线上入口**：完整版 `http://182.92.106.90:9001/`；评审版 `http://182.92.106.90:9001/?review=<版本>`（当前已发布至 `2.6`，评审版 `?review=2.6`）。裁剪配置在 `src/releases.ts` 的 `RELEASES`（新版本必须加在对象末尾，`LATEST_RELEASE` 取最后一个 key）。
- **服务器**：阿里云 ECS `182.92.106.90`，`root` 登录；**密码不入本文件**——本机 `~/.ssh/id_ed25519.pub` 已加入服务器 `authorized_keys`，可 `ssh root@182.92.106.90` 免密。Alibaba Cloud Linux 3；git 2.43.7、node v24.8.0、npm 11.6.0、nginx 1.24.0；2 核 / 可用内存约 1.3G / 磁盘 40G 用 15%。
- **服务器落点**：源码仓库 `/var/www/zhisuan-duoduo/repo`（checkout 分支 `v2.1`）；线上产物 `/var/www/zhisuan-duoduo/dist`；上一版备份 `dist_prev`（回滚：`mv dist_prev dist` 后 reload）；发布脚本 `deploy.sh`；发布日志 `deploy.log`；站点配置 `/etc/nginx/conf.d/zhisuan-duoduo.conf`（`listen 9001`、gzip、html no-cache、`try_files` 回退）。
- **git 远端**：`origin` = `git@github.com:yuanvv0116-a11y/zhisuan-duoduo-screen.git`（2026-10-10 起由 https 改为 SSH，原 https token 已失效；本机 `~/.ssh/id_ed25519` 已加入 GitHub 账号 SSH keys）；`deploy` = `ssh://root@182.92.106.90/var/www/zhisuan-duoduo/repo`。
- **发布方式（首选）**：`git commit` → `git push deploy v2.1` → 服务器 `post-receive` 钩子自动 `npm run build` → 原子切换 dist → `nginx -t && systemctl reload nginx`，约 40 秒；构建失败线上保持原版本。手动发布：`bash /var/www/zhisuan-duoduo/deploy.sh`。
- **分支现状**：本地工作分支 `v2.2`（自 `v2.1` 拉出，尚未推远端）；**服务器部署分支固定为 `v2.1`**（`deploy.sh` 里 `BRANCH=${DEPLOY_BRANCH:-v2.1}`，`receive.denyCurrentBranch=updateInstead` 的非裸仓库），所以发布时必须把提交推到 `v2.1`：`git push origin v2.2:v2.1 && git push deploy v2.2:v2.1`；`main` 本地领先远端 16 个提交、`new-features` 与远端分叉，推这两个需先向用户确认；`.github/workflows/deploy.yml`（Actions 用 sshpass 传 dist，依赖 `ALIYUN_HOST/USER/PASSWORD/PORT`+`DEPLOY_PATH` secrets）目前未纳入版本控制，现发布链路不依赖它。
- **多版本并行 / 混合改动发布模型（长期机制，用户已拍板，必须照做）**：会持续并行开发多个版本、改动经常混在同一工作区，发布时按下面流程剥离，**绝不为了发布去动工作区未提交的改动**：
  1. **日常纪律**：一个 commit 尽量只属于一个版本号，message 前缀标版本（如 `feat(2.7): ...`）；未提交改动＝天然未发布，留在工作区即可，不阻塞任何版本发布。
  2. **纯未提交场景**：要发的内容都已提交、工作区是更高版本的未提交改动 → 直接把当前分支推 `v2.1` 即可（未提交改动不会跟走）。
  3. **已提交混入场景**（HEAD 里混有更高版本代码）：用 worktree 隔离发布，不在工作区里 revert——`git worktree add /tmp/zhisuan-release-<版本> -b release-<版本> <发布切点提交>` → `git revert --no-edit <混入的高版本提交>`（可多个）→ 在 worktree 里改 `releases.ts` 填发布日期 → 软链主项目 `node_modules`、删 `tsconfig.tsbuildinfo`、跑 `npx tsc -b --pretty false` + `npm run build` 验证 → commit → `git push deploy release-<版本>:v2.1` 触发自动发布 → `git push origin release-<版本>` 备份 → 核验线上后 `git worktree remove` 清理。
  4. **revert 的后遗症（关键）**：release 分支上的 revert 只存在于发布线。以后发布更高版本时，先把 release 分支合回工作分支（`git merge v2.1`），revert 会试图删掉那部分高版本代码——**合并时以高版本代码为准**（对被 revert 的提交做 revert-the-revert，或直接用工作区文件覆盖），确认无误再推 `v2.1`。
  5. **本次事实登记（2026-10-15）**：已按此模型发布 2.4/2.5/2.6（commit `b6a9bac`，分支 `release-26`，推到了 `v2.1`），其中 revert 了 `017d3b0`（2.7 混入：SHOW_ENTERPRISE、PlanModelConfig、官网套餐改版等）。**发 2.7 前必须先把 `v2.1`（含该 revert）合回 `v2.2` 并恢复 2.7 代码**，否则 2.7 发布会把已写好的功能又发没了。2.5 一并标发布是因为切点 `f504c01` 本身含 2.5（Token工厂用量）代码，不可拆。
  6. **发布线额外裁剪（2026-10-15，commit `1617b6a`）**：应用户要求，线上（含所有评审版）**看不到 Token Plan / 资源包菜单和页面本身**——`release-26` 在 `App.tsx` 删掉了 FULL_MENU 四项（资源包管理、Token Plan、资源包与套餐统计、套餐与资源包账单）和控制台顶部「Token Plan」导航 span（页面组件代码保留、仅无入口）。**发 2.7 合回 `v2.1` 时以 `v2.2` 工作区 `App.tsx` 为准恢复这些菜单入口**（同第 4 条 revert 后遗症处理）。
- **端口占用（新增站点前先避让）**：`22` sshd；`80` nginx → `/var/www/kresta-ai`（`kresta-ai.conf`，`server_name xiatm.work`，**别的项目不可动**）；`8000` python 服务（curl 返回 401 属正常）；`9001` 本项目（安全组已放行）；`9000` 被安全组拦截勿用。
- **网络注意**：本机与服务器访问 `github.com:443` 偶发超时，推 GitHub 失败先重试；`git push deploy` 走 22 端口不受影响。

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
- **列表卡**（独立白卡）：卡头左「XX 列表」标题，右「+ 新增XX」主色按钮；下方 Table。**卡头标题旁不加任何小说明**（总数、「共 N 条记录」「N 条待审核」等一律不写）。

## 4. 组件用法约定
- 卡片：`variant="borderless"`，body padding 16，卡片间距 16。
- 表格 Table：`rowKey`；`pagination` 用 `showTotal: t => 共 ${t} 条记录`；`scroll={{ x: 'max-content' }}`；首列与「操作」列 `fixed`；超长字段 `ellipsis` + `Tooltip`；**空值统一显示 `—`**（`<Text type="secondary">—</Text>`）。
- 敏感字段（如 API Key）：默认脱敏（首尾各 4 位 + `****`），行内提供「显示/隐藏」👁 与「复制」📋 两个 text 图标按钮。优先复用 `SecretCell`。
- 状态字段：列表内用 `Switch`（size small，启用/停用）直接切换。
- 操作列：`type="link"` 文字按钮「编辑 / 删除」，删除必须 `Popconfirm` 二次确认。
- 弹窗：新增/编辑用 `Modal`（`centered`、`width` 约 520、`destroyOnClose`、okText「保存」cancelText「取消」），**不用右侧 Drawer**。表单 `layout="vertical"`。**弹窗标题只写弹窗名称本身（如「执行记录」），不拼接任务名/ID/模型名等额外信息。**

## 5. 文案与交互习惯
- **版本需求表（`releases.ts` 的 `note` + `VersionChangelog.tsx`）写法**：每个菜单/页面一条，格式 `N. [routeKey]需求描述`，**不加 `·` 副行**。需求描述 = 一句话说明这个菜单改了什么能力，句式参照「增加分销活动菜单，支持增删改查活动。支持为活动配置分佣模型，支持分享活动链接，查看活动数据」——**既不写空泛主题（如"页面重构""交互完善"），也不堆字段/样式/按钮级细节**（列表字段、弹窗字段、颜色、按钮移位一律不写）。表格三列为「平台（管理后台/控制台/官方网站/全局）/ 功能地址（菜单路径）/ 需求简述」，平台与菜单由 routeKey 自动映射，不要写进描述文字里。
- 实体统一称「渠道商」。
- 操作反馈用 `message.success/error`：如「已复制」「渠道已启用」「渠道已停用」「渠道已创建/更新」「已删除」。
- 字段值有无：一定有值的字段（如操作人 operator）直接展示；可能为空的字段（联系人/联系方式/备注）用 `—` 兜底。
- **「需求内容」只标注、不改功能（长期约定）**：凡是指令里写了「需求内容：…」的（典型句式「XX 后增加需求红点，需求内容：…」），一律**只加 `RequirementDot` 红点、把需求原文逐字放进弹窗**，不据此修改任何功能、逻辑或种子数据；即使需求描述与现状不一致（如金额口径、计算规则对不上），也只在回复中反馈差异、给出选项，等用户明确拍板后才动代码。只有「增加小字」「改为 XX 文案」这类直接 UI 指令才改界面本身。红点标注不登记 `releases.ts`。

## 6. 数据模型要点（见 `src/types.ts`）
- `Channel`：`name` 渠道名、`apiName` API名称、`apiUrl` API地址、`apiKey`、`status`(enabled/disabled)、`contact?`/`phone?`/`remark?` 选填、`operator` 操作人(必填,系统自动写入)、`createdAt`。
- 新增渠道弹窗字段：渠道名称/API名称/API地址/API Key 必填；联系人/联系方式/备注选填；渠道状态默认启用可关。
- `operator` 与 `createdAt` 由 store 在 `addChannel` 时自动写入，不在表单手填。
- localStorage key 目前为 `zsdd_channels_v14`（见 `src/store.ts`）；改动 seed 结构时递增版本号。

## 7. 迭代自查清单（每次改动前后过一遍）
- [ ] 主色/圆角/背景是否用了本文件 Token，没散写十六进制？
- [ ] 新列表页是否用了「面包屑+搜索卡+列表卡」骨架（PageShell）？
- [ ] 搜索是否「标签:控件 + 搜索/重置 + 点击才过滤」？
- [ ] 表格空值 `—`、超长 ellipsis+Tooltip、分页「共 N 条记录」？
- [ ] 敏感字段脱敏+显隐+复制（SecretCell）？状态用 Switch？删除有 Popconfirm？
- [ ] 新增/编辑用 Modal 不用 Drawer？
- [ ] **按钮文案就是按钮本身（如「批量设置」「批量开启」），后面不加数量/数字后缀**；选中数量等运行时信息如需提示，用 `message` 或文案说明，不拼进按钮文字。
- [ ] **列表卡头「列表就是列表」**：配置类列表不显示「共 N 个模型」等总数、也不在标题旁挂活动名/推广等标签（`PageShell` 用 `hideTotal`、不传 `titleExtra`）。
- [ ] `npx tsc -b` 通过、无未使用导入？
- [ ] 需要参考标准样式时，查看设计规范页 `src/pages/StyleGuide.tsx`。
