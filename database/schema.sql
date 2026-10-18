CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id),
    google_form_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    stopped_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher_status
    ON attendance_sessions (teacher_id, status);

-- Faculty self sign-up and per-teacher dashboards.
-- Everything below is additive and idempotent: re-running this whole file upgrades an existing database.
ALTER TABLE teachers
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin'));

-- The '' defaults only backfill sessions created before these columns existed; POST /attendance/start always sets them.
ALTER TABLE attendance_sessions
    ADD COLUMN IF NOT EXISTS course_code VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS course_title VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS class_group VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS check_ins INTEGER NOT NULL DEFAULT 0;

-- Dashboard and session history: one teacher's sessions, newest first.
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher_created
    ON attendance_sessions (teacher_id, created_at DESC);
