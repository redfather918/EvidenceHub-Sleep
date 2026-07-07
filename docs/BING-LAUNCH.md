# Bing Webmaster Tools 上线清单

> 站点: https://sleep.p1web.site
> GSC 已验证 ✅ | Sitemap 已提交 ✅ (408 URLs) | Cloudflare Bot Fight Mode 已关 ✅

Bing 是第二大搜索引擎（加上其驱动的 ChatGPT/Yandex/Copilot 搜索），收录逻辑与 Google 类似，
但有一个 **Google 没有的独家武器：IndexNow 实时收录协议**。

---

## 第 1 步：验证站点所有权

### 方法 A：关联 Google Search Console（推荐，10 秒搞定）
Bing Webmaster Tools 支持**直接导入已在 GSC 验证过的站点**，无需重新验证：

1. 打开 [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. 登录（用 Microsoft 账号）
3. 选择 **"Import sites from Google Search Console"**（从 Google 站长工具导入）
4. 授权 Bing 读取你的 GSC 站点
5. 勾选 `sleep.p1web.site` → 导入
6. 自动验证通过 ✅

### 方法 B：文件验证（如果不用 GSC 关联）
1. Bing WMT → 添加站点 → 验证方式选 **"XML 文件"**
2. 下载 Bing 给的验证文件（如 `BingSiteAuth.xml`）
3. 放到项目 `public/` 目录
4. `git commit + push + 部署` → 回 Bing 点验证

> 注意：GSC 验证文件 `googlebedb0778fd17ea82.html` 已经在 public/，Bing 的单独放一个。

---

## 第 2 步：提交 Sitemap

1. Bing WMT 左侧 → **Sitemaps**（站点地图）
2. 输入 `https://sleep.p1web.site/sitemap.xml`
3. 点 **提交**
4. 状态变绿后，显示已发现网址数（~408）

也可通过 robots.txt 自动发现（已配置 `sitemap: https://sleep.p1web.site/sitemap.xml`）。

---

## 第 3 步：启用 IndexNow 实时收录（Bing 独家，强烈推荐）

IndexNow 让 Bing/Yandex **在内容发布后几分钟内**收录，比等 sitemap 爬取快得多。
项目已内置支持，只需配置 key：

### 3a. 获取 IndexNow Key
1. 打开 [IndexNow](https://www.indexnow.org/) → 点 **"Get started"**
2. 选 `sleep.p1web.site` → 生成 key（形如 `a1b2c3d4e5f6...`）
3. 复制这个 key

### 3b. 配置环境变量
在 **生产服务器** `.env` 中添加：
```bash
INDEXNOW_KEY=你的_indexnow_key
NEXT_PUBLIC_SITE_URL=https://sleep.p1web.site
```

### 3c. 验证文件已就绪
代码已创建动态验证端点 `GET /indexnow-key.txt`，会自动返回 `INDEXNOW_KEY` 的值。
Bing 验证时会 GET `https://sleep.p1web.site/indexnow-key.txt`，内容 = key → 验证通过。

### 3d. 部署 + 触发首次推送
```bash
git pull origin main
npm run build
pm2 restart evidencehub-sleep

# 触发一次 IndexNow 推送（会提交全部 claim URL 给 Bing）
curl -X POST "https://sleep.p1web.site/api/cron/seo-update?secret=你的CRON_SECRET"
```

### 3e. 验证 IndexNow 生效
Bing WMT → **URL Submission** → 看 **"API submission"** 计数是否在增长。

---

## 第 4 步：提交核心 URL 索引

Bing WMT → **URL Submission** → **Submit URLs**（手动）：
```
https://sleep.p1web.site/
https://sleep.p1web.site/claims
https://sleep.p1web.site/topics
https://sleep.p1web.site/topics/melatonin
https://sleep.p1web.site/claim/melatonin-sleep-latency
https://sleep.p1web.site/claim/glycine-sleep-latency
```

> 单次最多提交 10 条。其余页面通过 IndexNow + sitemap 自动覆盖。

---

## 第 5 步：观察收录

| Bing WMT 报告 | 看什么 | 正常信号 |
|--------------|--------|---------|
| **Sitemaps** | 已提交/已抓取 | 状态成功，~408 URLs |
| **URL Submission** | API submission 计数 | IndexNow 持续推送 |
| **SEO Reports** | SEO 建议 | 无 critical 问题 |
| **Backlinks** | 外链数 | 逐步增长 |
| **Crawl** | 抓取活动 | 稳定，无大量 404 |

---

## 自动收录机制总览（已部署）

| 触发 | 机制 | 覆盖 |
|------|------|------|
| 新内容发布 | `seo-update` cron 每日 4:00 自动跑 | Google ping + Bing ping + IndexNow 全量推送 |
| 手动触发 | `POST /api/cron/seo-update?secret=xxx` | 同上 |
| 站点地图 | `/sitemap.xml`（408 URLs） | Google + Bing 定期爬取 |
| IndexNow | `/indexnow-key.txt` 验证 + API 推送 | Bing/Yandex 实时收录 |

---

*生成日期: 2026-07-07 | 关联改动: indexnow-key.txt route + seo-update cron (Bing ping + keyLocation)*
