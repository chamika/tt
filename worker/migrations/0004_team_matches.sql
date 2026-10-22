-- Migration: Team Match Card
-- A league-style team match (two teams of three, 10 rubbers) shared by link.
-- New tables only; the same statements are in schema.sql, which db:migrate:*
-- applies. They are idempotent, so re-running them is safe.

-- Team matches: one league-style fixture between two teams of three, scored like
-- the ELTTL match card (9 singles + 1 doubles). Players are kept by position:
-- home_players is [A, B, C] and away_players is [X, Y, Z], as JSON arrays of names.
CREATE TABLE IF NOT EXISTS team_matches (
  id TEXT PRIMARY KEY,
  title TEXT,
  match_date TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_players TEXT NOT NULL,
  away_players TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Team match rubbers: one row per rubber with a result (1-10). In game_scores
-- 'a' is the home side. The pairs (e.g. 'AB', 'XZ') are set for the doubles only.
CREATE TABLE IF NOT EXISTS team_match_rubbers (
  match_id TEXT NOT NULL,
  number INTEGER NOT NULL CHECK (number BETWEEN 1 AND 10),
  game_scores TEXT NOT NULL,
  home_games INTEGER NOT NULL,
  away_games INTEGER NOT NULL,
  winner TEXT NOT NULL CHECK (winner IN ('home', 'away')),
  home_pair TEXT,
  away_pair TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (match_id, number),
  FOREIGN KEY (match_id) REFERENCES team_matches(id) ON DELETE CASCADE
);
