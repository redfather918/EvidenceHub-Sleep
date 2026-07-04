# EvidenceHub Sleep — PRD v2.2

> **AI 驱动的睡眠循证知识系统（Evidence Graph + AI Search Native）**

---

## 一、项目定位

### Mission

> 将全球睡眠相关的科学研究结构化为"可计算的证据图谱（Evidence Graph）"，让任何人或 AI 在 30 秒内获取可信结论，而不是营销内容。

### 核心转变

| 旧互联网内容 | EvidenceHub |
|---|---|
| 博客文章 | Claim（结构化结论） |
| SEO 文章 | Evidence Graph |
| 信息 | 可计算证据 |
| 内容网站 | 知识数据库 |
| 阅读 | AI 可调用 |

### Vision

> 成为 Sleep 领域的 PubMed + Wikipedia + ChatGPT Knowledge Layer + API 标准

长期目标：**Sleep Knowledge Infrastructure Layer**

---

## 二、产品形态（3 层结构）

### L1：用户网站（Frontend）— ✅ 已实现

面向人类用户：

- 搜索 ✅
- 浏览（按主题 / 按分类） ✅
- 学习（Claim 详情页含 11 个模块） ✅
- API 文档 ✅
- 图表（Evidence Score 可视化） ✅
- Podcast（路线图）
- FAQ（JSON-LD 结构化） ✅

### L2：知识结构层（核心）— ✅ 已实现

> **Claim Graph（核心护城河）**

```
Claim → Evidence → Study → Dose → Population → Outcome → Confidence
```

这是产品真正的价值所在。已实现 11 个 Claim、15 个 Study、8 个 Topic 的完整证据图谱。

### L3：API / AI 层（未来护城河）— ✅ MVP 已实现

面向 AI / App：

- REST API ✅（3 个端点：Claim、Evidence、Search）
- GraphQL（路线图）
- MCP Server（路线图，目标 Q3 2026）
- Dataset Export（路线图）

---

## 三、目标用户

### 1. 健康搜索用户

关键词：insomnia, deep sleep, HRV, magnesium sleep, glycine sleep, melatonin

### 2. AI 用户（增长核心）

不读文章，直接问：

- Does glycine improve sleep?
- What is human evidence?
- Best dose?

### 3. 专业用户

医生、营养师、睡眠教练、健身教练

### 4. AI 系统（未来最大用户）

ChatGPT, Claude, Gemini, Perplexity, AI Agents

---

## 四、产品结构（网站信息架构）— ✅ 已实现

### 首页 ✅

- Search bar（核心） ✅
- Trending Claims（按 Evidence Score 排序） ✅
- Latest Evidence（按更新时间排序） ✅
- Topics 网格 ✅
- Stats 统计栏（Claims / Studies / Topics / RCTs） ✅
- API Docs 链接 ✅
- 使命说明区 ✅

### Topics 页面 ✅

- 主题列表（8 个主题） ✅
- 每个主题的平均评分和 Claim 数量 ✅
- 主题详情页含统计信息 ✅

### Claim 页面（核心页面）— ✅ 全部 11 个模块已实现

**URL 结构：** `/claim/glycine-sleep-latency`

#### 页面模块

1. **Claim Summary** — 一句话结论 ✅
2. **Evidence Score** — 人类 RCT / Meta-analysis / Mechanism / Safety / Confidence ✅
3. **Study Evidence** — 结构化展示每个研究（Participants, Dose, Duration, Outcome, Result） ✅
4. **Dose Response** — 剂量-效应关系（含 OPTIMAL 标记） ✅
5. **Mechanism Graph** — 作用机制图（箭头流程图） ✅
6. **Population Fit** — 适用人群（✅/⚠️/❌ 三级标记） ✅
7. **Limitations** — 必须强制存在的研究局限 ✅
8. **FAQ** — AI 优化问答（可展开） ✅
9. **Related Claims** — 相关 Claim ✅
10. **Products** — Affiliate 层（占位） ✅
11. **References** — PubMed, DOI 链接 ✅

### 搜索页面 ✅

- 关键词搜索（text, summary, keywords, category） ✅
- 搜索结果展示 ✅
- 空结果处理 ✅

### API 文档页面 ✅

- 3 个端点文档 + 示例响应 ✅
- 在线试用链接 ✅
- MCP Server 路线图 ✅
- Rate Limits 说明 ✅

---

## 五、核心创新：Claim Graph（系统护城河）— ✅ 已实现

### 数据模型

```
Claim
  → Evidence Set
    → Studies
      → Population
      → Dose
      → Effect Size
      → Confidence Score
```

### Claim 结构示例

```json
{
  "claim": "glycine improves sleep latency",
  "evidence_score": 91,
  "rcts": 3,
  "meta_analysis": 0,
  "population": ["healthy adults"],
  "dose": "3g",
  "confidence": "high"
}
```

### 当前数据规模

| 指标 | 数量 |
|---|---|
| Claims | 11 |
| Studies | 15 |
| Topics | 8 |
| Evidence Links | 31 |
| Dose Mappings | 30+ |
| Population Fits | 45+ |
| PubMed 引用 | 15 |

### 已覆盖主题

Glycine（2 claims）, Magnesium（2 claims）, Melatonin（2 claims）, Tart Cherry, L-Theanine, Ashwagandha, Apigenin, Exercise

### 可更新性

当新研究出现时，所有关联页面自动更新。架构支持动态添加新 Claim 和 Study。

---

## 六、数据库设计（核心资产）— ✅ 已实现

### 数据库

- ORM: Prisma ✅
- MVP: SQLite ✅
- Production: PostgreSQL（路线图）

### Tables

#### 1. Claims ✅

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
| lastUpdated | timestamp | 最后更新时间 |
| createdAt | timestamp | 创建时间 |

#### 2. Studies ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| pmid | string | PubMed ID |
| doi | string | DOI |
| title | string | 研究标题 |
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

#### 3. Evidence Links ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| claimId | string (FK) | 关联 Claim |
| studyId | string (FK) | 关联 Study |
| strength | int | 证据强度 (1-5) |

#### 4. Topics ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| slug | string | URL slug |
| name | string | 主题名 |
| description | text | 描述 |
| icon | string | 图标标识 |
| claimCount | int | Claim 数量 |

#### 5. Dose Mapping ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| claimId | string (FK) | 关联 Claim |
| compound | string | 化合物 |
| doseRange | string | 剂量范围 |
| effect | string | 效应描述 |
| optimal | boolean | 是否最优剂量 |

#### 6. Population Fit ✅

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string (PK) | 唯一标识 |
| claimId | string (FK) | 关联 Claim |
| group | string | 人群组 |
| fit | enum | yes/check/no |
| note | string | 备注 |

---

## 七、自动化系统（增长引擎）— 🔲 路线图

### 数据输入（规划中）

PubMed API, Semantic Scholar, Crossref, RSS feeds, Preprints

### AI 处理流水线（规划中）

每篇论文自动生成：

1. Summary
2. Claim extraction
3. Evidence scoring
4. Dose extraction
5. Mechanism graph
6. FAQ generation
7. Podcast script
8. Infographic
9. JSON schema
10. Publish

### 输出规模目标

- Day 1 → 20 pages（当前：11 claims, 30 pages）
- Day 7 → 100–300 pages
- Day 30 → 3,000+ pages

---

## 八、SEO + GEO 优化 — ✅ 已实现

### 每个页面已包含

- FAQ Schema (JSON-LD) ✅
- Article Schema (JSON-LD) ✅
- Author 标记 (Organization) ✅
- Study citations (MedicalScholarlyArticle) ✅
- DOI links ✅
- PubMed links ✅
- Claim structured blocks ✅
- Breadcrumb Schema ✅
- Website Schema ✅
- Sitemap (动态, 含所有 Claim + Topic URLs) ✅
- Robots.txt ✅
- OpenGraph + Twitter Card ✅

### GEO 优化策略 ✅

每个页面回答：

- Does it work? ✅
- How strong is evidence? ✅
- What is dose? ✅
- Who benefits? ✅
- Limitations? ✅

> 目标：让 AI 搜索引擎更容易引用本站内容。

---

## 九、API / AI 层（护城河升级）— ✅ MVP 已实现

### 1. Claim API ✅

```
GET /api/claim/glycine-sleep-latency
```

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
  "lastUpdated": "2026-06-15T00:00:00Z"
}
```

### 2. Evidence API ✅

```
GET /api/evidence/magnesium
```

```json
{
  "topic": "Magnesium",
  "summary": "...",
  "strength": "moderate",
  "studies": 3,
  "claims": [{ "slug": "...", "text": "...", "score": 84 }]
}
```

### 3. Search API ✅

```
GET /api/search?q=glycine&limit=5
```

返回匹配的 Claims 列表，含 evidenceScore, confidence, dose, rcts。

### 4. AI MCP Interface — 🔲 路线图

供 AI 直接调用：ChatGPT plugins, Claude tools, Agents

---

## 十、变现结构（多层）

| 层级 | 模式 | 时间线 | 状态 |
|---|---|---|---|
| 1 | Affiliate（Amazon, iHerb, Supplements, Wearables） | 短期 | 占位已实现 |
| 2 | Newsletter（Weekly Evidence Digest, Sleep insights） | 稳定 | 路线图 |
| 3 | Premium（Dose calculator, Full Evidence access, AI summary export） | 中期 | 路线图 |
| 4 | API（B2B licensing, AI companies, Health apps） | 长期 | MVP 已实现 |

---

## 十一、MVP 路径与完成状态

| Day | 任务 | 状态 |
|---|---|---|
| 1 | Next.js 基础站 + Claim 页面模板 | ✅ 完成 |
| 2 | PubMed API 接入 + 20 篇自动生成 | 🔲 路线图（当前手动 15 篇） |
| 3 | Evidence Score 系统 + Claim 结构化 | ✅ 完成 |
| 4 | FAQ + Schema + SEO 优化 | ✅ 完成 |
| 5 | Podcast 生成（TTS）+ Infographic | 🔲 路线图 |
| 6 | Affiliate 接入 + 100 篇内容 | 🔲 路线图（占位已实现） |
| 7 | Indexing + 社交分发（X / Reddit / YouTube） | 🔲 路线图 |

---

## 十二、护城河总结

这个项目的护城河 **不是**：

- ❌ 域名
- ❌ 内容数量
- ❌ SEO 文章

而是：

- ✔ Claim Graph（结构化知识系统） ✅
- ✔ Evidence Score 系统 ✅
- ✔ 自动更新机制（架构已支持）
- ✔ AI 可调用 API ✅
- ✔ GEO 优化结构 ✅

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
| JSON-LD (Article Schema) | ✅ Claim 页面包含 |
| JSON-LD (FAQ Schema) | ✅ Claim 页面包含 |
| JSON-LD (Breadcrumb Schema) | ✅ Claim 页面包含 |
| JSON-LD (Website Schema) | ✅ 首页包含 |
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

### 数据完整性验证

| 数据 | PRD 声明 | 实际验证 |
|---|---|---|
| Claims | 11 | ✅ 11 |
| Studies | 15 | ✅ 15 |
| Topics | 8 | ✅ 8 |
| Evidence Links | 31 | ✅ 31 |
| Dose Mappings | 30+ | ✅ 30 |
| Population Fits | 45+ | ✅ 48 |
| Sitemap URLs | — | ✅ 24 |
| 静态页面 | 30 | ✅ 30 |

---

## 十四、最终定义

> **EvidenceHub Sleep is not a content website.**
> **It is a computable knowledge graph for sleep science.**

---

## 附录 A：技术栈

| 层 | 技术选型 | 状态 |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | ✅ |
| Database | Prisma ORM + SQLite (MVP) → PostgreSQL (Production) | ✅ MVP |
| API | Next.js Route Handlers (REST) | ✅ |
| SEO | JSON-LD Schema + Sitemap + Robots.txt | ✅ |
| AI Pipeline | DeepSeek API / OpenAI (Claim extraction, scoring) | 🔲 路线图 |
| TTS | Volcano Engine TTS (Podcast) | 🔲 路线图 |
| Deployment | Vercel | 🔲 待部署 |
| Data Source | PubMed API, Semantic Scholar, Crossref | 🔲 路线图（当前手动） |

## 附录 B：实现状态总结

### 已完成（MVP）

- [x] Next.js 14 项目搭建 (App Router + TypeScript + Tailwind)
- [x] Prisma Schema 设计 (6 个模型)
- [x] 数据访问层 (lib/data.ts)
- [x] 类型系统 (lib/types.ts)
- [x] SEO/GEO 助手 (lib/seo.ts)
- [x] 11 个 Claims（含完整证据图谱）
- [x] 15 个 Studies（含 PubMed 引用）
- [x] 8 个 Topics
- [x] Dose Response 数据（30+ 条）
- [x] Population Fit 数据（45+ 条）
- [x] 首页（搜索 + Trending + Topics + Latest + 使命说明）
- [x] Claim 详情页（11 个模块）
- [x] Claims 列表页（按分类分组）
- [x] Topics 列表页 + 详情页
- [x] 搜索页
- [x] API 文档页
- [x] Claim API (GET /api/claim/[slug])
- [x] Evidence API (GET /api/evidence/[topic])
- [x] Search API (GET /api/search?q=)
- [x] Sitemap (动态)
- [x] Robots.txt
- [x] JSON-LD 结构化数据 (Article, FAQ, Breadcrumb, Website)
- [x] Prisma Seed 脚本
- [x] .env.example
- [x] README.md

### 路线图

- [ ] PubMed API 自动数据接入
- [ ] AI Claim 提取流水线
- [ ] Podcast 生成（TTS）
- [ ] Infographic 自动生成
- [ ] Affiliate 链接接入
- [ ] PostgreSQL 迁移
- [ ] MCP Server
- [ ] GraphQL API
- [ ] Vercel 部署
- [ ] 社交分发

---

*PRD v2.2 — Updated: 2026-07-04*
*Build: 11 claims, 15 studies, 8 topics, 30 pages*
*Test: All pages 200, 3 APIs verified, 11 modules confirmed, SEO validated*
