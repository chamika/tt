# Table Tennis Tools

A collection of web-based tools for table tennis teams and players.

## Features

### 1. Handicap Score Calculator ✅
Calculate handicap scores for players based on their handicap points. Perfect for friendly matches and league play with skill differences.

**Features:**
- Real-time score calculation
- Dark mode support

### 2. ELTTL Availability Tracker ✅
Track player availability and manage team selections for Edinburgh and Lothians Table Tennis League (ELTTL) teams.

**Features:**
- Import team data directly from ELTTL
- Track player availability for each fixture
- Select final 3 players per match
- Player statistics and selection rates
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Automatic past/future fixture handling

## Documentation

- **[Availability Tracker Guide](./docs/AVAILABILITY_TRACKER.md)** - Complete feature documentation
- **[API Documentation](./docs/API.md)** - REST API reference
- **[User Guide](./docs/USER_GUIDE.md)** - Step-by-step usage instructions
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions
- **[TODO List](./design/availability-tracker/TODO.md)** - Implementation progress

## Project Structure
## Project Structure

```
tt/
├── frontend/          # SvelteKit frontend application
│   ├── src/
│   │   ├── routes/    # Page routes
│   │   │   ├── availability/  # Availability tracker pages
│   │   │   └── handicap/      # Handicap calculator page
│   │   └── lib/       # Shared components and utilities
│   └── e2e/           # Playwright E2E tests
├── worker/            # Cloudflare Worker API
│   └── src/
│       ├── index.ts      # API routes and handlers
│       ├── database.ts   # D1 database service
│       ├── scraper.ts    # ELTTL scraper
│       └── *.test.ts     # Unit and integration tests
├── docs/              # Documentation
└── design/            # Design documents and planning
```

## Tech Stack

**Frontend:**
- SvelteKit (TypeScript)
- TailwindCSS
- Playwright (E2E testing)
- Vitest (Unit testing)

**Backend:**
- Cloudflare Workers
- Hono (web framework)
- Cloudflare D1 (SQLite database)
- Vitest (Testing)

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm
- wrangler CLI: `npm install -g wrangler`

### 1. Frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

Frontend will be available at `http://localhost:5173`

### 2. Worker (API)

```bash
cd worker
npm install

# Set up local database
npm run db:migrate:local

# Optional: Seed with test data
npm run seed

# Start development server
npx wrangler dev --ip 0.0.0.0
```

Worker API will be available at `http://localhost:8787`

## Running Tests

### Worker Tests (Unit & Integration)

```bash
cd worker

# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Coverage Target**: >80% (currently achieving 65 tests across 4 test files)

### Frontend Unit Tests

```bash
cd frontend

# Run unit tests
npm run test:unit
```

### End-to-End Tests

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/availability-validation.test.ts
```

### Run All Tests

```bash
# In project root
cd worker && npm test && cd ../frontend && npm run test:unit && npm run test:e2e
```

## Deployment

See **[Deployment Guide](./docs/DEPLOYMENT.md)** for comprehensive deployment instructions.

### Quick Deploy

**Production Worker:**
```bash
cd worker
npm run deploy:production
```

**Production Frontend:**
- Deploy via Cloudflare Pages dashboard
- Or use: `npx wrangler pages deploy .svelte-kit/cloudflare`

**Database Setup:**
```bash
# Create production database
cd worker
npm run db:create:production

# Run migrations
npm run db:migrate:production
```

### Environment Variables

**Frontend (`.env` or Cloudflare Pages):**
- `VITE_API_URL` - Worker API URL (e.g., `https://tabletennis-prod.workers.dev`)

**Worker (`wrangler.toml`):**
- `database_id` - Cloudflare D1 database ID

## Development Workflow

### Adding a New Feature

1. Create feature branch: `git checkout -b feature/my-feature`
2. Implement changes with tests
3. Run all tests: `npm test`
4. Update documentation if needed
5. Submit pull request

### Database Changes

1. Update `worker/schema.sql`
2. Test locally: `npm run db:migrate:local`
3. Test in staging: `npm run db:migrate:staging`
4. Deploy to production: `npm run db:migrate:production`

### Code Quality

- TypeScript for type safety
- ESLint for linting
- Prettier for formatting (integrated with ESLint)
- Comprehensive test coverage
- Structured logging for debugging

## Performance

### Optimization Features

- **Caching**: HTTP cache headers on API responses
- **Compression**: Gzip/Brotli on all responses
- **Database**: Indexed queries for fast lookups
- **Frontend**: Code splitting and lazy loading
- **Optimistic UI**: Instant feedback on user actions

### Monitoring

- Structured JSON logging in Worker
- Cloudflare Analytics dashboard
- Error tracking and alerting
- Performance metrics (response times, error rates)

## Contributing

### Guidelines

1. **Code Style**: Follow existing patterns
2. **Tests**: All features must have tests
3. **Documentation**: Update docs for user-facing changes
4. **Commits**: Use conventional commits (e.g., `feat:`, `fix:`, `docs:`)
5. **Reviews**: All changes require code review

### Running Checks

```bash
# Type checking
cd frontend && npx svelte-check
cd worker && npx tsc --noEmit

# Linting
cd frontend && npm run lint
cd worker && npm run lint  # if configured

# Tests
cd worker && npm test
cd frontend && npm run test:unit && npm run test:e2e
```

## Troubleshooting

### Common Issues

**Import fails:**
- Verify ELTTL URL format is correct
- Check ELTTL website is accessible
- Review worker logs: `wrangler tail`

**Database errors:**
- Ensure migrations are applied
- Check database binding in wrangler.toml
- Verify database ID is correct

**CORS errors:**
- Check VITE_API_URL in frontend
- Verify CORS is enabled in worker
- Clear browser cache

**Build failures:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

See **[Deployment Guide](./docs/DEPLOYMENT.md#troubleshooting)** for more solutions.

## Roadmap

### Completed ✅
- Handicap Score Calculator
- ELTTL Availability Tracker MVP
- Comprehensive test suite
- Documentation and user guides
- Production deployment setup

### Planned 🚧
- Authentication for team management
- Email notifications for selections
- PDF/Excel export
- Historical data analysis
- Real-time updates (WebSockets)
- Mobile PWA
- WhatsApp/SMS integration

## License

See [LICENSE](./LICENSE) file for details.

## Support

- **Documentation**: Check [docs/](./docs/) folder
- **Issues**: Open a GitHub issue
- **Questions**: Use GitHub Discussions

## Acknowledgments

- Built for Edinburgh and Lothians Table Tennis League (ELTTL)
- Powered by Cloudflare Workers and Pages
- Built with SvelteKit and Hono

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Status**: Production Ready ✅

