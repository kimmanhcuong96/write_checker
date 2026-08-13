import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../migrations/0001_initial.sql", import.meta.url), "utf8");

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
