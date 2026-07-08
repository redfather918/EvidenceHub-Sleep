# EvidenceHub Media Factory (EMF) — Product Requirements Document

**Version:** 1.0
**Status:** Active (P0–P3 engine implemented; P4–P5 pending)
**Owner:** EvidenceHub
**Last updated:** 2026-07-09

---

## 0. 一句话定位

> **EMF 不是「做视频」的工具，而是 EvidenceHub 的 AI Distribution Engine（AI 分发引擎）。**

数据库只有一份（EvidenceHub Claim / Study）。Media 无限生成：视频、Shorts、TikTok、Instagram Reels、Pinterest Pin、X Thread、LinkedIn、Reddit、Newsletter。整个系统只有 **QA Review** 需要人工，其余全自动。

---

## 1. 为什么叫 Media Factory，不叫 Video Factory

Video 只是 Media 的一种形态。从第一天起就按 **Media Factory** 设计，未来可无缝扩展到：

- Long-form video (YouTube)
- Shorts / TikTok / Instagram Reels
- Pinterest Pin（图片）
- X Thread / LinkedIn / Reddit（文字）
- Newsletter（邮件）

数据库（Claim / Study）不变，前端渲染层（Media Generator）可插拔。**一份证据，多种媒体，无限分发。**

---

## 2. 系统总览：AI 增长飞轮

```
PubMed 新论文
        │
        ▼
EvidenceHub 数据库（Claim / Study）
        │
        ▼
Content Planner（按周/按天生成内容矩阵）  ◄── 系统大脑
        │
        ▼
Template Engine（每个 Item 自动生成 3~5 个版本）
        │
        ▼
Media Factory（视频 / 图片 / Thread / Newsletter）
        │
        ▼
Review Queue（你每天只审核 20~30 条）
        │
        ▼
Auto Publish（YouTube / TikTok / Instagram / X / Pinterest）
        │
        ▼
Analytics Collector（播放、留存、分享）
        │
        ▼
Viral Library（沉淀哪些 Hook / Template / Topic 最容易爆）
        │
        └─────────────── 反馈给 Planner，下一周自动优化
```

这是**可持续的 AI 增长飞轮**：系统自己生产、自己发布、自己学习、自己优化。

---

## 3. 模块详解

### 3.1 Scheduler（调度器）
- 每天凌晨触发整条流水线。
- 职责：唤醒 Planner → 拉取当天待生产清单 → 顺序执行下游。

### 3.2 Content Planner（内容规划器）⭐ 系统大脑
- **最重要模块。** 决定「今天生产什么」。
- 从 EvidenceHub 数据库 + 内容矩阵（见 §6）自动展开：
  - 哪个 Category（Sleep / Nutrition / Heart）
  - 哪个 Pillar（Foods / Supplements / Exercise…）
  - 哪个 Item（Kiwi / Walnut / Oats…）
  - 哪个 Template（A~E）
- 输出结构化 `PlannedItem[]`，供下游消费。
- 双维度调度策略见 §7。

### 3.3 Template Matrix（模板矩阵）
- 一个 Item **不是生成 1 个视频，而是 5 个版本**（A/B/C/D/E），用于自动 A/B Test。
- 模板定义见 §6.3：
  - **A — Question**：`Can kiwi improve sleep?`
  - **B — Scientists**：`Scientists tested kiwi.`
  - **C — Myth**：`Most people underestimate kiwi.`
  - **D — Ranking**：`Top sleep foods.`
  - **E — Evidence**：`Evidence level: ★★★★☆`
- 每个 Item 在循环中被轮流分配到不同模板 → 自然形成对照实验。

### 3.4 AI Script Generator（脚本生成器）
- 输入：`{ topic, item, template }` + Claim 结构化字段（summary / mechanism / studyCount / evidenceScore…）。
- 输出：`{ hook, body[], ending }` + 预估时长 + 指定 voice。
- 确定性拼装优先（由 Claim DB 字段生成），可选接 LLM 做更自然的叙述。

### 3.5 Asset Generator（素材生成器）
- 自动检索/生成视觉素材：Kiwi PNG、Moon、Stars 图标，或调用 Flux 等文生图。
- 统一视觉风格与品牌色。

### 3.6 Video Generator（视频生成器）
- 统一时间线模板（见 §8.3），所有视频结构一致，便于规模化与品牌一致。
- 接入 TTS（默认 US Female, Voice A, 1.05x）+ 图片序列 → 成片。

### 3.7 Review Queue（审核队列）⭐ 唯一人工环节
- 后台页面：每天生成 ~25 条，逐条 `Approve / Reject / Edit`。
- 点一下即放行到发布队列。

### 3.8 Publish Queue（发布队列）
- 按平台预设时间段自动排队：
  - TikTok：08 / 10 / 12 / 14 / 16 / 18 / 20
  - YouTube：09 / 11 / 13 / 15 / 17 / 19 / 21
- 到点自动调用各平台 API 发布。

### 3.9 Analytics Collector（数据回收）
- 每个视频回流：`Views / Watch Time / CTR / Likes / Comments / Shares`。
- 按 Template / Topic / Item 自动打分（如 Scientists=91, Ranking=72）。

### 3.10 Viral Library（爆款库）⭐ 最值钱模块
- 数据库不只是 Claim，而是沉淀：
  `Claim + Best Hook + Best Thumbnail + Best Template + Average Views`。
- 例：Kiwi 跑过 20 条视频，Template B 平均 50 万播放 → 所有水果默认用 Template B。
- **AI 自己学习**，反馈给 Planner 自动加权。

---

## 4. 内容矩阵（Content Matrix）

### 4.1 Sleep
| Pillar | 目标存量 |
|---|---|
| Foods | 100 |
| Supplements | 100 |
| Exercise | 100 |
| Habits | 100 |
| Bedroom | 50 |
| Devices | 50 |
| Sleep Myths | 100 |
| Sleep Science | 100 |

### 4.2 Nutrition
Fiber / Protein / Omega3 / Vegetables / Fruit / Coffee

### 4.3 Heart
Blood Pressure / AF / HRV / Inflammation

> 每个 Pillar 维护一个 evergreen item 池（循环发布、持续优化模板）。
> 具体 item 列表从 Claim DB 自动抽取 + 种子补充。

---

## 5. 命名规则（Naming Rule）

统一文件与数据库命名，便于检索与对账：

```
2026-W28
  MON
  Foods
  Kiwi
  T-C
```

文件名：
```
2026W28_Mon_Foods_Kiwi_TC.mp4
```

结构：`{YYYY}W{WW}_{Day}_{Pillar}_{Item}_T{TemplateCode}.{ext}`
- `Day`：MON / TUE / WED / THU / FRI / SAT / SUN
- `TemplateCode`：A / B / C / D / E
- `ext`：视频 `mp4`，图片 `png`，thread `md`

数据库记录同样带 `weekKey / dayKey / templateCode`，与文件名 1:1 对应。

---

## 6. 双维度调度策略（关键设计决策）

> **不要按星期切换主题**（「这周 Sleep Foods，下周 Supplements」对运营方便，但对平台算法未必最优）。

改为两个维度混合：

### ① Evergreen Content（80%）
长期不过时：Kiwi / Glycine / Magnesium / Exercise / Oats。
循环发布、不断优化模板。

### ② Fresh Content（20%）
每天从 PubMed 新论文自动生成：
`"New study"` / `"Researchers found..."` / `"2026 study"`。
保持新鲜度，让算法持续测试新素材。

**Planner 每天自动组合：**
- 4 条 Evergreen
- 1 条 Fresh Study

长期比「按周切主题」更容易形成持续增长，也更抗算法波动。

---

## 7. 技术架构与数据模型

- **单一数据库**：复用 EvidenceHub Supabase/PostgreSQL。新增表：
  - `media_plan`（PlannedItem 落地）
  - `media_asset`（生成产物：视频/图片/thread + 状态）
  - `review_queue`（审核状态）
  - `publish_queue`（发布排期）
  - `media_analytics`（回流指标）
  - `viral_library`（Hook/Template/Topic 表现沉淀）
- **生成层可插拔**：Media Generator 按 `MediaKind` 分发到不同渲染器（video / image / thread / newsletter）。
- **确定性优先**：Planner / Template 默认确定性（按日期种子旋转），保证可复现、可对账；LLM 仅用于增强叙述，不作为硬依赖。

---

## 8. 统一生产规格

### 8.1 Voice（固定）
```
US Female / Voice A / 1.05x
```
永久固定，不每次选择。

### 8.2 Video Timeline（固定模板，单位：秒）
```
0–2   Hook
2–6   {Item} PNG
6–14  Evidence
14–22 Stars
22–28 Summary
28–30 Logo
```
总计 30s。所有视频结构一致。

### 8.3 默认发布时间段
- TikTok：08 / 10 / 12 / 14 / 16 / 18 / 20
- YouTube：09 / 11 / 13 / 15 / 17 / 19 / 21

---

## 9. 实施路线图

| Phase | 范围 | 状态 |
|---|---|---|
| **Phase 0 — Engine** | 类型/配置/内容矩阵/Content Planner/Template Engine + 离线演示脚本 | ✅ 已完成 |
| **Phase 1 — Plan Persistence** | `media_plan` 表(migration 00003) + Scheduler 接入(`job:emf`) + CLI(`emf:schedule`) | ✅ 已完成（持久化需在 Supabase SQL Editor 执行一次 00003 迁移） |
| **Phase 2 — Script & Asset** | AI Script Generator（接 LLM，已验证 live）+ Asset Generator（Flux/PNG，key 缺失时降级为 spec） | ✅ 已完成 |
| **Phase 3 — Video** | Video Generator（TTS 接 OpenAI key 时 live；ffmpeg 渲染生成 manifest，live+素材齐时出片） | ✅ 已完成 |
| Phase 4 — Review & Publish | Review Queue 后台页 + Publish Queue + 平台 API | 待开始 |
| Phase 5 — Analytics & Viral | Analytics Collector + Viral Library + 反馈 Planner 自动优化 | 待开始 |

**本轮交付（Phase 0）**：可离线运行、可单测的「大脑」——给定内容矩阵与种子池，
自动产出一周 `PlannedItem[]`（含命名、双维度 80/20、模板轮转），并把任意 Item+Template
渲染为 `ScriptDraft`（hook/body/ending）。后续 Phase 在其上叠加持久化、生成与发布。

---

## 10. 成功指标（KPI）

- 日均发布条数（目标 20~30）
- 人均审核时间（目标 < 15 min/天）
- Template 维度 CTR / 完播率方差（验证 A/B 假设）
- Viral Library 命中率（被复用 Best Hook/Template 占比）
- 账号级增长（订阅 / 粉丝 / 站外引流）

---

## 11. 风险与开放问题

- 平台 API 配额与合规（TikTok/YouTube 发布限制）。
- TTS / 文生图 / 视频渲染的外部成本与速率。
- Fresh 内容的事实准确性（必须锚定 Claim DB，禁止编造）。
- 模板疲劳（需 Viral Library 周期性刷新模板组合）。
- 版权与音乐素材。
