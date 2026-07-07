# Google Search Console 上线清单

> 站点: https://sleep.p1web.site
> 已验证: ✅ (google-site-verification 文件已部署)
> Sitemap: https://sleep.p1web.site/sitemap.xml (259 URLs, 已从 Supabase 全量生成)

---

## 第 0 步：先让 sitemap 修复生效（重要）

刚才修复了 sitemap 数据源（之前只生成 24 条，现已 259 条）。**必须重新部署**服务器才能生效：

```bash
cd /path/to/evidencehub-sleep
git pull origin main
npm run build
pm2 restart evidencehub-sleep
```

验证：部署后访问 https://sleep.p1web.site/sitemap.xml ，确认 `<loc>` 数量 ~259。

---

## 第 1 步：提交 Sitemap

1. 打开 [Google Search Console](https://search.google.com/search-console)
2. 左侧菜单 → **Sitemaps**（站点地图）
3. 在 "添加新的站点地图" 输入框填写：`sitemap.xml`
   - 注意：只需填 `sitemap.xml`，不要带域名（GSC 会自动拼成 `https://sleep.p1web.site/sitemap.xml`）
4. 点击 **提交**
5. 等待状态变为 ✅ **成功** — 通常几分钟内；下方会显示 "已发现网址数"（应为 259 左右）

> 提交后 Google 会自动抓取并发现全部 259 个页面，无需手动逐条提交。

---

## 第 2 步：请求编入索引（加速核心页面）

GSC 的 URL 检查 (URL Inspection) 工具**一次只能处理一个 URL**，无法批量。策略：对高价值页面单独"请求编入索引"加速收录，其余交给 sitemap 自然抓取。

### 操作路径
1. 左侧菜单 → **URL 检查**
2. 粘贴页面完整 URL → 回车
3. 若显示 **"网址不在 Google 上"** 或 **"尚未编入索引"**：
   - 点击 **请求编入索引**（Request indexing）
   - 弹出 "有效" 确认框 → 点 **提交**
4. 若显示 **"网址在 Google 上"**：说明已收录，无需操作

### 建议优先请求索引的页面

**静态核心页（5 个）：**
```
https://sleep.p1web.site/
https://sleep.p1web.site/claims
https://sleep.p1web.site/topics
https://sleep.p1web.site/search
https://sleep.p1web.site/api-docs
```

**高搜索量 Topic 页（8 个）：**
```
https://sleep.p1web.site/topics/melatonin
https://sleep.p1web.site/topics/glycine
https://sleep.p1web.site/topics/magnesium
https://sleep.p1web.site/topics/ashwagandha
https://sleep.p1web.site/topics/theanine
https://sleep.p1web.site/topics/apigenin
https://sleep.p1web.site/topics/tart-cherry
https://sleep.p1web.site/topics/exercise
```

**代表性 Claim 页（示例 12 个，其余 234 个由 sitemap 自动覆盖）：**
```
https://sleep.p1web.site/claim/melatonin-sleep-latency
https://sleep.p1web.site/claim/melatonin-circadian
https://sleep.p1web.site/claim/glycine-sleep-latency
https://sleep.p1web.site/claim/exercise-sleep-quality
https://sleep.p1web.site/claim/glycine-sleep-quality
https://sleep.p1web.site/claim/ashwagandha-sleep-quality
https://sleep.p1web.site/claim/magnesium-sleep-quality
https://sleep.p1web.site/claim/magnesium-deep-sleep
https://sleep.p1web.site/claim/tart-cherry-sleep-quality
https://sleep.p1web.site/claim/theanine-sleep-quality
https://sleep.p1web.site/claim/apigenin-sleep-onset
https://sleep.p1web.site/claim/high-flow-nasal-cannula-reduces-treatment-failure-risk-compa
```

> 完整 246 个 claim URL 见部署后的 sitemap.xml。建议优先索引上述 Topic 页 + 高搜索量化合物（melatonin / glycine / magnesium 等），这类页面搜索意图明确、转化价值高。

---

## 第 3 步：观察抓取与收录

| 报告位置 | 看什么 | 正常信号 |
|---------|--------|---------|
| **覆盖率 (Coverage)** | 有效页面数 | 随抓取逐步上升，目标 ~259 |
| **网址审查 (URL Inspection)** | 单个页面状态 | "网址在 Google 上" |
| **抓取统计信息 (Crawl Stats)** | 每日抓取请求数 | 稳定，无大量 404/5xx |
| **增强功能 (Enhancements)** | 结构化数据 | 无错误；能看到 Article / FAQ / Breadcrumb 富媒体 |
| **站点地图 (Sitemaps)** | 已提交/已索引 | 状态成功，已发现 ~259 |

### 验证结构化数据
用 [Rich Results Test](https://search.google.com/test/rich-results) 粘贴几个 claim URL，确认：
- Article 富媒体（标题、图片、作者）
- FAQ 富媒体（问答折叠）
- Breadcrumb 富媒体（面包屑）

---

## 后续维护

- **新内容上线后**：重新 `git pull + build + pm2 restart`，sitemap 自动更新；GSC 会在下次抓取时发现新 URL。
- **定期检查**：每周看一次"覆盖率"报告，处理 "已排除" / "错误" 的页面。
- **外链建设**：向睡眠/健康类站点投稿，获取 backlink，提升域名权重（DA）。

---

*生成日期: 2026-07-07 | 关联 commit: d929c69 (sitemap Supabase 修复)*
