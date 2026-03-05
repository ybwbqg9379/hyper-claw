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

### 门下省 · Strategist 输出自检

Strategist agent 内嵌强制质量关卡（灵感来源：[Edict 三省六部制](https://github.com/cft0808/edict)）：

| 自检关   | 检查内容               |
| -------- | ---------------------- |
| 事实关   | 数据可溯源，无编造     |
| 逻辑关   | 论证链完整，无跳跃     |
| 反面关   | 至少一个反对意见       |
| 可执行关 | 有具体下一步和时间节点 |
| 简洁关   | 无废话重复             |

不通过不发出，封驳重做。详见 `workspace-strategist/SOUL.md`。

### 任务看板（飞书多维表格）

通过飞书 bitable 实现轻量级任务追踪：

- 在飞书对话中说 **"创建任务看板"** → AI 自动创建多维表格
- 字段：任务名称、状态、优先级、负责人、截止日期、来源、备注
- 支持自然语言操作："加个任务 XXX"、"看看任务"、"XXX 完成了"
- Heartbeat 自动检查逾期和阻塞任务

详见 `workspace/TOOLS.md`。

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
3. **应用能力** → 启用 **机器人**
4. **事件订阅** → 选择 **长连接**，添加 `im.message.receive_v1`
5. **权限管理** → 批量导入权限（见下方 JSON）
6. **版本管理** → 创建版本并发布

### 2.1 权限配置（批量导入）

在**权限管理**页面，点击右上角 **批量导入/导出** → **Import**，粘贴以下 JSON：

```json
{
  "scopes": {
    "tenant": [
      "im:message",
      "im:message:send_as_bot",
      "im:message:readonly",
      "im:message.p2p_msg:readonly",
      "im:message.group_at_msg:readonly",
      "im:resource",
      "im:chat",
      "im:chat:readonly",
      "im:chat.members:bot_access",
      "im:chat.access_event.bot_p2p_chat:read",
      "contact:contact.base:readonly",
      "docx:document",
      "docx:document:readonly",
      "docx:document:create",
      "docx:document:write_only",
      "docx:document.block:convert",
      "drive:drive",
      "drive:drive:readonly",
      "drive:drive.search:readonly",
      "drive:drive.metadata:readonly",
      "drive:file",
      "drive:file:readonly",
      "drive:file:upload",
      "drive:file:download",
      "drive:file.like:readonly",
      "drive:file.meta.sec_label.read_only",
      "drive:file:view_record:readonly",
      "drive:export:readonly",
      "wiki:wiki",
      "wiki:wiki:readonly",
      "bitable:app",
      "bitable:app:readonly"
    ],
    "user": ["docx:document:readonly"]
  }
}
```

### 2.2 权限说明

| 分类         | 权限                                           | 用途                           |
| ------------ | ---------------------------------------------- | ------------------------------ |
| **消息**     | `im:message` / `send_as_bot` / `readonly`      | 收发飞书消息（基础能力）       |
| **群聊**     | `im:chat` / `im:chat:readonly`                 | 获取群信息、群成员列表         |
| **多维表格** | `bitable:app` / `bitable:app:readonly`         | 读写多维表格（Cron 报告必需）  |
| **文档**     | `docx:document` / `create` / `write_only`      | 读写/创建/润色飞书文档         |
| **文档转换** | `docx:document.block:convert`                  | Markdown ↔ 飞书 Block 格式转换 |
| **云盘**     | `drive:drive` / `file` / `upload` / `download` | 文件管理、上传、下载           |
| **云盘搜索** | `drive:drive.search:readonly`                  | 搜索云盘文件                   |
| **知识库**   | `wiki:wiki` / `wiki:readonly`                  | 浏览和编辑知识库               |

> ⚠️ `drive:permission`（权限管理）默认未包含，属于敏感操作。需要管理文档分享权限时手动添加。
>
> ⚠️ 导入权限后需要 **创建新版本并发布**，权限才会生效。部分权限可能需要管理员审批。

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

OpenClaw 内置两个 Web 工具：

- **`web_fetch`** — 抓取指定 URL 内容（HTML → Markdown），**无需任何配置**，开箱即用
- **`web_search`** — 主动搜索互联网，需要配置搜索后端

### 方案：Brave Search API（推荐）

Brave 提供 **$5/月免费额度**（≈1000 次搜索），是目前与本地模型兼容的最佳免费方案。

```bash
# 1. 注册 Brave Search API：https://brave.com/search/api/
#    选择 "Search" 计划（不是 "Answers"）
#    绑卡后设 $5 monthly spend cap（确保不额外扣费）

# 2. 配置 API Key（二选一）：

# 方式 A：交互式配置
openclaw configure --section web

# 方式 B：手动添加到 openclaw.json
# tools.web.search.provider = "brave"
# tools.web.search.apiKey = "你的API_KEY"
```

配置示例（`~/.openclaw/openclaw.json`）：

```json
{
  "tools": {
    "web": {
      "search": {
        "enabled": true,
        "provider": "brave",
        "apiKey": "你的BRAVE_API_KEY",
        "maxResults": 5
      }
    }
  }
}
```

配置后重启 Gateway 生效：

```bash
pnpm start gateway stop && pnpm start gateway install
```

> ⚠️ **MCP 方案不适用于本地模型**：ClawHub 上的 `web-search-free` 等 MCP skill 依赖 agent 执行 `mcporter call` 命令，本地小模型（如 Qwen3.5-4B）无法正确调用。必须使用 OpenClaw 内置的 `web_search` 工具 + Brave/Perplexity provider。
>
> 💡 `web_fetch` 无需任何配置，给 AI 发链接它就能读取内容。`web_search` 提供主动搜索能力。

---

## 多账号部署（个人 + 公司飞书）

一个 Gateway 可同时服务多个飞书租户。在 `openclaw.json` 的 `channels.feishu.accounts` 下添加多个账号：

```json
{
  "channels": {
    "feishu": {
      "accounts": {
        "main": {
          "appId": "cli_个人AppID",
          "appSecret": "个人AppSecret",
          "botName": "Hyper Claw AI"
        },
        "company": {
          "appId": "cli_公司AppID",
          "appSecret": "公司AppSecret",
          "botName": "Hyper Claw AI"
        }
      }
    }
  }
}
```

每个账号的用户需要独立 pairing（`pnpm start pairing approve feishu <CODE>`）。Session 按 `account + channel + peer` 自动隔离。

> ⚠️ 公司飞书应用发布可能需要管理员审批。

---

## 安全加固（个人机器部署必读）

在个人机器上部署 Bot 时，**必须**防止 Bot 读取本地私人文件：

```json
{
  "tools": {
    "fs": {
      "workspaceOnly": true
    }
  }
}
```

| 配置                     | 效果                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `fs.workspaceOnly: true` | Bot 只能读写 `~/.openclaw/workspace/`，无法访问桌面、代码、个人文档等 |
| `tools.deny: ["exec"]`   | 完全禁止终端命令（**谨慎使用**，会导致 CLI skills 失效）              |

> 💡 推荐只开 `workspaceOnly`，不禁用 `exec`。这样 Bot 既安全又能正常使用 gog、gh 等 CLI 工具。

---

## 上下文管理与 Compaction 调优

### 问题

256K 上下文虽大，但默认 compaction 阈值太高（~240K），导致上下文膨胀到 80K+ tokens 时响应变慢（2 分钟+）。

### 解决方案

在 `openclaw.json` 中配置更早的 compaction 触发：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "reserveTokens": 200000,
        "keepRecentTokens": 20000
      }
    }
  }
}
```

| 参数               | 默认值 | 推荐值   | 说明                                 |
| ------------------ | ------ | -------- | ------------------------------------ |
| `reserveTokens`    | 16384  | 200000   | 预留空间，值越大 compaction 越早触发 |
| `keepRecentTokens` | 20000  | 20000    | compaction 后保留最近的 token 数     |
| **实际触发点**     | ~240K  | **~56K** | `contextWindow - reserveTokens`      |

### 性能参考（M4 Max, Qwen3.5-4B Q4_K_M）

| 上下文大小    | prompt 处理速度 | 生成速度  | 体感延迟     |
| ------------- | --------------- | --------- | ------------ |
| < 30K tokens  | ~680 tok/s      | ~50 tok/s | **1-3 秒**   |
| 50-70K tokens | ~300 tok/s      | ~30 tok/s | 5-10 秒      |
| 80K+ tokens   | ~285 tok/s      | ~28 tok/s | **1-2 分钟** |

> 💡 群聊中发 `/new` 可立即重置 session，上下文清零后响应恢复秒回。`/new` 是静默命令，不会发回复。

---

## 飞书群聊部署注意事项

### 群聊权限

公司飞书必须额外添加通讯录权限，否则群聊无法回复（私聊正常）：

```
contact:contact.base:readonly
```

> 个人飞书默认允许通讯录访问，公司飞书需显式授权。

### 群聊使用方式

- **必须 @ Bot** 才会回复（不会主动插话）
- `/new` 重置 session（静默，不回复）
- 群聊和私聊 session 完全隔离
- 发图片 + @ 支持多模态识图

### 飞书文档/多维表格共享给 Bot

Bot 需要文档权限才能读写：

1. 打开文档/多维表格 → **分享** → 搜索 Bot 应用名 → 添加
2. 或创建共享文件夹，把文档放入后共享给 Bot
3. 多维表格需额外权限：`bitable:app` + `bitable:app:readonly`

---

## 第三方模型 Fallback（DeepSeek）

本地模型为主力，配置 DeepSeek V3 作为 fallback，当本地不可用时自动切换。

### 获取 API Key

1. 注册 [DeepSeek Platform](https://platform.deepseek.com/)
2. 充值（最低 ¥10 / $2）
3. 创建 API Key

### 配置

在 `openclaw.json` 添加：

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "deepseek": {
        "baseUrl": "https://api.deepseek.com",
        "apiKey": "你的DEEPSEEK_API_KEY",
        "api": "openai-completions",
        "models": [
          {
            "id": "deepseek-chat",
            "name": "DeepSeek V3.2",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "local/你的本地模型ID",
        "fallbacks": ["deepseek/deepseek-chat"]
      }
    }
  }
}
```

> ⚠️ **api 必须是 `openai-completions`**，不是 `openai-responses`。DeepSeek 使用 OpenAI 兼容的 chat completions 接口。

### 费用参考（2026.03）

| 项目               | 价格                 |
| ------------------ | -------------------- |
| Input (cache miss) | $0.28/M tokens       |
| Input (cache hit)  | $0.028/M tokens      |
| Output             | $0.42/M tokens       |
| **单次问答参考**   | **~$0.004（¥0.03）** |

### 模型切换命令（飞书对话中）

```
/model deepseek/deepseek-chat    # 切换到 DeepSeek
/model local/你的本地模型ID       # 切回本地
/model                            # 查看当前模型
/status                           # 查看完整状态
```

> 💡 `/model` 和 `/new` 是系统级静默命令，与普通对话分开处理。`/status` 会返回详细的运行状态。

---

## 定时任务（Cron Job）

OpenClaw 内置 Cron 调度器，可定时触发 Agent 执行任务并推送结果到群聊。

### 创建定时任务

```bash
pnpm start cron add \
  --name "每日客户对接汇总" \
  --cron "0 8 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "你的prompt内容" \
  --model "deepseek/deepseek-chat" \
  --announce \
  --channel feishu \
  --to "oc_群聊ID" \
  --exact
```

> ⚠️ **模型选择**：定时报告建议用 **DeepSeek**（`deepseek/deepseek-chat`），不要用本地 4B 模型。原因：
>
> - 4B 无法遵循复杂指令（如"不超过 5 项"、"静默池"等规则）
> - DeepSeek 每次约 ¥0.05，每天一次完全可接受

### 多账号飞书配置

> ⚠️ 如果配置了多个飞书账号（main / company），**必须**在 `openclaw.json` 设置 `defaultAccount`，否则 cron delivery 会报 `Feishu account "default" not configured`：

```json
{
  "channels": {
    "feishu": {
      "defaultAccount": "company"
    }
  }
}
```

### 飞书 @提醒

Cron 报告可以 @群成员。在 prompt 中提供姓名→用户ID 映射表：

```
【负责人@提醒映射表】
在报告中提到负责人时，使用以下格式原样输出：
王戈多 写作: <at user_id="8e749676">王戈多</at>
万佳 写作: <at user_id="6927gc1a">万佳</at>
```

> 用户 ID 在飞书管理后台 → 成员管理 → 点击用户 → 基本信息 → 用户 ID 获取。

### Prompt 工程要点

| 要点              | 说明                                                    |
| ----------------- | ------------------------------------------------------- |
| 指定 skill 和参数 | `feishu-bitable skill（app_token: xxx, table_id: xxx）` |
| 禁止代码输出      | DeepSeek 会输出分析代码，需明确禁止                     |
| 限制条目数        | "不超过 5 项"、"不超过 3 项"                            |
| 内部术语说明      | 如"哈拉推进"等 Bot 不懂的词需解释                       |
| 格式模板          | 给出完整的输出模板（含标题、编号、空行）                |
| 标题含日期        | `**X月X日 项目进度表追踪**`                             |
| 段落间距          | 明确要求"每个大段落之间空一行"                          |

### 管理命令

```bash
pnpm start cron list                   # 查看所有定时任务
pnpm start cron run <jobId>            # 手动触发
pnpm start cron runs --id <jobId>      # 运行历史
pnpm start cron edit <jobId> --message "新prompt"  # 修改
pnpm start cron edit <jobId> --model "deepseek/deepseek-chat"  # 切模型
pnpm start cron remove <jobId>         # 删除
```

### 踩坑记录

| 问题                                      | 解决                                       |
| ----------------------------------------- | ------------------------------------------ |
| `Feishu account "default" not configured` | 设置 `channels.feishu.defaultAccount`      |
| Bot 用 web_fetch 代替 feishu skill        | prompt 显式指定 skill 名和 token/table_id  |
| 知识库文档读不了                          | 用 bitable skill + 精确 app_token/table_id |
| `--to` 格式                               | 直接用 `oc_` 开头的群聊 ID                 |
| 4B 不遵循"不超过 5 项"                    | 改用 DeepSeek                              |
| DeepSeek 输出 Python 代码                 | prompt 加"不要展示分析过程、代码"          |
| 报告缺少段落间距                          | prompt 加"每个大段落标题前后各空一行"      |
| @mention 不生效                           | 用 `<at user_id="xxx">姓名</at>` 格式      |

> 💡 定时任务需要 Mac 保持开机且 Gateway 运行。任务会持久化在 `~/.openclaw/cron/jobs.json`，重启不丢失。

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
