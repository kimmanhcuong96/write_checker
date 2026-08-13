import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { WritingEvaluationResultSchema, type WritingEvaluationResult } from "../../../domain/cefr/evaluation";
import type { AuthenticatedUser, ExternalIdentity } from "../../../domain/users/user";
import type { LlmUsage, UsageBreakdown, UsageSummary } from "../../../domain/usage/usage";
import type {
  EvaluationRecord,
  EvaluationRepository,
  SessionRepository,
  UserRepository
} from "../../../application/ports/repositories";

type Queryable = ReturnType<typeof neon>;

const UserRowSchema = z.object({ id: z.string(), email: z.string().nullable(), display_name: z.string().nullable(), avatar_url: z.string().nullable() });
const EvaluationRowSchema = z.object({ id: z.string(), user_id: z.string(), request_id: z.string(), status: z.enum(["processing", "completed", "failed"]), result_json: z.unknown(), created: z.boolean().optional() });
type UserRow = z.infer<typeof UserRowSchema>;
type EvaluationRow = z.infer<typeof EvaluationRowSchema>;

const mapUser = (row: UserRow): AuthenticatedUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  avatarUrl: row.avatar_url
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

  private async query<T>(schema: z.ZodType<T>, query: string, params: unknown[]): Promise<T[]> {
    const raw: unknown = await this.sql.query(query, params);
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
       RETURNING id, email, display_name, avatar_url`,
      [identity.subject, identity.email, identity.displayName, identity.avatarUrl]
    );
    const user = rows[0];
    if (!user) throw new Error("User upsert returned no row");
    return mapUser(user);
  }

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.sql.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
      userId,
      tokenHash,
      expiresAt.toISOString()
    ]);
  }

  async findUserByTokenHash(tokenHash: string): Promise<AuthenticatedUser | null> {
    const rows = await this.query(
      UserRowSchema,
      `SELECT u.id, u.email, u.display_name, u.avatar_url
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash]
    );
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.sql.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }

  async claim(input: {
    requestId: string;
    userId: string;
    text: string;
    wordCount: number;
    provider: string;
    model: string;
  }): Promise<{ record: EvaluationRecord; created: boolean } | null> {
    const rows = await this.query(
      EvaluationRowSchema,
      `WITH inserted AS (
         INSERT INTO writing_evaluations
           (request_id, user_id, original_text, word_count, status, provider, model)
         VALUES ($1, $2, $3, $4, 'processing', $5, $6)
         ON CONFLICT (request_id) DO NOTHING
         RETURNING id, user_id, request_id, status, result_json, true AS created
       )
       SELECT * FROM inserted
       UNION ALL
       SELECT id, user_id, request_id, status, result_json, false AS created
       FROM writing_evaluations
       WHERE request_id = $1 AND user_id = $2 AND NOT EXISTS (SELECT 1 FROM inserted)
       LIMIT 1`,
      [input.requestId, input.userId, input.text, input.wordCount, input.provider, input.model]
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
    await this.sql.query(
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
    await this.sql.query(
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

  async usageDashboard(): Promise<{ summaries: UsageSummary[]; breakdown: UsageBreakdown[] }> {
    const summaryRows = await this.query(
      z.object({
        period: z.enum(["today", "week", "month", "year"]), requests: z.string(), successful_requests: z.string(),
        failed_requests: z.string(), input_tokens: z.string().nullable(), output_tokens: z.string().nullable(),
        total_tokens: z.string().nullable()
      }),
      `WITH periods(period, since) AS (
         VALUES ('today', date_trunc('day', now())), ('week', date_trunc('week', now())),
                ('month', date_trunc('month', now())), ('year', date_trunc('year', now()))
       )
       SELECT p.period, COUNT(u.id)::text AS requests,
         COUNT(u.id) FILTER (WHERE u.success)::text AS successful_requests,
         COUNT(u.id) FILTER (WHERE NOT u.success)::text AS failed_requests,
         SUM(u.input_tokens)::text AS input_tokens, SUM(u.output_tokens)::text AS output_tokens,
         SUM(u.total_tokens)::text AS total_tokens
       FROM periods p LEFT JOIN llm_usage u ON u.timestamp >= p.since
       GROUP BY p.period
       ORDER BY CASE p.period WHEN 'today' THEN 1 WHEN 'week' THEN 2 WHEN 'month' THEN 3 ELSE 4 END`,
      []
    );
    const providerUsageRows = await this.query(
      z.object({ period: z.enum(["today", "week", "month", "year"]), unit: z.string(), value: z.string() }),
      `WITH periods(period, since) AS (
         VALUES ('today', date_trunc('day', now())), ('week', date_trunc('week', now())),
                ('month', date_trunc('month', now())), ('year', date_trunc('year', now()))
       )
       SELECT p.period, u.provider_usage_unit AS unit, SUM(u.provider_usage_value)::text AS value
       FROM periods p JOIN llm_usage u ON u.timestamp >= p.since
       WHERE u.provider_usage_value IS NOT NULL AND u.provider_usage_unit IS NOT NULL
       GROUP BY p.period, u.provider_usage_unit`,
      []
    );
    const breakdownRows = await this.query(
      z.object({ provider: z.string(), model: z.string(), requests: z.string(), total_tokens: z.string().nullable(), provider_usage_value: z.string().nullable(), provider_usage_unit: z.string().nullable() }),
      `SELECT provider, model, COUNT(*)::text AS requests, SUM(total_tokens)::text AS total_tokens,
         SUM(provider_usage_value)::text AS provider_usage_value, provider_usage_unit
       FROM llm_usage WHERE timestamp >= date_trunc('year', now())
       GROUP BY provider, model, provider_usage_unit ORDER BY requests DESC`,
      []
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
}
