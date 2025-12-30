# ELTTL Availability Tracker

A comprehensive player availability tracking system for table tennis teams in the 	Edinburgh and Lothians Table Tennis League (ELTTL). This tool helps team captains manage player availability and finalize team selections for upcoming fixtures.

## Features

### Core Functionality
- **Team Import**: Import team data directly from ELTTL URLs
- **Availability Management**: Track which players are available for each fixture
- **Final Selection**: Select exactly 3 players for each match
- **Player Statistics**: View comprehensive stats including games played, scheduled, and selection rates
- **Real-time Updates**: Instant updates across all components with optimistic UI

### User Experience
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Dark Mode Support**: Full support for light and dark themes
- **Past vs Future Fixtures**: Separate handling with edit mode for historical data
- **Validation**: Built-in validation to ensure proper team selection
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: Graceful error messages with retry options

## Architecture

### Tech Stack
- **Frontend**: SvelteKit with TypeScript
- **Backend**: Cloudflare Workers with Hono
- **Database**: Cloudflare D1 (SQLite)
- **Styling**: TailwindCSS
- **Testing**: Vitest (unit), Playwright (E2E)

### Database Schema

```sql
-- Teams: Stores imported team information
teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  elttl_url TEXT UNIQUE,
  created_at INTEGER,
  updated_at INTEGER
)

-- Fixtures: Match schedule for each team
fixtures (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  match_date TEXT,
  day_time TEXT,
  home_team TEXT,
  away_team TEXT,
  venue TEXT,
  is_past INTEGER,
  created_at INTEGER
)

-- Players: Team roster
players (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  name TEXT,
  created_at INTEGER
)

-- Availability: Player availability for each fixture
availability (
  id TEXT PRIMARY KEY,
  fixture_id TEXT,
  player_id TEXT,
  is_available INTEGER,
  updated_at INTEGER,
  UNIQUE(fixture_id, player_id)
)

-- Final Selections: The 3 players selected for each match
final_selections (
  id TEXT PRIMARY KEY,
  fixture_id TEXT,
  player_id TEXT,
  selected_at INTEGER,
  UNIQUE(fixture_id, player_id)
)
```

### API Endpoints

See [API Documentation](./API.md) for detailed endpoint specifications.

**Quick Reference:**
- `POST /api/availability/import` - Import team from ELTTL
- `GET /api/availability/:teamId` - Get all team data
- `PATCH /api/availability/:teamId/fixture/:fixtureId/player/:playerId` - Update availability
- `POST /api/availability/:teamId/fixture/:fixtureId/selection` - Set final selection
- `GET /api/availability/:teamId/summary` - Get player statistics

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account (for deployment)
- Wrangler CLI (`npm install -g wrangler`)

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd tt
```

2. **Install dependencies**
```bash
# Frontend
cd frontend
npm install

# Worker
cd ../worker
npm install
```

3. **Set up the database**
```bash
cd worker

# Create local D1 database
wrangler d1 create availability-tracker-dev

# Run migrations
wrangler d1 execute availability-tracker-dev --local --file=schema.sql

# Optional: Seed with test data
wrangler d1 execute availability-tracker-dev --local --file=seed.sql
```

4. **Start development servers**

Terminal 1 - Worker:
```bash
cd worker
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

### Running Tests

**Worker Tests (Unit & Integration):**
```bash
cd worker
npm test                    # Run all tests
npm run test:coverage       # With coverage report
```

**Frontend Tests (E2E):**
```bash
cd frontend
npm run test:e2e           # Run Playwright tests
npm run test:e2e:ui        # Run with UI mode
```

## Usage Guide

### For Team Captains

#### 1. Import Your Team
1. Navigate to the Availability Tracker page
2. Click "Import New Team"
3. Enter your ELTTL team URL (format: `https://elttl.interactive.co.uk/teams/view/{id}`)
4. Click "Import Team"
5. Your team data, fixtures, and players will be automatically imported

#### 2. Manage Player Availability
1. For each fixture, check the boxes next to available players
2. Availability is automatically saved as you check/uncheck
3. Past fixtures are read-only by default (toggle edit mode if needed)

#### 3. Select Final Team
1. Once you have at least 3 players available, click "Select 3 Players"
2. Choose exactly 3 players from the available list
3. Click "Save Selection" to confirm
4. The selection is highlighted with a trophy icon

#### 4. View Statistics
- Player cards show total games played and scheduled
- Selection rate percentage indicates how often each player is chosen
- Stats update automatically when selections are made

### Validation Rules

- **Availability**: Players must be marked available before selection
- **Selection Limit**: Exactly 3 players must be selected per match
- **Insufficient Players**: Warning shown if fewer than 3 players are available
- **Past Fixtures**: Read-only unless edit mode is enabled

## Performance & Optimization

### Caching Strategy
- **Health Check**: 1 minute cache
- **Team Data**: 30 seconds with 60-second stale-while-revalidate
- **Player Summary**: 1 minute with 2-minute stale-while-revalidate

### Database Optimization
- Indexed foreign keys for fast joins
- Composite index on availability (fixture_id, player_id)
- Batch queries using Promise.all for parallel data fetching

### Frontend Optimization
- Code splitting by route
- Optimistic UI updates for instant feedback
- Skeleton loaders during data fetching
- Lazy loading of components

### Compression
- Gzip/Brotli compression enabled on all API responses
- Reduces payload size by ~70%

## Monitoring & Logging

### Structured Logging
All API operations are logged with:
- Timestamp (ISO 8601)
- Log level (info, warn, error)
- Operation details (teamId, fixtureId, etc.)
- Performance metrics (duration)
- Error messages and stack traces

Example log entry:
```json
{
  "timestamp": "2025-12-30T10:15:30.123Z",
  "level": "info",
  "message": "Team import successful",
  "teamId": "abc-123",
  "elttlUrl": "https://elttl.interactive.co.uk/teams/view/123",
  "playerCount": 12,
  "fixtureCount": 8,
  "durationMs": 2341
}
```

### Key Metrics Tracked
- Import success/failure rates
- API response times
- Database query performance
- Error rates and types
- Cache hit rates

## Deployment

### Production Setup

1. **Create production D1 database**
```bash
wrangler d1 create tabletennis-availability
```

2. **Update wrangler.toml with production database ID**

3. **Run migrations on production**
```bash
wrangler d1 execute tabletennis-availability --file=schema.sql
```

4. **Deploy Worker**
```bash
cd worker
npm run deploy
```

5. **Deploy Frontend to Cloudflare Pages**
```bash
cd frontend
npm run build
# Connect repository to Cloudflare Pages dashboard
```

6. **Environment Variables**
Set `VITE_API_URL` in frontend to point to production Worker URL

### Staging Environment
Follow the same steps as production but use separate databases and worker names for staging.

## Troubleshooting

### Common Issues

**Import Fails**
- Verify the ELTTL URL format is correct
- Check if the team page is publicly accessible
- Ensure the HTML structure hasn't changed

**Availability Not Saving**
- Check browser console for errors
- Verify the Worker is running
- Check database connection in Wrangler logs

**Selection Validation Errors**
- Ensure exactly 3 players are selected
- Verify all selected players are marked as available
- Check if the fixture is in the past (read-only)

**Performance Issues**
- Clear browser cache
- Check Cloudflare Workers analytics for rate limiting
- Verify database indexes are present

## Contributing

### Code Style
- TypeScript for type safety
- Functional components in Svelte
- Comprehensive error handling
- Unit tests for business logic
- E2E tests for user workflows

### Testing Requirements
- All new features must have tests
- Maintain >80% code coverage
- E2E tests for critical user paths
- Integration tests for database operations

## Future Enhancements

### Planned Features
- Authentication with team passwords
- Email notifications for selections
- PDF/Excel export of availability data
- Historical data analysis and trends
- Player notes and comments
- Real-time updates via WebSockets
- Mobile PWA with push notifications
- WhatsApp/SMS integration
- Multi-season support

### Performance Improvements
- Redis cache layer for high-traffic teams
- GraphQL API for more efficient queries
- Optimistic locking for concurrent updates
- CDN for static assets

## License

See [LICENSE](../LICENSE) file for details.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Maintainers**: Table Tennis Team
