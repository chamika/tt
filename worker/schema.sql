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
  is_past INTEGER DEFAULT 0,
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

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_fixtures_team_id ON fixtures(team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_match_date ON fixtures(match_date);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_availability_fixture_id ON availability(fixture_id);
CREATE INDEX IF NOT EXISTS idx_availability_player_id ON availability(player_id);
CREATE INDEX IF NOT EXISTS idx_final_selections_fixture_id ON final_selections(fixture_id);
CREATE INDEX IF NOT EXISTS idx_final_selections_player_id ON final_selections(player_id);
