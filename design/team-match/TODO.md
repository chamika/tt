# Team Match Card - Implementation Tasks

See [Plan.md](./Plan.md) for the design, defaults and tests.

## PR 1 - Worker + data
- [x] Design docs (`Plan.md`, `TODO.md`)
- [x] Tables in `schema.sql` and `migrations/0004_team_matches.sql`
- [x] `worker/src/teamMatch/`: rubber order and validation, view, repository, routes
- [x] Unit tests and D1 integration tests
- [x] `docs/API.md` section
- [ ] Apply 0004 to staging; prod with the owner's go-ahead

## PR 2 - Frontend
- [x] Types and API client
- [x] `/team-match/new`, `/team-match/[id]`
- [x] `TeamMatchForm`, `RubberCard`, `RubberDialog` (doubles pair pickers)
- [x] Entry on the `/tournament` landing page; home card wording
- [x] Unit tests and Playwright E2E (desktop and mobile)
- [x] README, `TESTING.md`, demo match in `seed.sql` (USER_GUIDE covers only the availability tracker, so it is unchanged)
- [x] Check at phone width, light and dark
