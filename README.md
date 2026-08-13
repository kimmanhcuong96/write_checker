# me2write

me2write is a standalone English writing checker. It estimates CEFR level A1–C2, scores seven writing dimensions, and returns concise strengths, priorities, corrections, and a next-level improvement plan.

The MVP is deliberately independent from me2talk: separate authentication, database tables, deployment, Workers AI usage, and configuration. The products only link to one another in the UI.

`me2write` is implemented and deployed independently from `me2talk`; there is no shared database, auth session, API, LLM quota, or Cloudflare binding.

## Architecture

```text
React + Vite (Cloudflare Pages)
              │ HTTPS + secure cookie
              ▼
Hono HTTP adapter (Cloudflare Worker)
              │
     ┌────────┼──────────┐
     ▼        ▼          ▼
 OAuth     Application   Repository ports
 adapter    services          │
              │               ▼
              ▼          Neon PostgreSQL
         LLMProvider
              │
              ▼
  Workers AI REST adapter
              │
              ▼
   Cloudflare AI account B
```

Cloudflare code is confined to `apps/api/src/index.ts`, runtime configuration, and the Workers AI adapter. CEFR rules, schemas, prompts, services, and repository contracts use platform-neutral TypeScript. A Node HTTP adapter or another PostgreSQL/LLM adapter can replace infrastructure without changing the domain.

## Project layout

```text
apps/api/
  migrations/              PostgreSQL migrations
  src/domain/              CEFR, writing, users, usage
  src/application/         services, errors, provider/repository ports
  src/infrastructure/      Google OAuth, Neon, Workers AI, config
  src/api/                 Hono routes and middleware
apps/web/                  React/Vite Pages frontend
```

## Local setup

Prerequisites: Node.js 22+, pnpm 10+, a Neon database, a Google OAuth web client, a Cloudflare account A for the Worker, and a Cloudflare account B with Workers AI access.

```bash
corepack enable
pnpm install
```

Copy `.env.example` to `apps/api/.dev.vars`, fill in all secret values, and copy the frontend lines to `apps/web/.env.local`. `.dev.vars` and `.env.local` are ignored by Git.

Apply committed migrations with the repeatable runner:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @me2write/api db:migrate
```

The initial MVP currently has one migration only: `apps/api/migrations/0001_initial.sql`. The runner creates `schema_migrations`, applies that init once, and records its version in a transaction. Future schema changes can be added as later numbered migrations without changing this initial file. Neon SQL Editor/`psql` can still be used for an emergency manual apply.

The database starts from one complete, idempotent init migration. Once production exists, treat this file as immutable and add later numbered migrations for changes.

Start both applications:

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`
- Health check: `http://localhost:8787/health`

Workers AI is called through Cloudflare's REST API during local development and therefore consumes usage from account B. There is no paid fallback.

## Environment variables

| Variable | Secret | Required | Purpose |
|---|---:|---:|---|
| `DATABASE_URL` | yes | yes | Dedicated Neon PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | no | yes | Dedicated me2write OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | yes | yes | OAuth client secret |
| `SESSION_SECRET` | yes | yes | At least 32 characters; signs short-lived OAuth state |
| `AI_ACCOUNT_ID` | yes | yes | Account ID of Cloudflare account B that owns Workers AI usage |
| `AI_API_TOKEN` | yes | yes | Account B API token with Workers AI Read and Edit permissions |
| `APP_ORIGIN` | no | yes | Exact frontend origin used by redirects and credentialed CORS |
| `API_ORIGIN` | no | yes | Public API origin used for the OAuth callback URL |
| `ENVIRONMENT` | no | yes | `development` or `production` |
| `LLM_PROVIDER` | no | yes | Must be `cloudflare` in this MVP |
| `LLM_MODEL` | no | yes | One Workers AI model supporting JSON mode |
| `MAX_WRITING_WORDS` | no | yes | Server-enforced limit; default configuration is 1000 |
| `MAX_EVALUATIONS_PER_DAY` | no | no | Per-user rolling 24-hour abuse limit; default is 30 |
| `LLM_MAX_TOKENS` | no | no | Optional global ceiling based on recorded successful total tokens |
| `ADMIN_EMAILS` | no | no | Comma-separated Google emails allowed to query admin usage |
| `VITE_API_ORIGIN` | no | yes | Public API origin compiled into the frontend |

If `LLM_MAX_TOKENS` is absent, no arbitrary application quota is created. Provider quota errors are returned as controlled failures and never trigger another paid provider.

## Google OAuth

Create a dedicated Google OAuth 2.0 **Web application** client for me2write. Configure:

- local redirect URI: `http://localhost:8787/auth/google/callback`
- current production redirect URI: `https://me2write-api-production.kimmanhcuong96.workers.dev/auth/google/callback`
- if custom domains are introduced later, add that API callback URI before switching domains

The flow uses authorization code + PKCE, signed/expiring state, an `HttpOnly` cookie, Google's stable `sub`, and opaque server-side sessions. Because the current frontend (`write-checker.pages.dev`) and API (`workers.dev`) are cross-site, production cookies are `SameSite=None; Secure`; local HTTP cookies remain `SameSite=Lax`. Credentialed CORS allows only the exact `APP_ORIGIN`, and browser `POST` requests must carry that exact Origin. The frontend must keep `credentials: "include"` on API requests. This backend OAuth flow does not use or expose a `VITE_GOOGLE_CLIENT_ID`.

`SameSite=None` permits cross-site cookie transport but cannot override a browser or extension that blocks third-party cookies entirely. Sibling custom domains such as `write.example.com` and `api.example.com` are the most robust production topology; after both are on the same site, tighten the production cookie policy back to `SameSite=Lax`.

## Neon

Create a separate Neon project/database or, at minimum, a dedicated database/schema and credentials for me2write. The API uses parameterized PostgreSQL queries through `@neondatabase/serverless`. Tables are `users`, `sessions`, `writing_evaluations`, and `llm_usage`.

The evaluation claim is atomic and `request_id` is unique. A browser retry can return the already-completed result without paying for another inference. Processing and failed duplicate requests return controlled conflicts.

## Cross-account Workers AI and API deployment

The Worker runs in Cloudflare account A and calls the Workers AI REST endpoint for account B. No `AI` binding is configured because bindings are scoped to the Worker account. The adapter sends `AI_API_TOKEN` only in the server-side `Authorization: Bearer` header.

If an evaluation returns `PROVIDER_UNAVAILABLE`, open the production Worker logs and filter for `workers_ai_request_failed`. The event includes only safe diagnostics (`reason`, upstream HTTP status, Cloudflare Ray ID, and Cloudflare error codes/messages); it never includes the API token, account ID, prompt, or submitted writing. An immediate `401`/`403` usually means `AI_ACCOUNT_ID` and `AI_API_TOKEN` do not belong to the same account, the token is invalid, or its account-B scope lacks both Workers AI Read and Edit. A `404` usually indicates an incorrect account/model path, while `429` indicates quota/rate limiting.

Generate Worker runtime types whenever `wrangler.jsonc` changes:

```bash
pnpm --filter @me2write/api types
```

In account B, create an API token from Workers AI's **Use REST API** flow, or create a custom token with both `Workers AI - Read` and `Workers AI - Edit`. Set the account B ID and token as Worker secrets in account A; never add them to `wrangler.jsonc`:

```bash
cd apps/api
pnpm wrangler secret put DATABASE_URL --env production
pnpm wrangler secret put GOOGLE_CLIENT_ID --env production
pnpm wrangler secret put GOOGLE_CLIENT_SECRET --env production
pnpm wrangler secret put SESSION_SECRET --env production
pnpm wrangler secret put AI_ACCOUNT_ID --env production
pnpm wrangler secret put AI_API_TOKEN --env production
```

Configure these non-secret production variables in **Workers & Pages → me2write-api-production → Settings → Variables and Secrets** (use the exact values, without a trailing slash):

```text
ENVIRONMENT=production
APP_ORIGIN=https://write-checker.pages.dev
API_ORIGIN=https://me2write-api-production.kimmanhcuong96.workers.dev
LLM_PROVIDER=cloudflare
LLM_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
MAX_WRITING_WORDS=1000
MAX_EVALUATIONS_PER_DAY=30
ADMIN_EMAILS=comma-separated-admin-emails
```

Production deployment is connected directly to GitHub through Cloudflare Workers Builds. Before committing, validate locally:

```bash
pnpm build
pnpm check
```

Configure the production Worker build in Cloudflare with root directory `apps/api`, build command `pnpm build`, and deploy command `pnpm deploy`. A push to the configured production branch then builds and deploys automatically. The deploy script uses `--keep-vars`, so dashboard-managed variables are retained. `pnpm --filter @me2write/api deploy` remains available only as a manual recovery path.

`wrangler.jsonc` uses the current compatibility date, `nodejs_compat`, generated binding types, and structured logs/traces. `/health` performs no database or AI work.

### Production deployment checklist

1. Create the dedicated Neon database and run the initial migration:

   ```bash
   DATABASE_URL="postgresql://..." pnpm --filter @me2write/api db:migrate
   ```

2. Create a dedicated Google OAuth web client and register the production callback URL.
3. In account B, create a Workers AI API token with Read and Edit permissions and copy its Account ID.
4. Create/deploy the Worker in account A and set all production secrets, including `AI_ACCOUNT_ID` and `AI_API_TOKEN`, with `wrangler secret put`.
5. Set the production variables listed above in the Worker dashboard and verify both origins exactly match the deployed URLs.
6. Run `pnpm check`, commit, push to GitHub, and confirm the Workers Builds check/deployment succeeds for the production branch.
7. Connect the Cloudflare Pages project to the same GitHub repository, configure `apps/web`, `pnpm build`, and `dist`, then let the production-branch push publish it automatically.
8. Verify `GET https://me2write-api-production.kimmanhcuong96.workers.dev/health`, Google login, `GET /api/me`, one evaluation charged to account B, logout, and `/admin/llm-usage` with an allowlisted account.

Production secrets must never be placed in `vars`, source files, Pages client variables, or committed `.env` files. Only public frontend configuration such as `VITE_API_ORIGIN` belongs in Pages environment variables.

## Pages Git deployment

Connect the Cloudflare Pages project to the GitHub repository and configure:

- production branch: the repository's production branch (normally `main`)
- root directory: `apps/web`
- build command: `pnpm build`
- output directory: `dist`
- environment variable: `VITE_API_ORIGIN=https://me2write-api-production.kimmanhcuong96.workers.dev`

Every push to the configured production branch is built and published by Cloudflare; other enabled branches can receive preview deployments. The included `_redirects` supports direct navigation to `/admin/llm-usage`. Configure the API's `APP_ORIGIN` to `https://write-checker.pages.dev`; credentialed CORS intentionally does not use `*`. If either public URL changes, update `APP_ORIGIN`, `API_ORIGIN`, `VITE_API_ORIGIN`, and Google's authorized redirect URI as one deployment change.

## Change the model or add a provider

Change the active model in the single `LLM_MODEL` runtime variable. The default model supports Workers AI JSON mode. To move AI usage to another Cloudflare account, rotate the `AI_ACCOUNT_ID` and `AI_API_TOKEN` secrets without changing application or domain code.

To add a provider, implement `LLMProvider` in a new infrastructure adapter and select it at application composition. Translate provider output/usage inside that adapter and return the normalized result. Do not add provider SDK details to the evaluation service, domain, or routes; do not silently enable fallback.

## Quality checks

```bash
pnpm check
```

The initial suite intentionally covers only high-value pure validation. Type checking, linting, test, and production builds are the main MVP gates.

## Keeping the specification current

`me2write_spec.md` is the product contract. Every feature or behavior change must update the relevant specification section and add a dated entry to its implementation change log. Update this README in the same change when architecture, environment variables, migrations, local setup, or deployment changes. A feature is not considered complete until code, tests, the specification, and operational documentation agree.

## Security and operational notes

- All inputs and generated output are runtime-validated; the frontend renders plain React text, never raw HTML.
- Request bodies and essay word count are bounded server-side.
- User identity and admin authorization are derived server-side.
- Essays, secrets, OAuth/session tokens, and raw provider output are not written to general logs.
- Usage records capture nullable token/provider units, success, provider/model, evaluation, and normalized error type.
- Stale sessions should be periodically deleted with an operator-run SQL maintenance task if volume warrants it.

## Known MVP limitations

- Google is the only identity provider.
- Evaluation is synchronous; there are no queues, progress percentages, or background jobs.
- Quota enforcement uses recorded total tokens and may allow one in-flight request beyond the ceiling under concurrency; provider quota remains the hard stop.
- No writing history/progress UI, subscriptions, provider fallback, classroom features, or shared me2talk SSO.
- Admin authorization is a server-side email allowlist rather than full RBAC.
