---
description: 快速搜索指定品牌的 Key Person
---

# BD Search — 快速 Key Person 搜索

用法：用户说「搜一下 [品牌名] 的人」或 `/bd-search [品牌名]`

## 执行步骤

1. 读取 `reference/bd-playbook.md` 获取搜索策略和输出格式
2. 用 `web_search` 执行搜索：
   - `site:linkedin.com/in "[品牌名]" "marketing director" OR "creative director" OR "brand manager" OR "e-commerce director" OR "CMO"`
   - 如果 LinkedIn 结果不够，补充搜索企业官网和行业媒体
3. 对每个找到的 Key Person，输出结构化信息：
   ```
   - 姓名：
   - 公司：
   - 职位：
   - LinkedIn URL：
   - Email（如有）：
   - 匹配度：⭐ ~ ⭐⭐⭐⭐⭐
   - 关键情报：
   ```
4. 推荐匹配度最高的 2-3 人，给出理由
5. 用户确认后，将结果追加到 `memory/YYYY-MM-DD.md`

## 注意

- 每次搜索一个品牌，不要批量
- 输出简洁，不要长篇大论
- LinkedIn 搜索可能有限制，如果无结果就换关键词组合
