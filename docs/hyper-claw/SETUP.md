# Hyper-Claw 新机器设置指南

在新电脑上克隆并配置 hyper-claw 的完整步骤。

## 前置要求

- **Git** ≥ 2.x
- **Node.js** ≥ 22.x（推荐 `fnm` 或 `nvm` 管理版本）
- **pnpm** ≥ 10.x（`npm install -g pnpm`）
- **pre-commit**（可选，`pip install pre-commit` 或 `brew install pre-commit`）

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/ybwbqg9379/hyper-claw.git
cd hyper-claw

# 2. 添加 upstream remote（clone 不会自动带过来）
git remote add upstream https://github.com/openclaw/openclaw.git

# 3. 确认 main 跟踪 origin（防止误推到 upstream）
git branch --set-upstream-to=origin/main main

# 4. 安装依赖
pnpm install

# 5. 构建项目
pnpm build

# 6. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API keys（至少设置一个 Model Provider）

# 7. Git hooks 已自动生效
# 项目配置了 core.hooksPath=git-hooks，commit-msg 验证无需额外安装
# 可选：安装 pre-commit 获得更多检查（lint、format 等）
# brew install pre-commit && pre-commit install
```

## 环境变量说明

编辑 `.env` 文件，**至少设置一个** Model Provider：

| 变量                     | 说明                                         |
| ------------------------ | -------------------------------------------- |
| `OPENAI_API_KEY`         | OpenAI API key                               |
| `ANTHROPIC_API_KEY`      | Anthropic API key                            |
| `GEMINI_API_KEY`         | Google Gemini key                            |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway 认证 token（绑定非 loopback 时必需） |

完整列表见 [.env.example](../../.env.example)。

## 验证安装

```bash
# 检查 remote 配置
git remote -v
# 应显示 origin → hyper-claw, upstream → openclaw

# 运行测试
pnpm test

# 检查健康状态（如果配置了 gateway）
pnpm clawdbot health
```

## 后续同步 Upstream

参见 [WORKFLOW.md](./WORKFLOW.md) 或使用 `/update_clawdbot` workflow。

## macOS App（可选）

```bash
# 构建并启动 macOS 桌面应用
./scripts/restart-mac.sh

# 或仅打包
pnpm mac:package
```
