# me2write

me2write is a standalone, multilingual English writing coach. It can estimate the writer's current CEFR level or verify a selected A1–C2 target, score seven writing dimensions, and return actionable sentence and vocabulary alternatives. The interface and AI explanations support English, Vietnamese, Simplified Chinese, and Japanese.

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
  src/i18n.ts              Typed four-language catalog and locale resolution
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

The pre-v1 application intentionally has one complete idempotent migration: `apps/api/migrations/0001_initial.sql`. It creates users, sessions, evaluation/usage data, block state, and immutable admin-action audit records. Because an earlier preview may already have recorded version `0001_initial`, the runner re-executes this particular idempotent init to reconcile missing pre-v1 columns and constraints. No second migration is required for the first production release. After the first production release, freeze `0001` and use later numbered migrations for all changes.

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
| `ADMIN_TIME_ZONE` | no | no | IANA time zone for admin calendar periods; defaults to `Asia/Ho_Chi_Minh` |
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

Create a separate Neon project/database or, at minimum, a dedicated database/schema and credentials for me2write. The API uses parameterized PostgreSQL queries through `@neondatabase/serverless`. Tables are `users`, `sessions`, `practice_sessions`, `writing_evaluations`, `llm_usage`, and `admin_user_actions`. Apply all numbered migrations before deploying the practice endpoints. New features must use a new numbered SQL migration; do not modify an already-released migration.

The evaluation claim is atomic and `request_id` is unique. A browser retry can return the already-completed result without paying for another inference. Processing and failed duplicate requests return controlled conflicts. The schema also records evaluation mode, requested target level, feedback language, per-user suspension state, and an append-only admin action trail.

## Product modes and localization

- **Estimate current level** independently evaluates the writing and returns the original CEFR report.
- **Verify target level** requires A1–C2 and additionally returns pass/gap verdicts, target-specific gaps, sentence assessments, and vocabulary alternatives.
- The first browser visit uses the first supported language in `navigator.languages`; `en`, `vi`, `zh`, and `ja` regional variants are normalized to their base language. Unsupported locales fall back to English. A manual selection is saved in local storage.
- The selected interface language is sent as `feedbackLanguage`, so AI explanations match the UI while quoted/replacement English stays intact.

## Administration

Allowlisted users open `/admin`. Authorization is rechecked on every backend admin endpoint via `ADMIN_EMAILS`; frontend state is never trusted. The overview reports request outcomes and tokens by period/provider/model. Server-side paginated user search reports evaluation counts for today/week/month/all time, token usage, last activity, and access status without loading the entire user base into one Worker request.

Admins can suspend a user for a bounded number of days, block them permanently, or restore access. Blocking is enforced immediately before evaluation, never deletes historical data, requires a reason, prevents self-blocking, and records actor/target/action/duration/reason in `admin_user_actions`. The database prevents audit records from being cascade-deleted with their target and independently validates action/duration/reason consistency.

Calendar periods use `ADMIN_TIME_ZONE`, not the database session time zone. When the variable is absent, the backend defaults to `Asia/Ho_Chi_Minh`; set another valid IANA value only when reporting should follow a different region. The active value is shown in the admin UI.

## Cross-account Workers AI and API deployment

The Worker runs in Cloudflare account A and calls the Workers AI REST endpoint for account B. No `AI` binding is configured because bindings are scoped to the Worker account. The adapter sends `AI_API_TOKEN` only in the server-side `Authorization: Bearer` header.

If an evaluation returns `PROVIDER_UNAVAILABLE`, open the production Worker logs and filter for `workers_ai_request_failed`. The event includes only safe diagnostics (`reason`, upstream HTTP status, Cloudflare Ray ID, and Cloudflare error codes/messages); it never includes the API token, account ID, prompt, or submitted writing. An immediate `401`/`403` usually means `AI_ACCOUNT_ID` and `AI_API_TOKEN` do not belong to the same account, the token is invalid, or its account-B scope lacks both Workers AI Read and Edit. A `404` usually indicates an incorrect account/model path, while `429` indicates quota/rate limiting.

A `network_error` with `TypeError` means no upstream HTTP response was received. Check `networkErrorKind`: `invalid_receiver` means a Workers Web API lost its required `this` receiver; `invalid_header` usually means the dashboard secret contains whitespace/newlines or the value incorrectly includes the `Bearer ` prefix; `invalid_url` means the account/model endpoint is malformed; `subrequest_failed` means the Worker could not complete the outbound fetch. Runtime config trims surrounding whitespace, validates account IDs as 32 hexadecimal characters, and rejects whitespace inside API tokens. The REST adapter deliberately invokes the platform global as a direct `fetch()` call instead of storing and calling it as an object method. Outbound Workers AI requests time out after 55 seconds, Google OAuth calls after 15 seconds, and each Neon HTTP query after 15 seconds. The browser uses a 70-second evaluation deadline and a 20-second deadline for other API calls; cancellation signals abort obsolete admin searches rather than allowing stale results to overwrite current data.

If there is no `workers_ai_request_failed` event, filter for `evaluation_pipeline_failed`. Its `stage` distinguishes `token_quota_check`, `daily_limit_check`, `provider_evaluation`, `result_persistence`, and `failure_persistence`. Database or persistence failures return `INTERNAL_ERROR` rather than being mislabeled as provider outages.

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
ADMIN_TIME_ZONE=Asia/Ho_Chi_Minh
```

Production deployment is connected directly to GitHub through Cloudflare Workers Builds. Before committing, validate locally:

```bash
pnpm build
pnpm check
```

Configure the production Worker build in Cloudflare with root directory `apps/api`, build command `pnpm build`, and deploy command `pnpm deploy`. A push to the configured production branch then builds and deploys automatically. The deploy script uses `--keep-vars`, so dashboard-managed variables are retained. `pnpm --filter @me2write/api deploy` remains available only as a manual recovery path.

`wrangler.jsonc` uses the current compatibility date, `nodejs_compat`, generated binding types, and structured logs/traces. `/health` performs no database or AI work.

### Production deployment checklist

1. Create the dedicated Neon database and run/reconcile the initial migration **before pushing the application commit**:

   ```bash
   DATABASE_URL="postgresql://..." pnpm --filter @me2write/api db:migrate
   ```

2. Create a dedicated Google OAuth web client and register the production callback URL.
3. In account B, create a Workers AI API token with Read and Edit permissions and copy its Account ID.
4. Create/deploy the Worker in account A and set all production secrets, including `AI_ACCOUNT_ID` and `AI_API_TOKEN`, with `wrangler secret put`.
5. Set the production variables listed above in the Worker dashboard and verify both origins exactly match the deployed URLs.
6. Run `pnpm check`, commit, push to GitHub, and confirm the Workers Builds check/deployment succeeds for the production branch.
7. Connect the Cloudflare Pages project to the same GitHub repository, configure `apps/web`, `pnpm build`, and `dist`, then let the production-branch push publish it automatically.
8. Verify `GET https://me2write-api-production.kimmanhcuong96.workers.dev/health`, Google login, `GET /api/me`, both evaluation modes, all four languages, logout, and `/admin` with an allowlisted account.

Schema changes are backward-compatible with the previous preview Worker, so applying the migration before the GitHub push avoids a window where the newly deployed Worker queries columns that do not exist yet. Cloudflare's Git build does not run the Neon migration automatically unless you explicitly build a separate secret-managed migration job.

Production secrets must never be placed in `vars`, source files, Pages client variables, or committed `.env` files. Only public frontend configuration such as `VITE_API_ORIGIN` belongs in Pages environment variables.

## Pages Git deployment

Connect the Cloudflare Pages project to the GitHub repository and configure:

- production branch: the repository's production branch (normally `main`)
- root directory: `apps/web`
- build command: `pnpm build`
- output directory: `dist`
- environment variable: `VITE_API_ORIGIN=https://me2write-api-production.kimmanhcuong96.workers.dev`

Every push to the configured production branch is built and published by Cloudflare; other enabled branches can receive preview deployments. The public site exposes `/`, `/about`, `/contact`, and `/privacy`; `/admin` remains authenticated and non-indexable. Vite builds a dedicated HTML entry for each public information route and generates `robots.txt` plus `sitemap.xml` from the route list in `apps/web/src/site-config.ts`. Cloudflare Pages serves those HTML entries at extensionless URLs and uses its default SPA fallback for unknown application routes; do not add a catch-all `_redirects` rewrite because it would also intercept generated SEO and static asset files.

`apps/web/src/site-config.ts` is the frontend source of truth for the canonical site origin and indexable route list. Configure the API's `APP_ORIGIN` to the same origin. If either public URL changes, update that file, `APP_ORIGIN`, `API_ORIGIN`, `VITE_API_ORIGIN`, and Google's authorized redirect URI as one deployment change; credentialed CORS intentionally does not use `*`.

## Change the model or add a provider

Change the active model in the single `LLM_MODEL` runtime variable. The default model supports Workers AI JSON mode. To move AI usage to another Cloudflare account, rotate the `AI_ACCOUNT_ID` and `AI_API_TOKEN` secrets without changing application or domain code.

To add a provider, implement `LLMProvider` in a new infrastructure adapter and select it at application composition. Translate provider output/usage inside that adapter and return the normalized result. Do not add provider SDK details to the evaluation service, domain, or routes; do not silently enable fallback.

## Quality checks

```bash
pnpm check
```

The initial suite intentionally covers only high-value pure validation. Type checking, linting, test, and production builds are the main MVP gates.

## Production request debugging

Every API response includes `X-Request-Id`. Error JSON also includes `error.requestId`, and the frontend displays it as a support reference. Search that UUID in Cloudflare Workers Logs to correlate the request safely.

Structured events are intentionally distinct:

- `request_completed`: every request, including method, path, status, outcome, latency, Cloudflare Ray ID, and HTTP request ID.
- `request_failed`: every thrown controlled or unexpected error, including normalized error code and safe cause type/code.
- `evaluation_pipeline_failed`: the exact evaluation stage that failed.
- `workers_ai_request_failed`: upstream Workers AI HTTP/network/envelope diagnostics.
- `runtime_config_invalid`: invalid or malformed Worker variables/secrets, identified by field without logging their values.
- `evaluation_completed` / `evaluation_failed`: evaluation-level outcome, using `evaluationRequestId` separately from `httpRequestId`.

Logs never include cookies, authorization headers, session/API tokens, database URLs, OAuth credentials, submitted writing, prompts, or raw provider output. Use `httpRequestId` for HTTP correlation and `evaluationRequestId` only for evaluation idempotency; do not confuse either with Cloudflare's platform request identifier.

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
- The admin user table supports server-side pagination and search but not CSV export.
