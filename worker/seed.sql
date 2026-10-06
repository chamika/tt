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
  'https://elttl.interactive.co.uk/teams/view/999',
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
-- Note: is_past is computed dynamically by the API based on match_date
INSERT INTO fixtures (id, team_id, match_date, day_time, home_team, away_team, venue, created_at) VALUES
  ('fixture-future-1', '00000000-0000-0000-0000-000000000000', date('now', '+7 days'), '19:30', 'Test Team E2E', 'Future Team A', 'Home Venue', strftime('%s', 'now')),
  ('fixture-future-2', '00000000-0000-0000-0000-000000000000', date('now', '+14 days'), '20:00', 'Future Team B', 'Test Team E2E', 'Away Venue', strftime('%s', 'now')),
  ('fixture-future-3', '00000000-0000-0000-0000-000000000000', date('now', '+21 days'), '19:45', 'Test Team E2E', 'Future Team C', 'Home Venue', strftime('%s', 'now')),
  ('fixture-past-1', '00000000-0000-0000-0000-000000000000', date('now', '-7 days'), '19:30', 'Past Team A', 'Test Team E2E', 'Away Venue', strftime('%s', 'now')),
  ('fixture-past-2', '00000000-0000-0000-0000-000000000000', date('now', '-14 days'), '20:00', 'Test Team E2E', 'Past Team B', 'Home Venue', strftime('%s', 'now'));

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

-- Demo tournament for manual testing: a draft 4-player handicap knockout
-- Open /tournament/00000000-0000-0000-0000-00000000c0de, then Start it to enter results
DELETE FROM tournament_matches WHERE tournament_id = '00000000-0000-0000-0000-00000000c0de';
DELETE FROM tournament_players WHERE tournament_id = '00000000-0000-0000-0000-00000000c0de';
DELETE FROM tournaments WHERE id = '00000000-0000-0000-0000-00000000c0de';

INSERT INTO tournaments (id, name, format, seeding_mode, score_mode, best_of, group_count, advance_per_group, status, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-00000000c0de', 'Demo Handicap Cup', 'knockout', 'handicap', 'points', 3, NULL, NULL, 'draft', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- Seeded by handicap, most negative first
INSERT INTO tournament_players (id, tournament_id, name, ranking, handicap, seed, group_index, manual_group_rank, created_at) VALUES
  ('demo-player-1', '00000000-0000-0000-0000-00000000c0de', 'Alice Anderson', NULL, -5, 1, NULL, NULL, strftime('%s', 'now') * 1000),
  ('demo-player-2', '00000000-0000-0000-0000-00000000c0de', 'Bob Brown', NULL, 0, 2, NULL, NULL, strftime('%s', 'now') * 1000),
  ('demo-player-3', '00000000-0000-0000-0000-00000000c0de', 'Charlie Chen', NULL, 4, 3, NULL, NULL, strftime('%s', 'now') * 1000),
  ('demo-player-4', '00000000-0000-0000-0000-00000000c0de', 'Diana Davis', NULL, 8, 4, NULL, NULL, strftime('%s', 'now') * 1000);

-- Semi-finals 1v4 and 2v3, winners into the final
INSERT INTO tournament_matches (id, tournament_id, stage, group_index, round, position, player_a_id, player_b_id, source_a, source_b, next_match_id, next_slot, is_bye, winner_id, games_a, games_b, game_scores, completed_at, updated_at) VALUES
  ('demo-sf1', '00000000-0000-0000-0000-00000000c0de', 'knockout', NULL, 1, 0, 'demo-player-1', 'demo-player-4', NULL, NULL, 'demo-final', 'a', 0, NULL, NULL, NULL, NULL, NULL, strftime('%s', 'now') * 1000),
  ('demo-sf2', '00000000-0000-0000-0000-00000000c0de', 'knockout', NULL, 1, 1, 'demo-player-2', 'demo-player-3', NULL, NULL, 'demo-final', 'b', 0, NULL, NULL, NULL, NULL, NULL, strftime('%s', 'now') * 1000),
  ('demo-final', '00000000-0000-0000-0000-00000000c0de', 'knockout', NULL, 2, 0, NULL, NULL, 'winner:demo-sf1', 'winner:demo-sf2', NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, strftime('%s', 'now') * 1000);
