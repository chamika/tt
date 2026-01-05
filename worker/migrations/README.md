# Database Migration: Remove is_past Column

This migration removes the `is_past` column from the fixtures table. The field will be computed dynamically in the API layer based on comparing `match_date` with the current date.

## Migration File

Location: `worker/migrations/0001_remove_is_past.sql`

## Applying the Migration

### Development Environment

```bash
cd worker
wrangler d1 migrations apply tabletennis-availability --local
```

### Staging Environment

```bash
cd worker
wrangler d1 migrations apply tabletennis-availability-staging --env staging
```

### Production Environment

```bash
cd worker
wrangler d1 migrations apply tabletennis-availability-prod --env production
```

## Verification

After applying the migration, verify the schema:

### Development
```bash
wrangler d1 execute tabletennis-availability --local --command="PRAGMA table_info(fixtures);"
```

### Staging
```bash
wrangler d1 execute tabletennis-availability-staging --env staging --command="PRAGMA table_info(fixtures);"
```

### Production
```bash
wrangler d1 execute tabletennis-availability-prod --env production --command="PRAGMA table_info(fixtures);"
```

The `is_past` column should no longer appear in the output.

## Rollback

If you need to rollback this migration, you can recreate the column with:

```sql
ALTER TABLE fixtures ADD COLUMN is_past INTEGER DEFAULT 0;
```

However, note that the column values won't be automatically populated. You would need to run an UPDATE statement to set the values based on match_date.

## Testing

Run the test suite to ensure everything works correctly:

```bash
cd worker
npm test
```

All tests should pass with the new implementation computing `is_past` dynamically in the API layer.
