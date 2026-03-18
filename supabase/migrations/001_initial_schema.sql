-- ============================================================
-- Milennia Email Dashboard - Initial Schema
-- Designed to unify: ActiveCampaign, GoHighLevel, Hyros, Monday.com
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE CONTACT RECORD (source-agnostic master record)
-- ============================================================
CREATE TABLE contacts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             TEXT NOT NULL UNIQUE,
  first_name        TEXT,
  last_name         TEXT,
  phone             TEXT,
  organization      TEXT,
  title             TEXT,
  -- Aggregate financial + engagement tracking
  lifetime_value    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  lead_score        INTEGER NOT NULL DEFAULT 0,
  -- Subscription state
  is_subscribed     BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at   TIMESTAMPTZ,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_email ON contacts (email);

-- ============================================================
-- SOURCE TRACKING
-- Tracks which external systems know about a contact
-- and stores the foreign key into that system.
-- ============================================================
CREATE TABLE contact_sources (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  source_type   TEXT NOT NULL CHECK (source_type IN ('activecampaign', 'gohighlevel', 'hyros', 'monday')),
  external_id   TEXT NOT NULL,      -- ID in the source system
  raw_data      JSONB,              -- full API response for future parsing
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_type, external_id)
);

CREATE INDEX idx_contact_sources_contact_id ON contact_sources (contact_id);
CREATE INDEX idx_contact_sources_source ON contact_sources (source_type, external_id);

-- ============================================================
-- TAGS
-- Normalized tag table — tags can originate from any source.
-- ============================================================
CREATE TABLE tags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL UNIQUE,
  source_type   TEXT CHECK (source_type IN ('activecampaign', 'gohighlevel', 'manual')),
  external_id   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contact_tags (
  contact_id    UUID NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  tag_id        UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  tagged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX idx_contact_tags_contact_id ON contact_tags (contact_id);
CREATE INDEX idx_contact_tags_tag_id ON contact_tags (tag_id);

-- ============================================================
-- EMAIL LISTS (ActiveCampaign)
-- ============================================================
CREATE TABLE lists (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id       TEXT NOT NULL UNIQUE,
  source_type       TEXT NOT NULL DEFAULT 'activecampaign',
  name              TEXT NOT NULL,
  subscriber_count  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contact_lists (
  contact_id        UUID NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  list_id           UUID NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  status            TEXT CHECK (status IN ('active', 'unsubscribed', 'bounced', 'pending')),
  subscribed_at     TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  PRIMARY KEY (contact_id, list_id)
);

CREATE INDEX idx_contact_lists_contact_id ON contact_lists (contact_id);
CREATE INDEX idx_contact_lists_list_id ON contact_lists (list_id);

-- ============================================================
-- CAMPAIGNS (ActiveCampaign, extensible to others)
-- Stores both metadata and denormalized aggregate stats
-- for fast dashboard queries without repeated AC API calls.
-- ============================================================
CREATE TABLE campaigns (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id         TEXT NOT NULL UNIQUE,
  source_type         TEXT NOT NULL DEFAULT 'activecampaign',
  name                TEXT NOT NULL,
  subject             TEXT,
  from_name           TEXT,
  from_email          TEXT,
  -- Status: draft | scheduled | sending | paused | sent
  status              TEXT CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'sent')),
  type                TEXT,           -- single, recurring, split, automation
  send_date           TIMESTAMPTZ,
  -- Aggregate stats (denormalized from ActiveCampaign)
  total_sent          INTEGER NOT NULL DEFAULT 0,
  total_opens         INTEGER NOT NULL DEFAULT 0,
  unique_opens        INTEGER NOT NULL DEFAULT 0,
  total_clicks        INTEGER NOT NULL DEFAULT 0,
  unique_clicks       INTEGER NOT NULL DEFAULT 0,
  bounces             INTEGER NOT NULL DEFAULT 0,
  unsubscribes        INTEGER NOT NULL DEFAULT 0,
  forwards            INTEGER NOT NULL DEFAULT 0,
  -- Computed rates stored for fast querying (0.2543 = 25.43%)
  open_rate           NUMERIC(6, 4),
  click_rate          NUMERIC(6, 4),
  bounce_rate         NUMERIC(6, 4),
  unsubscribe_rate    NUMERIC(6, 4),
  -- Raw payload for future parsing/backfill
  raw_data            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns (status);
CREATE INDEX idx_campaigns_send_date ON campaigns (send_date DESC);
CREATE INDEX idx_campaigns_source ON campaigns (source_type, external_id);

-- ============================================================
-- CAMPAIGN → CONTACT (per-contact engagement per campaign)
-- One row per (campaign, contact) pair.
-- ============================================================
CREATE TABLE campaign_contacts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id       UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  contact_id        UUID NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  -- Per-contact engagement flags
  opened            BOOLEAN NOT NULL DEFAULT false,
  clicked           BOOLEAN NOT NULL DEFAULT false,
  bounced           BOOLEAN NOT NULL DEFAULT false,
  unsubscribed      BOOLEAN NOT NULL DEFAULT false,
  open_count        INTEGER NOT NULL DEFAULT 0,
  click_count       INTEGER NOT NULL DEFAULT 0,
  first_opened_at   TIMESTAMPTZ,
  last_opened_at    TIMESTAMPTZ,
  first_clicked_at  TIMESTAMPTZ,
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX idx_campaign_contacts_campaign_id ON campaign_contacts (campaign_id);
CREATE INDEX idx_campaign_contacts_contact_id ON campaign_contacts (contact_id);

-- ============================================================
-- EMAIL EVENTS (granular event log — the engagement history)
-- Each open, click, bounce, etc. is one row here.
-- ============================================================
CREATE TABLE email_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES campaigns (id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL CHECK (
    event_type IN ('sent', 'open', 'click', 'bounce', 'unsubscribe', 'forward', 'spam_report')
  ),
  event_url     TEXT,           -- populated for click events
  ip_address    TEXT,
  user_agent    TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL,
  external_id   TEXT,           -- event ID from the source system (dedup)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_events_contact_id ON email_events (contact_id);
CREATE INDEX idx_email_events_campaign_id ON email_events (campaign_id);
CREATE INDEX idx_email_events_occurred_at ON email_events (occurred_at DESC);
CREATE INDEX idx_email_events_event_type ON email_events (event_type);

-- ============================================================
-- GOHIGHLEVEL: PIPELINES & OPPORTUNITIES
-- ============================================================
CREATE TABLE pipelines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT NOT NULL UNIQUE,
  source_type   TEXT NOT NULL DEFAULT 'gohighlevel',
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id   UUID NOT NULL REFERENCES pipelines (id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  position      INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE opportunities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id       TEXT NOT NULL UNIQUE,
  contact_id        UUID REFERENCES contacts (id) ON DELETE SET NULL,
  pipeline_id       UUID REFERENCES pipelines (id) ON DELETE SET NULL,
  stage_id          UUID REFERENCES pipeline_stages (id) ON DELETE SET NULL,
  name              TEXT,
  status            TEXT CHECK (status IN ('open', 'won', 'lost', 'abandoned')),
  monetary_value    NUMERIC(12, 2),
  lead_source       TEXT,
  assigned_to       TEXT,
  closed_at         TIMESTAMPTZ,
  raw_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_contact_id ON opportunities (contact_id);
CREATE INDEX idx_opportunities_pipeline_id ON opportunities (pipeline_id);
CREATE INDEX idx_opportunities_status ON opportunities (status);

-- ============================================================
-- HYROS: AD ATTRIBUTION
-- Links ad spend / lead source to a contact record.
-- ============================================================
CREATE TABLE ad_attributions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id       TEXT UNIQUE,
  contact_id        UUID REFERENCES contacts (id) ON DELETE SET NULL,
  lead_source       TEXT,           -- e.g. 'facebook', 'google', 'instagram'
  ad_campaign       TEXT,
  ad_set            TEXT,
  ad_name           TEXT,
  click_date        TIMESTAMPTZ,
  conversion_date   TIMESTAMPTZ,
  revenue           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- UTM parameters
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  utm_content       TEXT,
  utm_term          TEXT,
  raw_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ad_attributions_contact_id ON ad_attributions (contact_id);
CREATE INDEX idx_ad_attributions_lead_source ON ad_attributions (lead_source);
CREATE INDEX idx_ad_attributions_conversion_date ON ad_attributions (conversion_date DESC);

-- ============================================================
-- MONDAY.COM: TASKS / PROJECT ITEMS
-- Optional link to a contact or opportunity.
-- ============================================================
CREATE TABLE monday_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id       TEXT NOT NULL UNIQUE,
  board_id          TEXT,
  board_name        TEXT,
  group_name        TEXT,
  item_name         TEXT NOT NULL,
  status            TEXT,
  assigned_to       TEXT[],
  contact_id        UUID REFERENCES contacts (id) ON DELETE SET NULL,
  opportunity_id    UUID REFERENCES opportunities (id) ON DELETE SET NULL,
  due_date          DATE,
  raw_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monday_items_contact_id ON monday_items (contact_id);

-- ============================================================
-- SYNC LOGS
-- Records every sync run for auditing and scheduling.
-- ============================================================
CREATE TABLE sync_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type         TEXT NOT NULL,
  sync_type           TEXT NOT NULL,   -- 'campaigns', 'contacts', 'events', etc.
  status              TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  records_processed   INTEGER NOT NULL DEFAULT 0,
  records_upserted    INTEGER NOT NULL DEFAULT 0,
  error_message       TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Authenticated users (single-user dashboard) can read all.
-- Service role (sync API routes) can write everything.
-- ============================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monday_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated read policies
DO $$ DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'contacts','contact_sources','tags','contact_tags','lists','contact_lists',
    'campaigns','campaign_contacts','email_events','pipelines','pipeline_stages',
    'opportunities','ad_attributions','monday_items','sync_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "authenticated_read" ON %I FOR SELECT TO authenticated USING (true)', t
    );
    EXECUTE format(
      'CREATE POLICY "service_role_all" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update on row modification)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['contacts','lists','campaigns','opportunities','monday_items'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t
    );
  END LOOP;
END $$;
