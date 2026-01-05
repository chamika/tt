import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from './index';
import * as scraper from './scraper';
import { DatabaseService } from './database';
import type { Team, Fixture, Player } from './types';

// Mock the scraper module
vi.mock('./scraper');

// Mock the DatabaseService
vi.mock('./database');

describe('POST /api/availability/:teamId/sync', () => {
  const mockTeamId = 'team-123';
  const mockElttlUrl = 'https://elttl.interactive.co.uk/teams/view/839';
  
  const mockTeam: Team = {
    id: mockTeamId,
    name: 'Test Team',
    elttl_url: mockElttlUrl,
    created_at: '2024-01-01T00:00:00.000Z'
  };

  const mockPlayers: Player[] = [
    { id: 'player-1', team_id: mockTeamId, name: 'Player A', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 'player-2', team_id: mockTeamId, name: 'Player B', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 'player-3', team_id: mockTeamId, name: 'Player C', created_at: '2024-01-01T00:00:00.000Z' }
  ];

  const mockExistingFixtures: Fixture[] = [
    {
      id: 'fixture-1',
      team_id: mockTeamId,
      match_date: '2026-01-15',
      day_time: 'Jan 15 Wed 18:45',
      home_team: 'Test Team',
      away_team: 'Opposition A',
      venue: undefined,
      is_past: 0,
      created_at: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'fixture-2',
      team_id: mockTeamId,
      match_date: '2026-01-22',
      day_time: 'Jan 22 Wed 18:45',
      home_team: 'Opposition B',
      away_team: 'Test Team',
      venue: undefined,
      is_past: 0,
      created_at: '2024-01-01T00:00:00.000Z'
    }
  ];

  let mockDbInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock database instance
    mockDbInstance = {
      getTeam: vi.fn(),
      getFixtures: vi.fn(),
      getPlayers: vi.fn(),
      getFixtureByTeams: vi.fn(),
      updateFixtureDate: vi.fn(),
      clearAvailabilityForFixture: vi.fn(),
      clearFinalSelections: vi.fn(),
      createAvailability: vi.fn(),
      createFixture: vi.fn()
    };

    // Mock DatabaseService constructor
    vi.mocked(DatabaseService).mockImplementation(function(this: any) {
      return mockDbInstance;
    } as any);

    // Default mock implementations
    mockDbInstance.getTeam.mockResolvedValue(mockTeam);
    mockDbInstance.getFixtures.mockResolvedValue(mockExistingFixtures);
    mockDbInstance.getPlayers.mockResolvedValue(mockPlayers);
  });

  it('should return success when there are no fixture date changes', async () => {
    // Mock scraped data with same dates as existing fixtures
    const scrapedData = {
      teamName: 'Test Team',
      players: ['Player A', 'Player B', 'Player C'],
      fixtures: [
        {
          date: 'Jan 15',
          time: 'Wed 18:45',
          homeTeam: 'Test Team',
          awayTeam: 'Opposition A',
          venue: undefined
        },
        {
          date: 'Jan 22',
          time: 'Wed 18:45',
          homeTeam: 'Opposition B',
          awayTeam: 'Test Team',
          venue: undefined
        }
      ]
    };

    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(scrapedData);

    // Mock getFixtureByTeams to return existing fixtures
    mockDbInstance.getFixtureByTeams
      .mockResolvedValueOnce(mockExistingFixtures[0])
      .mockResolvedValueOnce(mockExistingFixtures[1]);

    const req = new Request(`http://localhost/api/availability/${mockTeamId}/sync`, {
      method: 'POST'
    });

    const res = await app.fetch(req, { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      fixtures_updated: 0,
      fixtures_unchanged: 2,
      fixtures_new: 0,
      updated_fixture_ids: [],
      message: 'All fixtures are up to date'
    });

    // Verify no updates were made
    expect(mockDbInstance.updateFixtureDate).not.toHaveBeenCalled();
    expect(mockDbInstance.clearAvailabilityForFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.clearFinalSelections).not.toHaveBeenCalled();
  });

  it('should update availability when there is one fixture date change', async () => {
    // Mock scraped data with one date changed
    const scrapedData = {
      teamName: 'Test Team',
      players: ['Player A', 'Player B', 'Player C'],
      fixtures: [
        {
          date: 'Jan 16', // Changed from Jan 15
          time: 'Thu 19:00', // Changed time too
          homeTeam: 'Test Team',
          awayTeam: 'Opposition A',
          venue: undefined
        },
        {
          date: 'Jan 22',
          time: 'Wed 18:45',
          homeTeam: 'Opposition B',
          awayTeam: 'Test Team',
          venue: undefined
        }
      ]
    };

    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(scrapedData);

    // Mock getFixtureByTeams to return existing fixtures
    mockDbInstance.getFixtureByTeams
      .mockResolvedValueOnce(mockExistingFixtures[0])
      .mockResolvedValueOnce(mockExistingFixtures[1]);

    const req = new Request(`http://localhost/api/availability/${mockTeamId}/sync`, {
      method: 'POST'
    });

    const res = await app.fetch(req, { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      fixtures_updated: 1,
      fixtures_unchanged: 1,
      fixtures_new: 0,
      updated_fixture_ids: ['fixture-1'],
      message: 'Sync completed: 1 updated, 0 new, 1 unchanged'
    });

    // Verify update was made for the changed fixture
    expect(mockDbInstance.updateFixtureDate).toHaveBeenCalledTimes(1);
    expect(mockDbInstance.updateFixtureDate).toHaveBeenCalledWith(
      'fixture-1',
      '2026-01-16',
      'Jan 16 Thu 19:00'
    );

    // Verify availability was cleared and reinitialized
    expect(mockDbInstance.clearAvailabilityForFixture).toHaveBeenCalledTimes(1);
    expect(mockDbInstance.clearAvailabilityForFixture).toHaveBeenCalledWith('fixture-1');
    expect(mockDbInstance.clearFinalSelections).toHaveBeenCalledTimes(1);
    expect(mockDbInstance.clearFinalSelections).toHaveBeenCalledWith('fixture-1');

    // Verify availability was created for all players (3 players)
    expect(mockDbInstance.createAvailability).toHaveBeenCalledTimes(3);
    expect(mockDbInstance.createAvailability).toHaveBeenCalledWith('fixture-1', 'player-1', false);
    expect(mockDbInstance.createAvailability).toHaveBeenCalledWith('fixture-1', 'player-2', false);
    expect(mockDbInstance.createAvailability).toHaveBeenCalledWith('fixture-1', 'player-3', false);
  });

  it('should update availability when there are 2 fixture date changes', async () => {
    // Mock scraped data with both dates changed
    const scrapedData = {
      teamName: 'Test Team',
      players: ['Player A', 'Player B', 'Player C'],
      fixtures: [
        {
          date: 'Jan 16', // Changed from Jan 15
          time: 'Thu 19:00',
          homeTeam: 'Test Team',
          awayTeam: 'Opposition A',
          venue: undefined
        },
        {
          date: 'Jan 23', // Changed from Jan 22
          time: 'Thu 18:45',
          homeTeam: 'Opposition B',
          awayTeam: 'Test Team',
          venue: undefined
        }
      ]
    };

    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(scrapedData);

    // Mock getFixtureByTeams to return existing fixtures
    mockDbInstance.getFixtureByTeams
      .mockResolvedValueOnce(mockExistingFixtures[0])
      .mockResolvedValueOnce(mockExistingFixtures[1]);

    const req = new Request(`http://localhost/api/availability/${mockTeamId}/sync`, {
      method: 'POST'
    });

    const res = await app.fetch(req, { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      fixtures_updated: 2,
      fixtures_unchanged: 0,
      fixtures_new: 0,
      updated_fixture_ids: ['fixture-1', 'fixture-2'],
      message: 'Sync completed: 2 updated, 0 new, 0 unchanged'
    });

    // Verify updates were made for both fixtures
    expect(mockDbInstance.updateFixtureDate).toHaveBeenCalledTimes(2);
    expect(mockDbInstance.updateFixtureDate).toHaveBeenCalledWith(
      'fixture-1',
      '2026-01-16',
      'Jan 16 Thu 19:00'
    );
    expect(mockDbInstance.updateFixtureDate).toHaveBeenCalledWith(
      'fixture-2',
      '2026-01-23',
      'Jan 23 Thu 18:45'
    );

    // Verify availability was cleared for both fixtures
    expect(mockDbInstance.clearAvailabilityForFixture).toHaveBeenCalledTimes(2);
    expect(mockDbInstance.clearFinalSelections).toHaveBeenCalledTimes(2);

    // Verify availability was created for all players for both fixtures (3 players × 2 fixtures = 6 calls)
    expect(mockDbInstance.createAvailability).toHaveBeenCalledTimes(6);
  });

  it('should return error when the ELTTL URL call fails', async () => {
    // Mock scraper to throw an error
    vi.mocked(scraper.scrapeELTTLTeam).mockRejectedValue(
      new Error('Failed to fetch from ELTTL')
    );

    const req = new Request(`http://localhost/api/availability/${mockTeamId}/sync`, {
      method: 'POST'
    });

    const res = await app.fetch(req, { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({
      error: 'Failed to fetch from ELTTL'
    });

    // Verify no database updates were made
    expect(mockDbInstance.updateFixtureDate).not.toHaveBeenCalled();
    expect(mockDbInstance.clearAvailabilityForFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.clearFinalSelections).not.toHaveBeenCalled();
    expect(mockDbInstance.createAvailability).not.toHaveBeenCalled();
  });

  it('should return 404 when team is not found', async () => {
    mockDbInstance.getTeam.mockResolvedValue(null);

    const req = new Request(`http://localhost/api/availability/${mockTeamId}/sync`, {
      method: 'POST'
    });

    const res = await app.fetch(req, { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({
      error: 'Team not found'
    });

    // Verify scraper was never called
    expect(scraper.scrapeELTTLTeam).not.toHaveBeenCalled();
  });

  it('should create new fixtures when scraped fixtures do not exist', async () => {
    // Mock scraped data with a new fixture
    const scrapedData = {
      teamName: 'Test Team',
      players: ['Player A', 'Player B', 'Player C'],
      fixtures: [
        {
          date: 'Jan 15',
          time: 'Wed 18:45',
          homeTeam: 'Test Team',
          awayTeam: 'Opposition A',
          venue: undefined
        },
        {
          date: 'Jan 29', // New fixture
          time: 'Wed 18:45',
          homeTeam: 'Test Team',
          awayTeam: 'Opposition C',
          venue: 'VENUE1'
        }
      ]
    };

    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(scrapedData);

    // Mock getFixtureByTeams: first returns existing, second returns null (new)
    mockDbInstance.getFixtureByTeams
      .mockResolvedValueOnce(mockExistingFixtures[0])
      .mockResolvedValueOnce(null);

    const newFixture: Fixture = {
      id: 'fixture-3',
      team_id: mockTeamId,
      match_date: '2026-01-29',
      day_time: 'Jan 29 Wed 18:45',
      home_team: 'Test Team',
      away_team: 'Opposition C',
      venue: 'VENUE1',
      is_past: 0,
      created_at: '2024-01-01T00:00:00.000Z'
    };

    mockDbInstance.createFixture.mockResolvedValue(newFixture);

    const req = new Request(`http://localhost/api/availability/${mockTeamId}/sync`, {
      method: 'POST'
    });

    const res = await app.fetch(req, { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      fixtures_updated: 0,
      fixtures_unchanged: 1,
      fixtures_new: 1,
      updated_fixture_ids: [],
      message: 'Sync completed: 1 new fixtures added, 1 unchanged'
    });

    // Verify new fixture was created
    expect(mockDbInstance.createFixture).toHaveBeenCalledTimes(1);
    expect(mockDbInstance.createFixture).toHaveBeenCalledWith(
      mockTeamId,
      '2026-01-29',
      'Jan 29 Wed 18:45',
      'Test Team',
      'Opposition C',
      'VENUE1'
    );

    // Verify availability was initialized for all players for the new fixture
    expect(mockDbInstance.createAvailability).toHaveBeenCalledTimes(3);
    expect(mockDbInstance.createAvailability).toHaveBeenCalledWith('fixture-3', 'player-1', false);
    expect(mockDbInstance.createAvailability).toHaveBeenCalledWith('fixture-3', 'player-2', false);
    expect(mockDbInstance.createAvailability).toHaveBeenCalledWith('fixture-3', 'player-3', false);
  });
});
