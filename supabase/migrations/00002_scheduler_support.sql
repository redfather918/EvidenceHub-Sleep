-- ============================================================
-- EvidenceHub Sleep — Migration 00002: Scheduler Support
-- Adds newsletter_subscribers table and studies.status column
-- for the pipeline scheduler system.
-- ============================================================

-- ============================================================
-- Newsletter subscribers table (for Job 7: weekly newsletter)
-- ============================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  status          VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, unsubscribed, bounced
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- ============================================================
-- Studies status column (for Job 1→2 pipeline: NEW → PARSED)
-- ============================================================

-- Add status column to studies table for tracking pipeline state
-- Values: 'new' (just fetched), 'parsed' (AI extraction done), 'error'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studies' AND column_name = 'pipeline_status'
  ) THEN
    ALTER TABLE studies ADD COLUMN pipeline_status VARCHAR(50) NOT NULL DEFAULT 'new';
    CREATE INDEX idx_studies_pipeline_status ON studies(pipeline_status);
  END IF;
END $$;

-- ============================================================
-- Claims update tracking (for Job 4: revalidate only changed pages)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'needs_revalidation'
  ) THEN
    ALTER TABLE claims ADD COLUMN needs_revalidation BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
