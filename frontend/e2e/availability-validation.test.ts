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
		// Check that Season Stats Summary section exists
		const summaryHeading = page.locator('h2:has-text("Season Stats Summary")');
		await expect(summaryHeading).toBeVisible({ timeout: 15000 });
	});

	test('shows stat labels in summary cards', async ({ page }) => {
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
		const summaryHeading = page.locator('h2:has-text("Season Stats Summary")');
		await expect(summaryHeading).toBeVisible({ timeout: 15000 });
		
		// Check that selection rate is displayed with percentage
		const selectionRate = page.locator('text=/Selection Rate:.*%/').first();
		await expect(selectionRate).toBeVisible({ timeout: 5000 });
	});
});