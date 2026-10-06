-- ELTTL Availability Tracker Database Schema
-- Cloudflare D1 Database

-- Teams table: stores team information imported from ELTTL
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  elttl_url TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Fixtures table: stores match fixtures for each team
CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  match_date TEXT NOT NULL,
  day_time TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  venue TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Players table: stores player information for each team
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Availability table: tracks player availability for each fixture
CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE(fixture_id, player_id)
);

-- Final selections table: stores the final 3 players selected for each fixture
CREATE TABLE IF NOT EXISTS final_selections (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  selected_at INTEGER NOT NULL,
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE(fixture_id, player_id)
);

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

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_fixtures_team_id ON fixtures(team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_match_date ON fixtures(match_date);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_availability_fixture_id ON availability(fixture_id);
CREATE INDEX IF NOT EXISTS idx_availability_player_id ON availability(player_id);
CREATE INDEX IF NOT EXISTS idx_final_selections_fixture_id ON final_selections(fixture_id);
CREATE INDEX IF NOT EXISTS idx_final_selections_player_id ON final_selections(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament_id ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
