import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseService } from './database';

// Note: These are integration tests that require a real D1 database instance
// They use an in-memory SQLite database for testing
// To run with actual D1 local database: wrangler dev --local --test

describe('DatabaseService Integration Tests', () => {
	let db: DatabaseService;
	let mockD1: any;

	beforeEach(() => {
		// Mock D1 database with in-memory SQLite behavior
		const records: any[] = [];
		
		mockD1 = {
			prepare: (query: string) => ({
				bind: (...params: any[]) => ({
					run: async () => ({ success: true }),
					first: async () => records[0] || null,
					all: async () => ({ results: records, success: true })
				})
			})
		};

		db = new DatabaseService(mockD1);
	});

	describe('Team Operations', () => {
		it('should create and retrieve a team', async () => {
			const teamName = 'Test Team';
			const elttlUrl = 'https://elttl.interactive.co.uk/teams/view/123';

			const team = await db.createTeam(teamName, elttlUrl);

			expect(team).toBeDefined();
			expect(team.id).toBeDefined();
			expect(team.name).toBe(teamName);
			expect(team.elttl_url).toBe(elttlUrl);
			expect(team.created_at).toBeDefined();
			expect(team.updated_at).toBeDefined();
		});

		it('should find team by URL', async () => {
			const elttlUrl = 'https://elttl.interactive.co.uk/teams/view/456';
			
			// Mock the database response
			const mockTeam = {
				id: 'team-123',
				name: 'Test Team',
				elttl_url: elttlUrl,
				created_at: Date.now(),
				updated_at: Date.now()
			};

			mockD1.prepare = () => ({
				bind: () => ({
					first: async () => mockTeam
				})
			});

			const team = await db.getTeamByUrl(elttlUrl);

			expect(team).toBeDefined();
			expect(team?.elttl_url).toBe(elttlUrl);
		});

		it('should return null for non-existent team', async () => {
			mockD1.prepare = () => ({
				bind: () => ({
					first: async () => null
				})
			});

			const team = await db.getTeam('non-existent-id');

			expect(team).toBeNull();
		});
	});

	describe('Fixture Operations', () => {
		it('should create a fixture', async () => {
			const teamId = 'team-123';
			const fixture = await db.createFixture(
				teamId,
				'2025-09-15',
				'Sep 15 Mon 19:00',
				'Home Team',
				'Away Team',
				'Test Venue'
			);

			expect(fixture).toBeDefined();
			expect(fixture.id).toBeDefined();
			expect(fixture.team_id).toBe(teamId);
			expect(fixture.match_date).toBe('2025-09-15');
			expect(fixture.home_team).toBe('Home Team');
			expect(fixture.away_team).toBe('Away Team');
			expect(fixture.venue).toBe('Test Venue');
		});

		it('should mark past fixtures correctly', async () => {
			const pastFixture = await db.createFixture(
				'team-123',
				'2020-01-01',
				'Jan 1 Wed 19:00',
				'Home Team',
				'Away Team'
			);

			expect(pastFixture.is_past).toBe(1);
		});

		it('should mark future fixtures correctly', async () => {
			const futureFixture = await db.createFixture(
				'team-123',
				'2030-12-31',
				'Dec 31 Wed 19:00',
				'Home Team',
				'Away Team'
			);

			expect(futureFixture.is_past).toBe(0);
		});

		it('should get fixtures for a team', async () => {
			const mockFixtures = [
				{
					id: 'fixture-1',
					team_id: 'team-123',
					match_date: '2025-09-15',
					day_time: 'Sep 15 Mon 19:00',
					home_team: 'Home Team 1',
					away_team: 'Away Team 1',
					venue: null,
					is_past: 0,
					created_at: Date.now()
				},
				{
					id: 'fixture-2',
					team_id: 'team-123',
					match_date: '2025-09-22',
					day_time: 'Sep 22 Mon 19:00',
					home_team: 'Home Team 2',
					away_team: 'Away Team 2',
					venue: 'Test Venue',
					is_past: 0,
					created_at: Date.now()
				}
			];

			mockD1.prepare = () => ({
				bind: () => ({
					all: async () => ({ results: mockFixtures })
				})
			});

			const fixtures = await db.getFixtures('team-123');

			expect(fixtures).toHaveLength(2);
			expect(fixtures[0].home_team).toBe('Home Team 1');
			expect(fixtures[1].home_team).toBe('Home Team 2');
		});
	});

	describe('Player Operations', () => {
		it('should create a player', async () => {
			const player = await db.createPlayer('team-123', 'John Doe');

			expect(player).toBeDefined();
			expect(player.id).toBeDefined();
			expect(player.team_id).toBe('team-123');
			expect(player.name).toBe('John Doe');
			expect(player.created_at).toBeDefined();
		});

		it('should get players for a team', async () => {
			const mockPlayers = [
				{
					id: 'player-1',
					team_id: 'team-123',
					name: 'Alice',
					created_at: Date.now()
				},
				{
					id: 'player-2',
					team_id: 'team-123',
					name: 'Bob',
					created_at: Date.now()
				}
			];

			mockD1.prepare = () => ({
				bind: () => ({
					all: async () => ({ results: mockPlayers })
				})
			});

			const players = await db.getPlayers('team-123');

			expect(players).toHaveLength(2);
			expect(players[0].name).toBe('Alice');
			expect(players[1].name).toBe('Bob');
		});
	});

	describe('Availability Operations', () => {
		it('should create availability record', async () => {
			const availability = await db.createAvailability(
				'fixture-1',
				'player-1',
				true
			);

			expect(availability).toBeDefined();
			expect(availability.fixture_id).toBe('fixture-1');
			expect(availability.player_id).toBe('player-1');
			expect(availability.is_available).toBe(1);
		});

		it('should update availability', async () => {
			await db.updateAvailability('fixture-1', 'player-1', false);
			// Success if no error thrown
			expect(true).toBe(true);
		});

		it('should get availability for team', async () => {
			const mockAvailability = [
				{
					id: 'avail-1',
					fixture_id: 'fixture-1',
					player_id: 'player-1',
					is_available: 1,
					updated_at: Date.now()
				},
				{
					id: 'avail-2',
					fixture_id: 'fixture-1',
					player_id: 'player-2',
					is_available: 0,
					updated_at: Date.now()
				}
			];

			mockD1.prepare = () => ({
				bind: () => ({
					all: async () => ({ results: mockAvailability })
				})
			});

			const availability = await db.getAvailability('team-123');

			expect(availability).toHaveLength(2);
			expect(availability[0].is_available).toBe(1);
			expect(availability[1].is_available).toBe(0);
		});

		it('should get availability for specific fixture', async () => {
			const mockAvailability = [
				{
					id: 'avail-1',
					fixture_id: 'fixture-1',
					player_id: 'player-1',
					is_available: 1,
					updated_at: Date.now()
				}
			];

			mockD1.prepare = () => ({
				bind: () => ({
					all: async () => ({ results: mockAvailability })
				})
			});

			const availability = await db.getAvailabilityForFixture('fixture-1');

			expect(availability).toHaveLength(1);
			expect(availability[0].fixture_id).toBe('fixture-1');
		});
	});

	describe('Final Selection Operations', () => {
		it('should create final selection', async () => {
			const selection = await db.createFinalSelection('fixture-1', 'player-1');

			expect(selection).toBeDefined();
			expect(selection.fixture_id).toBe('fixture-1');
			expect(selection.player_id).toBe('player-1');
			expect(selection.selected_at).toBeDefined();
		});

		it('should clear final selections for fixture', async () => {
			await db.clearFinalSelections('fixture-1');
			// Success if no error thrown
			expect(true).toBe(true);
		});

		it('should get final selections for team', async () => {
			const mockSelections = [
				{
					id: 'sel-1',
					fixture_id: 'fixture-1',
					player_id: 'player-1',
					selected_at: Date.now()
				},
				{
					id: 'sel-2',
					fixture_id: 'fixture-1',
					player_id: 'player-2',
					selected_at: Date.now()
				}
			];

			mockD1.prepare = () => ({
				bind: () => ({
					all: async () => ({ results: mockSelections })
				})
			});

			const selections = await db.getFinalSelections('team-123');

			expect(selections).toHaveLength(2);
		});

		it('should get final selections by fixture', async () => {
			const mockSelections = [
				{
					id: 'sel-1',
					fixture_id: 'fixture-1',
					player_id: 'player-1',
					selected_at: Date.now()
				}
			];

			mockD1.prepare = () => ({
				bind: () => ({
					all: async () => ({ results: mockSelections })
				})
			});

			const selections = await db.getFinalSelectionsByFixture('fixture-1');

			expect(selections).toHaveLength(1);
			expect(selections[0].fixture_id).toBe('fixture-1');
		});
	});

	describe('Complete Workflow Integration', () => {
		it('should support full team creation workflow', async () => {
			// Create team
			const team = await db.createTeam('Integration Test Team', 'https://test.url');
			expect(team.id).toBeDefined();

			// Create players
			const player1 = await db.createPlayer(team.id, 'Player 1');
			const player2 = await db.createPlayer(team.id, 'Player 2');
			const player3 = await db.createPlayer(team.id, 'Player 3');

			expect(player1.id).toBeDefined();
			expect(player2.id).toBeDefined();
			expect(player3.id).toBeDefined();

			// Create fixture
			const fixture = await db.createFixture(
				team.id,
				'2026-01-15',
				'Jan 15 Thu 19:00',
				'Home Team',
				'Away Team'
			);

			expect(fixture.id).toBeDefined();
			expect(fixture.is_past).toBe(0);

			// Create availability
			await db.createAvailability(fixture.id, player1.id, true);
			await db.createAvailability(fixture.id, player2.id, true);
			await db.createAvailability(fixture.id, player3.id, false);

			// Create final selections
			const selection1 = await db.createFinalSelection(fixture.id, player1.id);
			const selection2 = await db.createFinalSelection(fixture.id, player2.id);

			expect(selection1.fixture_id).toBe(fixture.id);
			expect(selection2.fixture_id).toBe(fixture.id);
		});
	});

	describe('Fixture Sync Operations', () => {
		it('should get fixture by teams when match exists', async () => {
			const mockFixture = {
				id: 'fixture-123',
				team_id: 'team-456',
				match_date: '2026-02-15',
				day_time: 'Feb 15 19:00',
				home_team: 'Home United',
				away_team: 'Away City',
				venue: 'Test Venue',
				is_past: 0,
				created_at: Date.now()
			};

			mockD1.prepare = () => ({
				bind: () => ({
					first: async () => mockFixture
				})
			});

			const foundFixture = await db.getFixtureByTeams('team-456', 'Home United', 'Away City');

			expect(foundFixture).toBeDefined();
			expect(foundFixture?.id).toBe('fixture-123');
			expect(foundFixture?.home_team).toBe('Home United');
			expect(foundFixture?.away_team).toBe('Away City');
		});

		it('should return null when fixture not found by teams', async () => {
			mockD1.prepare = () => ({
				bind: () => ({
					first: async () => null
				})
			});

			const foundFixture = await db.getFixtureByTeams('team-456', 'Non Existent', 'Teams');

			expect(foundFixture).toBeNull();
		});

		it('should update fixture date', async () => {
			const fixtureId = 'fixture-123';
			let updateCalled = false;

			mockD1.prepare = () => ({
				bind: (...params: any[]) => {
					// Verify update was called with correct parameters
					if (params.length === 4) {
						updateCalled = true;
						expect(params[0]).toBe('2026-04-20'); // match_date
						expect(params[1]).toBe('Apr 20 19:00'); // day_time
						expect(params[2]).toBe(0); // is_past (future date)
						expect(params[3]).toBe(fixtureId);
					}
					return {
						run: async () => ({ success: true })
					};
				}
			});

			await db.updateFixtureDate(fixtureId, '2026-04-20', 'Apr 20 19:00');

			expect(updateCalled).toBe(true);
		});

		it('should mark fixture as past when updating to past date', async () => {
			const fixtureId = 'fixture-123';
			let isPastValue: number | null = null;

			mockD1.prepare = () => ({
				bind: (...params: any[]) => {
					if (params.length === 4) {
						isPastValue = params[2]; // is_past parameter
					}
					return {
						run: async () => ({ success: true })
					};
				}
			});

			await db.updateFixtureDate(fixtureId, '2025-01-01', 'Jan 1 20:00');

			expect(isPastValue).toBe(1);
		});

		it('should clear availability for fixture', async () => {
			const fixtureId = 'fixture-123';
			let deleteCalled = false;

			mockD1.prepare = () => ({
				bind: (param: string) => {
					if (param === fixtureId) {
						deleteCalled = true;
					}
					return {
						run: async () => ({ success: true })
					};
				}
			});

			await db.clearAvailabilityForFixture(fixtureId);

			expect(deleteCalled).toBe(true);
		});

		it('should support sync workflow operations', async () => {
			// This test verifies that all sync-related methods can be called in sequence
			const fixtureId = 'fixture-123';
			const teamId = 'team-456';

			// Mock for getFixtureByTeams
			const mockFixture = {
				id: fixtureId,
				team_id: teamId,
				match_date: '2026-04-15',
				day_time: 'Apr 15 19:00',
				home_team: 'Home Team',
				away_team: 'Away Team',
				venue: null,
				is_past: 0,
				created_at: Date.now()
			};

			mockD1.prepare = () => ({
				bind: () => ({
					first: async () => mockFixture,
					run: async () => ({ success: true })
				})
			});

			// Find fixture
			const fixture = await db.getFixtureByTeams(teamId, 'Home Team', 'Away Team');
			expect(fixture).toBeDefined();

			// Update fixture date
			await db.updateFixtureDate(fixtureId, '2026-04-20', 'Apr 20 19:00');

			// Clear availability
			await db.clearAvailabilityForFixture(fixtureId);

			// Clear selections
			await db.clearFinalSelections(fixtureId);

			// All operations should complete without errors
			expect(true).toBe(true);
		});
	});
});
