# EvidenceHub Sleep — 管理员快速操作指令

> **日期**：2026-07-07 | **给服务器管理员**

---

## 今天需要执行的步骤

### 第 1 步：SSH 登录服务器

```bash
ssh root@你的服务器IP
cd /path/to/evidencehub-sleep
```

### 第 2 步：备份

```bash
cp .env .env.backup.20260707
pm2 save
```

### 第 3 步：拉取最新代码

```bash
git pull origin main
```

确认看到最新 commit：
```
2b02eee docs: add server deployment guide for ops team
60455e5 fix: store faq and sub-scores to Supabase (3 bugs)
b1eb0f0 fix: claim/topic/search pages and APIs now read from Supabase
```

### 第 4 步：安装依赖

```bash
npm install
```

### 第 5 步：数据库迁移（如尚未执行）

登录 Supabase Dashboard → SQL Editor，执行：

```sql
ALTER TABLE public.studies ADD COLUMN IF NOT EXISTS abstract TEXT;
```

> 如果之前已执行过（2026-07-07 01:32），可跳过。`IF NOT EXISTS` 确保不会报错。

### 第 6 步：检查 .env 环境变量

```bash
cat .env
```

确认以下 5 个变量已正确配置（如缺失或值不对，用 `nano .env` 修改）：

```bash
NEXT_PUBLIC_SUPABASE_URL="https://votjdvxkglthkprdgoft.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（完整 key）"
AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY="sk-你的DeepSeek密钥"
PIPELINE_DRY_RUN="false"
```

### 第 7 步：构建

```bash
npm run build
```

预期输出：
- `✓ Compiled successfully`
- `✓ Generating static pages (250+/250+)` — 页面数应显著增加
- 无报错

### 第 8 步：重启服务

```bash
pm2 restart evidencehub-sleep
pm2 save
```

> 如果 pm2 进程名不同，先 `pm2 list` 查看。

---

## 验证（1 分钟搞定）

```bash
# 1. 首页能打开
curl -s -o /dev/null -w "%{http_code}" https://sleep.p1web.site
# 预期：200

# 2. 首页 stats 不是 0
curl -s https://sleep.p1web.site | grep -oE 'value.*?[0-9]+' | head -4

# 3. /studies 新页面能打开
curl -s -o /dev/null -w "%{http_code}" https://sleep.p1web.site/studies
# 预期：200

# 4. Claim 详情页不 404
curl -s -o /dev/null -w "%{http_code}" https://sleep.p1web.site/claim/glycine-sleep-latency
# 预期：200
```

---

## 一句话总结

```
git pull → npm install → ALTER TABLE（如未执行）→ 检查 .env → npm run build → pm2 restart
```

---

## 如果出问题

**构建失败**：
```bash
rm -rf node_modules .next
npm install
npm run build
```

**服务无法启动**：
```bash
pm2 logs evidencehub-sleep --lines 30
```

**回滚到上一版本**：
```bash
git checkout 60455e5
npm run build
pm2 restart evidencehub-sleep
```

**详细文档**：参见 `docs/SERVER-DEPLOY.md`

---

*有问题联系开发团队。*
