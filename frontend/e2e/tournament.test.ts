import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import type { TournamentView } from '../src/lib/types/tournament';

// These tests need the worker API running (see TESTING.md). Each test creates its
// own tournament through the API, so they don't depend on seed data.
const API = process.env.VITE_API_URL || 'http://localhost:8787/api';

type Settings = Record<string, unknown>;

async function createTournament(request: APIRequestContext, body: Settings, start = true): Promise<string> {
	const created = await request.post(`${API}/tournaments`, { data: body });
	expect(created.status()).toBe(201);
	const { id } = await created.json();
	if (start) {
		expect((await request.post(`${API}/tournaments/${id}/start`)).ok()).toBe(true);
	}
	return id;
}

async function getView(request: APIRequestContext, id: string): Promise<TournamentView> {
	return (await request.get(`${API}/tournaments/${id}`)).json();
}

/** Every ready group match won by player A from their starting scores, as low as the rules allow */
async function finishGroups(request: APIRequestContext, id: string) {
	const view = await getView(request, id);
	for (const match of view.matches.filter((m) => m.stage === 'group' && m.status === 'ready')) {
		let body: Record<string, unknown>;
		if (view.tournament.score_mode === 'points') {
			const { start_b, play_to } = match.handicap!;
			const winner = start_b >= play_to - 1 ? start_b + 2 : play_to;
			body = {
				game_scores: Array.from({ length: Math.ceil(view.tournament.best_of / 2) }, () => ({ a: winner, b: start_b }))
			};
		} else {
			body = { winner_id: match.player_a_id, games_a: Math.ceil(view.tournament.best_of / 2), games_b: 0 };
		}
		const res = await request.put(`${API}/tournaments/${id}/matches/${match.id}/result`, { data: body });
		expect(res.ok()).toBe(true);
	}
}

function card(page: Page, label: string) {
	return page.locator(`[data-testid="match-card"][data-match-label="${label}"]:visible`);
}

async function openTab(page: Page, name: string) {
	await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name, exact: true }).click();
}

const ranked = (names: string[]) => names.map((name, i) => ({ name, ranking: i + 1 }));

test.describe('Tournament Brackets', () => {
	test('home page links to tournaments', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: /Tournament Brackets/ }).click();
		await expect(page).toHaveURL(/\/tournament$/);
		await expect(page.getByRole('heading', { name: 'Tournament Brackets' })).toBeVisible();
	});

	test('creates a knockout from the form, starts it and plays it to a champion', async ({ page }) => {
		await page.goto('/tournament/new');
		await page.getByLabel('Name', { exact: true }).fill('E2E Knockout');
		await page.getByRole('radio', { name: /Games won/ }).check({ force: true });
		await page.getByRole('button', { name: 'Paste list' }).click();
		await page.getByRole('textbox', { name: /One player per line/ }).fill('Ann, 1\nBob, 2\nCat, 3\nDan, 4\nEve, 5\nFay, 6');
		await page.getByRole('button', { name: 'Add players' }).click();
		await expect(page.getByTestId('draw-summary')).toHaveText('Knockout: 6 players → quarter-finals, with 2 byes.');
		await page.getByRole('button', { name: 'Create draw' }).click();

		await expect(page.getByTestId('status')).toHaveText('Draft');
		await expect(page.getByTestId('seed-table')).toContainText('Ann');

		// Seeds 1 and 2 have byes into the semi-finals
		await openTab(page, 'Bracket');
		await expect(card(page, 'QF1')).toHaveAttribute('data-match-status', 'bye');
		await expect(card(page, 'QF3')).toHaveAttribute('data-match-status', 'bye');
		await expect(card(page, 'SF1')).toContainText('Ann');

		await openTab(page, 'Draw');
		await page.getByRole('button', { name: 'Start tournament' }).click();
		await page.getByRole('button', { name: 'Yes, start' }).click();
		await expect(page.getByTestId('status')).toHaveText('In progress');

		// Better seed wins every match, entered as games won
		for (const label of ['QF2', 'QF4', 'SF1', 'SF2', 'Final']) {
			await openTab(page, 'Bracket');
			await card(page, label).getByRole('button', { name: 'Enter result' }).click();
			const dialog = page.getByRole('dialog');
			await dialog.getByRole('spinbutton').nth(0).fill('3');
			await dialog.getByRole('spinbutton').nth(1).fill('1');
			await dialog.getByRole('button', { name: 'Save result' }).click();
			await expect(dialog).toBeHidden();
		}

		await expect(page.getByTestId('champion')).toContainText('Ann');
		await expect(page.getByTestId('status')).toHaveText('Completed');
	});

	test('shows handicap starts, rejects an impossible score and fills the knockout from the groups', async ({
		page,
		request
	}) => {
		const id = await createTournament(request, {
			name: 'E2E Handicap Groups',
			format: 'groups',
			seeding_mode: 'handicap',
			score_mode: 'points',
			best_of: 3,
			group_count: 2,
			advance_per_group: 2,
			players: [-6, -3, 0, 2, 4, 6, 8, 10].map((h) => ({ name: `H${h}`, handicap: h }))
		});

		await page.goto(`/tournament/${id}`);
		// Group A opens with H-6 v H10: minus v plus, 0-16 to 17
		const first = page.getByTestId('matches-ready').getByTestId('match-card').first();
		await expect(first).toContainText('H-6');
		await expect(first.getByTestId('match-handicap')).toHaveText('Start 0–16 · play to 17');

		await first.getByRole('button', { name: 'Enter result' }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByLabel('Game 1 H-6').fill('17');
		await dialog.getByLabel('Game 2 H-6').fill('18');
		await dialog.getByRole('button', { name: 'Save result' }).click();
		await expect(dialog.getByRole('alert')).toHaveText("Game 1: a game must be won by 2 clear points, so 17-16 isn't finished");
		await dialog.getByRole('button', { name: 'Cancel' }).click();

		await finishGroups(request, id);
		await page.reload();
		await openTab(page, 'Groups');
		await expect(page.getByTestId('group-table')).toHaveCount(2);

		await openTab(page, 'Bracket');
		await expect(card(page, 'SF1')).toContainText('H-6');
		await expect(card(page, 'SF1')).toContainText('H0');
		await expect(card(page, 'SF1').getByTestId('match-handicap')).toHaveText('Start 0–6 · play to 17');

		await card(page, 'SF1').getByRole('button', { name: 'Enter result' }).click();
		await dialog.getByLabel('Game 1 H-6').fill('17');
		await dialog.getByLabel('Game 2 H-6').fill('17');
		await dialog.getByRole('button', { name: 'Save result' }).click();
		await expect(dialog).toBeHidden();
		await expect(card(page, 'Final')).toContainText('H-6');
	});

	test('asks the organiser to order a tie the rules cannot break', async ({ page, request }) => {
		const id = await createTournament(request, {
			name: 'E2E Tie',
			format: 'groups',
			seeding_mode: 'ranking',
			score_mode: 'winner',
			best_of: 5,
			group_count: 2,
			advance_per_group: 1,
			players: ranked(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'])
		});

		// Group A (P1, P4, P5) beat each other in a circle
		const view = await getView(request, id);
		const idOf = (name: string) => view.players.find((p) => p.name === name)!.id;
		for (const [winner, loser] of [['P1', 'P4'], ['P4', 'P5'], ['P5', 'P1']]) {
			const match = view.matches.find(
				(m) => [m.player_a_id, m.player_b_id].sort().join() === [idOf(winner), idOf(loser)].sort().join()
			);
			await request.put(`${API}/tournaments/${id}/matches/${match!.id}/result`, { data: { winner_id: idOf(winner) } });
		}

		await page.goto(`/tournament/${id}`);
		await openTab(page, 'Groups');
		const prompt = page.getByTestId('tie-prompt');
		await expect(prompt).toContainText("P1, P4 and P5 can't be separated");

		// Move P5 to the top
		await prompt.getByRole('button', { name: 'Move P5 up' }).click();
		await prompt.getByRole('button', { name: 'Move P5 up' }).click();
		await prompt.getByRole('button', { name: 'Save order' }).click();
		await expect(prompt).toBeHidden();

		await openTab(page, 'Bracket');
		await expect(card(page, 'Final')).toContainText('P5');
	});

	test('explains setup problems', async ({ page }) => {
		await page.goto('/tournament/new');
		await page.getByLabel('Name', { exact: true }).fill('E2E Invalid');
		await page.getByRole('radio', { name: /^Handicap/ }).check({ force: true });
		await page.getByLabel('Player 1 name').fill('Ann');
		await page.getByLabel('Player 1 handicap').fill('-2');
		await page.getByLabel('Player 2 name').fill('Bob');
		await page.getByRole('button', { name: 'Create draw' }).click();
		await expect(page.getByRole('alert')).toHaveText('Bob needs a handicap');

		await page.getByLabel('Player 2 handicap').fill('3');
		await page.getByRole('radio', { name: /Groups → knockout/ }).check({ force: true });
		await page.getByLabel('Groups', { exact: true }).fill('1');
		await page.getByLabel('Qualify from each').fill('2');
		await page.getByRole('button', { name: 'Create draw' }).click();
		await expect(page.getByRole('alert')).toContainText('at most 1 can qualify');
	});

	test('shows a not-found state for an unknown tournament', async ({ page }) => {
		await page.goto('/tournament/00000000-0000-0000-0000-00000000dead');
		await expect(page.getByTestId('not-found')).toBeVisible();
	});

	test.describe('on a phone', () => {
		test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

		test('shows one round at a time and enters a result', async ({ page, request }) => {
			const id = await createTournament(request, {
				name: 'E2E Phone',
				format: 'knockout',
				seeding_mode: 'ranking',
				score_mode: 'winner',
				best_of: 5,
				players: ranked(['Ann', 'Bob', 'Cat', 'Dan'])
			});

			await page.goto(`/tournament/${id}`);
			await openTab(page, 'Bracket');
			await expect(page.getByRole('tab', { name: 'Semi-final' })).toHaveAttribute('aria-selected', 'true');
			await expect(page.getByTestId('bracket-columns')).toBeHidden();

			await card(page, 'SF1').getByRole('button', { name: 'Enter result' }).click();
			await page.getByRole('dialog').getByRole('radio', { name: 'Ann' }).click();
			await page.getByRole('dialog').getByRole('button', { name: 'Save result' }).click();

			await page.getByRole('tab', { name: 'Final', exact: true }).click();
			await expect(card(page, 'Final')).toContainText('Ann');

			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	});
});
