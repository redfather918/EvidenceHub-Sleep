-- ============================================================
-- EvidenceHub Media Factory (EMF) — P1..P3 Schema
-- Migration 00003
--
-- Adds the Media Factory tables on top of the existing EvidenceHub schema.
--   media_plan       (P1)  — the Content Planner's scheduled output
--   media_asset      (P2)  — generated visuals / audio per plan item
--   media_render_job (P3)  — video render manifest + output
--   review_queue     (P4*) — the only human step (Approve/Reject/Edit)
--   publish_queue    (P4*) — per-platform scheduled publishing
-- (*) created now so later phases slot in without a new migration.
-- ============================================================

CREATE TABLE IF NOT EXISTS media_plan (
  id           text PRIMARY KEY,            -- = file_name (unique, stable)
  week_key     text NOT NULL,               -- e.g. 2026-W28
  day_key      text NOT NULL,               -- MON..SUN
  category     text NOT NULL DEFAULT 'fresh',
  pillar       text NOT NULL DEFAULT 'study',
  item         text NOT NULL,
  template     text NOT NULL,               -- question|scientists|myth|ranking|evidence
  template_code text NOT NULL,              -- A..E
  kind         text NOT NULL DEFAULT 'video',
  platforms    jsonb NOT NULL DEFAULT '[]',
  dimension    text NOT NULL DEFAULT 'evergreen', -- evergreen|fresh
  file_name    text NOT NULL,
  claim_slug   text,
  status       text NOT NULL DEFAULT 'planned', -- planned|render|ready|published
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_plan_week ON media_plan (week_key);
CREATE INDEX IF NOT EXISTS idx_media_plan_status ON media_plan (status);

CREATE TABLE IF NOT EXISTS media_asset (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_plan_id text NOT NULL REFERENCES media_plan (id) ON DELETE CASCADE,
  label         text NOT NULL,
  type          text NOT NULL,              -- png|icon|audio|video
  source        text,                       -- url or local path
  status        text NOT NULL DEFAULT 'spec', -- spec|generated|rendered
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_plan_id, label)
);

CREATE TABLE IF NOT EXISTS media_render_job (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_plan_id text NOT NULL REFERENCES media_plan (id) ON DELETE CASCADE,
  script_json   jsonb,
  assets_json   jsonb,
  ffmpeg_command text,
  video_path    text,
  status        text NOT NULL DEFAULT 'manifest', -- manifest|rendered|published
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_plan_id)
);

CREATE TABLE IF NOT EXISTS review_queue (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_plan_id text NOT NULL REFERENCES media_plan (id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|edited
  reviewer      text,
  decision_note text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publish_queue (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_plan_id text NOT NULL REFERENCES media_plan (id) ON DELETE CASCADE,
  platform      text NOT NULL,
  scheduled_for timestamptz,
  status        text NOT NULL DEFAULT 'queued', -- queued|posted|failed
  posted_at     timestamptz,
  url           text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue (status);
CREATE INDEX IF NOT EXISTS idx_publish_queue_platform ON publish_queue (platform, scheduled_for);
