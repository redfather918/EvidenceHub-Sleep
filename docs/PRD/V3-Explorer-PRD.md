# EvidenceHub V3 — Module 1：Evidence Explorer PRD

> **Module 等级：** P0（Product Week 核心交付）
> **目标：** 把首页从「Latest Articles」重构为「Evidence Explorer」——一个可以搜索、筛选、浏览医学证据的产品入口。
> **关联模块：** Claim（升级）、Compare（P0）、Graph（P1）、Programmatic SEO

---

## 1. 产品目标

用户打开 EvidenceHub 的第一感觉必须是：

> **"这是一个可以搜索医学证据的产品。"**
> 而不是："这是一个健康博客。"

首页结构（目标态）：

```
🔍 Search evidence...

────────────────────
Browse Topics
🟦 Sleep      🟩 Nutrition
🟥 Heart      🟨 Longevity

────────────────────
Trending Evidence
• Glycine      Evidence Score 89
• Magnesium    Evidence Score 84
• Kiwi         Evidence Score 78

────────────────────
Evidence Explorer
Filter: ☑ Human RCT  ☑ Meta-analysis
Sort:   Highest Evidence
```

---

## 2. 用户故事（User Stories）

| # | 作为… | 我想… | 以便… |
|---|---|---|---|
| US-1 | 普通用户 | 在首页搜索框输入 "melatonin" | 直接看到相关 Claim 列表 |
| US-2 | 用户 | 按 Topic（Sleep/Nutrition）筛选 | 聚焦我关心的领域 |
| US-3 | 用户 | 按证据类型（RCT/Meta）过滤 | 只看高质量人类研究 |
| US-4 | 用户 | 按 "Highest Evidence" 排序 | 优先看最可信结论 |
| US-5 | 用户 | 看到 "Trending Evidence" | 快速发现热门物质 |
| US-6 | 用户 | 点 Compare 页（Glycine vs Magnesium） | 一眼对比两者证据 |
| US-7 | AI 开发者 | 调用 /api/explore 带筛选参数 | 在自己的产品里嵌入证据列表 |
| US-8 | 研究者 | 复制某 Claim 的 BibTex/RIS 引用 | 在论文中引用 |

---

## 3. 页面结构（Page Spec）

### 3.1 首页 Explorer（`/`）

| 区块 | 内容 | 数据来源 |
|---|---|---|
| Hero Search | 大搜索框（即时搜索 + 回车跳转 /search） | `/api/search` |
| Browse by Topic | 4–8 个 Topic 卡片（icon + name + claimCount） | `getAllTopicsDb()` |
| Trending Evidence | Top N Claims by evidenceScore | `getTrendingClaims()` |
| Highest Evidence | 按 evidenceScore 降序列表 | `getClaims({sort:'evidence'})` |
| Newest Studies | 最近入库 studies | `getStudies({sort:'newest'})` |
| Recently Updated | lastUpdated 最近的 Claims | `getClaims({sort:'updated'})` |
| Filters Bar | Category + StudyType + Sort 控件 | 客户端状态，驱动 /api/explore |

### 3.2 Claim 升级页（`/claim/[slug]`）

V3 固定 **13 模块**（在原 11 模块基础上新增 Evidence Graph 入口 + AI Citation）：

1. Claim Summary（一句话结论）
2. Evidence Score（4 维度星级 + 总分）
3. Key Findings（AI 提取要点）
4. Dose（剂量范围 + OPTIMAL 标记）
5. Safety（安全性提示）
6. Mechanism（机制流程图）
7. FAQ（可展开，JSON-LD）
8. Human Studies（RCT 卡片）
9. Meta-analysis（荟萃分析卡片）
10. Related Claims（相关 Claim 网格）
11. Evidence Graph（嵌入 Graph 模块入口，见 Graph PRD）
12. AI Citation（BibTex / RIS / Markdown / JSON 一键复制）
13. References（PubMed + DOI 链接）

### 3.3 Compare 页（`/compare/[a]-vs-[b]`）

| 区块 | 内容 |
|---|---|
| Header | A vs B 标题 + 各自 Evidence Score |
| Evidence Score 对比 | 双柱状图 |
| Human RCT 对比 | 数量 + 质量 |
| Meta-analysis 对比 | 数量 |
| Safety 对比 | 安全提示对照 |
| Cost 对比 | 估算成本（来自 products 表） |
| Conclusion | AI 生成的对比结论（来自 pipeline） |

**自动生成规则：** 任意两个 Claim slug 组合 → 若 `compare_pages` 不存在则自动生成并缓存。

---

## 4. 数据模型（Data Model）

### 4.1 复用现有表（无需新建）

- `claims`（已含 evidenceScore / rctCount / metaCount / dose / faq 等）
- `studies` + `claim_study_map`（已含 strength / effectDirection）
- `topics`（已含 claimCount / icon）
- `evidence_metrics`（已含 finalScore 分解）
- `products` + `claim_products`（Affiliate 用）

### 4.2 新增表：`compare_pages`

```sql
CREATE TABLE compare_pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_a        text NOT NULL,          -- claim slug A
  slug_b        text NOT NULL,          -- claim slug B
  slug          text UNIQUE NOT NULL,   -- "glycine-vs-magnesium"
  title         text NOT NULL,
  conclusion    text,                   -- AI 生成结论
  score_a       int,
  score_b       int,
  rct_a         int,
  rct_b         int,
  meta_a        int,
  meta_b        int,
  safety_a      text,
  safety_b      text,
  cost_a        numeric,
  cost_b        numeric,
  generated_by  text DEFAULT 'pipeline',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX idx_compare_slug ON compare_pages(slug);
```

### 4.3 TypeScript 类型（加入 `src/lib/types.ts`）

```typescript
export interface ComparePage {
  id: string;
  slugA: string;
  slugB: string;
  slug: string;
  title: string;
  conclusion?: string;
  scoreA?: number;
  scoreB?: number;
  rctA?: number;
  rctB?: number;
  metaA?: number;
  metaB?: number;
  safetyA?: string;
  safetyB?: string;
  costA?: number;
  costB?: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. API 契约（API Contracts）

### 5.1 `GET /api/explore`（新增，Explorer 核心）

**Query Params：**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `topic` | string | — | Topic slug 过滤 |
| `category` | string | — | Category 过滤 |
| `studyType` | enum | — | rct / meta / observational / animal |
| `sort` | enum | `evidence` | evidence / newest / updated / rct |
| `q` | string | — | 关键词 |
| `page` | int | 1 | 分页 |
| `pageSize` | int | 20 | 每页条数（max 100） |

**Response 200：**

```json
{
  "total": 246,
  "page": 1,
  "pageSize": 20,
  "items": [
    {
      "slug": "glycine-sleep-latency",
      "text": "Glycine improves sleep latency",
      "evidenceScore": 89,
      "confidence": "high",
      "rctCount": 8,
      "metaCount": 2,
      "topic": "sleep",
      "lastUpdated": "2026-07-04"
    }
  ],
  "_links": {
    "self": "/api/explore?sort=evidence&page=1",
    "next": "/api/explore?sort=evidence&page=2"
  }
}
```

### 5.2 `GET /api/compare?a=glycine&b=magnesium`（新增）

返回 `ComparePage` 结构；若不存在则触发生成（pipeline 或实时 LLM），缓存到 `compare_pages`。

### 5.3 `GET /api/citation/[slug]?format=bibtex|ris|markdown|json`（新增）

返回指定格式的引用文本（纯文本 / JSON）。

### 5.4 现有 API 演进

- `/api/search`：增强为支持 `category` / `studyType` 过滤（复用 Explorer 查询层）
- `/api/evidence/[topic]`：演进为 `/api/topic/[slug]`，返回 Topic 聚合 + 邻接 Claim

---

## 6. AI 引用格式（AI Search 新增）

每个 Claim 页「AI Citation」区块提供 4 种格式一键复制：

| 格式 | 用途 | 示例 |
|---|---|---|
| BibTex | 学术论文 | `@misc{glycine-sleep-latency,...}` |
| RIS | 文献管理软件 | `TY - GEN ... ER` |
| Markdown | 文档/README | `[Glycine improves sleep latency](url)` |
| JSON | AI 直接解析 | `{"claim":"...","score":89,...}` |

**实现：** `src/lib/citation.ts` 提供 `toBibtex(claim)` / `toRis(claim)` / `toMarkdown(claim)` / `toJson(claim)`，从 `ClaimV2WithRelations` 生成。

---

## 7. 前端组件清单（Frontend Components）

| 组件 | 文件 | 说明 |
|---|---|---|
| `ExplorerHero` | `components/explorer/Hero.tsx` | 搜索框 |
| `TopicGrid` | `components/explorer/TopicGrid.tsx` | Topic 卡片网格 |
| `TrendingList` | `components/explorer/TrendingList.tsx` | 热门证据 |
| `FilterBar` | `components/explorer/FilterBar.tsx` | 筛选+排序控件 |
| `ClaimCard` | `components/claim/ClaimCard.tsx` | 证据卡片（Score 角标） |
| `CompareView` | `components/compare/CompareView.tsx` | 对比双栏 |
| `CitationBox` | `components/claim/CitationBox.tsx` | 引用导出 |

---

## 8. SEO 对接（详见 Programmatic SEO PRD）

- Explorer 列表页：`CollectionPage` + `ItemList` + `BreadcrumbList` JSON-LD
- Compare 页：`Compare` 语义结构 + `FAQ` + `Breadcrumb`
- 每个实体页必须有 `MedicalEntity` / `MedicalStudy` Schema（见 SEO PRD）

---

## 9. 验收标准（Acceptance Criteria）

### Explorer 首页
- [ ] 搜索框即时搜索（debounce 300ms）返回 ≤ 200ms（本地缓存）
- [ ] Browse by Topic 显示全部 Topic 及 claimCount，点击跳转 /topics/[slug]
- [ ] FilterBar 的 category / studyType / sort 任意组合改变 URL query 并触发 /api/explore 刷新
- [ ] Trending Evidence 按 evidenceScore 降序，仅显示 confidence=high 的前 10

### Claim 升级页
- [ ] 13 模块全部渲染，顺序固定
- [ ] Evidence Graph 区块嵌入 Graph 模块入口（Week 3 接通）
- [ ] AI Citation 4 种格式复制成功，内容含正确 URL 与访问日期

### Compare 页
- [ ] 访问 `/compare/glycine-vs-magnesium` 自动生成并渲染 7 区块
- [ ] 交换 A/B 顺序得到相同结论（幂等）
- [ ] 生成结果缓存到 `compare_pages`，二次访问不重新调用 LLM

### API
- [ ] `/api/explore` 支持全部 Query Params，分页正确
- [ ] `/api/citation/[slug]` 四种格式均返回 200 且内容合法
- [ ] 所有 API 响应含 `_links`

---

## 10. 依赖与排期

- **依赖：** 现有 `claims` / `studies` / `topics` 表；`lib/db.ts` 查询层
- **新增：** `compare_pages` 表 + `lib/db.ts` 查询 + 4 个 API + 7 个前端组件
- **排期：** Product Week 内完成 Explorer 首页 + Claim 升级 + Compare 框架

---

*EvidenceHub V3 — Module 1 Evidence Explorer PRD — 2026-07-07*
