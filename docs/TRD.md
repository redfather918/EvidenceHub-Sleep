# EvidenceHub Sleep — TRD v2.0

> **Technical Requirements Document — AI 驱动的睡眠循证知识系统**
> Updated: 2026-07-07 (Supabase 上线 + 双数据源架构 + Pipeline 验证)

---

## 1. 概述

### 1.1 文档目的

本文档定义 EvidenceHub Sleep 的技术架构、系统设计、数据模型、API 规范和部署方案。供开发团队理解和维护系统。

### 1.2 系统定位

EvidenceHub Sleep 是一个基于 Next.js 14 的全栈 Web 应用，核心是将睡眠科学研究结构化为可计算的证据图谱（Claim Graph），并通过 REST API 向人类和 AI 提供结构化数据。系统已接入 Supabase PostgreSQL 生产数据库，通过 PubMed API 自动采集论文，GitHub Actions 定时调度 Pipeline。

### 1.3 技术原则

- **双数据源**: Supabase（生产）+ 静态 TypeScript 数据（开发/回退），`isDbMode()` 自动切换
- **类型安全**: TypeScript strict mode
- **AI-Ready**: 所有数据结构化为 JSON，便于 AI 消费
- **Server Components**: 页面默认 async Server Components，直接读取数据库
- **Cron 驱动**: GitHub Actions 定时触发 Next.js API 路由执行 Pipeline

---

## 2. 系统架构

### 2.1 架构图（v2 — 生产架构）

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户 / AI                                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐    │
│  │ 浏览器   │  │ 搜索引擎  │  │ AI Agent    │  │ RSS Reader │    │
│  └────┬────┘  └─────┬────┘  └──────┬──────┘  └─────┬──────┘    │
└───────┼─────────────┼──────────────┼────────────────┼──────────┘
        │             │              │                │
        ▼             ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│               Next.js 14 (App Router) — 腾讯云                    │
│                sleep.p1web.site                                   │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Pages (async Server Components)               │  │
│  │                                                            │  │
│  │  /              → 首页 (实时 stats + 可点击跳转)           │  │
│  │  /claim/[slug]  → Claim 详情 (11 模块)                     │  │
│  │  /claims        → Claims 列表 (Supabase)                   │  │
│  │  /studies       → Studies 列表 (Supabase, ?studyType=rct)  │  │
│  │  /topics        → Topics 列表 (Supabase)                   │  │
│  │  /topics/[slug] → Topic 详情 (Supabase)                    │  │
│  │  /search        → 搜索页                                    │  │
│  │  /api-docs      → API 文档                                  │  │
│  │  /rss.xml       → RSS Feed                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          API Layer (Route Handlers)                        │  │
│  │                                                            │  │
│  │  REST API:                                                 │  │
│  │    GET /api/claim/[slug]     → Claim JSON                  │  │
│  │    GET /api/evidence/[topic] → Evidence JSON               │  │
│  │    GET /api/search?q=        → Search JSON                 │  │
│  │    POST /api/newsletter/subscribe → Newsletter signup     │  │
│  │    POST /api/revalidate      → ISR 重新验证                │  │
│  │                                                            │  │
│  │  Cron API (CRON_SECRET 鉴权):                              │  │
│  │    POST /api/cron/fetch-papers    → PubMed 采集            │  │
│  │    POST /api/cron/ai-parse         → AI Claim 提取         │  │
│  │    POST /api/cron/update-claims    → 更新 Claim 评分       │  │
│  │    POST /api/cron/revalidate       → 页面重新生成          │  │
│  │    POST /api/cron/seo-update       → SEO 更新              │  │
│  │    POST /api/cron/affiliate-update → Affiliate 更新        │  │
│  │    POST /api/cron/newsletter-send  → Newsletter 发送       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          Data Access Layer (双数据源)                      │  │
│  │                                                            │  │
│  │  src/lib/db.ts    → Supabase 查询 (DB 模式, 20+ 函数)     │  │
│  │  src/lib/data.ts  → 静态数据查询 (回退模式)               │  │
│  │  src/lib/supabase.ts → Supabase 客户端封装                 │  │
│  │                                                            │  │
│  │  isDbMode() = isSupabaseConfigured                        │  │
│  │    → 检查 NEXT_PUBLIC_SUPABASE_URL                        │  │
│  │      + SUPABASE_SERVICE_ROLE_KEY                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          Pipeline Layer (src/pipeline/)                    │  │
│  │                                                            │  │
│  │  pubmed-fetcher.ts → PubMed E-utilities API 采集器        │  │
│  │  ai-extractor.ts   → AI Claim 提取 + 去重                  │  │
│  │  evidence-scorer.ts→ v2 评分算法                           │  │
│  │  pipeline.ts       → 主流水线编排                          │  │
│  │  jobs/             → 7 个独立 Job 模块                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          SEO / GEO Layer                                   │  │
│  │  JSON-LD (Article, FAQ, Breadcrumb, Website)              │  │
│  │  Sitemap (动态) + Robots.txt + RSS Feed                    │  │
│  │  OpenGraph + Twitter Card                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Supabase PostgreSQL    │  │   GitHub Actions          │
│   (云端数据库)            │  │   (定时调度)               │
│                          │  │                          │
│  tables:                 │  │  7 个 Workflow:           │
│  - claims (246)          │  │  - fetch-papers (02:00)   │
│  - studies (227)         │  │  - ai-parse (每小时 :00)   │
│  - topics (8)            │  │  - update-claims (每小时:15)│
│  - claim_study_map       │  │  - revalidate (每小时 :30) │
│  - dose_mappings         │  │  - seo-update (03:00)     │
│  - population_fits       │  │  - affiliate (周一 09:00)  │
│  - pipeline_runs         │  │  - newsletter (周五 18:00) │
│  - affiliate_links       │  │                          │
└──────────────────────────┘  └──────────────────────────┘
              ↑
              │ PubMed E-utilities API
              │ (fetch-papers cron 调用)
              │
┌──────────────────────────┐
│   PubMed / NCBI          │
│   (数据源)                │
└──────────────────────────┘
```

### 2.2 数据流

```
用户请求 → async Server Component → db.ts (Supabase) 或 data.ts (静态)
                                        ↓
                                   渲染 HTML + JSON-LD
                                        ↓
                                  搜索引擎 / AI 索引

API 请求 → Route Handler → db.ts → JSON Response
                                       ↓
                                 AI Agent / 开发者

Cron 流程:
GitHub Actions → curl POST /api/cron/fetch-papers (CRON_SECRET 鉴权)
                  → pubmed-fetcher.ts 采集论文
                  → upsertStudyDb() 写入 Supabase studies 表
                  → 返回 {papersFetched, papersStored, errors}
```

### 2.3 渲染策略

| 路由 | 渲染方式 | 数据源 | 说明 |
|---|---|---|---|
| `/` | Dynamic (async) | Supabase (getHomeStats) | 首页，实时 stats |
| `/claim/[slug]` | Dynamic (async) | Supabase / 静态 | Claim 详情 (11 模块) |
| `/claims` | Dynamic (async) | Supabase (getAllClaimsDb) | Claims 列表 |
| `/studies` | Dynamic (async) | Supabase (getAllStudiesDb) | Studies 列表, 支持 ?studyType |
| `/topics` | Dynamic (async) | Supabase (getAllTopicsDb) | Topics 列表 |
| `/topics/[slug]` | Dynamic (async) | Supabase / 静态 | Topic 详情 |
| `/search` | Server-rendered | 静态 / Supabase | 支持 searchParams |
| `/api-docs` | SSG | 静态 | API 文档 |
| `/rss.xml` | Dynamic | Supabase / 静态 | RSS Feed |
| `/api/claim/[slug]` | Dynamic | Supabase / 静态 | Claim JSON API |
| `/api/evidence/[topic]` | Dynamic | Supabase / 静态 | Evidence JSON API |
| `/api/search` | Dynamic | Supabase / 静态 | Search JSON API |
| `/api/cron/*` | Dynamic | Supabase | Cron Job API (CRON_SECRET) |
| `/sitemap.xml` | Dynamic | Supabase / 静态 | 动态 Sitemap |
| `/robots.txt` | Static | — | 构建时生成 |

> **注意**: 页面从 SSG 改为 Dynamic (async Server Components)，因为需要从 Supabase 实时读取数据。Next.js 14 App Router 中 async Server Components 默认为动态渲染。

---

## 3. 技术栈

### 3.1 核心依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| next | 14.2.5 | 全栈框架 (App Router) |
| react | ^18.3.1 | UI 库 |
| react-dom | ^18.3.1 | React DOM 渲染 |
| @supabase/supabase-js | ^2.110.0 | Supabase 客户端 (生产数据库) |
| prisma | ^5.16.2 | ORM (Schema 定义 + SQLite 本地) |
| @prisma/client | ^5.16.2 | Prisma 客户端 |

### 3.2 开发依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| typescript | ^5.5.3 | 类型系统 (strict mode) |
| tailwindcss | ^3.4.6 | CSS 框架 |
| postcss | ^8.4.39 | CSS 处理 |
| autoprefixer | ^10.4.19 | CSS 前缀 |
| tsx | ^4.16.2 | TypeScript 脚本执行 (pipeline CLI) |
| dotenv | ^17.4.2 | 环境变量加载 (scripts) |
| @types/node | ^20.14.10 | Node.js 类型 |
| @types/react | ^18.3.3 | React 类型 |
| @types/react-dom | ^18.3.0 | React DOM 类型 |

### 3.3 运行时环境

| 项目 | 要求 |
|---|---|
| Node.js | >= 18.17.0 (推荐 20+) |
| npm | >= 9 |
| 操作系统 | Windows / macOS / Linux |
| 生产部署 | 腾讯云服务器 (Linux, pm2/systemd) |

---

## 4. 项目结构

```
evidencehub-sleep/
├── prisma/
│   ├── schema.prisma              # Prisma 数据模型 (6 个模型)
│   └── seed.ts                    # 数据库种子脚本
├── supabase/
│   └── init.sql                   # Supabase 建表脚本 (8 张表 + 索引)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 根布局 (导航 + 页脚 + JSON-LD)
│   │   ├── page.tsx               # 首页 (async, getHomeStats, 可点击 stats)
│   │   ├── globals.css            # 全局样式 + Tailwind
│   │   ├── claim/[slug]/
│   │   │   └── page.tsx           # Claim 详情页 (11 模块)
│   │   ├── claims/
│   │   │   └── page.tsx           # Claims 列表页 (Supabase)
│   │   ├── studies/
│   │   │   └── page.tsx           # Studies 列表页 (Supabase, ?studyType)
│   │   ├── topics/
│   │   │   ├── page.tsx           # Topics 列表页 (Supabase)
│   │   │   └── [slug]/page.tsx    # Topic 详情页
│   │   ├── search/
│   │   │   └── page.tsx           # 搜索页
│   │   ├── api-docs/
│   │   │   └── page.tsx           # API 文档页
│   │   ├── rss.xml/
│   │   │   └── route.ts           # RSS Feed
│   │   ├── api/
│   │   │   ├── claim/[slug]/route.ts    # Claim API
│   │   │   ├── evidence/[topic]/route.ts # Evidence API
│   │   │   ├── search/route.ts          # Search API
│   │   │   ├── newsletter/subscribe/route.ts # Newsletter 订阅
│   │   │   ├── revalidate/route.ts      # ISR 重新验证
│   │   │   └── cron/                    # Cron Job API (7 个)
│   │   │       ├── fetch-papers/route.ts
│   │   │       ├── ai-parse/route.ts
│   │   │       ├── update-claims/route.ts
│   │   │       ├── revalidate/route.ts
│   │   │       ├── seo-update/route.ts
│   │   │       ├── affiliate-update/route.ts
│   │   │       └── newsletter-send/route.ts
│   │   ├── sitemap.ts             # 动态 Sitemap
│   │   └── robots.ts              # Robots.txt
│   ├── components/
│   │   ├── ClaimCard.tsx          # Claim 卡片 (列表用)
│   │   ├── EvidenceScoreBadge.tsx # 证据评分徽章
│   │   └── StarRating.tsx         # 星级评分
│   ├── data/
│   │   └── seed-data.ts           # 静态数据源 (11 claims, 15 studies, 回退用)
│   ├── lib/
│   │   ├── types.ts               # TypeScript 类型定义
│   │   ├── data.ts                # 静态数据访问层 (回退模式)
│   │   ├── db.ts                  # Supabase 数据访问层 (DB 模式, 20+ 函数)
│   │   ├── supabase.ts            # Supabase 客户端封装
│   │   ├── cron-auth.ts           # Cron API 鉴权 (CRON_SECRET)
│   │   ├── affiliate.ts           # Affiliate 链接管理
│   │   ├── newsletter.ts          # Newsletter 订阅管理
│   │   └── seo.ts                 # SEO/GEO 助手
│   └── pipeline/
│       ├── config.ts              # 配置 (API keys, search terms, thresholds)
│       ├── pubmed-fetcher.ts      # PubMed E-utilities API 采集器
│       ├── ai-extractor.ts        # AI Claim 提取 + 去重
│       ├── evidence-scorer.ts     # v2 评分算法
│       ├── pipeline.ts            # 主流水线编排
│       ├── types.ts               # Pipeline 专用类型
│       └── jobs/                  # 独立 Job 模块
│           ├── index.ts           # Job 注册表
│           ├── fetch-papers.ts    # Job 1: PubMed 采集
│           ├── ai-parse.ts        # Job 2: AI Claim 提取
│           └── update-claims.ts   # Job 3: 更新 Claim 评分
├── scripts/
│   ├── run-pipeline.ts            # Pipeline CLI 入口
│   ├── run-job.ts                 # 单 Job 执行入口
│   ├── test-supabase.ts           # Supabase 连接测试
│   └── seed-to-supabase.ts        # 静态数据迁移到 Supabase
├── .github/workflows/             # GitHub Actions (7 个定时任务)
│   ├── scheduler-fetch-papers.yml
│   ├── scheduler-ai-parse.yml
│   ├── scheduler-update-claims.yml
│   ├── scheduler-revalidate.yml
│   ├── scheduler-seo-update.yml
│   ├── scheduler-affiliate.yml
│   └── scheduler-newsletter.yml
├── docs/
│   ├── PRD.md                     # 产品需求文档
│   ├── TRD.md                     # 技术需求文档 (本文档)
│   └── OPERATION-MANUAL.md        # 产品操作手册
├── public/                        # 静态资源
├── .env.example                   # 环境变量示例
├── .env                           # 环境变量 (gitignored)
├── .gitignore
├── next.config.mjs                # Next.js 配置
├── tailwind.config.ts             # Tailwind 配置
├── postcss.config.js              # PostCSS 配置
├── tsconfig.json                  # TypeScript 配置
├── package.json
├── package-lock.json
└── README.md
```

---

## 5. 数据模型

### 5.1 Supabase 表结构（生产数据库）

`supabase/init.sql` 定义 8 张表。生产环境使用 Supabase PostgreSQL。

#### 5.1.1 claims 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT (PK) | 唯一标识 |
| slug | TEXT (UNIQUE) | URL slug |
| text | TEXT | Claim 文本 |
| summary | TEXT | 摘要 |
| category | TEXT | 分类 |
| topic_id | TEXT (FK) | 关联 Topic |
| evidence_score | INT | 证据评分 (0-100) |
| human_rct_score | INT | 人类 RCT 评分 (0-5) |
| meta_score | INT | Meta-analysis 评分 (0-5) |
| mechanism_score | INT | 机制评分 (0-5) |
| safety_score | INT | 安全性评分 (0-5) |
| confidence | TEXT | high/moderate/low |
| rct_count | INT | RCT 数量 |
| meta_count | INT | Meta-analysis 数量 |
| study_count | INT | 研究总数 |
| dose | TEXT | 推荐剂量 |
| population | JSONB | 适用人群数组 |
| limitations | JSONB | 局限性数组 |
| mechanism | JSONB | 机制步骤数组 |
| faq | JSONB | FAQ 数组 |
| related_slugs | JSONB | 相关 Claim slugs |
| keywords | JSONB | SEO 关键词 |
| contradictions | JSONB | 矛盾证据 |
| effect_size | JSONB | 效应量结构化 |
| last_updated | TIMESTAMPTZ | 最后更新时间 |
| created_at | TIMESTAMPTZ | 创建时间 |

#### 5.1.2 studies 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT (PK) | 唯一标识 |
| pmid | TEXT (UNIQUE) | PubMed ID |
| doi | TEXT | DOI |
| title | TEXT | 研究标题 |
| abstract | TEXT | 摘要 (AI 提取用) |
| journal | TEXT | 期刊 |
| authors | TEXT | 作者 |
| year | INT | 发表年份 |
| sample_size | INT | 样本量 |
| duration | TEXT | 研究时长 |
| intervention | TEXT | 干预方式 |
| outcome | TEXT | 研究结局 |
| effect_size | TEXT | 效应量 |
| result | TEXT | 结果描述 |
| study_type | TEXT | rct/meta/observational/animal |
| population | TEXT | 研究人群 |
| url | TEXT | PubMed 链接 |
| created_at | TIMESTAMPTZ | 创建时间 |

> **注意**: `abstract` 列在 v2 中新增。init.sql 原始版本遗漏了此列，导致 `upsertStudyDb` 写入失败（已修复）。

#### 5.1.3 其他表

| 表名 | 说明 |
|---|---|
| claim_study_map | Claim <-> Study 多对多关系 (strength, effect_direction) |
| topics | 主题 (slug, name, description, icon, claim_count, parent_topic) |
| dose_mappings | 剂量映射 (claim_id, compound, dose_range, effect, optimal) |
| population_fits | 人群适配 (claim_id, group, fit, note) |
| pipeline_runs | Pipeline 运行记录 (job_name, status, papers_fetched, papers_stored, errors, created_at) |
| affiliate_links | Affiliate 链接 (claim_id, product_name, url, platform, price) |

### 5.2 Prisma Schema

`prisma/schema.prisma` 定义 6 个核心模型（Claim, Study, EvidenceLink, Topic, DoseMapping, PopulationFit），用于 SQLite 本地开发和类型生成。

### 5.3 TypeScript 类型

`src/lib/types.ts` 定义前端使用的类型接口：

- `Claim` — 基础 Claim 数据
- `Study` — 研究数据
- `Topic` — 主题数据
- `DoseMapping` — 剂量映射
- `PopulationFit` — 人群适配
- `ClaimWithRelations` — Claim + 关联数据
- `ClaimApiResponse` — API 响应类型
- `EvidenceApiResponse` — Evidence API 响应类型
- `HomeStats` — 首页统计 (claims, studies, topics, humanRcts)

### 5.4 数据访问层（双数据源）

#### 5.4.1 模式切换

```typescript
// src/lib/db.ts
export function isDbMode(): boolean {
  return isSupabaseConfigured;
  // 检查 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
}
```

页面和 API 通过 `isDbMode()` 判断使用 Supabase 还是静态数据。

#### 5.4.2 Supabase 数据访问层 (`src/lib/db.ts`)

| 函数 | 说明 |
|---|---|
| `isDbMode()` | 返回是否 DB 模式 |
| `getAllClaimsDb()` | 获取所有 Claims |
| `getClaimBySlugDb(slug)` | 按 slug 获取 Claim |
| `getTrendingClaimsDb(limit)` | 按 Evidence Score 排序 |
| `getLatestClaimsDb(limit)` | 按更新时间排序 |
| `getClaimsByTopicDb(topicSlug)` | 按主题筛选 |
| `getClaimWithRelationsDb(slug)` | 获取 Claim + 所有关联数据 |
| `getStudiesByClaimDb(slug)` | 获取 Claim 关联的 Studies |
| `getAllTopicsDb()` | 获取所有 Topics |
| `getTopicBySlugDb(slug)` | 按 slug 获取 Topic |
| `getAllStudiesDb()` | 获取所有 Studies |
| `getStudyByIdDb(id)` | 按 ID 获取 Study |
| `getStudyByPmidDb(pmid)` | 按 PubMed ID 获取 Study |
| `searchClaimsDb(query)` | 全文搜索 Claims |
| `upsertStudyDb(study)` | 写入/更新 Study (Pipeline 用) |
| `upsertClaimDb(claim)` | 写入/更新 Claim (Pipeline 用) |
| `linkStudyToClaimDb(...)` | 关联 Study 到 Claim |
| `getHomeStats()` | 首页统计 (4 个 count: claims, studies, topics, humanRcts) |
| `logPipelineRunDb(run)` | 记录 Pipeline 运行日志 |

> **设计要点**: `upsertStudyDb` 在写入失败时 **throw Error**（而非静默 return null），确保错误不被吞掉。`getHomeStats` 使用 `count: 'exact', head: true` 高效查询 4 个计数。

#### 5.4.3 静态数据访问层 (`src/lib/data.ts`)

回退模式使用，从 `src/data/seed-data.ts` 读取。函数签名与 db.ts 对应（无 Db 后缀）：
- `getAllClaims()`, `getClaimBySlug()`, `getTrendingClaims()`, `getClaimsByTopic()` 等

#### 5.4.4 Supabase 客户端 (`src/lib/supabase.ts`)

```typescript
// 创建 Supabase 客户端 (service_role key, 绕过 RLS)
const supabase = createClient(url, serviceKey);
```

---

## 6. API 规范

### 6.1 REST API

#### 6.1.1 Claim API

```
GET /api/claim/{slug}
```

**响应 (200):**
```json
{
  "slug": "glycine-sleep-latency",
  "text": "Glycine reduces sleep latency in human RCTs",
  "confidence": 91,
  "confidenceLevel": "high",
  "rcts": 3,
  "dose": "3g",
  "population": ["Healthy adults", "Adults with mild sleep complaints"],
  "evidenceScore": 91,
  "lastUpdated": "2026-06-15T00:00:00Z",
  "_links": {
    "self": "/api/claim/glycine-sleep-latency",
    "webpage": "/claim/glycine-sleep-latency"
  }
}
```

**响应 (404):**
```json
{
  "error": "Claim not found",
  "slug": "invalid-slug",
  "availableEndpoints": ["/api/claim/glycine-sleep-latency", "..."]
}
```

#### 6.1.2 Evidence API

```
GET /api/evidence/{topic}
```

返回主题级证据汇总，包含该主题下所有 Claims。

#### 6.1.3 Search API

```
GET /api/search?q={query}&limit={limit}
```

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | string | (必填) | 搜索关键词 |
| limit | int | 20 | 返回结果上限 |

**响应 (400):**
```json
{
  "error": "Query parameter 'q' is required",
  "example": "/api/search?q=glycine"
}
```

#### 6.1.4 Explorer API

```
GET /api/explore?topic={slug}&category={cat}&studyType={type}&sort={sort}&q={q}&page={n}&pageSize={n}
```

筛选 / 排序 / 分页的 Claim 列表端点。**首页 Evidence Explorer 区块与此外部 API 共用同一底层函数 `exploreClaimsDb()`**（`src/lib/db.ts`），保证行为一致。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| topic | string | — | Topic slug 过滤（claim.topicSlug） |
| category | string | — | Category 过滤（数据驱动，来自 claims 表） |
| studyType | enum | — | `rct`(rctCount>0) / `meta`(metaCount>0) / `observational` / `animal` |
| sort | enum | `evidence` | `evidence` / `newest` / `updated` / `rct` |
| q | string | — | 关键词（text/summary/keywords/category） |
| page | int | 1 | 分页页码 |
| pageSize | int | 12 | 每页条数（最大 100） |

**响应 (200):**
```json
{
  "total": 33,
  "page": 1,
  "pageSize": 2,
  "items": [
    {
      "slug": "melatonin-sleep-latency",
      "text": "Melatonin reduces sleep onset latency…",
      "category": "Hormones",
      "evidenceScore": 95,
      "confidence": "high",
      "rctCount": 19,
      "metaCount": 1,
      "topic": "melatonin",
      "url": "https://sleep.p1web.site/claim/melatonin-sleep-latency",
      "lastUpdated": "2026-06-20T00:00:00.000Z"
    }
  ],
  "_links": {
    "self": "/api/explore?category=Hormones&page=1",
    "next": "/api/explore?category=Hormones&page=2",
    "prev": null
  }
}
```

### 6.2 Cron API（内部）

Cron API 由 GitHub Actions 定时调用，使用 `CRON_SECRET` 鉴权（`src/lib/cron-auth.ts`）。

| 端点 | 方法 | 说明 | 调度 |
|---|---|---|---|
| `/api/cron/fetch-papers` | POST | PubMed 论文采集 -> Supabase | 每天 02:00 |
| `/api/cron/ai-parse` | POST | AI Claim 提取 | 每小时 :00 |
| `/api/cron/update-claims` | POST | 更新 Claim 评分 | 每小时 :15 |
| `/api/cron/revalidate` | POST | 页面重新生成 (ISR) | 每小时 :30 |
| `/api/cron/seo-update` | POST | SEO 数据更新 | 每天 03:00 |
| `/api/cron/affiliate-update` | POST | Affiliate 链接更新 | 每周一 09:00 |
| `/api/cron/newsletter-send` | POST | Newsletter 发送 | 每周五 18:00 |

**fetch-papers 响应示例:**
```json
{
  "ok": true,
  "job": "fetch-papers",
  "papersFetched": 227,
  "papersStored": 227,
  "errors": [],
  "supabaseConfigured": true
}
```

### 6.3 其他 API

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/newsletter/subscribe` | POST | Newsletter 订阅 |
| `/api/revalidate` | POST | ISR 重新验证 |
| `/rss.xml` | GET | RSS Feed |

### 6.4 认证

| 类型 | 方案 | 说明 |
|---|---|---|
| REST API | 无认证 (MVP) | 未来计划 API Key |
| Cron API | CRON_SECRET | 请求头 `Authorization: Bearer <secret>` |

未来 REST API 认证计划：
- Free: 100 requests/day (API Key)
- Pro: 10,000 requests/day (API Key)
- Enterprise: Unlimited + MCP access

---

## 7. Pipeline 系统

### 7.1 架构

```
src/pipeline/
├── config.ts              # 配置 (API keys, search terms, thresholds)
├── pubmed-fetcher.ts      # PubMed E-utilities API 采集器
├── ai-extractor.ts        # AI Claim 提取 + 去重
├── evidence-scorer.ts     # v2 评分算法
├── pipeline.ts            # 主流水线编排
├── types.ts               # Pipeline 专用类型
└── jobs/                  # 独立 Job 模块
    ├── index.ts           # Job 注册表
    ├── fetch-papers.ts    # Job 1: PubMed 采集
    ├── ai-parse.ts        # Job 2: AI Claim 提取
    └── update-claims.ts   # Job 3: 更新 Claim 评分
```

### 7.2 Pipeline 流程

```
1. Fetch new papers (PubMed API) → upsertStudyDb() → Supabase studies 表
2. Extract claims (AI) → upsertClaimDb() → Supabase claims 表
3. Match existing graph (dedup) → linkStudyToClaimDb() → claim_study_map
4. Update scores (evidence scorer) → upsertClaimDb() → 更新 evidence_score
5. Revalidate pages → /api/cron/revalidate
```

### 7.3 Evidence Scoring 公式

```text
Score =
  RCT_count * 10
+ Meta_count * 15
+ Human_studies * 8
+ Consistency * 20
+ Effect_size * 20
- Contradictions * 15

Clamp to [0, 100]
```

| 分数范围 | Confidence |
|---|---|
| 85-100 | high |
| 65-84 | moderate |
| 0-64 | low |

### 7.4 CLI 命令

| 命令 | 说明 |
|---|---|
| `npm run pipeline` | 运行完整 Pipeline (dry run) |
| `npm run pipeline:live` | 运行完整 Pipeline (live) |
| `npm run job:fetch-papers` | 单独运行 fetch-papers Job |
| `npm run job:ai-parse` | 单独运行 ai-parse Job |
| `npm run job:update-claims` | 单独运行 update-claims Job |

### 7.5 GitHub Actions 调度

7 个 Workflow 文件在 `.github/workflows/`，每个定时 `curl POST` 对应的 Cron API 路由：

```yaml
# 示例: scheduler-fetch-papers.yml
on:
  schedule:
    - cron: '0 18 * * *'  # UTC 18:00 = 北京时间 02:00
jobs:
  fetch:
    steps:
      - run: |
          curl -X POST https://sleep.p1web.site/api/cron/fetch-papers \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 7.6 验证状态

| Job | 状态 | 说明 |
|---|---|---|
| fetch-papers | ✅ 已验证 | 227 篇论文成功入库 Supabase |
| ai-parse | 🔲 待 API Key | 需要配置 DeepSeek/OpenAI API Key |
| update-claims | 🔲 待 API Key | 依赖 ai-parse 输出 |
| revalidate | ✅ 已配置 | — |
| seo-update | ✅ 已配置 | — |
| affiliate-update | ✅ 已配置 | — |
| newsletter-send | ✅ 已配置 | — |

---

## 8. SEO / GEO 实现

### 8.1 JSON-LD 结构化数据

每个 Claim 页面注入 3 个 JSON-LD 脚本：

1. **Article Schema** — 标识页面为医学文章，包含 citation (MedicalScholarlyArticle)
2. **FAQ Schema** — FAQPage 结构，对 AI 搜索引擎关键
3. **Breadcrumb Schema** — 面包屑导航

首页注入 **WebSite Schema**（含 SearchAction）。

### 8.2 Sitemap

`src/app/sitemap.ts` 动态生成 sitemap.xml，包含：
- 静态页面 (/, /topics, /claims, /studies, /search, /api-docs)
- 所有 Claim 页面
- 所有 Topic 页面

### 8.3 Robots.txt + RSS Feed

- `src/app/robots.ts`: 允许所有爬虫访问页面，禁止爬取 /api/
- `src/app/rss.xml/route.ts`: 动态 RSS Feed，供订阅使用

### 8.4 Metadata

每个页面通过 `generateMetadata` 生成：
- title (含 Evidence Score)
- description
- keywords
- OpenGraph tags
- Twitter Card tags

---

## 9. 前端组件

### 9.1 ClaimCard

显示 Claim 卡片，用于列表和关联展示。
- Evidence Score 徽章（颜色：绿/黄/红）
- Claim 文本（2 行截断）
- Summary（2 行截断）
- RCT 数 / Meta 数 / 剂量

### 9.2 EvidenceScoreBadge

显示完整证据评分卡片：
- 总分 (0-100)
- 4 个维度星级评分（Human RCT, Meta, Mechanism, Safety）
- Confidence 级别

### 9.3 StarRating

通用星级评分组件（0-5 星）。

### 9.4 Explorer 组件（V3 新增）

首页 Evidence Explorer 相关组件。

#### 9.4.1 `FilterBar`（`src/components/explorer/FilterBar.tsx`）

服务端组件，**URL 驱动**（无客户端 JS）。每个筛选项是一个 `Link`，点击后更新首页 query params 并触发服务端重渲染。

- **Category** — 数据驱动，来自 `getAllClaimsDb()` 去重后的 category 列表
- **Evidence (studyType)** — `rct` / `meta` / `observational` / `animal`
- **Sort** — `Highest Evidence` / `Most Human Studies` / `Newest` / `Most Updated`

Props：`{ current: FilterState, categories: string[] }`。`current` 为当前激活的筛选状态，用于高亮选中项；任意筛选变更会重置 `page` 分页。

#### 9.4.2 首页 Explorer 区块（`src/app/page.tsx`）

V3 将首页从「Latest Articles」重构为 Evidence Explorer，区块顺序：

1. Hero 搜索框（action=`/search`）
2. Stats 栏（Claims / Studies / Topics / Human RCTs）
3. Browse by Topic（彩色卡片，按 `topic.slug` 映射 Tailwind 颜色）
4. Trending Evidence（优先 high-confidence 的 top 6）
5. **Evidence Explorer**（FilterBar + 筛选后的 ClaimCard 网格 + 分页）
6. Newest Studies / Recently Updated（双栏）
7. Mission + Quick links

数据获取统一用 `Promise.all`：`getTrendingClaimsDb` / `getLatestClaimsDb` / `getAllTopicsDb` / `getHomeStats` / `getAllStudiesDb` / `getAllClaimsDb`（分类）/ `exploreClaimsDb`（筛选列表）。

---

## 10. 样式系统

### 10.1 Tailwind CSS 配置

自定义品牌色 `brand`（蓝色系）和 `evidence`（证据评分色）。

```
brand: 50-900 (蓝色系)
evidence: high (#16a34a), moderate (#f59e0b), low (#dc2626)
```

### 10.2 全局样式

- 评分徽章颜色类 (.score-high, .score-moderate, .score-low)
- 机制图箭头样式
- 星级评分间距

---

## 11. 构建与部署

### 11.1 本地开发

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 推送 Schema 到 SQLite (本地开发)
npm run db:push

# 种子数据库
npm run db:seed

# 配置环境变量 (.env)
# NEXT_PUBLIC_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
# CRON_SECRET=...

# 启动开发服务器
npm run dev
```

### 11.2 生产构建

```bash
npm run build
npm start
```

### 11.3 部署到腾讯云

> **重要**: 项目部署在腾讯云服务器，**不是 Vercel**。`vercel.json` 是模板遗留文件，实际未使用。

部署流程：
1. SSH 到腾讯云服务器
2. `cd /path/to/evidencehub-sleep && git pull origin main`
3. `npm install` (如有依赖变更)
4. `npm run build`
5. 重启服务: `pm2 restart evidencehub-sleep` (或 `systemctl restart evidencehub-sleep`)
6. 验证: `curl https://sleep.p1web.site/api/cron/fetch-papers`

### 11.4 GitHub Actions 部署

GitHub Actions 不直接部署代码，只负责定时调度 Cron API。代码更新需要 SSH 到服务器手动 `git pull` + 重启。

---

## 12. 环境变量

| 变量 | 说明 | 必须 | 默认 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | DB 模式必须 | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | DB 模式必须 | — |
| `CRON_SECRET` | Cron API 鉴权密钥 | Cron 必须 | — |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL | 否 | https://evidencehubsleep.com |
| `DATABASE_URL` | Prisma SQLite 连接 (本地) | 否 | file:./dev.db |
| `DEEPSEEK_API_KEY` | DeepSeek API Key (AI 提取) | AI Parse 必须 | — |
| `PIPELINE_DRY_RUN` | Pipeline dry run 模式 | 否 | true |

> **安全**: `.env` 文件已被 `.gitignore` 忽略，不会提交到 GitHub。`NEXT_PUBLIC_` 前缀的变量暴露到客户端，`SUPABASE_SERVICE_ROLE_KEY` 仅在服务端使用。

---

## 13. 安全考虑

### 13.1 输入验证

- Search API 验证 `q` 参数存在
- 所有 API 返回 JSON
- Supabase 查询使用参数化查询（supabase-js SDK 内置）

### 13.2 Cron API 鉴权

Cron API 路由使用 `CRON_SECRET` 鉴权（`src/lib/cron-auth.ts`）：

```typescript
// 请求头必须包含正确的 CRON_SECRET
Authorization: Bearer <CRON_SECRET>
```

GitHub Actions 通过 Repository Secrets 传递 `CRON_SECRET`。

### 13.3 CORS

MVP 阶段使用 Next.js 默认 CORS 策略。生产环境需要配置允许的来源。

### 13.4 Rate Limiting

MVP 无 Rate Limiting。生产环境需要添加。

### 13.5 Supabase RLS

生产环境使用 `service_role` key 绕过 Row Level Security (RLS)，因为所有数据库操作在服务端进行。未来如果开放客户端直接访问，需要配置 RLS 策略。

---

## 14. 测试策略

### 14.1 当前状态

**构建验证（2026-07-04）：**
- `npm run build` ✅ 编译成功，0 TypeScript 错误
- 30/30 静态页面全部生成
- First Load JS: 87 kB (shared) + 187 B (per page)

**页面验证（全部 HTTP 200）：**

| 路由 | 渲染方式 | 验证结果 |
|---|---|---|
| `/` | Dynamic (async) | ✅ 200 (实时 stats) |
| `/claims` | Dynamic (async) | ✅ 200 (Supabase) |
| `/studies` | Dynamic (async) | ✅ 200 (Supabase) |
| `/claim/glycine-sleep-latency` | Dynamic (async) | ✅ 200 (11 模块完整) |
| `/topics` | Dynamic (async) | ✅ 200 (Supabase) |
| `/topics/glycine` | Dynamic (async) | ✅ 200 |
| `/search?q=glycine` | Dynamic | ✅ 200 |
| `/api-docs` | SSG | ✅ 200 |
| `/rss.xml` | Dynamic | ✅ 200 |
| `/sitemap.xml` | Dynamic | ✅ 200 |
| `/robots.txt` | Static | ✅ 200 |

**API 验证：**

| 端点 | 测试用例 | 结果 |
|---|---|---|
| `GET /api/claim/[slug]` | glycine-sleep-latency | ✅ 返回 JSON + _links |
| `GET /api/claim/[slug]` | invalid-slug | ✅ 404 + availableEndpoints |
| `GET /api/evidence/[topic]` | magnesium | ✅ 返回主题汇总 |
| `GET /api/search?q=` | q=melatonin&limit=3 | ✅ 返回 3 条结果 |
| `GET /api/search` | 无 q 参数 | ✅ 400 + example |
| `POST /api/cron/fetch-papers` | CRON_SECRET | ✅ 227/227 成功入库 |

**Pipeline 验证（2026-07-07）：**

| 检查项 | 结果 |
|---|---|
| PubMed 采集 | ✅ 227 篇论文 |
| Supabase 写入 | ✅ 227/227 成功 |
| 错误数 | 0 |
| supabaseConfigured | true |

**SEO 验证：**
- JSON-LD: Article + FAQ + Breadcrumb + Website Schema 全部存在 ✅
- Sitemap: 动态生成 ✅
- Robots.txt: 允许页面爬取，禁止 /api/ ✅

### 14.2 推荐测试方案

| 层级 | 工具 | 覆盖范围 |
|---|---|---|
| Unit | Vitest | lib/db.ts, lib/data.ts, lib/seo.ts |
| Component | React Testing Library | ClaimCard, EvidenceScoreBadge |
| API | Vitest + supertest | API 路由 |
| Pipeline | tsx scripts | Pipeline Jobs |
| E2E | Playwright | 关键用户流程 |
| Build | next build | TypeScript 编译 |

---

## 15. 路线图

### Phase 1: MVP ✅ 完成

- [x] Next.js 14 项目搭建
- [x] Claim Graph 数据模型
- [x] 11 个 seed Claims + 15 个 seed Studies
- [x] 完整前端页面 (8 个页面 + RSS)
- [x] REST API (3 个端点)
- [x] SEO/GEO 优化
- [x] Prisma Schema + Seed

### Phase 2: Pipeline + 数据库 ✅ 完成

- [x] PubMed API 自动采集 (fetch-papers 已验证, 227 篇入库)
- [x] AI Claim 提取流水线框架 (DeepSeek / OpenAI)
- [x] Evidence Score 计算器 (v2 评分公式)
- [x] Pipeline Runner + CLI
- [x] **Supabase PostgreSQL 生产数据库已上线**
- [x] GitHub Actions 定时调度 (7 个 Workflow)
- [x] 双数据源架构 (Supabase + 静态回退)
- [x] 首页实时 stats + 可点击跳转
- [x] /claims /topics /studies 从 Supabase 读取

### Phase 3: AI 全链路 (当前重点)

- [ ] AI API 接入 (DeepSeek/OpenAI) 实现真实 Claim 提取
- [ ] Pipeline 全链路验证 (fetch -> AI parse -> update claims -> revalidate)
- [ ] 扩展至 100+ Claims
- [ ] 自动去重 + 矛盾检测

### Phase 4: 增值功能 (规划中)

- [ ] Podcast 生成 (TTS)
- [ ] Infographic 自动生成
- [ ] Affiliate 链接接入
- [ ] Newsletter 订阅系统
- [ ] MCP Server
- [ ] GraphQL API

### Phase 5: 平台化 (长期)

- [ ] Dataset Export
- [ ] 用户账户系统
- [ ] 多语言支持
- [ ] 移动端适配

---

## 16. 编码规范

### 16.1 TypeScript

- strict mode 开启
- 所有函数参数和返回值需要类型注解
- 使用 interface 定义对象形状，type 定义联合类型
- 路径别名: `@/*` -> `./src/*`

### 16.2 命名

- 文件: kebab-case (api-docs, seed-data)
- 组件: PascalCase (ClaimCard, EvidenceScoreBadge)
- 函数/变量: camelCase (getClaimBySlug, evidenceScore)
- 类型/接口: PascalCase (Claim, ClaimWithRelations)
- 常量: camelCase (claimsData, topicsData)
- 数据库表: snake_case (@@map)
- Supabase 函数: camelCase + Db 后缀 (getAllClaimsDb, getHomeStats)

### 16.3 React

- Server Components 默认 (async)
- 仅在需要交互时使用 "use client"
- 使用 Next.js Link 组件进行导航
- 使用 generateMetadata 进行 SEO

### 16.4 数据库

- Supabase 使用 service_role key (服务端)
- 写入失败时 throw Error，不静默吞错
- JSON 字段使用 JSONB 类型
- 时间戳使用 TIMESTAMPTZ

---

*TRD v2.0 — Updated: 2026-07-07*
*Architecture: Next.js 14 + Supabase PostgreSQL + GitHub Actions*
*Database: Supabase online (dual-source: Supabase / static fallback)*
*Pipeline: fetch-papers verified (227/227), ai-parse pending API key*
*Deployment: 腾讯云 (sleep.p1web.site, pm2/systemd)*