# EvidenceHub Sleep — TRD v1.1

> **Technical Requirements Document — AI 驱动的睡眠循证知识系统**

---

## 1. 概述

### 1.1 文档目的

本文档定义 EvidenceHub Sleep 的技术架构、系统设计、数据模型、API 规范和部署方案。供开发团队理解和维护系统。

### 1.2 系统定位

EvidenceHub Sleep 是一个基于 Next.js 14 的全栈 Web 应用，核心是将睡眠科学研究结构化为可计算的证据图谱（Claim Graph），并通过 REST API 向人类和 AI 提供结构化数据。

### 1.3 技术原则

- **MVP 优先**: 先跑通核心流程，再迭代
- **静态优先**: Next.js SSG/ISR 最大化性能和 SEO
- **类型安全**: TypeScript strict mode
- **AI-Ready**: 所有数据结构化为 JSON，便于 AI 消费
- **可扩展**: 数据层抽象，支持从静态数据迁移到数据库

---

## 2. 系统架构

### 2.1 架构图

```
┌──────────────────────────────────────────────┐
│                  用户 / AI                     │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ 浏览器   │  │ 搜索引擎  │  │ AI Agent    │  │
│  └────┬────┘  └─────┬────┘  └──────┬──────┘  │
│       │              │              │          │
└───────┼──────────────┼──────────────┼─────────┘
        │              │              │
        ▼              ▼              ▼
┌───────────────────────────────────────────────┐
│            Next.js 14 (App Router)             │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │            Frontend (SSG)                │  │
│  │                                          │  │
│  │  /              → 首页 (搜索 + Trending) │  │
│  │  /claim/[slug]  → Claim 详情 (SSG)       │  │
│  │  /claims        → Claims 列表            │  │
│  │  /topics        → Topics 列表            │  │
│  │  /topics/[slug] → Topic 详情             │  │
│  │  /search        → 搜索页                 │  │
│  │  /api-docs      → API 文档               │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │          API Layer (Route Handlers)      │  │
│  │                                          │  │
│  │  GET /api/claim/[slug]    → Claim JSON   │  │
│  │  GET /api/evidence/[topic]→ Evidence JSON│  │
│  │  GET /api/search?q=       → Search JSON  │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │           Data Access Layer              │  │
│  │           (src/lib/data.ts)              │  │
│  │                                          │  │
│  │  当前: 静态 TypeScript 数据              │  │
│  │  未来: Prisma Client → SQLite/PostgreSQL │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │           SEO / GEO Layer                │  │
│  │                                          │  │
│  │  JSON-LD (Article, FAQ, Breadcrumb)     │  │
│  │  Sitemap (动态)                          │  │
│  │  Robots.txt                              │  │
│  │  OpenGraph + Twitter Card                │  │
│  └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### 2.2 数据流

```
用户请求 → Next.js SSG 预渲染页面 → 静态 HTML + JSON-LD
                                           ↓
                                     搜索引擎 / AI 索引

API 请求 → Route Handler → Data Access Layer → JSON Response
                                               ↓
                                         AI Agent / 开发者
```

### 2.3 渲染策略

| 路由 | 渲染方式 | 说明 |
|---|---|---|
| `/` | SSG (Static) | 首页，构建时生成 |
| `/claim/[slug]` | SSG | 11 个 Claim 页面，构建时预渲染 |
| `/claims` | SSG | Claims 列表 |
| `/topics` | SSG | Topics 列表 |
| `/topics/[slug]` | SSG | 8 个 Topic 页面 |
| `/search` | Server-rendered | 支持 searchParams |
| `/api-docs` | SSG | 静态文档 |
| `/api/claim/[slug]` | SSG | API 端点 |
| `/api/evidence/[topic]` | Dynamic | 动态路由 |
| `/api/search` | Dynamic | 查询参数驱动 |
| `/sitemap.xml` | Static | 构建时生成 |
| `/robots.txt` | Static | 构建时生成 |

---

## 3. 技术栈

### 3.1 核心依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| next | 14.2.5 | 全栈框架 (App Router) |
| react | ^18.3.1 | UI 库 |
| react-dom | ^18.3.1 | React DOM 渲染 |
| prisma | ^5.16.2 | ORM (Schema 定义 + 未来数据库) |
| @prisma/client | ^5.16.2 | Prisma 客户端 |

### 3.2 开发依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| typescript | ^5.5.3 | 类型系统 (strict mode) |
| tailwindcss | ^3.4.6 | CSS 框架 |
| postcss | ^8.4.39 | CSS 处理 |
| autoprefixer | ^10.4.19 | CSS 前缀 |
| tsx | ^4.16.2 | TypeScript 脚本执行 (seed) |
| @types/node | ^20.14.10 | Node.js 类型 |
| @types/react | ^18.3.3 | React 类型 |
| @types/react-dom | ^18.3.0 | React DOM 类型 |

### 3.3 运行时环境

| 项目 | 要求 |
|---|---|
| Node.js | >= 18.17.0 (推荐 20+) |
| npm | >= 9 |
| 操作系统 | Windows / macOS / Linux |

---

## 4. 项目结构

```
evidencehub-sleep/
├── prisma/
│   ├── schema.prisma              # Prisma 数据模型 (6 个模型)
│   └── seed.ts                    # 数据库种子脚本
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 根布局 (导航 + 页脚 + JSON-LD)
│   │   ├── page.tsx               # 首页
│   │   ├── globals.css            # 全局样式 + Tailwind
│   │   ├── claim/[slug]/
│   │   │   └── page.tsx           # Claim 详情页 (11 模块)
│   │   ├── claims/
│   │   │   └── page.tsx           # Claims 列表页
│   │   ├── topics/
│   │   │   ├── page.tsx           # Topics 列表页
│   │   │   └── [slug]/page.tsx    # Topic 详情页
│   │   ├── search/
│   │   │   └── page.tsx           # 搜索页
│   │   ├── api-docs/
│   │   │   └── page.tsx           # API 文档页
│   │   ├── api/
│   │   │   ├── claim/[slug]/route.ts   # Claim API
│   │   │   ├── evidence/[topic]/route.ts # Evidence API
│   │   │   └── search/route.ts    # Search API
│   │   ├── sitemap.ts             # 动态 Sitemap
│   │   └── robots.ts              # Robots.txt
│   ├── components/
│   │   ├── ClaimCard.tsx          # Claim 卡片 (列表用)
│   │   ├── EvidenceScoreBadge.tsx # 证据评分徽章
│   │   └── StarRating.tsx         # 星级评分
│   ├── data/
│   │   └── seed-data.ts           # 静态数据源 (11 claims, 15 studies)
│   └── lib/
│       ├── types.ts               # TypeScript 类型定义
│       ├── data.ts                # 数据访问层
│       └── seo.ts                 # SEO/GEO 助手
├── docs/
│   ├── PRD.md                     # 产品需求文档
│   ├── TRD.md                     # 技术需求文档 (本文档)
│   └── OPERATION-MANUAL.md        # 产品操作手册
├── public/                        # 静态资源
├── .env.example                   # 环境变量示例
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

### 5.1 Prisma Schema

数据库使用 Prisma ORM 定义 6 个核心模型。MVP 阶段使用 SQLite，生产环境迁移至 PostgreSQL。

#### 5.1.1 Claim 模型

```prisma
model Claim {
  id              String   @id @default(cuid())
  slug            String   @unique
  text            String
  summary         String
  category        String
  topicId         String?
  topic           Topic?   @relation(fields: [topicId], references: [id])

  // Evidence scoring (0-100 总分, 0-5 各维度)
  evidenceScore   Int      @default(0)
  humanRctScore   Int      @default(0)
  metaScore       Int      @default(0)
  mechanismScore  Int      @default(0)
  safetyScore     Int      @default(0)
  confidence      String   @default("medium")

  // Counts
  rctCount        Int      @default(0)
  metaCount       Int      @default(0)
  studyCount      Int      @default(0)

  // Structured data (JSON as string for SQLite)
  dose            String?
  population      String   @default("[]")
  limitations     String   @default("[]")
  mechanism       String   @default("[]")
  faq             String   @default("[]")
  relatedSlugs    String   @default("[]")
  keywords        String   @default("[]")

  lastUpdated     DateTime @default(now())
  createdAt       DateTime @default(now())

  evidenceLinks   EvidenceLink[]
  doseMappings    DoseMapping[]

  @@map("claims")
}
```

#### 5.1.2 Study 模型

```prisma
model Study {
  id            String   @id @default(cuid())
  pmid          String?
  doi           String?
  title         String
  journal       String
  authors       String   @default("")
  year          Int?
  sampleSize    Int      @default(0)
  duration      String?
  intervention  String?
  outcome       String?
  effectSize    String?
  result        String   @default("")
  studyType     String   @default("rct")
  population    String?
  url           String?

  createdAt     DateTime @default(now())
  evidenceLinks EvidenceLink[]

  @@map("studies")
}
```

#### 5.1.3 EvidenceLink 模型 (多对多关联)

```prisma
model EvidenceLink {
  id        String   @id @default(cuid())
  claimId   String
  studyId   String
  strength  Int      @default(3) // 1-5

  claim     Claim   @relation(fields: [claimId], references: [id], onDelete: Cascade)
  study     Study   @relation(fields: [studyId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@map("evidence_links")
}
```

#### 5.1.4 Topic 模型

```prisma
model Topic {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String   @default("")
  icon        String?
  claimCount  Int      @default(0)
  createdAt   DateTime @default(now())

  claims      Claim[]

  @@map("topics")
}
```

#### 5.1.5 DoseMapping 模型

```prisma
model DoseMapping {
  id        String   @id @default(cuid())
  claimId   String
  compound  String
  doseRange String
  effect    String
  optimal   Boolean  @default(false)

  claim     Claim   @relation(fields: [claimId], references: [id], onDelete: Cascade)

  @@map("dose_mappings")
}
```

#### 5.1.6 PopulationFit 模型

```prisma
model PopulationFit {
  id        String   @id @default(cuid())
  claimId   String
  group     String
  fit       String   @default("check") // yes | check | no
  note      String?

  claim     Claim   @relation(fields: [claimId], references: [id], onDelete: Cascade)

  @@map("population_fits")
}
```

### 5.2 TypeScript 类型

`src/lib/types.ts` 定义了前端使用的类型接口，与 Prisma 模型对应但适配了前端使用场景（JSON 字段解析为数组/对象）。

核心类型：
- `Claim` — 基础 Claim 数据
- `Study` — 研究数据
- `Topic` — 主题数据
- `DoseMapping` — 剂量映射
- `PopulationFit` — 人群适配
- `ClaimWithRelations` — Claim + 关联数据（studies, doseMappings, populationFits, relatedClaims, topic）
- `ClaimApiResponse` — API 响应类型
- `EvidenceApiResponse` — Evidence API 响应类型

### 5.3 数据访问层

`src/lib/data.ts` 封装了所有数据查询逻辑，当前从静态 TypeScript 数据读取，未来可无缝切换到 Prisma Client。

关键函数：
- `getAllClaims()` — 获取所有 Claims
- `getClaimBySlug(slug)` — 按 slug 获取 Claim
- `getTrendingClaims(limit)` — 按 Evidence Score 排序
- `getLatestClaims(limit)` — 按更新时间排序
- `getClaimsByTopic(topicSlug)` — 按主题筛选
- `getRelatedClaims(slug)` — 获取相关 Claims
- `getClaimWithRelations(slug)` — 获取 Claim + 所有关联数据
- `searchClaims(query)` — 全文搜索
- `buildClaimApiResponse(slug)` — 构建 API 响应
- `buildEvidenceApiResponse(topicSlug)` — 构建 Evidence API 响应

---

## 6. API 规范

### 6.1 Claim API

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
  "meta": 0,
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
  "availableEndpoints": [
    "/api/claim/glycine-sleep-latency",
    "/api/claim/magnesium-sleep-quality",
    "/api/claim/melatonin-sleep-latency"
  ]
}
```

### 6.2 Evidence API

```
GET /api/evidence/{topic}
```

**响应 (200):**
```json
{
  "topic": "Magnesium",
  "summary": "An essential mineral involved in GABA regulation...",
  "strength": "moderate",
  "studies": 3,
  "claims": [
    {
      "slug": "magnesium-sleep-quality",
      "text": "Magnesium supplementation improves sleep quality...",
      "score": 84
    }
  ],
  "_links": {
    "self": "/api/evidence/magnesium"
  }
}
```

### 6.3 Search API

```
GET /api/search?q={query}&limit={limit}
```

**参数:**
| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| q | string | (必填) | 搜索关键词 |
| limit | int | 20 | 返回结果上限 |

**响应 (200):**
```json
{
  "query": "glycine",
  "count": 2,
  "results": [
    {
      "slug": "glycine-sleep-latency",
      "text": "Glycine reduces sleep latency in human RCTs",
      "evidenceScore": 91,
      "confidence": "high",
      "dose": "3g",
      "rcts": 3,
      "category": "Amino Acids",
      "url": "/claim/glycine-sleep-latency"
    }
  ]
}
```

**响应 (400):**
```json
{
  "error": "Query parameter 'q' is required",
  "example": "/api/search?q=glycine"
}
```

### 6.4 认证

MVP 阶段无需认证。未来计划：
- Free: 100 requests/day (API Key)
- Pro: 10,000 requests/day (API Key)
- Enterprise: Unlimited + MCP access

---

## 7. SEO / GEO 实现

### 7.1 JSON-LD 结构化数据

每个 Claim 页面注入 3 个 JSON-LD 脚本：

1. **Article Schema** — 标识页面为医学文章，包含 citation (MedicalScholarlyArticle)
2. **FAQ Schema** — FAQPage 结构，对 AI 搜索引擎关键
3. **Breadcrumb Schema** — 面包屑导航

首页注入 **WebSite Schema**（含 SearchAction）。

### 7.2 Sitemap

`src/app/sitemap.ts` 动态生成 sitemap.xml，包含：
- 5 个静态页面（/, /topics, /claims, /search, /api-docs）
- 11 个 Claim 页面
- 8 个 Topic 页面

### 7.3 Robots.txt

`src/app/robots.ts` 生成 robots.txt：
- 允许所有爬虫访问页面
- 禁止爬取 /api/ 目录

### 7.4 Metadata

每个页面通过 `generateMetadata` 生成：
- title (含 Evidence Score)
- description
- keywords
- OpenGraph tags
- Twitter Card tags

---

## 8. 前端组件

### 8.1 ClaimCard

显示 Claim 卡片，用于列表和关联展示。
- Evidence Score 徽章（颜色：绿/黄/红）
- Claim 文本（2 行截断）
- Summary（2 行截断）
- RCT 数 / Meta 数 / 剂量

### 8.2 EvidenceScoreBadge

显示完整证据评分卡片：
- 总分 (0-100)
- 4 个维度星级评分（Human RCT, Meta, Mechanism, Safety）
- Confidence 级别

### 8.3 StarRating

通用星级评分组件（0-5 星）。

---

## 9. 样式系统

### 9.1 Tailwind CSS 配置

自定义品牌色 `brand`（蓝色系）和 `evidence`（证据评分色）。

```
brand: 50-900 (蓝色系)
evidence: high (#16a34a), moderate (#f59e0b), low (#dc2626)
```

### 9.2 全局样式

- 评分徽章颜色类 (.score-high, .score-moderate, .score-low)
- 机制图箭头样式
- 星级评分间距

---

## 10. 构建与部署

### 10.1 本地开发

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 推送 Schema 到 SQLite
npm run db:push

# 种子数据库
npm run db:seed

# 启动开发服务器
npm run dev
```

### 10.2 生产构建

```bash
npm run build
npm start
```

### 10.3 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 设置环境变量 (DATABASE_URL)
4. 部署
5. 运行 `npx prisma db push` 和 `npx prisma db seed` (通过 Vercel CLI)

### 10.4 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| DATABASE_URL | 数据库连接字符串 | file:./dev.db |
| NEXT_PUBLIC_SITE_URL | 站点 URL | https://evidencehubsleep.com |

---

## 11. 数据库管理

### 11.1 Prisma 命令

| 命令 | 说明 |
|---|---|
| `npx prisma generate` | 生成 Prisma Client |
| `npm run db:push` | 推送 Schema 到数据库 |
| `npm run db:seed` | 种子数据库 |
| `npm run db:studio` | 打开 Prisma Studio (GUI) |
| `npx prisma migrate dev` | 创建迁移 (开发) |
| `npx prisma migrate deploy` | 部署迁移 (生产) |

### 11.2 种子数据

种子脚本 (`prisma/seed.ts`) 从 `src/data/seed-data.ts` 读取静态数据并写入数据库。使用 `upsert` 确保幂等性。

---

## 12. 性能考虑

### 12.1 页面加载

- SSG 预渲染所有 Claim 和 Topic 页面
- 共享 JS chunks (~87 kB First Load)
- 每个 Claim 页面仅 187 B 额外 JS

### 12.2 搜索性能

当前搜索为内存中的线性扫描（11 个 Claims），对于 MVP 规模足够。未来如果 Claims 超过 1,000，需要迁移到数据库全文搜索或 Algolia/Elasticsearch。

### 12.3 API 性能

API 端点当前从静态数据读取，响应时间 < 5ms。迁移到数据库后需要添加缓存层。

---

## 13. 安全考虑

### 13.1 输入验证

- Search API 验证 `q` 参数存在
- 所有 API 返回 JSON，无 SQL 注入风险（当前无数据库查询）
- 未来数据库版本使用 Prisma 参数化查询

### 13.2 CORS

MVP 阶段使用 Next.js 默认 CORS 策略。生产环境需要配置允许的来源。

### 13.3 Rate Limiting

MVP 无 Rate Limiting。生产环境需要添加（如 Vercel Edge Middleware + Redis）。

---

## 14. 测试策略

### 14.1 当前状态

MVP 阶段采用手动验证 + 构建检查。2026-07-04 完成全面验证：

**构建验证：**
- `npm run build` ✅ 编译成功，0 TypeScript 错误
- 30/30 静态页面全部生成
- First Load JS: 87 kB (shared) + 187 B (per page)

**页面验证（全部 HTTP 200）：**

| 路由 | 渲染方式 | 验证结果 |
|---|---|---|
| `/` | SSG | ✅ 200 |
| `/claims` | SSG | ✅ 200 |
| `/claim/glycine-sleep-latency` | SSG | ✅ 200 (11 模块完整) |
| `/topics` | SSG | ✅ 200 |
| `/topics/glycine` | SSG | ✅ 200 |
| `/search?q=glycine` | Dynamic | ✅ 200 |
| `/api-docs` | SSG | ✅ 200 |
| `/sitemap.xml` | Static | ✅ 200 (24 URLs) |
| `/robots.txt` | Static | ✅ 200 |

**API 验证：**

| 端点 | 测试用例 | 结果 |
|---|---|---|
| `GET /api/claim/[slug]` | glycine-sleep-latency | ✅ 返回 JSON + _links |
| `GET /api/claim/[slug]` | invalid-slug | ✅ 404 + availableEndpoints |
| `GET /api/evidence/[topic]` | magnesium | ✅ 返回主题汇总 |
| `GET /api/search?q=` | q=melatonin&limit=3 | ✅ 返回 3 条结果 |
| `GET /api/search` | 无 q 参数 | ✅ 400 + example |

**SEO 验证：**
- JSON-LD: Article + FAQ + Breadcrumb + Website Schema 全部存在 ✅
- Sitemap: 24 URLs (5 static + 11 claims + 8 topics) ✅
- Robots.txt: 允许页面爬取，禁止 /api/ ✅

**数据完整性：**

| 数据类型 | 数量 | 验证 |
|---|---|---|
| Claims | 11 | ✅ |
| Studies | 15 | ✅ |
| Topics | 8 | ✅ |
| Evidence Links | 31 | ✅ |
| Dose Mappings | 30 | ✅ |
| Population Fits | 48 | ✅ |

### 14.2 推荐测试方案

| 层级 | 工具 | 覆盖范围 |
|---|---|---|
| Unit | Vitest | lib/data.ts, lib/seo.ts |
| Component | React Testing Library | ClaimCard, EvidenceScoreBadge |
| API | Vitest + supertest | API 路由 |
| E2E | Playwright | 关键用户流程 |
| Build | next build | TypeScript 编译 |

---

## 15. 路线图

### Phase 1: MVP ✅ 完成

- [x] Next.js 14 项目搭建
- [x] Claim Graph 数据模型
- [x] 11 个 Claims + 15 个 Studies
- [x] 完整前端页面 (7 个页面)
- [x] REST API (3 个端点)
- [x] SEO/GEO 优化
- [x] Prisma Schema + Seed

### Phase 2: 数据扩展 (计划中)

- [ ] PubMed API 自动接入
- [ ] AI Claim 提取流水线 (DeepSeek / OpenAI)
- [ ] 扩展至 100+ Claims
- [ ] PostgreSQL 迁移
- [ ] Vercel 部署

### Phase 3: 增值功能 (规划中)

- [ ] Podcast 生成 (Volcano TTS)
- [ ] Infographic 自动生成
- [ ] Affiliate 链接接入
- [ ] Newsletter 订阅
- [ ] MCP Server

### Phase 4: 平台化 (长期)

- [ ] GraphQL API
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
- 路径别名: `@/*` → `./src/*`

### 16.2 命名

- 文件: kebab-case (api-docs, seed-data)
- 组件: PascalCase (ClaimCard, EvidenceScoreBadge)
- 函数/变量: camelCase (getClaimBySlug, evidenceScore)
- 类型/接口: PascalCase (Claim, ClaimWithRelations)
- 常量: camelCase (claimsData, topicsData)
- 数据库表: snake_case (@@map)

### 16.3 React

- Server Components 默认
- 仅在需要交互时使用 "use client"
- 使用 Next.js Link 组件进行导航
- 使用 generateMetadata 进行 SEO

---

*TRD v1.1 — Updated: 2026-07-04 (added test verification results)*
