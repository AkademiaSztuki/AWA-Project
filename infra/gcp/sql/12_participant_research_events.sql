-- Append-only research / behavioral events (clicks, page views, ratings metadata, etc.)
-- Apply after core participant schema (see 01_research_schema.sql).

CREATE TABLE IF NOT EXISTS participant_research_events (
  id BIGSERIAL PRIMARY KEY,
  user_hash TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  client_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_research_events_user_created
  ON participant_research_events (user_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participant_research_events_type_created
  ON participant_research_events (event_type, created_at DESC);

COMMENT ON TABLE participant_research_events IS 'Fine-grained research events from the frontend (behavioral logging, page views, ratings).';
