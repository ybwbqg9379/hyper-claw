# Hyper-Claw 开发工作流

Hyper-Claw 基于 [OpenClaw](https://github.com/openclaw/openclaw) fork，本文档说明如何同步 upstream 更新并维护自定义功能。

> **与 upstream 冲突说明**：本文档及 `docs/hyper-claw/` 目录为 hyper-claw 专属，upstream 不会创建同名文件，合并时不会产生冲突。

## Remote 配置

| Remote       | 地址                                           | 用途                |
| ------------ | ---------------------------------------------- | ------------------- |
| **origin**   | `https://github.com/ybwbqg9379/hyper-claw.git` | 你的 fork，推送代码 |
| **upstream** | `https://github.com/openclaw/openclaw.git`     | 官方仓库，拉取更新  |

若 fork 地址不同，修改：`git remote set-url origin https://github.com/<用户名>/<仓库名>.git`

## 重要：main 分支跟踪配置

**main 必须跟踪 origin/main**，否则 GitHub Desktop 的「Push upstream」会误推送到 openclaw 官方（无权限）。

```bash
git branch --set-upstream-to=origin/main main
```

配置后，GitHub Desktop 的「Push upstream」会正确推送到你的 fork。

## 日常开发

```bash
git checkout main
# ... 编写代码 ...
git add .
git commit -m "feat: 你的功能描述"
git push origin main   # 或 GitHub Desktop 点 Push upstream
```

## 同步 Upstream 更新

**不会自动执行**，需手动操作。建议时机：官方发版、需要 bug 修复、或定期（如每周）同步。

```bash
git fetch upstream
git merge upstream/main
# 有冲突则解决后 commit
git push origin main
```

## 推荐分支策略

- **main**：与 upstream 保持同步
- **feature/xxx**：新功能
- **fix/xxx**：修复 bug

```bash
git checkout -b feature/my-skill main
# 开发完成后
git checkout main && git merge feature/my-skill && git push origin main
```

## 自定义功能放置建议

为减少合并冲突，建议放在：

- `extensions/` — 扩展
- `skills/` — 技能
- `packages/` 下新建独立包

## Commit Message 规范

遵循 upstream OpenClaw 的约定，支持两种格式：

### 格式 1：Conventional Commits（推荐）

```
type(scope): 描述
```

**允许的 type**：`feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`, `security`, `style`, `revert`, `bug`

**示例**：

```
feat(telegram): add per-topic agent routing
fix(gateway): preserve route inheritance for session keys
docs: update changelog
chore(release): cut 2026.3.2
test(discord): align bound-thread target kind
```

### 格式 2：Free-form 前缀（用于组件级变更）

```
Component: 描述
```

**示例**：

```
Extensions: migrate plugin-sdk imports
Plugins/whatsapp: migrate to scoped imports
Runtime: stabilize tool/run state transitions
Compaction/Safeguard: preserve recent turns verbatim
```

### 规则

- Subject ≤ 100 字符
- 结尾不加句号
- Merge / Revert / fixup! / squash! 自动跳过验证
- 通过 `commit-msg` hook 自动检查（`pre-commit install --hook-type commit-msg`）

## 常用命令速查

```bash
git remote -v
git fetch upstream && git merge upstream/main
git log main..upstream/main --oneline
```
