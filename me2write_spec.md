# me2write — Development Specification

## 0. Purpose of this document

This document is the implementation specification for Codex to build **me2write**, a standalone English Writing Checker.

The primary goal is to build a simple, inexpensive, maintainable MVP that evaluates English writing according to CEFR levels A1–C2, provides useful learning feedback, and tracks LLM usage.

Prioritize working product code, clean architecture, security, low operating cost, and deployment portability.

Do **not** over-engineer the MVP.

Testing should be pragmatic and minimal. Do not spend substantial implementation time creating a large automated test suite. Add only small/high-value tests where they protect critical business behavior. Additional tests will be requested separately when needed.

---

# 1. Product overview

Build a standalone web application named **me2write** for checking and evaluating English writing ability according to CEFR:

- A1
- A2
- B1
- B2
- C1
- C2

A user should be able to:

1. Open the website.
2. Write or paste an English text.
3. Submit it for evaluation.
4. Receive an estimated CEFR level.
5. See scores across important writing dimensions.
6. Understand strengths and weaknesses.
7. See useful corrections.
8. Receive practical suggestions for reaching the next CEFR level.

The product should help users improve their English writing, not merely classify their level.

---

# 2. Relationship with me2talk

me2write and `me2talk.com` are separate products.

They must remain independent applications.

Required separation:

- Separate repository.
- Separate deployment.
- Separate backend/application code.
- Separate application-specific data.
- Separate authentication flow.
- Separate Google OAuth client/configuration.
- Separate LLM usage tracking.
- Separate application configuration.
- Separate Cloudflare project/account configuration where applicable.

The applications should communicate only through normal frontend hyperlinks/backlinks for the MVP.

Examples:

From me2talk:

> Improve your English writing → me2write

From me2write:

> Practice your English speaking → me2talk

Do not create direct application API coupling between me2talk and me2write.

Do not create a shared microservice merely to connect the two products.

---

# 3. Authentication

## 3.1 Independent authentication

me2write must use its **own authentication system**.

Do not share the me2talk user/authentication tables.

Use **Google OAuth 2.0 / OpenID Connect** as the initial login mechanism.

Use a separate Google OAuth client for me2write.

The same person may naturally use the same Google account on both products, but the two applications must treat their authentication/session state independently.

Do not implement centralized SSO between me2talk and me2write in the MVP.

## 3.2 User identity

Prefer Google's stable subject identifier (`sub`) as the external identity key rather than using email alone.

Suggested user model:

```text
users
- id
- google_sub UNIQUE
- email
- display_name
- avatar_url
- created_at
- updated_at
```

Do not store unnecessary Google profile data.

## 3.3 Sessions

Use secure server-side authentication/session practices suitable for Cloudflare Workers.

Requirements:

- Secure cookies.
- `HttpOnly`.
- `Secure` in production.
- `SameSite=None; Secure` in the current cross-site `pages.dev` → `workers.dev` production topology, and `SameSite=Lax` for local HTTP development. If production moves to sibling custom domains on the same site, tighten the production cookie back to `SameSite=Lax`.
- Session expiration.
- Logout support.
- OAuth `state` validation.
- PKCE where appropriate/recommended by the selected OAuth implementation.
- Never expose Google client secrets to the frontend.

Authentication implementation must be isolated from the business/domain layer so it can be adapted later if deployment/runtime changes.

---

# 4. Deployment architecture

## 4.1 MVP deployment

Use:

```text
Frontend
    ↓
Cloudflare Pages

Backend/API
    ↓
Cloudflare Workers

LLM
    ↓
Cloudflare Workers AI

Database
    ↓
Neon PostgreSQL
```

Cloudflare Workers is the selected backend deployment target for the MVP.

Avoid adding Render, Railway, a VPS, or another backend platform unless there is a concrete requirement that Workers cannot satisfy.

## 4.2 Why Workers are used

The MVP workload is primarily:

```text
HTTP request
    ↓
validation
    ↓
authentication / quota checks
    ↓
LLM request
    ↓
structured response validation
    ↓
PostgreSQL persistence
    ↓
JSON response
```

This is stateless, request-oriented work and is appropriate for Cloudflare Workers.

---

# 5. Deployment portability — IMPORTANT

Cloudflare Workers must be treated as a **runtime/deployment adapter**, not as part of the application business domain.

The project must remain reasonably portable to:

- Standard Node.js
- Render
- Railway
- Fly.io
- AWS
- VPS/container deployments
- Other compatible server environments

A future migration should not require rewriting the application.

## 5.1 Platform-agnostic core

The following must not directly depend on Cloudflare-specific APIs:

- CEFR rubric.
- Writing evaluation rules.
- Prompt construction.
- Input validation.
- Output validation.
- Authentication business rules.
- Usage/quota business rules.
- Application services.
- Database repository interfaces.
- Domain models.
- LLM provider interfaces.

Cloudflare-specific functionality must be isolated inside infrastructure/adapters.

Target:

```text
Cloudflare Worker
       │
       ▼
Runtime / HTTP Adapter
       │
       ▼
Application Services
       │
   ┌───┼──────────────┐
   ▼   ▼              ▼
 Auth Repositories   LLMProvider
       │              │
       ▼              ▼
     Neon       WorkersAIProvider
```

A future migration should approximately become:

```text
Node/Render/Railway/VPS
       │
       ▼
Runtime / HTTP Adapter
       │
       ▼
same Application Services
```

## 5.2 Avoid unnecessary Cloudflare lock-in

Do not use Cloudflare-specific services merely because they are available.

For the MVP, prefer:

- Neon/PostgreSQL instead of D1.
- Portable repository interfaces instead of DB calls scattered through routes.
- `LLMProvider` abstraction instead of direct Cloudflare API usage in services.
- Standard Web APIs/Hono routing.
- Configuration abstraction instead of passing Worker bindings throughout the application.

Avoid using these unless a concrete requirement justifies them:

- D1
- KV
- Durable Objects
- Queues
- Workflows
- Service Bindings
- Cloudflare-specific state management

If any such feature becomes necessary, isolate it behind an adapter/interface.

## 5.3 Runtime configuration

Cloudflare-specific files such as Wrangler configuration and bindings may be platform-specific.

Keep them at the infrastructure boundary.

Application code should receive typed configuration rather than reading platform globals everywhere.

---

# 6. Recommended technology stack

Use a TypeScript-first stack.

Recommended backend:

- TypeScript
- Cloudflare Workers
- Hono for HTTP routing
- Zod or equivalent for runtime schema validation
- Neon PostgreSQL
- A lightweight PostgreSQL-compatible data-access approach suitable for Workers
- Google OAuth 2.0 / OIDC
- Cloudflare Workers AI through an adapter

Frontend may use a lightweight modern TypeScript framework appropriate for Cloudflare Pages.

Do not introduce a large framework solely for architectural fashion.

Optimize for:

- simple code,
- fast builds,
- low bundle/runtime overhead,
- maintainability,
- accessibility,
- responsive UI.

---

# 7. Suggested backend project structure

A structure similar to the following is preferred:

```text
src/
├── domain/
│   ├── writing/
│   ├── cefr/
│   ├── users/
│   └── usage/
│
├── application/
│   ├── services/
│   ├── dto/
│   └── ports/
│
├── infrastructure/
│   ├── auth/
│   │   └── google/
│   ├── db/
│   │   └── neon/
│   ├── llm/
│   │   └── cloudflare-workers-ai/
│   └── runtime/
│       └── cloudflare/
│
├── api/
│   ├── routes/
│   ├── middleware/
│   └── schemas/
│
└── index.ts
```

Exact naming may differ if Codex identifies a cleaner equivalent, but preserve the separation of concerns.

Routes should be thin.

Do not put CEFR evaluation logic, prompt logic, database logic, authentication logic, and Workers AI calls directly inside a route handler.

---

# 8. Core user flow

Primary flow:

```text
User
 ↓
Open me2write
 ↓
Login with Google if required
 ↓
Write / paste English text
 ↓
Submit
 ↓
Backend validates request
 ↓
Usage / quota protection
 ↓
LLM evaluates against CEFR rubric
 ↓
Backend validates structured LLM output
 ↓
Persist evaluation + usage
 ↓
Display result
```

The writing experience should remain the central UI.

Do not bury the input behind unnecessary dashboards or onboarding steps.

---

# 9. Writing input

Provide a clear writing textarea/editor.

Show:

- current word count,
- maximum allowed words,
- clear submit button,
- validation messages.

## 9.1 Length protection

The backend must enforce a maximum writing length.

Initial MVP default:

```text
MAX_WRITING_WORDS=1000
```

Make the value configurable.

Do not rely only on frontend validation.

Reject:

- empty input,
- whitespace-only input,
- input exceeding the configured maximum,
- obviously malformed request payloads.

Avoid unnecessarily sending huge inputs to the LLM.

---

# 10. CEFR evaluation

Do not ask the LLM only:

> What CEFR level is this?

Use a structured CEFR rubric.

The rubric must define useful writing descriptors for:

- A1
- A2
- B1
- B2
- C1
- C2

The evaluator should compare the submitted writing against the rubric.

The result must explain why the text is estimated at the selected CEFR level.

Keep the rubric in application/domain configuration so it can be reviewed and updated without rewriting provider code.

---

# 11. Evaluation dimensions

At minimum evaluate:

- Grammar
- Vocabulary
- Sentence complexity
- Coherence
- Cohesion
- Communicative effectiveness
- Naturalness
- Overall CEFR level

Use consistent scoring.

For the MVP, use a 1–10 score for each scored dimension unless implementation discovers a strong reason to use 0–10 consistently.

Do not allow arbitrary scoring scales across requests.

Example:

```text
CEFR Level: B2

Grammar:                  8/10
Vocabulary:               7/10
Sentence Complexity:      7/10
Coherence:                 8/10
Cohesion:                  7/10
Communicative Effectiveness: 8/10
Naturalness:               7/10
```

---

# 12. Evaluation result

The result UI should include:

## Overall result

- Estimated CEFR level.
- Short explanation of why.

## Scores

Display evaluation dimensions clearly.

## Strengths

Concise points describing what the learner is doing well.

## Problems / weaknesses

Prioritized issues that materially affect the writing.

Avoid overwhelming the user with every trivial mistake.

## Corrections

Each useful correction should contain:

```text
Original
Better
Explanation
```

Corrections should teach rather than merely replace text.

## Improvement plan

Give concrete suggestions for reaching the next CEFR level.

Example:

```text
Current: B2
Target: C1

Focus on:
- more precise vocabulary,
- stronger cohesion,
- more varied complex sentence structures,
- more natural collocations.
```

For C2, provide refinement/maintenance advice rather than pretending there is another CEFR level.

---

# 13. LLM abstraction

The LLM provider must be replaceable.

Define an application-facing interface similar to:

```ts
interface LLMProvider {
  evaluateWriting(
    input: WritingEvaluationInput
  ): Promise<WritingEvaluationResult>;
}
```

Initial implementation:

```text
CloudflareWorkersAIProvider
```

Potential future providers:

- OpenAI
- Gemini
- DeepSeek
- Groq
- Ollama
- other compatible providers

Do not reference the Workers AI REST client or Cloudflare credentials from domain/application services.

The Cloudflare adapter calls the Workers AI REST API so the Worker may remain in account A while inference and billing belong to account B. It authenticates server-side with account B's account ID and API token; domain/application services remain unaware of Cloudflare credentials.

Desired dependency direction:

```text
WritingEvaluationService
          │
          ▼
      LLMProvider
          │
          ▼
CloudflareWorkersAIProvider
          │
          ▼
Workers AI REST API
          │
          ▼
Cloudflare AI account B
```

---

# 14. LLM configuration

Use environment configuration.

Example conceptual variables:

```text
LLM_PROVIDER=cloudflare
LLM_MODEL=<configured-model>
AI_ACCOUNT_ID=<account-B-id>
AI_API_TOKEN=<account-B-token>
LLM_MAX_TOKENS=<optional>
MAX_WRITING_WORDS=1000
```

Do not hard-code a specific model throughout the codebase.

There should be one configuration source for the active provider/model.

Credentials and secrets must remain server-side. `AI_ACCOUNT_ID` and `AI_API_TOKEN` are configured as Worker secrets in account A and must not be committed as Wrangler `vars`, even though an account ID alone is not an authentication credential. The API token requires Workers AI Read and Edit permissions for account B.

Never expose:

- Cloudflare API tokens,
- Google OAuth client secret,
- database credentials,
- session secrets

to the browser.

---

# 15. Prompt design

Optimize prompts aggressively for low usage and consistent output.

The evaluation request should contain only what is necessary:

```text
CEFR rubric
+
evaluation instructions
+
user writing
```

Avoid verbose conversational prompting.

The LLM should be instructed to:

- evaluate only the submitted writing,
- use the supplied CEFR rubric,
- produce concise feedback,
- return valid structured data,
- avoid unsupported assumptions about the writer,
- distinguish errors from stylistic preferences,
- prioritize useful corrections.

Do not request chain-of-thought.

---

# 16. Structured LLM output

Internally use structured JSON.

Example shape:

```json
{
  "level": "B2",
  "levelReason": "The writing communicates ideas clearly with generally good control of grammar and vocabulary, but lacks the precision and flexibility expected at C1.",
  "scores": {
    "grammar": 8,
    "vocabulary": 7,
    "sentenceComplexity": 7,
    "coherence": 8,
    "cohesion": 7,
    "communicativeEffectiveness": 8,
    "naturalness": 7
  },
  "strengths": [],
  "problems": [],
  "corrections": [
    {
      "original": "",
      "better": "",
      "explanation": ""
    }
  ],
  "improvementPlan": []
}
```

Validate LLM output on the backend before persisting or returning it.

Never blindly trust generated JSON.

If parsing/validation fails:

- do not store invalid evaluation as successful,
- return a controlled application error,
- log enough diagnostic information without logging secrets,
- avoid uncontrolled retry loops.

At most one carefully controlled retry may be used for malformed structured output if justified.

---

# 17. Token / Neuron / usage strategy

Operating cost should remain as close to $0 as practical for the MVP.

Optimize:

- prompt size,
- rubric size,
- response size,
- number of LLM calls,
- unnecessary retries.

One user evaluation should normally require **one LLM evaluation call**.

Do not split a normal essay evaluation into multiple AI calls unless quality clearly requires it.

---

# 18. Usage tracking

me2write must track its LLM usage independently from me2talk.

Store at minimum:

```text
llm_usage
- id
- timestamp
- provider
- model
- user_id
- evaluation_id
- input_tokens nullable
- output_tokens nullable
- total_tokens nullable
- provider_usage_value nullable
- provider_usage_unit nullable
- success
- error_type nullable
```

Because provider usage metrics may differ, do not assume every provider always returns token counts.

Store provider-specific usage information when available without coupling business logic to Cloudflare.

Usage must be aggregatable by:

- day,
- week,
- month,
- year.

---

# 19. Application-level usage limit

Support an optional configurable application-level LLM usage limit.

Conceptually:

```text
LLM_MAX_TOKENS=<number>
```

If the variable is absent:

> Do not invent an arbitrary default application token limit.

If a configured limit has been reached, stop making additional LLM requests and return a controlled quota/unavailable response.

Because Workers AI may use provider-specific quota units, design quota enforcement so future usage-unit strategies can be added without rewriting evaluation services.

Do not automatically switch to another paid LLM provider.

---

# 20. Cost safety

The application is **free-tier-first and safe-by-default**.

Strict rules:

- Never automatically enable a paid LLM fallback.
- Never rotate across Cloudflare accounts to extend free quota.
- Never use me2talk's Workers AI allocation as a fallback for me2write.
- Never use me2write's Workers AI allocation as a fallback for me2talk.
- Do not create multi-account quota rotation logic.
- Do not silently continue with a paid provider after a quota failure.

When AI quota is unavailable, return a controlled user-facing message.

Provider fallback may only be added later when explicitly configured by the administrator.

---

# 21. Database

Use Neon PostgreSQL.

me2write should have its own application tables and authentication/user data.

Suggested entities:

```text
users
sessions
writing_evaluations
llm_usage
```

Optionally:

```text
oauth_accounts
```

depending on the authentication library/implementation.

## writing_evaluations

Suggested fields:

```text
id
user_id
request_id UNIQUE
original_text
word_count
estimated_level
result_json
status
provider
model
created_at
updated_at
```

Possible status values:

```text
pending
processing
completed
failed
```

Use appropriate indexes.

Do not over-normalize the structured evaluation result for the MVP if storing validated JSON/JSONB is simpler.

---

# 22. Idempotency and duplicate AI protection

Evaluation submission must be idempotent enough to prevent accidental duplicate LLM usage.

Frontend should generate or receive a unique request identifier for a submission.

Example:

```text
request_id = UUID
```

Backend must enforce uniqueness.

If the same request is retried because of:

- network interruption,
- browser retry,
- timeout,
- double click,

do not create multiple successful AI evaluations for the same request.

Desired behavior:

```text
request #1 ─┐
            ├── one evaluation / one logical LLM operation
request #2 ─┘
```

Disable repeated submit while the current request is in progress.

Do not implement uncontrolled automatic retries.

All outbound dependencies and browser API calls must have finite, cancellable deadlines. The initial production values are 55 seconds for Workers AI, 15 seconds for Google OAuth and each Neon HTTP query, 70 seconds for browser evaluation submission, and 20 seconds for other browser API requests. Replaced admin search requests must be aborted so stale responses cannot overwrite newer results.

---

# 23. API design

Use versioned or consistently namespaced APIs.

Suggested endpoints:

```text
GET  /health

GET  /auth/google
GET  /auth/google/callback
POST /auth/logout

GET  /api/me

POST /api/evaluations
GET  /api/evaluations/:id

GET  /api/admin/llm-usage
GET  /api/admin/dashboard
POST /api/admin/users/:id/suspension
```

Exact OAuth endpoints may differ according to the selected implementation.

## Health endpoint

`GET /health` should be lightweight.

Return something like:

```json
{
  "status": "ok"
}
```

Do not call Workers AI from `/health`.

Do not perform expensive database work from `/health`.

Even though Workers do not have Render-style sleep/cold-start behavior, keeping a simple health endpoint is useful for deployment/monitoring.

---

# 24. Error handling

Use consistent API error responses.

Example conceptual format:

```json
{
  "error": {
    "code": "WRITING_TOO_LONG",
    "message": "Your writing exceeds the maximum allowed length.",
    "requestId": "server-generated-correlation-id"
  }
}
```

Define stable error codes for important cases:

- authentication required,
- invalid input,
- writing too long,
- duplicate/in-progress request,
- AI quota unavailable,
- provider unavailable,
- invalid provider output,
- evaluation failed,
- forbidden/admin required,
- user temporarily/permanently blocked,
- internal error.

Do not expose stack traces or secrets to users.

---

# 25. Admin usage dashboard

Provide a simple admin page:

```text
/admin
```

The dashboard is for usage monitoring and cost/quota control, not a full analytics product.

Show:

## Today

- Requests
- Successful requests
- Failed requests
- Input tokens when available
- Output tokens when available
- Total tokens when available
- Provider-specific usage when available

## This week

Same metrics.

## This month

Same metrics.

## This year

Same metrics.

Allow basic provider/model visibility.

The user-management view must also show each user's evaluation count for today, the current calendar week, the current calendar month, and all time; successful/failed usage; recorded total tokens; last activity; and current access status. Day/week/month/year are calendar periods in a validated, operator-configured IANA reporting time zone (`Asia/Ho_Chi_Minh` by default), and the admin UI must disclose the active time zone. User search and listing must be paginated on the backend with a bounded page size. Admins can search users, suspend a user for 1–3650 days, block access permanently, or restore access. A non-empty reason is required when restricting access. The backend must enforce the action, prevent an admin from blocking their own account, and write an immutable audit record containing actor, target, action, duration, reason, and timestamp. Database constraints must prevent audit deletion through a target-user cascade and must enforce action/duration/reason consistency. Blocking prevents new AI evaluations without deleting the user or their history.

Keep UI simple.

Protect the route with an explicit admin authorization mechanism.

Do not infer admin status from frontend state.

---

# 26. Frontend UX

The UI should feel like a focused learning tool.

Primary screen should emphasize:

1. writing input,
2. word count,
3. submit/check action,
4. evaluation result.

The product has two explicit evaluation modes:

1. **Estimate current level**: estimate CEFR A1–C2 independently and return the standard scores and coaching.
2. **Verify a target level**: require A1, A2, B1, B2, C1, or C2; state whether the submission meets that exact target; explain material gaps; assess weak sentences; and propose natural sentence and vocabulary alternatives. Provider output must match the requested mode and target or be rejected.

The interface uses a consistent dark technology theme with restrained green/blue accents, responsive panels, visible focus states, and reduced-motion support. Once authenticated, the header must display the user's avatar, name/email, sign-in provider, service-access status, logout, and admin navigation when authorized.

All application UI and requested AI coaching support English (`en`), Vietnamese (`vi`), Simplified Chinese (`zh`), and Japanese (`ja`). On the first visit, choose the first supported entry from `navigator.languages`; match regional variants by base language; fall back to English for every unsupported or unavailable locale. A user's explicit selector choice is stored locally and takes precedence on later visits. English remains the API default for older clients. English source quotations and proposed English replacements remain in English even when explanations use another language.

Recommended states:

```text
idle
submitting
analyzing
success
error
quota unavailable
```

During evaluation, provide clear progress copy such as:

```text
Analyzing your writing...
Evaluating grammar and vocabulary...
Estimating your CEFR level...
```

Do not fake detailed backend progress percentages unless the backend actually provides them.

Prevent double submission.

Make error recovery obvious.

---

# 27. Responsive and accessibility requirements

Support desktop and mobile.

Use semantic HTML and accessible controls.

Requirements:

- visible keyboard focus,
- proper form labels,
- sufficient contrast,
- meaningful button text,
- accessible validation/error messages,
- no interaction that depends solely on hover,
- reasonable textarea size on mobile,
- semantic grouped selection controls with programmatic selected state,
- modal focus containment, Escape dismissal, labelled dialog titles, and focus restoration,
- text alternatives for icon-only retry/close controls,
- readable supporting text without essential information relying on very small type.

Do not sacrifice usability for decorative animation.

---

# 28. Security requirements

At minimum:

- Validate all external input server-side.
- Protect OAuth state.
- Secure sessions/cookies.
- Keep secrets server-side.
- Parameterize database queries.
- Prevent SQL injection.
- Configure CORS narrowly if frontend/backend origins require it.
- Do not use `*` CORS with credentials.
- Apply reasonable request/body-size limits.
- Add reasonable rate limiting/abuse protection if practical without introducing excessive architecture.
- Do not trust client-provided user IDs.
- Derive authenticated user identity server-side.
- Protect admin routes server-side.
- Sanitize/escape user-controlled content when rendering.
- Do not render LLM output as unsafe raw HTML.

Do not log:

- OAuth secrets,
- database passwords,
- API tokens,
- session tokens.

Avoid logging full essays by default in generic infrastructure logs when not necessary.

---

# 29. Observability

Keep observability lightweight.

Log useful structured events:

- a server-generated HTTP request ID returned through `X-Request-Id` and `error.requestId`,
- separate `httpRequestId` and client evaluation idempotency `evaluationRequestId` fields,
- evaluation ID,
- user ID or safe internal identifier,
- provider,
- model,
- status,
- latency,
- usage metadata,
- normalized error type.

Log one completion event for every request and one normalized failure event for every thrown error. Evaluation and Workers AI adapters may add stage-specific events correlated through the same Worker trace. Logs must not contain cookies, authorization headers, secrets, connection strings, submitted writing, prompts, or raw provider output.

Do not build a complex observability stack for the MVP.

Cloudflare logs plus database usage records are sufficient initially.

---

# 30. Environment separation

Support at least:

```text
development
production
```

Optionally staging if it adds little complexity.

Keep production secrets out of source control.

Provide an `.env.example` or equivalent documented configuration without real secrets.

Document required Cloudflare bindings/secrets.

---

# 31. Local development

The project must be straightforward to run locally.

Provide README instructions for:

- dependency installation,
- local environment configuration,
- database setup/migrations,
- Google OAuth configuration,
- Cloudflare Workers AI configuration,
- local development,
- production deployment.

Where practical, keep application services runnable/testable without requiring a live Cloudflare deployment.

---

# 32. Database migrations

Use a repeatable migration mechanism.

Do not rely on manually editing the production database.

Migrations should create required tables/indexes and be committed to source control.

Avoid destructive migrations unless explicitly required.

---

# 33. Testing strategy — intentionally lightweight

Do **not** build a large test suite during the initial implementation.

The user will request additional testing later where necessary.

Focus implementation effort on the working application.

Add only a small number of high-value automated tests if easy and useful, especially around critical pure logic such as:

- request validation,
- CEFR result schema validation,
- quota decision logic,
- idempotency behavior.

Do not:

- chase arbitrary coverage percentages,
- create extensive snapshot tests,
- heavily mock every infrastructure layer,
- create large E2E suites for the MVP,
- spend significant time testing trivial getters/routes.

A simple build/typecheck/lint plus a few critical tests is sufficient initially.

The project should nevertheless be structured so more tests can be added later without refactoring the architecture.

---

# 34. MVP scope

The initial version must focus on:

1. Google OAuth login.
2. Writing input.
3. Backend input validation.
4. Configurable maximum writing length.
5. Cloudflare Workers AI evaluation.
6. Structured CEFR A1–C2 rubric.
7. Overall CEFR estimate.
8. Dimension scores.
9. Strengths.
10. Weaknesses/problems.
11. Corrections.
12. Improvement plan.
13. Persist evaluation result.
14. LLM usage tracking.
15. Application-level quota/cost protection.
16. Basic admin usage dashboard.
17. Independent deployment.
18. Deployment-portable architecture.
19. Basic responsive/accessibility quality.
20. Secure production configuration.

Do not overbuild beyond this scope.

---

# 35. Explicitly out of MVP scope

Do not implement these unless required to support the MVP:

- centralized SSO with me2talk,
- shared me2talk authentication,
- shared me2talk application database,
- complex subscription/payment plans,
- multi-provider automatic fallback,
- paid-provider automatic fallback,
- quota rotation between Cloudflare accounts,
- social features,
- classroom management,
- teacher dashboards,
- elaborate gamification,
- complex progress analytics,
- OCR,
- PDF/DOCX processing,
- image analysis,
- background job infrastructure,
- Redis queues,
- WebSockets,
- Durable Objects,
- D1 migration,
- Cloudflare KV-based business storage,
- large automated test suite.

---

# 36. Future features

Architecture should not block future implementation of:

- writing history,
- progress tracking,
- comparison with previous submissions,
- dedicated grammar correction mode,
- vocabulary suggestions,
- sentence rewriting,
- “Improve this to B2/C1” mode,
- topic generation,
- writing exercises,
- CEFR-specific exercises,
- user progress dashboard,
- optional SSO across products,
- subscriptions/paid plans,
- additional LLM providers.

These are future scope only.

Do not implement them preemptively.

---

# 37. Provider replacement requirement

Switching LLM providers should require adding/replacing an infrastructure adapter rather than rewriting evaluation business logic.

Example:

```text
LLMProvider
   │
   ├── CloudflareWorkersAIProvider
   ├── OpenAIProvider        [future]
   ├── GeminiProvider        [future]
   └── OllamaProvider        [future]
```

Provider-specific request/response translation belongs inside each adapter.

Application services should consume normalized provider-independent results.

---

# 38. Database portability

Do not couple domain logic to Neon-specific APIs.

Treat Neon as PostgreSQL infrastructure.

Use repository abstractions where useful.

A future move:

```text
Neon PostgreSQL
      ↓
another PostgreSQL provider
```

should not require rewriting the domain/application layers.

---

# 39. Authentication portability

Google OAuth is the initial identity provider, but avoid spreading Google-specific claims throughout business code.

Normalize authenticated identity at the auth boundary.

Conceptually:

```ts
type AuthenticatedUser = {
  id: string;
  email?: string;
  displayName?: string;
};
```

Application services should operate on the internal user identity, not raw Google tokens.

---

# 40. Coding principles

Use:

- TypeScript strict mode.
- Clear domain/application/infrastructure boundaries.
- Dependency inversion where it provides real portability.
- Small focused modules.
- Runtime validation at external boundaries.
- Consistent error handling.
- Async error handling.
- Explicit configuration.
- Database transactions where correctness requires them.

Avoid:

- giant route handlers,
- giant service classes,
- premature microservices,
- speculative abstractions,
- unnecessary design patterns,
- unnecessary dependencies,
- Cloudflare APIs scattered throughout business code,
- duplicate business rules between frontend/backend.

Prefer readability over cleverness.

---

# 41. Performance principles

Optimize primarily for perceived user latency and unnecessary AI usage.

Do not prematurely optimize PostgreSQL queries with complex caching.

Important:

- Keep Worker request handlers lightweight.
- Minimize LLM calls.
- Keep prompts concise.
- Limit response size.
- Avoid loading unnecessary data.
- Use appropriate DB indexes.
- Prevent duplicate evaluations.

---

# 42. Suggested evaluation transaction flow

A submission should conceptually behave as:

```text
1. Authenticate user
2. Validate payload
3. Enforce word limit
4. Validate request_id
5. Check existing evaluation by request_id
6. Check application/provider quota state
7. Create/mark evaluation as processing
8. Call LLM provider once
9. Validate structured response
10. Persist successful evaluation
11. Persist usage metadata
12. Return normalized result
```

On failure:

```text
- mark evaluation failed when appropriate,
- record available usage/error metadata,
- return controlled error,
- do not create uncontrolled retry loops.
```

Be careful with concurrency around the unique `request_id`.

---

# 43. Suggested API result contract

The frontend should receive a normalized application result rather than raw Workers AI output.

Conceptually:

```json
{
  "id": "evaluation-id",
  "status": "completed",
  "evaluation": {
    "level": "B2",
    "levelReason": "...",
    "scores": {
      "grammar": 8,
      "vocabulary": 7,
      "sentenceComplexity": 7,
      "coherence": 8,
      "cohesion": 7,
      "communicativeEffectiveness": 8,
      "naturalness": 7
    },
    "strengths": [],
    "problems": [],
    "corrections": [],
    "improvementPlan": []
  }
}
```

Do not expose raw provider payloads unless needed for controlled diagnostics.

---

# 44. Admin authorization

Use a simple, explicit MVP admin strategy.

Possible implementation:

- configured admin user IDs/emails in server-side environment/config, or
- an explicit role column in the me2write user table.

Choose the simplest secure implementation.

Do not add a full RBAC system for the MVP.

Admin authorization must be enforced on the backend.

---

# 45. README / developer documentation

Create a useful README containing:

1. Product overview.
2. Architecture.
3. Local setup.
4. Environment variables.
5. Google OAuth setup.
6. Neon setup.
7. Workers AI setup.
8. Cloudflare Pages/Workers deployment.
9. Database migrations.
10. How to change the LLM model.
11. How to add another LLM provider.
12. Explanation of deployment portability.
13. Known MVP limitations.

Include a short architecture diagram in Markdown.

---

# 46. Definition of Done for initial Codex implementation

The initial implementation is complete when:

- The frontend can be deployed to Cloudflare Pages.
- The API can be deployed to Cloudflare Workers.
- Google OAuth login works independently of me2talk.
- An authenticated user can submit English writing.
- The backend validates the writing and word limit.
- The request is evaluated through the configured Workers AI model.
- The LLM response is validated into the application's structured schema.
- A CEFR A1–C2 result is displayed.
- Dimension scores are displayed.
- Strengths, problems, corrections, and improvement advice are displayed.
- Evaluation records are persisted in Neon.
- LLM usage metadata is persisted when available.
- Duplicate submission protection exists.
- A simple admin usage page works.
- Secrets are not exposed to the frontend.
- The codebase separates Cloudflare runtime code from application/domain code.
- The project builds/typechecks cleanly.
- Minimal critical tests pass if such tests were added.
- README contains enough instructions for another developer to run and deploy the project.

---

# 47. Implementation priority

Implement in this order unless there is a strong technical reason to change it:

```text
1. Project structure/configuration
2. Database schema + migrations
3. Authentication
4. Domain models + validation
5. CEFR rubric
6. LLMProvider interface
7. Workers AI adapter
8. Evaluation service
9. Evaluation API
10. Usage tracking
11. Frontend writing/evaluation flow
12. Admin usage page
13. Security/error handling pass
14. Deployment configuration
15. README
16. Minimal critical tests/typecheck/lint
```

Do not pause implementation to build future features.

---

# 48. Final implementation instruction to Codex

Build the MVP described in this specification as production-conscious application code, but keep the implementation appropriately small.

The most important architectural constraints are:

1. **me2write is independent from me2talk.**
2. **Google OAuth authentication is independent.**
3. **Cloudflare Workers is the MVP backend runtime.**
4. **Cloudflare Workers AI is the initial LLM provider.**
5. **Neon PostgreSQL is the database.**
6. **Cloudflare-specific code must remain isolated at the infrastructure/runtime boundary.**
7. **The backend must remain reasonably portable to a normal Node.js/server deployment later.**
8. **LLM provider logic must be abstracted.**
9. **Do not automatically create paid LLM usage or rotate free quotas across accounts.**
10. **Prevent duplicate LLM calls caused by retries/double submissions.**
11. **Use a structured CEFR rubric and validated structured output.**
12. **Optimize for low AI usage and low operating cost.**
13. **Do not over-engineer.**
14. **Do not spend significant time building a large test suite during this implementation.**

When a choice is not specified, choose the simplest secure and maintainable implementation that satisfies these principles.

---

# 49. Specification maintenance and implementation status

This document is the source of truth for product behavior and scope. The implementation and this specification must be kept synchronized.

## 49.1 Update rule

Whenever a feature, API contract, data field, security rule, quota rule, deployment requirement, or user-facing behavior is added, changed, or removed:

1. Update the relevant specification section in the same change.
2. Add a dated entry to the implementation change log below.
3. Update `README.md` when the change affects architecture, environment variables, migrations, local setup, or deployment.
4. Update validation/tests for behavior that protects cost, data integrity, authentication, authorization, or provider output.

Do not treat code as complete if it introduces behavior that is not represented here.

## 49.2 Current implementation status

The following MVP capabilities are implemented in the current repository:

- Independent Google OAuth/OIDC authentication with state, PKCE, secure cookies, logout, and opaque server-side sessions.
- React/Vite frontend for Cloudflare Pages and Hono API for Cloudflare Workers.
- Platform-neutral CEFR rubric, writing validation, result schema, application services, repository ports, and `LLMProvider` abstraction.
- Cross-account Cloudflare Workers AI REST adapter with Bearer authentication, validated Cloudflare/JSON-mode envelopes, controlled quota errors, provider-independent normalized output, and nullable usage metadata.
- Neon PostgreSQL persistence for users, sessions, evaluations, and LLM usage.
- One complete idempotent initial database migration: `apps/api/migrations/0001_initial.sql`.
- Repeatable migration runner with `schema_migrations` tracking.
- Server-side word/body validation, atomic `request_id` duplicate protection, optional token quota, and configurable per-user rolling 24-hour evaluation limit.
- Evaluation result UI for level, seven scores, strengths, problems, corrections, improvement plan, loading states, and controlled errors.
- Two evaluation modes: independent CEFR estimation and exact A1–C2 target verification with sentence/vocabulary alternatives and validated target coaching.
- English, Vietnamese, Simplified Chinese, and Japanese UI/AI-feedback localization with browser-locale detection, saved preference, and English fallback.
- Light responsive UI with an authenticated account menu, accessible language selector, feature navigation, public information pages, and admin navigation.
- Crawlable public routes for the homepage, About, Contact, and Privacy with route-specific metadata, canonical URLs, Open Graph metadata, a generated sitemap, robots policy, and non-indexable administration metadata.
- Backend-protected admin dashboard grouped by day, week, month, year, provider, model, and user; audited temporary/permanent user suspension and restoration.
- Narrow credentialed CORS, exact required Origin checks for state-changing browser requests, environment-aware cross-site session cookies, server-side admin authorization, structured errors/logging, and no automatic paid-provider fallback.
- Minimal high-value tests for validation, provider-result schema, idempotency, token quota, and rate limiting.

Deployment credentials and external resources (Google OAuth client, Neon database, Worker account A, Workers AI account B/token, Pages project, and production domains) remain operator configuration; they are not committed to this repository.

## 49.3 Implementation change log

### 2026-08-15 — Ecosystem typography and layout alignment

- Kept the existing product colors and background while aligning the frontend with the me2talk visual system's Inter-first typography, 36–48px page headings, 18–24px section headings, 14–16px body text, readable metadata sizing, centered max-width containers, responsive page padding, moderate control/card radii, and consistent touch-target sizing.
- Applied the layout scale across the public pages, checker, practice and exam workspaces, result views, navigation, footer, and admin/data views without changing application behavior.

### 2026-08-14 — Public site UI and SEO structure

- Reworked the existing visual tokens into a light, readable theme without changing writing evaluation behavior.
- Added crawlable feature navigation and stable homepage feature anchors, plus public About, Contact, and product-specific Privacy pages.
- Improved the native language selector and replaced the previous footer text with compact product, information, and privacy navigation.
- Extended English, Vietnamese, Simplified Chinese, and Japanese localization across public navigation, feature cards, practice and exam controls, result labels, administration labels, public information pages, error states, and runtime metadata. English writing prompts remain unchanged because they are the material being practised.
- Centered the About and Contact content containers while retaining a readable long-form layout for Privacy.
- Added dedicated Vite HTML entries that Cloudflare Pages serves at extensionless URLs, with unique metadata for public information routes, canonical and Open Graph metadata, accurate `WebSite` structured data on the homepage, generated `robots.txt` and sitemap output, and `noindex` metadata for administration.

### 2026-08-13 — Initial MVP implementation

- Added the portable monorepo architecture and Cloudflare deployment adapters.
- Added the initial PostgreSQL schema, authentication, evaluation service, Workers AI adapter, frontend, admin usage view, documentation, and critical tests.
- Added repeatable migration tracking, nullable provider usage aggregation, and a per-user rolling evaluation limit.

### 2026-08-13 — Cross-account Workers AI REST access

- Replaced the account-local Workers AI binding with the authenticated REST API adapter.
- Added account B's `AI_ACCOUNT_ID` and `AI_API_TOKEN` as required Worker secrets in account A.
- Added validation and tests for Cloudflare API envelopes, Bearer authentication, structured output, and quota failures.

### 2026-08-13 — Cross-site OAuth session transport

- Set production authentication cookies to `SameSite=None; Secure` so credentialed requests can carry the session from the `pages.dev` frontend to the `workers.dev` API; local HTTP development remains `SameSite=Lax`.
- Required the configured frontend Origin on browser state-changing requests as the CSRF boundary accompanying cross-site cookies.
- Documented the exact current production origins, the browser third-party-cookie limitation, and sibling custom domains as the robust long-term topology.

### 2026-08-13 — Git-integrated Cloudflare deployments

- Documented Cloudflare Workers Builds and Pages Git integration as the production deployment path: validated commits pushed to the configured production branch automatically build and deploy both applications.
- Retained Wrangler deployment only as a manual recovery path; production runtime variables and secrets remain dashboard-managed.

### 2026-08-13 — Workers AI failure diagnostics

- Added structured server-side diagnostics for cross-account Workers AI network, HTTP, envelope, and JSON failures.
- Logs may include upstream HTTP status, Cloudflare Ray ID, and provider error codes/messages, but never the API token, account ID, prompt, or submitted writing.
- Added stage-aware evaluation-pipeline diagnostics and stopped classifying database/quota/persistence dependency failures as Workers AI outages.
- Normalize surrounding whitespace and validate the Cloudflare account ID/API token before constructing the REST request; classify fetch `TypeError` failures without logging raw exception messages or credentials.
- Invoke the Workers global `fetch()` with its correct runtime receiver; injected fetch implementations remain supported for deterministic adapter tests.

### 2026-08-13 — Request-correlated production logging

- Added a server-generated `X-Request-Id` to every response and the same `requestId` to API error bodies and frontend support references.
- Added structured completion and failure events for all HTTP requests with safe method, path, status, latency, Ray ID, normalized error, and cause-code fields.
- Separated HTTP correlation IDs from evaluation idempotency IDs and documented the strict no-secret/no-content logging policy.

### 2026-08-13 — Multilingual target coaching and user administration

- Added the dark technology visual system and authenticated user/account surface based on the supplied team reference.
- Added complete UI and AI-feedback localization for English, Vietnamese, Simplified Chinese, and Japanese, including regional browser-locale detection and English fallback.
- Added current-level estimation and exact CEFR target-verification modes with structured sentence and vocabulary upgrade guidance.
- Added server-side paginated user search with per-user daily/weekly/monthly/all-time evaluation and token statistics for administrators.
- Added audited temporary suspensions, permanent blocks, restoration, self-block protection, and server-side enforcement before AI usage.
- Reconciled all pre-v1 database fields through the single idempotent `0001_initial.sql` migration as required.

### 2026-08-13 — First-release production hardening

- Made the admin audit trail resistant to target-user cascades and enforced suspension payload consistency in the initial database schema.
- Added configurable IANA reporting time zones and used them for all admin calendar-period boundaries.
- Added cancellable timeouts for Workers AI, Google OAuth, Neon queries, browser API requests, and obsolete admin searches.
- Synchronized a server-side `USER_BLOCKED` response into client state and exposed success/failure counts, restriction expiry, reason, and report time zone in administration views.
- Added semantic selection groups, labelled writing input, accessible icon actions, dialog focus management/Escape handling, and more readable supporting text.
- Added regression coverage for admin authorization, self-block prevention, bounded suspension, blocked evaluation enforcement, reporting configuration, and initial-schema audit integrity.

Future changes must add a new dated entry instead of rewriting this history.
