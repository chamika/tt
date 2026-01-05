# Fixture Date Resync Feature - Implementation Tasks

## Overview
Enable users to resynchronize fixture dates with the ELTTL website after matches are rescheduled. The system will automatically clear availability and selections when dates change, while preserving data for unchanged fixtures.

## Backend Implementation

### 1. Database Service Extensions ✅
**File:** `worker/src/database.ts`

- [x] Add `getFixtureByTeams(teamId: string, homeTeam: string, awayTeam: string): Promise<Fixture | null>`
  - Query fixtures table matching team_id, home_team, and away_team
  - Used to match existing fixtures with scraped data
  
- [x] Add `updateFixtureDate(fixtureId: string, matchDate: string, dayTime: string): Promise<void>`
  - Update match_date and day_time for a fixture
  - Recalculate is_past using isPastDate()
  - Update updated_at timestamp (add this column if needed)

- [x] Add `clearAvailabilityForFixture(fixtureId: string): Promise<void>`
  - Delete all availability records for a fixture
  - Called when fixture date changes

### 2. API Endpoint ✅
**File:** `worker/src/index.ts`

- [x] Create `POST /api/availability/{teamId}/sync` endpoint
  - Validate teamId exists in database
  - Fetch team.elttl_url from database
  - Call `scrapeTeamFixtures(elttl_url)` to get current fixtures
  - For each scraped fixture:
    - Match to existing fixture using `getFixtureByTeams()`
    - If match found:
      - Compare match_date and day_time
      - If changed:
        - Call `updateFixtureDate()`
        - Call `clearAvailabilityForFixture()`
        - Call `clearFinalSelections()`
        - Track as updated fixture
      - If unchanged, track as unchanged
    - If no match found:
      - Create new fixture using `createFixture()`
      - Initialize availability for all players (default false)
      - Track as new fixture
  - Return SyncResponse with counts

### 3. Type Definitions ✅
**File:** `worker/src/types.ts`

- [x] Add `SyncResponse` interface:
  ```typescript
  export interface SyncResponse {
    success: boolean;
    fixtures_updated: number;
    fixtures_unchanged: number;
    fixtures_new: number;
    updated_fixture_ids: string[];
    message: string;
  }
  ```

## Frontend Implementation

### 4. API Client ✅
**File:** `frontend/src/lib/api/availability.ts`

- [x] Add `syncFixtures(teamId: string): Promise<SyncResponse>`
  - POST to `/api/availability/${teamId}/sync`
  - Handle response with proper error handling
  - Return parsed SyncResponse

### 5. Type Definitions ✅
**File:** `frontend/src/lib/types/availability.ts`

- [x] Add `SyncResponse` interface (matching backend)

### 6. UI Implementation ✅
**File:** `frontend/src/routes/availability/[teamId]/+page.svelte`

#### Tab Structure
- [x] Create tab state management
  - Add `currentTab` reactive variable (default: 'fixtures')
  - Add tab navigation buttons/component
  
- [x] **Tab 1: Fixtures**
  - Move existing fixture display logic here
  - Show upcoming fixtures (existing upcoming section)
  - Show past fixtures (existing past section)
  - Keep all existing functionality (availability checkboxes, selections, edit mode)
  
- [x] **Tab 2: Stats**
  - Move existing "Season Stats Summary" section here
  - Display PlayerSummaryCard components
  - Keep all existing stats functionality
  
- [x] **Tab 3: Management**
  - Add "Sync Fixtures" button
  - Add confirmation dialog before sync
  - Add loading state during sync operation
  - Display sync results (fixtures updated/unchanged/new)
  - Show error messages if sync fails
  - Auto-reload team data after successful sync

#### Sync Functionality
- [x] Add `handleSync()` function
  - Show confirmation dialog
  - Set loading state
  - Call `syncFixtures(teamId)`
  - Display notification with results
  - Reload team data to show updates
  - Handle errors gracefully

- [x] Add sync state variables
  - `isSyncing: boolean` - Loading state
  - `syncResult: SyncResponse | null` - Last sync result
  - `showSyncConfirm: boolean` - Confirmation dialog state

## Testing

### Backend Tests
**File:** `worker/src/database.integration.test.ts`

- [ ] Test `getFixtureByTeams()` - matches correct fixture
- [ ] Test `getFixtureByTeams()` - returns null when no match
- [ ] Test `updateFixtureDate()` - updates date and recalculates is_past
- [ ] Test `clearAvailabilityForFixture()` - removes all availability records

### API Tests
**File:** `worker/src/index.ts` (integration tests)

- [ ] Test sync endpoint with unchanged fixtures (idempotent)
- [ ] Test sync endpoint with changed fixture dates
- [ ] Test sync endpoint with new fixtures
- [ ] Test sync endpoint clears availability/selections on date change
- [ ] Test sync endpoint with invalid team ID
- [ ] Test sync endpoint with scraping errors

### Frontend Tests
**File:** `frontend/e2e/availability-validation.test.ts`

- [ ] Test tab navigation (all three tabs render correctly)
- [ ] Test sync button click triggers confirmation
- [ ] Test successful sync updates fixture list
- [ ] Test sync error displays error message
- [ ] Test sync loading state

## Edge Cases & Considerations

### Fixture Matching
- [ ] Handle case-insensitive team name matching (ELTTL may change capitalization)
- [ ] Handle venue changes without triggering availability clear
- [ ] Handle fixtures with duplicate home/away teams (cup competitions?)

### Data Integrity
- [ ] Ensure idempotency - calling sync multiple times doesn't change data
- [ ] Preserve player data even if player no longer appears in scrape
- [ ] Handle timezone issues with date comparisons

### UI/UX
- [ ] Add loading skeletons during sync
- [ ] Show clear feedback about what changed
- [ ] Prevent concurrent sync operations
- [ ] Add "last synced" timestamp display
- [ ] Consider adding auto-sync on page load (optional)

### Error Handling
- [ ] Handle ELTTL website unavailable
- [ ] Handle malformed HTML from scraper
- [ ] Handle database transaction failures
- [ ] Display user-friendly error messages

## Future Enhancements
- [ ] Add webhook for automatic sync when ELTTL updates
- [ ] Track sync history in database
- [ ] Add "deleted fixture" handling (fixtures removed from ELTTL)
- [ ] Bulk notification to players when fixtures are rescheduled
- [ ] Add sync frequency limits to prevent abuse
