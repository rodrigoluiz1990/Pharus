-- PostgreSQL local schema for Pharus
-- Execute with:
--   psql -U postgres -d pharus -f sql/pharus_local.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  last_sign_in_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee UUID NULL REFERENCES app_users(id) ON DELETE SET NULL,
  request_date DATE NULL,
  due_date DATE NULL,
  observation TEXT NULL,
  jira TEXT NULL,
  client TEXT NULL,
  type TEXT NOT NULL DEFAULT 'task',
  column_id UUID NULL REFERENCES columns(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW user_profiles AS
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS full_name,
  u.role,
  u.status,
  u.last_sign_in_at,
  u.created_at,
  u.updated_at
FROM app_users u;

-- Trigger function to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_users_updated_at') THEN
    CREATE TRIGGER trg_app_users_updated_at
    BEFORE UPDATE ON app_users
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_columns_updated_at') THEN
    CREATE TRIGGER trg_columns_updated_at
    BEFORE UPDATE ON columns
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tasks_updated_at') THEN
    CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  END IF;
END;
$$;

-- Seed default columns if missing
INSERT INTO columns (title, type, position)
SELECT 'Pendente', 'pending', 0
WHERE NOT EXISTS (SELECT 1 FROM columns WHERE type = 'pending');

INSERT INTO columns (title, type, position)
SELECT 'Em Andamento', 'in_progress', 1
WHERE NOT EXISTS (SELECT 1 FROM columns WHERE type = 'in_progress');

INSERT INTO columns (title, type, position)
SELECT 'Em Teste', 'review', 2
WHERE NOT EXISTS (SELECT 1 FROM columns WHERE type = 'review');

INSERT INTO columns (title, type, position)
SELECT 'Concluído', 'completed', 3
WHERE NOT EXISTS (SELECT 1 FROM columns WHERE type = 'completed');

-- Seed admin user for first login
INSERT INTO app_users (email, password, raw_user_meta_data, role, status, last_sign_in_at)
SELECT
  'admin@pharus.local',
  'admin123',
  '{"full_name":"Administrador Local"}'::jsonb,
  'admin',
  'active',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM app_users WHERE email = 'admin@pharus.local'
);
