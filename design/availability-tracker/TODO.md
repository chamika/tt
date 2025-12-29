# ELTTL Availability Tracker - Implementation TODO

## Phase 1: Foundation (Week 1)

### Database Setup
- [ ] Configure Cloudflare D1 database binding in wrangler.toml
- [ ] Create database schema file (schema.sql)
- [ ] Create migration scripts
  - [ ] teams table
  - [ ] fixtures table
  - [ ] players table
  - [ ] availability table
  - [ ] final_selections table
  - [ ] Add indexes for performance
- [ ] Create seed data script for testing
- [ ] Test D1 connection from Worker

### Worker API Structure
- [ ] Set up D1 binding in worker/src/index.ts
- [ ] Create API route structure
- [ ] Add error handling middleware
- [ ] Add CORS configuration
- [ ] Create utility functions for database operations
- [ ] Add UUID generation utility

---

## Phase 2: Backend API (Week 2)

### ELTTL Scraper
- [ ] Research ELTTL HTML structure
- [ ] Install HTML parser (cheerio or htmlparser2)
- [ ] Implement `scrapeELTTLTeam(url)` function
  - [ ] Extract team name
  - [ ] Parse fixtures table (date, time, home, away)
  - [ ] Parse squad/players list
  - [ ] Handle parsing errors gracefully
- [ ] Add validation for scraped data
- [ ] Write tests for scraper

### Import Endpoint
- [ ] POST /api/availability/import
  - [ ] Accept ELTTL URL in request body
  - [ ] Call scraper function
  - [ ] Generate team UUID
  - [ ] Save team to database
  - [ ] Save fixtures to database
  - [ ] Save players to database
  - [ ] Initialize availability records (all false by default)
  - [ ] Return team UUID and redirect URL
  - [ ] Handle duplicate imports
- [ ] Add rate limiting
- [ ] Add input validation

### CRUD Endpoints
- [ ] GET /api/availability/:teamId
  - [ ] Fetch team details
  - [ ] Fetch all fixtures with availability
  - [ ] Fetch all players
  - [ ] Fetch final selections
  - [ ] Return combined data structure
  - [ ] Handle team not found
- [ ] PATCH /api/availability/:teamId/fixture/:fixtureId/player/:playerId
  - [ ] Update availability record
  - [ ] Return updated data
  - [ ] Add validation
- [ ] POST /api/availability/:teamId/fixture/:fixtureId/selection
  - [ ] Validate exactly 3 players selected
  - [ ] Clear existing selections
  - [ ] Save new selections
  - [ ] Return updated selections
- [ ] GET /api/availability/:teamId/summary
  - [ ] Calculate games played (past)
  - [ ] Calculate games scheduled (future)
  - [ ] Calculate selection rate per player
  - [ ] Return summary data

---

## Phase 3: Frontend Foundation (Week 3)

### Route Structure
- [ ] Create frontend/src/routes/availability/+page.svelte (landing page)
- [ ] Create frontend/src/routes/availability/new/+page.svelte (import form)
- [ ] Create frontend/src/routes/availability/[teamId]/+page.svelte (main tracker)
- [ ] Create frontend/src/routes/availability/[teamId]/+page.server.ts (SSR data loading)
- [ ] Add navigation links from home page
- [ ] Update ToolCard on home page to enable availability tracker

### API Client
- [ ] Create frontend/src/lib/api/availability.ts
  - [ ] importTeam(elttlUrl)
  - [ ] getTeamData(teamId)
  - [ ] updateAvailability(teamId, fixtureId, playerId, isAvailable)
  - [ ] setFinalSelection(teamId, fixtureId, playerIds)
  - [ ] getPlayerSummary(teamId)
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add TypeScript types for API responses

### Basic Components
- [ ] Create frontend/src/lib/components/availability/AvailabilityImportForm.svelte
  - [ ] URL input field
  - [ ] Submit button
  - [ ] Loading state
  - [ ] Error handling
  - [ ] Validation
- [ ] Create frontend/src/lib/components/availability/FixtureCard.svelte
  - [ ] Match details (date, time, home, away)
  - [ ] Player availability checkboxes
  - [ ] Final selection UI (max 3)
  - [ ] Validation indicator
- [ ] Create frontend/src/lib/components/availability/PlayerSummaryCard.svelte
  - [ ] Player name
  - [ ] Player icon/avatar
  - [ ] Stats display (played, scheduled, total)
  - [ ] Selection rate
- [ ] Create frontend/src/lib/components/availability/AvailabilityTracker.svelte
  - [ ] Main container
  - [ ] Fixtures grid
  - [ ] Player summary section

---

## Phase 4: UI Polish (Week 4)

### Design Implementation
- [ ] Match card_view.png design exactly
  - [ ] Card layout and spacing
  - [ ] Typography
  - [ ] Colors and borders
  - [ ] Match images/backgrounds
- [ ] Match player_summary.png design exactly
  - [ ] Card layout
  - [ ] Player silhouette graphics
  - [ ] Stats formatting
- [ ] Implement dark mode support
  - [ ] Dark mode colors for all components
  - [ ] Toggle respects existing darkMode store
- [ ] Implement light mode support
  - [ ] Light mode colors for all components

### Responsive Design
- [ ] Mobile layout (< 640px)
  - [ ] Single column fixture cards
  - [ ] Simplified player summary
  - [ ] Touch-friendly controls
- [ ] Tablet layout (640px - 1024px)
  - [ ] Two column fixture cards
  - [ ] Grid player summary
- [ ] Desktop layout (> 1024px)
  - [ ] Three column fixture cards
  - [ ] Full player summary grid

### Loading & Error States
- [ ] Add skeleton loaders for fixtures
- [ ] Add skeleton loaders for player summaries
- [ ] Add empty states (no fixtures, no players)
- [ ] Add error messages with retry options
- [ ] Add success notifications
- [ ] Add optimistic updates

---

## Phase 5: Features & Testing (Week 5)

### Validation & Business Logic
- [ ] Add client-side validation for 3-player selection
  - [ ] Disable selection if < 3 available
  - [ ] Warn if > 3 selected
  - [ ] Highlight invalid fixtures
- [ ] Add server-side validation
- [ ] Implement past vs future match filtering
  - [ ] Mark past matches as read-only
  - [ ] Different styling for past matches
  - [ ] Filter toggle
- [ ] Calculate player summary statistics
  - [ ] Games played (past with final selection)
  - [ ] Games scheduled (future with final selection)
  - [ ] Total games
  - [ ] Selection rate percentage

### Real-time Updates
- [ ] Implement polling for data updates
- [ ] Add optimistic UI updates
- [ ] Add conflict resolution
- [ ] Consider WebSockets for future enhancement

### Testing
- [ ] Write unit tests for scraper
- [ ] Write unit tests for API endpoints
- [ ] Write unit tests for frontend utilities
- [ ] Write E2E tests with Playwright
  - [ ] Import team flow
  - [ ] Update availability flow
  - [ ] Set final selection flow
  - [ ] View player summary flow
- [ ] Write integration tests for database operations
- [ ] Add test coverage reporting

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
- [ ] Add error tracking (e.g., Sentry)
- [ ] Add analytics (e.g., Cloudflare Analytics)
- [ ] Add performance monitoring
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
- Past matches are read-only
- ELTTL URL must be valid format: https://elttl.interactive.co.uk/teams/view/{id}
