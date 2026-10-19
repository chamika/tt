# tt — Table Tennis Tools

Web tools for a table tennis club: handicap calculator, ELTTL availability tracker, and
tournament brackets. Live at `tabletennis.pages.dev`. `README.md` has the feature list and
project layout; `docs/DEPLOYMENT.md` and `docs/API.md` have the details.

| Part | What it is |
|---|---|
| `frontend/` | SvelteKit + Tailwind, Cloudflare Pages. Talks to the API at `VITE_API_URL` (`.env`, default `http://localhost:8787/api`). |
| `worker/` | Cloudflare Worker (Hono) on D1. `src/index.ts` routes, `database.ts` D1 access, `scraper.ts` ELTTL scraper, `tournament/` the bracket engine. |
| `shared/` | Code used by both (handicap maths). |
| `design/` | Plans per feature, e.g. `design/tournament-brackets/Plan.md` (defaults + manual test checklist). |

## Verify before committing

Mirrors what CI (`.github/workflows/ci.yml`) runs. The worker and frontend each have their
own `node_modules`; run them from their own directory (`npm --prefix` works too).

```bash
npm --prefix worker test                  # vitest, unit + D1 integration
npm --prefix frontend run check           # svelte-check types
npm --prefix frontend run lint
npm --prefix frontend run test:unit
npm --prefix frontend run test:e2e        # Playwright; builds + previews on :4173 itself,
                                          # but needs the worker running on :8787 (below)
```

Local API for e2e or manual testing:

```bash
cd worker && npm run db:migrate:local && npm run seed && npx wrangler dev --local --port 8787
```

Run it in the background and wait on `curl -s localhost:8787/api/health`, as CI does.

## Database migrations — read before touching staging or production

- `npm run db:migrate:{local,staging,production}` runs **`schema.sql`**, which is all
  `CREATE TABLE IF NOT EXISTS`. It creates missing tables and **silently skips changes to
  existing tables** (it reports 0 rows written). A new column never lands this way.
- Column changes live in `worker/migrations/NNNN_*.sql`. Apply the file itself:
  `npx wrangler d1 execute tabletennis-availability-<staging|prod> --env <staging|production> --remote --file=./migrations/NNNN_x.sql --yes`.
  `ALTER TABLE ... ADD COLUMN` fails harmlessly with "duplicate column" if already applied.
- Databases: `tabletennis-availability` (local), `-staging` (`--env staging`),
  `-prod` (`--env production`).
- **Never run anything against `--env production --remote` without the user saying so for
  that command.** Read-only checks first (`--json --command "PRAGMA table_info(<t>)"`).
  On 2026-10-06 an in-progress migration was run against prod by mistake; it was harmless
  only because of the `IF NOT EXISTS` behaviour above.
- A release that adds tables or columns needs its prod migration run before or right after
  the deploy. Say so in the PR description.

## Deploys

- GitHub Actions CI **never deploys**. It tests, builds, and does `wrangler deploy --dry-run`.
- The worker deploys through Cloudflare **Workers Builds** (Git integration) on pushes to
  `main`. PR branches only get preview uploads; a green "Workers Builds" check on a PR does
  not mean anything went live.
- Workers Builds has missed a merge before (PR #14, 2026-10-06). If a merge did not deploy,
  compare check runs on the merge commit (`gh api repos/chamika/tt/commits/<sha>/check-runs`)
  and retry the build from the Cloudflare dashboard (Workers & Pages → `tabletennis`).
- `main` is protected: changes go through a PR. Don't try to push to it directly.

## Working conventions

- Work lands as feature branches + PRs via the `ship` skill. Stacked PRs are fine when a
  follow-up builds on an unmerged branch.
- More than one agent sometimes works in this checkout. If `git status` shows changes you
  didn't make, stop and report instead of stashing, resetting or switching branches; use
  `git worktree add` for your own work.
- Mobile use matters (results get entered on phones at the table). Check new UI at phone
  width, not only desktop.
