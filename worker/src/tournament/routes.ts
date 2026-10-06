import { Hono, type Context } from 'hono';
import type { Env } from '../types';
import { log } from '../log';
import { generateUUID, now } from '../utils';
import { applyResult, clearResult, mergeChanges, reconcileGroupLines, resolveGroupTie } from './advance';
import { TournamentRepository } from './database';
import { createDraw } from './draw';
import { TournamentError, conflict, invalid, notFound } from './errors';
import { matchHandicap } from './handicap';
import { validateResult } from './results';
import type { CreateTournamentRequest, ResultInput, StateChanges, TournamentState } from './types';
import { buildView } from './view';

type AppContext = Context<{ Bindings: Env }>;

const tournaments = new Hono<{ Bindings: Env }>();

function respondWithError(c: AppContext, error: unknown, action: string) {
  const meta = { tournamentId: c.req.param('id'), matchId: c.req.param('matchId') };
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

async function loadState(repo: TournamentRepository, id: string): Promise<TournamentState> {
  const state = await repo.getState(id);
  if (!state) throw notFound('Tournament not found');
  return state;
}

function viewResponse(c: AppContext, state: TournamentState) {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return c.json(buildView(state));
}

/**
 * Save the engine's changes, then re-read and repair anything a concurrent
 * write left behind (see reconcileGroupLines). Returns the fresh state.
 */
async function commit(repo: TournamentRepository, state: TournamentState, changes: StateChanges) {
  await repo.saveChanges(state, changes, now());
  const fresh = await loadState(repo, state.tournament.id);
  const repairs = reconcileGroupLines(fresh);
  if (repairs.matches.length === 0 && repairs.status === fresh.tournament.status) return fresh;

  await repo.saveChanges(fresh, repairs, now());
  return mergeChanges(fresh, repairs);
}

// Create a draft tournament and its draw
tournaments.post('/', async c => {
  try {
    const body = await readJson<CreateTournamentRequest>(c);
    const draw = createDraw(body, body.players, Math.random, generateUUID);
    const id = generateUUID();
    await new TournamentRepository(c.env.DB).create(id, draw.settings, draw.players, draw.matches, now());

    log('info', 'Tournament created', {
      tournamentId: id,
      format: draw.settings.format,
      seedingMode: draw.settings.seeding_mode,
      playerCount: draw.players.length
    });
    return c.json({ success: true, id, redirect: `/tournament/${id}` }, 201);
  } catch (error) {
    return respondWithError(c, error, 'Create tournament');
  }
});

tournaments.get('/:id', async c => {
  try {
    const state = await loadState(new TournamentRepository(c.env.DB), c.req.param('id'));
    return viewResponse(c, state);
  } catch (error) {
    return respondWithError(c, error, 'Get tournament');
  }
});

// Change a draft's settings or players; the draw is made again from scratch
tournaments.put('/:id', async c => {
  try {
    const repo = new TournamentRepository(c.env.DB);
    const id = c.req.param('id');
    const state = await loadState(repo, id);
    if (state.tournament.status !== 'draft') {
      throw conflict('The draw is locked because the tournament has started');
    }

    const body = await readJson<CreateTournamentRequest>(c);
    const draw = createDraw(body, body.players, Math.random, generateUUID);
    const replaced = await repo.replaceDraw(id, draw.settings, draw.players, draw.matches, now());
    if (!replaced) {
      throw conflict('The draw is locked because the tournament has started');
    }

    log('info', 'Tournament redrawn', { tournamentId: id, playerCount: draw.players.length });
    return viewResponse(c, await loadState(repo, id));
  } catch (error) {
    return respondWithError(c, error, 'Update tournament');
  }
});

tournaments.post('/:id/start', async c => {
  try {
    const repo = new TournamentRepository(c.env.DB);
    const id = c.req.param('id');
    await loadState(repo, id);

    if (!(await repo.transitionStatus(id, 'draft', 'in_progress', now()))) {
      throw conflict('The tournament has already started');
    }

    log('info', 'Tournament started', { tournamentId: id });
    return viewResponse(c, await loadState(repo, id));
  } catch (error) {
    return respondWithError(c, error, 'Start tournament');
  }
});

// Record or correct a result
tournaments.put('/:id/matches/:matchId/result', async c => {
  try {
    const repo = new TournamentRepository(c.env.DB);
    const state = await loadState(repo, c.req.param('id'));
    const match = state.matches.find(m => m.id === c.req.param('matchId'));
    if (!match) throw notFound('Match not found');

    const input = await readJson<ResultInput>(c);
    const playerA = state.players.find(p => p.id === match.player_a_id);
    const playerB = state.players.find(p => p.id === match.player_b_id);
    const handicap = matchHandicap(
      state.tournament.seeding_mode,
      playerA?.handicap ?? null,
      playerB?.handicap ?? null
    );
    const result = validateResult(state.tournament, match, input, handicap, {
      a: playerA?.name ?? 'Player A',
      b: playerB?.name ?? 'Player B'
    });

    const fresh = await commit(repo, state, applyResult(state, match.id, result, now()));

    log('info', 'Result recorded', {
      tournamentId: state.tournament.id,
      matchId: match.id,
      winnerId: result.winner_id,
      status: fresh.tournament.status
    });
    return viewResponse(c, fresh);
  } catch (error) {
    return respondWithError(c, error, 'Record result');
  }
});

tournaments.delete('/:id/matches/:matchId/result', async c => {
  try {
    const repo = new TournamentRepository(c.env.DB);
    const state = await loadState(repo, c.req.param('id'));
    const fresh = await commit(repo, state, clearResult(state, c.req.param('matchId')));

    log('info', 'Result cleared', { tournamentId: state.tournament.id, matchId: c.req.param('matchId') });
    return viewResponse(c, fresh);
  } catch (error) {
    return respondWithError(c, error, 'Clear result');
  }
});

// Order players the tie-break rules couldn't separate
tournaments.put('/:id/groups/:groupIndex/order', async c => {
  try {
    const repo = new TournamentRepository(c.env.DB);
    const groupIndex = Number(c.req.param('groupIndex'));
    if (!Number.isInteger(groupIndex) || groupIndex < 0) throw notFound('Group not found');

    const state = await loadState(repo, c.req.param('id'));
    const body = await readJson<{ player_ids: string[] }>(c);
    const fresh = await commit(repo, state, resolveGroupTie(state, groupIndex, body.player_ids));

    log('info', 'Group tie resolved', { tournamentId: state.tournament.id, groupIndex });
    return viewResponse(c, fresh);
  } catch (error) {
    return respondWithError(c, error, 'Order group');
  }
});

export default tournaments;
