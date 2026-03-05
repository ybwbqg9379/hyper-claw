# Hyper-Claw 新机器设置指南

在新电脑上克隆并配置 hyper-claw 的完整步骤。

## 前置要求

- **Git** ≥ 2.x
- **Node.js** ≥ 22.x（推荐 `fnm` 或 `nvm` 管理版本）
- **pnpm** ≥ 10.x（`npm install -g pnpm`）
- **llama.cpp**（可选，本地模型推理。`brew install llama.cpp`）
- **pre-commit**（可选，`pip install pre-commit` 或 `brew install pre-commit`）
- **Homebrew**（macOS/Linux，安装 Skills 所需的 CLI 工具）

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

> 💡 使用本地模型（llama.cpp）时不需要任何 API key，详见下方[本地 LLM 模型](#本地-llm-模型llamacpp)章节。

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

---

## Workspace 文件体系

OpenClaw 的 workspace 是 agent 的"大脑"——人格、行为规则、记忆全部存放在这里。

### 文件结构

```
~/.openclaw/workspace/
├── SOUL.md          # 角色灵魂：人格定义、行为准则、输出质量底线
├── IDENTITY.md      # 快速参考卡：名字、角色、能力边界
├── USER.md          # 用户画像：偏好、项目、工作习惯
├── AGENTS.md        # 运行手册：会话启动流程、记忆管理规范
├── TOOLS.md         # 工具清单：本地 LLM、渠道配置、常用命令
├── MEMORY.md        # 长期记忆：稳定偏好、血泪教训、项目知识
├── HEARTBEAT.md     # 心跳规范：定期检查清单
└── memory/          # 每日流水日志
    └── YYYY-MM-DD.md
```

### 从模板初始化

```bash
# 首次配置（如果 workspace 文件需要重置或新机器初始化）
cp -r docs/hyper-claw/workspace-templates/* ~/.openclaw/workspace/

# Strategist（第二 agent）workspace
mkdir -p ~/.openclaw/workspace-strategist/memory
cp -r docs/hyper-claw/workspace-templates-strategist/* ~/.openclaw/workspace-strategist/
# 共享文件从主 workspace 复制
cp ~/.openclaw/workspace/{USER,AGENTS,TOOLS,HEARTBEAT}.md ~/.openclaw/workspace-strategist/
```

### 文件说明

| 文件           | 层级   | 说明                                |
| -------------- | ------ | ----------------------------------- |
| `SOUL.md`      | 身份层 | 定义 agent 是谁、怎么做事、质量底线 |
| `IDENTITY.md`  | 身份层 | 名片式快速参考                      |
| `USER.md`      | 身份层 | 了解服务对象，随使用迭代更新        |
| `AGENTS.md`    | 操作层 | 每次 session 的标准流程             |
| `TOOLS.md`     | 操作层 | 环境特定的工具和配置记录            |
| `HEARTBEAT.md` | 操作层 | 周期性自检任务清单                  |
| `MEMORY.md`    | 知识层 | 蒸馏后的长期记忆（≤5000字）         |
| `memory/*.md`  | 知识层 | 原始每日日志（仅加载今天+昨天）     |

> 💡 这些文件不在 git 仓库内，不会影响 upstream 合并。模板副本保存在 `docs/hyper-claw/workspace-templates/`。

### 双 Agent 架构

项目使用 **执行者 + 策略师** 双 Agent 模式，共享一个飞书 Bot：

| Agent             | ID               | Workspace                          | 职责                           |
| ----------------- | ---------------- | ---------------------------------- | ------------------------------ |
| **Claw 🦞**       | `claw` (default) | `~/.openclaw/workspace`            | 日常操作、日历、TODO、文件管理 |
| **Strategist 🧠** | `strategist`     | `~/.openclaw/workspace-strategist` | 深度分析、研究报告、方案设计   |

在 TUI 中用 `/agent strategist` 切换到策略师模式。

### Session 隔离与 Heartbeat

在 `openclaw.json` 中配置：

```json
{
  "session": {
    "dmScope": "per-account-channel-peer"
  },
  "agents": {
    "defaults": {
      "model": "local/unsloth/Qwen3.5-4B-GGUF:Q4_K_M",
      "heartbeat": {
        "every": "30m",
        "target": "last"
      }
    },
    "list": [
      { "id": "claw", "default": true, "workspace": "~/.openclaw/workspace" },
      { "id": "strategist", "workspace": "~/.openclaw/workspace-strategist" }
    ]
  }
}
```

- `dmScope: per-account-channel-peer`：私聊按账号+渠道+对端三维隔离
- `heartbeat.every: 30m`：每 30 分钟执行 `HEARTBEAT.md` 清单
- `agents.defaults.model`：所有 agent 默认使用本地模型

---

## 本地 LLM 模型（llama.cpp）

通过 `llama-server` 部署本地模型，OpenClaw 作为前端调用。零 API 费用，数据不出本机。

### 前置要求

- **llama.cpp**：
  - macOS: `brew install llama.cpp`
  - Linux: `apt install llama.cpp` 或[源码编译](https://github.com/ggml-org/llama.cpp#build)（推荐 `cmake -DGGML_CUDA=ON` 启用 NVIDIA GPU）
  - Windows: `winget install ggml-org.llama.cpp` 或[源码编译](https://github.com/ggml-org/llama.cpp#build)（需 CUDA Toolkit）
- **GGUF 模型文件**（首次运行 alias 会自动从 HuggingFace 下载并缓存）
  - macOS: `~/Library/Caches/llama.cpp/`
  - Linux: `~/.cache/llama.cpp/`
  - Windows: `%LOCALAPPDATA%\llama.cpp\`

### Shell Aliases

添加到 shell 配置文件（macOS: `~/.zshrc`，Linux: `~/.bashrc`）：

```bash
# Qwen3-8B (Q6_K, ~6GB)
alias claw-qwen3='llama-server -hf Qwen/Qwen3-8B-GGUF:Q6_K -ngl 99 --port 1234 --host 127.0.0.1 -c 32768 --reasoning-format none --reasoning-budget 0 -np 2 --log-prefix --log-timestamps'

# Qwen3.5-4B (Q4_K_M, ~2.5GB) — 推荐日常使用，256K 上下文，多模态视觉
alias claw-qwen3-5-4B='llama-server -hf unsloth/Qwen3.5-4B-GGUF:Q4_K_M -ngl 99 --port 1234 --host 127.0.0.1 -c 262144 --reasoning-format none --reasoning-budget 0 -np 2 --log-prefix --log-timestamps'

# Qwen3.5-9B (Q4_K_M, ~5GB)
alias claw-qwen3-5-9B='llama-server -hf unsloth/Qwen3.5-9B-GGUF:Q4_K_M -ngl 99 --port 1234 --host 127.0.0.1 -c 32768 --reasoning-format none --reasoning-budget 0 -np 2 --no-mmproj --log-prefix --log-timestamps'

# DeepSeek-R1-8B (Q8_0, ~8.5GB) — 推理模型，thinking 开启
alias claw-deepseek='llama-server -hf unsloth/DeepSeek-R1-0528-Qwen3-8B-GGUF:Q8_0 -ngl 99 --port 1234 --host 127.0.0.1 -c 32768 --reasoning-format deepseek --reasoning-budget -1 -np 2 --log-prefix --log-timestamps'
```

<details>
<summary>Windows PowerShell 等效命令（添加到 $PROFILE）</summary>

```powershell
function claw-qwen3-5-4B { llama-server -hf unsloth/Qwen3.5-4B-GGUF:Q4_K_M -ngl 99 --port 1234 --host 127.0.0.1 -c 262144 --reasoning-format none --reasoning-budget 0 -np 2 --log-prefix --log-timestamps }
function claw-qwen3-5-9B { llama-server -hf unsloth/Qwen3.5-9B-GGUF:Q4_K_M -ngl 99 --port 1234 --host 127.0.0.1 -c 32768 --reasoning-format none --reasoning-budget 0 -np 2 --log-prefix --log-timestamps }
function claw-deepseek { llama-server -hf unsloth/DeepSeek-R1-0528-Qwen3-8B-GGUF:Q8_0 -ngl 99 --port 1234 --host 127.0.0.1 -c 32768 --reasoning-format deepseek --reasoning-budget -1 -np 2 --log-prefix --log-timestamps }
```

</details>

> **参数说明**: `-ngl 99` 全部 offload 到 GPU；`-c` 上下文长度；`-np 2` 并发 slot 数；`--reasoning-format none --reasoning-budget 0` 关闭 thinking。
>
> **多模态视觉**: Qwen3.5 系列原生支持图像理解（early-fusion 训练）。不加 `--no-mmproj` 时 llama-server 会自动下载视觉投影层（额外 ~0.5-1GB 显存）。模型配置中需声明 `"input": ["text", "image"]`。
>
> **NVIDIA GPU 用户**: `-ngl 99` 同样适用。确保 llama.cpp 编译时启用 CUDA（`cmake -DGGML_CUDA=ON`）。

### OpenClaw 配置

从模板快速初始化配置：

```bash
# 首次配置（如果 ~/.openclaw/openclaw.json 不存在或需要重置）
cp docs/hyper-claw/openclaw.json.example ~/.openclaw/openclaw.json
# 编辑替换 YOUR_FEISHU_APP_ID 和 YOUR_FEISHU_APP_SECRET
```

或手动添加 `models` 块到现有配置，详见 [openclaw-local-models.jsonc](./openclaw-local-models.jsonc)。

关键配置：

- `baseUrl`: `http://127.0.0.1:1234/v1`
- `apiKey`: `local`（任意值，llama-server 不验证）
- `api`: `openai-responses`
- model `id` 必须与 llama-server 报告的 ID 一致（如 `unsloth/Qwen3.5-4B-GGUF:Q4_K_M`）

### 日常使用

```bash
# 1. 启动本地模型（占一个终端窗口）
claw-qwen3-5-4B

# 2. Gateway 管理：
#    macOS: gateway install 会注册 launchd 服务（开机自启）
#    Linux: 需手动启动，或配置 systemd 服务
#    Windows: 需手动启动，或配置为 Windows Service
pnpm start gateway install

# 3. 使用 TUI 或飞书聊天
pnpm tui
# 在 TUI 中切换模型：/model local/unsloth/Qwen3.5-4B-GGUF:Q4_K_M

# 4. 用完后 Ctrl+C 关闭 llama-server（Gateway 可保持运行）
```

### GPU 显存参考

> 以下基于 Apple M4 Max（30GB 统一内存）实测。NVIDIA GPU 参考类似，按 VRAM 大小选择模型和上下文长度。

| 模型                | 模型大小 | KV Cache (256K ctx) | 总占用   | 剩余 (30GB) |
| ------------------- | -------- | ------------------- | -------- | ----------- |
| Qwen3.5-4B Q4_K_M   | ~3.1 GB  | ~8 GB               | ~11.4 GB | ~18.6 GB    |
| Qwen3.5-9B Q4_K_M   | ~5.5 GB  | ~16 GB              | ~22 GB   | ~8 GB       |
| DeepSeek-R1-8B Q8_0 | ~8.5 GB  | ~8 GB               | ~17 GB   | ~13 GB      |

> **8GB VRAM 用户**：建议使用 Qwen3.5-4B + `-c 32768` 上下文。
> **12-16GB VRAM 用户**：可用 Qwen3.5-9B 或 DeepSeek-R1-8B + `-c 32768`。
> **24GB+ VRAM 用户**：可全量 256K 上下文。

---

## 飞书（Feishu）集成

通过飞书机器人与 OpenClaw 对话，使用 WebSocket 长连接，无需公网 IP。

### 1. 安装飞书插件

```bash
pnpm start plugins install ./extensions/feishu
```

### 2. 创建飞书应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app)，创建企业自建应用
2. 复制 **App ID**（`cli_xxx`）和 **App Secret**
3. **权限** → 批量导入必要权限（`im:message`, `im:message:send_as_bot` 等）
4. **应用能力** → 启用 **机器人**
5. **事件订阅** → 选择 **长连接**，添加 `im.message.receive_v1`
6. **版本管理** → 创建版本并发布

> ⚠️ 事件订阅保存前需确保 Gateway 已运行，否则长连接无法建立。

### 3. 配置 OpenClaw

在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "dmPolicy": "pairing",
      "streaming": true,
      "accounts": {
        "main": {
          "appId": "cli_你的AppID",
          "appSecret": "你的AppSecret",
          "botName": "Hyper Claw AI"
        }
      }
    }
  }
}
```

### 4. 启动并配对

```bash
# 启动 Gateway
pnpm start gateway install

# 在飞书中找到机器人发消息，首次会收到 pairing code
pnpm start pairing approve feishu <CODE>
```

### 5. 飞书常用命令

| 命令      | 说明             |
| --------- | ---------------- |
| `/reset`  | 清除当前 session |
| `/new`    | 新建 session     |
| `/model`  | 查看/切换模型    |
| `/status` | 查看机器人状态   |

详细配置参见 [docs/channels/feishu.md](../channels/feishu.md)。

---

## Skills 安装

Skills 扩展 agent 的能力。以下是推荐安装的跨平台 skills：

### 内置 Skills（bundled，无需安装）

| Skill           | 说明               | 依赖   |
| --------------- | ------------------ | ------ |
| `session-logs`  | 搜索和分析历史会话 | `jq`   |
| `skill-creator` | 创建/更新 skills   | 无     |
| `tmux`          | 远程控制 tmux      | `tmux` |
| `weather`       | 天气查询           | 无     |
| `healthcheck`   | 系统安全审计       | 无     |

### 推荐安装

```bash
# CLI 工具
brew install steipete/tap/gogcli      # Google Workspace (Calendar/Gmail/Drive)
brew install steipete/tap/summarize   # 文档/网页摘要
# gh 通常已装：brew install gh

# MCP 工具管理器（联网搜索需要）
npm install -g mcporter
```

安装后 skills 自动就绪（`pnpm start skills list` 可查看状态）。

### Google Workspace 首次授权（gog）

```bash
# 1. 从 Google Cloud Console 下载 OAuth client_secret.json
# 2. 导入凭证
gog auth credentials /path/to/client_secret.json

# 3. 添加 Google 账号
gog auth add you@gmail.com --services gmail,calendar,drive,contacts,docs,sheets

# 4. 确认
gog auth list
```

---

## 联网搜索（web_search）

OpenClaw 内置 `web_fetch`（抓取 URL，无需配置）和 `web_search`（主动搜索，需后端）。

### 方案：web-search-free（免费、无 API Key）

通过 Exa MCP 服务实现免费联网搜索。

```bash
# 1. 安装 skill
npx clawhub install web-search-free

# 2. 安装 mcporter（如果还没装）
npm install -g mcporter

# 3. 配置 Exa MCP server
mcporter config add exa "https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,get_code_context_exa,crawling_exa,company_research_exa,people_search_exa,deep_researcher_start,deep_researcher_check"

# 4. 验证
mcporter list exa
```

搜索工具：

| 工具                      | 用途                              |
| ------------------------- | --------------------------------- |
| `web_search_exa`          | 通用网页搜索                      |
| `web_search_advanced_exa` | 带日期/域名/分类过滤的高级搜索    |
| `get_code_context_exa`    | 代码搜索（GitHub/Stack Overflow） |
| `company_research_exa`    | 企业调研                          |
| `deep_researcher_start`   | AI 深度研究报告（15s-3min）       |

> 💡 `web_fetch` 无需任何配置，给 AI 发链接它就能读取内容。`web-search-free` skill 提供主动搜索能力。

---

## 跨平台参考

### 配置文件路径

| 文件          | macOS / Linux                                                       | Windows                                    |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| OpenClaw 配置 | `~/.openclaw/openclaw.json`                                         | `%USERPROFILE%\.openclaw\openclaw.json`    |
| Shell aliases | `~/.zshrc` / `~/.bashrc`                                            | `$PROFILE`（PowerShell）                   |
| Gateway 日志  | `~/.openclaw/logs/gateway.log`                                      | `%USERPROFILE%\.openclaw\logs\gateway.log` |
| 模型缓存      | `~/Library/Caches/llama.cpp/` (mac) / `~/.cache/llama.cpp/` (linux) | `%LOCALAPPDATA%\llama.cpp\`                |

### Gateway 服务管理

| 操作      | macOS (launchd)                        | Linux (systemd)                        | Windows                                          |
| --------- | -------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| 安装/启动 | `pnpm start gateway install`           | `pnpm start gateway install`           | `pnpm start gateway install`                     |
| 停止      | `pnpm start gateway stop`              | `pnpm start gateway stop`              | `pnpm start gateway stop`                        |
| 开机自启  | ✅ 自动（LaunchAgent）                 | 需手动配置 systemd unit                | 需手动配置 Windows Service                       |
| 查看日志  | `tail -f ~/.openclaw/logs/gateway.log` | `tail -f ~/.openclaw/logs/gateway.log` | `Get-Content -Wait ~\.openclaw\logs\gateway.log` |

### llama.cpp GPU 加速

| 平台    | GPU                   | 编译/安装方式                                |
| ------- | --------------------- | -------------------------------------------- |
| macOS   | Apple Silicon (Metal) | `brew install llama.cpp`（自动启用 Metal）   |
| Linux   | NVIDIA (CUDA)         | `cmake -DGGML_CUDA=ON ..`                    |
| Linux   | AMD (ROCm)            | `cmake -DGGML_HIP=ON ..`                     |
| Windows | NVIDIA (CUDA)         | `cmake -DGGML_CUDA=ON ..`（需 CUDA Toolkit） |
| Windows | AMD (ROCm)            | `cmake -DGGML_HIP=ON ..`                     |
