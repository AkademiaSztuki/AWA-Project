-- Snapshot of client "Pobierz swoje dane (JSON)" (thanks page) for research backup.
ALTER TABLE participants ADD COLUMN IF NOT EXISTS session_export_json JSONB;
