# Hyper-Claw 开发工作流

Hyper-Claw 基于 [OpenClaw](https://github.com/openclaw/openclaw) fork，本文档说明如何同步 upstream 更新并维护自定义功能。

## Remote 配置

| Remote   | 地址                              | 用途           |
| -------- | --------------------------------- | -------------- |
| **origin**   | `https://github.com/ybwbqg9379/hyper-claw.git` | 你的 fork，推送自定义代码 |
| **upstream** | `https://github.com/openclaw/openclaw.git`    | 官方仓库，拉取更新     |

## 首次推送前

在 GitHub 上创建 fork：

1. 打开 https://github.com/openclaw/openclaw
2. 点击 **Fork**，选择你的账号
3. 将 fork 的仓库命名为 `hyper-claw`（或保持 `openclaw` 后自行重命名）

若 fork 地址与 `origin` 不同，可修改：

```bash
git remote set-url origin https://github.com/<你的用户名>/<仓库名>.git
```

## 日常开发

```bash
# 在 main 或 feature 分支开发
git checkout main
# ... 编写代码 ...
git add .
git commit -m "feat: 你的功能描述"
git push origin main
```

## 同步 Upstream 更新

当 OpenClaw 发布新版本或你希望拉取最新改动时：

```bash
# 1. 拉取 upstream 最新代码
git fetch upstream

# 2. 合并到当前分支（推荐）
git merge upstream/main

# 或使用 rebase 保持线性历史
# git rebase upstream/main

# 3. 解决冲突（如有）
# 编辑冲突文件后：
# git add .
# git rebase --continue   # 若使用 rebase
# 或直接完成 merge 提交

# 4. 推送到你的 fork
git push origin main
```

## 推荐分支策略

- **main**：与 upstream 保持同步，用于合并 upstream 更新
- **feature/xxx**：开发新功能，完成后合并回 main
- **fix/xxx**：修复 bug

```bash
# 新建功能分支
git checkout -b feature/my-custom-skill main

# 开发完成后合并
git checkout main
git merge feature/my-custom-skill
git push origin main
```

## 自定义功能放置建议

为减少与 upstream 合并时的冲突，建议将自定义逻辑放在：

- `extensions/` — 扩展
- `skills/` — 技能
- 新建 `packages/` 下的独立包

## 常用命令速查

```bash
# 查看 remote
git remote -v

# 拉取 upstream 更新
git fetch upstream && git merge upstream/main

# 查看与 upstream 的差异
git log main..upstream/main --oneline
```
