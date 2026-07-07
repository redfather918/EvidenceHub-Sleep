# EvidenceHub V3 — Growth Engine PRD

> **Module 等级：** 贯穿（让前面三个模块持续产生流量与收入）
> **目标：** 把"每天写文章"替换为"每天程序化新增实体页 + 系统化获取流量与变现"。
> **关联：** Programmatic SEO（页面供给）、Explorer/Compare/Graph（留存与转化）

---

## 1. 增长飞轮（Growth Flywheel）

```
内容生产引擎（每日新增实体）
  └─ Programmatic SEO（自动收录）
       └─ Search Console 流量
            └─ Affiliate / Newsletter / API 变现
                 └─ 收入反哺更多内容 + 外链建设
```

**核心转变：** 增长不再依赖人工写作，而是依赖**数据 pipeline 的产出速率**。

---

## 2. 内容生产引擎（Content Production Engine）

### 2.1 每日产出目标

| 内容 | 每日目标 | 来源 |
|---|---|---|
| Claims | 20 | PubMed + LLM 提取（pipeline） |
| Compare | 5 | 高 score Claim 两两组合 |
| FAQ | 50 | 每个新 Claim 生成 2-3 FAQ |
| Graph 边 | 自动 | build-graph 派生 |

### 2.2 Pipeline 编排（新增步骤）

现有 7 个 GitHub Actions Workflow 扩展为：

| Job | 频率 | 产出 |
|---|---|---|
| fetch-papers | 每日 02:00 | 新 studies |
| ai-parse | 每小时 | 新 claims（需 AI Key） |
| build-graph | 每日 04:00 | graph_edges |
| build-compare | 每日 05:00 | compare_pages |
| update-claims | 每小时 | 证据更新 |
| seo-update | 每日 03:00 | sitemap + IndexNow |
| revalidate | 每小时 | 页面刷新 |
| affiliate-update | 每周一 | 产品链接 |
| newsletter | 每周五 | 邮件 |

### 2.3 质量门禁（Quality Gate）

- Claim 必须满足：`rctCount>=1` 或 `metaCount>=1` 且 `evidenceScore>=40`，否则 `noindex`
- Compare 必须双方 `confidence != low`
- 重复检测：相似度 > 0.85 合并（已有去重逻辑）

---

## 3. Search Console 监控（GSC Monitoring）

### 3.1 核心指标看板

| 指标 | 说明 | 警戒线 |
|---|---|---|
| 覆盖率（有效页） | 已索引页面数 | 应随内容日增 |
| 富媒体错误 | Schema 校验失败数 | = 0 |
| 平均排名 | 核心 Claim 词排名 | 监控前 10 |
| 点击/展示 | CTR | > 2% |
| 抓取统计 | 5xx / 404 | 异常告警 |

### 3.2 自动化告警

`seo-update` cron 扩展：调用 GSC API 拉取覆盖率，若 404 突增或富媒体错误 > 0，推送通知（Slack/邮件）。

---

## 4. 外链建设（Backlinks）

| 渠道 | 动作 |
|---|---|
| 学术社区 | Reddit r/sleep, r/Nootropics 分享高 score Claim |
| 开发者社区 | Hacker News / GitHub 展示 Evidence API |
| 媒体投稿 | 基于数据写"Glycine 8 项 RCT 综述"投科技媒体 |
| 合作 | 与睡眠 App / 营养师互换引用 |

**原则：** 外链指向**实体页（Claim/Topic）**，而非首页，传递主题权重。

---

## 5. 变现层级（Monetization）

| 层级 | 模式 | 状态 | 说明 |
|---|---|---|---|
| 1 | Affiliate | 占位已存在 | Amazon / iHerb / Thorne / NOW，仅展示研究上下文产品 |
| 2 | Newsletter | 框架已存在 | 每周 Evidence Digest，导流回实体页 |
| 3 | Evidence API | MVP 已存在 | B2B 授权给 AI 公司 / 健康 App / 医生 |
| 4 | 数据资产 | 积累中 | Claim Graph 长期价值 |

### 5.1 Affiliate 规则（防 spam）

- 仅在 Claim 页「Products」区块展示
- 产品必须出现在该 Claim 的研究上下文中（claim_products 表，已有 matchScore）
- 明确标注"affiliate link"

### 5.2 Evidence API 商业化

- 基于现有 `ApiKey` / `ApiUsageLog` 表（已存在类型）
- 层级：free / pro / enterprise
- 端点：/api/explore, /api/claim, /api/graph, /api/citation
- Month 3 开放 Public API

---

## 6. 数据看板（Dashboard）

建议 `/admin` 内部页面（或外部 BI）监控：

| 面板 | 数据 |
|---|---|
| 内容增长 | 每日 Claims / Studies / Compare 新增 |
| 流量 | GSC 点击/展示/排名 |
| 变现 | Affiliate 点击 / API 调用量 / Newsletter 订阅 |
| 健康度 | 404 / 5xx / Schema 错误 |

---

## 7. 验收标准（Acceptance Criteria）

- [ ] 内容生产引擎每日自动新增 ≥ 20 Claims（pipeline 验证）
- [ ] Compare 每日自动生成 ≥ 5 页且缓存
- [ ] GSC 覆盖率随内容日增，无富媒体错误
- [ ] Affiliate 仅在相关研究上下文展示，标注清晰
- [ ] Newsletter 每周自动发送，含本周 Top Evidence
- [ ] 数据看板显示内容/流量/变现三联指标

---

## 8. 排期

- **Product Week：** 定义内容生产 SOP + 质量门禁；扩展 pipeline 步骤
- **Week 4：** Evidence API Key 管理 + 计费
- **Month 2：** 数据看板 + 外链系统化
- **Month 3：** Public API 开放

---

*EvidenceHub V3 — Growth Engine PRD — 2026-07-07*
