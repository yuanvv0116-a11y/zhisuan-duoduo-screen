# 智算多多 · 渠道商管理原型 — 项目规则

> 本文件是本项目的**长期约束**。任何迭代（新增页面、修改样式、加字段）都必须先读本文件并严格遵守，以保证跨会话的风格统一。定位：**需求原型**（风格统一优先，不做过度工程化拆分）。

## 0. 技术栈与运行
- Vite + React 18 + TypeScript + Ant Design 5（antd）+ zhCN locale。
- 状态：localStorage 存储 + useSyncExternalStore（见 `src/store.ts`），无后端。
- 开发服务器端口：**5180**（`npm run dev -- --port 5180 --strictPort`，5173 常被占用）。
- 每次改完必须跑 `npx tsc -b --pretty false` 校验通过（开启 noUnusedLocals，未使用的 import/变量要清理）。
- 部署：`vite.config.ts` 固定 `base: './'`（产物用相对路径），`npm run build` 后的 `dist/` 是纯静态目录，可直接放到任意静态服务器的站点根目录或子目录（如 `/proto/`），无需重新构建。评审入口靠 URL 查询参数（`?review=<version>`），不依赖 history 路由，因此**不需要 SPA rewrite**。

## 0.1 部署信息速查（固定事实，跨会话直接引用，勿删）
- **项目**：`package.json` name `zhisuan-channel-settlement`（页面标题「智算多多 · 渠道结算中心」）；纯静态 SPA，无后端，数据存各自浏览器 localStorage。
- **线上入口**：完整版 `http://182.92.106.90:9001/`；评审版 `http://182.92.106.90:9001/?review=<版本>`（当前 `?review=2.1`）。裁剪配置在 `src/releases.ts` 的 `RELEASES`（新版本必须加在对象末尾，`LATEST_RELEASE` 取最后一个 key）。
- **服务器**：阿里云 ECS `182.92.106.90`，`root` 登录；**密码不入本文件**——本机 `~/.ssh/id_ed25519.pub` 已加入服务器 `authorized_keys`，可 `ssh root@182.92.106.90` 免密。Alibaba Cloud Linux 3；git 2.43.7、node v24.8.0、npm 11.6.0、nginx 1.24.0；2 核 / 可用内存约 1.3G / 磁盘 40G 用 15%。
- **服务器落点**：源码仓库 `/var/www/zhisuan-duoduo/repo`（checkout 分支 `v2.1`）；线上产物 `/var/www/zhisuan-duoduo/dist`；上一版备份 `dist_prev`（回滚：`mv dist_prev dist` 后 reload）；发布脚本 `deploy.sh`；发布日志 `deploy.log`；站点配置 `/etc/nginx/conf.d/zhisuan-duoduo.conf`（`listen 9001`、gzip、html no-cache、`try_files` 回退）。
- **git 远端**：`origin` = `https://github.com/yuanvv0116-a11y/zhisuan-duoduo-screen.git`；`deploy` = `ssh://root@182.92.106.90/var/www/zhisuan-duoduo/repo`。
- **发布方式（首选）**：`git commit` → `git push deploy v2.1` → 服务器 `post-receive` 钩子自动 `npm run build` → 原子切换 dist → `nginx -t && systemctl reload nginx`，约 40 秒；构建失败线上保持原版本。手动发布：`bash /var/www/zhisuan-duoduo/deploy.sh`。
- **分支现状**：工作分支 `v2.1`（跟踪 `origin/v2.1`，已同步）；`main` 本地领先远端 16 个提交、`new-features` 与远端分叉，推这两个需先向用户确认；`.github/workflows/deploy.yml`（Actions 用 sshpass 传 dist，依赖 `ALIYUN_HOST/USER/PASSWORD/PORT`+`DEPLOY_PATH` secrets）目前未纳入版本控制，现发布链路不依赖它。
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
- localStorage key 目前为 `zsdd_channels_v14`（见 `src/store.ts`）；改动 seed 结构时递增版本号。

## 7. 迭代自查清单（每次改动前后过一遍）
- [ ] 主色/圆角/背景是否用了本文件 Token，没散写十六进制？
- [ ] 新列表页是否用了「面包屑+搜索卡+列表卡」骨架（PageShell）？
- [ ] 搜索是否「标签:控件 + 搜索/重置 + 点击才过滤」？
- [ ] 表格空值 `—`、超长 ellipsis+Tooltip、分页「共 N 条记录」？
- [ ] 敏感字段脱敏+显隐+复制（SecretCell）？状态用 Switch？删除有 Popconfirm？
- [ ] 新增/编辑用 Modal 不用 Drawer？
- [ ] `npx tsc -b` 通过、无未使用导入？
- [ ] 需要参考标准样式时，查看设计规范页 `src/pages/StyleGuide.tsx`。
