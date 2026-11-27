/*
# Admin secret storage for AI key management

1. New Tables
- `app_secrets`: private key/value store for server-side secrets
  - `id` (uuid, primary key)
  - `name` (text, unique) — secret identifier, e.g. 'admin_api_secret'
  - `value` (text) — the secret value
  - `created_at`, `updated_at` (timestamps)
2. Security
- RLS enabled on `app_secrets`.
- NO policies for anon/authenticated: the table is invisible to all clients.
- No grants to anon/authenticated: only service_role (edge functions) can read it.
3. Notes
- The edge function `ai-keys-mgmt` reads the 'admin_api_secret' row via
  service_role and compares it with the caller's x-admin-secret header.
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON app_secrets FROM anon, authenticated;
