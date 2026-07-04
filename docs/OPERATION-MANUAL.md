# EvidenceHub Sleep — 产品操作手册 v1.1

> **面向产品运营、内容编辑和开发者的完整操作指南**

---

## 目录

1. [快速开始](#1-快速开始)
2. [系统概览](#2-系统概览)
3. [本地环境搭建](#3-本地环境搭建)
4. [内容管理](#4-内容管理)
5. [数据库操作](#5-数据库操作)
6. [API 使用指南](#6-api-使用指南)
7. [SEO 与 GEO 优化](#7-seo-与-geo-优化)
8. [部署指南](#8-部署指南)
9. [日常运维](#9-日常运维)
10. [故障排查](#10-故障排查)
11. [内容编辑规范](#11-内容编辑规范)

---

## 1. 快速开始

### 1.1 前置要求

| 要求 | 最低版本 | 推荐版本 |
|---|---|---|
| Node.js | 18.17.0 | 20+ |
| npm | 9 | 10+ |
| Git | 2.30 | 最新 |

### 1.2 五分钟启动

```bash
# 1. 克隆仓库
git clone https://github.com/redfather918/EvidenceHub-Sleep.git
cd EvidenceHub-Sleep

# 2. 安装依赖
npm install

# 3. 生成 Prisma Client
npx prisma generate

# 4. 创建数据库 + 推送 Schema
npm run db:push

# 5. 种子数据
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

打开浏览器访问 http://localhost:3000

### 1.3 验证安装

| 检查项 | 预期结果 |
|---|---|
| 首页 http://localhost:3000 | 显示搜索栏 + Trending Claims + Topics |
| Claims 页面 /claims | 显示 11 个 Claims，按分类分组 |
| Claim 详情 /claim/glycine-sleep-latency | 显示完整证据图谱（11 个模块） |
| API /api/claim/glycine-sleep-latency | 返回 JSON 数据 |
| 搜索 /search?q=melatonin | 显示 melatonin 相关 Claims |

---

## 2. 系统概览

### 2.1 产品架构

EvidenceHub Sleep 由三层组成：

```
L1: 用户网站（前端页面）
    ↓
L2: 知识结构层（Claim Graph — 核心数据）
    ↓
L3: API / AI 层（REST API）
```

### 2.2 核心概念

| 概念 | 说明 |
|---|---|
| **Claim** | 一个结构化的科学结论（如"Glycine reduces sleep latency"） |
| **Study** | 一项科学研究（含 PubMed 引用、样本量、效应量等） |
| **Topic** | 主题分类（如 Glycine, Magnesium, Melatonin） |
| **EvidenceLink** | Claim 与 Study 之间的关联（含证据强度 1-5） |
| **DoseMapping** | 剂量-效应关系（标注最优剂量） |
| **PopulationFit** | 人群适配度（✅适用 / ⚠️需注意 / ❌不推荐） |
| **Evidence Score** | 0-100 综合评分（基于 RCT、Meta、机制、安全性） |

### 2.3 当前数据规模

| 数据 | 数量 |
|---|---|
| Claims | 11 |
| Studies | 15 |
| Topics | 8 |
| Dose Mappings | 30+ |
| Population Fits | 45+ |
| 页面总数 | 30 |

---

## 3. 本地环境搭建

### 3.1 环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

MVP 阶段使用 SQLite，默认配置即可运行。无需额外数据库。

### 3.2 开发命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器 (热更新) |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 代码检查 |
| `npm run db:push` | 推送 Prisma Schema 到数据库 |
| `npm run db:seed` | 种子数据库 |
| `npm run db:studio` | 打开 Prisma Studio (数据库 GUI) |

### 3.3 Prisma Studio

Prisma Studio 是一个可视化数据库管理界面：

```bash
npm run db:studio
```

在浏览器中打开 http://localhost:5555，可以：
- 查看所有表的数据
- 编辑记录
- 删除记录
- 过滤和搜索

---

## 4. 内容管理

### 4.1 添加新 Claim

**方式一：编辑静态数据文件（推荐用于 MVP）**

编辑 `src/data/seed-data.ts`：

1. **在 `studies` 对象中添加新研究**（如果需要）：

```typescript
"s-new-study": {
  id: "s-new-study",
  pmid: "12345678",
  doi: "10.1234/example",
  title: "Study title here",
  journal: "Journal Name",
  authors: "Author A, et al.",
  year: 2025,
  sampleSize: 100,
  duration: "8 weeks",
  intervention: "500mg compound X",
  outcome: "Sleep quality (PSQI)",
  effectSize: "d=0.65",
  result: "Significant improvement in sleep quality.",
  studyType: "rct",
  population: "Adults with insomnia",
  url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
  strength: 4,
},
```

2. **在 `claims` 数组中添加新 Claim**：

```typescript
{
  id: "c-new-claim",
  slug: "compound-x-sleep-quality",
  text: "Compound X improves sleep quality in adults with insomnia",
  summary: "A summary of the evidence...",
  category: "Herbs", // Amino Acids | Minerals | Hormones | Foods | Herbs | Flavonoids | Lifestyle
  topicSlug: "compound-x", // 必须匹配 topics 中的 slug
  evidenceScore: 82,
  humanRctScore: 4,
  metaScore: 3,
  mechanismScore: 4,
  safetyScore: 4,
  confidence: "moderate", // high | moderate | low
  rctCount: 2,
  metaCount: 1,
  studyCount: 3,
  dose: "500mg",
  population: ["Adults with insomnia"],
  limitations: ["Small sample size", "Short duration"],
  mechanism: ["Compound X", "Pathway A", "Pathway B", "Result"],
  faq: [
    { q: "Does it work?", a: "Answer here..." },
    { q: "What is the dose?", a: "500mg daily..." },
  ],
  relatedSlugs: ["other-claim-slug"],
  keywords: ["compound x", "sleep", "insomnia"],
  lastUpdated: "2026-07-04T00:00:00Z",
  createdAt: "2026-07-04T00:00:00Z",
},
```

3. **在 `claimStudies` 中添加研究关联**：

```typescript
"compound-x-sleep-quality": ["s-new-study", "s-existing-study"],
```

4. **在 `doseMappings` 中添加剂量数据**：

```typescript
"compound-x-sleep-quality": [
  { compound: "Compound X", doseRange: "250mg", effect: "Mild effect", optimal: false },
  { compound: "Compound X", doseRange: "500mg", effect: "Optimal dose", optimal: true },
],
```

5. **在 `populationFits` 中添加人群数据**：

```typescript
"compound-x-sleep-quality": [
  { group: "Adults with insomnia", fit: "yes", note: "Strong evidence" },
  { group: "Pregnant women", fit: "no", note: "Not recommended" },
],
```

6. **如果是新主题，在 `topics` 数组中添加**：

```typescript
{
  id: "t-compound-x",
  slug: "compound-x",
  name: "Compound X",
  description: "Description of the compound.",
  icon: "herb",
  claimCount: 1,
},
```

7. **重新构建并验证**：

```bash
npm run build
npm run dev
```

**方式二：通过 Prisma Studio**

```bash
npm run db:push   # 确保数据库已创建
npm run db:seed   # 种子初始数据
npm run db:studio # 打开 GUI 编辑
```

### 4.2 编辑现有 Claim

直接修改 `src/data/seed-data.ts` 中对应的 Claim 对象，然后重新构建。

### 4.3 添加新主题

在 `topics` 数组中添加新主题，确保 `slug` 唯一。然后在相关 Claim 中设置 `topicSlug` 为新主题的 slug。

### 4.4 更新统计数据

添加新 Claim 后，更新以下位置：
1. `topics` 数组中的 `claimCount`
2. 首页 `src/app/page.tsx` 中的统计数字（Claims / Studies / Topics / Human RCTs）

---

## 5. 数据库操作

### 5.1 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 创建数据库并推送 Schema
npm run db:push

# 种子数据
npm run db:seed
```

### 5.2 重置数据库

```bash
# 删除数据库文件
rm prisma/dev.db  # Linux/macOS
del prisma\dev.db  # Windows

# 重新创建
npm run db:push
npm run db:seed
```

### 5.3 修改 Schema

1. 编辑 `prisma/schema.prisma`
2. 推送更改：`npm run db:push`
3. 更新种子脚本（如需要）
4. 重新种子：`npm run db:seed`

### 5.4 数据库备份

```bash
# 备份 SQLite 数据库
cp prisma/dev.db prisma/dev.db.backup

# 或使用 Prisma Studio 导出数据
```

---

## 6. API 使用指南

### 6.1 Claim API

获取单个 Claim 的结构化数据。

```
GET /api/claim/{slug}
```

**示例：**
```bash
curl http://localhost:3000/api/claim/glycine-sleep-latency
```

**可用 Slugs：**

| Slug | Claim |
|---|---|
| glycine-sleep-latency | Glycine reduces sleep latency |
| glycine-sleep-quality | Glycine improves sleep quality |
| magnesium-sleep-quality | Magnesium improves sleep quality |
| magnesium-deep-sleep | Magnesium increases deep sleep |
| melatonin-sleep-latency | Melatonin reduces sleep latency |
| melatonin-circadian | Melatonin shifts circadian rhythm |
| tart-cherry-sleep-quality | Tart cherry improves sleep |
| theanine-sleep-quality | L-Theanine improves sleep quality |
| ashwagandha-sleep-quality | Ashwagandha improves sleep |
| apigenin-sleep-onset | Apigenin promotes sleep onset |
| exercise-sleep-quality | Exercise improves sleep |

### 6.2 Evidence API

获取主题级别的汇总证据。

```
GET /api/evidence/{topic}
```

**可用 Topics：** glycine, magnesium, melatonin, tart-cherry, theanine, ashwagandha, apigenin, exercise

**示例：**
```bash
curl http://localhost:3000/api/evidence/magnesium
```

### 6.3 Search API

搜索 Claims。

```
GET /api/search?q={query}&limit={limit}
```

**示例：**
```bash
curl "http://localhost:3000/api/search?q=glycine&limit=5"
```

搜索范围：Claim 文本、摘要、关键词、分类。

### 6.4 AI 集成示例

**ChatGPT / Claude 工具调用：**

```
用户问: "Does glycine help with sleep?"

AI 调用: GET /api/claim/glycine-sleep-latency
AI 回答: "Yes, glycine (3g before bed) reduces sleep latency 
         with an evidence score of 91/100 (high confidence), 
         based on 3 human RCTs."
```

---

## 7. SEO 与 GEO 优化

### 7.1 自动生成的 SEO 元素

每个 Claim 页面自动生成：

| 元素 | 说明 |
|---|---|
| Article Schema (JSON-LD) | 标识为医学文章，含研究引用 |
| FAQ Schema (JSON-LD) | FAQ 结构化数据，对 AI 搜索关键 |
| Breadcrumb Schema (JSON-LD) | 面包屑导航 |
| OpenGraph | 社交分享卡片 |
| Twitter Card | Twitter 分享卡片 |
| Meta keywords | 每页独立关键词 |
| Sitemap entry | 自动加入 sitemap.xml |

### 7.2 验证 SEO

1. **Google Rich Results Test**: 
   - 访问 https://search.google.com/test/rich-results
   - 输入 Claim 页面 URL
   - 验证 Article + FAQ Schema 是否被识别

2. **Schema.org Validator**:
   - 访问 https://validator.schema.org/
   - 输入页面 URL 验证结构化数据

3. **Sitemap 验证**:
   - 访问 http://localhost:3000/sitemap.xml
   - 确认所有 Claim 和 Topic URL 已包含

### 7.3 GEO（AI 搜索引擎优化）

每个 Claim 页面回答 AI 搜索的 5 个核心问题：
1. Does it work? → Claim Summary + Evidence Score
2. How strong is evidence? → Evidence Score Badge (4 维度)
3. What is the dose? → Dose Response 模块
4. Who benefits? → Population Fit 模块
5. Limitations? → Limitations 模块（强制存在）

---

## 8. 部署指南

### 8.1 部署到 Vercel

1. **推送代码到 GitHub**

2. **在 Vercel 导入项目**
   - 访问 https://vercel.com/new
   - 选择 GitHub 仓库
   - Framework Preset: Next.js

3. **配置环境变量**
   ```
   DATABASE_URL=file:./dev.db  (MVP)
   # 或使用 PostgreSQL:
   # DATABASE_URL=postgresql://...
   ```

4. **部署**

5. **初始化数据库**（通过 Vercel CLI）
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   
   # 推送 Schema
   vercel env pull .env
   npx prisma db push
   
   # 种子数据
   npx prisma db seed
   ```

### 8.2 自定义域名

在 Vercel 项目设置中添加自定义域名，然后更新以下文件中的 URL：
- `src/lib/seo.ts` → `SITE_URL`
- `src/app/sitemap.ts` → `SITE_URL`
- `src/app/robots.ts` → sitemap URL
- `src/app/layout.tsx` → `metadataBase`

### 8.3 生产环境注意事项

- 使用 PostgreSQL 替代 SQLite
- 配置 Rate Limiting
- 启用 Vercel Analytics
- 配置自定义域名
- 提交 sitemap 到 Google Search Console

---

## 9. 日常运维

### 9.1 每日内容更新工作流（核心操作）

这是每天添加新研究/Claim 的标准流程，按步骤执行：

```
步骤 1: 研究论文 → 确认有 PubMed 引用
步骤 2: 提取数据 → 样本量、剂量、效应量、结果
步骤 3: 编辑 seed-data.ts → 添加 Study + Claim + Dose + Population
步骤 4: 更新 Topic claimCount
步骤 5: 更新首页统计数字
步骤 6: npm run build → 验证编译
步骤 7: npm run dev → 验证页面
步骤 8: 提交代码 → git commit + push
```

#### 步骤 1：研究论文

1. 在 PubMed (https://pubmed.ncbi.nlm.nih.gov/) 搜索睡眠相关研究
2. 确认论文类型：RCT > Meta-analysis > Observational > Animal
3. 记录关键信息：
   - PMID（PubMed ID）
   - DOI
   - 标题、期刊、作者、年份
   - 样本量、研究时长
   - 干预方式（含剂量）
   - 结局指标
   - 效应量（如 d=0.65）
   - 结果描述

#### 步骤 2：提取 Claim

从论文中提取一个可验证的结论陈述：
- 格式：「[化合物] [动词] [效果] in [人群]」
- 示例：「Glycine reduces sleep latency in human RCTs」
- 长度：不超过 120 字符

同时提取：
- Summary（2-3 句话，含关键数字）
- Evidence Score（0-100，参考下方评分标准）
- Dose（推荐剂量）
- Population（适用人群）
- Limitations（至少 2 条研究局限）
- Mechanism（从化合物到效果的因果链）
- FAQ（3-4 个 AI 搜索可能的问题）

**Evidence Score 评分参考：**

| 分数 | 条件 | 置信度 |
|---|---|---|
| 90-100 | 多项高质量 RCT + Meta-analysis + 明确机制 | high |
| 80-89 | 2+ RCT + 部分机制阐明 | high/moderate |
| 70-79 | 1 RCT 或以观察性研究为主 | moderate |
| 60-69 | 主要为临床前/动物研究 | low |
| <60 | 证据极有限 | low |

#### 步骤 3：编辑 seed-data.ts

打开 `src/data/seed-data.ts`，按以下顺序添加数据：

**3a. 添加新 Study**（在 `studies` 对象中）：

```typescript
"s-new-study": {
  id: "s-new-study",
  pmid: "12345678",
  doi: "10.1234/example",
  title: "Study title here",
  journal: "Journal Name",
  authors: "Author A, et al.",
  year: 2025,
  sampleSize: 100,
  duration: "8 weeks",
  intervention: "500mg compound X",
  outcome: "Sleep quality (PSQI)",
  effectSize: "d=0.65",
  result: "Significant improvement in sleep quality.",
  studyType: "rct",
  population: "Adults with insomnia",
  url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
  strength: 4,
},
```

**3b. 添加新 Claim**（在 `claims` 数组中）：

```typescript
{
  id: "c-new-claim",
  slug: "compound-x-sleep-quality",
  text: "Compound X improves sleep quality in adults with insomnia",
  summary: "A summary of the evidence...",
  category: "Herbs",
  topicSlug: "compound-x",
  evidenceScore: 82,
  humanRctScore: 4,
  metaScore: 3,
  mechanismScore: 4,
  safetyScore: 4,
  confidence: "moderate",
  rctCount: 2,
  metaCount: 1,
  studyCount: 3,
  dose: "500mg",
  population: ["Adults with insomnia"],
  limitations: ["Small sample size", "Short duration"],
  mechanism: ["Compound X", "Pathway A", "Pathway B", "Result"],
  faq: [
    { q: "Does it work?", a: "Answer here..." },
    { q: "What is the dose?", a: "500mg daily..." },
  ],
  relatedSlugs: ["other-claim-slug"],
  keywords: ["compound x", "sleep", "insomnia"],
  lastUpdated: "2026-07-04T00:00:00Z",
  createdAt: "2026-07-04T00:00:00Z",
},
```

**3c. 添加研究关联**（在 `claimStudies` 对象中）：

```typescript
"compound-x-sleep-quality": ["s-new-study", "s-existing-study"],
```

**3d. 添加剂量数据**（在 `doseMappings` 对象中）：

```typescript
"compound-x-sleep-quality": [
  { compound: "Compound X", doseRange: "250mg", effect: "Mild effect", optimal: false },
  { compound: "Compound X", doseRange: "500mg", effect: "Optimal dose", optimal: true },
],
```

**3e. 添加人群数据**（在 `populationFits` 对象中）：

```typescript
"compound-x-sleep-quality": [
  { group: "Adults with insomnia", fit: "yes", note: "Strong evidence" },
  { group: "Pregnant women", fit: "no", note: "Not recommended" },
],
```

**3f. 添加新主题**（如果是新化合物，在 `topics` 数组中）：

```typescript
{
  id: "t-compound-x",
  slug: "compound-x",
  name: "Compound X",
  description: "Description of the compound.",
  icon: "herb",
  claimCount: 1,
},
```

#### 步骤 4：更新 Topic claimCount

如果添加了新 Claim 到已有主题，更新 `topics` 数组中对应主题的 `claimCount`。

#### 步骤 5：更新首页统计

打开 `src/app/page.tsx`，更新统计栏中的数字：

```typescript
const stats = {
  claims: 12,      // 更新为新的 Claim 总数
  studies: 16,     // 更新为新的 Study 总数
  topics: 8,       // 如果添加了新主题则更新
  rcts: 28,        // 更新为 RCT 总数
};
```

#### 步骤 6：构建验证

```bash
npm run build
```

确认输出：
- ✅ Compiled successfully
- ✅ Generating static pages (31/31) — 页面数应增加
- 无 TypeScript 错误

#### 步骤 7：本地验证

```bash
npm run dev
```

打开浏览器验证：
1. 访问 `/claims` — 确认新 Claim 出现在列表中
2. 访问 `/claim/compound-x-sleep-quality` — 确认 11 个模块完整渲染
3. 访问 `/api/claim/compound-x-sleep-quality` — 确认 API 返回 JSON
4. 搜索新关键词 — 确认搜索功能正常

#### 步骤 8：提交代码

```bash
git add -A
git commit -m "feat: add compound-x sleep quality claim with 1 new study"
git push origin main
```

### 9.2 快速添加 Study 到已有 Claim

如果新论文支持已有 Claim（不需要新建 Claim），只需：

1. 在 `studies` 对象中添加新 Study
2. 在 `claimStudies` 中将新 Study ID 添加到已有 Claim 的数组
3. 更新 Claim 的 `rctCount` / `metaCount` / `studyCount`
4. 更新 Claim 的 `lastUpdated` 时间戳
5. 如有必要，更新 `evidenceScore`
6. `npm run build && npm run dev` 验证
7. `git commit -m "feat: add new study to glycine-sleep-latency claim"`

### 9.3 更新已有 Claim 数据

直接修改 `src/data/seed-data.ts` 中对应 Claim 的字段，然后：

```bash
npm run build
npm run dev
git add -A
git commit -m "update: refine evidence score for melatonin-circadian claim"
git push origin main
```

### 9.4 定期检查清单

| 检查项 | 频率 | 方法 |
|---|---|---|
| 构建是否通过 | 每次修改后 | `npm run build` |
| API 是否正常 | 每周 | curl 测试 3 个端点 |
| Sitemap 是否完整 | 每月 | 访问 /sitemap.xml |
| 链接是否有效 | 每月 | 手动检查 PubMed/DOI 链接 |
| SEO Schema 验证 | 每月 | Google Rich Results Test |
| 数据库备份 | 每月 | cp dev.db dev.db.backup |

### 9.5 性能监控

- Vercel Analytics（部署后自动启用）
- Google PageSpeed Insights
- Core Web Vitals（LCP, FID, CLS）

---

## 10. 故障排查

### 10.1 常见问题

#### 问题：`npm run dev` 启动失败

**原因**：依赖未安装或版本不兼容。

**解决**：
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 问题：Prisma 报错 "Cannot find module @prisma/client"

**解决**：
```bash
npx prisma generate
```

#### 问题：数据库种子失败

**原因**：数据库未创建或 Schema 未推送。

**解决**：
```bash
npm run db:push
npm run db:seed
```

#### 问题：构建失败 — TypeScript 错误

**原因**：类型不匹配。

**解决**：
```bash
# 查看详细错误
npx tsc --noEmit
```
根据错误信息修复代码。

#### 问题：Claim 页面 404

**原因**：slug 不存在于 seed-data.ts 中。

**解决**：确认 `claims` 数组中包含对应 slug 的 Claim，且 `generateStaticParams` 能正确返回。

#### 问题：Related Claims 不显示

**原因**：`relatedSlugs` 引用了不存在的 slug。

**解决**：确认所有 `relatedSlugs` 中的 slug 都在 `claims` 数组中存在。

### 10.2 日志查看

开发模式下的错误会直接在终端和浏览器控制台显示。生产模式下查看 Vercel 日志：

```bash
vercel logs [deployment-url]
```

---

## 11. 内容编辑规范

### 11.1 Claim 编写规范

| 字段 | 规范 |
|---|---|
| `text` | 简洁、可验证的陈述句。不超过 120 字符。 |
| `summary` | 2-3 句话概括证据。包含关键数字（样本量、效应量）。 |
| `category` | 使用已有分类：Amino Acids, Minerals, Hormones, Foods, Herbs, Flavonoids, Lifestyle |
| `evidenceScore` | 0-100。≥85 = high, 70-84 = moderate, <70 = low |
| `confidence` | 与 evidenceScore 对应：≥85 = high, 70-84 = moderate, <70 = low |
| `dose` | 使用研究中验证的剂量，格式如 "3g", "500mg", "0.5mg" |
| `limitations` | 必须至少 2 条，诚实反映研究局限 |
| `mechanism` | 从化合物到最终效果的因果链，每步一个数组元素 |
| `faq` | 3-4 个问答，回答 AI 搜索可能的问题 |

### 11.2 Study 编写规范

| 字段 | 规范 |
|---|---|
| `pmid` | PubMed ID（如有），用于自动生成 PubMed 链接 |
| `doi` | DOI（如有），用于自动生成 DOI 链接 |
| `title` | 完整研究标题 |
| `journal` | 期刊全名 |
| `authors` | 第一作者 + "et al."（如有多位） |
| `year` | 发表年份 |
| `sampleSize` | 总样本量（如为 Meta-analysis，写总参与者数） |
| `duration` | 研究持续时间（如 "8 weeks", "4 nights"） |
| `intervention` | 干预方式，含剂量（如 "3g glycine before bed"） |
| `outcome` | 测量的结局指标（如 "PSQI, sleep latency"） |
| `effectSize` | 效应量（如 "d=0.73"），无则填 "N/A" |
| `result` | 1-2 句话描述结果，包含显著性 |
| `studyType` | rct / meta / observational / animal |
| `strength` | 证据强度 1-5（5 = 高质量大样本 RCT） |

### 11.3 Dose Mapping 编写规范

每个 Claim 至少 2 个剂量条目：
- 一个标注 `optimal: true`（最优剂量）
- 其他标注 `optimal: false`

格式：
```typescript
{ compound: "Glycine", doseRange: "3g", effect: "描述该剂量的效果", optimal: true }
```

### 11.4 Population Fit 编写规范

每个 Claim 至少 3 个人群条目。

`fit` 值：
- `"yes"` — 有证据支持对该人群有效（显示 ✅）
- `"check"` — 证据不足或需谨慎（显示 ⚠️）
- `"no"` — 不推荐或有风险（显示 ❌）

每条都应有 `note` 解释原因。

---

## 附录：快速参考

### 所有 npm 命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm start` | 生产服务器 |
| `npm run lint` | 代码检查 |
| `npm run db:push` | 推送 Schema |
| `npm run db:seed` | 种子数据库 |
| `npm run db:studio` | Prisma Studio GUI |

### 所有页面 URL

| URL | 说明 |
|---|---|
| `/` | 首页 |
| `/claims` | 所有 Claims |
| `/claim/{slug}` | Claim 详情 |
| `/topics` | 所有主题 |
| `/topics/{slug}` | 主题详情 |
| `/search?q={query}` | 搜索 |
| `/api-docs` | API 文档 |
| `/api/claim/{slug}` | Claim API |
| `/api/evidence/{topic}` | Evidence API |
| `/api/search?q={query}` | Search API |
| `/sitemap.xml` | 站点地图 |
| `/robots.txt` | 爬虫规则 |

### 关键文件位置

| 文件 | 说明 |
|---|---|
| `src/data/seed-data.ts` | 所有数据（Claims, Studies, Topics） |
| `src/lib/data.ts` | 数据查询函数 |
| `src/lib/types.ts` | 类型定义 |
| `src/lib/seo.ts` | SEO/JSON-LD 生成 |
| `prisma/schema.prisma` | 数据库模型 |
| `prisma/seed.ts` | 数据库种子脚本 |
| `docs/PRD.md` | 产品需求文档 |
| `docs/TRD.md` | 技术需求文档 |
| `docs/OPERATION-MANUAL.md` | 本文档 |

---

*Operation Manual v1.1 — Updated: 2026-07-04 (enhanced daily workflow guide)*
