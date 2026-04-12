-- Migration 013: Composite index for analytics events
-- Optimizes queries that filter by quiz_id, event_type, and created_at

CREATE INDEX IF NOT EXISTS idx_events_composite ON analytics_events (quiz_id, event_type, created_at);
