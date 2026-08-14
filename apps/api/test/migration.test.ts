import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../migrations/0001_initial.sql", import.meta.url), "utf8");
const practiceMigration = readFileSync(new URL("../migrations/0002_practice_sessions.sql", import.meta.url), "utf8");
const practiceConstraintsMigration = readFileSync(new URL("../migrations/0003_practice_session_constraints.sql", import.meta.url), "utf8");

describe("initial schema audit integrity", () => {
  it("retains administration actions when a target user is deleted", () => {
    expect(migration).toMatch(/admin_user_actions_target_user_id_fkey[\s\S]*ON DELETE RESTRICT/u);
  });

  it("enforces suspension action payloads in the database", () => {
    expect(migration).toContain("admin_user_actions_payload_check");
    expect(migration).toContain("action = 'suspend_days' AND duration_days BETWEEN 1 AND 3650");
    expect(migration).toContain("action = 'block_permanent' AND duration_days IS NULL");
    expect(migration.match(/reason IS NOT NULL/gu)).toHaveLength(4);
    expect(migration).toContain("action = 'unblock' AND duration_days IS NULL");
  });
});

describe("practice session migration", () => {
  it("is isolated from the released initial migration and enforces session invariants", () => {
    expect(migration).not.toContain("practice_sessions");
    expect(practiceMigration).toContain("CREATE TABLE IF NOT EXISTS practice_sessions");
    expect(practiceConstraintsMigration).toContain("practice_sessions_context_check");
    expect(practiceConstraintsMigration).toContain("practice_sessions_timer_check");
    expect(practiceConstraintsMigration).toContain("practice_sessions_timestamps_check");
  });
});
