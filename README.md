# Golf Track

Mobile-first golf round tracking, built as a TypeScript npm-workspace monorepo. It includes authentication, profile provisioning, and a shared course catalog; scoring workflows, offline synchronization, and handicap calculation remain out of scope.

## Architecture

```text
Vue client
-> Supabase authentication
-> access token
-> Fastify API
-> token verification and authorization
-> service layer
-> Drizzle
-> PostgreSQL
```

The Vue 3/Vite client uses Supabase directly only for authentication, Pinia, and Vue Router. It never queries application tables through Supabase's Data API; application data always passes through Fastify. The Fastify API verifies ordinary access tokens through Supabase Auth's server-side `auth.getUser(token)` method. The API never trusts a browser-supplied user ID. Its verifier is a small injectable adapter, which keeps tests offline and permits a later verification strategy change. The database is PostgreSQL on Supabase, accessed through Drizzle ORM using a private server-side connection.

Supabase Auth owns authentication records. The application `users` table maps one row to an Auth account with `auth_provider = 'supabase'` and `auth_subject = auth.users.id`; it does not reproduce password storage.

## Layout

```text
apps/
  api/                 Fastify API, Drizzle schema, SQL migrations, tests
  web/                 Vue 3 application, layouts, router, stores, tests
packages/
  shared/              Zod API contracts and shared types
docs/                  Approved V1 screen and database specifications
```

Backend domains live below `apps/api/src/modules`. Profiles and courses use route -> authentication -> service -> repository layering. Round and handicap domains remain future work.

## Prerequisites

Use current Node.js LTS (Node 20+), npm 10+, and a Supabase project. Install all workspaces from the repository root:

```bash
npm install
```

Create `apps/web/.env` and `apps/api/.env` from the relevant sections of the root [.env.example](.env.example). The example only contains placeholders and `.env` files are ignored.

Required web variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`

Required API variables:

- `PORT`
- `HOST`
- `ALLOWED_ORIGIN`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The Vite variables are browser-safe only. Never add `DATABASE_URL` or a Supabase service-role key to the web app, or use a service-role key simply to validate a user access token.

## Database Security

Every application table in `public` enables Row Level Security and revokes all table privileges from Supabase's `anon` and `authenticated` database roles. There are intentionally no browser Data API policies. RLS is defense in depth; Fastify remains the only application data API and its private PostgreSQL role continues to perform server-side access.

Drizzle generates structural tables, foreign keys, checks, and indexes. The initial migration then appends reviewed custom SQL for RLS, grants, and cross-table validation triggers. Preserve the marked custom section when regenerating this unapplied migration; those statements are not represented by the current Drizzle schema.

Repositories must explicitly set `updated_at` to the current server/database time on every update. Update repositories have not been added yet, so this is a required convention rather than a database trigger.

The future transactional round-start service must create exactly the configured nine or eighteen `round_holes` rows. That aggregate child-count invariant is intentionally not enforced by a fragile row-level database trigger and needs integration coverage when round creation exists.

The unique email index currently includes soft-deleted application users. The account-deletion/re-registration policy remains deferred: restore the existing identity, permanently purge it, or later adopt a partial unique index where `deleted_at IS NULL`.

## Supabase Setup

1. Create a Supabase project and enable the Email provider with email/password sign-in.
2. In Supabase Auth URL Configuration, set the Development Site URL to your local web origin, such as `http://localhost:5173`, and add `http://localhost:5173/auth/callback` to Redirect URLs. Add deployed web origins and their `/auth/callback` paths before deployment.
3. Copy the project URL and publishable (or legacy anonymous) key into both applications as shown above.
4. Copy the private server-side PostgreSQL connection string into API `DATABASE_URL` only.
5. Generate and review the migration, then apply it to the intended non-production database:

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` is intentionally never run by tests. Database integration tests should use a dedicated disposable local/Supabase test database configured through `DATABASE_URL`; no live hosted project is required for default unit tests.

To run the optional database security integration test after applying the migration to a disposable database:

```bash
TEST_DATABASE_URL=postgresql://... RUN_DATABASE_INTEGRATION_TESTS=true npm run test:db -w @golf-track/api
```

Never point `TEST_DATABASE_URL` to a hosted production database.

## Authentication And Profiles

Registration and sign-in call Supabase Auth directly from the Vue application. Passwords remain exclusively within Supabase Auth. When email confirmation is enabled, registration displays a check-email state and Supabase redirects the confirmation link to `/auth/callback`. The callback waits for the supported Supabase browser client session handling, then continues to application profile restoration or completion.

After a valid session exists, the Vue application calls Fastify with the access token in an Authorization header. `GET /api/v1/me` restores the application profile on page refresh. When no profile exists, `/profile/complete` calls the idempotent `POST /api/v1/profile/bootstrap` endpoint. Fastify verifies the access token, derives the Supabase subject and email from that identity, and creates `users` and `user_profiles` in one transaction using conflict-safe inserts. Signup metadata may prefill a display name and starting handicap after confirmation, but it is treated as untrusted onboarding input and validated again; it never proves identity or ownership.

Starting handicap is optional and must be between `-10.0` and `54.0`. It is a user-entered reference value, not an official or calculated Handicap Index.

## Development

```bash
npm run dev       # web and API together
npm run dev:web   # Vite only
npm run dev:api   # Fastify only
```

The API exposes `GET /health`, protected `GET /api/v1/me`, and a protected course catalog:

- `GET /api/v1/courses` supports offset pagination and a parameterized name/location search.
- `GET /api/v1/courses/:courseId` returns active shared courses to signed-in users; private, draft, and archived courses are owner-only.
- `POST /api/v1/courses` creates an active shared course from a complete 9- or 18-hole definition.
- `PUT /api/v1/courses/:courseId` is owner-only and requires `expectedUpdatedAt` for optimistic concurrency.
- `POST /api/v1/courses/:courseId/archive` is owner-only and soft-archives rather than deleting.

Each course must provide every sequential hole, unique tee names and display order, unique stroke indexes, and a yardage for every tee/hole pair. Potential same-name/location matches require explicit `acknowledgeDuplicate: true`; the warning does not expose owner permissions. The API derives the application owner from the verified access token, never a browser-submitted user ID. Round tracking is not included.

## Round Setup And Resume

The protected round API provides `GET /api/v1/rounds/active`, `POST /api/v1/rounds`, and `GET /api/v1/rounds/:roundId`. Starting a round creates the in-progress round and its ordered hole snapshots in one transaction. It accepts an active accessible course, an active tee from that course, 9 or 18 holes as supported by the course, a valid start hole, `basic` or `detailed` tracking, and a `YYYY-MM-DD` played-on date. The API snapshots course, tee, rating, slope, par, and hole data, so later course edits cannot alter the round.

Only one in-progress round may exist per user. `GET /rounds/active` returns `{ "round": null }` when none exists. The web app loads this server state after profile restoration, shows a Home resume card, and changes the center navigation action from Start to Resume. Score entry, completion, and abandonment remain deferred.

For development-only manual testing, do not add a deletion endpoint. In a disposable local database, end a test round with SQL such as:

```sql
UPDATE rounds
SET status = 'abandoned', abandoned_at = now(), updated_at = now()
WHERE user_id = '<development-user-id>' AND status = 'in_progress';
```

Never use this statement against a production database.

Authentication routes are `/sign-in`, `/register`, `/auth/callback`, and `/profile/complete`. Provisioned accounts use `/app`. Post-authentication redirects accept only validated internal paths.

## Quality Commands

```bash
npm run typecheck
npm run lint
npm run format
npm run test
npm run build
npm run db:studio
```

## Intentional Limitations

- Hole scoring, round completion/history, IndexedDB sync, password reset, social login, and conflict resolution beyond course optimistic saves are pending.
- Handicap storage is present, but no formula or recalculation job is implemented.
- Account-retention/re-registration policy and browser Data API policies remain intentionally undecided; API authorization remains mandatory.
