export const dynamic = "force-dynamic";

const SQL = `-- কথা অ্যাপের সব টেবিল
-- Neon / Supabase-এর SQL Editor-এ পুরোটা পেস্ট করে Run চাপুন

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  email varchar(160) NOT NULL,
  name varchar(80) NOT NULL,
  phone varchar(32) DEFAULT '' NOT NULL,
  about varchar(160) DEFAULT 'কথা অ্যাপে আছি!' NOT NULL,
  avatar text DEFAULT '' NOT NULL,
  color varchar(16) DEFAULT '#0ea5e9' NOT NULL,
  last_seen timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS app_settings (
  id serial PRIMARY KEY,
  key varchar(64) NOT NULL,
  value text DEFAULT '' NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_idx ON app_settings (key);

CREATE TABLE IF NOT EXISTS mail_logs (
  id serial PRIMARY KEY,
  email varchar(160) NOT NULL,
  provider varchar(24) DEFAULT '' NOT NULL,
  success varchar(8) DEFAULT 'no' NOT NULL,
  detail text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id serial PRIMARY KEY,
  email varchar(160) NOT NULL,
  code_hash varchar(128) NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  channel varchar(24) DEFAULT 'email' NOT NULL,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS otp_email_idx ON otp_codes (email, id);

CREATE TABLE IF NOT EXISTS invites (
  id serial PRIMARY KEY,
  inviter_id integer NOT NULL,
  email varchar(160) NOT NULL,
  channel varchar(24) DEFAULT 'link' NOT NULL,
  joined_user_id integer,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites (email);

CREATE TABLE IF NOT EXISTS contacts (
  id serial PRIMARY KEY,
  owner_id integer NOT NULL,
  contact_id integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_pair_idx ON contacts (owner_id, contact_id);

CREATE TABLE IF NOT EXISTS conversations (
  id serial PRIMARY KEY,
  user_a_id integer NOT NULL,
  user_b_id integer NOT NULL,
  last_message text DEFAULT '' NOT NULL,
  last_message_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_idx ON conversations (user_a_id, user_b_id);

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL,
  sender_id integer NOT NULL,
  kind varchar(16) DEFAULT 'text' NOT NULL,
  body text DEFAULT '' NOT NULL,
  media_url text DEFAULT '' NOT NULL,
  duration_sec integer DEFAULT 0 NOT NULL,
  seen_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, id);

CREATE TABLE IF NOT EXISTS calls (
  id serial PRIMARY KEY,
  caller_id integer NOT NULL,
  callee_id integer NOT NULL,
  conversation_id integer NOT NULL,
  status varchar(16) DEFAULT 'ringing' NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  answered_at timestamptz,
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS calls_callee_idx ON calls (callee_id, status);

CREATE TABLE IF NOT EXISTS call_signals (
  id serial PRIMARY KEY,
  call_id integer NOT NULL,
  sender_id integer NOT NULL,
  kind varchar(16) NOT NULL,
  payload text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS call_signals_call_idx ON call_signals (call_id, id);
`;

export async function GET() {
  return new Response(SQL, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
