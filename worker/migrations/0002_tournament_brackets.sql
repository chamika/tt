-- Migration: Tournament Brackets
-- Club tournaments (knockout, or groups feeding a knockout) shared by link.
-- The same statements are in schema.sql, which db:migrate:* applies; they are
-- idempotent, so re-running them on an existing database is safe.

-- Tournaments: settings and lifecycle (draft -> in_progress -> completed)
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('knockout', 'groups')),
  seeding_mode TEXT NOT NULL CHECK (seeding_mode IN ('ranking', 'handicap')),
  score_mode TEXT NOT NULL CHECK (score_mode IN ('points', 'games', 'winner')),
  best_of INTEGER NOT NULL,
  group_count INTEGER,
  advance_per_group INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Tournament players: typed in per tournament, with the seed and group from the draw
CREATE TABLE IF NOT EXISTS tournament_players (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ranking INTEGER,
  handicap INTEGER,
  seed INTEGER NOT NULL,
  group_index INTEGER,
  manual_group_rank INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Tournament matches: group round robins and the knockout bracket.
-- A NULL player is still to be decided; source_a/source_b say where they come from.
CREATE TABLE IF NOT EXISTS tournament_matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('group', 'knockout')),
  group_index INTEGER,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  player_a_id TEXT,
  player_b_id TEXT,
  source_a TEXT,
  source_b TEXT,
  next_match_id TEXT,
  next_slot TEXT CHECK (next_slot IN ('a', 'b')),
  is_bye INTEGER NOT NULL DEFAULT 0,
  winner_id TEXT,
  games_a INTEGER,
  games_b INTEGER,
  game_scores TEXT,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
