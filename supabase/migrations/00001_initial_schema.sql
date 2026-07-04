-- ============================================================
-- EvidenceHub Sleep — Initial Schema Migration
-- 15-table Knowledge Graph for PostgreSQL (Supabase)
-- Sprint 1: Database Schema — Architecture Freeze
--
-- This migration creates the complete production database schema.
-- All future Sprints (API, UI, AI Engine, Auto-update) depend on this.
-- ============================================================

-- Enable UUID extension (Supabase has this by default, but be explicit)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE study_type AS ENUM (
  'rct',
  'meta',
  'systematic',
  'observational',
  'animal',
  'trial'
);

CREATE TYPE evidence_strength AS ENUM (
  'strong',
  'moderate',
  'weak'
);

CREATE TYPE effect_direction AS ENUM (
  'positive',
  'negative',
  'neutral'
);

CREATE TYPE confidence_level AS ENUM (
  'high',
  'moderate',
  'low'
);

CREATE TYPE population_fit_level AS ENUM (
  'yes',
  'check',
  'no'
);

CREATE TYPE content_channel AS ENUM (
  'web',
  'faq',
  'podcast',
  'video',
  'twitter',
  'linkedin',
  'newsletter'
);

CREATE TYPE content_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE pipeline_status AS ENUM (
  'running',
  'success',
  'failed',
  'partial'
);

CREATE TYPE api_key_status AS ENUM (
  'active',
  'suspended',
  'revoked'
);

CREATE TYPE api_tier AS ENUM (
  'free',
  'pro',
  'enterprise'
);

-- ============================================================
-- 1. TOPICS — Hierarchical topic tree
-- ============================================================

CREATE TABLE topics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        VARCHAR(255),
  claim_count INTEGER NOT NULL DEFAULT 0,
  seo_title   VARCHAR(255),
  seo_desc    TEXT,
  parent_id   UUID REFERENCES topics(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_topics_parent_id ON topics(parent_id);

-- ============================================================
-- 2. CLAIMS — Core entity (v2 upgraded)
-- ============================================================

CREATE TABLE claims (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              VARCHAR(255) NOT NULL UNIQUE,
  text              TEXT NOT NULL,
  summary           TEXT NOT NULL,
  category          VARCHAR(255) NOT NULL DEFAULT 'General',
  topic_id          UUID REFERENCES topics(id) ON DELETE SET NULL,

  -- Evidence scoring
  evidence_score    INTEGER NOT NULL DEFAULT 0,
  confidence        confidence_level NOT NULL DEFAULT 'moderate',

  -- Study counts (denormalized)
  rct_count         INTEGER NOT NULL DEFAULT 0,
  meta_count        INTEGER NOT NULL DEFAULT 0,
  study_count       INTEGER NOT NULL DEFAULT 0,

  -- v2 upgraded fields
  dose              VARCHAR(255),
  dose_range        VARCHAR(255),
  dose_optimal      VARCHAR(255),
  population        TEXT[] NOT NULL DEFAULT '{}',
  limitations       TEXT[] NOT NULL DEFAULT '{}',
  mechanism         TEXT[] NOT NULL DEFAULT '{}',
  keywords          TEXT[] NOT NULL DEFAULT '{}',
  contradictions    TEXT[] NOT NULL DEFAULT '{}',
  effect_size       JSONB,
  related_slugs     TEXT[] NOT NULL DEFAULT '{}',

  -- SEO
  seo_title         VARCHAR(255),
  seo_desc          TEXT,

  -- Timestamps
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_topic_id ON claims(topic_id);
CREATE INDEX idx_claims_evidence_score_desc ON claims(evidence_score DESC);
CREATE INDEX idx_claims_category ON claims(category);

-- ============================================================
-- 3. STUDIES — Research papers (PubMed)
-- ============================================================

CREATE TABLE studies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pmid          VARCHAR(50) UNIQUE,
  doi           VARCHAR(255) UNIQUE,
  title         TEXT NOT NULL,
  abstract      TEXT,
  journal       VARCHAR(255) NOT NULL DEFAULT '',
  authors       TEXT NOT NULL DEFAULT '',
  year          INTEGER,
  sample_size   INTEGER NOT NULL DEFAULT 0,
  duration      VARCHAR(255),
  intervention  TEXT,
  outcome       TEXT,
  effect_size   VARCHAR(255),
  result        TEXT NOT NULL DEFAULT '',
  study_type    study_type NOT NULL DEFAULT 'rct',
  population    TEXT,
  url           TEXT,
  strength      INTEGER NOT NULL DEFAULT 3,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studies_pmid ON studies(pmid);
CREATE INDEX idx_studies_doi ON studies(doi);
CREATE INDEX idx_studies_study_type ON studies(study_type);
CREATE INDEX idx_studies_year_desc ON studies(year DESC);

-- ============================================================
-- 4. CLAIM_STUDY_MAP — Graded relationship
-- ============================================================

CREATE TABLE claim_study_map (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id        UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  study_id        UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  strength        evidence_strength NOT NULL DEFAULT 'moderate',
  effect_direction effect_direction NOT NULL DEFAULT 'positive',
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(claim_id, study_id)
);

CREATE INDEX idx_claim_study_map_claim_id ON claim_study_map(claim_id);
CREATE INDEX idx_claim_study_map_study_id ON claim_study_map(study_id);
CREATE INDEX idx_claim_study_map_effect_direction ON claim_study_map(effect_direction);

-- ============================================================
-- 5. EVIDENCE_METRICS — 6-dimensional scoring (computed)
-- ============================================================

CREATE TABLE evidence_metrics (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id              UUID NOT NULL UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
  rct_count             INTEGER NOT NULL DEFAULT 0,
  meta_count            INTEGER NOT NULL DEFAULT 0,
  cohort_count          INTEGER NOT NULL DEFAULT 0,
  animal_count          INTEGER NOT NULL DEFAULT 0,
  human_evidence_score  INTEGER NOT NULL DEFAULT 0,
  consistency_score     INTEGER NOT NULL DEFAULT 0,
  effect_size_score     INTEGER NOT NULL DEFAULT 0,
  mechanism_score       INTEGER NOT NULL DEFAULT 0,
  safety_score          INTEGER NOT NULL DEFAULT 0,
  final_score           INTEGER NOT NULL DEFAULT 0,
  contradiction_penalty INTEGER NOT NULL DEFAULT 0,
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. DOSE_MAPPINGS — Dose-response data
-- ============================================================

CREATE TABLE dose_mappings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id    UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  compound    VARCHAR(255) NOT NULL,
  dose_range  VARCHAR(255) NOT NULL,
  effect      TEXT NOT NULL,
  optimal     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_dose_mappings_claim_id ON dose_mappings(claim_id);

-- ============================================================
-- 7. POPULATION_FITS — Population suitability
-- ============================================================

CREATE TABLE population_fits (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id  UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  "group"   VARCHAR(255) NOT NULL,
  fit       population_fit_level NOT NULL DEFAULT 'check',
  note      TEXT
);

CREATE INDEX idx_population_fits_claim_id ON population_fits(claim_id);
CREATE INDEX idx_population_fits_fit ON population_fits(fit);

-- ============================================================
-- 8. FAQS — Normalized FAQ items
-- ============================================================

CREATE TABLE faqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id    UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faqs_claim_id ON faqs(claim_id);

-- ============================================================
-- 9. PRODUCTS — Affiliate products
-- ============================================================

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  brand           VARCHAR(255) NOT NULL DEFAULT '',
  asin            VARCHAR(50) UNIQUE,
  iherb_id        VARCHAR(50),
  url             TEXT,
  image_url       TEXT,
  price           DOUBLE PRECISION,
  currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
  form            VARCHAR(100),
  dose_per_serving VARCHAR(255),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_asin ON products(asin);
CREATE INDEX idx_products_brand ON products(brand);

-- ============================================================
-- 10. CLAIM_PRODUCTS — Claim-Product mapping
-- ============================================================

CREATE TABLE claim_products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id    UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reason      TEXT,
  match_score INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(claim_id, product_id)
);

CREATE INDEX idx_claim_products_claim_id ON claim_products(claim_id);
CREATE INDEX idx_claim_products_product_id ON claim_products(product_id);

-- ============================================================
-- 11. CONTENT_ASSETS — Multi-channel content ecosystem
-- ============================================================

CREATE TABLE content_assets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id     UUID REFERENCES claims(id) ON DELETE CASCADE,
  channel      content_channel NOT NULL,
  title        VARCHAR(500) NOT NULL,
  body         TEXT NOT NULL,
  url          TEXT,
  status       content_status NOT NULL DEFAULT 'draft',
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_content_assets_claim_id ON content_assets(claim_id);
CREATE INDEX idx_content_assets_channel ON content_assets(channel);
CREATE INDEX idx_content_assets_status ON content_assets(status);
CREATE INDEX idx_content_assets_published_at_desc ON content_assets(published_at DESC);

-- ============================================================
-- 12. REFERENCES — External citations
-- ============================================================

CREATE TABLE references (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id   UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  study_id   UUID REFERENCES studies(id) ON DELETE SET NULL,
  type       VARCHAR(50) NOT NULL DEFAULT 'pubmed',
  title      TEXT NOT NULL,
  url        TEXT NOT NULL,
  citation   TEXT,
  pmid       VARCHAR(50),
  doi        VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_references_claim_id ON references(claim_id);
CREATE INDEX idx_references_pmid ON references(pmid);

-- ============================================================
-- 13. PIPELINE_RUNS — Auto-update execution logs
-- ============================================================

CREATE TABLE pipeline_runs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status            pipeline_status NOT NULL DEFAULT 'running',
  papers_fetched    INTEGER NOT NULL DEFAULT 0,
  claims_extracted  INTEGER NOT NULL DEFAULT 0,
  claims_new        INTEGER NOT NULL DEFAULT 0,
  claims_updated    INTEGER NOT NULL DEFAULT 0,
  claims_skipped    INTEGER NOT NULL DEFAULT 0,
  errors_count      INTEGER NOT NULL DEFAULT 0,
  log               TEXT,
  error_message     TEXT,
  dry_run           BOOLEAN NOT NULL DEFAULT true,
  ai_provider       VARCHAR(100),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ
);

CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_started_at_desc ON pipeline_runs(started_at DESC);

-- ============================================================
-- 14. API_KEYS — API key management for monetization
-- ============================================================

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_hash        VARCHAR(255) NOT NULL UNIQUE,
  key_prefix      VARCHAR(50) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  tier            api_tier NOT NULL DEFAULT 'free',
  status          api_key_status NOT NULL DEFAULT 'active',
  daily_limit     INTEGER NOT NULL DEFAULT 100,
  requests_today  INTEGER NOT NULL DEFAULT 0,
  reset_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_api_keys_tier ON api_keys(tier);

-- ============================================================
-- 15. API_USAGE_LOGS — API usage tracking
-- ============================================================

CREATE TABLE api_usage_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id     UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint       TEXT NOT NULL,
  method         VARCHAR(10) NOT NULL DEFAULT 'GET',
  status_code    INTEGER NOT NULL,
  response_time  INTEGER NOT NULL,
  ip_address     VARCHAR(100),
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_logs_created_at_desc ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);

-- ============================================================
-- UPDATED_AT TRIGGERS — Auto-update updated_at on row change
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studies_updated_at
  BEFORE UPDATE ON studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Supabase best practice
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_study_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE population_fits ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE references ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for content tables (SEO requirement)
-- Write access controlled by service role key (pipeline/backend only)
CREATE POLICY "public_read_topics" ON topics FOR SELECT USING (true);
CREATE POLICY "public_read_claims" ON claims FOR SELECT USING (true);
CREATE POLICY "public_read_studies" ON studies FOR SELECT USING (true);
CREATE POLICY "public_read_claim_study_map" ON claim_study_map FOR SELECT USING (true);
CREATE POLICY "public_read_evidence_metrics" ON evidence_metrics FOR SELECT USING (true);
CREATE POLICY "public_read_dose_mappings" ON dose_mappings FOR SELECT USING (true);
CREATE POLICY "public_read_population_fits" ON population_fits FOR SELECT USING (true);
CREATE POLICY "public_read_faqs" ON faqs FOR SELECT USING (true);
CREATE POLICY "public_read_products" ON products FOR SELECT USING (true);
CREATE POLICY "public_read_claim_products" ON claim_products FOR SELECT USING (true);
CREATE POLICY "public_read_content_assets" ON content_assets FOR SELECT USING (status = 'published');
CREATE POLICY "public_read_references" ON references FOR SELECT USING (true);

-- ============================================================
-- COMMENTS — Documentation
-- ============================================================

COMMENT ON TABLE topics IS 'Hierarchical topic tree for organizing claims (e.g., Supplements > Glycine)';
COMMENT ON TABLE claims IS 'Core entity: a single evidence-backed health claim with scoring';
COMMENT ON TABLE studies IS 'Research papers fetched from PubMed with metadata';
COMMENT ON TABLE claim_study_map IS 'Many-to-many relationship between claims and studies with graded strength';
COMMENT ON TABLE evidence_metrics IS '6-dimensional evidence scoring breakdown per claim';
COMMENT ON TABLE dose_mappings IS 'Dose-response data mapping compounds to effects';
COMMENT ON TABLE population_fits IS 'Population suitability for each claim (yes/check/no)';
COMMENT ON TABLE faqs IS 'Normalized FAQ items (one per row) for SEO and user guidance';
COMMENT ON TABLE products IS 'Affiliate products (Amazon, iHerb) with pricing and form info';
COMMENT ON TABLE claim_products IS 'Claim-Product mapping with match score and recommendation reason';
COMMENT ON TABLE content_assets IS 'Multi-channel content ecosystem (web, FAQ, podcast, video, social, newsletter)';
COMMENT ON TABLE references IS 'External citations linking claims to sources';
COMMENT ON TABLE pipeline_runs IS 'Execution logs for the auto-update pipeline';
COMMENT ON TABLE api_keys IS 'API key management for monetization tiers (free/pro/enterprise)';
COMMENT ON TABLE api_usage_logs IS 'Per-request API usage tracking for rate limiting and analytics';
