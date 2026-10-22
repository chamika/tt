import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// These tests need the worker API running (see TESTING.md). Each test creates its
// own match through the API, so they don't depend on seed data.
const API = process.env.VITE_API_URL || 'http://localhost:8787/api';

const DETAILS = {
	title: 'E2E Division',
	match_date: '2026-10-22',
	home_team: 'Hornets',
	away_team: 'Wasps',
	home_players: ['Ann', 'Bea', 'Cat'],
	away_players: ['Xan', 'Yaz', 'Zoe']
};

async function createMatch(request: APIRequestContext): Promise<string> {
	const created = await request.post(`${API}/team-matches`, { data: DETAILS });
	expect(created.status()).toBe(201);
	return (await created.json()).id;
}

/** Odd rubbers to home, even to away: 5-5 once all are in */
async function enterRubber(request: APIRequestContext, id: string, number: number) {
	const game = number % 2 ? { a: 11, b: 3 } : { a: 3, b: 11 };
	const body = { game_scores: [game, game, game], ...(number === 7 ? { home_pair: 'AB', away_pair: 'XY' } : {}) };
	expect((await request.put(`${API}/team-matches/${id}/rubbers/${number}`, { data: body })).ok()).toBe(true);
}

function rubber(page: Page, number: number) {
	return page.locator(`[data-testid="rubber"][data-rubber="${number}"]`);
}

/** Key by key, as on a phone */
async function typeScore(page: Page, label: string, score: string) {
	const field = page.getByRole('dialog').getByLabel(label);
	await field.click();
	await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
	await field.pressSequentially(score);
}

test.describe('Team Match Card', () => {
	test('is reached from the tournaments page and created from the form', async ({ page }) => {
		await page.goto('/tournament');
		await page.getByRole('link', { name: 'Create a Team Match' }).click();
		await expect(page).toHaveURL(/\/team-match\/new$/);
		await page.waitForLoadState('networkidle');

		await page.locator('#home-team').fill('Hornets');
		await page.locator('#away-team').fill('Wasps');
		for (const [label, name] of [['A', 'Ann'], ['B', 'Bea'], ['C', 'Cat']]) {
			await page.getByLabel(`Home player ${label}`).fill(name);
		}
		for (const [label, name] of [['X', 'Xan'], ['Y', 'Yaz'], ['Z', 'Zoe']]) {
			await page.getByLabel(`Away player ${label}`).fill(name);
		}
		await page.getByRole('button', { name: 'Create match card' }).click();

		await expect(page).toHaveURL(/\/team-match\/[0-9a-f-]{36}$/);
		await expect(page.getByTestId('status')).toHaveText('Not started');
		await expect(page.getByTestId('rubber')).toHaveCount(10);
		await expect(rubber(page, 10)).toContainText('Ann');
		await expect(rubber(page, 10)).toContainText('Yaz');
	});

	test('enters a singles and the doubles, and rejects an impossible score', async ({ page, request }) => {
		const id = await createMatch(request);
		await page.goto(`/team-match/${id}`, { waitUntil: 'networkidle' });

		await rubber(page, 1).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toContainText('Ann v Xan');
		await typeScore(page, 'Game 1 Xan', '7');
		await expect(dialog.getByLabel('Game 1 Ann')).toHaveValue('11');
		await typeScore(page, 'Game 2 Ann', '10');
		await typeScore(page, 'Game 2 Xan', '11');
		await dialog.getByLabel('Game 3 Ann').click();
		await expect(dialog.getByTestId('game-problem')).toContainText('2 clear points');
		await typeScore(page, 'Game 2 Xan', '12');
		await typeScore(page, 'Game 3 Xan', '5');
		await typeScore(page, 'Game 4 Xan', '9');
		await expect(dialog.getByTestId('rubber-tally')).toHaveText('Ann wins 3–1');
		await dialog.getByRole('button', { name: 'Save rubber' }).click();
		await expect(dialog).toBeHidden();
		await expect(rubber(page, 1).getByTestId('running')).toHaveText('1–0');
		await expect(rubber(page, 1).getByTestId('rubber-games')).toHaveText('11-7, 10-12, 11-5, 11-9');
		await expect(page.getByTestId('score')).toContainText('1–0');

		// The doubles can't be saved until both pairs are chosen
		await rubber(page, 7).click();
		await typeScore(page, 'Game 1 Hornets', '4');
		await typeScore(page, 'Game 2 Hornets', '6');
		await typeScore(page, 'Game 3 Hornets', '8');
		await expect(dialog.getByRole('button', { name: 'Save rubber' })).toBeDisabled();
		await dialog.getByTestId('pair-home').getByRole('radio', { name: /A & C/ }).click();
		await dialog.getByTestId('pair-away').getByRole('radio', { name: /Y & Z/ }).click();
		await expect(dialog.getByTestId('rubber-tally')).toHaveText('Yaz & Zoe wins 3–0');
		await dialog.getByRole('button', { name: 'Save rubber' }).click();
		await expect(dialog).toBeHidden();
		await expect(rubber(page, 7)).toContainText('Ann & Cat');
		await expect(rubber(page, 7).getByTestId('running')).toHaveText('1–1');
	});

	test('shows a 5-5 draw and keeps results when a name is corrected', async ({ page, request }) => {
		const id = await createMatch(request);
		for (let n = 1; n <= 10; n++) await enterRubber(request, id, n);

		await page.goto(`/team-match/${id}`, { waitUntil: 'networkidle' });
		await expect(page.getByTestId('outcome')).toHaveText('Draw 5–5');
		await expect(page.getByTestId('status')).toHaveText('Completed');

		await page.getByRole('button', { name: 'Edit details' }).click();
		await page.getByLabel('Home player A').fill('Anne');
		await page.getByRole('button', { name: 'Save details' }).click();
		await expect(rubber(page, 1)).toContainText('Anne');
		await expect(page.getByTestId('outcome')).toHaveText('Draw 5–5');
	});

	test('opens a pasted team match link from the tournaments page', async ({ page, request }) => {
		const id = await createMatch(request);
		await page.goto('/tournament', { waitUntil: 'networkidle' });
		await page.getByPlaceholder(/paste a tournament or match link/).fill(`https://tabletennis.pages.dev/team-match/${id}`);
		await page.getByRole('button', { name: 'Open' }).click();
		await expect(page).toHaveURL(new RegExp(`/team-match/${id}$`));
		await expect(page.getByTestId('rubber')).toHaveCount(10);
	});

	test('shows a not-found state for an unknown match', async ({ page }) => {
		await page.goto('/team-match/00000000-0000-4000-8000-000000000000');
		await expect(page.getByTestId('not-found')).toBeVisible();
	});

	test.describe('on a phone', () => {
		test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

		test('fits the card and the doubles dialog without sideways scrolling', async ({ page, request }) => {
			const id = await createMatch(request);
			await request.put(`${API}/team-matches/${id}`, {
				data: { ...DETAILS, home_players: ['Alexandria Montgomery-Smythe', 'Bea', 'Cat'] }
			});
			await enterRubber(request, id, 1);
			await page.goto(`/team-match/${id}`, { waitUntil: 'networkidle' });

			const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			expect(await overflow()).toBeLessThanOrEqual(0);

			await rubber(page, 7).click();
			await expect(page.getByRole('dialog').getByTestId('pair-home')).toBeVisible();
			expect(await overflow()).toBeLessThanOrEqual(0);
		});
	});
});
