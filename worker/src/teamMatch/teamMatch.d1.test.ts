import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import app from '../index';
import { createTestD1 } from '../test/d1';
import type { GameScore, TeamMatchView } from './types';

// Integration tests: the real Hono app against a real (in-memory) D1 database

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await createTestD1());
});

afterAll(async () => {
  await dispose();
});

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

async function api(method: string, path: string, body?: unknown) {
  const res = await app.fetch(
    new Request(`http://localhost/api/team-matches${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }),
    { DB: db }
  );
  return { status: res.status, json: (await res.json()) as any };
}

const DETAILS = {
  title: 'Division 3',
  match_date: '2026-10-22',
  home_team: 'Hornets',
  away_team: 'Wasps',
  home_players: ['Ann', 'Bea', 'Cat'],
  away_players: ['Xan', 'Yaz', 'Zoe']
};

async function create(): Promise<string> {
  const { status, json } = await api('POST', '', DETAILS);
  expect(status).toBe(201);
  expect(json.redirect).toBe(`/team-match/${json.id}`);
  return json.id;
}

function won(side: 'home' | 'away'): { game_scores: GameScore[] } {
  const game = side === 'home' ? { a: 11, b: 6 } : { a: 6, b: 11 };
  return { game_scores: [game, game, game] };
}

const doubles = (side: 'home' | 'away') => ({ ...won(side), home_pair: 'AB', away_pair: 'YZ' });

async function enter(id: string, number: number, side: 'home' | 'away'): Promise<TeamMatchView> {
  const { status, json } = await api('PUT', `/${id}/rubbers/${number}`, number === 7 ? doubles(side) : won(side));
  expect(status).toBe(200);
  return json;
}

describe('Team Match Card on D1', () => {
  it('plays all 10 rubbers in any order to a 5-5 draw', async () => {
    const id = await create();

    let view: TeamMatchView = (await api('GET', `/${id}`)).json;
    expect(view.status).toBe('not_started');
    expect(view.match).toMatchObject(DETAILS);

    // Odd rubbers to home, even to away, entered out of order as tables finish
    for (const number of [3, 1, 7, 10, 2, 5, 9, 4, 8]) {
      view = await enter(id, number, number % 2 ? 'home' : 'away');
    }
    expect(view.status).toBe('in_progress');
    expect(view.played).toBe(9);
    expect(view.rubbers[5].running).toBeNull();

    view = await enter(id, 6, 'away');
    expect(view.status).toBe('completed');
    expect(view.score).toEqual({ home: 5, away: 5 });
    expect(view.outcome).toBe('draw');
    expect(view.rubbers[6].home.names).toEqual(['Ann', 'Bea']);
    expect(view.rubbers[6].away.names).toEqual(['Yaz', 'Zoe']);
  });

  it('corrects and clears a rubber', async () => {
    const id = await create();
    await enter(id, 1, 'home');
    let view = await enter(id, 1, 'away');
    expect(view.score).toEqual({ home: 0, away: 1 });
    expect(view.rubbers[0].result?.game_scores).toEqual(won('away').game_scores);

    const cleared = await api('DELETE', `/${id}/rubbers/1`);
    expect(cleared.status).toBe(200);
    view = cleared.json;
    expect(view.status).toBe('not_started');

    const again = await api('DELETE', `/${id}/rubbers/1`);
    expect(again.status).toBe(409);
    expect(again.json.error).toBe('Rubber 1 has no result to clear');
  });

  it('keeps results when a player is renamed', async () => {
    const id = await create();
    await enter(id, 1, 'home');

    const { status, json } = await api('PUT', `/${id}`, { ...DETAILS, home_players: ['Anne', 'Bea', 'Cat'] });
    expect(status).toBe(200);
    const view = json as TeamMatchView;
    expect(view.rubbers[0].home.names).toEqual(['Anne']);
    expect(view.rubbers[0].result?.winner).toBe('home');
    expect(view.home_players[0]).toEqual({ label: 'A', name: 'Anne', won: 1 });
  });

  it('keeps two rubbers entered at the same moment', async () => {
    const id = await create();
    await Promise.all([enter(id, 2, 'home'), enter(id, 3, 'away')]);
    const view: TeamMatchView = (await api('GET', `/${id}`)).json;
    expect(view.score).toEqual({ home: 1, away: 1 });
  });

  it('rejects bad requests with a clear status and message', async () => {
    const id = await create();

    expect((await api('GET', '/no-such-match')).status).toBe(404);
    expect((await api('PUT', '/no-such-match/rubbers/1', won('home'))).status).toBe(404);
    expect((await api('PUT', `/${id}/rubbers/11`, won('home'))).status).toBe(404);
    expect((await api('DELETE', `/${id}/rubbers/0`)).status).toBe(404);

    const deuce = await api('PUT', `/${id}/rubbers/1`, { game_scores: [{ a: 11, b: 10 }] });
    expect(deuce.status).toBe(400);
    expect(deuce.json.error).toContain('2 clear points');

    const noPairs = await api('PUT', `/${id}/rubbers/7`, won('home'));
    expect(noPairs.status).toBe(400);
    expect(noPairs.json.error).toBe('Choose the two Hornets players in the doubles');

    const badCreate = await api('POST', '', { ...DETAILS, away_players: ['Xan'] });
    expect(badCreate.status).toBe(400);
    expect(badCreate.json.error).toBe('Wasps needs exactly 3 players');

    const badEdit = await api('PUT', `/${id}`, { ...DETAILS, home_team: '' });
    expect(badEdit.status).toBe(400);
  });

  it('deletes its rubbers along with the match', async () => {
    const id = await create();
    await enter(id, 1, 'home');
    await enter(id, 7, 'away');

    await db.prepare('DELETE FROM team_matches WHERE id = ?').bind(id).run();
    const left = await db.prepare('SELECT COUNT(*) AS n FROM team_match_rubbers WHERE match_id = ?').bind(id).first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});
