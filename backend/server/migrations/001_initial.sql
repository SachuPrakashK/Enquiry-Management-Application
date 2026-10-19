CREATE TABLE IF NOT EXISTS statuses (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  color text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS statuses_name_unique ON statuses (lower(name));

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique ON categories (lower(name));

CREATE TABLE IF NOT EXISTS admin_users (
  id text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('Super Admin', 'Admin')),
  is_active boolean NOT NULL DEFAULT true,
  profile_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique ON admin_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_unique ON admin_users (lower(username));

CREATE TABLE IF NOT EXISTS enquiries (
  id text PRIMARY KEY,
  reference_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company_name text NOT NULL DEFAULT '',
  category_id text NOT NULL REFERENCES categories(id),
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status_id text NOT NULL REFERENCES statuses(id),
  preferred_contact_method text NOT NULL,
  source text NOT NULL,
  next_follow_up_date date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enquiries_status_idx ON enquiries(status_id);
CREATE INDEX IF NOT EXISTS enquiries_category_idx ON enquiries(category_id);
CREATE INDEX IF NOT EXISTS enquiries_follow_up_idx ON enquiries(next_follow_up_date);

CREATE TABLE IF NOT EXISTS follow_ups (
  id text PRIMARY KEY,
  enquiry_id text NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  follow_up_date date NOT NULL,
  follow_up_type text NOT NULL,
  notes text NOT NULL,
  outcome text NOT NULL,
  next_follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS follow_ups_enquiry_idx ON follow_ups(enquiry_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
