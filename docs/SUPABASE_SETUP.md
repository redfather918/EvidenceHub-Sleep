# EvidenceHub Sleep — Supabase 接入指南

> 目标：将 Supabase PostgreSQL 作为生产数据库，让定时任务抓取的论文和 Claim 真正持久化，网站内容自动增长。

---

## 一、创建 Supabase 项目

### 1.1 登录并创建

1. 打开 [https://supabase.com](https://supabase.com)，用 GitHub 账号登录
2. 点击 **New Project**
3. 填写信息：
   - **Organization**: 选择你的组织（或新建）
   - **Project Name**: `evidencehub-sleep`
   - **Database Password**: 设置强密码（保存好！）
   - **Region**: 选择离你最近的区域，**推荐 `Asia Northeast (Tokyo)`** 或 `Asia Southeast (Singapore)`，降低延迟
   - **Pricing Plan**: 选择 **Free**（免费额度：500MB 存储 + 2GB 带宽，足够起步）
4. 点击 **Create new project**，等待约 2 分钟初始化完成

### 1.2 获取连接信息

项目创建后，进入左侧菜单 **Project Settings → API**：

| 字段 | 获取位置 | 用途 |
|---|---|---|
| `Project URL` | Settings → API → Project URL | `SUPABASE_URL` |
| `service_role key` | Settings → API → service_role secret | `SUPABASE_SERVICE_ROLE_KEY` |
| `anon key` | Settings → API → anon public | 前端用（可选） |

⚠️ **service_role key 是超级管理员密钥，绝不能泄露到前端代码！**

---

## 二、初始化数据库

### 2.1 运行 SQL 初始化脚本

1. 在 Supabase Dashboard 左侧菜单点击 **SQL Editor**
2. 点击 **New query**
3. 打开本地文件 `supabase/init.sql`，复制全部内容粘贴到编辑器
4. 点击 **Run** 执行
5. 等待执行完成，确认没有报错

### 2.2 验证表创建

点击左侧 **Table Editor**，应能看到以下 8 张表：

- `topics` — 主题分类
- `studies` — 研究论文
- `claims` — 核心结论
- `claim_study_map` — Claim ↔ Study 关联
- `dose_mappings` — 剂量映射
- `population_fits` — 人群适配
- `pipeline_runs` — 流水线日志
- `evidence_metrics` — 证据评分

---

## 三、配置环境变量

### 3.1 本地开发环境

在项目根目录创建 `.env.local`（已存在则追加）：

```bash
# Supabase 连接（生产数据库）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 定时任务认证（已在腾讯云配置）
CRON_SECRET=your-cron-secret-here

# AI 提供商（Claim 提取）
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...

# 可选：用于前端直连 Supabase（匿名读取）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3.2 腾讯云服务器环境变量

SSH 登录到你的腾讯云服务器，编辑环境变量：

```bash
# 方式一：写入 .env 文件（推荐，配合 pm2 或 systemd）
ssh root@your-tencent-cloud-ip
cd /path/to/evidencehub-sleep
cat >> .env << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=your-cron-secret-here
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
EOF

# 方式二：写入 systemd service 文件（如果使用 systemd）
# 编辑 /etc/systemd/system/evidencehub.service
# 在 [Service] 段添加：
# Environment="NEXT_PUBLIC_SUPABASE_URL=https://..."
# Environment="SUPABASE_SERVICE_ROLE_KEY=eyJ..."
# 然后 systemctl daemon-reload && systemctl restart evidencehub

# 方式三：Docker 容器（如果使用 Docker）
# 在 docker-compose.yml 的 environment 段添加对应变量
```

### 3.3 验证连接

```bash
cd evidencehub-sleep
npm install  # 确保 @supabase/supabase-js 已安装
npx tsx scripts/test-supabase.ts
```

测试脚本输出 `Supabase connected! X claims, Y studies` 即成功。

---

## 四、数据迁移（可选：将现有 Seed 数据导入 Supabase）

如果希望将现有的 11 条 Claim 和 15 条 Study 导入到 Supabase：

```bash
npm run db:migrate-to-supabase
```

或手动运行：

```bash
npx tsx scripts/seed-to-supabase.ts
```

此脚本会读取 `src/data/seed-data.ts` 中的静态数据，写入 Supabase 数据库。

---

## 五、验证定时任务真正写入数据库

### 5.1 手动触发测试

```bash
curl -X GET "https://your-domain.com/api/cron/fetch-papers" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 5.2 检查数据库

在 Supabase SQL Editor 运行：

```sql
SELECT COUNT(*) FROM studies;
SELECT COUNT(*) FROM claims;
SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 5;
```

如果 `studies` 和 `claims` 表中有数据，且 `pipeline_runs` 有成功日志，说明一切正常。

### 5.3 检查 GitHub Actions 运行记录

打开 [GitHub Actions](https://github.com/redfather918/EvidenceHub-Sleep/actions) 查看所有定时任务的执行历史。

---

## 六、监控与告警（推荐）

### 6.1 Supabase Dashboard 监控

- **Database → Usage**: 查看存储、连接数、查询性能
- **Logs**: 查看 PostgreSQL 查询日志
- **Reports**: 慢查询报告

### 6.2 添加失败告警（GitHub Actions）

在 `.github/workflows/` 各工作流文件中，可添加 Slack/飞书 webhook 通知（待实现）。

---

## 七、常见问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `connection refused` | 环境变量未配置 | 检查 `.env` 中的 URL 和 Key |
| `RLS policy violation` | RLS 阻止了写入 | 确认使用 `service_role` key，而非 `anon` key |
| 表不存在 | SQL 未执行 | 在 Supabase SQL Editor 重新运行 `supabase/init.sql` |
| 数据未增长 | 定时任务返回成功但数据未写入 | 检查 `pipeline_runs` 日志，确认 `isDbMode()` 返回 true |
| 跨域问题 | 前端直连 Supabase | 在 Supabase Auth → URL Configuration 添加你的域名 |

---

## 八、下一步（路线图）

- [ ] 配置 Supabase 自动备份（Pro 计划支持 Point-in-Time Recovery）
- [ ] 启用 Supabase Realtime（用于前端实时更新 Claim）
- [ ] 配置连接池（PgBouncer）优化高并发
- [ ] 迁移到 Supabase Edge Functions（替代部分 Vercel/腾讯云 API）

---

*Updated: 2026-07-06*
