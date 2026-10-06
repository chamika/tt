import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestD1 } from './d1';
import { DatabaseService } from '../database';

describe('D1 test harness', () => {
  let db: D1Database;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await createTestD1());
  });

  afterAll(async () => {
    await dispose();
  });

  it('applies schema.sql so the services can read and write', async () => {
    const service = new DatabaseService(db);
    const team = await service.createTeam('Harness Team', 'https://elttl.interactive.co.uk/teams/view/1');

    expect(await service.getTeam(team.id)).toMatchObject({ name: 'Harness Team' });
  });

  it('enforces foreign keys with cascading deletes', async () => {
    const service = new DatabaseService(db);
    const team = await service.createTeam('Cascade Team', 'https://elttl.interactive.co.uk/teams/view/2');
    await service.createPlayer(team.id, 'Player A');

    await db.prepare('DELETE FROM teams WHERE id = ?').bind(team.id).run();

    expect(await service.getPlayers(team.id)).toEqual([]);
  });
});
