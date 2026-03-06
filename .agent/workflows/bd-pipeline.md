---
description: B2B 营销全流程 — 从客群画像分析到个性化邮件生成
---

# BD Pipeline 全流程

执行 HyperCreator B2B 营销的标准 pipeline。

## 用法

- `/bd-pipeline [品牌名]` — 对单个品牌执行全流程，自动跑完不中断
- `/bd-pipeline` — 无参数时，询问目标行业/品牌后按批次执行

## 前置准备

1. 读取 `reference/bd-playbook.md` 获取 BD 标准规范
2. 读取 `reference/product-overview.md` 获取产品知识
3. 读取 `MEMORY.md` 获取已有的 Key Person 记录

---

## ⚠️ 执行模式：全自动，禁止中途停下来问问题

**关键规则（必须严格遵守）：**

- **禁止**在任何步骤之间停下来询问用户
- **禁止**输出「需要我继续吗？」「要我执行吗？」「请确认」等确认性问题
- **禁止**分步输出、等待回复后再继续
- **必须**一次性完成 Step 1 到 Step 4 的全部内容
- **必须**在最后一条消息中输出所有结果
- 如果某一步搜索不到信息，**跳过该步骤并注明原因**，继续执行下一步
- 如果 LinkedIn 信息有限，用其他公开信息补充，**不要停下来问怎么办**

---

## 单品牌全自动模式（带参数）

当用户发送 `/bd-pipeline [品牌名]` 时，在**一条回复**中完成以下全部步骤：

### Step 1：品牌画像

1. `web_search` 搜索该品牌的基本信息、规模、市场策略、出海动态
2. 总结：行业定位、内容生产现状、可能的痛点

### Step 2：Key Person 搜索

1. `web_search`: `site:linkedin.com/in "[品牌名]" "marketing director" OR "creative director" OR "brand manager" OR "e-commerce director" OR "CMO"`
2. 补充搜索企业官网 About/Team 页面
3. 筛选出匹配度最高的 2-3 人
4. 如果搜索不到 LinkedIn 信息，用企业官网、行业报道、公开采访等渠道补充，不要停下来问

### Step 3：Profile 分析与个性化

对每个 Key Person：

1. `web_search` 获取其公开信息
2. 按 DISC 简化模型分析：沟通风格 / 决策偏好 / 痛点敏感度 / 个性化切入点
3. 如果公开信息不足，基于其职位和品牌特征进行合理推断，标注 `[推断]`

### Step 4：邮件正文生成

对每个 Key Person，直接生成以下三个版本（不要问要不要生成，直接生成）：

**英文邮件：**

- Subject: 按 bd-playbook.md 主题行公式
- Body: 开场→痛点→方案→CTA（不超过 200 词）

**中文邮件：**

- 主题: 中文适配版
- 正文: 中文适配版（不超过 300 字）

**LinkedIn 连接请求：**

- 300 字以内，简洁有力

### 输出格式

在最后的回复中，按以下格式统一输出：

```
## [品牌名] BD Pipeline 完成

### 品牌画像
[简要画像]

---

### Key Person 1: [姓名] — [职位] @ [公司]

**性格画像：** [沟通风格] / [决策偏好] / [痛点侧重]
**个性化切入点：** [具体描述]

#### 英文邮件
**Subject:** ...
**Body:**
...

#### 中文邮件
**主题：** ...
**正文：**
...

#### LinkedIn 连接请求
...

---

### Key Person 2: [姓名] — [职位] @ [公司]
[同上格式]
```

### 完成后

将结果记录到 `memory/YYYY-MM-DD.md`。不要问「需要我记录吗」，直接记录。

---

## 批量模式（无参数）— Subagent 并行

当用户发送 `/bd-pipeline`（无参数）时：

1. 询问目标行业/地域/品类（这是唯一允许提问的场景）
2. 用户回答后，确定品牌列表
3. **使用 subagent 并行处理多个品牌**：
   - 为每个品牌 spawn 一个独立 subagent
   - 每个 subagent 在隔离 session 中独立执行完整 Step 1-4
   - subagent 的指令格式：`执行 /bd-pipeline [品牌名]，读取 reference/bd-playbook.md 和 reference/product-overview.md，完成后将结果写入 memory/YYYY-MM-DD.md`
   - 主 agent 等待所有 subagent 完成后汇总结果
4. 输出汇总报告

### Subagent 配置

- 最大并发：8（已在 `openclaw.json` 配置 `subagents.maxConcurrent: 8`）
- 每个 subagent 使用隔离 session，不影响主对话上下文
- subagent 完成后自动释放

### Subagent 使用示例

```
我需要为以下品牌执行 BD Pipeline：
1. Flortte
2. Timage
3. Romand

请为每个品牌创建一个 subagent 并行执行，完成后汇总结果。
```

## 注意事项

- 单品牌模式：全程不停，最后一次性输出
- 批量模式：使用 subagent 并行，主 agent 汇总
- 邮件只生成不发送
- 所有结果写入 memory 持久化
- 遇到搜索受限时自动切换策略，不要停下来问
