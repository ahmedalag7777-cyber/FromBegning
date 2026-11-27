/*
# AI Provider Keys Storage

Stores API keys for AI providers in a secure table.
RLS is enabled but NO policies are created for anon/authenticated —
only the service_role (used by Edge Functions) can read this table.
The frontend cannot access these keys.

## New Table
- ai_provider_keys: provider name, key value, is_active, created_at
*/

CREATE TABLE IF NOT EXISTS ai_provider_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  key_value text NOT NULL,
  label text,
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_provider_keys ENABLE ROW LEVEL SECURITY;

-- No policies for anon or authenticated — keys are server-side only.
-- Service role bypasses RLS and can read/write.

-- Grant only to service_role (Edge Functions)
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_provider_keys TO service_role;
