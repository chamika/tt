-- Seed data for E2E tests
-- Test Team ID: 00000000-0000-0000-0000-000000000000

-- Clean up existing test data
DELETE FROM final_selections WHERE fixture_id IN (SELECT id FROM fixtures WHERE team_id = '00000000-0000-0000-0000-000000000000');
DELETE FROM availability WHERE fixture_id IN (SELECT id FROM fixtures WHERE team_id = '00000000-0000-0000-0000-000000000000');
DELETE FROM fixtures WHERE team_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM players WHERE team_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM teams WHERE id = '00000000-0000-0000-0000-000000000000';

-- Insert test team
INSERT INTO teams (id, name, elttl_url, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Test Team E2E',
  'https://www.elttl.co.uk/Availability.aspx?FixtureId=0&TeamId=999',
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- Insert test players
INSERT INTO players (id, team_id, name, created_at) VALUES
  ('player-1', '00000000-0000-0000-0000-000000000000', 'Alice Anderson', strftime('%s', 'now')),
  ('player-2', '00000000-0000-0000-0000-000000000000', 'Bob Brown', strftime('%s', 'now')),
  ('player-3', '00000000-0000-0000-0000-000000000000', 'Charlie Chen', strftime('%s', 'now')),
  ('player-4', '00000000-0000-0000-0000-000000000000', 'Diana Davis', strftime('%s', 'now')),
  ('player-5', '00000000-0000-0000-0000-000000000000', 'Eve Evans', strftime('%s', 'now')),
  ('player-6', '00000000-0000-0000-0000-000000000000', 'Frank Foster', strftime('%s', 'now'));

-- Insert fixtures (3 future, 2 past)
INSERT INTO fixtures (id, team_id, match_date, day_time, home_team, away_team, venue, is_past, created_at) VALUES
  ('fixture-future-1', '00000000-0000-0000-0000-000000000000', date('now', '+7 days'), '19:30', 'Test Team E2E', 'Future Team A', 'Home Venue', 0, strftime('%s', 'now')),
  ('fixture-future-2', '00000000-0000-0000-0000-000000000000', date('now', '+14 days'), '20:00', 'Future Team B', 'Test Team E2E', 'Away Venue', 0, strftime('%s', 'now')),
  ('fixture-future-3', '00000000-0000-0000-0000-000000000000', date('now', '+21 days'), '19:45', 'Test Team E2E', 'Future Team C', 'Home Venue', 0, strftime('%s', 'now')),
  ('fixture-past-1', '00000000-0000-0000-0000-000000000000', date('now', '-7 days'), '19:30', 'Past Team A', 'Test Team E2E', 'Away Venue', 1, strftime('%s', 'now')),
  ('fixture-past-2', '00000000-0000-0000-0000-000000000000', date('now', '-14 days'), '20:00', 'Test Team E2E', 'Past Team B', 'Home Venue', 1, strftime('%s', 'now'));

-- Initialize availability for all fixtures (all players available)
INSERT INTO availability (id, fixture_id, player_id, is_available, updated_at) VALUES
  -- Future fixture 1
  ('avail-f1-p1', 'fixture-future-1', 'player-1', 1, strftime('%s', 'now')),
  ('avail-f1-p2', 'fixture-future-1', 'player-2', 1, strftime('%s', 'now')),
  ('avail-f1-p3', 'fixture-future-1', 'player-3', 1, strftime('%s', 'now')),
  ('avail-f1-p4', 'fixture-future-1', 'player-4', 1, strftime('%s', 'now')),
  ('avail-f1-p5', 'fixture-future-1', 'player-5', 1, strftime('%s', 'now')),
  ('avail-f1-p6', 'fixture-future-1', 'player-6', 1, strftime('%s', 'now')),
  -- Future fixture 2
  ('avail-f2-p1', 'fixture-future-2', 'player-1', 1, strftime('%s', 'now')),
  ('avail-f2-p2', 'fixture-future-2', 'player-2', 1, strftime('%s', 'now')),
  ('avail-f2-p3', 'fixture-future-2', 'player-3', 1, strftime('%s', 'now')),
  ('avail-f2-p4', 'fixture-future-2', 'player-4', 0, strftime('%s', 'now')),
  ('avail-f2-p5', 'fixture-future-2', 'player-5', 0, strftime('%s', 'now')),
  ('avail-f2-p6', 'fixture-future-2', 'player-6', 1, strftime('%s', 'now')),
  -- Future fixture 3
  ('avail-f3-p1', 'fixture-future-3', 'player-1', 1, strftime('%s', 'now')),
  ('avail-f3-p2', 'fixture-future-3', 'player-2', 1, strftime('%s', 'now')),
  ('avail-f3-p3', 'fixture-future-3', 'player-3', 0, strftime('%s', 'now')),
  ('avail-f3-p4', 'fixture-future-3', 'player-4', 0, strftime('%s', 'now')),
  ('avail-f3-p5', 'fixture-future-3', 'player-5', 0, strftime('%s', 'now')),
  ('avail-f3-p6', 'fixture-future-3', 'player-6', 0, strftime('%s', 'now')),
  -- Past fixture 1
  ('avail-p1-p1', 'fixture-past-1', 'player-1', 1, strftime('%s', 'now')),
  ('avail-p1-p2', 'fixture-past-1', 'player-2', 1, strftime('%s', 'now')),
  ('avail-p1-p3', 'fixture-past-1', 'player-3', 1, strftime('%s', 'now')),
  ('avail-p1-p4', 'fixture-past-1', 'player-4', 1, strftime('%s', 'now')),
  ('avail-p1-p5', 'fixture-past-1', 'player-5', 0, strftime('%s', 'now')),
  ('avail-p1-p6', 'fixture-past-1', 'player-6', 0, strftime('%s', 'now')),
  -- Past fixture 2
  ('avail-p2-p1', 'fixture-past-2', 'player-1', 1, strftime('%s', 'now')),
  ('avail-p2-p2', 'fixture-past-2', 'player-2', 1, strftime('%s', 'now')),
  ('avail-p2-p3', 'fixture-past-2', 'player-3', 1, strftime('%s', 'now')),
  ('avail-p2-p4', 'fixture-past-2', 'player-4', 0, strftime('%s', 'now')),
  ('avail-p2-p5', 'fixture-past-2', 'player-5', 1, strftime('%s', 'now')),
  ('avail-p2-p6', 'fixture-past-2', 'player-6', 1, strftime('%s', 'now'));

-- Add selections for past fixtures
INSERT INTO final_selections (id, fixture_id, player_id, selected_at) VALUES
  ('selection-p1-1', 'fixture-past-1', 'player-1', strftime('%s', 'now')),
  ('selection-p1-2', 'fixture-past-1', 'player-2', strftime('%s', 'now')),
  ('selection-p1-3', 'fixture-past-1', 'player-3', strftime('%s', 'now')),
  ('selection-p2-1', 'fixture-past-2', 'player-1', strftime('%s', 'now')),
  ('selection-p2-2', 'fixture-past-2', 'player-2', strftime('%s', 'now')),
  ('selection-p2-3', 'fixture-past-2', 'player-3', strftime('%s', 'now'));
