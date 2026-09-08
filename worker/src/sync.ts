import type {
  FixtureDataCounts,
  FixtureRow,
  ScrapedFixture,
  SyncPlan,
  SyncPlanDelete,
  SyncPlanNew,
  SyncPlanUpdate
} from './types';
import { isPastDate, parseMatchDate } from './utils';

/**
 * Key used to match a scraped fixture against a stored one.
 * ELTTL does not expose fixture ids, so the pairing of team names is all we have.
 */
function fixtureKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam}|${awayTeam}`;
}

const NO_DATA: FixtureDataCounts = { available: 0, selected: 0 };

/**
 * Work out what a sync would change, without touching the database.
 *
 * The same plan drives both the dry-run preview and the write, so what the user
 * approves is exactly what gets applied.
 *
 * @param existing Fixtures currently stored for the team
 * @param scraped Fixtures currently listed on ELTTL
 * @param dataCounts Availability/selection counts per fixture id, used to flag data loss
 * @param referenceDate Optional "now", used for season roll-over and past-fixture flagging
 */
export function computeSyncPlan(
  existing: FixtureRow[],
  scraped: ScrapedFixture[],
  dataCounts: Map<string, FixtureDataCounts>,
  referenceDate?: Date
): SyncPlan {
  const existingByKey = new Map<string, FixtureRow>();
  for (const fixture of existing) {
    existingByKey.set(fixtureKey(fixture.home_team, fixture.away_team), fixture);
  }

  const newFixtures: SyncPlanNew[] = [];
  const updated: SyncPlanUpdate[] = [];
  const scrapedKeys = new Set<string>();
  let unchangedCount = 0;

  for (const fixture of scraped) {
    const matchDate = parseMatchDate(fixture.date, referenceDate);
    const dayTime = `${fixture.date} ${fixture.time}`;
    const key = fixtureKey(fixture.homeTeam, fixture.awayTeam);
    scrapedKeys.add(key);

    const match = existingByKey.get(key);

    if (!match) {
      newFixtures.push({
        match_date: matchDate,
        day_time: dayTime,
        home_team: fixture.homeTeam,
        away_team: fixture.awayTeam,
        venue: fixture.venue ?? null
      });
      continue;
    }

    if (match.match_date === matchDate && match.day_time === dayTime) {
      unchangedCount++;
      continue;
    }

    const counts = dataCounts.get(match.id) ?? NO_DATA;
    updated.push({
      id: match.id,
      home_team: match.home_team,
      away_team: match.away_team,
      old_match_date: match.match_date,
      old_day_time: match.day_time,
      new_match_date: matchDate,
      new_day_time: dayTime,
      available_count: counts.available,
      selected_count: counts.selected
    });
  }

  // Anything we hold that ELTTL no longer lists has been dropped from the league
  // schedule - remove it rather than leaving a stale fixture behind forever.
  const deleted: SyncPlanDelete[] = [];
  for (const fixture of existing) {
    if (scrapedKeys.has(fixtureKey(fixture.home_team, fixture.away_team))) continue;

    const counts = dataCounts.get(fixture.id) ?? NO_DATA;
    deleted.push({
      id: fixture.id,
      match_date: fixture.match_date,
      day_time: fixture.day_time,
      home_team: fixture.home_team,
      away_team: fixture.away_team,
      is_past: isPastDate(fixture.match_date, referenceDate) ? 1 : 0,
      available_count: counts.available,
      selected_count: counts.selected
    });
  }

  return {
    new: newFixtures,
    updated,
    deleted,
    unchanged_count: unchangedCount
  };
}

/**
 * True when applying the plan would not change anything
 */
export function isEmptyPlan(plan: SyncPlan): boolean {
  return plan.new.length === 0 && plan.updated.length === 0 && plan.deleted.length === 0;
}

/**
 * Human readable summary of a plan, used for the toast shown after a sync
 */
export function describeSyncPlan(plan: SyncPlan, dryRun: boolean): string {
  if (isEmptyPlan(plan)) {
    return 'All fixtures are up to date';
  }

  const parts: string[] = [];
  if (plan.new.length > 0) parts.push(`${plan.new.length} new`);
  if (plan.updated.length > 0) parts.push(`${plan.updated.length} updated`);
  if (plan.deleted.length > 0) parts.push(`${plan.deleted.length} deleted`);
  parts.push(`${plan.unchanged_count} unchanged`);

  const summary = parts.join(', ');
  return dryRun ? `Pending changes: ${summary}` : `Sync completed: ${summary}`;
}
