# EvidenceHub Sleep — 服务器部署文档

> **面向服务器管理员** | 更新时间：2026-07-07 | 版本：v2.0

---

## 一、系统架构

```
GitHub Actions (7 个定时任务)
       ↓ HTTP 请求 (Bearer CRON_SECRET)
腾讯云服务器 (sleep.p1web.site)
  ├── Nginx (80/443 → 3000 反代)
  ├── Next.js 14 生产模式 (pm2 管理)
  │     ├── SSR/SSG 页面渲染 → 用户访问
  │     └── /api/cron/* 路由 → Pipeline 执行
  └── .env 环境变量
        ├── NEXT_PUBLIC_SUPABASE_URL
        ├── SUPABASE_SERVICE_ROLE_KEY
        ├── DEEPSEEK_API_KEY
        ├── AI_PROVIDER=deepseek
        ├── PIPELINE_DRY_RUN=false
        └── CRON_SECRET
              ↓
Supabase PostgreSQL (云端)
  └── 8 张表：topics, studies, claims, claim_study_map,
              dose_mappings, population_fits, pipeline_runs, evidence_metrics
```

### 关键信息

| 项目 | 值 |
|------|-----|
| 部署平台 | 腾讯云服务器 |
| 域名 | sleep.p1web.site |
| 进程管理 | pm2（推荐）或 systemd |
| Node.js 版本 | 18.17+（推荐 20+） |
| 数据库 | Supabase PostgreSQL（云端，非本地） |
| 定时调度 | GitHub Actions（7 个 workflow） |
| AI Provider | DeepSeek（deepseek-chat 模型） |

---

## 二、本次更新内容（2026-07-07）

### 代码变更（10 个 commit，从 802ba99 到 60455e5）

| Commit | 说明 |
|--------|------|
| `60455e5` | **fix: 存储 faq 和子评分到 Supabase（3 个 bug 修复）** |
| `b1eb0f0` | **fix: claim/topic/search 页面和 API 改为从 Supabase 读取** |
| `83479a9` | feat: 添加百度统计代码 |
| `b5031e5` | docs: 更新 PRD v4.0 和 TRD v2.0 |
| `927bda0` | **feat: 页面读取 Supabase 真实数据；首页 stats 可点击；新增 /studies 页面** |
| `346b63e` | **feat: 首页 stats 从 Supabase 动态读取（不再硬编码）** |
| `77a6e80` | **fix: studies 表添加缺失的 abstract 列** |
| `fe6f332` | fix: fetch-papers 错误不再被静默吞掉 |
| `8f08c9a` | fix: 让数据库生成 UUID |
| `27f19d8` | fix: tsx 脚本通过 dotenv 加载 .env |

### 变更影响

- **数据库 schema 变更**：studies 表新增 `abstract TEXT` 列（需手动 ALTER TABLE）
- **新增页面**：`/studies`（研究列表页）
- **页面数据源切换**：首页、/claims、/topics、/claim/[slug]、/topics/[slug]、/search 全部从静态 seed-data 改为 Supabase 实时读取
- **首页 stats**：Claims/Studies/Topics/Human RCTs 数字从硬编码改为 Supabase COUNT 查询，且可点击跳转
- **AI Pipeline**：faq 和 4 个子评分（human_rct_score, meta_score, mechanism_score, safety_score）现在正确写入 Supabase
- **新增依赖**：无（@supabase/supabase-js 已在之前安装）

---

## 三、部署步骤

### 3.1 备份当前状态（安全第一）

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 进入项目目录
cd /path/to/evidencehub-sleep

# 备份当前代码
git stash  # 如果有未提交的本地改动

# 备份当前 .env
cp .env .env.backup.$(date +%Y%m%d)

# 备份 pm2 进程配置
pm2 save
```

### 3.2 拉取最新代码

```bash
cd /path/to/evidencehub-sleep

# 拉取最新代码
git pull origin main

# 确认版本
git log --oneline -3
# 应看到：
# 60455e5 fix: store faq and sub-scores to Supabase (3 bugs)
# b1eb0f0 fix: claim/topic/search pages and APIs now read from Supabase
# 83479a9 feat: add Baidu Analytics tracking code
```

### 3.3 安装依赖

```bash
npm install
```

> 本次更新无新增依赖，但建议执行以确保 package-lock.json 一致。

### 3.4 数据库迁移（重要！）

在 Supabase Dashboard 的 **SQL Editor** 中执行以下 SQL：

```sql
-- 检查 studies 表是否已有 abstract 列
SELECT column_name FROM information_schema.columns
WHERE table_name = 'studies' AND column_name = 'abstract';

-- 如果上面查询返回 0 行，执行以下语句添加列：
ALTER TABLE public.studies ADD COLUMN IF NOT EXISTS abstract TEXT;
```

> **注意**：如果之前已执行过此 SQL（2026-07-07 01:32 用户已执行），可跳过此步。
> 使用 `IF NOT EXISTS` 确保重复执行不会报错。

### 3.5 配置环境变量

编辑 `.env` 文件，确保以下变量已正确配置：

```bash
nano .env  # 或 vim .env
```

**必须配置的变量**：

```bash
# Supabase 数据库（必须）
NEXT_PUBLIC_SUPABASE_URL="https://votjdvxkglthkprdgoft.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（完整 key）"

# AI Pipeline（必须，用于 AI 解析）
AI_PROVIDER="deepseek"
AI_MODEL="deepseek-chat"
DEEPSEEK_API_KEY="sk-你的DeepSeek密钥"

# Pipeline 模式（false = 真实写入数据库）
PIPELINE_DRY_RUN="false"

# Cron 鉴权（GitHub Actions 调用时需携带）
CRON_SECRET="你的密钥"

# 站点 URL
NEXT_PUBLIC_SITE_URL="https://sleep.p1web.site"
```

**可选变量**（按需配置）：

```bash
# PubMed API（提高抓取速率限制）
PUBMED_API_KEY=""

# 百度统计
# 已在代码中硬编码，无需环境变量

# 重新验证密钥
REVALIDATE_SECRET=""

# IndexNow（SEO 推送）
INDEXNOW_KEY=""
```

### 3.6 构建生产版本

```bash
npm run build
```

**预期输出**：
- `✓ Compiled successfully`
- `✓ Generating static pages (xxx/xxx)` — 页面数应显著增加（从 ~30 增至 250+）
- 无 TypeScript 错误

> **如果构建失败**：检查 Node.js 版本（需 18.17+），删除 `node_modules` 和 `.next` 后重试：
> ```bash
> rm -rf node_modules .next
> npm install
> npm run build
> ```

### 3.7 重启服务

**方式一：pm2（推荐）**

```bash
pm2 restart evidencehub-sleep
# 或如果进程名不同：
pm2 list        # 查看进程名
pm2 restart <进程名>
pm2 save        # 保存配置
```

**方式二：systemd**

```bash
sudo systemctl restart evidencehub
# 或：
sudo systemctl restart evidencehub-sleep
```

**方式三：直接启动**

```bash
# 先停掉旧进程
kill $(lsof -t -i:3000) 2>/dev/null

# 后台启动
nohup npm start > server.log 2>&1 &
```

---

## 四、验证部署

### 4.1 网站访问验证

```bash
# 首页（stats 数字应显示 246+ claims, 227+ studies）
curl -s https://sleep.p1web.site | grep -o 'value.*[0-9]\+' | head -4

# Claims 页面（应显示 246 条，非 11 条）
curl -s https://sleep.p1web.site/claims | grep -c 'claim-card'

# Studies 页面（新增页面）
curl -s -o /dev/null -w "%{http_code}" https://sleep.p1web.site/studies
# 应返回 200

# Claim 详情页（非 404）
curl -s -o /dev/null -w "%{http_code}" https://sleep.p1web.site/claim/glycine-sleep-latency
# 应返回 200
```

### 4.2 API 验证

```bash
# Claim API
curl -s https://sleep.p1web.site/api/claim/glycine-sleep-latency | python -m json.tool | head -10

# Search API
curl -s "https://sleep.p1web.site/api/search?q=magnesium&limit=3" | python -m json.tool | head -10

# Evidence API
curl -s https://sleep.p1web.site/api/evidence/glycine | python -m json.tool | head -10
```

### 4.3 Cron API 验证

```bash
# 手动触发 fetch-papers（应返回 227 papers stored）
curl -s -X GET "https://sleep.p1web.site/api/cron/fetch-papers" \
  -H "Authorization: Bearer $CRON_SECRET"

# 手动触发 ai-parse（需 1-5 分钟，应返回 227 claims extracted）
curl -s -X GET "https://sleep.p1web.site/api/cron/ai-parse" \
  -H "Authorization: Bearer $CRON_SECRET" \
  --max-time 300
```

### 4.4 数据库验证

在 Supabase SQL Editor 执行：

```sql
-- 总数据量
SELECT COUNT(*) as total_claims FROM claims;    -- 预期：246+
SELECT COUNT(*) as total_studies FROM studies;  -- 预期：227+

-- FAQ 是否填充
SELECT id, jsonb_array_length(faq) as faq_count
FROM claims
WHERE jsonb_array_length(faq) > 0
LIMIT 5;

-- 子评分是否填充
SELECT id, human_rct_score, meta_score, mechanism_score, safety_score, evidence_score
FROM claims
WHERE human_rct_score > 0
LIMIT 5;

-- 最近的 Pipeline 运行记录
SELECT status, ai_provider, dry_run, papers_fetched, claims_extracted, errors_count, started_at
FROM pipeline_runs
ORDER BY started_at DESC
LIMIT 5;
```

### 4.5 百度统计验证

1. 访问 https://sleep.p1web.site
2. 打开浏览器开发者工具 → Network
3. 搜索 `hm.baidu.com`，确认请求发出
4. 登录百度统计后台查看数据接入

---

## 五、GitHub Actions 配置

确保 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中配置了以下 Secrets：

| Secret 名称 | 值 | 用途 |
|--------------|-----|------|
| `EVIDENCEHUB_BASE_URL` | `https://sleep.p1web.site` | GitHub Actions 调用的目标 URL |
| `CRON_SECRET` | 与服务器 `.env` 中的 `CRON_SECRET` 一致 | Cron API 鉴权 |

### 7 个定时任务

| Workflow | 频率 | 端点 | 说明 |
|----------|------|------|------|
| scheduler-fetch-papers | 每天 06:00 | `/api/cron/fetch-papers` | 从 PubMed 抓取论文 |
| scheduler-ai-parse | 每小时 :00 | `/api/cron/ai-parse` | AI 提取 Claims |
| scheduler-update-claims | 每天 08:00 | `/api/cron/update-claims` | 更新 Claim 统计 |
| scheduler-seo-update | 每周一 02:00 | `/api/cron/seo-update` | SEO 优化 |
| scheduler-revalidate | 每天 00:30 | `/api/cron/revalidate` | ISR 重新验证 |
| scheduler-affiliate | 每周一 09:00 | `/api/cron/affiliate` | 联盟链接更新 |
| scheduler-newsletter | 每周五 10:00 | `/api/cron/newsletter` | 新闻信发送 |

---

## 六、日常运维

### 6.1 查看 pm2 日志

```bash
# 实时日志
pm2 logs evidencehub-sleep --lines 100

# 错误日志
pm2 logs evidencehub-sleep --err --lines 50
```

### 6.2 查看服务状态

```bash
pm2 status
pm2 monit
```

### 6.3 手动触发 Pipeline

```bash
# 抓取论文
curl -X GET "https://sleep.p1web.site/api/cron/fetch-papers" \
  -H "Authorization: Bearer $CRON_SECRET"

# AI 解析
curl -X GET "https://sleep.p1web.site/api/cron/ai-parse" \
  -H "Authorization: Bearer $CRON_SECRET" \
  --max-time 300

# 更新 Claim 统计
curl -X GET "https://sleep.p1web.site/api/cron/update-claims" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 6.4 更新部署（日常流程）

当有新代码推送到 GitHub main 分支时：

```bash
cd /path/to/evidencehub-sleep
git pull origin main
npm install        # 如果有新依赖
npm run build
pm2 restart evidencehub-sleep
pm2 save
```

---

## 七、故障排查

### 问题：首页 stats 显示 0 或旧数字

**原因**：Supabase 环境变量未配置，或构建时未读取到。

**解决**：
1. 确认 `.env` 中 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 已填写
2. 重新构建：`npm run build && pm2 restart evidencehub-sleep`

### 问题：/claims 只显示 11 条

**原因**：代码未更新到最新版本，仍使用静态 seed-data。

**解决**：
1. `git log --oneline -3` 确认包含 `b1eb0f0` commit
2. 重新构建并重启

### 问题：Claim 详情页 404

**原因**：静态生成时未包含 Supabase 中的新 Claims。

**解决**：
1. 确认 `npm run build` 时输出了 200+ 个静态页面
2. 重启服务

### 问题：Cron API 返回 401

**原因**：`CRON_SECRET` 不匹配。

**解决**：
1. 确认服务器 `.env` 中 `CRON_SECRET` 与 GitHub Secrets 中一致
2. 重启服务

### 问题：ai-parse 返回 500

**原因**：DeepSeek API key 未配置或已过期。

**解决**：
1. 确认 `.env` 中 `AI_PROVIDER="deepseek"` 和 `DEEPSEEK_API_KEY="sk-xxx"`
2. 确认 `PIPELINE_DRY_RUN="false"`
3. 测试 API key：`curl -s https://api.deepseek.com/v1/chat/completions -H "Authorization: Bearer sk-xxx" -H "Content-Type: application/json" -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'`
4. 重启服务

### 问题：pm2 重启后 .env 变量丢失

**原因**：pm2 未加载 .env 文件。

**解决**：使用 `ecosystem.config.js` 配置：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'evidencehub-sleep',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
    },
    env_file: '.env',
  }]
};
```

或手动 source：

```bash
pm2 start "npm start" --name evidencehub-sleep --env production
```

---

## 八、回滚方案

如果部署后出现问题，可快速回滚：

```bash
# 查看历史版本
git log --oneline -10

# 回滚到上一个稳定版本（例如 b5031e5）
git checkout b5031e5
npm run build
pm2 restart evidencehub-sleep

# 或者回退到 Supabase 集成前（不推荐，会丢失所有新数据）
# git checkout 802ba99
```

**数据库回滚**：不需要。本次更新只新增了 `abstract` 列（向后兼容），不删除任何已有数据。

---

## 九、环境变量完整参考

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | - | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | - | Supabase 服务端密钥 |
| `AI_PROVIDER` | ✅ | `mock` | AI 提供商：`deepseek` / `openai` / `mock` |
| `AI_MODEL` | - | `deepseek-chat` | AI 模型名称 |
| `DEEPSEEK_API_KEY` | ✅ | - | DeepSeek API 密钥 |
| `PIPELINE_DRY_RUN` | ✅ | `true` | `false` = 真实写入数据库 |
| `CRON_SECRET` | ✅ | - | Cron API 鉴权密钥 |
| `NEXT_PUBLIC_SITE_URL` | - | - | 站点 URL（SEO/sitemap） |
| `PUBMED_API_KEY` | - | - | PubMed API 密钥（提高速率限制） |
| `REVALIDATE_SECRET` | - | - | ISR 重新验证密钥 |
| `INDEXNOW_KEY` | - | - | IndexNow SEO 推送密钥 |
| `OPENAI_API_KEY` | - | - | OpenAI API 密钥（备用） |

---

*文档版本：v2.0 | 最后更新：2026-07-07 | 维护者：EvidenceHub 团队*
