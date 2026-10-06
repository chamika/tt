import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestD1 } from './test/d1';
import { DatabaseService } from './database';

describe('DatabaseService.batchApplyPlayerChanges', () => {
  let db: D1Database;
  let dispose: () => Promise<void>;
  let service: DatabaseService;
  let teamId: string;
  let fixtureIds: string[];

  beforeEach(async () => {
    ({ db, dispose } = await createTestD1());
    service = new DatabaseService(db);

    const team = await service.createTeam('Squad Team', 'https://elttl.interactive.co.uk/teams/view/1');
    teamId = team.id;

    const first = await service.createFixture(teamId, '2026-01-15', 'Jan 15 Wed 18:45', 'Squad Team', 'Opposition A');
    const second = await service.createFixture(teamId, '2026-01-22', 'Jan 22 Wed 18:45', 'Opposition B', 'Squad Team');
    fixtureIds = [first.id, second.id];
  });

  afterEach(async () => {
    await dispose();
  });

  async function availabilityRowsFor(playerId: string): Promise<number> {
    const rows = await service.getAvailability(teamId);
    return rows.filter(a => a.player_id === playerId).length;
  }

  it('creates added players with a blank availability row on every fixture', async () => {
    await service.batchApplyPlayerChanges(teamId, { added: ['New Player'], left: [], rejoined: [] });

    const [player] = await service.getPlayers(teamId);
    expect(player).toMatchObject({ name: 'New Player', left_at: null });
    expect(await availabilityRowsFor(player.id)).toBe(fixtureIds.length);

    // The rows exist, so availability updates for the new player take effect
    await service.updateAvailability(fixtureIds[0], player.id, true);
    const rows = await service.getAvailabilityForFixture(fixtureIds[0]);
    expect(rows.find(a => a.player_id === player.id)?.is_available).toBe(1);
  });

  it('hides a player who left while keeping their history', async () => {
    const player = await service.createPlayer(teamId, 'Former Player');
    await service.createAvailability(fixtureIds[0], player.id, true);
    await service.createFinalSelection(fixtureIds[0], player.id);

    await service.batchApplyPlayerChanges(teamId, {
      added: [],
      left: [{ id: player.id, name: player.name }],
      rejoined: []
    });

    expect((await service.getPlayer(player.id))?.left_at).toEqual(expect.any(Number));
    expect(await availabilityRowsFor(player.id)).toBe(1);
    expect(await service.getFinalSelectionsByFixture(fixtureIds[0])).toHaveLength(1);
  });

  it('brings back a rejoining player and fills in only the fixtures they are missing', async () => {
    const player = await service.createPlayer(teamId, 'Returning Player');
    await service.createAvailability(fixtureIds[0], player.id, true);
    await db.prepare('UPDATE players SET left_at = 1 WHERE id = ?').bind(player.id).run();

    await service.batchApplyPlayerChanges(teamId, {
      added: [],
      left: [],
      rejoined: [{ id: player.id, name: player.name }]
    });

    expect((await service.getPlayer(player.id))?.left_at).toBeNull();
    expect(await availabilityRowsFor(player.id)).toBe(fixtureIds.length);

    // The tick recorded before they left is kept, not reset
    const rows = await service.getAvailabilityForFixture(fixtureIds[0]);
    expect(rows.find(a => a.player_id === player.id)?.is_available).toBe(1);
  });

  it('does nothing when there are no squad changes', async () => {
    await service.batchApplyPlayerChanges(teamId, { added: [], left: [], rejoined: [] });

    expect(await service.getPlayers(teamId)).toEqual([]);
  });
});
