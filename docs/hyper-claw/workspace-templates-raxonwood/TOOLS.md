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

| Skill          | 说明                                    | CLI 依赖         |
| -------------- | --------------------------------------- | ---------------- |
| `gog`          | Google Workspace (Calendar/Gmail/Drive) | `gog` CLI        |
| `github`       | GitHub Issues/PR/CI                     | `gh` CLI         |
| `summarize`    | 文档/网页摘要                           | `summarize` CLI  |
| `healthcheck`  | 系统安全审计                            | 内置             |
| `feishu-doc`   | 飞书文档读写/创建/润色                  | 内置（飞书插件） |
| `feishu-drive` | 飞书云盘管理                            | 内置（飞书插件） |
| `feishu-wiki`  | 飞书知识库                              | 内置（飞书插件） |
| `feishu-perm`  | 飞书权限管理（默认关闭）                | 内置（飞书插件） |

## 任务看板（飞书多维表格）

使用飞书 bitable 作为轻量级任务追踪看板。

### 首次初始化

优先使用内置命令初始化，而不是手工拼 `feishu_bitable_*`：

```text
/taskboard create
/taskboard link <bitable-url>
/taskboard status
/taskboard list open
```

`hyper-claw-taskboard` 插件会为当前 agent/账号绑定一个标准任务看板。
创建模式会自动生成标准字段；绑定模式用于接入已有的 bitable。

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

- **添加任务**：优先用 `taskboard_add_task`；若用户直接说"加个任务 XXX"，则写入当前绑定看板
- **查看看板**：优先用 `taskboard_list_tasks` 或 `/taskboard list open`
- **更新状态**：优先用 `taskboard_update_task` / `taskboard_complete_task`
- **每日汇报**：Heartbeat 自动检查逾期和阻塞任务

> 插件配置会保存 board key、appToken、tableId；URL 仍建议记到 MEMORY.md 便于人工追踪。

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
