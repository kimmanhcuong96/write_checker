import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { WritingEvaluationResultSchema, type CefrLevel, type EvaluationMode, type FeedbackLocale, type WritingEvaluationResult } from "../../../domain/cefr/evaluation";
import type { AuthenticatedUser, ExternalIdentity } from "../../../domain/users/user";
import type { AdminDashboard, LlmUsage, UsageBreakdown, UsageSummary } from "../../../domain/usage/usage";
import type {
  EvaluationRecord,
  EvaluationRepository,
  SessionRepository,
  UserRepository
} from "../../../application/ports/repositories";

type Queryable = ReturnType<typeof neon>;
const DATABASE_TIMEOUT_MS = 15_000;

const UserRowSchema = z.object({
  id: z.string(), email: z.string().nullable(), display_name: z.string().nullable(), avatar_url: z.string().nullable(),
  blocked_until: z.string().nullable(), permanently_blocked: z.boolean()
});
const EvaluationRowSchema = z.object({ id: z.string(), user_id: z.string(), request_id: z.string(), status: z.enum(["processing", "completed", "failed"]), result_json: z.unknown(), created: z.boolean().optional() });
type UserRow = z.infer<typeof UserRowSchema>;
type EvaluationRow = z.infer<typeof EvaluationRowSchema>;

const mapUser = (row: UserRow): AuthenticatedUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  blockedUntil: row.blocked_until,
  permanentlyBlocked: row.permanently_blocked
});

const mapEvaluation = (row: EvaluationRow): EvaluationRecord => ({
  id: row.id,
  userId: row.user_id,
  requestId: row.request_id,
  status: row.status,
  result: row.result_json === null ? null : WritingEvaluationResultSchema.parse(row.result_json)
});

export class NeonRepositories implements UserRepository, SessionRepository, EvaluationRepository {
  private readonly sql: Queryable;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  private execute(query: string, params: unknown[]) {
    return this.sql.query(query, params, { fetchOptions: { signal: AbortSignal.timeout(DATABASE_TIMEOUT_MS) } });
  }

  private async query<T>(schema: z.ZodType<T>, query: string, params: unknown[]): Promise<T[]> {
    const raw: unknown = await this.execute(query, params);
    return z.array(schema).parse(raw);
  }

  async upsertExternalIdentity(identity: ExternalIdentity): Promise<AuthenticatedUser> {
    const rows = await this.query(
      UserRowSchema,
      `INSERT INTO users (google_sub, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_sub) DO UPDATE SET
         email = EXCLUDED.email, display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url, updated_at = now()
       RETURNING id, email, display_name, avatar_url, blocked_until::text, permanently_blocked`,
      [identity.subject, identity.email, identity.displayName, identity.avatarUrl]
    );
    const user = rows[0];
    if (!user) throw new Error("User upsert returned no row");
    return mapUser(user);
  }

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.execute("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
      userId,
      tokenHash,
      expiresAt.toISOString()
    ]);
  }

  async findUserByTokenHash(tokenHash: string): Promise<AuthenticatedUser | null> {
    const rows = await this.query(
      UserRowSchema,
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.blocked_until::text, u.permanently_blocked
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash]
    );
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.execute("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }

  async claim(input: {
    requestId: string;
    userId: string;
    text: string;
    wordCount: number;
    mode: EvaluationMode;
    targetLevel: CefrLevel | null;
    feedbackLanguage: FeedbackLocale;
    provider: string;
    model: string;
  }): Promise<{ record: EvaluationRecord; created: boolean } | null> {
    const rows = await this.query(
      EvaluationRowSchema,
      `WITH inserted AS (
         INSERT INTO writing_evaluations
           (request_id, user_id, original_text, word_count, evaluation_mode, target_level, feedback_language, status, provider, model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', $8, $9)
         ON CONFLICT (request_id) DO NOTHING
         RETURNING id, user_id, request_id, status, result_json, true AS created
       )
       SELECT * FROM inserted
       UNION ALL
       SELECT id, user_id, request_id, status, result_json, false AS created
       FROM writing_evaluations
       WHERE request_id = $1 AND user_id = $2 AND NOT EXISTS (SELECT 1 FROM inserted)
       LIMIT 1`,
      [input.requestId, input.userId, input.text, input.wordCount, input.mode, input.targetLevel, input.feedbackLanguage, input.provider, input.model]
    );
    const row = rows[0];
    return row ? { record: mapEvaluation(row), created: row.created === true } : null;
  }

  async findById(id: string, userId: string): Promise<EvaluationRecord | null> {
    const rows = await this.query(
      EvaluationRowSchema,
      "SELECT id, user_id, request_id, status, result_json FROM writing_evaluations WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return rows[0] ? mapEvaluation(rows[0]) : null;
  }

  async complete(id: string, result: WritingEvaluationResult, usage: LlmUsage): Promise<void> {
    await this.execute(
      `WITH updated AS (
         UPDATE writing_evaluations SET status = 'completed', estimated_level = $2,
           result_json = $3::jsonb, error_type = NULL, updated_at = now()
         WHERE id = $1 AND status = 'processing'
         RETURNING id, user_id, provider, model
       )
       INSERT INTO llm_usage
         (provider, model, user_id, evaluation_id, input_tokens, output_tokens, total_tokens,
          provider_usage_value, provider_usage_unit, success)
       SELECT provider, model, user_id, id, $4, $5, $6, $7, $8, true FROM updated`,
      [
        id,
        result.level,
        JSON.stringify(result),
        usage.inputTokens,
        usage.outputTokens,
        usage.totalTokens,
        usage.providerUsageValue,
        usage.providerUsageUnit
      ]
    );
  }

  async fail(id: string, usage: LlmUsage, errorType: string): Promise<void> {
    await this.execute(
      `WITH updated AS (
         UPDATE writing_evaluations SET status = 'failed', error_type = $2, updated_at = now()
         WHERE id = $1 AND status = 'processing'
         RETURNING id, user_id, provider, model
       )
       INSERT INTO llm_usage
         (provider, model, user_id, evaluation_id, input_tokens, output_tokens, total_tokens,
          provider_usage_value, provider_usage_unit, success, error_type)
       SELECT provider, model, user_id, id, $3, $4, $5, $6, $7, false, $2 FROM updated`,
      [
        id,
        errorType,
        usage.inputTokens,
        usage.outputTokens,
        usage.totalTokens,
        usage.providerUsageValue,
        usage.providerUsageUnit
      ]
    );
  }

  async consumedTokens(): Promise<number> {
    const rows = await this.query(
      z.object({ total: z.string() }),
      "SELECT COALESCE(SUM(total_tokens), 0)::text AS total FROM llm_usage WHERE success = true",
      []
    );
    return Number(rows[0]?.total ?? 0);
  }

  async countEvaluationsSince(userId: string, since: Date): Promise<number> {
    const rows = await this.query(z.object({ count: z.string() }),
      "SELECT COUNT(*)::text AS count FROM writing_evaluations WHERE user_id = $1 AND created_at >= $2",
      [userId, since.toISOString()]);
    return Number(rows[0]?.count ?? 0);
  }

  async usageDashboard(timeZone: string): Promise<{ summaries: UsageSummary[]; breakdown: UsageBreakdown[] }> {
    const summaryRows = await this.query(
      z.object({
        period: z.enum(["today", "week", "month", "year"]), requests: z.string(), successful_requests: z.string(),
        failed_requests: z.string(), input_tokens: z.string().nullable(), output_tokens: z.string().nullable(),
        total_tokens: z.string().nullable()
      }),
      `WITH periods(period, since) AS (
         VALUES
           ('today', date_trunc('day', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text),
           ('week', date_trunc('week', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text),
           ('month', date_trunc('month', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text),
           ('year', date_trunc('year', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text)
       )
       SELECT p.period, COUNT(u.id)::text AS requests,
         COUNT(u.id) FILTER (WHERE u.success)::text AS successful_requests,
         COUNT(u.id) FILTER (WHERE NOT u.success)::text AS failed_requests,
         SUM(u.input_tokens)::text AS input_tokens, SUM(u.output_tokens)::text AS output_tokens,
         SUM(u.total_tokens)::text AS total_tokens
       FROM periods p LEFT JOIN llm_usage u ON u.timestamp >= p.since
       GROUP BY p.period
       ORDER BY CASE p.period WHEN 'today' THEN 1 WHEN 'week' THEN 2 WHEN 'month' THEN 3 ELSE 4 END`,
      [timeZone]
    );
    const providerUsageRows = await this.query(
      z.object({ period: z.enum(["today", "week", "month", "year"]), unit: z.string(), value: z.string() }),
      `WITH periods(period, since) AS (
         VALUES
           ('today', date_trunc('day', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text),
           ('week', date_trunc('week', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text),
           ('month', date_trunc('month', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text),
           ('year', date_trunc('year', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text)
       )
       SELECT p.period, u.provider_usage_unit AS unit, SUM(u.provider_usage_value)::text AS value
       FROM periods p JOIN llm_usage u ON u.timestamp >= p.since
       WHERE u.provider_usage_value IS NOT NULL AND u.provider_usage_unit IS NOT NULL
       GROUP BY p.period, u.provider_usage_unit`,
      [timeZone]
    );
    const breakdownRows = await this.query(
      z.object({ provider: z.string(), model: z.string(), requests: z.string(), total_tokens: z.string().nullable(), provider_usage_value: z.string().nullable(), provider_usage_unit: z.string().nullable() }),
      `SELECT provider, model, COUNT(*)::text AS requests, SUM(total_tokens)::text AS total_tokens,
         SUM(provider_usage_value)::text AS provider_usage_value, provider_usage_unit
       FROM llm_usage
       WHERE timestamp >= date_trunc('year', now() AT TIME ZONE $1::text) AT TIME ZONE $1::text
       GROUP BY provider, model, provider_usage_unit ORDER BY requests DESC`,
      [timeZone]
    );
    const nullableNumber = (value: string | null) => (value === null ? null : Number(value));
    return {
      summaries: summaryRows.map((row) => ({
        period: row.period,
        requests: Number(row.requests),
        successfulRequests: Number(row.successful_requests),
        failedRequests: Number(row.failed_requests),
        inputTokens: nullableNumber(row.input_tokens),
        outputTokens: nullableNumber(row.output_tokens),
        totalTokens: nullableNumber(row.total_tokens),
        providerUsage: providerUsageRows.filter((usage) => usage.period === row.period).map((usage) => ({ unit: usage.unit, value: Number(usage.value) }))
      })),
      breakdown: breakdownRows.map((row) => ({
        provider: row.provider,
        model: row.model,
        requests: Number(row.requests),
        totalTokens: nullableNumber(row.total_tokens),
        providerUsageValue: nullableNumber(row.provider_usage_value),
        providerUsageUnit: row.provider_usage_unit
      }))
    };
  }

  async adminDashboard(input: { page: number; pageSize: number; search: string; timeZone: string }): Promise<AdminDashboard> {
    const offset = (input.page - 1) * input.pageSize;
    const totalPromise = this.query(
      z.object({ count: z.string() }),
      `SELECT COUNT(*)::text AS count FROM users
       WHERE $1 = '' OR display_name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%'`,
      [input.search]
    );
    const usersPromise = this.query(
      z.object({
        id: z.string(), email: z.string().nullable(), display_name: z.string().nullable(), avatar_url: z.string().nullable(),
        created_at: z.string(), last_evaluation_at: z.string().nullable(), evaluations_today: z.string(),
        evaluations_week: z.string(), evaluations_month: z.string(), evaluations_total: z.string(),
        successful_evaluations: z.string(), failed_evaluations: z.string(), total_tokens: z.string(),
        blocked_until: z.string().nullable(), permanently_blocked: z.boolean(), block_reason: z.string().nullable()
      }),
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at::text AS created_at,
         e.last_evaluation_at::text AS last_evaluation_at, COALESCE(e.today, 0)::text AS evaluations_today,
         COALESCE(e.week, 0)::text AS evaluations_week, COALESCE(e.month, 0)::text AS evaluations_month,
         COALESCE(e.total, 0)::text AS evaluations_total,
         COALESCE(l.successful, 0)::text AS successful_evaluations,
         COALESCE(l.failed, 0)::text AS failed_evaluations,
         COALESCE(l.total_tokens, 0)::text AS total_tokens,
         u.blocked_until::text AS blocked_until, u.permanently_blocked, u.block_reason
       FROM users u
       LEFT JOIN LATERAL (
         SELECT MAX(w.created_at) AS last_evaluation_at,
           COUNT(*) FILTER (WHERE w.created_at >= date_trunc('day', now() AT TIME ZONE $4::text) AT TIME ZONE $4::text) AS today,
           COUNT(*) FILTER (WHERE w.created_at >= date_trunc('week', now() AT TIME ZONE $4::text) AT TIME ZONE $4::text) AS week,
           COUNT(*) FILTER (WHERE w.created_at >= date_trunc('month', now() AT TIME ZONE $4::text) AT TIME ZONE $4::text) AS month,
           COUNT(*) AS total
         FROM writing_evaluations w WHERE w.user_id = u.id
       ) e ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (WHERE x.success) AS successful,
           COUNT(*) FILTER (WHERE NOT x.success) AS failed,
           COALESCE(SUM(x.total_tokens), 0) AS total_tokens
         FROM llm_usage x WHERE x.user_id = u.id
       ) l ON true
       WHERE $1 = '' OR u.display_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
       ORDER BY COALESCE(e.last_evaluation_at, u.created_at) DESC
       LIMIT $2 OFFSET $3`,
      [input.search, input.pageSize, offset, input.timeZone]
    );
    const [usage, totalRows, rows] = await Promise.all([this.usageDashboard(input.timeZone), totalPromise, usersPromise]);
    return {
      ...usage,
      reportTimeZone: input.timeZone,
      users: rows.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
        lastEvaluationAt: row.last_evaluation_at,
        evaluations: {
          today: Number(row.evaluations_today), week: Number(row.evaluations_week),
          month: Number(row.evaluations_month), total: Number(row.evaluations_total)
        },
        successfulEvaluations: Number(row.successful_evaluations),
        failedEvaluations: Number(row.failed_evaluations),
        totalTokens: Number(row.total_tokens),
        blockedUntil: row.blocked_until,
        permanentlyBlocked: row.permanently_blocked,
        blockReason: row.block_reason
      })),
      userPage: { page: input.page, pageSize: input.pageSize, total: Number(totalRows[0]?.count ?? 0) }
    };
  }

  async setUserSuspension(input: {
    actorUserId: string;
    targetUserId: string;
    kind: "none" | "days" | "permanent";
    days: number | null;
    reason: string | null;
  }): Promise<boolean> {
    const action = input.kind === "none" ? "unblock" : input.kind === "permanent" ? "block_permanent" : "suspend_days";
    const rows = await this.query(
      z.object({ id: z.string() }),
      `WITH updated AS (
         UPDATE users SET
           permanently_blocked = ($3 = 'permanent'),
           blocked_until = CASE WHEN $3 = 'days' THEN now() + make_interval(days => $4::integer) ELSE NULL END,
           block_reason = CASE WHEN $3 = 'none' THEN NULL ELSE $5 END,
           updated_at = now()
         WHERE id = $2
         RETURNING id
       ), recorded AS (
         INSERT INTO admin_user_actions (actor_user_id, target_user_id, action, duration_days, reason)
         SELECT $1, id, $6, $4, $5 FROM updated
         RETURNING id
       ) SELECT id FROM recorded`,
      [input.actorUserId, input.targetUserId, input.kind, input.days, input.reason, action]
    );
    return Boolean(rows[0]);
  }
}
