# ELTTL Availability Tracker - Implementation TODO

## Phase 1: Foundation (Week 1) ✅ COMPLETED

### Database Setup
- [x] Configure Cloudflare D1 database binding in wrangler.toml
- [x] Create database schema file (schema.sql)
- [x] Create migration scripts
  - [x] teams table
  - [x] fixtures table
  - [x] players table
  - [x] availability table
  - [x] final_selections table
  - [x] Add indexes for performance
- [x] Create seed data script for testing
- [x] Test D1 connection from Worker

### Worker API Structure
- [x] Set up D1 binding in worker/src/index.ts
- [x] Create API route structure
- [x] Add error handling middleware
- [x] Add CORS configuration
- [x] Create utility functions for database operations
- [x] Add UUID generation utility

---

## Phase 2: Backend API (Week 2) ✅ COMPLETED

### ELTTL Scraper
- [x] Research ELTTL HTML structure
- [x] Install HTML parser (node-html-parser)
- [x] Implement `scrapeELTTLTeam(url)` function
  - [x] Extract team name
  - [x] Parse fixtures table (date, time, home, away)
  - [x] Parse squad/players list
  - [x] Handle parsing errors gracefully
- [x] Add validation for scraped data
- [x] Write tests for scraper

### Import Endpoint
- [x] POST /api/availability/import
  - [x] Accept ELTTL URL in request body
  - [x] Call scraper function
  - [x] Generate team UUID
  - [x] Save team to database
  - [x] Save fixtures to database
  - [x] Save players to database
  - [x] Initialize availability records (all false by default)
  - [x] Return team UUID and redirect URL
  - [x] Handle duplicate imports
- [ ] Add rate limiting
- [x] Add input validation

### CRUD Endpoints
- [x] GET /api/availability/:teamId
  - [x] Fetch team details
  - [x] Fetch all fixtures with availability
  - [x] Fetch all players
  - [x] Fetch final selections
  - [x] Return combined data structure
  - [x] Handle team not found
- [x] PATCH /api/availability/:teamId/fixture/:fixtureId/player/:playerId
  - [x] Update availability record
  - [x] Return updated data
  - [x] Add validation
- [x] POST /api/availability/:teamId/fixture/:fixtureId/selection
  - [x] Validate exactly 3 players selected
  - [x] Clear existing selections
  - [x] Save new selections
  - [x] Return updated selections
- [x] GET /api/availability/:teamId/summary
  - [x] Calculate games played (past)
  - [x] Calculate games scheduled (future)
  - [x] Calculate selection rate per player
  - [x] Return summary data

---

## Phase 3: Frontend Foundation (Week 3) ✅ COMPLETED

### Route Structure
- [x] Create frontend/src/routes/availability/+page.svelte (landing page)
- [x] Create frontend/src/routes/availability/new/+page.svelte (import form)
- [x] Create frontend/src/routes/availability/[teamId]/+page.svelte (main tracker)
- [x] Create frontend/src/routes/availability/[teamId]/+page.server.ts (SSR data loading)
- [x] Add navigation links from home page
- [x] Update ToolCard on home page to enable availability tracker

### API Client
- [x] Create frontend/src/lib/api/availability.ts
  - [x] importTeam(elttlUrl)
  - [x] getTeamData(teamId)
  - [x] updateAvailability(teamId, fixtureId, playerId, isAvailable)
  - [x] setFinalSelection(teamId, fixtureId, playerIds)
  - [x] getPlayerSummary(teamId)
- [x] Add error handling
- [x] Add loading states
- [x] Add TypeScript types for API responses

### Basic Components
- [x] Create frontend/src/lib/components/availability/AvailabilityImportForm.svelte
  - [x] URL input field
  - [x] Submit button
  - [x] Loading state
  - [x] Error handling
  - [x] Validation
- [x] Create frontend/src/lib/components/availability/FixtureCard.svelte
  - [x] Match details (date, time, home, away)
  - [x] Player availability checkboxes
  - [x] Final selection UI (max 3)
  - [x] Validation indicator
- [x] Create frontend/src/lib/components/availability/PlayerSummaryCard.svelte
  - [x] Player name
  - [x] Player icon/avatar
  - [x] Stats display (played, scheduled, total)
  - [x] Selection rate
- [x] Create frontend/src/lib/components/availability/AvailabilityTracker.svelte
  - [x] Main container
  - [x] Fixtures grid
  - [x] Player summary section

---

## Phase 4: UI Polish (Week 4) ✅ COMPLETED

### Design Implementation
- [x] Fixture card styling
  - [x] Header should have match date, teams playing and venue
  - [x] The spacing between player rows should be consistent irrespective of the selection/remove buttons
- [x] Implement dark mode support
  - [x] Dark mode colors for all components
  - [x] Toggle respects existing darkMode store
- [x] Implement light mode support
  - [x] Light mode colors for all components

### Responsive Design
- [x] Mobile layout (< 640px)
  - [x] Single column fixture cards
  - [x] Simplified player summary
  - [x] Touch-friendly controls
- [x] Tablet layout (640px - 1024px)
  - [x] Two column fixture cards
  - [x] Grid player summary
- [x] Desktop layout (> 1024px)
  - [x] Three column fixture cards
  - [x] Full player summary grid

### Loading & Error States
- [x] Add skeleton loaders for fixtures
- [x] Add skeleton loaders for player summaries
- [x] Add empty states (no fixtures, no players)
- [x] Add error messages with retry options
- [x] Add success notifications
- [x] Add optimistic updates

---

## Phase 5: Features & Testing (Week 5) ✅ COMPLETED

### Validation & Business Logic
- [x] Add client-side validation for 3-player selection
  - [x] Disable selection if < 3 available
  - [x] Warn if > 3 selected
  - [x] Highlight invalid fixtures
  - [x] Add tooltips for disabled states
  - [x] Show insufficient players warning
- [x] Add server-side validation
  - [x] Verify selected players are available
  - [x] Validate maximum 3 players
  - [x] Return appropriate error messages
- [x] Implement past vs future match filtering
  - [x] Mark past matches as read-only by default
  - [x] Add edit mode toggle for past matches
  - [x] Different styling for past matches
  - [x] Opacity reduction when disabled
- [x] Calculate player summary statistics
  - [x] Games played (past with final selection)
  - [x] Games scheduled (future with final selection)
  - [x] Total games
  - [x] Selection rate percentage

### Testing
- [x] Write unit tests for validation logic
- [x] Write E2E tests with Playwright
  - [x] Validation state tests
  - [x] Insufficient players warning test
  - [x] Selection limit tests
  - [x] Past fixtures read-only test
  - [x] Edit mode toggle test
  - [x] Player summary display test
- [x] Write integration tests for database operations
  - [x] Team CRUD operations
  - [x] Fixture CRUD operations
  - [x] Player CRUD operations
  - [x] Availability operations
  - [x] Final selection operations
  - [x] Complete workflow integration test
- [x] Add test coverage reporting
  - [x] Vitest coverage for worker (v8 provider)
  - [x] Playwright HTML and JSON reporters
  - [x] Coverage scripts added to package.json
- [x] Run all tests and verify passing
  - [x] Worker: 65 tests passing (4 test files)
  - [x] Frontend Unit: 7 tests passing (1 test file)
  - [x] E2E: Test suite created and ready (requires running app to execute)
  - [x] Test configuration fixed (vitest excludes e2e folder)

---

## Phase 6: Polish & Deploy (Week 6)

### Performance Optimization
- [ ] Add database query optimization
- [ ] Add API response caching
- [ ] Add frontend code splitting
- [ ] Optimize images and assets
- [ ] Add compression
- [ ] Analyze bundle size

### Monitoring & Analytics
- [ ] Add logging for important events

### Documentation
- [ ] Add README for availability tracker
- [ ] Document API endpoints
- [ ] Add inline code comments
- [ ] Create user guide
- [ ] Add developer setup instructions

### Deployment
- [ ] Set up D1 production database
- [ ] Configure production environment variables
- [ ] Deploy Worker to Cloudflare
- [ ] Deploy frontend to Cloudflare Pages
- [ ] Test staging environment
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Announce feature to users

---

## Future Enhancements (Post-MVP)

- [ ] Add authentication (optional team passwords)
- [ ] Add email notifications for selections
- [ ] Add export to PDF/Excel
- [ ] Add historical data analysis
- [ ] Add player notes/comments
- [ ] Add WebSocket support for real-time updates
- [ ] Add team admin controls
- [ ] Add multi-season support
- [ ] Add mobile app (PWA)
- [ ] Add WhatsApp/SMS integration
- [ ] Implement polling for data updates
- [ ] Add optimistic UI updates
- [ ] Add conflict resolution
- [ ] Consider WebSockets for future enhancement
- [ ] Add error tracking (e.g., Sentry)
- [ ] Add analytics (e.g., Cloudflare Analytics)
- [ ] Add performance monitoring

---

## Notes

### Database Schema Reference
```sql
teams (id, name, elttl_url, created_at, updated_at)
fixtures (id, team_id, match_date, day_time, home_team, away_team, venue, is_past, created_at)
players (id, team_id, name, created_at)
availability (id, fixture_id, player_id, is_available, updated_at)
final_selections (id, fixture_id, player_id, selected_at)
```

### API Endpoints Reference
- POST /api/availability/import → { teamId, redirect }
- GET /api/availability/:teamId → { team, fixtures, players, availability, finalSelections }
- PATCH /api/availability/:teamId/fixture/:fixtureId/player/:playerId → updated availability
- POST /api/availability/:teamId/fixture/:fixtureId/selection → updated selections
- GET /api/availability/:teamId/summary → player statistics

### Key Validation Rules
- Final selection must be exactly 3 players per match
- Cannot select more players than are available
- Past matches are read-only unless explicitly allowed
- ELTTL URL must be valid format: https://elttl.interactive.co.uk/teams/view/{id}
