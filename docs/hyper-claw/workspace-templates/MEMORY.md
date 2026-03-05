# MEMORY.md — 长期记忆

> ⚠️ 仅在主 Session（私聊）中加载。群聊场景严禁读取此文件。

## 用户偏好（已确认）

- 中文沟通，代码和 commit message 用英文
- 不喜欢废话和过度客气
- 偏好 Conventional Commits 格式
- 喜欢先想清楚再动手，但决定了就快速推进

## 血泪教训

_（在这里记录犯过的错误和永久性规则，防止重蹈覆辙）_

<!-- 示例格式：
- **[2026-03-04]** 错误：在没有确认的情况下删除了某个文件。规则：永远不要未经确认就删除文件。
-->

## 项目知识

### HyperClaw

- 基于 OpenClaw fork，使用 upstream + fork 模式管理
- 已集成飞书（Feishu），WebSocket 长连接方式
- 支持本地 LLM（llama-server + Qwen3.5-4B）
- 自定义内容放在 `extensions/`、`skills/`、`docs/hyper-claw/` 减少合并冲突
- Commit message 遵循 Conventional Commits，通过 git-hooks 自动验证

## 技术决策

- **Workspace 文件体系**：采用 SOUL.md / USER.md / MEMORY.md 三层架构（身份层、操作层、知识层），2026-03-04 初始化
- **Session 隔离**：推荐使用 `per-account-channel-peer` 策略

## 反复出现的模式

_（在这里记录主人反复使用的工作模式、常见请求类型、偏好的处理方式）_

---

_此文件按需更新。每隔几天在心跳期间审视，蒸馏每日日志中的关键信息。总字数控制在 5000 字以内。_
