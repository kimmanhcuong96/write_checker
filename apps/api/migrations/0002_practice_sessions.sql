CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('TOPIC','EXAM')),
  category text CHECK (category IN ('GENERAL','IELTS')),
  exam_type text CHECK (exam_type IN ('IELTS','TOEIC')),
  exam_variant text CHECK (exam_variant IN ('IELTS_ACADEMIC','IELTS_GENERAL')),
  status text NOT NULL CHECK (status IN ('READY','IN_PROGRESS','TIME_EXPIRED','SUBMITTED')),
  started_at timestamptz,
  submitted_at timestamptz,
  time_limit_seconds integer CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  elapsed_seconds integer NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0),
  tasks_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_sessions_user_created_idx
  ON practice_sessions(user_id, created_at DESC);
