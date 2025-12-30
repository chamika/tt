# Deployment Guide - ELTTL Availability Tracker

Complete guide for deploying the Availability Tracker to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Worker Deployment](#worker-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment](#post-deployment)
7. [Staging Environment](#staging-environment)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools
- Node.js 18+ and npm
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account with Workers and Pages enabled
- Git for version control

### Required Access
- Cloudflare account with admin access
- GitHub repository access (for Pages deployment)
- Domain configuration access (if using custom domain)

### Before You Begin
- Ensure all tests are passing
- Review the changelog for breaking changes
- Backup existing data if applicable
- Notify users of planned maintenance window

---

## Environment Setup

### 1. Authenticate with Cloudflare

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd tt

# Install worker dependencies
cd worker
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Database Setup

### Create Production Database

```bash
cd worker

# Create production D1 database
npm run db:create:production

# This will output a database ID like:
# database_id = "abc123def456..."
```

### Update wrangler.toml

Edit `worker/wrangler.toml` and update the production section:

```toml
[env.production]
name = "tabletennis-prod"

[[env.production.d1_databases]]
binding = "DB"
database_name = "tabletennis-availability-prod"
database_id = "YOUR_PRODUCTION_DATABASE_ID"  # From previous step
```

### Run Migrations

```bash
# Apply schema to production database
npm run db:migrate:production

# Verify migration
wrangler d1 execute tabletennis-availability-prod --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected output should show:
- teams
- fixtures
- players
- availability
- final_selections

### Optional: Seed Data

For testing purposes only:

```bash
npm run db:seed:production
```

⚠️ **Warning**: Don't seed production with test data unless explicitly intended.

---

## Worker Deployment

### Pre-Deployment Checks

```bash
cd worker

# Run all tests
npm test

# Check for TypeScript errors
npx tsc --noEmit

# Build check
wrangler deploy --dry-run --env production
```

### Deploy to Production

```bash
# Deploy worker to production
npm run deploy:production
```

Expected output:
```
Uploaded tabletennis-prod
Published tabletennis-prod
  https://tabletennis-prod.your-subdomain.workers.dev
```

### Verify Deployment

```bash
# Test health endpoint
curl https://tabletennis-prod.your-subdomain.workers.dev/api/health

# Expected response:
# {"status":"ok","timestamp":1735556130000}
```

### Configure Custom Domain (Optional)

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click "Triggers" tab
4. Click "Add Custom Domain"
5. Enter: `api.yourdomain.com`
6. Click "Add Custom Domain"

Update frontend to use custom domain:
```bash
# In frontend/.env.production
VITE_API_URL=https://api.yourdomain.com
```

---

## Frontend Deployment

### Method 1: Cloudflare Pages (Recommended)

#### Setup via Dashboard

1. **Connect Repository**
   - Go to Cloudflare Dashboard > Pages
   - Click "Create a project"
   - Connect your GitHub account
   - Select your repository
   - Click "Begin setup"

2. **Configure Build**
   - Framework preset: `SvelteKit`
   - Build command: `npm run build`
   - Build output directory: `.svelte-kit/cloudflare`
   - Root directory: `frontend`

3. **Environment Variables**
   - Add variable: `VITE_API_URL`
   - Value: Your worker URL (e.g., `https://tabletennis-prod.your-subdomain.workers.dev`)

4. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete
   - Your site will be live at: `https://your-project.pages.dev`

#### Setup via CLI (Alternative)

```bash
cd frontend

# Build for production
npm run build

# Deploy to Pages
npx wrangler pages deploy .svelte-kit/cloudflare --project-name tabletennis-frontend
```

### Method 2: Other Platforms

#### Vercel
```bash
cd frontend
vercel --prod
```

Set environment variable:
- `VITE_API_URL`: Your worker URL

#### Netlify
```bash
cd frontend
netlify deploy --prod
```

Set environment variable:
- `VITE_API_URL`: Your worker URL

### Configure Custom Domain for Frontend

In Cloudflare Pages Dashboard:
1. Select your project
2. Click "Custom domains"
3. Click "Set up a custom domain"
4. Enter: `availability.yourdomain.com`
5. Follow DNS configuration instructions

### Verify Frontend Deployment

1. Open your frontend URL in a browser
2. Navigate to Availability Tracker
3. Try importing a test team
4. Verify data loads correctly
5. Check browser console for errors

---

## Post-Deployment

### Smoke Tests

Run these manual tests after deployment:

1. **Health Check**
   ```bash
   curl https://your-worker-url/api/health
   ```

2. **Import Team** (use test ELTTL URL)
   - Navigate to import page
   - Enter valid ELTTL URL
   - Verify team imports successfully

3. **Availability Management**
   - Mark players as available
   - Verify updates save
   - Refresh page and confirm persistence

4. **Final Selection**
   - Select 3 players for a fixture
   - Verify selection saves
   - Check validation works (try selecting 4 players)

5. **Player Statistics**
   - View player summary
   - Verify statistics are accurate
   - Check calculations are correct

### Monitoring Setup

#### Enable Cloudflare Analytics

1. Go to Workers & Pages Dashboard
2. Select your worker
3. Click "Analytics" tab
4. Enable detailed analytics

#### Key Metrics to Monitor

- **Request Rate**: Requests per second
- **Success Rate**: 2xx responses / total requests
- **Error Rate**: 5xx responses / total requests
- **Response Time**: P50, P95, P99 latencies
- **Database Queries**: Query count and duration

#### Set Up Alerts

1. Go to Cloudflare Dashboard > Notifications
2. Create alert for:
   - Error rate > 5%
   - Response time P95 > 1000ms
   - Request rate spike (>100% increase)

### Logging Access

View logs in Cloudflare Dashboard:
```bash
# Or via CLI
wrangler tail tabletennis-prod
```

### Performance Checks

```bash
# Test response times
time curl https://your-worker-url/api/availability/test-team-id

# Test compression
curl -H "Accept-Encoding: gzip" -I https://your-worker-url/api/health

# Should see: Content-Encoding: gzip
```

---

## Staging Environment

### Setup Staging

```bash
cd worker

# Create staging database
npm run db:create:staging

# Update wrangler.toml with staging database ID
# [env.staging]
# database_id = "your-staging-database-id"

# Run migrations
npm run db:migrate:staging

# Deploy to staging
npm run deploy:staging
```

### Staging Best Practices

- Deploy to staging first
- Run full test suite against staging
- Manual QA on staging
- Load testing on staging
- Keep staging in sync with production schema

### Testing on Staging

```bash
# Set frontend to use staging API
# In frontend/.env.staging
VITE_API_URL=https://tabletennis-staging.your-subdomain.workers.dev

# Build and test
cd frontend
npm run build
npm run preview
```

---

## Rollback Procedures

### Worker Rollback

#### Option 1: Re-deploy Previous Version

```bash
# Checkout previous working version
git checkout <previous-commit-hash>

# Deploy
cd worker
npm run deploy:production
```

#### Option 2: Cloudflare Dashboard

1. Go to Workers & Pages Dashboard
2. Select your worker
3. Click "Deployments" tab
4. Find previous working deployment
5. Click "..." > "Rollback to this deployment"

### Frontend Rollback

#### Cloudflare Pages

1. Go to Pages Dashboard
2. Select your project
3. Click "Deployments"
4. Find previous working deployment
5. Click "..." > "Rollback to this deployment"

#### Other Platforms

Follow platform-specific rollback procedures.

### Database Rollback

⚠️ **Warning**: Database rollback is complex and can cause data loss.

```bash
# Backup current database
wrangler d1 execute tabletennis-availability-prod --command "SELECT * FROM teams" > backup.json

# Restore from backup (if available)
# Manual process: re-create and re-seed database
```

**Best Practice**: Always test schema changes in staging first to avoid production rollbacks.

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (worker + frontend + e2e)
- [ ] Code reviewed and approved
- [ ] Changelog updated
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] Custom domains configured (if applicable)
- [ ] Monitoring and alerts set up

### Deployment
- [ ] Database migration applied to production
- [ ] Worker deployed to production
- [ ] Frontend deployed to production
- [ ] Smoke tests passed
- [ ] Performance tests passed
- [ ] No errors in logs

### Post-Deployment
- [ ] Verify all endpoints working
- [ ] Check error rates in dashboard
- [ ] Monitor response times
- [ ] Verify data persistence
- [ ] User acceptance testing
- [ ] Announce to users

### Rollback Plan
- [ ] Previous working version identified
- [ ] Rollback procedure documented
- [ ] Database backup available
- [ ] Team notified of issues
- [ ] Incident report created

---

## Troubleshooting

### Common Deployment Issues

**Database not found**
```bash
# Verify database exists
wrangler d1 list

# Check wrangler.toml has correct database_id
```

**CORS errors in frontend**
- Verify CORS is enabled in worker
- Check VITE_API_URL is correct
- Clear browser cache

**Build failures**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf .svelte-kit
npm run build
```

**Worker not updating**
- Check deployment succeeded without errors
- Clear Cloudflare cache: Dashboard > Caching > Purge Everything
- Wait 1-2 minutes for propagation

**High error rates**
- Check Cloudflare Dashboard > Workers > Logs
- Look for patterns in errors
- Check database connection
- Verify migrations applied correctly

---

## Security Considerations

### Production Security

1. **Environment Variables**: Never commit secrets to git
2. **CORS**: Restrict to specific domains in production
3. **Rate Limiting**: Implement rate limiting for import endpoint
4. **Input Validation**: Ensure all inputs are validated
5. **Database Access**: Restrict to worker only
6. **Logging**: Don't log sensitive data

### Recommended Enhancements

- Add authentication for team management
- Implement API rate limiting
- Add CAPTCHA for import endpoint
- Enable Cloudflare WAF rules
- Set up DDoS protection
- Implement request signing

---

## Performance Tuning

### Database Optimization

```sql
-- Verify indexes exist
SELECT name FROM sqlite_master WHERE type='index';

-- Check query performance
EXPLAIN QUERY PLAN SELECT * FROM fixtures WHERE team_id = ?;
```

### Caching Strategy

Adjust cache headers in `worker/src/index.ts`:
```typescript
// More aggressive caching (5 minutes)
c.header('Cache-Control', 'public, max-age=300');

// Less caching (10 seconds)
c.header('Cache-Control', 'public, max-age=10');
```

### Bundle Size Optimization

```bash
cd frontend

# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Identify large dependencies
# Consider code splitting or alternatives
```

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review error logs
- Check performance metrics
- Verify backup integrity

**Monthly**:
- Update dependencies
- Review and optimize database queries
- Performance testing
- Security audit

**Quarterly**:
- Review and optimize infrastructure costs
- Update documentation
- User feedback review
- Feature planning

---

## Support

### Getting Help

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Cloudflare D1 Docs: https://developers.cloudflare.com/d1/
- SvelteKit Docs: https://kit.svelte.dev/docs
- Community Discord: [link]
- GitHub Issues: [link]

### Emergency Contacts

- Primary: [Your contact]
- Secondary: [Backup contact]
- Cloudflare Support: Enterprise customers only

---

**Document Version**: 1.0.0  
**Last Updated**: December 2025  
**Maintained By**: Development Team
