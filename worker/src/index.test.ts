import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from './index';
import * as scraper from './scraper';
import { DatabaseService } from './database';
import type { Team, FixtureRow, Player, ScrapedTeamData } from './types';

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
    created_at: 1704067200000,
    updated_at: 1704067200000
  };

  const mockPlayers: Player[] = [
    { id: 'player-1', team_id: mockTeamId, name: 'Player A', created_at: 1704067200000 },
    { id: 'player-2', team_id: mockTeamId, name: 'Player B', created_at: 1704067200000 },
    { id: 'player-3', team_id: mockTeamId, name: 'Player C', created_at: 1704067200000 }
  ];

  const allPlayerIds = ['player-1', 'player-2', 'player-3'];

  const mockExistingFixtures: FixtureRow[] = [
    {
      id: 'fixture-1',
      team_id: mockTeamId,
      match_date: '2026-01-15',
      day_time: 'Jan 15 Wed 18:45',
      home_team: 'Test Team',
      away_team: 'Opposition A',
      venue: null,
      created_at: 1704067200000
    },
    {
      id: 'fixture-2',
      team_id: mockTeamId,
      match_date: '2026-01-22',
      day_time: 'Jan 22 Wed 18:45',
      home_team: 'Opposition B',
      away_team: 'Test Team',
      venue: null,
      created_at: 1704067200000
    }
  ];

  // Scraped counterparts of the two stored fixtures, unchanged
  const scrapedFixture1 = {
    date: 'Jan 15',
    time: 'Wed 18:45',
    homeTeam: 'Test Team',
    awayTeam: 'Opposition A',
    venue: undefined
  };
  const scrapedFixture2 = {
    date: 'Jan 22',
    time: 'Wed 18:45',
    homeTeam: 'Opposition B',
    awayTeam: 'Test Team',
    venue: undefined
  };

  function scrapedData(fixtures: ScrapedTeamData['fixtures']): ScrapedTeamData {
    return {
      teamName: 'Test Team',
      players: ['Player A', 'Player B', 'Player C'],
      fixtures
    };
  }

  function syncRequest(body?: Record<string, unknown>): Request {
    return new Request(`http://localhost/api/availability/${mockTeamId}/sync`, {
      method: 'POST',
      ...(body
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {})
    });
  }

  let mockDbInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // parseMatchDate infers the year from "now", so pin the clock to mid-season
    // and keep the hard-coded 2026 fixture dates meaningful
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-01-05T12:00:00Z'));

    // Setup mock database instance
    mockDbInstance = {
      getTeam: vi.fn(),
      getFixtures: vi.fn(),
      getFixtureDataCounts: vi.fn(),
      getPlayers: vi.fn(),
      updateFixtureDate: vi.fn(),
      clearAvailabilityForFixture: vi.fn(),
      clearFinalSelections: vi.fn(),
      createAvailability: vi.fn(),
      createFixture: vi.fn(),
      batchUpdateFixture: vi.fn(),
      batchCreateFixtureWithAvailability: vi.fn(),
      batchDeleteFixtures: vi.fn()
    };

    // Mock DatabaseService constructor
    vi.mocked(DatabaseService).mockImplementation(function(this: any) {
      return mockDbInstance;
    } as any);

    // Default mock implementations
    mockDbInstance.getTeam.mockResolvedValue(mockTeam);
    mockDbInstance.getFixtures.mockResolvedValue(mockExistingFixtures);
    mockDbInstance.getFixtureDataCounts.mockResolvedValue(new Map());
    mockDbInstance.getPlayers.mockResolvedValue(mockPlayers);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return success when there are no fixture date changes', async () => {
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(
      scrapedData([scrapedFixture1, scrapedFixture2])
    );

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      dry_run: false,
      fixtures_updated: 0,
      fixtures_unchanged: 2,
      fixtures_new: 0,
      fixtures_deleted: 0,
      updated_fixture_ids: [],
      plan: { new: [], updated: [], deleted: [], unchanged_count: 2 },
      message: 'All fixtures are up to date'
    });

    // Verify no updates were made
    expect(mockDbInstance.batchUpdateFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.batchCreateFixtureWithAvailability).not.toHaveBeenCalled();
    expect(mockDbInstance.batchDeleteFixtures).not.toHaveBeenCalled();
  });

  it('should update availability when there is one fixture date change', async () => {
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(
      scrapedData([
        { ...scrapedFixture1, date: 'Jan 16', time: 'Thu 19:00' }, // Changed date and time
        scrapedFixture2
      ])
    );

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.fixtures_updated).toBe(1);
    expect(json.fixtures_unchanged).toBe(1);
    expect(json.fixtures_deleted).toBe(0);
    expect(json.updated_fixture_ids).toEqual(['fixture-1']);
    expect(json.message).toBe('Sync completed: 1 updated, 1 unchanged');
    expect(json.plan.updated).toEqual([
      {
        id: 'fixture-1',
        home_team: 'Test Team',
        away_team: 'Opposition A',
        old_match_date: '2026-01-15',
        old_day_time: 'Jan 15 Wed 18:45',
        new_match_date: '2026-01-16',
        new_day_time: 'Jan 16 Thu 19:00',
        available_count: 0,
        selected_count: 0
      }
    ]);

    // Verify batch update was made for the changed fixture
    expect(mockDbInstance.batchUpdateFixture).toHaveBeenCalledTimes(1);
    expect(mockDbInstance.batchUpdateFixture).toHaveBeenCalledWith(
      'fixture-1',
      '2026-01-16',
      'Jan 16 Thu 19:00',
      allPlayerIds
    );

    // Verify individual methods were not called (we use batch now)
    expect(mockDbInstance.updateFixtureDate).not.toHaveBeenCalled();
    expect(mockDbInstance.clearAvailabilityForFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.clearFinalSelections).not.toHaveBeenCalled();
    expect(mockDbInstance.createAvailability).not.toHaveBeenCalled();
  });

  it('should update availability when there are 2 fixture date changes', async () => {
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(
      scrapedData([
        { ...scrapedFixture1, date: 'Jan 16', time: 'Thu 19:00' }, // Changed from Jan 15
        { ...scrapedFixture2, date: 'Jan 23', time: 'Thu 18:45' } // Changed from Jan 22
      ])
    );

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.fixtures_updated).toBe(2);
    expect(json.fixtures_unchanged).toBe(0);
    expect(json.fixtures_deleted).toBe(0);
    expect(json.updated_fixture_ids).toEqual(['fixture-1', 'fixture-2']);
    expect(json.message).toBe('Sync completed: 2 updated, 0 unchanged');

    // Verify batch updates were made for both fixtures
    expect(mockDbInstance.batchUpdateFixture).toHaveBeenCalledTimes(2);
    expect(mockDbInstance.batchUpdateFixture).toHaveBeenCalledWith(
      'fixture-1',
      '2026-01-16',
      'Jan 16 Thu 19:00',
      allPlayerIds
    );
    expect(mockDbInstance.batchUpdateFixture).toHaveBeenCalledWith(
      'fixture-2',
      '2026-01-23',
      'Jan 23 Thu 18:45',
      allPlayerIds
    );

    // Verify individual methods were not called (we use batch now)
    expect(mockDbInstance.updateFixtureDate).not.toHaveBeenCalled();
    expect(mockDbInstance.clearAvailabilityForFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.clearFinalSelections).not.toHaveBeenCalled();
    expect(mockDbInstance.createAvailability).not.toHaveBeenCalled();
  });

  it('should return error when the ELTTL URL call fails', async () => {
    // Mock scraper to throw an error
    vi.mocked(scraper.scrapeELTTLTeam).mockRejectedValue(
      new Error('Failed to fetch from ELTTL')
    );

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({
      error: 'Failed to fetch from ELTTL'
    });

    // Verify no database updates were made
    expect(mockDbInstance.batchUpdateFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.batchCreateFixtureWithAvailability).not.toHaveBeenCalled();
    expect(mockDbInstance.batchDeleteFixtures).not.toHaveBeenCalled();
  });

  it('should return 404 when team is not found', async () => {
    mockDbInstance.getTeam.mockResolvedValue(null);

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({
      error: 'Team not found'
    });

    // Verify scraper was never called
    expect(scraper.scrapeELTTLTeam).not.toHaveBeenCalled();
  });

  it('should create new fixtures when scraped fixtures do not exist', async () => {
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(
      scrapedData([
        scrapedFixture1,
        scrapedFixture2,
        {
          date: 'Jan 29', // New fixture
          time: 'Wed 18:45',
          homeTeam: 'Test Team',
          awayTeam: 'Opposition C',
          venue: 'VENUE1'
        }
      ])
    );

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.fixtures_new).toBe(1);
    expect(json.fixtures_unchanged).toBe(2);
    expect(json.fixtures_deleted).toBe(0);
    expect(json.message).toBe('Sync completed: 1 new, 2 unchanged');
    expect(json.plan.new).toEqual([
      {
        match_date: '2026-01-29',
        day_time: 'Jan 29 Wed 18:45',
        home_team: 'Test Team',
        away_team: 'Opposition C',
        venue: 'VENUE1'
      }
    ]);

    // Verify batch create was called for the new fixture
    expect(mockDbInstance.batchCreateFixtureWithAvailability).toHaveBeenCalledTimes(1);
    expect(mockDbInstance.batchCreateFixtureWithAvailability).toHaveBeenCalledWith(
      mockTeamId,
      '2026-01-29',
      'Jan 29 Wed 18:45',
      'Test Team',
      'Opposition C',
      'VENUE1',
      allPlayerIds
    );

    // Verify individual methods were not called (we use batch now)
    expect(mockDbInstance.createFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.createAvailability).not.toHaveBeenCalled();
  });

  it('should delete fixtures that are no longer listed on ELTTL', async () => {
    // ELTTL now lists only the first fixture
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(scrapedData([scrapedFixture1]));
    mockDbInstance.getFixtureDataCounts.mockResolvedValue(
      new Map([['fixture-2', { available: 2, selected: 3 }]])
    );

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.fixtures_deleted).toBe(1);
    expect(json.fixtures_unchanged).toBe(1);
    expect(json.message).toBe('Sync completed: 1 deleted, 1 unchanged');
    expect(json.plan.deleted).toEqual([
      {
        id: 'fixture-2',
        match_date: '2026-01-22',
        day_time: 'Jan 22 Wed 18:45',
        home_team: 'Opposition B',
        away_team: 'Test Team',
        is_past: 0,
        available_count: 2,
        selected_count: 3
      }
    ]);

    expect(mockDbInstance.batchDeleteFixtures).toHaveBeenCalledTimes(1);
    expect(mockDbInstance.batchDeleteFixtures).toHaveBeenCalledWith(['fixture-2']);
  });

  it('should replace the whole schedule when ELTTL lists a different set of matches', async () => {
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(
      scrapedData([
        {
          date: 'Feb 4',
          time: 'Wed 19:00',
          homeTeam: 'Test Team',
          awayTeam: 'Opposition X',
          venue: undefined
        },
        {
          date: 'Feb 11',
          time: 'Wed 19:00',
          homeTeam: 'Opposition Y',
          awayTeam: 'Test Team',
          venue: undefined
        }
      ])
    );

    const res = await app.fetch(syncRequest(), { DB: {} as any });
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.fixtures_new).toBe(2);
    expect(json.fixtures_deleted).toBe(2);
    expect(json.fixtures_unchanged).toBe(0);
    expect(json.message).toBe('Sync completed: 2 new, 2 deleted, 0 unchanged');

    expect(mockDbInstance.batchCreateFixtureWithAvailability).toHaveBeenCalledTimes(2);
    expect(mockDbInstance.batchDeleteFixtures).toHaveBeenCalledWith(['fixture-1', 'fixture-2']);
  });

  it('should report the plan without writing anything when dryRun is set', async () => {
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(
      scrapedData([
        { ...scrapedFixture1, date: 'Jan 16', time: 'Thu 19:00' },
        {
          date: 'Jan 29',
          time: 'Wed 18:45',
          homeTeam: 'Test Team',
          awayTeam: 'Opposition C',
          venue: 'VENUE1'
        }
      ])
    );

    const res = await app.fetch(syncRequest({ dryRun: true }), { DB: {} as any });
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.dry_run).toBe(true);
    expect(json.fixtures_new).toBe(1);
    expect(json.fixtures_updated).toBe(1);
    expect(json.fixtures_deleted).toBe(1);
    expect(json.fixtures_unchanged).toBe(0);
    expect(json.message).toBe('Pending changes: 1 new, 1 updated, 1 deleted, 0 unchanged');
    expect(json.plan.new).toHaveLength(1);
    expect(json.plan.updated).toHaveLength(1);
    expect(json.plan.deleted[0].id).toBe('fixture-2');

    // Nothing at all is written during a dry run
    expect(mockDbInstance.batchCreateFixtureWithAvailability).not.toHaveBeenCalled();
    expect(mockDbInstance.batchUpdateFixture).not.toHaveBeenCalled();
    expect(mockDbInstance.batchDeleteFixtures).not.toHaveBeenCalled();
    expect(mockDbInstance.getPlayers).not.toHaveBeenCalled();
  });

  it('should apply the sync when dryRun is explicitly false', async () => {
    vi.mocked(scraper.scrapeELTTLTeam).mockResolvedValue(scrapedData([scrapedFixture1]));

    const res = await app.fetch(syncRequest({ dryRun: false }), { DB: {} as any });
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.dry_run).toBe(false);
    expect(mockDbInstance.batchDeleteFixtures).toHaveBeenCalledWith(['fixture-2']);
  });
});
