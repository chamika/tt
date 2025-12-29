import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ImportTeamRequest, ImportTeamResponse } from './types';
import { DatabaseService } from './database';
import { scrapeELTTLTeam } from './scraper';
import { isValidELTTLUrl, parseMatchDate } from './utils';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for frontend
app.use('/*', cors());

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// Import team from ELTTL URL
app.post('/api/availability/import', async (c) => {
  try {
    const body = await c.req.json<ImportTeamRequest>();
    const { elttlUrl } = body;

    // Validate URL
    if (!elttlUrl || !isValidELTTLUrl(elttlUrl)) {
      return c.json({ error: 'Invalid ELTTL URL format' }, 400);
    }

    const db = new DatabaseService(c.env.DB);

    // Check if team already exists
    const existingTeam = await db.getTeamByUrl(elttlUrl);
    if (existingTeam) {
      return c.json<ImportTeamResponse>({
        success: true,
        teamId: existingTeam.id,
        redirect: `/availability/${existingTeam.id}`
      });
    }

    // Scrape team data from ELTTL
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

    return c.json<ImportTeamResponse>({
      success: true,
      teamId: team.id,
      redirect: `/availability/${team.id}`
    });
  } catch (error) {
    console.error('Import error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to import team' 
    }, 500);
  }
});

app.get('/api/availability/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const db = new DatabaseService(c.env.DB);

    // Get team
    const team = await db.getTeam(teamId);
    if (!team) {
      return c.json({ error: 'Team not found' }, 404);
    }

    // Get fixtures, players, availability, and final selections
    const [fixtures, players, availability, finalSelections] = await Promise.all([
      db.getFixtures(teamId),
      db.getPlayers(teamId),
      db.getAvailability(teamId),
      db.getFinalSelections(teamId)
    ]);

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

    return c.json({
      team,
      fixtures,
      players,
      availability: availabilityMap,
      finalSelections: finalSelectionsMap
    });
  } catch (error) {
    console.error('Get team data error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get team data' 
    }, 500);
  }
});

app.patch('/api/availability/:teamId/fixture/:fixtureId/player/:playerId', async (c) => {
  try {
    const { teamId, fixtureId, playerId } = c.req.param();
    const body = await c.req.json<{ isAvailable: boolean }>();
    
    if (typeof body.isAvailable !== 'boolean') {
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

    return c.json({ 
      success: true,
      fixtureId,
      playerId,
      isAvailable: body.isAvailable
    });
  } catch (error) {
    console.error('Update availability error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to update availability' 
    }, 500);
  }
});

app.post('/api/availability/:teamId/fixture/:fixtureId/selection', async (c) => {
  try {
    const { teamId, fixtureId } = c.req.param();
    const body = await c.req.json<{ playerIds: string[] }>();
    
    if (!Array.isArray(body.playerIds)) {
      return c.json({ error: 'playerIds must be an array' }, 400);
    }

    // Validate exactly 3 players
    if (body.playerIds.length !== 3) {
      return c.json({ error: 'Must select exactly 3 players' }, 400);
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

    // Clear existing selections
    await db.clearFinalSelections(fixtureId);

    // Create new selections
    for (const playerId of body.playerIds) {
      await db.createFinalSelection(fixtureId, playerId);
    }

    return c.json({ 
      success: true,
      fixtureId,
      playerIds: body.playerIds
    });
  } catch (error) {
    console.error('Set final selection error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to set final selection' 
    }, 500);
  }
});

app.get('/api/availability/:teamId/summary', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const db = new DatabaseService(c.env.DB);

    // Get team
    const team = await db.getTeam(teamId);
    if (!team) {
      return c.json({ error: 'Team not found' }, 404);
    }

    // Get all data
    const [fixtures, players, finalSelections] = await Promise.all([
      db.getFixtures(teamId),
      db.getPlayers(teamId),
      db.getFinalSelections(teamId)
    ]);

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

    return c.json({ summary });
  } catch (error) {
    console.error('Get player summary error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Failed to get player summary' 
    }, 500);
  }
});

export default app;
