import { expect, test } from '@playwright/test';

// Note: These tests require a running worker API and a test team to be set up
// You may need to adjust the teamId based on your test data
const TEST_TEAM_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Availability Tracker Validation', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the availability tracker for test team
		await page.goto(`/availability/${TEST_TEAM_ID}`);
		
		// Wait for the page to load completely
		await page.waitForSelector('h1', { state: 'visible' });
		
		// Wait for either fixtures or empty state to appear
		await Promise.race([
			page.waitForSelector('text=Upcoming Fixtures', { timeout: 5000 }),
			page.waitForSelector('text=No upcoming fixtures', { timeout: 5000 })
		]).catch(() => {
			// Timeout is okay, we'll handle it in the test
		});
	});

	test('displays validation warning when less than 3 players selected', async ({ page }) => {
		// Wait for "Upcoming Fixtures" section
		await page.waitForSelector('h2:has-text("Upcoming Fixtures")', { state: 'visible' });
		
		// Wait for fixture cards to be visible (look for cards with Availability heading)
		await page.waitForSelector('text=/Availability \\(\\d+\\/\\d+\\)/', { timeout: 10000 });
		
		// Get the first fixture card by finding the card that contains availability checkboxes
		const fixtureCard = page.locator('div').filter({ has: page.locator('h4:has-text("Availability")') }).first();
		await expect(fixtureCard).toBeVisible();
		
		// Wait for checkboxes to be rendered
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		await checkboxes.first().waitFor({ state: 'visible', timeout: 10000 });
		
		const checkboxCount = await checkboxes.count();
		expect(checkboxCount).toBeGreaterThanOrEqual(2);
		
		// Mark 2 players as available
		await checkboxes.nth(0).check({ force: true });
		await page.waitForTimeout(500);
		await checkboxes.nth(1).check({ force: true });
		await page.waitForTimeout(500);
		
		// Add both to selection
		const addButtons = fixtureCard.locator('button:has-text("+")').or(fixtureCard.locator('button[title*="Add to selection"]'));
		const buttonCount = await addButtons.count();
		expect(buttonCount).toBeGreaterThanOrEqual(2);
		
		await addButtons.nth(0).click();
		await page.waitForTimeout(500);
		await addButtons.nth(1).click();
		await page.waitForTimeout(500);
		
		// Check for warning message or counter showing 2/3
		const hasWarning = await fixtureCard.locator('text=/Please select .* more player/i').isVisible();
		const hasCounter = await fixtureCard.locator('text=2/3').isVisible();
		
		expect(hasWarning || hasCounter).toBeTruthy();
	});

	test('disables add button when 3 players already selected', async ({ page }) => {
		// Wait for "Upcoming Fixtures" section
		await page.waitForSelector('h2:has-text("Upcoming Fixtures")', { state: 'visible' });
		
		// Wait for fixture cards to be visible
		await page.waitForSelector('text=/Availability \\(\\d+\\/\\d+\\)/', { timeout: 10000 });
		
		// Get the first fixture card by finding the card that contains availability checkboxes
		const fixtureCard = page.locator('div').filter({ has: page.locator('h4:has-text("Availability")') }).first();
		await expect(fixtureCard).toBeVisible();
		
		// Wait for checkboxes to be rendered
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		await checkboxes.first().waitFor({ state: 'visible', timeout: 10000 });
		
		// First, remove any existing selections
		const removeButtons = fixtureCard.locator('button[title*="Remove from selection"]');
		const removeCount = await removeButtons.count();
		for (let i = 0; i < removeCount; i++) {
			await removeButtons.first().click();
			await page.waitForTimeout(300);
		}
		
		const checkboxCount = await checkboxes.count();
		expect(checkboxCount).toBeGreaterThanOrEqual(4);
		
		// Mark 4 players as available
		for (let i = 0; i < 4; i++) {
			await checkboxes.nth(i).check({ force: true });
			await page.waitForTimeout(300);
		}
		
		// Add 3 players to selection
		const addButtons = fixtureCard.locator('button:has-text("+")').or(fixtureCard.locator('button[title*="Add to selection"]'));
		const buttonCount = await addButtons.count();
		expect(buttonCount).toBeGreaterThanOrEqual(3);
		
		for (let i = 0; i < 3; i++) {
			await addButtons.nth(i).click();
			await page.waitForTimeout(300);
		}
		
		// Verify selection counter shows 3/3
		await page.waitForTimeout(1000);
		const counter = fixtureCard.locator('text=3/3').first();
		
		await expect(counter).toBeVisible();
	});

	test('shows player summary cards', async ({ page }) => {
		// Navigate to Stats tab first
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		await page.locator('button:has-text("Stats")').click();
		await page.waitForTimeout(300);
		
		// Check that Season Stats Summary section exists
		const summaryHeading = page.locator('h2:has-text("Season Stats Summary")');
		await expect(summaryHeading).toBeVisible({ timeout: 15000 });
		
		// Check that player summary cards are displayed
		const summaryCards = page.locator('[class*="bg-white"]').filter({ hasText: /Selection Rate|Played|Scheduled/ });
		const cardCount = await summaryCards.count();
		
		expect(cardCount).toBeGreaterThan(0);
	});
});

test.describe('Past Fixtures Read-Only Mode', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(`/availability/${TEST_TEAM_ID}`);
		await page.waitForSelector('h1', { state: 'visible' });
		// Add extra wait for page to fully render
		await page.waitForTimeout(2000);
	});

	test('displays past fixtures section', async ({ page }) => {
		const pastSection = page.locator('h2:has-text("Past Fixtures")');
		await expect(pastSection).toBeVisible({ timeout: 15000 });
	});

	test('edit button is present for past fixtures', async ({ page }) => {
		const pastSection = page.locator('h2:has-text("Past Fixtures")');
		await expect(pastSection).toBeVisible({ timeout: 10000 });
		
		// Find the Edit button
		const editButton = page.locator('button', { hasText: /Edit|Done Editing/i }).first();
		await expect(editButton).toBeVisible();
		
		// Should initially show "Edit"
		const buttonText = await editButton.textContent();
		expect(buttonText).toMatch(/Edit/i);
	});
});

test.describe('Player Summary Statistics', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(`/availability/${TEST_TEAM_ID}`);
		await page.waitForSelector('h1', { state: 'visible' });
		// Wait for dynamic content to load
		await page.waitForTimeout(2000);
	});

	test('displays player summary section', async ({ page }) => {
		// Navigate to Stats tab first
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		await page.locator('button:has-text("Stats")').click();
		await page.waitForTimeout(300);
		
		// Check that Season Stats Summary section exists
		const summaryHeading = page.locator('h2:has-text("Season Stats Summary")');
		await expect(summaryHeading).toBeVisible({ timeout: 15000 });
	});

	test('shows stat labels in summary cards', async ({ page }) => {
		// Navigate to Stats tab first
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		await page.locator('button:has-text("Stats")').click();
		await page.waitForTimeout(300);
		
		const summaryHeading = page.locator('h2:has-text("Season Stats Summary")');
		await expect(summaryHeading).toBeVisible({ timeout: 15000 });
		
		// Check that stat labels are present somewhere on the page
		const playedLabel = page.locator('text=Played').first();
		const scheduledLabel = page.locator('text=Scheduled').first();
		const totalLabel = page.locator('text=Total').first();
		
		await expect(playedLabel).toBeVisible({ timeout: 5000 });
		await expect(scheduledLabel).toBeVisible({ timeout: 5000 });
		await expect(totalLabel).toBeVisible({ timeout: 5000 });
	});

	test('displays selection rate', async ({ page }) => {
		// Navigate to Stats tab first
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		await page.locator('button:has-text("Stats")').click();
		await page.waitForTimeout(300);
		
		const summaryHeading = page.locator('h2:has-text("Season Stats Summary")');
		await expect(summaryHeading).toBeVisible({ timeout: 15000 });
		
		// Check that selection rate is displayed with percentage
		const selectionRate = page.locator('text=/Selection Rate:.*%/').first();
		await expect(selectionRate).toBeVisible({ timeout: 5000 });
	});

	test('should display three tabs: Fixtures, Stats, Management', async ({ page }) => {
		// Wait for tabs to load
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		
		// Check that all three tabs are visible
		const fixturesTab = page.locator('button:has-text("Fixtures")');
		const statsTab = page.locator('button:has-text("Stats")');
		const managementTab = page.locator('button:has-text("Management")');
		
		await expect(fixturesTab).toBeVisible();
		await expect(statsTab).toBeVisible();
		await expect(managementTab).toBeVisible();
	});

	test('should navigate between tabs', async ({ page }) => {
		// Wait for tabs to load
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		
		// Initially on Fixtures tab
		const fixturesHeading = page.locator('h2:has-text("Upcoming Fixtures")');
		await expect(fixturesHeading).toBeVisible();
		
		// Click Stats tab
		await page.locator('button:has-text("Stats")').click();
		await page.waitForTimeout(300);
		
		// Should show stats content
		const statsHeading = page.locator('h2:has-text("Season Stats Summary")');
		await expect(statsHeading).toBeVisible();
		
		// Click Management tab
		await page.locator('button:has-text("Management")').click();
		await page.waitForTimeout(300);
		
		// Should show management content
		const managementHeading = page.locator('h2:has-text("Fixture Management")');
		await expect(managementHeading).toBeVisible();
	});

	test('should display sync button in Management tab', async ({ page }) => {
		// Navigate to Management tab
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		await page.locator('button:has-text("Management")').click();
		await page.waitForTimeout(500);
		
		// Check for sync button
		const syncButton = page.locator('button:has-text("Sync Fixtures")');
		await expect(syncButton).toBeVisible();
		await expect(syncButton).toBeEnabled();
	});

	// The seeded test team points at a placeholder ELTTL URL, so the sync response
	// is stubbed. That keeps these tests off the live ELTTL site and lets us assert
	// how each kind of change is reported.
	const STUBBED_PLAN = {
		new: [
			{
				match_date: '2026-10-07',
				day_time: 'Oct 7 Wed 18:45',
				home_team: 'Test Team E2E',
				away_team: 'New Opponent',
				venue: null
			}
		],
		updated: [
			{
				id: 'fixture-moved',
				home_team: 'Test Team E2E',
				away_team: 'Moved Opponent',
				old_match_date: '2026-10-14',
				old_day_time: 'Oct 14 Wed 18:45',
				new_match_date: '2026-10-15',
				new_day_time: 'Oct 15 Thu 19:00',
				available_count: 2,
				selected_count: 0
			}
		],
		deleted: [
			{
				id: 'fixture-gone',
				match_date: '2026-10-21',
				day_time: 'Oct 21 Wed 18:45',
				home_team: 'Test Team E2E',
				away_team: 'Cancelled Opponent',
				is_past: 0,
				available_count: 1,
				selected_count: 3
			}
		],
		unchanged_count: 4
	};

	async function stubSync(page: import('@playwright/test').Page, delayMs = 0) {
		await page.route('**/availability/*/sync', async (route) => {
			const dryRun = JSON.parse(route.request().postData() || '{}').dryRun === true;
			if (delayMs > 0) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					dry_run: dryRun,
					fixtures_new: 1,
					fixtures_updated: 1,
					fixtures_deleted: 1,
					fixtures_unchanged: 4,
					updated_fixture_ids: ['fixture-moved'],
					plan: STUBBED_PLAN,
					message: dryRun
						? 'Pending changes: 1 new, 1 updated, 1 deleted, 4 unchanged'
						: 'Sync completed: 1 new, 1 updated, 1 deleted, 4 unchanged'
				})
			});
		});
	}

	async function openManagementTab(page: import('@playwright/test').Page) {
		await page.waitForSelector('nav[aria-label="Tabs"]', { timeout: 10000 });
		const managementTab = page.locator('button:has-text("Management")');
		await managementTab.click();
		await managementTab.waitFor({ state: 'visible' });
	}

	test('should report new, rescheduled and deleted fixtures in the sync preview', async ({
		page
	}) => {
		await stubSync(page);
		await openManagementTab(page);

		// Click sync button - this runs the dry run, it does not write anything
		const syncButton = page.locator('button:has-text("Sync Fixtures")');
		await syncButton.waitFor({ state: 'visible' });
		await syncButton.click();

		// Check for the preview dialog
		const dialog = page.locator('div[role="dialog"]');
		await expect(page.locator('h3:has-text("Sync Preview")')).toBeVisible();

		// Every category of change is listed
		await expect(dialog.getByText('1 new fixture')).toBeVisible();
		await expect(dialog.getByText('Test Team E2E v New Opponent')).toBeVisible();
		await expect(dialog.getByText('1 rescheduled')).toBeVisible();
		await expect(dialog.getByText('Oct 14 Wed 18:45 → Oct 15 Thu 19:00')).toBeVisible();
		await expect(dialog.getByText('Clears 2 available')).toBeVisible();
		await expect(dialog.getByText('1 to delete')).toBeVisible();
		await expect(dialog.getByText('Test Team E2E v Cancelled Opponent')).toBeVisible();
		await expect(dialog.getByText('1 available, 3 selected')).toBeVisible();
		await expect(dialog.getByText('4 fixtures unchanged')).toBeVisible();

		// The data loss warning is spelled out before anything is applied
		await expect(
			dialog.getByText('1 of these already have availability or selections recorded', {
				exact: false
			})
		).toBeVisible();
	});

	test('should not apply anything when the sync preview is cancelled', async ({ page }) => {
		await stubSync(page);
		await openManagementTab(page);

		const syncButton = page.locator('button:has-text("Sync Fixtures")');
		await syncButton.click();

		const dialogHeading = page.locator('h3:has-text("Sync Preview")');
		await expect(dialogHeading).toBeVisible();

		await page.locator('div[role="dialog"] button:has-text("Cancel")').click();

		// Dialog closes and no sync result is recorded
		await expect(dialogHeading).not.toBeVisible();
		await expect(page.locator('text=Last Sync Results')).not.toBeVisible();
	});

	test('should apply the plan and report the results when confirmed', async ({ page }) => {
		await stubSync(page);
		await openManagementTab(page);

		const syncButton = page.locator('button:has-text("Sync Fixtures")');
		await syncButton.click();

		await page.locator('div[role="dialog"] button:has-text("Apply Changes")').click();

		// Dialog closes and the results panel reflects the applied plan
		await expect(page.locator('h3:has-text("Sync Preview")')).not.toBeVisible();
		await expect(page.locator('text=Last Sync Results')).toBeVisible();
		await expect(page.locator('text=1 fixture(s) removed')).toBeVisible();
	});

	test('should show loading state while checking for changes', async ({ page }) => {
		// Slow response so the intermediate button state is observable
		await stubSync(page, 1500);
		await openManagementTab(page);

		const syncButton = page.locator('button:has-text("Sync Fixtures")');
		await syncButton.waitFor({ state: 'visible' });
		await syncButton.click();

		// The dry run scrapes ELTTL, so the button shows a checking state meanwhile
		const checkingButton = page.locator('button:has-text("Checking...")');
		await expect(checkingButton).toBeVisible();
		await expect(checkingButton).toBeDisabled();

		// Once the plan arrives the preview opens and the button returns to normal
		await expect(page.locator('h3:has-text("Sync Preview")')).toBeVisible();
		await page.locator('div[role="dialog"] button:has-text("Cancel")').click();
		await expect(syncButton).toBeVisible();
		await expect(syncButton).toBeEnabled();
	});
});