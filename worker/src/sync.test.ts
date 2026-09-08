import { describe, it, expect } from 'vitest';
import { computeSyncPlan, describeSyncPlan, isEmptyPlan } from './sync';
import type { FixtureDataCounts, FixtureRow, ScrapedFixture } from './types';

// Mid-season reference date so parseMatchDate puts Jan-Jul fixtures in 2026
const REFERENCE_DATE = new Date('2026-01-05T12:00:00Z');

function fixture(overrides: Partial<FixtureRow> & Pick<FixtureRow, 'id'>): FixtureRow {
	return {
		team_id: 'team-1',
		match_date: '2026-01-15',
		day_time: 'Jan 15 Wed 18:45',
		home_team: 'Test Team',
		away_team: 'Opposition A',
		venue: null,
		created_at: 1704067200000,
		...overrides
	};
}

function scraped(overrides: Partial<ScrapedFixture> = {}): ScrapedFixture {
	return {
		date: 'Jan 15',
		time: 'Wed 18:45',
		homeTeam: 'Test Team',
		awayTeam: 'Opposition A',
		...overrides
	};
}

function plan(
	existing: FixtureRow[],
	scrapedFixtures: ScrapedFixture[],
	counts: Record<string, FixtureDataCounts> = {}
) {
	return computeSyncPlan(existing, scrapedFixtures, new Map(Object.entries(counts)), REFERENCE_DATE);
}

describe('computeSyncPlan', () => {
	it('reports fixtures that match on date and time as unchanged', () => {
		const result = plan([fixture({ id: 'f1' })], [scraped()]);

		expect(result).toEqual({
			new: [],
			updated: [],
			deleted: [],
			unchanged_count: 1
		});
	});

	it('reports a scraped fixture with no stored counterpart as new', () => {
		const result = plan(
			[],
			[scraped({ awayTeam: 'Opposition C', date: 'Jan 29', venue: 'VENUE1' })]
		);

		expect(result.new).toEqual([
			{
				match_date: '2026-01-29',
				day_time: 'Jan 29 Wed 18:45',
				home_team: 'Test Team',
				away_team: 'Opposition C',
				venue: 'VENUE1'
			}
		]);
		expect(result.deleted).toEqual([]);
	});

	it('normalises a missing venue to null', () => {
		const result = plan([], [scraped()]);

		expect(result.new[0].venue).toBeNull();
	});

	it('reports a rescheduled fixture as updated, carrying the data it would clear', () => {
		const result = plan(
			[fixture({ id: 'f1' })],
			[scraped({ date: 'Jan 16', time: 'Thu 19:00' })],
			{ f1: { available: 2, selected: 3 } }
		);

		expect(result.updated).toEqual([
			{
				id: 'f1',
				home_team: 'Test Team',
				away_team: 'Opposition A',
				old_match_date: '2026-01-15',
				old_day_time: 'Jan 15 Wed 18:45',
				new_match_date: '2026-01-16',
				new_day_time: 'Jan 16 Thu 19:00',
				available_count: 2,
				selected_count: 3
			}
		]);
		expect(result.unchanged_count).toBe(0);
	});

	it('treats a time-only change as an update', () => {
		const result = plan([fixture({ id: 'f1' })], [scraped({ time: 'Wed 19:30' })]);

		expect(result.updated).toHaveLength(1);
		expect(result.updated[0].new_match_date).toBe('2026-01-15');
		expect(result.updated[0].new_day_time).toBe('Jan 15 Wed 19:30');
	});

	it('reports a stored fixture missing from ELTTL as deleted', () => {
		const stale = fixture({
			id: 'f2',
			match_date: '2026-01-22',
			day_time: 'Jan 22 Wed 18:45',
			home_team: 'Opposition B',
			away_team: 'Test Team'
		});

		const result = plan([fixture({ id: 'f1' }), stale], [scraped()], {
			f2: { available: 1, selected: 3 }
		});

		expect(result.deleted).toEqual([
			{
				id: 'f2',
				match_date: '2026-01-22',
				day_time: 'Jan 22 Wed 18:45',
				home_team: 'Opposition B',
				away_team: 'Test Team',
				is_past: 0,
				available_count: 1,
				selected_count: 3
			}
		]);
		expect(result.unchanged_count).toBe(1);
	});

	it('defaults the data counts to zero for a fixture with nothing recorded', () => {
		const result = plan([fixture({ id: 'f1' })], []);

		expect(result.deleted[0]).toMatchObject({ available_count: 0, selected_count: 0 });
	});

	it('flags a deleted fixture whose date has already passed', () => {
		const result = plan([fixture({ id: 'f1', match_date: '2025-10-01' })], []);

		expect(result.deleted[0].is_past).toBe(1);
	});

	it('deletes everything and adds everything when the schedule is replaced wholesale', () => {
		const existing = [
			fixture({ id: 'f1' }),
			fixture({ id: 'f2', home_team: 'Opposition B', away_team: 'Test Team' })
		];
		const replacement = [
			scraped({ awayTeam: 'Opposition X', date: 'Feb 4' }),
			scraped({ homeTeam: 'Opposition Y', awayTeam: 'Test Team', date: 'Feb 11' })
		];

		const result = plan(existing, replacement);

		expect(result.new).toHaveLength(2);
		expect(result.deleted.map((f) => f.id)).toEqual(['f1', 'f2']);
		expect(result.updated).toEqual([]);
		expect(result.unchanged_count).toBe(0);
	});

	it('deletes every stored fixture when ELTTL lists none', () => {
		const result = plan([fixture({ id: 'f1' }), fixture({ id: 'f2', away_team: 'B' })], []);

		expect(result.deleted.map((f) => f.id)).toEqual(['f1', 'f2']);
		expect(result.new).toEqual([]);
	});

	it('matches on team names only, so a home/away swap is a delete plus an add', () => {
		const result = plan(
			[fixture({ id: 'f1' })],
			[scraped({ homeTeam: 'Opposition A', awayTeam: 'Test Team' })]
		);

		expect(result.new).toHaveLength(1);
		expect(result.deleted.map((f) => f.id)).toEqual(['f1']);
	});
});

describe('isEmptyPlan', () => {
	it('is true when nothing would change', () => {
		expect(isEmptyPlan(plan([fixture({ id: 'f1' })], [scraped()]))).toBe(true);
	});

	it('is false when a fixture would be deleted', () => {
		expect(isEmptyPlan(plan([fixture({ id: 'f1' })], []))).toBe(false);
	});
});

describe('describeSyncPlan', () => {
	it('says everything is up to date for an empty plan', () => {
		const empty = plan([fixture({ id: 'f1' })], [scraped()]);

		expect(describeSyncPlan(empty, false)).toBe('All fixtures are up to date');
		expect(describeSyncPlan(empty, true)).toBe('All fixtures are up to date');
	});

	it('lists only the categories that have changes', () => {
		const result = plan([fixture({ id: 'f1' })], []);

		expect(describeSyncPlan(result, false)).toBe('Sync completed: 1 deleted, 0 unchanged');
	});

	it('phrases a dry run as pending changes', () => {
		const result = plan([fixture({ id: 'f1' })], []);

		expect(describeSyncPlan(result, true)).toBe('Pending changes: 1 deleted, 0 unchanged');
	});
});
