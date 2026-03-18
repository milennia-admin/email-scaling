-- Add list_name column to campaigns for storing which list(s) a campaign was sent to
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS list_name TEXT;
