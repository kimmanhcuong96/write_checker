ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_context_check;
ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_context_check CHECK (
  (mode = 'TOPIC' AND category IS NOT NULL AND exam_type IS NULL AND exam_variant IS NULL) OR
  (mode = 'EXAM' AND category IS NULL AND exam_type = 'TOEIC' AND exam_variant IS NULL) OR
  (mode = 'EXAM' AND category IS NULL AND exam_type = 'IELTS' AND exam_variant IS NOT NULL)
);

ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_timer_check;
ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_timer_check CHECK (
  (mode = 'EXAM' AND time_limit_seconds = 3600) OR
  (mode = 'TOPIC' AND (time_limit_seconds IS NULL OR time_limit_seconds IN (300,600,900,1200,1800,2700,3600)))
);

ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_json_check;
ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_json_check CHECK (
  jsonb_typeof(tasks_json) = 'array' AND jsonb_array_length(tasks_json) > 0 AND jsonb_typeof(answers_json) = 'array'
);

ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_timestamps_check;
ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_timestamps_check CHECK (
  (status = 'READY' AND started_at IS NULL AND submitted_at IS NULL) OR
  (status IN ('IN_PROGRESS','TIME_EXPIRED') AND started_at IS NOT NULL AND submitted_at IS NULL) OR
  (status = 'SUBMITTED' AND started_at IS NOT NULL AND submitted_at IS NOT NULL)
);
