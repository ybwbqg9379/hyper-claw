---
description: 为指定 Key Person 生成个性化邮件主题和正文
---

# BD Email — 邮件正文生成

用法：用户说「给 [姓名] 写封邮件」或 `/bd-email [姓名]`

## 执行步骤

1. 读取 `reference/bd-playbook.md` 获取邮件生成规范
2. 读取 `reference/product-overview.md` 获取产品知识
3. 从 `memory/` 或 `MEMORY.md` 中查找该 Key Person 的已有信息和性格画像
4. 如果没有性格画像，先执行快速画像分析：
   - `web_search` 搜索其 LinkedIn 公开信息
   - 用 DISC 模型快速分析沟通风格和痛点
5. 生成三个版本的邮件内容：

### 版本 1：英文邮件

- **Subject**: 按 bd-playbook.md 主题行公式生成
- **Body**: 按正文结构（开场→痛点→方案→CTA→附注）

### 版本 2：中文邮件

- **主题**: 中文适配版
- **正文**: 中文适配版（语气和表达习惯本地化）

### 版本 3：LinkedIn 连接请求

- 300 字以内
- 简洁有力，重点突出个性化切入点和价值

6. 所有版本输出给用户，**不自动发送**

## 个性化检查清单

生成前确认以下变量已填充：

- [ ] `{name}` — 对方姓名
- [ ] `{company}` — 公司名
- [ ] `{role}` — 职位
- [ ] `{recent_activity}` — 近期动态/成就
- [ ] `{pain_point}` — 定制痛点
- [ ] `{hook}` — 个性化切入点

如果任何变量缺失，先搜索补齐再生成。

## 质量标准

- 开场不用 "I hope this email finds you well" 等套话
- 每封邮件必须有至少一个明确的个性化元素
- CTA 明确且低摩擦（30秒 demo / 发示例图）
- 正文不超过 200 词（英文）/ 300 字（中文）
