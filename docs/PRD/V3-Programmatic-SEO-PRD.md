# EvidenceHub V3 — Programmatic SEO PRD

> **Module 等级：** 贯穿（支撑 Explorer / Claim / Compare / Graph 的全部收录）
> **目标：** 从「文章 SEO」升级为 **Entity SEO**——每个医学实体（Claim / Compare / FAQ / Topic）都是 Google 和 AI 易于理解、易于引用的独立页面。
> **关联：** Explorer（页面形态）、Graph（实体关系）、Growth（内容生产驱动页面增长）

---

## 1. 战略转变

| 旧（文章 SEO） | 新（Entity SEO） |
|---|---|
| 写一篇 "Glycine for Sleep" 博客 | 生成实体页：Claim + Compare + FAQ + Topic |
| 关键词堆砌 | 结构化 Schema.org 语义 |
| 人工写 | Supabase 数据驱动自动发布 |
| 收录慢 | Pipeline 每日新增几十页 |

**核心理念：** Google 不再索引"文章"，而是索引"实体及其关系"。EvidenceHub 的每个 Claim 就是一个实体。

---

## 2. 页面类型与规模目标

| 页面类型 | 路由 | 数量来源 | Day 30 目标 |
|---|---|---|---|
| Claim | `/claim/[slug]` | `claims` 表 | 1,000+ |
| Compare | `/compare/[a]-vs-[b]` | `compare_pages` | 200+ |
| FAQ | `/claim/[slug]` 内嵌 + `/faq/[slug]` | `faqs` 表 | 5,000+ |
| Topic | `/topics/[slug]` | `topics` 表 | 50+ |
| Study | `/studies` + `/study/[pmid]` | `studies` 表 | 10,000+ |
| Graph | `/graph` + 实体图 | `graph_edges` | 无限 |

**总目标：** Day 30 → **3,000+ 可索引页面**；Month 3 → **10,000+**。

---

## 3. Schema.org 类型清单（必实现）

每个实体页必须输出对应 JSON-LD：

| 页面 | 主 Schema | 辅助 Schema |
|---|---|---|
| Claim | `MedicalEntity` + `MedicalScholarlyArticle` | `FAQPage`, `BreadcrumbList`, `Dataset` |
| Compare | `MedicalWebPage` + 双 `MedicalEntity` | `FAQPage`, `BreadcrumbList` |
| Topic | `MedicalWebPage` + `CollectionPage` | `BreadcrumbList`, `ItemList` |
| Study | `MedicalScholarlyArticle` | `BreadcrumbList` |
| 全局 | `Organization` + `WebSite`(SearchAction) | `Dataset` |

### 3.1 MedicalEntity 示例（Claim 页）

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalEntity",
  "name": "Glycine improves sleep latency",
  "description": "Evidence score 89/100 based on 8 RCTs and 2 meta-analyses.",
  "evidenceLevel": "Strong",
  "code": { "@type": "MedicalCode", "code": "glycine-sleep-latency" },
  "associatedAnatomy": { "@type": "AnatomicalStructure", "name": "Sleep" }
}
```

### 3.2 Dataset 示例（全站）

```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "EvidenceHub Sleep Evidence Dataset",
  "description": "Structured scientific evidence on sleep interventions.",
  "url": "https://sleep.p1web.site/",
  "license": "https://creativecommons.org/licenses/by/4.0/"
}
```

---

## 4. 自动发布机制（Supabase-Driven）

**原则：** 页面不手写，全部由数据库记录驱动。

```
Supabase 新记录
  └─ claims / compare_pages / topics / faqs
       └─ Next.js ISR (revalidate) 或构建期静态生成
            └─ 自动产出 URL + sitemap 条目 + Schema
```

### 4.1 实现要点

- **静态生成：** `generateStaticParams()` 从 `getAllClaimsDb()` 读取全部 slug（已支持，见 `sitemap.ts`）
- **ISR 更新：** Pipeline 写入新 Claim 后调用 `POST /api/revalidate?path=/claim/[slug]`（已存在 `revalidate` 路由）
- **Sitemap 自动包含：** `sitemap.ts` 已是 Supabase 数据源（408 URL），新记录自动进入

### 4.2 防重复 / 防稀薄内容（Thin Content）

| 风险 | 对策 |
|---|---|
| 低质量 Claim（score<40） | 不生成独立页或加 `noindex` |
| 重复 Compare | `compare_pages` UNIQUE(slug) 去重 |
| 孤儿页（无内链） | 强制每个实体页含 Related / Breadcrumb 内链 |

---

## 5. 内链图谱（Internal Linking Graph）

搜索引擎通过内链发现页面。EvidenceHub 的内链由 Graph 模块驱动：

- Claim 页 → Related Claims（自动）
- Claim 页 → Topic（breadcrumb）
- Topic 页 → Top Claims（按 score）
- Compare 页 ↔ 两个 Claim
- Study 页 → 引用它的 Claims

**验收：** 任意实体页到首页的点击深度 ≤ 3。

---

## 6. 抓取预算优化（Crawl Budget）

| 措施 | 说明 |
|---|---|
| `robots.txt` | 已禁止 `/api/`，允许全部实体页 |
| `canonical` | 每个实体页唯一 canonical（已通过 SEO Playbook 实现） |
| `sitemap` | 分片：claims / topics / studies / compare 各自 sitemap（>10k 时必需） |
| 404 治理 | Pipeline 删记录同步调用 revalidate 移除 |

---

## 7. GEO（Generative Engine Optimization）对齐

针对 AI 搜索引擎（ChatGPT/Gemini/Claude/Perplexity）：

- 每个 Claim 直接回答：Does it work? / How strong? / What dose? / Who benefits? / Limitations?
- 提供机器可读 JSON（`/api/citation/[slug]?format=json`）
- 使用清晰语义 HTML + Schema，便于 LLM 抽取

---

## 8. 验收标准（Acceptance Criteria）

- [ ] 所有 Claim 页含 `MedicalEntity` + `FAQPage` + `BreadcrumbList` JSON-LD，无 GSC 富媒体错误
- [ ] 新增 Claim 后 ≤ 1 小时内出现在 `sitemap.xml` 且可被 `URL 检查` 请求索引
- [ ] 全站无 `noindex` 冲突、无 canonical 重复
- [ ] 实体页点击深度 ≤ 3 到首页
- [ ] Day 30 可索引页面数 ≥ 3,000（GSC 覆盖率报告）

---

## 9. 与现有 SEO 工作的衔接

- 已完成的 **SEO Playbook（7/7）** 是本文档的"基础层"，保持不变
- 已提交的 **GSC-LAUNCH.md / BING-LAUNCH.md** 是操作 SOP，保持不变
- 本文档在其之上增加：Entity Schema 扩展 + 自动发布规模 + 内链图谱

---

*EvidenceHub V3 — Programmatic SEO PRD — 2026-07-07*
