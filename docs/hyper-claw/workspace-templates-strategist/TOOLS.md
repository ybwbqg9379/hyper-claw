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

_（暂无自定义 skill，后续安装后在此记录）_

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
