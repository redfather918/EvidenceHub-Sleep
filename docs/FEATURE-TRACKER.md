# EvidenceHub Sleep — Feature Tracker

> 跟踪 PRD v3.0 中所有功能的实现状态与简单功能介绍
> Updated: 2026-07-06

---

## 一、前端页面（7 Pages + Layout）

| # | 路由 | PRD 引用 | 状态 | 功能介绍 |
|---|------|---------|------|---------|
| 1 | `/` (首页) | §九 | ✅ 已完成 | 搜索栏 + Trending Claims + Latest Claims + Topics 导航卡片 + 统计条（11 Claims / 15 Studies / 8 Topics / 15 RCTs）。SSG 静态生成，首次加载 94 kB。 |
| 2 | `/claims` | §九 | ✅ 已完成 | 所有 Claims 按 7 个分类（Sleep Quality / Sleep Latency / Duration / Circadian / Stress / Nutrition / Exercise）分组展示，每个 Claim 显示 Evidence Score 颜色徽章和关键信息。 |
| 3 | `/claim/[slug]` | §九 - 核心页面 | ✅ 已完成 | **核心资产页面**，11 个模块全覆盖（见下方 §十一模块），41 行中文注释，ISR 3600s，11 条 slug 预渲染。 |
| 4 | `/topics` | §九 | ✅ 已完成 | 8 个 Topic 卡片网格展示，每个卡片包含名称、描述、Claim 数量和平均 Evidence Score。 |
| 5 | `/topics/[slug]` | §九 | ✅ 已完成 | 主题详情页：主题名称 + 描述 + Claims 数量 / RCTs 数量 / Average Score 统计 + 所有子 Claim 卡片列表。8 条 slug 预渲染。 |
| 6 | `/search` | §九 | ✅ 已完成 | 关键词搜索页，接受 `?q=` 参数，全文搜索 Claim 文本/摘要/关键词/分类，空查询展示全部 Claims。Server-rendered。 |
| 7 | `/api-docs` | §九 | ✅ 已完成 | API 文档页面，展示 3 个 REST 端点的请求/响应格式 + MCP Server 路线图说明。SSG 渲染。 |
| - | Layout（全局） | — | ✅ 已完成 | 全局导航栏 + 页脚 + WebSite JSON-LD Schema + OpenGraph metadata。所有页面共享。 |

---

## 二、Claim 详情页 11 模块

| # | 模块 | PRD §十二 | 状态 | 功能介绍 |
|---|------|----------|------|---------|
| 1 | Claim Summary | ✅ | ✅ 已完成 | 一句话结论陈述（如 "Glycine reduces sleep latency by 10-20% in healthy adults"），位于页面顶部。 |
| 2 | Evidence Score | ✅ | ✅ 已完成 | 综合评分（0-100）+ 4 维度星级评分：Human RCT / Meta-analysis / Mechanism / Safety + Confidence 级别（high/moderate/low）。分数 >=85 绿色，>=70 黄色，<70 红色。 |
| 3 | Study Evidence | ✅ | ✅ 已完成 | 结构化研究卡片列表，每张显示：标题、期刊、年份、研究类型（RCT/Meta/Observational/Animal）、样本量、干预方式、结局、效应量。含 PubMed/DOI 链接。 |
| 4 | Dose Response | ✅ | ✅ 已完成 | 剂量响应表，包含不同剂量范围及对应效果描述，最佳剂量标记 "OPTIMAL"。每个 Claim 至少 2 条剂量映射。 |
| 5 | Mechanism Graph | ✅ | ✅ 已完成 | 机制路径的箭头流程图（如 "Glycine → activates GlyR → inhibits CNS → reduces sleep latency"）。 |
| 6 | Population Fit | ✅ | ✅ 已完成 | 人群适用性表，用 ✅（适用）/ ⚠️（需咨询）/ ❌（不推荐）标记不同人群组。每个 Claim 至少 3 个人群。 |
| 7 | Limitations | ✅ | ✅ 已完成 | 局限性列表，强制存在（所有 Claim 必须声明研究局限性，符合科学规范）。 |
| 8 | FAQ | ✅ | ✅ 已完成 | 可展开的常见问题（收折/展开交互），每个 Claim 至少 2 个 FAQ。同时注入 FAQPage JSON-LD Schema。 |
| 9 | Related Claims | ✅ | ✅ 已完成 | 相关 Claim 卡片横向展示，点击跳转到对应详情页。 |
| 10 | Products | ✅ | ✅ 已完成 | Affiliate 产品占位区域，展示与 Claim 相关的补充剂产品，含 Amazon/iHerb 链接骨架。 |
| 11 | References | ✅ | ✅ 已完成 | 参考文献列表，显示 PubMed ID（链接到 PubMed）+ DOI 链接，含研究标题和期刊信息。 |

---

## 三、API 端点（12 Routes）

### 3.1 数据 API（5 个）

| # | 路由 | PRD §十三 | 状态 | 功能介绍 |
|---|------|---------|------|---------|
| 1 | `GET /api/claim/[slug]` | ✅ | ✅ 已完成 | 返回结构化 Claim JSON：evidenceScore、confidence、humanRctScore、metaScore、dose、population、faq + `_links` 导航。404 返回 `availableEndpoints`。 |
| 2 | `GET /api/evidence/[topic]` | ✅ | ✅ 已完成 | 返回 Topic 级证据汇总：summary、strength、claimCount、rctCount、avgEvidenceScore、claims 列表。404 返回 `availableTopics`。 |
| 3 | `GET /api/search` | ✅ | ✅ 已完成 | 全文搜索：接受 `?q=` 和 `?limit=`。结果含 slug、text、evidenceScore、confidence、dose、rcts、category、url。400 返回 `example`。 |
| 4 | `POST /api/newsletter/subscribe` | — | ✅ 已完成 | Newsletter 订阅接口，接受 `{email}`，持久化到 Supabase `newsletter_subscribers` 表。Supabase 未配置时返回 demo 成功。 |
| 5 | `POST /api/revalidate` | — | ✅ 已完成 | 按需 ISR 重新验证接口。需 `x-revalidate-token` 认证。接受 `?path=` 指定单页面重新验证。 |

### 3.2 Cron Job API（7 个）

| # | 路由 | Job | PRD §七 | 状态 | 功能介绍 |
|---|------|-----|---------|------|---------|
| 6 | `GET /api/cron/fetch-papers` | Job 1 | ✅ | ✅ 已完成 | 每日 2:00 AM 从 PubMed E-utilities API 抓取最新睡眠研究论文（12 搜索词、90 天范围、批量 50 篇），存入 Supabase studies 表。 |
| 7 | `GET /api/cron/ai-parse` | Job 2 | ✅ | ✅ 已完成 | 每小时 :00 检查未处理的论文 → 用 AI（DeepSeek/OpenAI/Mock）提取结构化 Claims → 写入数据库 claims/studies 表 → 建立 claim-study 关联。 |
| 8 | `GET /api/cron/update-claims` | Job 3 | ✅ | ✅ 已完成 | 每小时 :15 对新 Claims 执行去重匹配（Jaccard 相似度 40% text + 30% keywords + 30% topic）→ 合并到已有 Claim 或创建新 Claim → 重算 Evidence Score。 |
| 9 | `GET /api/cron/revalidate` | Job 4 | ✅ | ✅ 已完成 | 每小时 :30 触发 ISR 重新验证所有静态页面（首页/claims/topics/api-docs）+ 所有 Claim 页面（11 条）+ 所有 Topic 页面（8 条）+ Sitemap + RSS。 |
| 10 | `GET /api/cron/seo-update` | Job 5 | ✅ | ✅ 已完成 | 每日 4:00 AM 重新验证 sitemap.xml + robots.txt + RSS feed → Ping Google Sitemap API → 提交 IndexNow（Bing/Yandex）。 |
| 11 | `GET /api/cron/affiliate-update` | Job 6 | ✅ | 🟡 框架完成 | 每周一 6:00 AM 更新 Amazon 产品价格 + iHerb 库存。骨架代码就绪，需 Amazon PA API 和 iHerb API 密钥激活。 |
| 12 | `GET /api/cron/newsletter-send` | Job 7 | ✅ | 🟡 框架完成 | 每周五 9:00 AM 生成本周新增 Claims 周报（HTML + Text）→ 通过 Resend API 向所有 subscriber 邮件推送。需 `RESEND_API_KEY` 激活。 |

---

## 四、Pipeline / 自动调度系统（MODULE 5）

### 4.1 采集层（Ingestion Layer）

| 模块 | 文件 | PRD §六 | 状态 | 功能介绍 |
|------|------|---------|------|---------|
| PubMed Fetcher | `src/pipeline/pubmed-fetcher.ts` | ✅ | ✅ 已完成 | 使用 PubMed E-utilities API（esearch + efetch 两步流程），12 组搜索词（glycine sleep / magnesium insomnia / melatonin circadian 等），90 天时间窗口，批量 50 篇，350ms 速率限制。支持 NCBI API Key（提升限速至 10 req/s）。正则解析 XML（零外部依赖）。 |

### 4.2 AI 证据引擎（Evidence Engine）

| 步骤 | 模块 | PRD §六 | 状态 | 功能介绍 |
|------|------|---------|------|---------|
| Step 1: Claim 提取 | `src/pipeline/ai-extractor.ts` | §六 Step 1 | ✅ 已完成 | 三模式 AI 提取：DeepSeek API / OpenAI API / Mock（基于关键词规则提取）。从论文摘要中提取结构化数据：claim 文本 / intervention / outcome / population / effect size / dose / mechanism / limitations / contradictions / FAQ / keywords / studyType / sampleSize / confidence。 |
| Step 2: 去重 | `src/pipeline/ai-extractor.ts` | §六 Step 2 | ✅ 已完成 | Jaccard 相似度去重算法：40% 文本重叠 + 30% 关键词重叠 + 30% 主题匹配。阈值 0.85。低于阈值创建新 Claim，高于阈值合并到已有 Claim。 |
| Step 3: 评分 | `src/pipeline/evidence-scorer.ts` | §六 Step 3 | ✅ 已完成 | v2 证据评分公式：`Score = RCT_count×10 + Meta_count×15 + Human_studies×8 + Consistency×20 + EffectSize×20 - Contradictions×15`，Clamp [0, 100]。含 `recalculateScore()` 用于已有 Claim 更新重算。 |
| Step 4: 更新 | `src/pipeline/pipeline.ts` | §六 Step 4 | ✅ 已完成 | 4 步 Pipeline 编排：fetch → extract → dedup/merge → output report。支持 dry-run（控制台预览）和 live 模式（写入数据库）。 |

### 4.3 调度器架构（Scheduler）

| 组件 | 文件 | 状态 | 功能介绍 |
|------|------|------|---------|
| Vercel Cron 配置 | `vercel.json` | ✅ 已完成 | 7 个定时任务的 cron 表达式，精确到分钟级调度。每个任务独立 API endpoint + 独立超时时间。 |
| Job 1: 抓论文 | `src/pipeline/jobs/fetch-papers.ts` | ✅ 已完成 | 独立可调度 Job，从 PubMed 获取论文并存入 Supabase（`upsertStudyDb`）。返回论文数/存入数/错误统计。 |
| Job 2: AI 解析 | `src/pipeline/jobs/ai-parse.ts` | ✅ 已完成 | 独立可调度 Job，读取未处理论文 → AI 提取 → 写入 claims/studies/claim_study_map 三表。 |
| Job 3: 更新 Claim | `src/pipeline/jobs/update-claims.ts` | ✅ 已完成 | 独立可调度 Job，去重匹配 + 合并 + Evidence Score 重算 + 数据库更新。 |
| Job CLI 入口 | `scripts/run-job.ts` | ✅ 已完成 | 支持 5 个独立 Job 手动执行：`npm run job:fetch-papers` / `job:ai-parse` / `job:update-claims` / `job:affiliate` / `job:newsletter`。 |
| Cron 认证 | `src/lib/cron-auth.ts` | ✅ 已完成 | 统一 Cron 鉴权：`Authorization: Bearer <CRON_SECRET>` 或 `x-vercel-cron-auth` header。开发环境无密钥允许通过。 |

---

## 五、数据库层

### 5.1 数据库架构

| 组件 | 文件 | 状态 | 功能介绍 |
|------|------|------|---------|
| Prisma Schema | `prisma/schema.prisma` | ✅ 已完成 | 6 个模型：Claim / Study / EvidenceLink / Topic / DoseMapping / PopulationFit。SQLite MVP 兼容。 |
| Prisma Seed | `prisma/seed.ts` | ✅ 已完成 | 幂等 upsert 种子脚本，从 `seed-data.ts` 导入全部数据。执行顺序：Topics → Studies → Claims → EvidenceLinks → DoseMappings → PopulationFits。 |
| Supabase 迁移 #1 | `supabase/migrations/00001_initial_schema.sql` | ✅ 已完成 | 15 表生产数据库架构（PostgreSQL）：topics / claims / studies / claim_study_map / evidence_metrics / dose_mappings / population_fits / faqs / products / claim_products / content_assets / references / pipeline_runs / api_keys / api_usage_logs。含 RLS 策略、updated_at 触发器、完整注释。 |
| Supabase 迁移 #2 | `supabase/migrations/00002_scheduler_support.sql` | ✅ 已完成 | Scheduler 支持：添加 `newsletter_subscribers` 表 / `studies.pipeline_status` 列 / `claims.needs_revalidation` 列。 |

### 5.2 数据适配层

| 模块 | 文件 | 状态 | 功能介绍 |
|------|------|------|---------|
| 静态数据源 | `src/data/seed-data.ts` | ✅ 已完成 | 当前数据源：8 Topics + 11 Claims + 15 Studies + claimStudies 映射 + doseMappings + populationFits。 |
| 数据访问层 | `src/lib/data.ts` | ✅ 已完成 | 统一查询接口：getAllClaims / getClaimBySlug / getTrendingClaims / getLatestClaims / getClaimsByTopic / search / getClaimWithRelations。设计为未来切换至 DB 查询。 |
| Supabase 客户端 | `src/lib/supabase.ts` | ✅ 已完成 | 服务端 Supabase Client 单例，使用 Service Role Key 进行写入操作。未配置时返回 null，优雅 fallback。 |
| 数据库适配器 | `src/lib/db.ts` | ✅ 已完成 | 双模式适配层：Supabase 配置时读写 PostgreSQL，否则 fallback 到 seed-data.ts。提供完整 CRUD：getAllClaimsDb / getClaimBySlugDb / upsertStudyDb / upsertClaimDb / linkStudyToClaimDb / logPipelineRunDb。 |
| 类型定义 | `src/lib/types.ts` | ✅ 已完成 | 两层类型：v1（Claim / Study / Topic / FAQItem / 等 + API 响应类型）+ v2（15 个生产表对应类型 + 请求/响应类型）。 |

---

## 六、SEO / GEO 基础设施

| # | 组件 | PRD §十 | 状态 | 功能介绍 |
|---|------|---------|------|---------|
| 1 | JSON-LD Article Schema | ✅ | ✅ 已完成 | 每个 Claim 页面注入 Article Schema，含 MedicalScholarlyArticle 研究引用（PMID/DOI），提升 AI 搜索引擎引用质量。 |
| 2 | JSON-LD FAQ Schema | ✅ | ✅ 已完成 | 每个 Claim 页注入 FAQPage Schema，FAQ 数组映射为 Question/Answer 结构化数据（GEO 优化核心）。 |
| 3 | JSON-LD Breadcrumb | ✅ | ✅ 已完成 | 面包屑导航 Schema（Home → Claims → 具体 Claim）。 |
| 4 | JSON-LD Website Schema | ✅ | ✅ 已完成 | 全站 WebSite Schema，含 SearchAction（target=/search?q={search_term_string}）。 |
| 5 | Sitemap | ✅ | ✅ 已完成 | 动态 sitemap.xml：5 静态页（首页 priority=1.0）+ 11 Claim 页（priority=0.9）+ 8 Topic 页（priority=0.7）。共 24 URLs。 |
| 6 | Robots.txt | ✅ | ✅ 已完成 | 允许爬取所有页面，禁止 `/api/` 路径。 |
| 7 | RSS Feed | — | ✅ 已完成 | 动态 RSS 2.0：最新 20 Claims（按 lastUpdated 排序），含 Atom namespace。ISR 1 小时。路径 `/rss.xml`。 |
| 8 | OpenGraph / Twitter Card | ✅ | ✅ 已完成 | 每个页面独立 og:title/description/url/type + Twitter Card。根布局全局 OpenGraph type=website。 |
| 9 | 404 处理 | — | ✅ 已完成 | API 404 返回 `availableEndpoints` / `availableTopics`，便于 AI 系统自动发现可用端点。 |

---

## 七、商业化层

| # | 功能 | PRD §十一 | 状态 | 功能介绍 |
|---|------|----------|------|---------|
| 1 | Affiliate 系统 | 🔲 | 🟡 框架完成 | `src/lib/affiliate.ts` 提供 `getProductsByClaimSlug` / `jobUpdateAffiliate`。Amazon PA API + iHerb API 集成骨架就绪，需 API 密钥激活。 |
| 2 | Newsletter 系统 | 🔲 | 🟡 框架完成 | `src/lib/newsletter.ts` 生成 HTML/Text 周报，通过 Resend API 逐个发送。订阅 API 已完成，需 `RESEND_API_KEY` 激活。 |
| 3 | API 商业化 | ✅ | ✅ 已完成 | 3 个 REST API 端点 + API 文档页面。JSON 响应含 `_links`，AI-friendly discoverable 设计。 |
| 4 | Subscription | 🔲 | 🔲 路线图 | Weekly Evidence Digest / Full DB Access / Dose Calculator。 |

---

## 八、组件库

| # | 组件 | 文件 | 状态 | 功能介绍 |
|---|------|------|------|---------|
| 1 | ClaimCard | `src/components/ClaimCard.tsx` | ✅ 已完成 | Claim 卡片组件，显示 Evidence Score 颜色徽章、分类标签、文本（2行截断）、摘要、RCT/Meta 数量、剂量。 |
| 2 | EvidenceScoreBadge | `src/components/EvidenceScoreBadge.tsx` | ✅ 已完成 | 证据评分徽章：总分（0-100）+ 4 维度星级评分 + Confidence 级别。使用 StarRating 子组件。 |
| 3 | StarRating | `src/components/StarRating.tsx` | ✅ 已完成 | 通用 5 星评分组件，接受 score（0-5）和 max 参数。Unicode 星号字符渲染。 |

---

## 九、配置与部署

| # | 配置 | 文件 | 状态 | 功能介绍 |
|---|------|------|------|---------|
| 1 | Vercel Cron | `vercel.json` | ✅ 已完成 | 7 个定时任务：fetch-papers（每日 2am）/ ai-parse（每小时 :00）/ update-claims（每小时 :15）/ revalidate（每小时 :30）/ seo-update（每日 4am）/ affiliate-update（周一 6am）/ newsletter-send（周五 9am）。 |
| 2 | Next.js 配置 | `next.config.mjs` | ✅ 已完成 | reactStrictMode + optimizePackageImports（lucide-react）+ ISR 默认 3600s。 |
| 3 | 环境变量 | `.env.example` | ✅ 已完成 | 19 个变量：数据库 / Supabase / AI（Provider+Model+Key）/ PubMed / Pipeline / Cron / SEO / Affiliate / Newsletter / TTS。 |
| 4 | NPM Scripts | `package.json` | ✅ 已完成 | 13 scripts：dev / build / start / lint / db:push+seed+studio / pipeline（dry-run）+ pipeline:live+daily / job:fetch-papers+ai-parse+update-claims+affiliate+newsletter。 |
| 5 | Tailwind 主题 | `tailwind.config.ts` | ✅ 已完成 | Brand 品牌色（蓝色系）+ Evidence 评分色（high/moderate/low）。 |

---

## 十、数据统计（当前 v1）

| 指标 | 数量 | PRD 引用 |
|------|------|---------|
| Claims | 11 | §四 |
| Studies | 15 | §四 |
| Topics | 8 | §四 |
| Evidence Links（Claim-Study） | 31 | §四 |
| Dose Mappings | 30 | §四 |
| Population Fits | 48 | §四 |
| PubMed Citations | 15 | §四 |
| 搜索词（PubMed） | 12 | §六 |
| 数据库表（生产） | 15 | §五 |
| Prisma 模型 | 6 | §五 |
| Cron Jobs | 7 | §七 |
| REST API 端点 | 12 | §十三 |
| 前端页面 | 7 | §九 |
| Claim 详情模块 | 11 | §十二 |
| Sitemap URLs | 24 | §十 |

---

## 十一、路线图（待实现）

| # | 功能 | PRD 状态 | 优先级 | 说明 |
|---|------|---------|--------|------|
| 1 | Vercel 生产部署 | 🔲 | 🔴 高 | 部署到 Vercel + 配置环境变量 + 激活 Cron Jobs |
| 2 | Supabase 数据迁移 | 🔲 | 🔴 高 | 将 seed-data.ts 数据导入 Supabase PostgreSQL，切换 data.ts 数据源 |
| 3 | AI API 真实接入 | 🟡 | 🔴 高 | 配置 DeepSeek/OpenAI API Key，启用真实 Claim 提取 |
| 4 | Affiliate 激活 | 🟡 | 🟡 中 | 配置 Amazon PA API + iHerb API，启用自动价格更新 |
| 5 | Newsletter 激活 | 🟡 | 🟡 中 | 配置 Resend API Key，启用邮件自动发送 |
| 6 | GraphQL API | 🔲 | 🟢 低 | 提供更灵活的查询接口 |
| 7 | MCP Server | 🔲 | 🟢 低 | 让 Claude/ChatGPT 等 AI Agent 直接调用证据数据 |
| 8 | Podcast 生成 | 🔲 | 🟢 低 | TTS 生成音频版本 |
| 9 | Infographic 自动生成 | 🔲 | 🟢 低 | 可视化证据图表 |
| 10 | 用户账户系统 | 🔲 | 🟢 低 | Subscription 付费墙 |
| 11 | 多语言支持 | 🔲 | 🟢 低 | i18n 国际化 |
| 12 | 更多数据源 | 🔲 | 🟡 中 | Semantic Scholar / Crossref / arXiv |

---

## 十二、构建验证（2026-07-06）

| 检查项 | 结果 |
|--------|------|
| `npm run build` | ✅ 编译成功，0 错误 |
| TypeScript 类型检查 | ✅ 通过 |
| 静态页面生成 | ✅ 30/30 页面 |
| Cron API 路由 | ✅ 7/7 全部注册 |
| RSS Feed | ✅ `/rss.xml` |
| Sitemap | ✅ `/sitemap.xml` (24 URLs) |
| Robots.txt | ✅ `/robots.txt` |
| First Load JS | 87 kB shared + 187 B per page |

---

*Feature Tracker v1.0 — Generated: 2026-07-06*
*Tracked against: PRD v3.0 (docs/PRD.md)*
