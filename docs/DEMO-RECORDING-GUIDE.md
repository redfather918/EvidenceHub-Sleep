# EvidenceHub Sleep — Demo 录屏指南

## 录制前准备

### 1. 启动本地服务
```bash
cd evidencehub-sleep
npm run build
npx next start -p 3000
```
服务地址: `http://localhost:3000`

### 2. 浏览器准备
- 使用 **Chrome**，关闭所有无关标签页
- 缩放设为 **110%** 或 **125%**（让文字更清晰）
- 安装 JSON Formatter 扩展（可选，demo-api 页面已自带美化）
- 地址栏隐藏：F11 全屏或使用简洁窗口

### 3. 录屏工具
- **Windows**: Win+G (Game Bar) / OBS Studio / Loom
- **推荐分辨率**: 1920×1080
- **帧率**: 30fps 足够

---

## 录屏脚本（15-30 秒）

### 第一幕：首页首屏（0-5 秒）

**操作**:
1. 浏览器打开 `http://localhost:3000/`
2. 停留 2 秒，让观众看到首屏文案：
   > **"466 条睡眠证据，每条都有科学可信度评分"**
   > "给人看的证据库，也是给 AI 用的 API。"
3. 鼠标缓慢向下滚动一点，露出统计数字（Claims / Studies / Topics / Human RCTs）

**要点**: 让观众一眼明白这是什么 — 睡眠证据库 + 有评分 + 有 API

---

### 第二幕：Claim 详情页（5-15 秒）

**操作**:
1. 点击首页中的 **"甘氨酸助眠？"** 按钮（或直接访问 `http://localhost:3000/claim/glycine-sleep-latency`）
2. 停留 2 秒展示 Claim 标题和评分徽章：
   > Evidence Score: **91** | Confidence: **High**
3. 缓慢向下滚动，展示：
   - 推荐剂量（3g）
   - 适用人群（Healthy adults / Mild sleep complaints）
   - 支撑研究列表（RCT 标记 + PubMed 链接）
   - 机制链（Mechanism）

**要点**: 证明每条 Claim 都有真实科学证据支撑，不是空话

---

### 第三幕：API 调用展示（15-25 秒）

**操作**:
1. 新开标签页或直接地址栏输入：`http://localhost:3000/demo-api`
2. 展示美化后的 JSON 响应：
   ```json
   {
     "slug": "glycine-sleep-latency",
     "text": "Glycine reduces sleep latency in human RCTs",
     "confidence": 91,
     "confidenceLevel": "high",
     "rcts": 3,
     "dose": "3g",
     "population": ["Healthy adults", "Adults with mild sleep complaints"],
     "evidenceScore": 91
   }
   ```
3. 停留 2 秒，让观众看到下方的字段解读卡片
4. 可选：也展示原始 API `http://localhost:3000/api/claim/glycine-sleep-latency`（浏览器原生 JSON 显示）

**要点**: 证明"给 AI 用的 API"是真的 — 结构化 JSON，AI 可以直接消费

---

### 第四幕：CTA 结尾画面（25-30 秒）

**操作**:
1. 访问 `http://localhost:3000/demo`
2. 停留在深色渐变 CTA 画面：
   > **"Sleep Evidence, Scored."**
   > 466+ Claims | 15+ Studies | 8 Topics | 3 API Endpoints
   > 
   > [Explore Evidence →] [API for AI]
3. 保持 3-4 秒静止

**要点**: 清晰的品牌收尾，留 CTA 按钮给观众点击冲动

---

## 录制技巧

| 技巧 | 说明 |
|------|------|
| 不要说话 | 纯画面 + 字幕更专业，后期加配音/字幕 |
| 鼠标移动要慢 | 观众需要时间理解画面内容 |
| 每个画面停 2-3 秒 | 不要急着切换，让信息沉淀 |
| 用键盘快捷键 | Ctrl+L 聚焦地址栏，比鼠标点击更快 |
| 录完不剪辑 | 自然流畅 > 精致剪辑，保留真实感 |

## 快速 URL 速查表

| 时间段 | 页面 | URL |
|--------|------|-----|
| 0-5s | 首页 | `localhost:3000/` |
| 5-15s | Claim详情 | `localhost:3000/claim/glycine-sleep-latency` |
| 15-25s | API JSON | `localhost:3000/demo-api` |
| 25-30s | CTA结尾 | `localhost:3000/demo` |

## 备用 Claim 页面（如果 glycine 不够吸引）

- `localhost:3000/claim/melatonin-sleep-latency` — 褪黑素缩短入睡时间
- `localhost:3000/claim/magnesium-sleep-quality` — 镁改善睡眠质量
- `localhost:3000/claim/exercise-sleep-quality` — 运动改善睡眠

## 备用 API 端点

- `localhost:3000/api/claim/glycine-sleep-latency` — 单条 Claim JSON
- `localhost:3000/api/evidence/glycine` — 话题级聚合证据
- `localhost:3000/api/search?q=melatonin` — 搜索 API
