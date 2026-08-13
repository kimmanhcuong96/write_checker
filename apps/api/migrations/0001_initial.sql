CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text NOT NULL UNIQUE,
  email text,
  display_name text,
  avatar_url text,
  blocked_until timestamptz,
  permanently_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS writing_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE,
  original_text text NOT NULL,
  word_count integer NOT NULL CHECK (word_count > 0),
  evaluation_mode text NOT NULL DEFAULT 'estimate' CHECK (evaluation_mode IN ('estimate','targeted')),
  target_level text CHECK (target_level IN ('A1','A2','B1','B2','C1','C2')),
  feedback_language text NOT NULL DEFAULT 'en' CHECK (feedback_language IN ('en','vi','zh','ja')),
  estimated_level text CHECK (estimated_level IN ('A1','A2','B1','B2','C1','C2')),
  result_json jsonb,
  status text NOT NULL CHECK (status IN ('processing','completed','failed')),
  provider text NOT NULL,
  model text NOT NULL,
  error_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT writing_evaluations_target_mode_check CHECK (
    (evaluation_mode = 'estimate' AND target_level IS NULL) OR
    (evaluation_mode = 'targeted' AND target_level IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS writing_evaluations_user_created_idx ON writing_evaluations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS llm_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluation_id uuid NOT NULL REFERENCES writing_evaluations(id) ON DELETE CASCADE,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  provider_usage_value numeric,
  provider_usage_unit text,
  success boolean NOT NULL,
  error_type text
);
CREATE INDEX IF NOT EXISTS llm_usage_timestamp_idx ON llm_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS llm_usage_provider_model_idx ON llm_usage(provider, model, timestamp DESC);
CREATE INDEX IF NOT EXISTS llm_usage_user_timestamp_idx ON llm_usage(user_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS admin_user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('suspend_days','block_permanent','unblock')),
  duration_days integer CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 3650),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_user_actions_payload_check CHECK (
    (action = 'suspend_days' AND duration_days BETWEEN 1 AND 3650 AND reason IS NOT NULL AND length(btrim(reason)) > 0) OR
    (action = 'block_permanent' AND duration_days IS NULL AND reason IS NOT NULL AND length(btrim(reason)) > 0) OR
    (action = 'unblock' AND duration_days IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS admin_user_actions_target_created_idx ON admin_user_actions(target_user_id, created_at DESC);

-- Reconcile databases that were initialized by an earlier pre-release version.
-- This keeps the pre-v1 project on one idempotent initial schema as requested.
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_until timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permanently_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason text;
ALTER TABLE writing_evaluations ADD COLUMN IF NOT EXISTS evaluation_mode text NOT NULL DEFAULT 'estimate';
ALTER TABLE writing_evaluations ADD COLUMN IF NOT EXISTS target_level text;
ALTER TABLE writing_evaluations ADD COLUMN IF NOT EXISTS feedback_language text NOT NULL DEFAULT 'en';

DO $$ BEGIN
  ALTER TABLE writing_evaluations ADD CONSTRAINT writing_evaluations_mode_check
    CHECK (evaluation_mode IN ('estimate','targeted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Preserve the audit trail even if user deletion is introduced later, and
-- enforce the action payload independently of the application layer.
ALTER TABLE admin_user_actions DROP CONSTRAINT IF EXISTS admin_user_actions_target_user_id_fkey;
ALTER TABLE admin_user_actions ADD CONSTRAINT admin_user_actions_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE admin_user_actions DROP CONSTRAINT IF EXISTS admin_user_actions_payload_check;
ALTER TABLE admin_user_actions ADD CONSTRAINT admin_user_actions_payload_check CHECK (
  (action = 'suspend_days' AND duration_days BETWEEN 1 AND 3650 AND reason IS NOT NULL AND length(btrim(reason)) > 0) OR
  (action = 'block_permanent' AND duration_days IS NULL AND reason IS NOT NULL AND length(btrim(reason)) > 0) OR
  (action = 'unblock' AND duration_days IS NULL)
);
DO $$ BEGIN
  ALTER TABLE writing_evaluations ADD CONSTRAINT writing_evaluations_target_level_check
    CHECK (target_level IS NULL OR target_level IN ('A1','A2','B1','B2','C1','C2'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE writing_evaluations ADD CONSTRAINT writing_evaluations_feedback_language_check
    CHECK (feedback_language IN ('en','vi','zh','ja'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE writing_evaluations ADD CONSTRAINT writing_evaluations_target_mode_check
    CHECK ((evaluation_mode = 'estimate' AND target_level IS NULL) OR (evaluation_mode = 'targeted' AND target_level IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
