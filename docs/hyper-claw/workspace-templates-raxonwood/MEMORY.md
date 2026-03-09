# MEMORY.md — 长期记忆

## 用户偏好（已确认）

- 中文沟通，技术术语可保留英文
- 不喜欢废话和过度客气
- 喜欢先想清楚再动手，但决定了就快速推进

## 血泪教训

_（在这里记录犯过的错误和永久性规则，防止重蹈覆辙）_

## 交易哲学

### EV 第一性原理（Expected Value First）

一切决策归结为期望值计算，不做 if-then 规则，而是从一生应用这套思维框架：

```
E[decision] = P(holding improves P/L) × E[improvement]
            - P(holding worsens P/L) × E[worsening]
            - daily_theta_cost × expected_holding_days
```

AI 不是执行乱码，而是回答："继续持有这个仓位的预期价值是正还是负？"

### 领域知识驱动（Domain Knowledge, Not Rules）

Prompt 提供长期式期权的力学常识（gamma/theta tradeoff、theta 加速、IV/vega 膨胀、split 策略特性），而不是 if-then 决策树。

- **Theta 加速**：DTE 从 15 天→5 天→2 天，theta 衰减从 2x 加速到 4x
- **Gamma 期权价值**：Theta 是持有成本，Gamma 是持有的资产——保住资产的时间价值
- **Loss Quality**：区分 productive loss（策略 divergence = straddle 设计工作）vs destructive loss（双腿同亏 = 市场不利）

### 核心信条

- **"我们不做预测，只做概率优先"** — 不赌方向，赌波动率
- **"风险永远先于收益"** — 安全护栏不可逾越，Dynamic Floor 保底
- **"市场是机器，代码才是真理"** — 一切手动操作终将被自动化替代
- **"可量化，不要模糊"** — 每个决策必须有数字支撑
- **"让 AI 做判断，让规则做兜底"** — AI 有决策权，但护栏永远硬编码

## 项目知识

### QuantTrading — Straddle Split 期权交易系统

**策略核心：** 同时买入同一标的的 Call 和 Put，依赖 IV 膨胀或标的大幅波动获利，通过 AI 辅助的动态退出决策管理风险与收益。

**技术栈:**

- Python 3 + asyncio
- Redis Pub/Sub（通道 + 共享 Key）
- PostgreSQL（SQLAlchemy ORM）
- Interactive Brokers TWS API（`ib_insync`）
- Massive WebSocket（Polygon 兼容协议）
- AI 推理：本地模型服务器（OpenAI 兼容 API）+ 云端 AI（Gemini, OpenAI, Anthropic, Grok）
- 时区：所有服务基于美东时间（EST/EDT）

**5 个核心服务:**

1. **TradingHub** — 市场数据摄取（2 条 WebSocket 连接，1000 原始订阅，09:25-16:05 EST）
2. **TradingSignal** — 信号生成（Z-Score，仅接受 medium_strong/strong，06:30/08:30-16:05 EST）
3. **TradingCoordinator** — 中央编排器（策略管理、AI 调度、事务外发箱，08:30-16:20 EST）
4. **TradingRC** — 风险控制（资金检查、仓位校验、Executor 健康网关，09:20-16:20 EST）
5. **TradingExecutor** — 订单执行（IB TWS，LMT/MKT/ADAPTIVE 订单，09:20-16:20 EST）

**AI 决策引擎（5 个服务）:**

1. **AIDirectionService** — 盘前方向预测（Google Gemini + Search Grounding，预测窗口 7 天）
2. **AILimitPriceAdvisor** — 订单限价优化（本地模型端口 1235，BUY 不用 ask/SELL 不用 bid）
3. **AIExitAdvisor（决策）** — AI_DYNAMIC 模式主决策者（本地模型端口 1234，EV 框架决策）
4. **AIExitAdvisor（验证）** — THRESHOLD_ONLY 模式阈值触发后验证（CONFIRM/REJECT/ADJUST/DEFER）
5. **BreakevenExitAdvisor** — 一腿平仓后管理剩余腿（Certainty-Optionality 权衡）

**退出决策模式:**

- **THRESHOLD_ONLY（Production）** — 静态阈值触发 → AI 验证（AI 拥有主权决策权）
- **AI_DYNAMIC（Test）** — AI 周期性主导评估 → EXIT/HOLD（安全护栏内拥有决策引领权）

**安全护栏（不可逾越）:**

- Level 0: 到期强平、报价陈旧（>120s）、资金不足
- Level 0.5: Dynamic Floor（sqrt 插值，base=-30%, max=-75%）
- Tier 1 Catastrophic Exit: combo ≤ -40% + (consumed≥80% + 双腿均亏)

**环境差异（Test vs Production）:**

- 资金安全边际：1.2× vs 1.25×
- 最小储备金：$50K vs $27K
- 单笔订单上限：$30K vs $25K
- Exit Decision Mode: AI_DYNAMIC vs THRESHOLD_ONLY
- Friday 买入：Test 允许 vs Prod 排除
- 价格范围：Test 3~40 vs Prod 3~30

**当前运行状态:**

- Test: 所有 AI 服务启用，Exit Decision = AI_DYNAMIC
- Production: 所有 AI 服务启用，Exit Decision = THRESHOLD_ONLY

## 技术决策

_（记录与 QuantTrading 相关的重要技术决策）_

## 反复出现的模式

_（在这里记录主人反复使用的工作模式、常见请求类型、偏好的处理方式）_

---

**详细参考文档:**

- `memory/trading-system-overview.md` — Straddle Split 交易系统完整架构概览（服务架构、入场/退场链路、AI 决策引擎、风控层、环境差异矩阵）

_此文件按需更新。每隔几天在心跳期间审视，蒸馏每日日志中的关键信息。总字数控制在 5000 字以内。详细资料放在 `memory/` 目录下。_
