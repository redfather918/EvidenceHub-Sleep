# EvidenceHub Sleep — PRD v3.1

> **A Self-Updating, AI-Native Scientific Evidence Graph for Sleep & Health**

---

## 一、系统定义

> 将全球睡眠相关的科学研究结构化为"可计算的证据图谱（Evidence Graph）"，让任何人或 AI 在 30 秒内获取可信结论，而不是营销内容。

### 核心转变

| 旧互联网内容 | EvidenceHub v2 |
|---|---|
| 博客文章 | Claim Graph（结构化结论） |
| SEO 文章 | Evidence Graph（可计算证据） |
| 信息 | 可计算证据 + 自动更新 |
| 内容网站 | 自更新知识图谱 + 变现层 |
| 阅读 | AI 可调用 API + SaaS |

### Vision

> 成为 Sleep 领域的 PubMed + Wikipedia + ChatGPT Knowledge Layer + API 标准

长期目标：**Sleep Knowledge Infrastructure Layer**

---

## 二、系统总架构（v2 商业级，5 层结构）

```
                 ┌────────────────────┐
                 │  Data Sources      │
                 │ PubMed / RSS / AI  │
                 └────────┬───────────┘
                          ↓
            ┌──────────────────────────┐
            │   Ingestion Layer        │
            │ (Paper Collector)        │
            └────────┬─────────────────┘
                     ↓
        ┌──────────────────────────────┐
        │   AI Evidence Engine         │
        │  - Claim extraction          │
        │  - Evidence scoring          │
        │  - Deduplication             │
        │  - Structuring               │
        └────────┬─────────────────────┘
                     ↓
        ┌──────────────────────────────┐
        │   Knowledge Graph Layer      │
        │ Claims ↔ Studies ↔ Topics    │
        └────────┬─────────────────────┘
                     ↓
 ┌────────────────────────────────────────────┐
 │  Product Layer                            │
 │  - Web (Next.js)                         │
 │  - API (REST + future GraphQL/MCP)       │
 │  - SEO/GEO pages                         │
 │  - Affiliate system                      │
 └────────┬───────────────────────────────────┘
          ↓
 ┌────────────────────────────────────────────┐
 │ Monetization Layer                        │
 │ Affiliate + Subscription + API + Data     │
 └────────────────────────────────────────────┘
```

---

## 三、v1 → v2 核心升级点

| 模块 | v1 (MVP) | v2（商业级） | 状态 |
|---|---|---|---|
| 内容 | 文章 | Claim Graph | ✅ 已实现 |
| 更新 | 手动 | AI 自更新 + 冲突检测 | 🔲 v1 Pipeline 已实现 |
| 数据 | 简单表 | Knowledge Graph | ✅ 已实现 |
| SEO | 页面优化 | GEO + AI 引用优化 | ✅ 已实现 |
| 变现 | Affiliate 占位 | Affiliate + API + SaaS | 🔲 API ✅ / SaaS 路线图 |
| 架构 | 单站点 | 多层系统 | ✅ 已实现 |
| Evidence Score | 手动评分 | 公式化自动评分 | 🔲 v1 Scorer 已实现 |
| 数据源 | 手动录入 | PubMed API 自动采集 | 🔲 v1 Fetcher 已实现 |

---

## 四、核心资产：Claim Graph（升级版）

### Claim 结构（v2）

```json
{
  "claim_id": "glycine_sleep_latency",
  "text": "Glycine improves sleep latency",
  "topic": "Sleep",
  "subtopic": "Amino acids",

  "confidence_score": 91,

  "evidence": {
    "rcts": 8,
    "meta_analysis": 2,
    "cohort": 1,
    "animal": 3
  },

  "dose_range": {
    "optimal": "3g",
    "range": "2-5g"
  },

  "population": [
    "healthy adults",
    "older adults"
  ],

  "effect_size": {
    "sleep_latency_reduction": "10-20%"
  },

  "contradictions": [
    "Study X shows no effect in insomniacs"
  ],

  "last_updated": "2026-07-04"
}
```

### 当前数据规模

| 指标 | 数量 |
|---|---|
| Claims | 11 |
| Studies | 15 |
| Topics | 8 |
| Evidence Links | 31 |
| Dose Mappings | 30 |
| Population Fits | 48 |
| PubMed 引用 | 15 |

### 已覆盖主题

Glycine（2 claims）, Magnesium（2 claims）, Melatonin（2 claims）, Tart Cherry, L-Theanine, Ashwagandha, Apigenin, Exercise

---

## 五、商业级数据库设计

### 数据库

- ORM: Prisma ✅
- MVP: SQLite ✅
- Production: PostgreSQL（路线图）

### Tables

#### 1. claims（核心）✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| slug | string | URL slug |
| text | text | Claim 文本 |
| summary | text | 摘要 |
| category | string | 分类 |
| topicId | string (FK) | 关联 Topic |
| evidenceScore | int | 证据评分 (0-100) |
| humanRctScore | int | 人类 RCT 评分 (0-5) |
| metaScore | int | Meta-analysis 评分 (0-5) |
| mechanismScore | int | 机制评分 (0-5) |
| safetyScore | int | 安全性评分 (0-5) |
| confidence | enum | high/moderate/low |
| rctCount | int | RCT 数量 |
| metaCount | int | Meta-analysis 数量 |
| studyCount | int | 研究总数 |
| dose | string | 推荐剂量 |
| population | JSON | 适用人群数组 |
| limitations | JSON | 局限性数组 |
| mechanism | JSON | 机制步骤数组 |
| faq | JSON | FAQ 数组 |
| relatedSlugs | JSON | 相关 Claim slugs |
| keywords | JSON | SEO 关键词 |
| contradictions | JSON | 矛盾证据（v2 新增） |
| effectSize | JSON | 效应量结构化（v2 新增） |
| lastUpdated | timestamp | 最后更新时间 |
| createdAt | timestamp | 创建时间 |

#### 2. studies ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| pmid | string | PubMed ID |
| doi | string | DOI |
| title | string | 研究标题 |
| abstract | text | 摘要（v2 新增，AI 提取用） |
| journal | string | 期刊 |
| authors | string | 作者 |
| year | int | 发表年份 |
| sampleSize | int | 样本量 |
| duration | string | 研究时长 |
| intervention | string | 干预方式 |
| outcome | string | 研究结局 |
| effectSize | string | 效应量 |
| result | text | 结果描述 |
| studyType | enum | rct/meta/observational/animal |
| population | string | 研究人群 |
| url | string | PubMed 链接 |

#### 3. claim_study_map（关键关系，v2 升级）✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| claimId | string (FK) | 关联 Claim |
| studyId | string (FK) | 关联 Study |
| strength | enum | strong/moderate/weak |
| effectDirection | enum | positive/negative/neutral（v2 新增） |

#### 4. topics ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| slug | string | URL slug |
| name | string | 主题名 |
| description | text | 描述 |
| icon | string | 图标标识 |
| claimCount | int | Claim 数量 |
| parentTopic | string | 父主题（v2 新增，支持层级） |

#### 5. evidence_metrics（核心升级）🔲 路线图

| 字段 | 类型 | 说明 |
|---|---|---|
| claimId | string (FK) | 关联 Claim |
| rctCount | int | RCT 数量 |
| metaCount | int | Meta-analysis 数量 |
| humanEvidenceScore | int | 人类证据评分 |
| consistencyScore | int | 一致性评分 |
| effectSizeScore | int | 效应量评分 |
| finalScore | int | 综合评分 |

#### 6. dose_mappings ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| claimId | string (FK) | 关联 Claim |
| compound | string | 化合物 |
| doseRange | string | 剂量范围 |
| effect | string | 效应描述 |
| optimal | boolean | 是否最优剂量 |

#### 7. population_fits ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| claimId | string (FK) | 关联 Claim |
| group | string | 人群组 |
| fit | enum | yes/check/no |
| note | string | 备注 |

---

## 六、AI Evidence Engine（v2 灵魂）

### 架构

```
论文摘要 → [Step 1: Claim 提取] → [Step 2: 去重] → [Step 3: 评分] → [Step 4: 更新]
```

### Step 1：论文 → Claim 提取

AI Prompt 从论文摘要提取结构化数据：

```
Extract structured scientific claims.

Return:
- claim (结论陈述)
- intervention (干预方式)
- outcome (结局指标)
- population (研究人群)
- effect size (效应量)
- confidence (置信度)
- dose (剂量)
- mechanism (机制链)
- limitations (局限性)
- contradictions (矛盾证据)
```

**实现状态：** ✅ v1 已实现（`src/pipeline/ai-extractor.ts`）

### Step 2：Claim 去重（Graph Merge）

```python
if similarity(claim_new, claim_existing) > 0.85:
    merge_claims()  # 合并到已有 Claim，更新证据
else:
    create_new_claim()  # 创建新 Claim
```

**实现状态：** ✅ v1 已实现（基于关键词重叠 + 文本相似度的去重逻辑）

### Step 3：Evidence Scoring（升级版公式）

```text
Score =
  RCT_count × 10
+ Meta_count × 15
+ Human_studies × 8
+ Consistency × 20
+ Effect_size × 20
- Contradictions × 15

Clamp to [0, 100]
```

| 分数范围 | Confidence |
|---|---|
| 85-100 | high |
| 65-84 | moderate |
| 0-64 | low |

**实现状态：** ✅ v1 已实现（`src/pipeline/evidence-scorer.ts`）

### Step 4：自动更新旧 Claim

不是仅新增内容，而是持续优化已有 Claim：

- 新论文 → 匹配已有 Claim → 更新 evidence counts → 重算 score → 更新页面
- 矛盾证据 → 添加到 contradictions → 降低 score → 更新 confidence

**实现状态：** ✅ v1 已实现（`src/pipeline/pipeline.ts`）

---

## 七、自动更新系统（增长引擎）

### 每日 Pipeline

```
1. Fetch new papers (PubMed API)
2. Extract claims (AI)
3. Match existing graph (dedup)
4. Update scores (evidence scorer)
5. Regenerate seed data
6. Ready for build + deploy
```

### Cron 配置

```bash
0 3 * * * npm run pipeline:daily
```

### Pipeline v1 架构

```
src/pipeline/
├── config.ts           # 配置（API keys, search terms, thresholds）
├── pubmed-fetcher.ts   # PubMed E-utilities API 采集器
├── ai-extractor.ts     # AI Claim 提取 + 去重
├── evidence-scorer.ts  # v2 评分算法
├── pipeline.ts         # 主流水线编排
└── types.ts            # Pipeline 专用类型

scripts/
└── run-pipeline.ts     # CLI 入口
```

### 输出规模目标

| 时间 | 页面数 | 状态 |
|---|---|---|
| Day 1 | 30 pages | ✅ 已达成（11 claims） |
| Day 7 | 100-300 pages | 🔲 Pipeline v1 就绪 |
| Day 30 | 3,000+ pages | 🔲 路线图 |

---

## 八、Knowledge Graph（护城河）

网站不是文章集合，而是知识图谱：

```
Magnesium ─── improves sleep ─── Sleep latency
     │
     ├── interacts with glycine
     ├── affects HRV
     ├── reduces cortisol
```

### 图结构

- **Nodes** = Claims / Topics / Studies
- **Edges** = Evidence relationships（strength, direction）

### 护城河本质

不是文章数量、SEO、域名，而是：

- ✔ Claim Graph（结构化知识系统）
- ✔ 自动更新机制
- ✔ Evidence Score 系统
- ✔ AI 可调用结构化数据

---

## 九、产品层（商业化重点）

### Web（Next.js）✅ 已实现

- Claim 页面（核心，11 模块）✅
- Topic 页面（SEO 入口）✅
- Search（关键词搜索）✅
- API 文档页面 ✅

### Claim 页面 11 模块 ✅

1. Claim Summary — 一句话结论 ✅
2. Evidence Score（4 维度星级）✅
3. Study Evidence（结构化研究卡片）✅
4. Dose Response（含 OPTIMAL 标记）✅
5. Mechanism Graph（箭头流程图）✅
6. Population Fit（✅/⚠️/❌）✅
7. Limitations（强制存在）✅
8. FAQ（可展开）✅
9. Related Claims ✅
10. Products（Affiliate 占位）✅
11. References（PubMed + DOI 链接）✅

### API（商业化）✅ MVP 已实现

```http
GET /api/claim/glycine-sleep-latency
GET /api/evidence/magnesium
GET /api/search?q=melatonin&limit=5
```

返回结构化 JSON，含 `_links` 供 AI 系统 discoverable 调用。

### Affiliate Layer 🔲

自动嵌入 Amazon / iHerb / Supplement brands，规则：仅展示研究上下文中使用过的产品。

### Subscription（未来）🔲

- Weekly Evidence Digest
- Full database access
- Advanced dose calculator

---

## 十、SEO + GEO 优化 ✅ 已实现

### 每个页面已包含

- FAQ Schema (JSON-LD) ✅
- Article Schema (JSON-LD) ✅
- Breadcrumb Schema ✅
- Website Schema ✅
- Study citations (MedicalScholarlyArticle) ✅
- DOI / PubMed links ✅
- Sitemap（动态，24 URLs）✅
- Robots.txt ✅
- OpenGraph + Twitter Card ✅

### GEO 优化策略

每个 Claim 回答 AI 搜索引擎的核心问题：

- Does it work? ✅
- How strong is evidence? ✅
- What is dose? ✅
- Who benefits? ✅
- Limitations? ✅

---

## 十一、变现结构（多层）

| 层级 | 模式 | 时间线 | 状态 |
|---|---|---|---|
| 1 | Affiliate（Amazon, iHerb, Supplements, Wearables） | 短期现金流 | 占位已实现 |
| 2 | API（B2B licensing, AI companies, Health apps） | 核心增长 | MVP 已实现 |
| 3 | Subscription（Evidence dashboard, weekly digest, dose calculator） | 稳定收入 | 路线图 |
| 4 | Data Asset（Claim Graph, Sleep Evidence Knowledge Base） | 长期 | 积累中 |

---

## 十二、目标用户

### 1. 健康搜索用户
关键词：insomnia, deep sleep, HRV, magnesium sleep, glycine sleep, melatonin

### 2. AI 用户（增长核心）
不读文章，直接问：Does glycine improve sleep? What is human evidence? Best dose?

### 3. 专业用户
医生、营养师、睡眠教练、健身教练

### 4. AI 系统（未来最大用户）
ChatGPT, Claude, Gemini, Perplexity, AI Agents

---

## 十三、测试验证结果（2026-07-04）

### 构建验证

| 检查项 | 结果 |
|---|---|
| `npm run build` | ✅ 编译成功，0 错误 |
| TypeScript strict mode | ✅ 类型检查通过 |
| 静态页面生成 | ✅ 30/30 页面全部生成 |
| First Load JS | 87 kB (shared) + 187 B (per page) |

### 页面验证（HTTP 200）

| 页面 | URL | 状态 |
|---|---|---|
| 首页 | `/` | ✅ 200 |
| Claims 列表 | `/claims` | ✅ 200 |
| Claim 详情 | `/claim/glycine-sleep-latency` | ✅ 200 |
| Topics 列表 | `/topics` | ✅ 200 |
| Topic 详情 | `/topics/glycine` | ✅ 200 |
| 搜索 | `/search?q=glycine` | ✅ 200 |
| API 文档 | `/api-docs` | ✅ 200 |
| Sitemap | `/sitemap.xml` | ✅ 200 (24 URLs) |
| Robots | `/robots.txt` | ✅ 200 |

### API 验证

| 端点 | 测试 | 结果 |
|---|---|---|
| Claim API | `GET /api/claim/glycine-sleep-latency` | ✅ 返回结构化 JSON + _links |
| Evidence API | `GET /api/evidence/magnesium` | ✅ 返回主题级证据汇总 |
| Search API | `GET /api/search?q=melatonin&limit=3` | ✅ 返回 3 条匹配结果 |
| 404 处理 | `GET /api/claim/invalid-slug` | ✅ 返回 error + availableEndpoints |
| 400 处理 | `GET /api/search` (无参数) | ✅ 返回 error + example |

### SEO 验证

| 检查项 | 结果 |
|---|---|
| JSON-LD (Article Schema) | ✅ |
| JSON-LD (FAQ Schema) | ✅ |
| JSON-LD (Breadcrumb Schema) | ✅ |
| JSON-LD (Website Schema) | ✅ |
| Sitemap URLs | ✅ 24 条 (5 静态 + 11 claims + 8 topics) |
| Robots.txt | ✅ 允许页面爬取，禁止 /api/ |

### Claim 页面 11 模块验证

| 模块 | 状态 |
|---|---|
| 1. Claim Summary | ✅ |
| 2. Evidence Score (4 维度星级) | ✅ |
| 3. Study Evidence (结构化研究卡片) | ✅ |
| 4. Dose Response (OPTIMAL 标记) | ✅ |
| 5. Mechanism Graph (箭头流程图) | ✅ |
| 6. Population Fit (✅/⚠️/❌) | ✅ |
| 7. Limitations (强制存在) | ✅ |
| 8. FAQ (可展开) | ✅ |
| 9. Related Claims | ✅ |
| 10. Products (Affiliate 占位) | ✅ |
| 11. References (PubMed + DOI 链接) | ✅ |

---

## 十四、实现状态总结

### 已完成（MVP + Pipeline v1）

- [x] Next.js 14 项目搭建 (App Router + TypeScript + Tailwind)
- [x] Prisma Schema 设计 (6 个模型)
- [x] 数据访问层 (lib/data.ts)
- [x] 11 个 Claims（含完整证据图谱）
- [x] 15 个 Studies（含 PubMed 引用）
- [x] 8 个 Topics
- [x] Claim 详情页（11 个模块）
- [x] 3 个 REST API 端点
- [x] JSON-LD 结构化数据 (Article, FAQ, Breadcrumb, Website)
- [x] Sitemap + Robots.txt
- [x] PubMed 论文采集器（Ingestion Layer v1）
- [x] AI Claim 提取引擎（Evidence Engine Step 1-2）
- [x] Evidence Score 计算器（v2 评分公式）
- [x] Pipeline Runner + CLI（自动更新系统 v1）

### 路线图

- [ ] AI API 接入（DeepSeek/OpenAI）实现真实 Claim 提取
- [ ] PostgreSQL 迁移
- [ ] GraphQL API
- [ ] MCP Server
- [ ] Podcast 生成（TTS）
- [ ] Infographic 自动生成
- [ ] Affiliate 链接接入
- [ ] Subscription 系统
- [ ] Vercel 部署 + Cron 定时运行
- [ ] 社交分发

---

## 十五、开发路线图（10 Sprint 商业级）

> **架构冻结优先**：数据库设计决定了项目 80% 的可扩展性。先冻结 Schema，再写代码。

### Monorepo 目录结构

```
evidencehub-sleep/
├── apps/
│    └── web/                      # Next.js 15 (App Router)
│
├── packages/
│    ├── database/                 # Prisma Schema + Client + Migrations
│    ├── ui/                       # Shared UI Components (shadcn/ui)
│    ├── ai/                       # AI Claim Extraction (OpenAI/DeepSeek/Gemini)
│    ├── crawler/                  # PubMed / RSS / Data Source Fetchers
│    ├── evidence-engine/          # Scoring + Dedup + Graph Merge
│    └── api-sdk/                  # TypeScript SDK for API consumers
│
├── supabase/                      # Supabase config + SQL migrations
│
├── scripts/                       # Pipeline CLI + Cron scripts
│
└── docs/                          # PRD + TRD + Operation Manual
```

> 未来扩展到 Nutrition / Heart / Longevity 时，只需增加 Topic 和数据，不用重构系统。

### Sprint 1：数据库 Schema（Prisma）— **当前**

- 设计 15 张核心表的 Prisma Schema（PostgreSQL）
- 数据模型：Topic → Claim → Evidence → Study → Product → FAQ → ContentAsset
- 创建 Supabase SQL 迁移文件
- 冻结数据契约，后续 Sprint 全部基于此 Schema 开发

### Sprint 2：API 设计（REST + TypeScript 类型）

- 定义所有 REST 端点的请求/响应类型
- 前后端契约确定
- API SDK 包（packages/api-sdk/）

### Sprint 3：网站 UI

- 首页 / Claim 页面 / Topic 页面 / Search / Evidence Score / Affiliate 模块 / API Docs
- 基于 shadcn/ui 组件库
- 这一阶段网站可以上线

### Sprint 4：Search Engine

- 不是普通搜索，而是：关键词 → 找到 Topic → 找到所有 Claim → Evidence 排序
- Phase 1: PostgreSQL Full Text Search
- Phase 2: Meilisearch（后期）

### Sprint 5：AI Engine

- 输入：PubMed Paper
- 输出：Claim + Evidence + Dose + Population + Limitations + FAQ
- 这是整个项目最值钱的部分

### Sprint 6：自动更新系统

- 数据库已稳定、页面已稳定、API 已稳定 → 现在才接入自动更新
- 流程：凌晨 2 点 → PubMed → 抓新论文 → AI 解析 → 更新数据库 → 重新生成页面 → Google Index

### Sprint 7：Affiliate 系统

- Claim → Recommended Form → Research Dose → Amazon → iHerb
- 自动嵌入，仅展示研究上下文中使用过的产品

### Sprint 8：API 商业化

- API Key 管理 + 速率限制 + 使用量追踪
- 分层定价（Free / Pro / Enterprise）

### Sprint 9：Admin 后台

- 新增论文 / 修改 Claim / 人工审核 / 更新 Evidence

### Sprint 10：AI Agent + MCP

- ChatGPT / Claude / Gemini 直接调用
- MCP Server 实现

---

## 十六、内容生态（一条 Claim → 全渠道内容）

> 一篇研究衍生出多个渠道的内容，而不是只生成一篇网页。

```
Claim
  │
  ├── Web Page (Next.js SSG)
  │
  ├── FAQ (JSON-LD, AI 引用)
  │
  ├── Podcast (TTS 生成)
  │
  ├── YouTube Shorts (视频自动生成)
  │
  ├── X / Twitter (自动发帖)
  │
  ├── LinkedIn (专业内容)
  │
  └── Newsletter (Weekly Evidence Digest)
```

### 数据模型支持

```sql
-- ContentAsset 表：一条 Claim 可以有多个渠道的内容
CREATE TABLE content_assets (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id),
  channel TEXT,        -- 'web' | 'faq' | 'podcast' | 'video' | 'twitter' | 'linkedin' | 'newsletter'
  title TEXT,
  body TEXT,
  url TEXT,
  status TEXT DEFAULT 'draft',  -- 'draft' | 'published' | 'archived'
  metadata JSONB,
  created_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);
```

---

## 十七、最终冻结技术栈（2026 最佳实践）

| 模块 | 技术选型 | 状态 |
|---|---|---|
| Frontend | Next.js 15 + React + TypeScript | ✅ v14 已用，v15 升级路线 |
| UI | Tailwind CSS + shadcn/ui | 🔲 Sprint 3 |
| Database | PostgreSQL（Supabase） | ✅ Schema 设计中 |
| ORM | Prisma | ✅ |
| Auth | Supabase Auth | 🔲 Sprint 8 |
| Storage | Supabase Storage | 🔲 |
| Search | PostgreSQL Full Text → Meilisearch（后期） | 🔲 Sprint 4 |
| AI | OpenAI + Gemini（可切换） | ✅ v1 框架 |
| Deployment | Vercel | 🔲 待部署 |
| Cron | GitHub Actions + Vercel Cron | ✅ v1 就绪 |
| Analytics | Google Analytics + Search Console + Plausible | 🔲 |
| Monorepo | pnpm workspaces | 🔲 Sprint 1 |

---

## 十八、Sprint 1 数据库设计（15 张核心表）

### 数据模型全景

```
Topic (层级)
  │
  ▼
Claim (核心)
  ├── EvidenceMetric (评分)
  ├── ClaimStudyMap ──→ Study (论文)
  ├── DoseMapping (剂量)
  ├── PopulationFit (人群)
  ├── FAQ (问答)
  ├── ClaimProduct ──→ Product (Affiliate)
  ├── ContentAsset (多渠道内容)
  ├── Reference (引用)
  └── PipelineRun (更新日志)
  
ApiKey (API 商业化)
ApiUsageLog (用量追踪)
```

### 15 张表清单

| # | 表名 | 用途 | Sprint |
|---|---|---|---|
| 1 | topics | 主题（含层级） | 1 ✅ |
| 2 | claims | 核心结论 | 1 ✅ |
| 3 | studies | 研究论文 | 1 ✅ |
| 4 | claim_study_map | Claim-Study 关系（含 strength + direction） | 1 ✅ |
| 5 | evidence_metrics | 证据评分（6 维度） | 1 ✅ |
| 6 | dose_mappings | 剂量-效应 | 1 ✅ |
| 7 | population_fits | 人群适配 | 1 ✅ |
| 8 | faqs | 常见问题（规范化） | 1 ✅ |
| 9 | products | Affiliate 产品 | 1 ✅ |
| 10 | claim_products | Claim-Product 关系 | 1 ✅ |
| 11 | content_assets | 多渠道内容（Web/Podcast/Video/Social/Newsletter） | 1 ✅ |
| 12 | references | 外部引用 | 1 ✅ |
| 13 | pipeline_runs | Pipeline 执行日志 | 1 ✅ |
| 14 | api_keys | API 密钥管理 | 1 ✅ |
| 15 | api_usage_logs | API 用量追踪 | 1 ✅ |

---

## 十九、最终定义

> **EvidenceHub Sleep is not a content website.**
> **It is a self-updating scientific knowledge graph for sleep science.**

### 护城河

不是文章数量、SEO、域名，而是：

- ✔ Claim Graph（结构化知识系统）
- ✔ 自动更新机制
- ✔ Evidence Score 系统
- ✔ AI 可调用结构化数据
- ✔ 15 张表的生产级数据模型

---

*PRD v3.1 — Updated: 2026-07-04*
*Build: 11 claims, 15 studies, 8 topics, 30 pages*
*Pipeline: PubMed fetcher + AI extractor + Evidence scorer + CLI runner (v1)*
*Sprint 1: 15-table PostgreSQL Prisma Schema + Supabase migration + Monorepo structure*
*Test: All pages 200, 3 APIs verified, 11 modules confirmed, SEO validated*
