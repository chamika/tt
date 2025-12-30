import { expect, test } from '@playwright/test';

// Note: These tests require a running worker API and a test team to be set up
// You may need to adjust the teamId based on your test data
const TEST_TEAM_ID = '3ffcdda9-5da7-4387-9884-81bd7b70cc62';

test.describe('Availability Tracker Validation', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the availability tracker for test team
		await page.goto(`/availability/${TEST_TEAM_ID}`);
		await page.waitForLoadState('networkidle');
	});

	test('displays validation warning when less than 3 players selected', async ({ page }) => {
		// Find a future fixture card
		const fixtureCard = page.locator('.bg-white').first();
		
		// Mark 2 players as available
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		await checkboxes.nth(0).check();
		await checkboxes.nth(1).check();
		
		// Add both to selection
		const addButtons = fixtureCard.locator('button:has-text("Add to selection"), button[title*="Add to selection"]');
		await addButtons.nth(0).click();
		await addButtons.nth(1).click();
		
		// Check for warning message
		await expect(fixtureCard.locator('text=/Please select .* more player/i')).toBeVisible();
		
		// Check that selection counter shows 2/3
		await expect(fixtureCard.locator('text=2/3')).toBeVisible();
	});

	test('disables add button when 3 players already selected', async ({ page }) => {
		const fixtureCard = page.locator('.bg-white').first();
		
		// Mark 4 players as available
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		for (let i = 0; i < 4; i++) {
			await checkboxes.nth(i).check();
		}
		
		// Add 3 players to selection
		const addButtons = fixtureCard.locator('button:has-text("Add to selection"), button[title*="Add to selection"]').filter({ hasNotText: 'Remove' });
		for (let i = 0; i < 3; i++) {
			await addButtons.nth(i).click();
		}
		
		// Verify selection counter shows 3/3
		await expect(fixtureCard.locator('text=3/3')).toBeVisible();
		
		// Check that the 4th add button is disabled
		const remainingAddButton = fixtureCard.locator('button[title*="Maximum 3 players"]').first();
		await expect(remainingAddButton).toBeDisabled();
	});

	test('shows insufficient players warning when less than 3 available', async ({ page }) => {
		const fixtureCard = page.locator('.bg-white').first();
		
		// Uncheck all players to start fresh
		const checkedBoxes = fixtureCard.locator('input[type="checkbox"]:checked');
		const count = await checkedBoxes.count();
		for (let i = 0; i < count; i++) {
			await checkedBoxes.nth(0).uncheck();
		}
		
		// Mark only 2 players as available
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		await checkboxes.nth(0).check();
		await checkboxes.nth(1).check();
		
		// Check for insufficient players warning
		await expect(fixtureCard.locator('text=/Only .* players? available/i')).toBeVisible();
		await expect(fixtureCard.locator('text=/Need at least 3 players/i')).toBeVisible();
	});

	test('updates fixture card border color based on validation state', async ({ page }) => {
		const fixtureCard = page.locator('.bg-white').first();
		
		// Get the card element
		const card = fixtureCard.locator('..'); // Parent div with border
		
		// Mark 3 players as available
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		for (let i = 0; i < 3; i++) {
			await checkboxes.nth(i).check();
		}
		
		// Add all 3 to selection
		const addButtons = fixtureCard.locator('button:has-text("Add to selection"), button[title*="Add to selection"]');
		for (let i = 0; i < 3; i++) {
			await addButtons.nth(i).click();
		}
		
		// Wait for the card to update
		await page.waitForTimeout(500);
		
		// Card should have green border when valid (3/3)
		await expect(card).toHaveClass(/border-green/);
	});

	test('prevents changing selection when player is already selected', async ({ page }) => {
		const fixtureCard = page.locator('.bg-white').first();
		
		// Mark 3 players as available
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		await checkboxes.nth(0).check();
		await checkboxes.nth(1).check();
		await checkboxes.nth(2).check();
		
		// Add first player to selection
		const firstAddButton = fixtureCard.locator('button').filter({ hasText: /Add|Plus/ }).first();
		await firstAddButton.click();
		
		// Try to uncheck the first player (should be disabled)
		const firstCheckbox = checkboxes.nth(0);
		await expect(firstCheckbox).toBeDisabled();
	});

	test('shows correct tooltip on disabled selection button', async ({ page }) => {
		const fixtureCard = page.locator('.bg-white').first();
		
		// Mark 3 players as available and select them
		const checkboxes = fixtureCard.locator('input[type="checkbox"]');
		for (let i = 0; i < 3; i++) {
			await checkboxes.nth(i).check();
		}
		
		const addButtons = fixtureCard.locator('button:has-text("Add to selection"), button[title*="Add to selection"]');
		for (let i = 0; i < 3; i++) {
			await addButtons.nth(i).click();
		}
		
		// Mark a 4th player as available
		await checkboxes.nth(3).check();
		
		// The 4th add button should have tooltip about maximum
		const fourthAddButton = fixtureCard.locator('button').filter({ hasText: /Add|Plus/ }).first();
		await expect(fourthAddButton).toHaveAttribute('title', /Maximum 3 players/i);
	});
});

test.describe('Past Fixtures Read-Only Mode', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(`/availability/${TEST_TEAM_ID}`);
		await page.waitForLoadState('networkidle');
	});

	test('past fixtures are disabled by default', async ({ page }) => {
		// Scroll to past fixtures section
		const pastSection = page.locator('h2:has-text("Past Fixtures")');
		await pastSection.scrollIntoViewIfNeeded();
		
		// Check if past fixtures exist
		const pastFixturesCount = await page.locator('text=Past Fixtures').count();
		
		if (pastFixturesCount > 0) {
			// Find checkboxes in past fixtures section
			const pastFixturesContainer = pastSection.locator('..').locator('..'); // Navigate to container
			const checkboxes = pastFixturesContainer.locator('input[type="checkbox"]').first();
			
			// Past fixture controls should be disabled
			await expect(checkboxes).toBeDisabled();
		}
	});

	test('can enable editing mode for past fixtures', async ({ page }) => {
		const pastSection = page.locator('h2:has-text("Past Fixtures")');
		
		// Check if past fixtures exist
		const pastFixturesCount = await page.locator('text=Past Fixtures').count();
		
		if (pastFixturesCount > 0) {
			await pastSection.scrollIntoViewIfNeeded();
			
			// Find and click the Edit button
			const editButton = page.locator('button:has-text("Edit")').first();
			await editButton.click();
			
			// Button text should change to "Done Editing"
			await expect(editButton).toHaveText(/Done Editing/i);
			
			// Past fixture controls should now be enabled
			const pastFixturesContainer = pastSection.locator('..').locator('..');
			const checkboxes = pastFixturesContainer.locator('input[type="checkbox"]').first();
			await expect(checkboxes).not.toBeDisabled();
		}
	});

	test('edit button shows correct state', async ({ page }) => {
		const pastSection = page.locator('h2:has-text("Past Fixtures")');
		const editButton = page.locator('button', { has: page.locator('text=/Edit|Done Editing/i') }).first();
		
		await pastSection.scrollIntoViewIfNeeded();
		
		// Initially should show "Edit"
		await expect(editButton).toHaveText(/Edit/i);
		
		// Click to enable editing
		await editButton.click();
		await expect(editButton).toHaveText(/Done Editing/i);
		
		// Click again to disable editing
		await editButton.click();
		await expect(editButton).toHaveText(/^Edit$/i);
	});
});

test.describe('Player Summary Statistics', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(`/availability/${TEST_TEAM_ID}`);
		await page.waitForLoadState('networkidle');
	});

	test('displays player summary cards', async ({ page }) => {
		// Check that Season Stats Summary section exists
		await expect(page.locator('h2:has-text("Season Stats Summary")')).toBeVisible();
		
		// Check that player summary cards are displayed
		const summaryCards = page.locator('[class*="PlayerSummaryCard"], .bg-white:has-text("Selection Rate")');
		await expect(summaryCards.first()).toBeVisible();
	});

	test('shows correct stat labels', async ({ page }) => {
		const summaryCard = page.locator('.bg-white:has-text("Selection Rate")').first();
		
		// Check that all three stat labels are present
		await expect(summaryCard.locator('text=Played')).toBeVisible();
		await expect(summaryCard.locator('text=Scheduled')).toBeVisible();
		await expect(summaryCard.locator('text=Total')).toBeVisible();
	});

	test('displays selection rate percentage', async ({ page }) => {
		const summaryCard = page.locator('.bg-white:has-text("Selection Rate")').first();
		
		// Check that selection rate is displayed with percentage
		await expect(summaryCard.locator('text=/Selection Rate:.*%/')).toBeVisible();
	});
});
