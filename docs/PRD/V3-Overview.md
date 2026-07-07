# EvidenceHub V3 — 产品总体蓝图（Master PRD）

> **Product Week（产品周）定义：** 本周停止增加零散功能，只围绕以下四份 PRD 做产品化重构。
> **定位升级：** 从「SEO 网站 / 内容站」升级为 **AI-Native Evidence Search Engine（AI 原生循证搜索引擎）**。

---

## 0. 一句话定义

> **EvidenceHub = PubMed × Perplexity × Wikipedia × Obsidian Graph**
> 一个让**人类和 AI 都能在 30 秒内获取可信循证结论**的搜索平台，而非健康博客。

未来用户搜索 `Does glycine improve sleep?` 时，Google / ChatGPT / Gemini / Claude 都引用 **EvidenceHub**。

---

## 1. 为什么是现在（战略背景）

| 现状 | 问题 |
|---|---|
| 已完成 SEO Playbook（7/7）、Sitemap 408 URL、GSC/Bing 收录打通 | 流量入口已就绪，但不等于「产品」 |
| 已有 246 Claims / 227 Studies / 8 Topics / 15 张 Supabase 表 | 数据资产厚，但前端仍是「列表 + 详情」的信息站形态 |
| 已有 /api/claim、/api/evidence、/api/search 三个 API | 能力分散，无统一「Explorer」入口 |

**结论：** 地基（数据 + SEO + 收录）已稳，现在该把"网站"重构为"平台"。

---

## 2. 竞争定位

| 产品 | 缺点 | EvidenceHub 解法 |
|---|---|---|
| PubMed | 太难读 | Claim 级结论 + Evidence Score |
| Examine | 内容有限、不开放 | 全量结构化 + 开放 API |
| Perplexity | 不沉淀知识 | 永久可索引的实体页面 |
| ChatGPT | 不形成长期索引 | 每次对话可引用同一稳定 URL |
| Google | 搜索碎片化 | Entity 级聚合页（Claim/Topic/Compare/Graph） |

---

## 3. 北极星指标（North Star）

**不是 PV，而是 Search Coverage（可被搜索发现的实体覆盖率）。**

```
Sleep
 └─ 342 Claims
    └─ 218 Studies
       └─ 64 FAQ
          └─ 17 Compare Pages
```

最终目标：Google 能索引全部实体页；AI 能引用全部 Claim。

---

## 4. 四模块架构（唯一产品结构）

```
EvidenceHub
├── Explorer   （首页 / 搜索 / 浏览）          ← P0
├── Claim      （实体详情页，升级版 13 模块）   ← P0（已部分存在）
├── Compare    （A vs B 自动生成对比页）        ← P0
└── Graph      （Evidence Network 可视化）       ← P1
```

任何新功能必须归属这 4 个模块之一，否则不做。

---

## 5. 四份子 PRD（本蓝图的工程可执行分解）

| 文档 | 范围 | 关键交付 |
|---|---|---|
| [V3-Explorer-PRD.md](./V3-Explorer-PRD.md) | 首页 Explorer、筛选/排序、Claim 升级、Compare、/api/explore、AI 引用 | 页面结构、数据模型、API 契约、验收标准 |
| [V3-Graph-PRD.md](./V3-Graph-PRD.md) | 节点/边、graph_edges 表、布局算法、交互、/api/graph | 图数据模型、可视化方案、性能预算 |
| [V3-Programmatic-SEO-PRD.md](./V3-Programmatic-SEO-PRD.md) | Entity SEO、页面类型、Schema.org、自动发布、内链 | Schema 清单、规模目标、抓取预算 |
| [V3-Growth-Engine-PRD.md](./V3-Growth-Engine-PRD.md) | GSC 监控、内容生产引擎、外链、Affiliate、Newsletter、看板 | 增长 SOP、变现层级、指标看板 |

---

## 6. 数据库升级方向（Supabase）

现有 15 张表已覆盖 claims / studies / topics / claim_study_map / evidence_metrics / dose_mappings / population_fits / faqs / products / content_assets 等。
V3 新增重点表：

| 新表 | 用途 | 所属 PRD |
|---|---|---|
| `compare_pages` | Glycine vs Magnesium 等对比页 | Explorer |
| `graph_edges` | Evidence Network 边（from/to/relation/weight） | Graph |
| `interventions` | 干预物实体（glycine、magnesium…） | Graph / SEO |
| `outcomes` | 结局指标实体（sleep latency…） | Graph / SEO |
| `jobs` | Pipeline 任务队列 | Growth |

> 详见各子 PRD 的「数据模型」章节，所有字段对齐现有 `src/lib/types.ts` 的 V2 类型。

---

## 7. API 总览（V3 目标态）

| 端点 | 方法 | 说明 | 子 PRD |
|---|---|---|---|
| `/api/explore` | GET | Explorer 列表（筛选+排序+分页） | Explorer |
| `/api/search` | GET | 全文搜索（已存在，需增强） | Explorer |
| `/api/compare` | GET/POST | 对比页生成与读取 | Explorer |
| `/api/graph/[entity]` | GET | 实体邻接图 JSON | Graph |
| `/api/topic/[slug]` | GET | 主题聚合（已存在 evidence API 演进） | Explorer/SEO |
| `/api/citation/[slug]` | GET | BibTex/RIS/JSON 引用导出 | Explorer |

---

## 8. 自动更新（不变，贯穿四模块）

```
PubMed → Parser → LLM → Supabase → (Explorer / Claim / Compare / Graph 自动刷新)
```

现有 7 个 GitHub Actions Workflow 继续驱动；V3 重点是让新增的 Compare / Graph 也由同一 pipeline 自动产出。

---

## 9. Roadmap（6–12 个月）

| 阶段 | 时间 | 交付 | 文档 |
|---|---|---|---|
| Product Week | Week 2 | Explorer + Compare 重构、Graph PRD | 本蓝图 + Explorer |
| Graph 落地 | Week 3 | Evidence Graph 可视化 | Graph PRD |
| Evidence API | Week 4 | 公开 API + Key 管理 | Growth PRD |
| AI Search | Month 2 | 每 Claim 引用导出、AI 搜索框 | Explorer PRD |
| Public API | Month 3 | 开放生态 | Growth PRD |

---

## 10. 成功标准（Product Week 结束时应达到）

- [ ] 首页形态从「Latest Articles」变为「🔍 Search + Browse Topics + Trending Evidence + Filters」
- [ ] 用户打开网站第一感觉是"这是一个可以搜索医学证据的产品"，而非"健康博客"
- [ ] Compare 页可由任意两个 Claim 自动生成
- [ ] Graph PRD 完成，进入 Week 3 开发
- [ ] 所有新增功能均映射到 4 模块之一

---

*EvidenceHub V3 Master PRD — 2026-07-07*
*基于 V4.0 PRD + 当前代码库（246 claims / 227 studies / 8 topics / 15 Supabase 表）演进*
