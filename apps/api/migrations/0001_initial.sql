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
  estimated_level text CHECK (estimated_level IN ('A1','A2','B1','B2','C1','C2')),
  result_json jsonb,
  status text NOT NULL CHECK (status IN ('processing','completed','failed')),
  provider text NOT NULL,
  model text NOT NULL,
  error_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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
