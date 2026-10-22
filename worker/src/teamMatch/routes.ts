import { Hono, type Context } from 'hono';
import type { Env } from '../types';
import { log } from '../log';
import { generateUUID, now } from '../utils';
import { TournamentError, conflict, invalid, notFound } from '../tournament/errors';
import { TeamMatchRepository } from './database';
import { rubberSlot, validateDetails, validateRubber } from './rubbers';
import type { RubberInput, TeamMatchDetails } from './types';
import { buildTeamMatchView } from './view';

type AppContext = Context<{ Bindings: Env }>;

const teamMatches = new Hono<{ Bindings: Env }>();

function respondWithError(c: AppContext, error: unknown, action: string) {
  const meta = { teamMatchId: c.req.param('id'), rubber: c.req.param('number') };
  if (error instanceof TournamentError) {
    log('warn', `${action} rejected`, { ...meta, status: error.status, reason: error.message });
    return c.json({ error: error.message }, error.status);
  }
  log('error', `${action} failed`, { ...meta, error: error instanceof Error ? error.message : 'Unknown error' });
  return c.json({ error: error instanceof Error ? error.message : `${action} failed` }, 500);
}

async function readJson<T>(c: AppContext): Promise<T> {
  const body = await c.req.json<T>().catch(() => null);
  if (!body || typeof body !== 'object') throw invalid('The request body must be JSON');
  return body;
}

async function load(repo: TeamMatchRepository, id: string) {
  const stored = await repo.get(id);
  if (!stored) throw notFound('Team match not found');
  return stored;
}

async function viewResponse(c: AppContext, repo: TeamMatchRepository, id: string) {
  const { match, rubbers } = await load(repo, id);
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return c.json(buildTeamMatchView(match, rubbers));
}

teamMatches.post('/', async c => {
  try {
    const details = validateDetails(await readJson<TeamMatchDetails>(c));
    const id = generateUUID();
    await new TeamMatchRepository(c.env.DB).create(id, details, now());

    log('info', 'Team match created', { teamMatchId: id });
    return c.json({ success: true, id, redirect: `/team-match/${id}` }, 201);
  } catch (error) {
    return respondWithError(c, error, 'Create team match');
  }
});

teamMatches.get('/:id', async c => {
  try {
    return await viewResponse(c, new TeamMatchRepository(c.env.DB), c.req.param('id'));
  } catch (error) {
    return respondWithError(c, error, 'Get team match');
  }
});

// Correct the teams, players, title or date; results stay with their rubbers
teamMatches.put('/:id', async c => {
  try {
    const repo = new TeamMatchRepository(c.env.DB);
    const id = c.req.param('id');
    await load(repo, id);

    const details = validateDetails(await readJson<TeamMatchDetails>(c));
    await repo.updateDetails(id, details, now());

    log('info', 'Team match updated', { teamMatchId: id });
    return await viewResponse(c, repo, id);
  } catch (error) {
    return respondWithError(c, error, 'Update team match');
  }
});

// Record or correct a rubber
teamMatches.put('/:id/rubbers/:number', async c => {
  try {
    const repo = new TeamMatchRepository(c.env.DB);
    const id = c.req.param('id');
    const number = Number(c.req.param('number'));
    const { match } = await load(repo, id);
    rubberSlot(number);

    const rubber = validateRubber(match, number, await readJson<RubberInput>(c));
    await repo.saveRubber(id, rubber, now());

    log('info', 'Rubber recorded', { teamMatchId: id, rubber: number, winner: rubber.winner });
    return await viewResponse(c, repo, id);
  } catch (error) {
    return respondWithError(c, error, 'Record rubber');
  }
});

teamMatches.delete('/:id/rubbers/:number', async c => {
  try {
    const repo = new TeamMatchRepository(c.env.DB);
    const id = c.req.param('id');
    const number = Number(c.req.param('number'));
    await load(repo, id);
    rubberSlot(number);

    if (!(await repo.deleteRubber(id, number, now()))) {
      throw conflict(`Rubber ${number} has no result to clear`);
    }

    log('info', 'Rubber cleared', { teamMatchId: id, rubber: number });
    return await viewResponse(c, repo, id);
  } catch (error) {
    return respondWithError(c, error, 'Clear rubber');
  }
});

export default teamMatches;
