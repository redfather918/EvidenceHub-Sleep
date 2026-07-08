# EvidenceHub V3 — Module 5：Claim Article View（AI-Generated Deep Dive）

> **定位：** 把任意 Claim 自动渲染成一篇「循证长文（Deep Dive）」。内容由该 Claim 在数据库里的结构化字段（summary / mechanism / faq / limitations / studies）自动拼装而成——即「基于我们的数据库 Claims，AI 自动生成」。
> **归属：** 本模块是 **Claim 模块的一个新视图（Article View）**，不新增第 5 个独立产品模块（遵循 V3 Overview「任何功能必须归属 4 模块之一」原则）。

---

## 1. 目标（Goal）

- 让普通用户以「读文章」的方式消费一条 Claim 的循证结论，而不是面对一张结构化数据表。
- 每篇文章都由 Claim 的结构化数据**自动生成**，无需人工撰写；上线即有全部 Claims 的文章页。
- 文章页对 SEO / GEO 友好（`Article` + `FAQPage` JSON-LD），可被 Google 与 AI 引擎引用。
- 首页提供「Featured Deep Dive」入口，直接展示代表性长文（如 sleep duration 主题）。

---

## 2. 用户故事（User Story）

> 作为访客，我想用一篇易懂的文章了解「睡眠时长与抗衰老」背后的证据，于是我点开首页的 Featured Deep Dive（或某 Claim 卡片的 📖 Article 链接），看到一篇带证据评分、研究方法、机制、适用人群、剂量、局限性与 FAQ 的长文，文末还有参考文献和相关 Claim。

---

## 3. 数据模型（Data Model）

### 3.1 现有数据（直接复用，MVP 无需新表）

文章完全由 `ClaimWithRelations` 拼装：

| 字段 | 用于文章章节 |
|---|---|
| `text` | H1 标题 + "The Claim" |
| `summary` | 副标题 + Lede |
| `category` / `topic.name` | Kicker |
| `studyCount` / `rctCount` / `metaCount` / `evidenceScore` / `confidence` | Lede + 证据评分条 |
| `studies[]`（标题/期刊/年份/result/PMID/DOI） | "What the Research Shows" + References |
| `mechanism[]` | "How It Works" |
| `populationFits[]` / `population[]` | "Who Might Benefit" |
| `doseMappings[]` / `dose` | "Recommended Dose" |
| `limitations[]` | "Limitations & Caveats" |
| `faq[]` | "Frequently Asked Questions" |
| `relatedClaims[]` | "Related Claims" |

### 3.2 未来增强（可选，需 `articles` 表 / LLM）

- **编辑化标题与摘要：** 新增 `articles` 表（`claim_slug` UNIQUE、`title`、`excerpt`、`status`、`published_at`），存储由 pipeline LLM 生成的「爆款标题 + 导语」（例如用户示例 *"The Best Sleep Duration for Anti-Aging | Nature Study Debunks 8-Hour Sleep Myth"*）。文章页优先读取 `articles` 行，缺失则回退到 Claim 字段。
- **实时 LLM 润色：** `composeArticle()` 当前为确定性拼装；可加一个 gated（按 `OPENAI_API_KEY` 等环境变量开关）的 LLM 层，把各章节段落改写为更连贯的叙述，而不改变事实与引用。

> MVP 不引入上述依赖，保证零密钥、即时可用、对所有 Claim 自动生效。

---

## 4. 页面规格（Page Spec）

**路由：** `/article/[slug]`（slug = claim.slug）

**渲染（服务端组件，ISR 1h）：**

1. Hero：Kicker（category · topic）→ H1（claim.text）→ 副标题（summary）→ 元信息（阅读时长 / 更新日期 / RCT 数 / Meta 数 / 「View structured evidence →」）
2. 证据评分条（`EvidenceScoreBadge` + 说明文案）
3. Lede（一段自动生成导语）
4. Sections（按 §3.1 顺序）
5. FAQ（`<details>` 渲染）
6. References（带 PMID / DOI 外链）
7. Related Claims（`ClaimCard` 网格）
8. Disclaimer

**SEO：**
- `generateMetadata` → `title` / `description` / `canonical: /article/[slug]` / OG / Twitter
- JSON-LD：`Article` + `FAQPage` + `BreadcrumbList`

**入口（集成点）：**
- Claim 详情页 header：「📖 Read as article →」
- `ClaimCard` 底部：「📖 Article」链接
- 首页 Stats 下方：「Featured Deep Dive」横幅（优先 sleep duration 主题 Claim）

---

## 5. 实现状态（Implementation Status）

- [x] `src/lib/article.ts` — `composeArticle(claim): ArticleContent`（章节 / Lede / 阅读时长）
- [x] `src/lib/seo.ts` — `generateArticleJsonLd` + `generateArticleMetadata`
- [x] `src/app/article/[slug]/page.tsx` — 文章页（Hero / Sections / FAQ / References / Related / JSON-LD）
- [x] Claim 详情页 header 加「Read as article」链接
- [x] `ClaimCard` 重构为 div 容器 + 底部「Article」链接
- [x] 首页「Featured Deep Dive」横幅
- [x] `next build` 通过（0 错误）

---

## 6. 验收标准（Acceptance Criteria）

- [x] 访问任意 `/article/[slug]`（slug 为已有 claim）返回 200 且内容完整
- [x] 文章由该 claim 数据自动生成，无硬编码正文
- [x] 页面含 `Article` JSON-LD 与 `FAQPage` JSON-LD
- [x] Claim 详情页与 ClaimCard 均可跳转文章页
- [x] 首页 Featured Deep Dive 正确指向 sleep duration 主题文章
- [ ] （未来）`articles` 表 + LLM 生成编辑化标题/导语

---

*EvidenceHub V3 — Module 5 Claim Article View PRD — 2026-07-09*
