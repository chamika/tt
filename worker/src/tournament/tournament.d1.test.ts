import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import app from '../index';
import { createTestD1 } from '../test/d1';
import { TournamentRepository } from './database';
import { applyResult } from './advance';
import { matchHandicap } from './handicap';
import { validateResult } from './results';
import type { GameScore, MatchView, TournamentView } from './types';

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
    new Request(`http://localhost/api/tournaments${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }),
    { DB: db }
  );
  return { status: res.status, json: (await res.json()) as any };
}

async function view(id: string): Promise<TournamentView> {
  const { status, json } = await api('GET', `/${id}`);
  expect(status).toBe(200);
  return json;
}

async function createAndStart(body: Record<string, unknown>): Promise<string> {
  const created = await api('POST', '', body);
  expect(created.status).toBe(201);
  expect((await api('POST', `/${created.json.id}/start`)).status).toBe(200);
  return created.json.id;
}

/** Games won by `side` from the match's own starting scores, as low-scoring as the rules allow */
function winningGames(match: MatchView, side: 'a' | 'b', bestOf: number): GameScore[] {
  const { start_a, start_b, play_to } = match.handicap!;
  const loserStart = side === 'a' ? start_b : start_a;
  const winnerScore = loserStart >= play_to - 1 ? loserStart + 2 : play_to;
  const game = side === 'a' ? { a: winnerScore, b: start_b } : { a: start_a, b: winnerScore };
  return Array.from({ length: Math.ceil(bestOf / 2) }, () => ({ ...game }));
}

const names = (v: TournamentView, ids: (string | null)[]) =>
  ids.map(id => (id ? v.players.find(p => p.id === id)!.name : null));

const byLabel = (v: TournamentView, label: string) => v.matches.find(m => m.label === label)!;

describe('Tournament Brackets on D1', () => {
  it('plays a handicap group tournament with game scores from draw to champion', async () => {
    const handicaps = [-6, -3, 0, 2, 4, 6, 8, 10];
    const id = await createAndStart({
      name: 'Handicap Cup',
      format: 'groups',
      seeding_mode: 'handicap',
      score_mode: 'points',
      best_of: 3,
      group_count: 2,
      advance_per_group: 2,
      players: handicaps.map(h => ({ name: `H${h}`, handicap: h }))
    });

    // Group A: seeds 1, 4, 5, 8 (H-6, H2, H4, H10). The better seed wins every group match.
    let v = await view(id);
    expect(names(v, v.groups[0].player_ids)).toEqual(['H-6', 'H2', 'H4', 'H10']);

    for (const match of v.matches.filter(m => m.stage === 'group')) {
      const res = await api('PUT', `/${id}/matches/${match.id}/result`, {
        game_scores: winningGames(match, 'a', 3)
      });
      expect(res.status).toBe(200);
    }

    v = await view(id);
    expect(v.groups.every(g => g.standings.complete && !g.standings.unresolved_tie)).toBe(true);
    expect(names(v, [byLabel(v, 'SF1').player_a_id, byLabel(v, 'SF1').player_b_id])).toEqual(['H-6', 'H0']);
    expect(names(v, [byLabel(v, 'SF2').player_a_id, byLabel(v, 'SF2').player_b_id])).toEqual(['H-3', 'H2']);

    // SF1 is H-6 v H0: minus v plus, 0-6 to 17
    expect(byLabel(v, 'SF1').handicap).toEqual({ start_a: 0, start_b: 6, play_to: 17, warning: null });

    // Group results are locked once the knockout starts
    await api('PUT', `/${id}/matches/${byLabel(v, 'SF1').id}/result`, {
      game_scores: winningGames(byLabel(v, 'SF1'), 'b', 3)
    });
    const groupEdit = await api('PUT', `/${id}/matches/${v.matches[0].id}/result`, {
      game_scores: winningGames(v.matches[0], 'b', 3)
    });
    expect(groupEdit.status).toBe(409);

    v = await view(id);
    await api('PUT', `/${id}/matches/${byLabel(v, 'SF2').id}/result`, {
      game_scores: winningGames(byLabel(v, 'SF2'), 'a', 3)
    });
    v = await view(id);
    const final = byLabel(v, 'Final');
    expect(names(v, [final.player_a_id, final.player_b_id])).toEqual(['H0', 'H-3']);

    const finished = await api('PUT', `/${id}/matches/${final.id}/result`, {
      game_scores: winningGames(final, 'a', 3)
    });
    expect(finished.status).toBe(200);
    expect(finished.json.tournament.status).toBe('completed');
    expect(names(finished.json, [finished.json.champion_id])).toEqual(['H0']);
  });

  it('advances the top seeds through their byes in a 6-player knockout', async () => {
    const id = await createAndStart({
      name: 'Ranked Knockout',
      format: 'knockout',
      seeding_mode: 'ranking',
      score_mode: 'winner',
      best_of: 5,
      players: ['Ann', 'Bob', 'Cat', 'Dan', 'Eve', 'Fay'].map((name, i) => ({ name, ranking: i + 1 }))
    });

    const v = await view(id);
    expect(v.matches.filter(m => m.status === 'bye').map(m => m.label)).toEqual(['QF1', 'QF3']);
    expect(names(v, [byLabel(v, 'SF1').player_a_id, byLabel(v, 'SF2').player_a_id])).toEqual(['Ann', 'Bob']);
  });

  it('keeps both results when two quarter-finals feeding one semi-final are saved from the same state', async () => {
    const id = await createAndStart({
      name: 'Concurrent',
      format: 'knockout',
      seeding_mode: 'ranking',
      score_mode: 'winner',
      best_of: 5,
      players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}`, ranking: i + 1 }))
    });
    const repo = new TournamentRepository(db);
    const before = (await repo.getState(id))!;
    const [qf1, qf2] = before.matches.filter(m => m.stage === 'knockout' && m.round === 1);

    // Both phones read the same state, then each saves its own result
    for (const match of [qf1, qf2]) {
      const result = validateResult(
        before.tournament,
        match,
        { winner_id: match.player_a_id! },
        matchHandicap('ranking', null, null),
        { a: 'A', b: 'B' }
      );
      await repo.saveChanges(before, applyResult(before, match.id, result, Date.now()), Date.now());
    }

    const v = await view(id);
    expect(names(v, [byLabel(v, 'SF1').player_a_id, byLabel(v, 'SF1').player_b_id])).toEqual(['P1', 'P4']);
  });

  it('fills a group\'s knockout lines on the next write when concurrent results left them empty', async () => {
    const id = await createAndStart({
      name: 'Repair',
      format: 'groups',
      seeding_mode: 'ranking',
      score_mode: 'winner',
      best_of: 5,
      group_count: 2,
      advance_per_group: 1,
      players: Array.from({ length: 6 }, (_, i) => ({ name: `P${i + 1}`, ranking: i + 1 }))
    });
    const repo = new TournamentRepository(db);
    const before = (await repo.getState(id))!;
    const groupA = before.matches.filter(m => m.stage === 'group' && m.group_index === 0);

    // Group A's three results saved from the same stale state: none sees the group finish
    for (const match of groupA) {
      const result = { winner_id: match.player_a_id!, games_a: null, games_b: null, game_scores: null };
      await repo.saveChanges(before, applyResult(before, match.id, result, Date.now()), Date.now());
    }
    expect(byLabel(await view(id), 'Final').player_a_id).toBeNull();

    // Any later write repairs it
    const groupB = before.matches.find(m => m.stage === 'group' && m.group_index === 1)!;
    const res = await api('PUT', `/${id}/matches/${groupB.id}/result`, { winner_id: groupB.player_a_id });

    expect(res.status).toBe(200);
    expect(names(res.json, [byLabel(res.json, 'Final').player_a_id])).toEqual(['P1']);
  });

  it('locks the draw once the tournament has started', async () => {
    const body = {
      name: 'Locked',
      format: 'knockout',
      seeding_mode: 'ranking',
      score_mode: 'games',
      best_of: 5,
      players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
    };
    const created = await api('POST', '', body);
    const id = created.json.id;

    // A draft can be redrawn with different players
    const redrawn = await api('PUT', `/${id}`, { ...body, players: [{ name: 'X' }, { name: 'Y' }] });
    expect(redrawn.status).toBe(200);
    expect(redrawn.json.players.map((p: any) => p.name).sort()).toEqual(['X', 'Y']);

    await api('POST', `/${id}/start`);
    expect((await api('PUT', `/${id}`, body)).status).toBe(409);

    // Even a redraw that read the state before the start changes nothing
    const repo = new TournamentRepository(db);
    const replaced = await repo.replaceDraw(id, { ...body, group_count: null, advance_per_group: null } as any, [], [], Date.now());
    expect(replaced).toBe(false);
    expect((await view(id)).players.map(p => p.name).sort()).toEqual(['X', 'Y']);
  });

  it('removes players and matches with their tournament', async () => {
    const created = await api('POST', '', {
      name: 'Deleted',
      format: 'knockout',
      seeding_mode: 'ranking',
      score_mode: 'games',
      best_of: 5,
      players: [{ name: 'A' }, { name: 'B' }]
    });
    const id = created.json.id;

    await db.prepare('DELETE FROM tournaments WHERE id = ?').bind(id).run();

    const count = async (table: string) =>
      (await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE tournament_id = ?`).bind(id).first<{ n: number }>())!.n;
    expect(await count('tournament_players')).toBe(0);
    expect(await count('tournament_matches')).toBe(0);
    expect((await api('GET', `/${id}`)).status).toBe(404);
  });
});
