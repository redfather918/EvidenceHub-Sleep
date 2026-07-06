-- ============================================================
-- EvidenceHub Sleep — Supabase PostgreSQL 初始化脚本
-- 运行方式：在 Supabase Dashboard → SQL Editor 中新建查询，粘贴此脚本并执行
-- ============================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. topics（主题表）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topics (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon        TEXT,
    claim_count INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.topics IS '睡眠科学主题分类（如 Glycine, Magnesium 等）';

-- ============================================================
-- 2. studies（研究论文表）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.studies (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pmid          TEXT UNIQUE,
    doi           TEXT,
    title         TEXT NOT NULL,
    journal       TEXT NOT NULL DEFAULT '',
    authors       TEXT NOT NULL DEFAULT '',
    year          INTEGER,
    sample_size   INTEGER NOT NULL DEFAULT 0,
    duration      TEXT,
    intervention  TEXT,
    outcome       TEXT,
    effect_size   TEXT,
    result        TEXT NOT NULL DEFAULT '',
    study_type    TEXT NOT NULL DEFAULT 'observational',
    population    TEXT,
    url           TEXT,
    strength      INTEGER NOT NULL DEFAULT 3,
    status        TEXT NOT NULL DEFAULT 'new',  -- new | parsed | processed
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.studies IS '从 PubMed 抓取的原始论文数据';

CREATE INDEX IF NOT EXISTS idx_studies_pmid ON public.studies(pmid);
CREATE INDEX IF NOT EXISTS idx_studies_study_type ON public.studies(study_type);
CREATE INDEX IF NOT EXISTS idx_studies_year ON public.studies(year);
CREATE INDEX IF NOT EXISTS idx_studies_status ON public.studies(status);

-- ============================================================
-- 3. claims（核心结论表）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claims (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            TEXT NOT NULL UNIQUE,
    text            TEXT NOT NULL,
    summary         TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'General',
    topic_id        UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    evidence_score  INTEGER NOT NULL DEFAULT 0,
    human_rct_score INTEGER NOT NULL DEFAULT 0,
    meta_score      INTEGER NOT NULL DEFAULT 0,
    mechanism_score INTEGER NOT NULL DEFAULT 0,
    safety_score    INTEGER NOT NULL DEFAULT 0,
    confidence      TEXT NOT NULL DEFAULT 'moderate',  -- high | moderate | low
    rct_count       INTEGER NOT NULL DEFAULT 0,
    meta_count      INTEGER NOT NULL DEFAULT 0,
    study_count     INTEGER NOT NULL DEFAULT 0,
    dose            TEXT,
    population      JSONB NOT NULL DEFAULT '[]'::jsonb,
    limitations     JSONB NOT NULL DEFAULT '[]'::jsonb,
    mechanism       JSONB NOT NULL DEFAULT '[]'::jsonb,
    faq             JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_slugs   JSONB NOT NULL DEFAULT '[]'::jsonb,
    keywords        JSONB NOT NULL DEFAULT '[]'::jsonb,
    contradictions  JSONB NOT NULL DEFAULT '[]'::jsonb,
    effect_size     JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.claims IS '结构化科学结论（Claim Graph 核心节点）';

CREATE INDEX IF NOT EXISTS idx_claims_topic_id ON public.claims(topic_id);
CREATE INDEX IF NOT EXISTS idx_claims_evidence_score ON public.claims(evidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_claims_last_updated ON public.claims(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_claims_confidence ON public.claims(confidence);

-- 全文搜索（可选，Supabase 原生支持）
-- ALTER TABLE public.claims ADD COLUMN search_vector TSVECTOR;
-- CREATE INDEX idx_claims_search ON public.claims USING GIN(search_vector);

-- ============================================================
-- 4. claim_study_map（Claim ↔ Study 关联表）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.claim_study_map (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id        UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    study_id        UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
    strength        TEXT NOT NULL DEFAULT 'moderate',  -- strong | moderate | weak
    effect_direction TEXT NOT NULL DEFAULT 'positive', -- positive | negative | neutral
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(claim_id, study_id)
);

COMMENT ON TABLE public.claim_study_map IS 'Claim 与 Study 之间的证据强度关系';

CREATE INDEX IF NOT EXISTS idx_csm_claim_id ON public.claim_study_map(claim_id);
CREATE INDEX IF NOT EXISTS idx_csm_study_id ON public.claim_study_map(study_id);

-- ============================================================
-- 5. dose_mappings（剂量映射表）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dose_mappings (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id  UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    compound  TEXT NOT NULL,
    dose_range TEXT NOT NULL,
    effect    TEXT NOT NULL,
    optimal   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dose_mappings IS '化合物剂量与效应的映射关系';

CREATE INDEX IF NOT EXISTS idx_dose_claim_id ON public.dose_mappings(claim_id);

-- ============================================================
-- 6. population_fits（人群适配表）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.population_fits (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id  UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,  -- 避免与 SQL 关键字 group 冲突
    fit       TEXT NOT NULL DEFAULT 'check',  -- yes | check | no
    note      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.population_fits IS 'Claim 对不同人群的适用性';

CREATE INDEX IF NOT EXISTS idx_popfit_claim_id ON public.population_fits(claim_id);
CREATE INDEX IF NOT EXISTS idx_popfit_fit ON public.population_fits(fit);

-- ============================================================
-- 7. pipeline_runs（流水线运行日志）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status          TEXT NOT NULL DEFAULT 'running',  -- running | success | failed | partial
    papers_fetched  INTEGER NOT NULL DEFAULT 0,
    claims_extracted INTEGER NOT NULL DEFAULT 0,
    claims_new      INTEGER NOT NULL DEFAULT 0,
    claims_updated  INTEGER NOT NULL DEFAULT 0,
    claims_skipped  INTEGER NOT NULL DEFAULT 0,
    errors_count    INTEGER NOT NULL DEFAULT 0,
    log             TEXT,
    error_message   TEXT,
    dry_run         BOOLEAN NOT NULL DEFAULT FALSE,
    ai_provider     TEXT,
    started_at      TIMESTAMPTZ NOT NULL,
    finished_at     TIMESTAMPTZ
);

COMMENT ON TABLE public.pipeline_runs IS 'Pipeline 每次运行的日志记录，用于监控和调试';

CREATE INDEX IF NOT EXISTS idx_pipeline_started_at ON public.pipeline_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON public.pipeline_runs(status);

-- ============================================================
-- 8. evidence_metrics（证据评分详细记录）—— v2 路线图
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_metrics (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id            UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    rct_count           INTEGER NOT NULL DEFAULT 0,
    meta_count          INTEGER NOT NULL DEFAULT 0,
    human_evidence_score INTEGER NOT NULL DEFAULT 0,
    consistency_score   INTEGER NOT NULL DEFAULT 0,
    effect_size_score   INTEGER NOT NULL DEFAULT 0,
    final_score         INTEGER NOT NULL DEFAULT 0,
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(claim_id)
);

COMMENT ON TABLE public.evidence_metrics IS 'Claim 的综合证据评分详细记录';

CREATE INDEX IF NOT EXISTS idx_evmetrics_claim_id ON public.evidence_metrics(claim_id);

-- ============================================================
-- Row Level Security (RLS) — 默认策略：所有用户可读，仅 service_role 可写
-- ============================================================

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_study_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.population_fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_metrics ENABLE ROW LEVEL SECURITY;

-- 匿名用户/已登录用户：SELECT 所有数据
CREATE POLICY "Allow public read access" ON public.topics
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.studies
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.claims
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.claim_study_map
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.dose_mappings
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.population_fits
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.pipeline_runs
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access" ON public.evidence_metrics
    FOR SELECT TO anon, authenticated USING (true);

-- 注意：INSERT/UPDATE/DELETE 由 service_role key 通过 server 端执行，RLS 默认阻止
-- 如需开放 API 直写，请额外创建 service_role bypass 策略或专用 API key 策略

-- ============================================================
-- 函数：自动更新 claim 的 last_updated
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_claim_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_claim_last_updated ON public.claims;
CREATE TRIGGER trigger_claim_last_updated
    BEFORE UPDATE ON public.claims
    FOR EACH ROW
    EXECUTE FUNCTION public.update_claim_last_updated();

-- ============================================================
-- 函数：自动更新 topic 的 claim_count
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_topic_claim_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.topics
    SET claim_count = (SELECT COUNT(*) FROM public.claims WHERE topic_id = NEW.topic_id)
    WHERE id = NEW.topic_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_topic_claim_count ON public.claims;
CREATE TRIGGER trigger_topic_claim_count
    AFTER INSERT OR UPDATE OR DELETE ON public.claims
    FOR EACH ROW
    EXECUTE FUNCTION public.update_topic_claim_count();

-- ============================================================
-- 完成提示
-- ============================================================
-- 运行后请检查：
-- 1. Tables 是否全部创建（Supabase Table Editor）
-- 2. RLS 策略是否正确（Authentication → Policies）
-- 3. 获取 Project URL 和 Service Role Key（Settings → API）
-- 4. 将 URL 和 Key 配置到腾讯云服务器环境变量
