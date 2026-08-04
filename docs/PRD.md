# EvidenceHub Sleep — 产品需求文档 (PRD)

> **Version 5.0 · 2026-08-04**
> A database built for humans. An API built for AI.

---

## 1. 产品定位

### 1.1 一句话定义

EvidenceHub Sleep 是一个**睡眠科学证据搜索引擎**——将全球 PubMed 研究文献结构化为可计算的证据图谱，让人类和 AI 在 30 秒内获取**有置信度评分的、可溯源的**科学结论，而非营销内容。

### 1.2 核心问题

| 用户痛点 | 现状 | EvidenceHub 的解法 |
|---|---|---|
| "褪黑素有用吗？" 搜到的全是营销博客 | SEO 内容农场，无法分辨科学性 | 每条结论附置信度评分 + 原始 RCT 引用 |
| "甘氨酸和镁哪个更有效？" 没有对比工具 | 需要自己读多篇论文 | 结构化 Claim Graph，可对比证据强度、剂量、人群 |
| AI 搜索引擎回答健康问题时编造引用 | LLM 幻觉，无法验证 | 提供 AI 可调用的结构化 JSON API，每条数据可溯源到 PubMed |
| 处方安眠药有依赖性，天然平替有哪些？ | 信息碎片化，缺乏科学对比 | 处方药 vs 天然补充剂并排对比表 + 症状决策流 |

### 1.3 价值主张

- **对搜索用户**：不再猜 "studies show" 到底什么意思——每个结论都有 0-100 的证据置信度评分
- **对 AI 系统**：不是爬网页，而是调用结构化 API 获取可计算的证据数据
- **对专业用户**：30 秒内获取某成分的人类 RCT 数量、推荐剂量、适用人群、局限性
- **对健康决策者**：处方药与天然平替的科学对比，而非软文推荐

### 1.4 产品愿景

> **成为 Sleep 领域的 PubMed + Wikipedia + AI Knowledge Layer。**

长期目标：Sleep Knowledge Infrastructure Layer——睡眠科学的知识基础设施层。

---

## 2. 目标用户

### 2.1 用户画像

| 画像 | 描述 | 核心需求 | 典型场景 |
|---|---|---|---|
| **健康搜索者** | 有睡眠问题，在网上搜索补充剂信息的普通用户 | 快速了解"某成分有没有用、怎么吃、安全吗" | Google 搜 "magnesium sleep" → 进入 Topic 页 → 查看 Evidence Score + Dose |
| **Biohacker / 健身爱好者** | 关注睡眠优化、HRV、补剂搭配的高阶用户 | 对比多个成分的证据强度，找到最优组合 | 浏览 Claims Explorer → 按证据强度排序 → 对比 Glycine vs Magnesium |
| **处方药替代者** | 正在使用安眠药，寻找天然平替方案的用户 | 了解处方药与天然补充剂的科学对比 | 进入 /alternatives/ambien → 查看并排对比表 → 跳转到成分证据页 |
| **专业用户** | 医生、营养师、睡眠教练、健身教练 | 快速获取某成分的人类 RCT 数量、推荐剂量、适用人群 | 搜索特定成分 → 查看 Study Evidence 卡片 → 引用 PubMed 原文 |
| **AI 系统** | ChatGPT、Claude、Gemini、Perplexity、AI Agents | 通过 API 获取结构化、可溯源的睡眠科学数据 | 调用 /api/claim/[slug] → 返回 JSON 含 score、rcts、dose、population |
| **开发者 / 健康应用** | 构建健康类 App 的开发者，需要权威数据源 | 免费、结构化、可信赖的睡眠证据 API | 集成 /api/evidence/[topic] → 嵌入自家产品 |

### 2.2 核心使用场景

**场景 1：搜索者验证成分有效性**
> 用户在 Google 搜索 "does glycine help you sleep"，点击进入 EvidenceHub 的 Claim 页面，看到 "Glycine reduces sleep latency" 置信度 91/100，3 项人类 RCT 支持，推荐剂量 3g，适用健康成人。用户据此决定是否尝试。

**场景 2：AI 搜索引擎引用**
> 用户问 Perplexity "What's the evidence for magnesium for sleep?"，AI 通过 API 调用 /api/evidence/magnesium，获取结构化数据并引用 EvidenceHub 作为来源，回答中附带置信度评分和 RCT 数量。

**场景 3：处方药平替研究**
> 用户正在服用 Ambien，担心依赖性。进入 /alternatives/ambien，看到 Ambien 与 Apigenin + Magnesium + L-Theanine 的并排对比表（依赖性、半衰期、副作用），点击天然成分跳转到对应的证据页面查看科学依据。

**场景 4：按症状筛选成分**
> 用户不知道该选什么，进入 /decision，选择"入睡困难"，系统展示 Apigenin、L-Theanine、Magnesium Glycinate、Tart Cherry 四个有证据支持的成分，点击进入详情页。

**场景 5：专业用户查证**
> 营养师需要向客户解释"为什么推荐甘氨酸"，打开 Claim 页面，引用 Study Evidence 卡片中的 RCT 数据（参与者人数、干预剂量、效应量、结果），附 PubMed 链接。

---

## 3. 功能需求

### 3.1 功能全景

```
EvidenceHub Sleep
├── 证据浏览层（面向人类用户）
│   ├── 首页 / Evidence Explorer
│   ├── Claim 详情页（11 模块）
│   ├── Article 阅读页
│   ├── Claims 列表页
│   ├── Topics 主题页
│   ├── Studies 研究列表页
│   ├── Evidence Graph 可视化
│   └── 搜索
├── 决策辅助层
│   ├── Natural Alternatives 目录
│   ├── 处方药平替详情页
│   └── 症状决策流
├── API 层（面向 AI / 开发者）
│   ├── Claim API
│   ├── Evidence API
│   ├── Search API
│   ├── Explore API
│   ├── Graph API
│   └── API 文档页
└── 基础设施层
    ├── RSS Feed
    ├── Sitemap
    ├── 结构化数据 (JSON-LD)
    └── Newsletter 订阅
```

### 3.2 功能模块详细需求

#### F1: 首页 / Evidence Explorer

**目标**：让用户一进入网站就能感受到"这是一个证据数据库，不是博客"。

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F1.1 | Hero 区展示实时统计数据（Claims 数、Studies 数、Topics 数、Human RCTs 数），每个数字可点击跳转 | P0 |
| F1.2 | 展示代表性 Claim 快捷入口（如 "Does melatonin shorten sleep latency?"），引导用户直接进入核心内容 | P0 |
| F1.3 | "Trending Evidence" 板块：展示高置信度 Claim 卡片 | P0 |
| F1.4 | "Fresh Evidence" 板块：展示最近添加的高分 Claim | P1 |
| F1.5 | Evidence Explorer 筛选器：支持按 Topic、Category、Study Type 筛选，按证据强度/最新/更新时间排序，支持关键词搜索 | P0 |
| F1.6 | 分页：每页 12 条，支持上一页/下一页导航 | P0 |
| F1.7 | "Featured Deep Dive" 区块：推荐一篇深度文章 | P1 |
| F1.8 | "Browse Topics" 板块：展示所有主题入口及 Claim 数量 | P0 |
| F1.9 | "Newest Studies" 板块：展示最新 PubMed 论文，可点击跳转 PubMed | P1 |
| F1.10 | Natural Alternatives 引导区块：引导用户进入处方药平替目录 | P1 |

#### F2: Claim 详情页（核心页面）

**目标**：用户在任何 Claim 页面都能在 30 秒内获得完整的科学判断依据。

| 需求 ID | 模块 | 描述 | 优先级 |
|---|---|---|---|
| F2.1 | Claim Summary | 一句话结论 + 摘要 + 分类标签 + 最后更新时间 + RCT/Meta 数量 | P0 |
| F2.2 | Evidence Score | 4 维度星级评分（人类 RCT、Meta-analysis、机制、安全性）+ 综合 Confidence 等级（high/moderate/low） | P0 |
| F2.3 | Study Evidence | 结构化研究卡片列表，每张卡片含：标题、作者、期刊、年份、参与者人数、时长、干预方式、结局指标、效应量、结果描述、PubMed/DOI 链接 | P0 |
| F2.4 | Dose Response | 剂量-效应表，标注 OPTIMAL 推荐剂量 | P0 |
| F2.5 | Mechanism Graph | 箭头流程图展示作用机制链（如：甘氨酸 → NMDA 受体抑制 → 核心体温下降 → 睡眠潜伏期缩短） | P1 |
| F2.6 | Population Fit | 适用人群表（✅ 适用 / ⚠️ 需注意 / ❌ 不适用），含备注 | P0 |
| F2.7 | Limitations | 研究局限性列表（强制存在，不可省略） | P0 |
| F2.8 | FAQ | 可展开的常见问题，AI 搜索引擎友好 | P1 |
| F2.9 | Related Claims | 关联 Claim 卡片，引导用户继续探索 | P1 |
| F2.10 | Products | Affiliate 产品位（仅展示研究中使用过的剂量和剂型，非软文） | P2 |
| F2.11 | References | 参考文献列表，含 PubMed PMID + DOI 可点击链接 | P0 |
| F2.12 | Article 链接 | 提供 "Read as article" 入口，跳转到可读性更强的文章版 | P1 |
| F2.13 | 免责声明 | 每页底部固定显示"非医疗建议"声明 | P0 |

#### F3: Article 阅读页

**目标**：为偏好阅读文章的用户提供 Claim 的可读性版本。

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F3.1 | 将 Claim 数据渲染为长文章格式，适合人类阅读 | P1 |
| F3.2 | 保留所有证据引用和 PubMed 链接 | P0 |
| F3.3 | 输出 Article JSON-LD 结构化数据 | P1 |

#### F4: Claims 列表页

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F4.1 | 按分类（Hormones、Amino Acids、Lifestyle 等）分组展示所有 Claims | P0 |
| F4.2 | 每条 Claim 显示置信度评分、RCT 数、Meta 数、剂量 | P0 |
| F4.3 | 支持排序（证据强度、最新、更新时间） | P1 |

#### F5: Topics 主题页

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F5.1 | Topics 列表页：展示所有主题及 Claim 数量 | P0 |
| F5.2 | Topic 详情页：展示主题描述 + 该主题下所有 Claims | P0 |
| F5.3 | 支持主题层级（父主题 / 子主题） | P2 |

#### F6: Studies 研究列表页

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F6.1 | 展示所有 PubMed 采集的研究论文 | P0 |
| F6.2 | 支持 studyType 筛选（rct / meta / observational / animal） | P0 |
| F6.3 | 每条研究显示标题、期刊、年份、研究类型 | P0 |
| F6.4 | 可点击跳转 PubMed 原文 | P0 |

#### F7: Evidence Graph 可视化

**目标**：让用户直观看到 Claim、Topic、Study 之间的关联关系。

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F7.1 | 交互式力导向图，节点 = Claims / Topics / Studies，边 = 证据关系 | P1 |
| F7.2 | 支持输入实体名称（如 glycine、sleep）作为图中心 | P0 |
| F7.3 | 支持快速切换主题（sleep, nutrition, heart, longevity, sports, mental, metabolic） | P1 |
| F7.4 | 支持调整探索深度（1-3 层） | P1 |

#### F8: Natural Alternatives 目录

**目标**：覆盖 "[drug] + natural alternative" 高意图搜索词，提供处方药与天然补充剂的科学对比。

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F8.1 | 索引页 /alternatives：展示所有处方药平替入口 | P0 |
| F8.2 | 详情页 /alternatives/[slug]：药品事实卡（用途、机制、起效时间、半衰期、风险/副作用） | P0 |
| F8.3 | 并排对比表：处方药 vs 天然成分栈（依赖性、次日残留、反弹失眠、长期安全性等维度） | P0 |
| F8.4 | 天然成分卡：链接到对应 Topic/Claim 证据页 | P0 |
| F8.5 | FAQ 区（FAQPage JSON-LD） | P1 |
| F8.6 | 覆盖目标药品：Ambien, Xanax, Melatonin Alternatives, Benzodiazepines, Lunesta, Huberman Cocktail | P0 |
| F8.7 | 医生免责声明 | P0 |

#### F9: 症状决策流

**目标**：不知道选什么的用户，通过症状自测快速找到有证据支持的成分。

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F9.1 | 提供三种失眠类型选择：入睡困难（Sleep Onset）、夜醒/早醒（Sleep Maintenance）、压力型失眠（Anxiety-induced） | P0 |
| F9.2 | 选择后展示对应有证据支持的成分列表 | P0 |
| F9.3 | 每个成分可点击跳转到证据详情页 | P0 |
| F9.4 | 纯客户端交互，点击即渲染，无需刷新 | P1 |

#### F10: 搜索

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F10.1 | 关键词搜索 Claims（支持成分名、Claim 文本、关键词） | P0 |
| F10.2 | 搜索结果展示置信度评分、剂量、RCT 数 | P0 |
| F10.3 | 支持 limit 参数控制返回数量 | P1 |

#### F11: API（面向 AI / 开发者）

**目标**：让 AI 系统和开发者能直接获取结构化数据，而非爬网页。

| 需求 ID | 端点 | 描述 | 优先级 |
|---|---|---|---|
| F11.1 | `GET /api/claim/[slug]` | 返回单条 Claim 结构化 JSON（score, rcts, dose, population, _links） | P0 |
| F11.2 | `GET /api/evidence/[topic]` | 返回某主题的聚合证据（所有相关 Claims + 研究统计） | P0 |
| F11.3 | `GET /api/search?q=` | 关键词搜索，返回匹配 Claims 列表 | P0 |
| F11.4 | `GET /api/explore` | 多维度筛选 Claims（topic, category, studyType, sort, pagination） | P1 |
| F11.5 | `GET /api/graph/[entity]` | 返回知识图谱的节点和边数据 | P1 |
| F11.6 | API 文档页 /api-docs | 展示所有端点、示例、MCP 路线图 | P0 |
| F11.7 | 响应包含 `_links` 字段 | 支持超媒体/HATEOAS，AI 可 discoverable 调用 | P0 |
| F11.8 | 错误处理 | 404 返回 availableEndpoints，400 返回 example | P0 |
| F11.9 | MCP Server（路线图） | 支持 get_claim, search_evidence, get_dose, compare | P2 |

#### F12: SEO / GEO 基础设施

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F12.1 | 每个页面输出 JSON-LD 结构化数据（Article, FAQ, Breadcrumb, Website, ItemList） | P0 |
| F12.2 | 动态 Sitemap（随数据更新自动扩展） | P0 |
| F12.3 | Robots.txt（允许页面爬取，禁止 /api/） | P0 |
| F12.4 | RSS Feed | P1 |
| F12.5 | OpenGraph + Twitter Card | P0 |
| F12.6 | GEO 优化：每个 Claim 回答 AI 搜索引擎核心问题（Does it work? How strong? Dose? Who? Limitations?） | P0 |

#### F13: 数据自更新（产品能力）

**目标**：数据库不是静态的，而是随新论文发表自动增长和更新。

| 需求 ID | 描述 | 优先级 |
|---|---|---|
| F13.1 | 自动从 PubMed 采集新论文 | P0 |
| F13.2 | AI 从论文摘要提取结构化 Claim | P0 |
| F13.3 | 新论文匹配已有 Claim 时更新证据计数和评分（而非创建重复 Claim） | P0 |
| F13.4 | 矛盾证据被识别时降低评分并更新 Confidence 等级 | P1 |
| F13.5 | 首页统计数据实时反映数据库真实计数 | P0 |

---

## 4. 证据评分体系

### 4.1 评分维度

每条 Claim 基于四个维度评分：

| 维度 | 说明 | 数据来源 |
|---|---|---|
| Human RCT Score | 人类随机对照试验的数量和质量 | PubMed 采集的 RCT 论文 |
| Meta-analysis Score | Meta-analysis / 系统综述的数量 | PubMed 采集的 Meta 论文 |
| Mechanism Score | 作用机制的科学合理性 | AI 从论文摘要提取 |
| Safety Score | 安全性数据（副作用、长期使用） | AI 从论文摘要提取 |

### 4.2 Confidence 等级

| 分数范围 | 等级 | 含义 |
|---|---|---|
| 85-100 | High | 多项人类 RCT + Meta-analysis 支持，机制明确，安全性良好 |
| 65-84 | Moderate | 有一定人类证据但数量或质量不足，或存在矛盾 |
| 0-64 | Low | 证据有限，主要依赖动物实验或观察性研究 |

### 4.3 用户呈现

- 首页/列表页：以数字 + 颜色标签展示综合评分
- Claim 详情页：以 4 维度星级 + 综合 Confidence 等级展示
- API 响应：返回 `evidenceScore` (int) + `confidenceLevel` (enum)

---

## 5. 内容覆盖范围

### 5.1 当前数据规模

| 指标 | 数量 | 说明 |
|---|---|---|
| Claims | 846+ | 结构化证据声明 |
| Studies | 227+ | PubMed 自动采集的研究论文 |
| Topics | 8 | Sleep, Nutrition, Heart, Longevity, Sports, Mental, Metabolic 等 |
| Natural Alternatives | 6 | Ambien, Xanax, Melatonin Alternatives, Benzodiazepines, Lunesta, Huberman Cocktail |

### 5.2 内容增长目标

| 里程碑 | Claims 数 | Studies 数 | 页面数 | 时间线 |
|---|---|---|---|---|
| MVP | 11 | 227 | 30 | ✅ 已达成 |
| Phase 1 | 846+ | 500+ | 100+ | ✅ 已达成 |
| Phase 2 | 2,000+ | 1,500+ | 500+ | Q3 2026 |
| Phase 3 | 5,000+ | 5,000+ | 3,000+ | Q4 2026 |

### 5.3 内容覆盖领域（扩展方向）

- **当前**：睡眠补充剂（Glycine, Magnesium, Melatonin, L-Theanine, Ashwagandha, Apigenin, Tart Cherry 等）
- **近期**：运动与睡眠、光照疗法、CBT-I 行为干预
- **中期**：睡眠与心脏健康、睡眠与代谢、睡眠与长寿
- **长期**：全健康领域的证据图谱

---

## 6. 商业模式

### 6.1 变现层级

| 层级 | 模式 | 目标用户 | 时间线 | 状态 |
|---|---|---|---|---|
| L1 | Affiliate（Amazon, iHerb, 补剂品牌, 可穿戴设备） | 健康搜索者、Biohacker | 短期现金流 | 占位已就绪 |
| L2 | API 付费（B2B Licensing, AI 公司, 健康应用） | AI 系统、开发者 | 核心增长 | MVP 免费，路线图付费 |
| L3 | 订阅（Evidence Dashboard, Weekly Digest, Dose Calculator） | 专业用户、Biohacker | 稳定收入 | 路线图 |
| L4 | 数据资产（Claim Graph, Sleep Evidence Knowledge Base） | 研究机构、药企 | 长期 | 积累中 |

### 6.2 API 定价规划

| 层级 | 价格 | 配额 | 功能 |
|---|---|---|---|
| Free | $0 | 100 requests/day | 全部端点 |
| Pro | $49/月 | 10,000 requests/day | 全部端点 + 优先更新 |
| Enterprise | 定制 | Unlimited + MCP | 全部端点 + MCP Server + 私有部署 |

### 6.3 Affiliate 原则

- **仅展示研究中使用过的产品**：不在证据页面放无关产品广告
- **明确标注**：Affiliate 链接必须标注，不影响证据评级
- **剂量匹配**：推荐产品的剂型/剂量与研究中使用的一致

---

## 7. 竞品分析

| 维度 | EvidenceHub Sleep | Examine.com | PubMed | WebMD / Healthline |
|---|---|---|---|---|
| 数据结构化 | Claim Graph（可计算） | 文章 + 摘要 | 原始论文 | 文章 |
| 证据评分 | 4 维度 + 公式化 | 编辑评级 | 无 | 无 |
| AI 可调用 | REST API + MCP 路线图 | 无 | E-utilities API | 无 |
| 自动更新 | PubMed 自动采集 + AI 提取 | 人工更新 | 原始数据 | 人工更新 |
| 处方药平替对比 | 有（并排对比表） | 无 | 无 | 无 |
| 症状决策流 | 有 | 无 | 无 | 无 |
| 覆盖领域 | 睡眠（扩展中） | 全健康 | 全医学 | 全健康 |
| 免费访问 | 全免费 + 免费 API | 部分付费 | 免费 | 免费 |

**差异化优势**：
1. 结构化 Claim Graph——不是文章，是可计算的知识
2. AI-Ready API——为 AI 搜索引擎时代设计
3. 处方药平替对比——独占 "[drug] + natural alternative" 搜索意图
4. 自动更新——数据随 PubMed 新论文自动增长

---

## 8. 成功指标 (KPIs)

### 8.1 增长指标

| 指标 | 当前 | 目标 (Q3 2026) | 目标 (Q4 2026) |
|---|---|---|---|
| 月活用户 (MAU) | - | 10,000 | 50,000 |
| Claims 数 | 846+ | 2,000+ | 5,000+ |
| Studies 数 | 227+ | 1,500+ | 5,000+ |
| 页面数 | 100+ | 500+ | 3,000+ |
| API 调用/月 | - | 100,000 | 1,000,000 |

### 8.2 SEO 指标

| 指标 | 当前 | 目标 (Q3 2026) |
|---|---|---|
| Google 索引页面 | 54 | 500+ |
| 搜索可见性 (GSC impressions) | - | 100,000/月 |
| AI 搜索引用次数 | - | 1,000/月 |

### 8.3 产品质量指标

| 指标 | 目标 |
|---|---|
| 页面加载时间 (LCP) | < 2.5s |
| API 响应时间 (P95) | < 200ms |
| 数据更新频率 | 每日自动 |
| 证据评分准确率 | 人工抽检 90%+ 合理 |

---

## 9. 非功能性需求

| 类别 | 需求 |
|---|---|
| 性能 | 首页 LCP < 2.5s；API P95 < 200ms；静态生成 + ISR |
| 可用性 | 99.9% uptime；双数据源架构（生产 DB 故障时自动降级到静态数据） |
| SEO | 100% 页面含 JSON-LD；动态 Sitemap；GEO 优化（AI 搜索引擎可引用） |
| 可访问性 | 语义化 HTML；键盘导航；Alt text |
| 移动端 | 响应式设计，移动端优先 |
| 合规 | 免责声明（非医疗建议）；隐私政策；服务条款 |
| 国际化 | 当前英文优先，架构支持多语言扩展 |

---

## 10. 产品路线图

### Phase 1: MVP ✅ 已完成

- [x] Claim Graph 数据模型 + 11 条种子 Claim
- [x] Claim 详情页（11 模块）
- [x] 首页 + Topics + Claims + Studies 列表
- [x] 搜索功能
- [x] 3 个 REST API 端点
- [x] PubMed 自动采集 Pipeline
- [x] JSON-LD 结构化数据 + Sitemap
- [x] Supabase 生产数据库上线

### Phase 2: 增长 ✅ 已完成

- [x] Evidence Explorer（多维度筛选 + 排序 + 分页）
- [x] Evidence Graph 可视化
- [x] Natural Alternatives 目录（6 个处方药平替页）
- [x] 症状决策流
- [x] Article 阅读页
- [x] 846+ Claims（从 11 条增长）
- [x] Explore API + Graph API

### Phase 3: AI-Native 升级（当前重点）

- [ ] AI Claim 提取全链路验证（fetch → AI parse → update claims → revalidate）
- [ ] MCP Server 上线（get_claim, search_evidence, get_dose, compare）
- [ ] API 付费层（Free / Pro / Enterprise）
- [ ] AI 搜索引擎引用追踪（GSC + AI citation monitoring）

### Phase 4: 商业化

- [ ] Affiliate 链接接入（Amazon, iHerb）
- [ ] 订阅系统（Evidence Dashboard, Weekly Digest, Dose Calculator）
- [ ] Podcast 生成（TTS 音频版证据摘要）
- [ ] Infographic 自动生成

### Phase 5: 生态扩展

- [ ] 多领域扩展（从 Sleep 扩展到全健康领域）
- [ ] GraphQL API
- [ ] 社区贡献（研究者提交 Claim）
- [ ] "HealthDir Starter" 模板产品化

---

## 11. 风险与缓解

| 风险 | 影响 | 缓解策略 |
|---|---|---|
| AI 提取的 Claim 不准确 | 误导用户 | 人工抽检 + 保守评分 + 免责声明 |
| PubMed API 限制或变更 | 数据采集中断 | 缓存机制 + 备用数据源（RSS, CrossRef） |
| AI 搜索引擎不引用 | API 无人调用 | GEO 优化 + MCP Server + 主动提交到 AI 平台 |
| 竞品（Examine.com）先发优势 | 流量被截 | 差异化（API + 处方药平替 + 自动更新） |
| 法律风险（健康信息） | 诉讼风险 | 免责声明 + 不做医疗建议 + 保守表述 + 隐私政策/服务条款 |

---

## 12. 相关文档

| 文档 | 说明 |
|---|---|
| [TRD.md](TRD.md) | 技术需求文档（架构、数据库设计、API 规范、部署方案） |
| [FEATURE-TRACKER.md](FEATURE-TRACKER.md) | 功能追踪表 |
| [SEO-PLAYBOOK.md](SEO-PLAYBOOK.md) | SEO 执行手册 |
| [OPERATION-MANUAL.md](OPERATION-MANUAL.md) | 运营手册 |
| [SERVER-DEPLOY.md](SERVER-DEPLOY.md) | 服务器部署指南 |

---

## 附录 A: 术语表

| 术语 | 定义 |
|---|---|
| Claim | 一条可验证的科学声明，如 "Glycine reduces sleep latency" |
| Evidence Score | 证据置信度评分（0-100），基于 RCT 数、Meta 数、机制、安全性 |
| Claim Graph | Claims ↔ Studies ↔ Topics 之间构成的知识图谱 |
| Confidence Level | 评分等级（high / moderate / low） |
| Natural Alternatives | 处方安眠药的天然补充剂平替方案 |
| GEO | Generative Engine Optimization，面向 AI 搜索引擎的优化 |
| MCP | Model Context Protocol，AI Agent 直接查询数据的协议 |
| PubMed | 美国国家医学数据库，论文数据来源 |
| RCT | Randomized Controlled Trial，随机对照试验 |

---

*PRD v5.0 — Updated: 2026-08-04*
*Live: sleep.p1web.site · 846+ claims · 227+ studies · 8 topics*
