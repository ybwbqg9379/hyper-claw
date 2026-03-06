# Hyper-Claw 迁移指南

将多 Bot OpenClaw 系统完整迁移到新机器或云端的步骤。

## 架构总览：什么在 Git，什么在本地

```
┌─────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│  Git 仓库（hyper-claw）             │  │  本地文件（需手动迁移）                    │
│                                     │  │                                          │
│  ✅ 源码 src/                       │  │  🔑 ~/.env.local (凭证集中文件)           │
│  ✅ 飞书插件 extensions/feishu/     │  │  🧠 ~/.openclaw/workspace-*/             │
│  ✅ Skills skills/                  │  │     ├── SOUL/IDENTITY/MEMORY.md          │
│  ✅ Workspace 模板                  │  │     └── memory/*.md (每日日志)            │
│     docs/hyper-claw/workspace-*     │  │  ⚙️ ~/.openclaw/openclaw.json             │
│  ✅ 配置示例                        │  │  🔐 ~/.openclaw/credentials/              │
│     openclaw.json.example           │  │  🔐 ~/.openclaw/identity/                 │
│  ✅ 工作流 .agent/workflows/        │  │  ⏰ ~/.openclaw/cron/jobs.json             │
│                                     │  │  📦 ~/.baoyu-skills/.env                  │
│                                     │  │  🐚 ~/.zshrc (claw-* aliases + exports)   │
└─────────────────────────────────────┘  └──────────────────────────────────────────┘
```

---

## 第一步：在旧机器上打包

### 1.1 确保 `.env.local` 凭证文件是最新的

```bash
# .env.local 在项目根目录，已被 .gitignore 排除
cat .env.local
# 核对凭证是否与 ~/.openclaw/openclaw.json 中的一致
```

如果 `.env.local` 不存在或不完整，从以下来源手动收集：

| 凭证                     | 来源                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| 3 组飞书 App ID + Secret | `~/.openclaw/openclaw.json` → `channels.feishu.accounts`         |
| DeepSeek API Key         | `~/.openclaw/openclaw.json` → `models.providers.deepseek.apiKey` |
| Brave Search API Key     | `~/.openclaw/openclaw.json` → `tools.web.search.apiKey`          |
| Gateway Auth Token       | `~/.openclaw/openclaw.json` → `gateway.auth.token`               |
| Firecrawl API Key        | `~/.zshrc` → `export FIRECRAWL_API_KEY=...`                      |
| Exa API Key              | `~/.zshrc` → `export EXA_API_KEY=...`                            |
| Gemini API Key           | `~/.baoyu-skills/.env` → `GOOGLE_API_KEY=...`                    |

### 1.2 打包本地数据

```bash
# 创建打包目录
mkdir -p ~/hyper-claw-migration

# 1. 凭证文件（最重要！）
cp /path/to/hyper-claw/.env.local ~/hyper-claw-migration/

# 2. 整个 ~/.openclaw 目录（包含配置、workspace、记忆、cron、凭证）
tar czf ~/hyper-claw-migration/openclaw-home.tar.gz \
  -C ~ .openclaw/

# 3. baoyu-skills 配置
tar czf ~/hyper-claw-migration/baoyu-skills.tar.gz \
  -C ~ .baoyu-skills/

# 4. zshrc 中的 claw 相关配置段（手动或自动提取）
grep -A2 -B1 'claw-\|FIRECRAWL\|EXA_API_KEY\|OPENCLAW\|BUN_INSTALL\|llama-server' ~/.zshrc \
  > ~/hyper-claw-migration/zshrc-claw-snippet.txt

# 5. Google Workspace 凭证（如果使用了 gog skill）
# gog 的 OAuth 凭证通常在 ~/.config/gog/
[ -d ~/.config/gog ] && tar czf ~/hyper-claw-migration/gog-config.tar.gz -C ~ .config/gog/

# 最终打包
echo "打包完成，文件列表："
ls -lh ~/hyper-claw-migration/
```

### 1.3 安全传输

```bash
# 方式 A：AirDrop / USB 直传（最安全）
# 直接拷贝 ~/hyper-claw-migration/ 文件夹

# 方式 B：scp 到新机器
scp -r ~/hyper-claw-migration/ user@new-machine:~/

# 方式 C：加密后传输
tar czf - ~/hyper-claw-migration/ | openssl enc -aes-256-cbc -pbkdf2 -out migration.tar.gz.enc
# 新机器解密：
# openssl enc -d -aes-256-cbc -pbkdf2 -in migration.tar.gz.enc | tar xzf -
```

> [!CAUTION]
> **永远不要**将 `.env.local` 或 `openclaw-home.tar.gz` 上传到 Git、云盘、或任何非加密渠道。
> 这些文件包含飞书 App Secret、API Key 等高敏感凭证。

---

## 第二步：新机器恢复

### 2.1 基础环境安装

```bash
# macOS
brew install node pnpm llama.cpp jq
brew install oven-sh/bun/bun        # baoyu-skills 依赖
pip3 install --break-system-packages requests websockets  # XHS skill 依赖

# 安装 fnm（可选，Node 版本管理）
brew install fnm
fnm install 22
```

### 2.2 克隆仓库

```bash
git clone https://github.com/ybwbqg9379/hyper-claw.git
cd hyper-claw
git remote add upstream https://github.com/openclaw/openclaw.git
git branch --set-upstream-to=origin/main main
pnpm install && pnpm build
```

### 2.3 恢复本地数据

```bash
# 1. 恢复 ~/.openclaw（配置、workspace、记忆、cron、凭证）
tar xzf ~/hyper-claw-migration/openclaw-home.tar.gz -C ~/

# 2. 恢复 baoyu-skills 配置
tar xzf ~/hyper-claw-migration/baoyu-skills.tar.gz -C ~/

# 3. 恢复凭证文件
cp ~/hyper-claw-migration/.env.local /path/to/hyper-claw/.env.local

# 4. 恢复 Google Workspace（如果有）
[ -f ~/hyper-claw-migration/gog-config.tar.gz ] && tar xzf ~/hyper-claw-migration/gog-config.tar.gz -C ~/
```

### 2.4 恢复 Shell 配置

将 `zshrc-claw-snippet.txt` 中的内容追加到新机器的 `~/.zshrc`：

```bash
cat ~/hyper-claw-migration/zshrc-claw-snippet.txt
# 手动复制需要的行到 ~/.zshrc，或参考 SETUP.md 中的完整 alias 配置
```

需要添加的关键内容（参考 [SETUP.md](./SETUP.md#shell-aliases)）：

```bash
# ---- Hyper-Claw / OpenClaw ----

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# 搜索/抓取 API Keys（从 .env.local 读取或直接写入）
export FIRECRAWL_API_KEY="你的key"
export EXA_API_KEY="你的key"

# OpenClaw 本地模型 (llama-server)
alias claw-qwen3='llama-server -hf Qwen/Qwen3-8B-GGUF:Q6_K -ngl 99 --port 1234 --host 127.0.0.1 -c 32768 --reasoning-format none --reasoning-budget 0 -np 2 --log-prefix --log-timestamps'
unalias claw-qwen3-5-4B 2>/dev/null; unalias claw-qwen3-5-9B 2>/dev/null
claw-qwen3-5-4B() {
  sed -i '' 's|"model": "local/unsloth/[^"]*"|"model": "local/unsloth/Qwen3.5-4B-GGUF:Q4_K_M"|' ~/.openclaw/openclaw.json
  llama-server -hf unsloth/Qwen3.5-4B-GGUF:Q4_K_M -ngl 99 --port 1234 --host 127.0.0.1 -c 262144 --reasoning-format none --reasoning-budget 0 -np 2 --log-prefix --log-timestamps
}
claw-qwen3-5-9B() {
  sed -i '' 's|"model": "local/unsloth/[^"]*"|"model": "local/unsloth/Qwen3.5-9B-GGUF:Q4_K_M"|' ~/.openclaw/openclaw.json
  llama-server -hf unsloth/Qwen3.5-9B-GGUF:Q4_K_M -ngl 99 --port 1234 --host 127.0.0.1 -c 262144 --reasoning-format deepseek --reasoning-budget -1 -np 2 --log-prefix --log-timestamps
}
alias claw-deepseek='llama-server -hf unsloth/DeepSeek-R1-0528-Qwen3-8B-GGUF:Q8_0 -ngl 99 --port 1234 --host 127.0.0.1 -c 32768 --reasoning-format deepseek --reasoning-budget -1 -np 2 --log-prefix --log-timestamps'
```

> [!TIP]
> Linux 用户需将 `sed -i ''` 改为 `sed -i`（GNU sed 不需要空字符串参数）。

### 2.5 注入凭证到配置文件

`.env.local` 是凭证的 **Single Source of Truth**。恢复后需要将凭证注入到各个配置文件：

```bash
# 方式 A：如果从旧机器打包了完整 ~/.openclaw/，openclaw.json 中已包含真实凭证
#         → 无需额外操作

# 方式 B：如果从模板重新初始化，需要手动替换
source .env.local  # 加载环境变量

# 替换 openclaw.json 中的占位符（使用 sed 或手动编辑）
# 参考 .env.local 中各段的 "目标位置" 注释

# 恢复 baoyu-skills 配置
mkdir -p ~/.baoyu-skills
cat > ~/.baoyu-skills/.env << EOF
GOOGLE_API_KEY=$GOOGLE_API_KEY
GOOGLE_IMAGE_MODEL=$GOOGLE_IMAGE_MODEL
EOF
```

### 2.6 启动并验证

```bash
# 1. 启动本地模型
claw-qwen3-5-4B

# 2. 安装并启动 Gateway（新窗口）
cd /path/to/hyper-claw
pnpm start gateway install

# 3. 检查健康状态
pnpm clawdbot health

# 4. 飞书 pairing（如果 credentials 未迁移或需要重新配对）
# 在飞书中发消息给 Bot，获取 pairing code
pnpm start pairing approve feishu <CODE>
```

---

## 第三步：验证检查表

迁移完成后，逐项确认：

### 基础设施

- [ ] `git remote -v` 显示 origin（hyper-claw）+ upstream（openclaw）
- [ ] `pnpm test` 通过
- [ ] `pnpm start skills list` 显示所有 skills

### 本地模型

- [ ] `claw-qwen3-5-4B` 启动成功，模型自动下载
- [ ] `curl http://127.0.0.1:1234/v1/models` 返回模型列表
- [ ] `pnpm tui` 能正常对话

### 飞书 Bot

- [ ] 三个 Bot（personal / hypercreator / raxonwood）均能收到消息
- [ ] 每个 Bot 的 workspace 记忆隔离正确（检查 `~/.openclaw/workspace-*/memory/`）
- [ ] Cron 任务运行正常：`pnpm start cron list`

### Skills

- [ ] baoyu-skills 图像生成正常（`/infographic` 或 `/cover`）
- [ ] web_search 能搜索（Brave API）
- [ ] `feishu_wiki` 返回正确账号的知识库

### 凭证

- [ ] `.env.local` 存在且 `git status` 中**不显示**
- [ ] `~/.openclaw/openclaw.json` 中所有 apiKey / appSecret 非占位符
- [ ] `~/.zshrc` 中 FIRECRAWL_API_KEY 和 EXA_API_KEY 已设置

---

## 迁移数据清单

完整列出所有需要迁移的文件及其用途：

| 文件/目录                             | 类型      | 说明                                 |
| ------------------------------------- | --------- | ------------------------------------ |
| `~/.openclaw/openclaw.json`           | ⚙️ 配置   | 核心配置（模型、渠道、agent、tools） |
| `~/.openclaw/workspace-personal/`     | 🧠 记忆   | Personal Bot 的人格+记忆             |
| `~/.openclaw/workspace-hypercreator/` | 🧠 记忆   | HyperCreator Bot 的人格+记忆         |
| `~/.openclaw/workspace-raxonwood/`    | 🧠 记忆   | RaxonWood Bot 的人格+记忆            |
| `~/.openclaw/workspace-strategist/`   | 🧠 记忆   | Strategist Agent 的人格+记忆         |
| `~/.openclaw/credentials/`            | 🔐 凭证   | 飞书 pairing 授权文件                |
| `~/.openclaw/identity/`               | 🔐 凭证   | 设备公私钥对（device.json）          |
| `~/.openclaw/cron/jobs.json`          | ⏰ 自动化 | 定时任务配置和状态                   |
| `~/.openclaw/logs/`                   | 📋 日志   | Gateway 运行日志（可不迁移）         |
| `~/.baoyu-skills/.env`                | 🔐 凭证   | Gemini API Key                       |
| `.env.local`（项目根）                | 🔐 凭证   | 所有凭证汇总（迁移用）               |
| `~/.zshrc`（部分）                    | 🐚 Shell  | claw-\* alias + API Key export       |
| `~/.config/gog/`（如有）              | 🔐 凭证   | Google Workspace OAuth 凭证          |

> [!NOTE]
> `~/.openclaw/identity/device.json` 包含设备私钥。迁移后飞书 pairing 可能需要重新授权。
> 如果 identity 文件不迁移，Gateway 会生成新的设备 ID，所有飞书用户需重新 pairing。

---

## 云端部署额外注意

如果目标是云端服务器（而非另一台 Mac）：

1. **GPU**：云端需要 NVIDIA GPU 运行本地模型。无 GPU 可改用纯 DeepSeek 云端模型
2. **llama-server 不适用时**：在 `openclaw.json` 中删除 `local` provider，将 `agents.defaults.model` 改为 `deepseek/deepseek-chat`
3. **Gateway 持久化**：用 `systemd` 替代 `launchd`，确保开机自启
4. **模型缓存**：GGUF 文件约 3-9 GB，首次启动 alias 会自动下载。可提前拷贝 `~/.cache/llama.cpp/`
5. **飞书长连接**：WebSocket 连接从云端发起，无需公网 IP，但需要稳定网络
