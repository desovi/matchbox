-- Create bracket_type enum
CREATE TYPE bracket_type AS ENUM (
  'hanul_aa',
  'hanul_ab',
  'hanul_team',
  'tournament',
  'kdk',
  'random'
);

-- Create brackets table
CREATE TABLE brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bracket_type bracket_type NOT NULL,
  edit_key UUID NOT NULL DEFAULT gen_random_uuid(),
  participant_count INTEGER NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  seed_config JSONB,
  settings JSONB
);

-- Enable RLS
ALTER TABLE brackets ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can view brackets)
CREATE POLICY "Brackets are viewable by everyone"
  ON brackets FOR SELECT
  USING (true);

-- Insert/update only with service role or via API with edit_key (handled in app)
CREATE POLICY "Brackets are insertable by anon"
  ON brackets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Brackets are updatable by anon"
  ON brackets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index for common lookups
CREATE INDEX idx_brackets_created_at ON brackets(created_at DESC);
CREATE INDEX idx_brackets_edit_key ON brackets(edit_key);
