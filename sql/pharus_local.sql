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
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  focus_order INTEGER NULL,
  type TEXT NOT NULL DEFAULT 'task',
  column_id UUID NULL REFERENCES columns(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS tasks
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS tasks
  ADD COLUMN IF NOT EXISTS focus_order INTEGER NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS acronym TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS cnpj TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS municipal_registration TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS state_registration TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS address_street TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS address_number TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS address_complement TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS address_district TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS address_city TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS address_state TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS address_zip_code TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS remote_tool TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS remote_access_id TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS remote_password TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS remote_notes TEXT NULL;

ALTER TABLE IF EXISTS clients
  ADD COLUMN IF NOT EXISTS remote_connections JSONB NULL;

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  acronym TEXT NULL,
  contact_name TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  cnpj TEXT NULL,
  municipal_registration TEXT NULL,
  state_registration TEXT NULL,
  address_street TEXT NULL,
  address_number TEXT NULL,
  address_complement TEXT NULL,
  address_district TEXT NULL,
  address_city TEXT NULL,
  address_state TEXT NULL,
  address_zip_code TEXT NULL,
  remote_tool TEXT NULL,
  remote_access_id TEXT NULL,
  remote_password TEXT NULL,
  remote_notes TEXT NULL,
  remote_connections JSONB NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachment_name TEXT NULL,
  attachment_path TEXT NULL,
  attachment_type TEXT NULL,
  attachment_size BIGINT NULL,
  edited_at TIMESTAMPTZ NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission_group_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  screen_key TEXT NOT NULL,
  option_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_permission_group_rule UNIQUE (group_id, screen_key, option_key)
);

CREATE TABLE IF NOT EXISTS agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NULL,
  event_type TEXT NOT NULL DEFAULT 'event',
  status TEXT NOT NULL DEFAULT 'pending',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notice_board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  visible_until DATE NULL,
  permission_group_id UUID NULL REFERENCES permission_groups(id) ON DELETE SET NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NULL,
  owner_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'private',
  definition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_report_group_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES task_report_definitions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  created_by UUID NULL REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_task_report_group_share UNIQUE (report_id, group_id)
);

ALTER TABLE IF EXISTS notice_board_posts
  ADD COLUMN IF NOT EXISTS permission_group_id UUID NULL REFERENCES permission_groups(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS app_users
  ADD COLUMN IF NOT EXISTS permission_group_id UUID NULL REFERENCES permission_groups(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS chat_messages
  ADD COLUMN IF NOT EXISTS attachment_name TEXT NULL;

ALTER TABLE IF EXISTS chat_messages
  ADD COLUMN IF NOT EXISTS attachment_path TEXT NULL;

ALTER TABLE IF EXISTS chat_messages
  ADD COLUMN IF NOT EXISTS attachment_type TEXT NULL;

ALTER TABLE IF EXISTS chat_messages
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT NULL;

ALTER TABLE IF EXISTS chat_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ NULL;

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

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
    CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_permission_groups_updated_at') THEN
    CREATE TRIGGER trg_permission_groups_updated_at
    BEFORE UPDATE ON permission_groups
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agenda_events_updated_at') THEN
    CREATE TRIGGER trg_agenda_events_updated_at
    BEFORE UPDATE ON agenda_events
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notice_board_posts_updated_at') THEN
    CREATE TRIGGER trg_notice_board_posts_updated_at
    BEFORE UPDATE ON notice_board_posts
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_task_report_definitions_updated_at') THEN
    CREATE TRIGGER trg_task_report_definitions_updated_at
    BEFORE UPDATE ON task_report_definitions
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

INSERT INTO permission_groups (name, description, status)
SELECT 'Administradores', 'Acesso total ao sistema', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM permission_groups WHERE name = 'Administradores'
);

INSERT INTO permission_groups (name, description, status)
SELECT 'Operacao', 'Uso diario com manutencao de tarefas e clientes', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM permission_groups WHERE name = 'Operacao'
);

INSERT INTO permission_groups (name, description, status)
SELECT 'Leitura', 'Consulta sem alteracoes', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM permission_groups WHERE name = 'Leitura'
);
