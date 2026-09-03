-- Initial schema: signals (contact/inquiry submissions) and visits (analytics).
-- Table names follow the naval theme: tables as "vessels".

-- Unified signal model: contact form (type=contact) or studio inquiry (type=inquiry).
CREATE TABLE IF NOT EXISTS signals (
    id           BIGSERIAL PRIMARY KEY,
    type         TEXT NOT NULL CHECK (type IN ('contact', 'inquiry')),
    name         TEXT NOT NULL,
    email        TEXT NOT NULL,
    company      TEXT,
    service      TEXT,
    message      TEXT NOT NULL,
    source_page  TEXT,
    locale       TEXT NOT NULL DEFAULT 'en',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signals_type ON signals (type);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals (created_at);

-- Basic page visit analytics.
CREATE TABLE IF NOT EXISTS visits (
    id          BIGSERIAL PRIMARY KEY,
    path        TEXT NOT NULL,
    locale      TEXT NOT NULL DEFAULT 'en',
    referrer    TEXT,
    user_agent  TEXT,
    visited_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_path ON visits (path);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits (visited_at);