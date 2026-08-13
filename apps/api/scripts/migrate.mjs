import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(root, "..", "migrations");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");

const sql = neon(databaseUrl);
await sql.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`);

const migrations = (await readdir(migrationsDir)).filter((file) => /^\d+_.+\.sql$/u.test(file)).sort();
for (const file of migrations) {
  const version = basename(file, ".sql");
  const applied = await sql.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
  const migration = await readFile(join(migrationsDir, file), "utf8");
  if (applied.length > 0) {
    if (version === "0001_initial") {
      await sql.transaction((transaction) => [transaction.query(migration)]);
      console.log(`Reconciled ${version}`);
    }
    continue;
  }
  await sql.transaction((transaction) => [
    transaction.query(migration),
    transaction.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version])
  ]);
  console.log(`Applied ${version}`);
}
