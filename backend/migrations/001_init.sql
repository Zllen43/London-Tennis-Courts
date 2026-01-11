CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'FULL', 'CLOSED', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS courts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  booking_base_url TEXT NOT NULL,
  borough TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS slot_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  court_id TEXT REFERENCES courts(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status slot_status NOT NULL,
  booking_url TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS slot_snapshots_court_time_idx ON slot_snapshots (court_id, start_time, end_time, captured_at DESC);

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  court_id TEXT REFERENCES courts(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  token TEXT NOT NULL,
  last_notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS alert_subscriptions_token_idx ON alert_subscriptions (token);

CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
