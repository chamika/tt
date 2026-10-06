import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import { TournamentRepository } from './database';
import { GROUP_SETTINGS, KNOCKOUT_SETTINGS, drawnState, knockoutRound, playerId, rankedPlayers } from './testHelpers';
import type { StateChanges, TournamentState } from './types';

vi.mock('./database');

const ENV = { DB: {} as D1Database };

function request(method: string, path: string, body?: unknown): Request {
  return new Request(`http://localhost/api/tournaments${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  });
}

async function send(method: string, path: string, body?: unknown) {
  const res = await app.fetch(request(method, path, body), ENV);
  return { status: res.status, json: (await res.json()) as any };
}

describe('/api/tournaments', () => {
  let repo: {
    getState: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    replaceDraw: ReturnType<typeof vi.fn>;
    transitionStatus: ReturnType<typeof vi.fn>;
    saveChanges: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    repo = {
      getState: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(undefined),
      replaceDraw: vi.fn().mockResolvedValue(true),
      transitionStatus: vi.fn().mockResolvedValue(true),
      saveChanges: vi.fn().mockResolvedValue(undefined)
    };
    vi.mocked(TournamentRepository).mockImplementation(function () {
      return repo;
    } as any);
  });

  const createBody = { ...KNOCKOUT_SETTINGS, players: rankedPlayers(6) };

  describe('POST /api/tournaments', () => {
    it('creates a draft with its draw and returns where to find it', async () => {
      const { status, json } = await send('POST', '', createBody);

      expect(status).toBe(201);
      expect(json).toEqual({ success: true, id: expect.any(String), redirect: `/tournament/${json.id}` });

      const [id, settings, players, matches] = repo.create.mock.calls[0];
      expect(id).toBe(json.id);
      expect(settings).toMatchObject({ name: 'Club Championship', format: 'knockout' });
      expect(players).toHaveLength(6);
      expect(matches).toHaveLength(7);
    });

    it.each([
      [{ ...createBody, name: ' ' }, 'Give the tournament a name'],
      [{ ...createBody, seeding_mode: 'handicap' }, 'P1 needs a handicap'],
      [{ ...createBody, best_of: 4 }, 'Best of must be one of: 1, 3, 5, 7'],
      [{ ...createBody, ...GROUP_SETTINGS, players: rankedPlayers(6), group_count: 4 }, '4 groups need at least 8 players'],
      [{ ...createBody, players: [] }, 'at least 2 players']
    ])('rejects an invalid tournament (%#)', async (body, message) => {
      const { status, json } = await send('POST', '', body);

      expect(status).toBe(400);
      expect(json.error).toContain(message);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects a body that is not JSON', async () => {
      const { status, json } = await send('POST', '', 'not json');
      expect(status).toBe(400);
      expect(json.error).toBe('The request body must be JSON');
    });
  });

  describe('GET /:id', () => {
    it('returns the computed view', async () => {
      repo.getState.mockResolvedValue(drawnState(GROUP_SETTINGS, rankedPlayers(8)));

      const { status, json } = await send('GET', '/t-1');

      expect(status).toBe(200);
      expect(Object.keys(json).sort()).toEqual(['champion_id', 'groups', 'matches', 'players', 'rounds', 'tournament']);
      expect(json.groups).toHaveLength(2);
      expect(json.matches.find((m: any) => m.label === 'SF1')).toMatchObject({ source_a_label: 'A1', status: 'pending' });
    });

    it('returns 404 for an unknown tournament', async () => {
      const { status, json } = await send('GET', '/nope');
      expect(status).toBe(404);
      expect(json.error).toBe('Tournament not found');
    });
  });

  describe('PUT /:id', () => {
    it('redraws a draft', async () => {
      repo.getState.mockResolvedValue(drawnState({}, rankedPlayers(4), 'draft'));

      const { status } = await send('PUT', '/t-1', { ...createBody, players: rankedPlayers(5) });

      expect(status).toBe(200);
      expect(repo.replaceDraw.mock.calls[0][2]).toHaveLength(5);
    });

    it('refuses once the tournament has started', async () => {
      repo.getState.mockResolvedValue(drawnState({}, rankedPlayers(4), 'in_progress'));

      const { status, json } = await send('PUT', '/t-1', createBody);

      expect(status).toBe(409);
      expect(json.error).toBe('The draw is locked because the tournament has started');
      expect(repo.replaceDraw).not.toHaveBeenCalled();
    });

    it('refuses if the tournament is started while the redraw is being saved', async () => {
      repo.getState.mockResolvedValue(drawnState({}, rankedPlayers(4), 'draft'));
      repo.replaceDraw.mockResolvedValue(false);

      const { status } = await send('PUT', '/t-1', createBody);

      expect(status).toBe(409);
    });
  });

  describe('POST /:id/start', () => {
    it('starts a draft', async () => {
      repo.getState.mockResolvedValue(drawnState({}, rankedPlayers(4), 'draft'));

      const { status } = await send('POST', '/t-1/start');

      expect(status).toBe(200);
      expect(repo.transitionStatus).toHaveBeenCalledWith('t-1', 'draft', 'in_progress', expect.any(Number));
    });

    it('refuses to start twice', async () => {
      repo.getState.mockResolvedValue(drawnState({}, rankedPlayers(4)));
      repo.transitionStatus.mockResolvedValue(false);

      const { status, json } = await send('POST', '/t-1/start');

      expect(status).toBe(409);
      expect(json.error).toBe('The tournament has already started');
    });
  });

  describe('PUT /:id/matches/:matchId/result', () => {
    let state: TournamentState;
    let sf1: string;

    beforeEach(() => {
      state = drawnState({ score_mode: 'points' }, rankedPlayers(4));
      sf1 = knockoutRound(state, 1)[0].id;
      repo.getState.mockResolvedValue(state);
    });

    it('records the result and moves the winner on', async () => {
      const { status } = await send('PUT', `/t-1/matches/${sf1}/result`, {
        game_scores: [{ a: 11, b: 5 }, { a: 11, b: 7 }, { a: 12, b: 10 }]
      });

      expect(status).toBe(200);
      const changes: StateChanges = repo.saveChanges.mock.calls[0][1];
      const final = changes.matches.find(m => m.id !== sf1)!;
      expect(final.player_a_id).toBe(playerId(state, 'P1'));
      expect(changes.matches.find(m => m.id === sf1)).toMatchObject({ games_a: 3, games_b: 0 });
    });

    it('explains an impossible score', async () => {
      const { status, json } = await send('PUT', `/t-1/matches/${sf1}/result`, {
        game_scores: [{ a: 13, b: 10 }]
      });

      expect(status).toBe(400);
      expect(json.error).toBe("Game 1: from 10-all the game ends at a 2-point lead, so 13-10 isn't possible");
      expect(repo.saveChanges).not.toHaveBeenCalled();
    });

    it('refuses results before the start', async () => {
      repo.getState.mockResolvedValue({ ...state, tournament: { ...state.tournament, status: 'draft' } });

      const { status, json } = await send('PUT', `/t-1/matches/${sf1}/result`, { game_scores: [] });

      expect(status).toBe(409);
      expect(json.error).toBe('Start the tournament before entering results');
    });

    it('returns 404 for an unknown match', async () => {
      const { status, json } = await send('PUT', '/t-1/matches/nope/result', {});
      expect(status).toBe(404);
      expect(json.error).toBe('Match not found');
    });
  });

  describe('DELETE /:id/matches/:matchId/result', () => {
    it('refuses to clear a match with no result', async () => {
      const state = drawnState({}, rankedPlayers(4));
      repo.getState.mockResolvedValue(state);

      const { status, json } = await send('DELETE', `/t-1/matches/${knockoutRound(state, 1)[0].id}/result`);

      expect(status).toBe(409);
      expect(json.error).toBe('This match has no result to clear');
    });
  });

  describe('PUT /:id/groups/:groupIndex/order', () => {
    it('returns 404 for a group index that is not a number', async () => {
      const { status } = await send('PUT', '/t-1/groups/x/order', { player_ids: [] });
      expect(status).toBe(404);
    });

    it('refuses when the group has no tie to resolve', async () => {
      repo.getState.mockResolvedValue(drawnState(GROUP_SETTINGS, rankedPlayers(8)));

      const { status, json } = await send('PUT', '/t-1/groups/0/order', { player_ids: [] });

      expect(status).toBe(409);
      expect(json.error).toBe('There is no tie to resolve in Group A');
    });
  });

  it('reports unexpected failures as 500', async () => {
    repo.getState.mockRejectedValue(new Error('D1 is down'));

    const { status, json } = await send('GET', '/t-1');

    expect(status).toBe(500);
    expect(json.error).toBe('D1 is down');
  });
});
