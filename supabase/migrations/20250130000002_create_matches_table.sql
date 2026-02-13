-- Create match_status enum
CREATE TYPE match_status AS ENUM (
  'pending',
  'in_progress',
  'completed'
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  court INTEGER NOT NULL,
  team1_players TEXT[] NOT NULL DEFAULT '{}',
  team2_players TEXT[] NOT NULL DEFAULT '{}',
  team1_score INTEGER,
  team2_score INTEGER,
  status match_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Matches are viewable by everyone
CREATE POLICY "Matches are viewable by everyone"
  ON matches FOR SELECT
  USING (true);

-- Matches are insertable/updatable (edit_key validated in app)
CREATE POLICY "Matches are insertable by anon"
  ON matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Matches are updatable by anon"
  ON matches FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Matches are deletable by anon"
  ON matches FOR DELETE
  USING (true);

-- Indexes
CREATE INDEX idx_matches_bracket_id ON matches(bracket_id);
CREATE INDEX idx_matches_bracket_round ON matches(bracket_id, round);
