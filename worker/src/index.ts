import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ImportTeamRequest, ImportTeamResponse, SyncResponse, Fixture } from './types';
import { DatabaseService } from './database';
import { scrapeELTTLTeam } from './scraper';
import { isValidELTTLUrl, parseMatchDate, isPastDate } from './utils';

const app = new Hono<{ Bindings: Env }>();

// Logging utility
function log(level: 'info' | 'error' | 'warn', message: string, meta?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  console.log(JSON.stringify(logEntry));
}

// Enable CORS for frontend
app.use('/*', cors());

// Health check endpoint
app.get('/api/health', (c) => {
  log('info', 'Health check requested');
  
  // Cache disabled
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// Import team from ELTTL URL
app.post('/api/availability/import', async (c) => {
  const startTime = Date.now();
  try {
    const body = await c.req.json<ImportTeamRequest>();
    const { elttlUrl } = body;

    log('info', 'Import team requested', { elttlUrl });

    // Validate URL
    if (!elttlUrl || !isValidELTTLUrl(elttlUrl)) {
      log('warn', 'Invalid ELTTL URL', { elttlUrl });
      return c.json({ error: 'Invalid ELTTL URL format' }, 400);
    }

    const db = new DatabaseService(c.env.DB);

    // Check if team already exists
    const existingTeam = await db.getTeamByUrl(elttlUrl);
    if (existingTeam) {
      log('info', 'Team already exists', { teamId: existingTeam.id, elttlUrl });
      return c.json<ImportTeamResponse>({
        success: true,
        teamId: existingTeam.id,
        redirect: `/availability/${existingTeam.id}`
      });
    }

    // Scrape team data from ELTTL
    log('info', 'Starting scrape', { elttlUrl });
    const scrapedData = await scrapeELTTLTeam(elttlUrl);

    // Create team
    const team = await db.createTeam(scrapedData.teamName, elttlUrl);

    // Create players
    const playerMap = new Map<string, string>(); // name -> id
    for (const playerName of scrapedData.players) {
      const player = await db.createPlayer(team.id, playerName);
      playerMap.set(playerName, player.id);
    }

    // Create fixtures and initialize availability
    for (const scrapedFixture of scrapedData.fixtures) {
      const matchDate = parseMatchDate(scrapedFixture.date);
      const dayTime = `${scrapedFixture.date} ${scrapedFixture.time}`;
      
      const fixture = await db.createFixture(
        team.id,
        matchDate,
        dayTime,
        scrapedFixture.homeTeam,
        scrapedFixture.awayTeam,
        scrapedFixture.venue
      );

      // Initialize availability for all players (default: not available)
      for (const playerId of playerMap.values()) {
        await db.createAvailability(fixture.id, playerId, false);
      }
    }

    const duration = Date.now() - startTime;
    log('info', 'Team import successful', { 
      teamId: team.id, 
      elttlUrl,
      playerCount: scrapedData.players.length,
      fixtureCount: scrapedData.fixtures.length,
      durationMs: duration
    });

    return c.json<ImportTeamResponse>({
      success: true,
      teamId: team.id,
      redirect: `/availability/${team.id}`
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', 'Import failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration
    });
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to import team' 
    }, 500);
  }
});

// Sync fixtures from ELTTL URL
app.post('/api/availability/:teamId/sync', async (c) => {
  const startTime = Date.now();
  try {
    const teamId = c.req.param('teamId');
    log('info', 'Fixture sync requested', { teamId });

    const db = new DatabaseService(c.env.DB);

    // Get team to fetch ELTTL URL
    const team = await db.getTeam(teamId);
    if (!team) {
      log('warn', 'Team not found for sync', { teamId });
      return c.json({ error: 'Team not found' }, 404);
    }

    // Scrape current fixtures from ELTTL
    const scrapedData = await scrapeELTTLTeam(team.elttl_url);
    log('info', 'Scraped fixtures from ELTTL', {
      teamId,
      fixtureCount: scrapedData.fixtures.length
    });

    // Get existing fixtures and load into memory for efficient lookups
    const existingFixtures = await db.getFixtures(teamId);
    const fixtureMap = new Map<string, typeof existingFixtures[0]>();
    for (const fixture of existingFixtures) {
      const key = `${fixture.home_team}|${fixture.away_team}`;
      fixtureMap.set(key, fixture);
    }
    
    let fixturesUpdated = 0;
    let fixturesUnchanged = 0;
    let fixturesNew = 0;
    const updatedFixtureIds: string[] = [];

    // Get all players for availability initialization
    const players = await db.getPlayers(teamId);
    const playerIds = players.map(p => p.id);

    // Process each scraped fixture
    for (const scraped of scrapedData.fixtures) {
      const matchDate = parseMatchDate(scraped.date);
      const dayTime = `${scraped.date} ${scraped.time}`;

      // Try to match with existing fixture using in-memory lookup
      const key = `${scraped.homeTeam}|${scraped.awayTeam}`;
      const existingFixture = fixtureMap.get(key);

      if (existingFixture) {
        // Check if date has changed
        if (existingFixture.match_date !== matchDate || existingFixture.day_time !== dayTime) {
          log('info', 'Fixture date changed', {
            fixtureId: existingFixture.id,
            oldDate: existingFixture.match_date,
            newDate: matchDate,
            homeTeam: scraped.homeTeam,
            awayTeam: scraped.awayTeam
          });

          // Use batch operation to update fixture, clear data, and reinitialize availability
          await db.batchUpdateFixture(existingFixture.id, matchDate, dayTime, playerIds);

          fixturesUpdated++;
          updatedFixtureIds.push(existingFixture.id);
        } else {
          fixturesUnchanged++;
        }
      } else {
        // New fixture - create it with availability in a batch
        log('info', 'New fixture found', {
          homeTeam: scraped.homeTeam,
          awayTeam: scraped.awayTeam,
          matchDate
        });

        await db.batchCreateFixtureWithAvailability(
          teamId,
          matchDate,
          dayTime,
          scraped.homeTeam,
          scraped.awayTeam,
          scraped.venue,
          playerIds
        );

        fixturesNew++;
      }
    }

    const duration = Date.now() - startTime;
    const message = fixturesUpdated > 0
      ? `Sync completed: ${fixturesUpdated} updated, ${fixturesNew} new, ${fixturesUnchanged} unchanged`
      : fixturesNew > 0
      ? `Sync completed: ${fixturesNew} new fixtures added, ${fixturesUnchanged} unchanged`
      : 'All fixtures are up to date';

    log('info', 'Fixture sync completed', {
      teamId,
      fixturesUpdated,
      fixturesNew,
      fixturesUnchanged,
      durationMs: duration
    });

    return c.json<SyncResponse>({
      success: true,
      fixtures_updated: fixturesUpdated,
      fixtures_unchanged: fixturesUnchanged,
      fixtures_new: fixturesNew,
      updated_fixture_ids: updatedFixtureIds,
      message
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', 'Fixture sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration
    });
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to sync fixtures'
    }, 500);
  }
});

app.get('/api/availability/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    log('info', 'Get team data requested', { teamId });
    
    const db = new DatabaseService(c.env.DB);

    // Get team
    const team = await db.getTeam(teamId);
    if (!team) {
      log('warn', 'Team not found', { teamId });
      return c.json({ error: 'Team not found' }, 404);
    }

    // Get fixtures, players, availability, and final selections
    const [fixtureRows, players, availability, finalSelections] = await Promise.all([
      db.getFixtures(teamId),
      db.getPlayers(teamId),
      db.getAvailability(teamId),
      db.getFinalSelections(teamId)
    ]);

    // Add computed is_past field to fixtures
    const fixtures: Fixture[] = fixtureRows.map(f => ({
      ...f,
      is_past: isPastDate(f.match_date) ? 1 : 0
    }));

    // Transform availability into a map
    const availabilityMap: Record<string, boolean> = {};
    for (const avail of availability) {
      const key = `${avail.fixture_id}_${avail.player_id}`;
      availabilityMap[key] = avail.is_available === 1;
    }

    // Transform final selections into a map
    const finalSelectionsMap: Record<string, string[]> = {};
    for (const selection of finalSelections) {
      if (!finalSelectionsMap[selection.fixture_id]) {
        finalSelectionsMap[selection.fixture_id] = [];
      }
      finalSelectionsMap[selection.fixture_id].push(selection.player_id);
    }

    // Cache disabled
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    log('info', 'Team data retrieved', { 
      teamId, 
      fixtureCount: fixtures.length,
      playerCount: players.length
    });

    return c.json({
      team,
      fixtures,
      players,
      availability: availabilityMap,
      finalSelections: finalSelectionsMap
    });
  } catch (error) {
    log('error', 'Get team data failed', { 
      teamId: c.req.param('teamId'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get team data' 
    }, 500);
  }
});

app.patch('/api/availability/:teamId/fixture/:fixtureId/player/:playerId', async (c) => {
  try {
    const { teamId, fixtureId, playerId } = c.req.param();
    const body = await c.req.json<{ isAvailable: boolean }>();
    
    log('info', 'Update availability requested', { teamId, fixtureId, playerId, isAvailable: body.isAvailable });
    
    if (typeof body.isAvailable !== 'boolean') {
      log('warn', 'Invalid availability value', { teamId, fixtureId, playerId });
      return c.json({ error: 'isAvailable must be a boolean' }, 400);
    }

    const db = new DatabaseService(c.env.DB);

    // Verify fixture belongs to team
    const fixture = await db.getFixture(fixtureId);
    if (!fixture || fixture.team_id !== teamId) {
      return c.json({ error: 'Fixture not found' }, 404);
    }

    // Verify player belongs to team
    const player = await db.getPlayer(playerId);
    if (!player || player.team_id !== teamId) {
      return c.json({ error: 'Player not found' }, 404);
    }

    // Update availability
    await db.updateAvailability(fixtureId, playerId, body.isAvailable);

    log('info', 'Availability updated', { teamId, fixtureId, playerId, isAvailable: body.isAvailable });

    return c.json({ 
      success: true,
      fixtureId,
      playerId,
      isAvailable: body.isAvailable
    });
  } catch (error) {
    log('error', 'Update availability failed', {
      teamId: c.req.param('teamId'),
      fixtureId: c.req.param('fixtureId'),
      playerId: c.req.param('playerId'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to update availability' 
    }, 500);
  }
});

app.post('/api/availability/:teamId/fixture/:fixtureId/selection', async (c) => {
  try {
    const { teamId, fixtureId } = c.req.param();
    const body = await c.req.json<{ playerIds: string[] }>();
    
    log('info', 'Set final selection requested', { teamId, fixtureId, playerCount: body.playerIds?.length });
    
    if (!Array.isArray(body.playerIds)) {
      log('warn', 'Invalid playerIds format', { teamId, fixtureId });
      return c.json({ error: 'playerIds must be an array' }, 400);
    }

    // Validate 0-3 players
    if (body.playerIds.length > 3) {
      log('warn', 'Too many players selected', { teamId, fixtureId, count: body.playerIds.length });
      return c.json({ error: 'Maximum 3 players can be selected' }, 400);
    }

    const db = new DatabaseService(c.env.DB);

    // Verify fixture belongs to team
    const fixture = await db.getFixture(fixtureId);
    if (!fixture || fixture.team_id !== teamId) {
      return c.json({ error: 'Fixture not found' }, 404);
    }

    // Verify all players belong to team
    for (const playerId of body.playerIds) {
      const player = await db.getPlayer(playerId);
      if (!player || player.team_id !== teamId) {
        return c.json({ error: `Player ${playerId} not found` }, 404);
      }
    }

    // Verify all selected players are marked as available
    if (body.playerIds.length > 0) {
      const availability = await db.getAvailabilityForFixture(fixtureId);
      for (const playerId of body.playerIds) {
        const playerAvailability = availability.find(a => a.player_id === playerId);
        if (!playerAvailability || playerAvailability.is_available !== 1) {
          return c.json({ 
            error: `Cannot select player ${playerId} - player is not marked as available` 
          }, 400);
        }
      }
    }

    // Clear existing selections
    await db.clearFinalSelections(fixtureId);

    // Create new selections
    for (const playerId of body.playerIds) {
      await db.createFinalSelection(fixtureId, playerId);
    }

    log('info', 'Final selection updated', { teamId, fixtureId, playerIds: body.playerIds });

    return c.json({ 
      success: true,
      fixtureId,
      playerIds: body.playerIds
    });
  } catch (error) {
    log('error', 'Set final selection failed', {
      teamId: c.req.param('teamId'),
      fixtureId: c.req.param('fixtureId'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to set final selection' 
    }, 500);
  }
});

app.get('/api/availability/:teamId/summary', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    log('info', 'Get player summary requested', { teamId });
    
    const db = new DatabaseService(c.env.DB);

    // Get team
    const team = await db.getTeam(teamId);
    if (!team) {
      log('warn', 'Team not found', { teamId });
      return c.json({ error: 'Team not found' }, 404);
    }

    // Get all data
    const [fixtureRows, players, finalSelections] = await Promise.all([
      db.getFixtures(teamId),
      db.getPlayers(teamId),
      db.getFinalSelections(teamId)
    ]);

    // Add computed is_past field to fixtures
    const fixtures: Fixture[] = fixtureRows.map(f => ({
      ...f,
      is_past: isPastDate(f.match_date) ? 1 : 0
    }));

    // Calculate summary for each player
    const summary = players.map(player => {
      let gamesPlayed = 0;
      let gamesScheduled = 0;
      let totalSelections = 0;

      for (const fixture of fixtures) {
        const selections = finalSelections.filter(s => s.fixture_id === fixture.id);
        const isSelected = selections.some(s => s.player_id === player.id);

        if (isSelected) {
          totalSelections++;
          if (fixture.is_past === 1) {
            gamesPlayed++;
          } else {
            gamesScheduled++;
          }
        }
      }

      const totalGames = gamesPlayed + gamesScheduled;
      const selectionRate = fixtures.length > 0 
        ? Math.round((totalSelections / fixtures.length) * 100) 
        : 0;

      return {
        playerId: player.id,
        playerName: player.name,
        gamesPlayed,
        gamesScheduled,
        totalGames,
        selectionRate
      };
    });

    // Cache disabled
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    log('info', 'Player summary retrieved', { teamId, playerCount: summary.length });

    return c.json({ summary });
  } catch (error) {
    log('error', 'Get player summary failed', {
      teamId: c.req.param('teamId'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get player summary' 
    }, 500);
  }
});

export default app;
