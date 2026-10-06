import { readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';

/**
 * A real, in-memory D1 database for integration tests, with schema.sql applied.
 *
 * Unlike the hand-rolled D1 mocks, this runs the actual SQL against SQLite in
 * workerd, so constraints, foreign keys and batches behave as they do in production.
 */
export async function createTestD1(): Promise<{ db: D1Database; dispose: () => Promise<void> }> {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response(null); } }',
    d1Databases: { DB: 'test-db' }
  });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;

  // D1's exec() treats each line as a statement, so apply the schema one statement at a time
  const schema = readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8');
  const statements = schema
    .replace(/--.*$/gm, '')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }

  return { db, dispose: () => mf.dispose() };
}
