# Tournament Brackets - Implementation Tasks

See [Plan.md](./Plan.md) for the design, defaults and the manual test checklist.

## PR 1 - Foundations
- [x] Design docs (`Plan.md`, `TODO.md`)
- [x] Move the handicap calculator to `shared/handicap/scoreCalculator.ts`, re-exported from `frontend/src/lib/handicap/`
- [x] Allow `../shared` in the Vite dev server
- [x] Extract the worker `log` helper into `worker/src/log.ts`
- [x] Run worker tests in CI
- [x] Miniflare-backed D1 test harness (`worker/src/test/d1.ts`)

## PR 2 - Engine (`worker/src/tournament/`, pure, no I/O)
- [x] `seeding.ts` - ranking and handicap seeding, injectable RNG
- [x] `knockout.ts` - standard placement, byes, round names
- [x] `groups.ts` - snake distribution, round robin, knockout skeleton from group positions
- [x] `standings.ts` - ITTF tie-breaks, degrading by score mode, manual override
- [x] `handicap.ts` - per-match starts and play-to from the shared calculator
- [x] `results.ts` - result validation per score mode
- [x] `advance.ts` - winner propagation, group qualification, correction locks

## PR 3 - Persistence + API
- [x] Tables in `schema.sql` and `migrations/0002_tournament_brackets.sql`
- [x] `TournamentRepository`
- [x] Routes under `/api/tournaments`
- [x] API tests (mocked repository) and D1 integration tests
- [x] `docs/API.md` section

## PR 4 - Frontend
- [x] Types and API client
- [x] `/tournament`, `/tournament/new`, `/tournament/[id]`
- [x] `MatchCard`, `ResultDialog`, `GroupTable`, `BracketView`, `PlayerListEditor`
- [x] Enable the home page card
- [x] `bracketLayout` unit tests
- [x] Playwright E2E (desktop and mobile viewport)

## PR 5 - Docs + demo data
- [x] README, `docs/USER_GUIDE.md`, `TESTING.md`
- [x] Demo tournament in `seed.sql`
- [ ] Manual test pass (Plan.md, M1-M12)
