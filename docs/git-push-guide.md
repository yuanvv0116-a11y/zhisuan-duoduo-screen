# Git 推送与 Netlify 部署流程

> 当用户说「推到git」「推一下」「push」时，按此流程执行。

## 前置条件
- GitHub 仓库：`https://github.com/yuanvv0116-a11y/zhisuan-duoduo-screen.git`
- 已安装 `gh` CLI 并登录（`gh auth status` 验证）
- HTTPS 443 端口在当前网络环境下被拦截，**必须使用 gh token 嵌入 URL 的方式推送**

## 标准推送流程

### 1. 提交代码
```bash
cd "/Users/vivi/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a7adc79d6e4e3f0244813a1"
git add .
git commit -m "描述改动内容"
```

### 2. 推送到 dev 分支（使用 gh token 绕过 443 端口限制）
```bash
TOKEN=$(gh auth token)
git remote set-url origin "https://x-access-token:${TOKEN}@github.com/yuanvv0116-a11y/zhisuan-duoduo-screen.git"
git push origin dev
```

### 3. 合并到 main 分支（触发 Netlify 自动部署）
```bash
git checkout main
git merge dev -m "merge: 描述改动内容"
git push origin main
```

### 4. 恢复 remote URL（清除 token）
```bash
git remote set-url origin "https://github.com/yuanvv0116-a11y/zhisuan-duoduo-screen.git"
```

## Netlify 自动部署
- Netlify 监听 main 分支，有新提交时自动触发构建
- 构建配置：`npm run build` → 输出 `dist` 目录
- 构建完成后自动发布到线上环境

## 注意事项
- 每次推送前先跑 `npx tsc -b --pretty false` 确保 TypeScript 编译通过
- 推送成功后恢复 remote URL，避免 token 泄露
- 如果 `gh auth token` 报错，先执行 `gh auth login` 重新登录