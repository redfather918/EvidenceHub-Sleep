# EvidenceHub V3 — Module 4：Evidence Graph PRD

> **Module 等级：** P1（Week 3 落地）
> **目标：** 把"证据"呈现为可探索的 **Evidence Network（证据网络）**，而非孤立页面。类似 Obsidian 的图谱视图，但节点是医学实体，边是证据关系。
> **关联模块：** Explorer（嵌入入口）、Programmatic SEO（实体页）、Growth（内容生产驱动边增长）

---

## 1. 产品目标

- 让用户**看见** Claim ↔ Study ↔ Topic ↔ Outcome ↔ Intervention 之间的关系
- 支持**实时右侧展开**：点一个节点，右侧面板显示其详情 + 邻接节点
- 成为 EvidenceHub 的"护城河"——结构化关系无法被简单爬取复制

**不是：** Neo4j 图数据库。而是**轻量 `graph_edges` 表 + 前端力导向布局**。

---

## 2. 节点类型（Node Types）

| 节点 | 来源表 | 示例 |
|---|---|---|
| `Topic` | `topics` | Sleep, Nutrition |
| `Claim` | `claims` | Glycine improves sleep latency |
| `Study` | `studies` | PMID 12345678 |
| `Outcome` | `outcomes`（新增） | Sleep Latency, Deep Sleep |
| `Intervention` | `interventions`（新增） | Glycine, Magnesium |

每个节点有统一形状：

```typescript
interface GraphNode {
  id: string;          // 全局唯一，如 "claim:glycine-sleep-latency"
  type: "topic" | "claim" | "study" | "outcome" | "intervention";
  label: string;
  url: string;         // 跳转地址
  weight: number;      // 用于节点大小（如 evidenceScore / 研究数）
  metadata?: Record<string, unknown>;
}
```

---

## 3. 边类型（Edge Types）

| 关系 | 语义 | 方向 |
|---|---|---|
| `supports` | A 支持 B | claim → outcome |
| `contradicts` | A 与 B 矛盾 | claim ↔ claim |
| `related_to` | A 与 B 相关 | claim ↔ claim |
| `studied_by` | B 研究了 A | outcome → study |
| `belongs_to` | A 属于 B | claim → topic / intervention → claim |

边结构（核心，极简）：

```typescript
interface GraphEdge {
  from: string;        // node id
  to: string;          // node id
  relation: "supports" | "contradicts" | "related_to" | "studied_by" | "belongs_to";
  weight: number;      // 0-1 或 1-5
}
```

---

## 4. 数据模型（Data Model）

### 4.1 新增表：`graph_edges`（核心）

```sql
CREATE TABLE graph_edges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id     text NOT NULL,           -- node id
  to_id       text NOT NULL,           -- node id
  from_type   text NOT NULL,           -- topic/claim/study/outcome/intervention
  to_type     text NOT NULL,
  relation    text NOT NULL,           -- supports/contradicts/related_to/studied_by/belongs_to
  weight      numeric DEFAULT 1.0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (from_id, to_id, relation)
);
CREATE INDEX idx_edge_from ON graph_edges(from_id);
CREATE INDEX idx_edge_to   ON graph_edges(to_id);
```

### 4.2 新增表：`interventions`（实体化干预物）

```sql
CREATE TABLE interventions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,    -- "glycine"
  name        text NOT NULL,
  category    text,                     -- amino-acid / mineral / herb ...
  description text,
  claim_count int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
```

### 4.3 新增表：`outcomes`（实体化结局）

```sql
CREATE TABLE outcomes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,    -- "sleep-latency"
  name        text NOT NULL,
  category    text,
  description text,
  claim_count int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
```

> `claim_study_map`（已存在）可映射为 `studied_by` 边：study → claim。
> `claims.topicId` / `claims.relatedSlugs` 可映射为 `belongs_to` / `related_to` 边。

### 4.4 TypeScript 类型（`src/lib/types.ts`）

```typescript
export type GraphNodeType = "topic" | "claim" | "study" | "outcome" | "intervention";
export type GraphRelation = "supports" | "contradicts" | "related_to" | "studied_by" | "belongs_to";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  url: string;
  weight: number;
  metadata?: Record<string, unknown>;
}
export interface GraphEdge {
  from: string;
  to: string;
  relation: GraphRelation;
  weight: number;
}
export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  center?: string; // 当前焦点 node id
}
```

---

## 5. API 契约

### 5.1 `GET /api/graph/[entity]`（核心）

**Path：** `/api/graph/glycine` 或 `/api/graph/claim:glycine-sleep-latency`

**Query Params：**

| 参数 | 默认 | 说明 |
|---|---|---|
| `depth` | 2 | 邻接跳数（1-3） |
| `relation` | — | 仅返回指定关系边 |
| `limit` | 100 | 最大节点数 |

**Response 200：**

```json
{
  "center": "intervention:glycine",
  "nodes": [
    {"id":"intervention:glycine","type":"intervention","label":"Glycine","url":"/topics/glycine","weight":12},
    {"id":"claim:glycine-sleep-latency","type":"claim","label":"Glycine improves sleep latency","url":"/claim/glycine-sleep-latency","weight":89}
  ],
  "edges": [
    {"from":"claim:glycine-sleep-latency","to":"outcome:sleep-latency","relation":"supports","weight":0.9},
    {"from":"intervention:glycine","to":"claim:glycine-sleep-latency","relation":"belongs_to","weight":1.0}
  ],
  "_links": {"self":"/api/graph/glycine?depth=2"}
}
```

### 5.2 边写入（Pipeline 侧）

新增 cron 步骤 `build-graph`：从 `claims` / `studies` / `claim_study_map` / `relatedSlugs` 派生 `graph_edges`，upsert 去重。

---

## 6. 前端可视化方案（Tech Selection）

| 方案 | 优点 | 缺点 | 推荐度 |
|---|---|---|---|
| `react-force-graph` (3d/2d) | 开箱即用、性能好 | 包较大 | ⭐⭐⭐⭐ |
| `d3-force` + SVG | 完全可控 | 需手写布局 | ⭐⭐⭐ |
| `cytoscape.js` | 图算法强 | API 偏底层 | ⭐⭐⭐ |
| `vis-network` | 简单 | 样式旧 | ⭐⭐ |

**推荐：** `react-force-graph-2d`（基于 Canvas，支持万级节点、力导布局、点击交互）。

### 6.1 交互规格

| 交互 | 行为 |
|---|---|
| Hover 节点 | 高亮邻接边 + 节点 tooltip |
| Click 节点 | 右侧抽屉面板显示详情（label/score/url）+ "在 Explorer 中打开" |
| Click 边 | 显示 relation 类型 + weight |
| 拖拽 | 力导布局实时重排 |
| 缩放/平移 | 标准画布操作 |
| 搜索定位 | 输入实体名 → 居中并放大该节点 |

### 6.2 性能预算

| 指标 | 目标 |
|---|---|
| 首屏节点渲染 | ≤ 500 节点时 < 1s |
| 内存 | 深度=2 时节点 ≤ 200 |
| 后端查询 | `/api/graph/[entity]` ≤ 300ms（depth≤2） |

**大数据策略：** 深度 > 2 时分批懒加载；节点 > 500 时启用聚类（cluster by type）。

---

## 7. 嵌入 Explorer / Claim 页

- Claim 页模块 11（Evidence Graph 入口）：内嵌该 Claim 的 1-hop 子图（见 Explorer PRD）
- Explorer 顶部可加 "Explore Graph" 按钮跳转全屏 Graph 视图（`/graph` 或 `/claim/[slug]#graph`）

---

## 8. 验收标准（Acceptance Criteria）

- [ ] `graph_edges` 表存在，pipeline `build-graph` 能从现有表派生边并 upsert
- [ ] `GET /api/graph/glycine?depth=2` 返回合法 nodes/edges，中心节点为 glycine
- [ ] 前端力导图渲染，hover/click/拖拽交互均生效
- [ ] Click 节点右侧面板显示详情 + 跳转链接
- [ ] 深度=2 查询延迟 ≤ 300ms（生产数据）
- [ ] Claim 页 Evidence Graph 区块展示 1-hop 子图

---

## 9. 排期

- **Week 3：** graph_edges 表 + build-graph pipeline + /api/graph + 前端可视化 MVP
- **Month 2：** 全屏 Graph 探索页 + 搜索定位 + 聚类

---

*EvidenceHub V3 — Module 4 Evidence Graph PRD — 2026-07-07*
