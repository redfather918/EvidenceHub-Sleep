# EvidenceHub SEO Playbook v1.0

> **使命**：用 90 天让 EvidenceHub Sleep 从 0 到 1000 自然 UV/月，并产生第一笔 Affiliate 收入。
>
> **使用方式**：这不是一份"读完归档"的文档。它是每日运营手册——每天照着执行、每周复盘、每月迭代。

---

## 目录

1. [北极星指标与每日仪表盘](#1-北极星指标与每日仪表盘)
2. [网站结构与 URL 规范](#2-网站结构与-url-规范)
3. [Claim 页面标准模板](#3-claim-页面标准模板)
4. [技术 SEO 基础审计](#4-技术-seo-基础审计)
5. [Metadata 与结构化数据规范](#5-metadata-与结构化数据规范)
6. [AI 自动内容生产 SOP](#6-ai-自动内容生产-sop)
7. [Programmatic SEO 策略](#7-programmatic-seo-策略)
8. [Search Console 日常 SOP](#8-search-console-日常-sop)
9. [CTR 优化 SOP](#9-ctr-优化-sop)
10. [内链 SOP](#10-内链-sop)
11. [外链 SOP](#11-外链-sop)
12. [每周复盘模板](#12-每周复盘模板)
13. [90 天执行路线图](#13-90-天执行路线图)

---

## 1. 北极星指标与每日仪表盘

### 90 天目标

| 目标 | 指标 | 当前值 |
|------|------|--------|
| 流量 | 自然 UV/月 | 0 → **1000** |
| 收录 | Google Indexed Pages | 0 → **300+** |
| 内容 | 数据库 Claims 数 | 246 → **500+** |
| 商业 | Affiliate 点击/月 | 0 → **50+** |

### 每日 15 分钟仪表盘

每天固定花 15 分钟，只看这 6 个数字：

| 指标 | 来源 | 查看位置 |
|------|------|---------|
| Indexed Pages | Google Search Console | Coverage 报告 |
| Organic Impressions | Google Search Console | Performance 报告 |
| Organic Clicks | Google Search Console | Performance 报告 |
| Top Queries | Google Search Console | Performance → Queries |
| Top Landing Pages | Google Search Console | Performance → Pages |
| Affiliate Clicks | 百度统计 / Affiliate Dashboard | 事件追踪 |

**原则**：数据驱动，不凭感觉优化。数字涨了继续做，数字没动换策略。

---

## 2. 网站结构与 URL 规范

### 当前结构

```
EvidenceHub Sleep (sleep.p1web.site)
├── /                          首页
├── /topics                    主题列表
│   └── /topics/[slug]         主题详情（如 /topics/glycine）
├── /claims                    Claim 列表
│   └── /claim/[slug]          Claim 详情（核心页面）
├── /studies                   研究列表
├── /search                    搜索页
├── /api-docs                  API 文档
├── /sitemap.xml               站点地图
├── /robots.txt                爬虫规则
└── /googlebedb0778fd17ea82.html  GSC 验证
```

### URL 规则

| 规则 | 说明 |
|------|------|
| **永远不要改 URL** | URL 一旦发布就固定，改了 = 丢收录 |
| **全小写** | `/claim/glycine-sleep` ✅，`/Claim/Glycine-Sleep` ❌ |
| **连字符分隔** | `glycine-vs-melatonin` ✅，`glycine_vs_melatonin` ❌ |
| **不含日期** | `/claim/glycine-sleep` ✅，`/claim/2026-07-glycine` ❌ |
| **不含文件扩展名** | `/claim/glycine-sleep` ✅，`/claim/glycine-sleep.html` ❌ |

### 待新增页面类型（Programmatic SEO）

```
/compare/[a]-vs-[b]            对比页面（如 /compare/glycine-vs-melatonin）
/faq/[slug]                    FAQ 专题页（如 /faq/glycine）
/condition/[slug]              条件页面（如 /condition/insomnia）
```

---

## 3. Claim 页面标准模板

每个 Claim 页面 (`/claim/[slug]`) 必须包含以下 11 个区块，按此顺序排列：

| # | 区块 | HTML 标签 | SEO 作用 |
|---|------|----------|---------|
| 1 | Breadcrumb 面包屑 | `<nav>` + BreadcrumbList JSON-LD | 帮助 Google 理解层级 |
| 2 | Claim Summary 标题+摘要 | `<h1>` + `<p>` | 核心关键词 |
| 3 | Evidence Score 证据评分 | `<section><h2>` | 差异化内容 |
| 4 | Study Evidence 研究列表 | `<section><h2><h3>` | 内容深度 |
| 5 | Dose Response 剂量响应 | `<section><h2>` | 长尾关键词 |
| 6 | Mechanism Graph 机制图 | `<section><h2>` | 专业性 |
| 7 | Population Fit 人群适配 | `<section><h2>` | 长尾搜索 |
| 8 | Limitations 局限性 | `<section><h2>` | E-E-A-T 信号 |
| 9 | FAQ 常见问题 | `<section><h2>` + FAQPage JSON-LD | 精选摘要 |
| 10 | Related Claims 相关声明 | `<section><h2>` | 内链 |
| 11 | References 参考文献 | `<section><h2>` | 引用可信度 |

### Title 公式

```
[Claim 文本] | Evidence Score: [分数]/100 | EvidenceHub Sleep
```

**示例**：`Does Glycine Improve Sleep Quality? | Evidence Score: 91/100 | EvidenceHub Sleep`

### Meta Description 公式

```
[Evidence Summary 截取 150-160 字符]. Based on [N] human studies and [M] meta-analyses.
```

**示例**：`Glycine supplementation (3g before bed) significantly improves sleep quality based on 8 human RCTs. Evidence score 91/100. See dose, safety, and mechanisms.`

---

## 4. 技术 SEO 基础审计

### 当前状态（2026-07-07 审计）

| 项目 | 状态 | 说明 |
|------|------|------|
| Sitemap | ✅ 有 | `src/app/sitemap.ts`，包含静态页+全部 Claim+全部 Topic |
| Robots.txt | ✅ 有 | `src/app/robots.ts`，允许 /，禁止 /api/ |
| JSON-LD 结构化数据 | ✅ 部分 | Claim 页有 Article+FAQ+Breadcrumb，首页有 WebSite |
| SSG/ISR | ✅ 有 | `generateStaticParams` + `revalidate: 3600` |
| 语义化 HTML | ✅ 良好 | `<article>` `<header>` `<section>` `<h1>-<h3>` 使用规范 |
| Breadcrumb | ✅ 部分 | Claim 页有，其他页面缺失 |
| 内链 | ✅ 基础 | Related Claims + Footer + Nav |
| 百度统计 | ✅ 已装 | `hm.baidu.com/hm.js?fbff7fe99f69a299db8ea1615cefe66b` |
| GSC 验证文件 | ✅ 已加 | `public/googlebedb0778fd17ea82.html` |
| **域名配置** | ❌ **错误** | 全站使用 `evidencehubsleep.com`，应为 `sleep.p1web.site` |
| **Canonical URL** | ❌ 缺失 | 所有页面无 `canonical` |
| **OG Image** | ❌ 缺失 | 无 Open Graph 图片 |
| **Twitter Card** | ❌ 部分 | 仅 Claim 页有 |
| **Organization JSON-LD** | ❌ 缺失 | 仅有 WebSite schema |
| **ItemList JSON-LD** | ❌ 缺失 | 列表页（Claims/Topics/Studies）无结构化数据 |
| **Google Analytics** | ❌ 缺失 | 仅有百度统计 |

### 需立即修复的问题（P0）

#### P0-1: 域名全局替换

影响文件：
- `src/app/sitemap.ts` — `SITE_URL = "https://evidencehubsleep.com"`
- `src/app/robots.ts` — sitemap URL
- `src/app/layout.tsx` — `metadataBase` + JSON-LD `url`
- `src/lib/seo.ts` — `SITE_URL` + 所有生成的 URL

替换为：`https://sleep.p1web.site`

#### P0-2: 添加 Canonical URL

在所有页面的 metadata 中添加：
```typescript
alternates: {
  canonical: `/claim/${slug}`,
}
```

#### P0-3: 添加 OG Image

创建默认 OG 图片 `public/og-default.png`（1200×630px），在 layout metadata 中引用。

---

## 5. Metadata 与结构化数据规范

### 5.1 全局 Metadata（layout.tsx）

```typescript
export const metadata: Metadata = {
  metadataBase: new URL("https://sleep.p1web.site"),
  title: {
    default: "EvidenceHub Sleep — Evidence-Based Sleep Science",
    template: "%s | EvidenceHub Sleep",
  },
  description: "Evidence-based answers on glycine, magnesium, melatonin and more. Based on human RCTs and meta-analyses. Not marketing — structured, scored, and AI-ready.",
  keywords: ["sleep evidence", "sleep research", "glycine sleep", ...],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "EvidenceHub Sleep",
    description: "Evidence-based sleep science knowledge graph.",
    type: "website",
    siteName: "EvidenceHub Sleep",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};
```

### 5.2 JSON-LD 结构化数据清单

| 页面 | Schema 类型 | 实现位置 |
|------|------------|---------|
| 全站（layout） | `WebSite` + `Organization` | `layout.tsx` |
| 首页 | `WebSite` + `Organization` | `layout.tsx`（已继承） |
| Claim 详情 | `Article` + `FAQPage` + `BreadcrumbList` | `claim/[slug]/page.tsx` ✅ |
| Topic 详情 | `CollectionPage` + `BreadcrumbList` | `topics/[slug]/page.tsx` |
| Claims 列表 | `ItemList` + `BreadcrumbList` | `claims/page.tsx` |
| Topics 列表 | `ItemList` + `BreadcrumbList` | `topics/page.tsx` |
| Studies 列表 | `ItemList` | `studies/page.tsx` |

### 5.3 Organization JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "EvidenceHub Sleep",
  "url": "https://sleep.p1web.site",
  "description": "AI-driven evidence-based sleep knowledge system.",
  "sameAs": []
}
```

### 5.4 CollectionPage JSON-LD（Topic 页面）

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Glycine — Sleep Evidence",
  "url": "https://sleep.p1web.site/topics/glycine",
  "hasPart": [
    { "@type": "Article", "headline": "Glycine improves sleep quality", "url": "..." }
  ]
}
```

---

## 6. AI 自动内容生产 SOP

### 每日 Pipeline 链路

```
GitHub Actions (定时触发)
    │
    ├─ Job 1: fetch-papers     (每天 02:00 北京时间)
    │   └─ PubMed E-utilities 抓取 90 天内新论文
    │
    ├─ Job 2: ai-parse         (每小时整点)
    │   └─ DeepSeek API 提取 Claim + 证据评分 + 写入 Supabase
    │
    └─ Job 3: update-claims    (每小时 :15)
        └─ 去重合并 + 重算 Evidence Score
```

### 每日检查清单

| 检查项 | 查看位置 | 预期 |
|--------|---------|------|
| Pipeline 成功执行 | Supabase `pipeline_runs` 表 | status = success |
| 新 Claim 已写入 | Supabase `claims` 表 | count 增长 |
| FAQ 字段已填充 | Supabase `claims.faq` | 非空 |
| 子评分已填充 | Supabase `claims.human_rct_score` 等 | 0-5 值 |
| Sitemap 已更新 | `https://sleep.p1web.site/sitemap.xml` | 包含新 URL |
| 页面可访问 | 随机抽检新 Claim URL | HTTP 200 |

### 内容质量标准

每条 Claim 必须满足：

- [ ] `claim_text`：20-80 字，包含关键词
- [ ] `summary`：100-300 字，人类可读
- [ ] `evidence_score`：0-100 分
- [ ] `faq`：至少 3 个 Q&A 对
- [ ] `human_rct_score`：0-5
- [ ] `keywords`：至少 5 个
- [ ] 至少关联 1 条 Study

不满足标准的 Claim 不发布到 sitemap（标记为 `draft`）。

---

## 7. Programmatic SEO 策略

### 7.1 Compare 页面

**URL**: `/compare/glycine-vs-melatonin`

**内容模板**：
- H1: `Glycine vs Melatonin for Sleep: Which Works Better?`
- 对比表格（剂量、效果、证据评分、安全性、价格）
- 各自证据摘要
- FAQ（5-8 个对比问题）
- 结论 + 推荐

**生成规则**：从数据库中选取同 Topic 下 evidence_score > 50 的 Claim 两两组合。

### 7.2 FAQ 专题页

**URL**: `/faq/glycine`

**内容模板**：
- H1: `Glycine for Sleep: FAQ`
- 汇总该 Topic 下所有 Claim 的 FAQ
- 按问题类型分组（剂量、安全性、对比、机制）

### 7.3 Condition 页面

**URL**: `/condition/insomnia`

**内容模板**：
- H1: `Evidence-Based Treatments for Insomnia`
- 列出所有与该 condition 相关的 Claim
- 按证据评分排序
- 包含对比表格

### 7.4 Topic Hub 增强

当前 Topic 页面需要增强：
- 添加 `CollectionPage` JSON-LD
- 添加 Breadcrumb
- 添加 FAQ 汇总区块
- 添加 "Compare" 入口
- 添加 "Best for [condition]" 推荐区块

---

## 8. Search Console 日常 SOP

### 每天（5 分钟）

1. 打开 [Google Search Console](https://search.google.com/search-console)
2. 检查 **Performance** 报告：
   - 今日 Impressions vs 昨日
   - 今日 Clicks vs 昨日
   - 新出现的 Query
3. 检查 **Coverage** 报告：
   - 新增 Indexed 页面数
   - 新发现的 Error / Excluded 页面

### 每周（15 分钟）

1. **URL Inspection**：手动检查 3-5 个新 Claim URL 是否被收录
2. **Sitemap**：确认 `sitemap.xml` 状态为 "Success"
3. **修复 404**：查看 Crawl Errors，修复断链
4. **重复 Title 检查**：确保没有两个页面 Title 相同
5. **Mobile Usability**：检查是否有移动端问题

### 每月

1. **Core Web Vitals**：检查 LCP、FID、CLS
2. **Backlinks**：查看外部链接增长
3. **Manual Actions**：确认无人工惩罚

### Sitemap 提交

```
# 在 Google Search Console 中提交：
https://sleep.p1web.site/sitemap.xml
```

---

## 9. CTR 优化 SOP

### 触发条件

当 GSC 显示某页面 **Impression > 100 但 CTR < 2%** 时，启动 CTR 优化。

### 优化步骤

1. **修改 Title**：从描述性改为提问式
   - ❌ `Glycine and Sleep`
   - ✅ `Does Glycine Improve Sleep? Evidence From 8 Human Studies`

2. **修改 Meta Description**：加入数字和行动号召
   - ❌ `Glycine may help with sleep.`
   - ✅ `Glycine (3g before bed) improved sleep quality in 8 RCTs. Evidence score 91/100. See optimal dose, timing, and safety.`

3. **等待 7 天**，观察 CTR 变化
4. 如果 CTR 仍 < 2%，再次迭代

### Title 模板库

| 类型 | 模板 | 示例 |
|------|------|------|
| 提问式 | `Does [X] Improve [Y]? Evidence From [N] Studies` | `Does Glycine Improve Sleep? Evidence From 8 Human Studies` |
| 数据式 | `[X] for [Y]: Dose, Safety & Evidence Score [N]/100` | `Magnesium for Sleep: Dose, Safety & Evidence Score 84/100` |
| 对比式 | `[X] vs [Y] for [Z]: Which Is Better?` | `Glycine vs Melatonin for Sleep: Which Works Better?` |
| 指南式 | `[X] for Sleep: Complete Evidence Guide ([N] Studies)` | `Ashwagandha for Sleep: Complete Evidence Guide (12 Studies)` |

---

## 10. 内链 SOP

### 每页内链标准

| 页面类型 | 最低内链数 | 链接去向 |
|---------|-----------|---------|
| Claim 详情 | 10 | 所属 Topic + 5-10 Related Claims + Compare 页 + FAQ 页 |
| Topic 详情 | 8 | 所有下属 Claims + Compare 页 + Related Topics |
| 列表页 | 5+ | 各 Claim/Topic 详情 + 首页 + 相关列表页 |
| 首页 | 15+ | Trending Claims + All Topics + Latest Claims |

### 内链锚文本规则

- ❌ 不要用 "click here" / "learn more"
- ✅ 用关键词作锚文本：`<Link href="/claim/glycine-sleep">glycine for sleep</Link>`
- ✅ 自然语言锚文本：`<Link href="/compare/glycine-vs-melatonin">compare glycine vs melatonin</Link>`

### 内链位置规则

| 位置 | 类型 | 示例 |
|------|------|------|
| 页面顶部 | Breadcrumb | Home > Claims > Glycine |
| 内容中间 | 上下文链接 | "similar to [melatonin]" → 链接到 melatonin claim |
| 页面底部 | Related Claims | 5-10 个相关 Claim 卡片 |
| Footer | 全局导航 | Topics / Claims / Search |

---

## 11. 外链 SOP

### 原则

**讨论研究，不推广网站。** 在社区里建立专业形象，流量自然来。

### 每日外链任务

| 平台 | 频率 | 内容 | 策略 |
|------|------|------|------|
| Reddit | 每天 5 条 | 研究摘要 + 见解 | r/sleep, r/Nootropics, r/Supplements |
| X (Twitter) | 每天 1 条 | 研究摘要 + 数据图表 | 标签 #SleepScience #EvidenceBased |
| LinkedIn | 每周 2 次 | 长文研究解读 | 专业人群 |

### Reddit 发帖模板

```
标题：[Study] Glycine supplementation (3g) improved sleep quality in 8 RCTs

内容：
A 2024 meta-analysis found that 3g of glycine before bed significantly 
reduced sleep onset latency and improved subjective sleep quality.

Key findings:
- 8 human RCTs, 524 participants total
- Effect size: medium (d=0.45)
- No serious adverse effects reported

Source: PMID 12345678 (PubMed)

(This is from a project where I'm building an evidence database for 
sleep interventions — happy to share more data if useful.)
```

### 外链追踪

在百度统计/GA 中设置 UTM 追踪：
```
?utm_source=reddit&utm_medium=social&utm_campaign=evidencehub
```

---

## 12. 每周复盘模板

每周固定时间（建议周日晚），回答以下 5 个问题：

### 复盘问题

1. **哪些 Query 增长最快？**
   - 记录 Top 5 增长 Query
   - 分析：为什么涨？是新内容？还是季节性？

2. **哪些页面开始有点击？**
   - 记录 Top 5 新增点击页面
   - 分析：这些页面的共同特征是什么？

3. **哪些页面一直没有收录？**
   - 列出未收录页面
   - 检查：内容质量？内链？技术问题？

4. **哪些 Topic 值得扩展？**
   - 查看搜索 Query 中出现但网站还没覆盖的主题
   - 决定下周 Pipeline 是否调整搜索词

5. **哪些页面需要补充 FAQ？**
   - 查看 GSC 中被展示但 CTR 低的页面
   - 补充 FAQ 以争取精选摘要

### 周报格式

```markdown
## Week [N] 复盘 — [日期]

### 数据
- Indexed Pages: [N] (+[Δ] vs上周)
- Impressions: [N] (+[Δ])
- Clicks: [N] (+[Δ])
- Avg CTR: [N]%
- Avg Position: [N]

### 本周亮点
- [亮点1]
- [亮点2]

### 下周任务
- [ ] 任务1
- [ ] 任务2
- [ ] 任务3
```

---

## 13. 90 天执行路线图

### Phase 1: 基础建设（Day 1-30）

**目标**：500+ 页面、100+ 收录、技术 SEO 零错误

| 周 | 重点任务 | KPI |
|----|---------|-----|
| W1 | 域名替换、Canonical、OG Image、Organization JSON-LD | 技术 SEO 审计通过 |
| W2 | 列表页 JSON-LD、Breadcrumb 全站覆盖、Sitemap 提交 GSC | GSC Sitemap = Success |
| W3 | Claim 页面内容质量审计、补 FAQ、补 Keywords | 500+ Claim 页面可索引 |
| W4 | Google Analytics 安装、Search Console 日常监控建立 | 100+ Indexed Pages |

### Phase 2: 增长加速（Day 31-60）

**目标**：1000+ 页面、稳定自然点击、Compare/FAQ 页面上线

| 周 | 重点任务 | KPI |
|----|---------|-----|
| W5 | Compare 页面开发上线（前 20 对） | 20+ Compare 页面 |
| W6 | FAQ 专题页开发上线 | 50+ FAQ 页面 |
| W7 | CTR 优化（第一批低 CTR 页面） | Avg CTR > 3% |
| W8 | 内链审计、补内链、锚文本优化 | 每页 10+ 内链 |

### Phase 3: 商业化（Day 61-90）

**目标**：第一批稳定自然流量、第一笔 Affiliate 收入

| 周 | 重点任务 | KPI |
|----|---------|-----|
| W9 | Affiliate 链接接入（Amazon Associates 等） | Product 区块上线 |
| W10 | Reddit/X 外链策略执行 | 50+ 外链 |
| W11 | Newsletter 订阅功能 | 100+ 订阅者 |
| W12 | 90 天复盘 + v2.0 Playbook | 1000 UV/月 |

---

## 附录 A: 环境变量参考

```bash
# 域名（必须正确）
NEXT_PUBLIC_SITE_URL="https://sleep.p1web.site"

# AI Pipeline
AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY="sk-xxx"
PIPELINE_DRY_RUN="false"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJxxx"

# Cron 鉴权
CRON_SECRET="随机字符串"

# Analytics
NEXT_PUBLIC_BAIDU_TONGJI="fbff7fe99f69a299db8ea1615cefe66b"
NEXT_PUBLIC_GA_ID="G-XXXXXXX"  # 待添加
```

## 附录 B: GitHub Secrets 参考

```
EVIDENCEHUB_BASE_URL = https://sleep.p1web.site
CRON_SECRET = 与服务器 .env 中相同的值
```

## 附录 C: 关键文件索引

| 文件 | 用途 |
|------|------|
| `src/app/layout.tsx` | 全局 Metadata + JSON-LD + 百度统计 |
| `src/app/sitemap.ts` | Sitemap 生成 |
| `src/app/robots.ts` | Robots.txt |
| `src/lib/seo.ts` | SEO Helper 函数（JSON-LD、Metadata 生成） |
| `src/app/claim/[slug]/page.tsx` | Claim 详情页（核心 SEO 页面） |
| `src/app/topics/[slug]/page.tsx` | Topic 详情页 |
| `src/app/claims/page.tsx` | Claims 列表页 |
| `src/app/topics/page.tsx` | Topics 列表页 |
| `src/app/studies/page.tsx` | Studies 列表页 |
| `src/app/page.tsx` | 首页 |
| `.github/workflows/scheduler-*.yml` | GitHub Actions 定时任务 |

---

*Document Version: 1.0*
*Created: 2026-07-07*
*Next Review: 2026-07-14*
*Owner: EvidenceHub Team*
