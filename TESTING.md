# Testing Guide

## Overview

This project has three types of tests:
1. **Unit Tests** (Worker) - Test individual functions and business logic
2. **Unit Tests** (Frontend) - Test frontend utilities and calculations
3. **E2E Tests** (Frontend) - Test the full application flow

## Running Tests

### Worker Unit Tests

```bash
cd worker
npm test                    # Run all tests
npm run test:watch          # Run in watch mode
npm run test:coverage       # Run with coverage report
```

### Frontend Unit Tests

```bash
cd frontend
npm run test:unit           # Run unit tests
npm run test:unit:coverage  # Run with coverage
```

### E2E Tests

E2E tests require both the worker and frontend to be running.

#### Prerequisites

1. **Start the worker API:**
   ```bash
   cd worker
   npm run dev
   ```

2. **In a new terminal, start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

#### Seed Test Data

The E2E tests expect test data to be present in the database. You can seed the data by using

```bash
cd worker
npm run seed
```

#### Run E2E Tests

```bash
cd frontend
npm run test:e2e                # Run E2E tests
npm run test:e2e:coverage       # Run with HTML report
```

#### Run All Tests

```bash
cd frontend
npm test                        # Runs unit + E2E tests
```

## Test Structure

### Worker Tests (`worker/src/`)

- `utils.test.ts` - Date parsing and utility functions (18 tests)
- `validation.test.ts` - Business logic validation (18 tests)
- `database.integration.test.ts` - Database CRUD operations (18 tests)
- `scraper.test.ts` - ELTTL website scraping (11 tests)

**Total: 65 tests**

### Frontend Tests (`frontend/src/`)

- `lib/handicap/scoreCalculator.test.ts` - Handicap calculations (7 tests)

**Total: 7 tests**

### E2E Tests (`frontend/e2e/`)

- `availability-validation.test.ts` - Full availability tracker flow
  - Validation states (3 tests)
  - Past fixtures read-only mode (2 tests)
  - Player summary statistics (3 tests)

**Total: 8 E2E tests**

## Test Coverage

Generate coverage reports:

```bash
# Worker coverage
cd worker
npm run test:coverage
# Opens coverage/index.html

# Frontend unit test coverage
cd frontend
npm run test:unit:coverage

# E2E test report
npm run test:e2e:coverage
# Opens playwright-report/index.html
```

## Debugging Tests

### Worker Tests

Add `console.log` statements or use vitest's debug mode:

```bash
npm run test:watch
```

### E2E Tests

Playwright provides excellent debugging:

```bash
# Run in headed mode (see the browser)
npx playwright test --headed

# Run with Playwright Inspector
npx playwright test --debug

# Run a specific test
npx playwright test -g "displays validation warning"

# Show test trace on failure
npx playwright show-trace test-results/[test-name]/trace.zip
```

## Common Issues

### E2E Tests Timeout

**Problem:** Tests fail with timeout errors

**Solution:** 
- Ensure both worker and frontend are running
- Increase timeout in playwright.config.ts

### No Test Data

**Problem:** E2E tests skip or fail due to missing data

**Solution:**
- Follow the "Seed Test Data" steps above

### Port Conflicts

**Problem:** Cannot start worker or frontend

**Solution:**
- Worker uses port 8787
- Frontend uses port 5173
- Make sure no other processes are using these ports

## Continuous Integration

For CI environments, you can:

1. Run unit tests without services:
   ```bash
   cd worker && npm test
   cd frontend && npm run test:unit
   ```

2. For E2E tests in CI, you'll need to:
   - Set up a test database
   - Seed test data
   - Run both services
   - Execute E2E tests

## Best Practices

1. **Unit tests should be fast** - No external dependencies
2. **E2E tests can be slower** - They test the full stack
3. **Use test.skip() wisely** - E2E tests skip when data is unavailable
4. **Keep test data consistent** - Use the same TEST_TEAM_ID
5. **Clean up after tests** - Integration tests should be idempotent

## Writing New Tests

### Adding Worker Unit Tests

```typescript
// worker/src/myfeature.test.ts
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Adding E2E Tests

```typescript
// frontend/e2e/myfeature.test.ts
import { expect, test } from '@playwright/test';

test('should display something', async ({ page }) => {
  await page.goto('/my-route');
  await expect(page.locator('h1')).toBeVisible();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
