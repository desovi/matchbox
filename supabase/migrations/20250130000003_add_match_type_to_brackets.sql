-- Add match_type enum
CREATE TYPE match_type AS ENUM ('singles', 'doubles');

-- Add match_type column to brackets (default 'doubles' for existing rows)
ALTER TABLE brackets
  ADD COLUMN match_type match_type NOT NULL DEFAULT 'doubles';

-- Optional: backfill existing rows if needed (already default above)
-- UPDATE brackets SET match_type = 'doubles' WHERE match_type IS NULL;
