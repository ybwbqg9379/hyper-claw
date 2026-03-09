# TOOLS.md — 工具与环境清单

## 本地 LLM 环境

| 模型                | 命令/别名         | 端口 | 说明                      |
| ------------------- | ----------------- | ---- | ------------------------- |
| Qwen3.5-4B Q4_K_M   | `claw-qwen3-5-4B` | 1234 | 日常使用推荐，256K 上下文 |
| Qwen3.5-9B Q4_K_M   | `claw-qwen3-5-9B` | 1234 | 高质量需求                |
| Qwen3-8B Q6_K       | `claw-qwen3`      | 1234 | 通用模型                  |
| DeepSeek-R1-8B Q8_0 | `claw-deepseek`   | 1234 | 推理模型，thinking 开启   |

- **API 端点：** `http://127.0.0.1:1234/v1`
- **API Key：** `local`（llama-server 不验证）
- **切换模型命令：** `/model local/unsloth/Qwen3.5-4B-GGUF:Q4_K_M`

## 通信渠道

| 渠道           | 账号          | 用途                      |
| -------------- | ------------- | ------------------------- |
| 飞书（Feishu） | Hyper Claw AI | 主要沟通渠道，私聊 + 群聊 |
| TUI            | 本地终端      | 开发调试                  |

## 开发环境

| 工具          | 配置                                     |
| ------------- | ---------------------------------------- |
| 项目根目录    | `/Users/bdoctory/Development/hyper-claw` |
| OpenClaw 配置 | `~/.openclaw/openclaw.json`              |
| Workspace     | `~/.openclaw/workspace/`                 |
| Gateway 日志  | `~/.openclaw/logs/gateway.log`           |
| 包管理器      | pnpm                                     |
| Node.js       | ≥ 22.x                                   |

## 常用命令

```bash
# Gateway 管理
pnpm start gateway install    # 安装/启动
pnpm start gateway stop       # 停止
pnpm start gateway restart    # 重启

# 开发
pnpm tui                      # 终端交互
pnpm test                     # 运行测试
pnpm build                    # 构建

# 飞书配对
pnpm start pairing approve feishu <CODE>

# 日志
tail -f ~/.openclaw/logs/gateway.log

# Git 同步 upstream
git fetch upstream && git merge upstream/main
```

## 已安装 Skills

| Skill                       | 说明                                               | CLI 依赖         |
| --------------------------- | -------------------------------------------------- | ---------------- |
| `gog`                       | Google Workspace (Calendar/Gmail/Drive)            | `gog` CLI        |
| `github`                    | GitHub Issues/PR/CI                                | `gh` CLI         |
| `summarize`                 | 文档/网页摘要                                      | `summarize` CLI  |
| `healthcheck`               | 系统安全审计                                       | 内置             |
| `feishu-doc`                | 飞书文档读写/创建/润色                             | 内置（飞书插件） |
| `feishu-drive`              | 飞书云盘管理                                       | 内置（飞书插件） |
| `feishu-wiki`               | 飞书知识库                                         | 内置（飞书插件） |
| `feishu-perm`               | 飞书权限管理（默认关闭）                           | 内置（飞书插件） |
| `session-logs`              | 搜索和分析历史会话日志（跨 session 回溯）          | `jq` + `rg`      |
| `mcporter`                  | MCP Server 桥接工具（⚠️ 仅 DeepSeek V3.2 可用）    | `mcporter` CLI   |
| `post-to-xhs`               | 小红书自动发布/搜索/评论/数据抓取（CDP）           | Python 3.10+     |
| `baoyu-xhs-images`          | 小红书卡片图系列生成（9风格×6布局）                | Gemini API       |
| `baoyu-infographic`         | 专业信息图生成（20布局×17风格）                    | Gemini API       |
| `baoyu-cover-image`         | 文章/邮件封面图生成（5维定制系统）                 | Gemini API       |
| `baoyu-slide-deck`          | 演示幻灯片图片生成 → .pptx/.pdf                    | Gemini API       |
| `baoyu-comic`               | 知识漫画生成（5画风×7语调）                        | Gemini API       |
| `baoyu-article-illustrator` | 文章智能配图（6类型×8风格）                        | Gemini API       |
| `baoyu-image-gen`           | 多 Provider AI 图像生成（Google/OpenAI/DashScope） | Gemini API       |
| `baoyu-translate`           | 三模式翻译（quick/normal/refined）                 | 内置             |
| `baoyu-url-to-markdown`     | CDP 网页抓取转 Markdown                            | Chrome           |
| `baoyu-compress-image`      | 图片压缩                                           | 内置             |
| `baoyu-format-markdown`     | Markdown 格式化+排版                               | 内置             |

## MCP Server（通过 mcporter）

> ⚠️ **仅在切换到 DeepSeek V3.2 模型后使用**。本地模型（Qwen3.5-4B/9B）无法可靠调用 `mcporter call`。

配置文件：`config/mcporter.json`（5 个 server）

| Server                | 工具数 | 用途                                            | API Key             |
| --------------------- | ------ | ----------------------------------------------- | ------------------- |
| `firecrawl`           | —      | AI 网页抓取（JS 渲染、反爬、输出干净 Markdown） | `FIRECRAWL_API_KEY` |
| `exa`                 | —      | 语义搜索（意图理解优于关键词匹配）              | `EXA_API_KEY`       |
| `fetch`               | 1      | 通用网页抓取转 Markdown                         | 无                  |
| `memory`              | 9      | 知识图谱记忆（跨 session 实体/关系持久存储）    | 无                  |
| `sequential-thinking` | 1      | 结构化逐步推理                                  | 无                  |

API Key 配置：在 `~/.zshrc` 中添加 `export FIRECRAWL_API_KEY=xxx` 和 `export EXA_API_KEY=xxx`

使用方法（DeepSeek V3.2 下）：`mcporter call firecrawl.scrape url=https://linkedin.com/in/someone`

## 任务看板（飞书多维表格）

使用飞书 bitable 作为轻量级任务追踪看板。

### 首次初始化

用户说"创建任务看板"时，用 `feishu_bitable` 工具创建多维表格。

**推荐字段结构：**

| 字段     | 类型         | 说明                                        |
| -------- | ------------ | ------------------------------------------- |
| 任务名称 | Text         | 任务标题                                    |
| 状态     | SingleSelect | 待办 / 进行中 / 已完成 / 阻塞               |
| 优先级   | SingleSelect | P0-紧急 / P1-高 / P2-中 / P3-低             |
| 负责人   | Text         | 执行者                                      |
| 截止日期 | DateTime     | deadline                                    |
| 来源     | SingleSelect | 用户指派 / Strategist 建议 / Heartbeat 发现 |
| 备注     | Text         | 补充说明                                    |

### 日常操作

- **添加任务**：用户说"记一下 XXX"或"加个任务 XXX" -> 写入 bitable
- **查看看板**：用户说"看看任务" -> 列出待办和进行中的任务
- **更新状态**：用户说"XXX 完成了" -> 更新状态字段
- **每日汇报**：Heartbeat 自动检查逾期和阻塞任务

> 创建后将 bitable URL 记录到 MEMORY.md，确保跨 session 可定位。

## 权限边界

**可自主使用：**

- 文件读写（workspace 内）
- 网页搜索
- 本地命令执行（非破坏性）

**需要确认：**

- 发送飞书消息（外部动作）
- 修改 openclaw.json 配置
- 安装/卸载 skill
- 执行 git push

---

_工具清单随安装新 skill 或配置变更时更新。_
