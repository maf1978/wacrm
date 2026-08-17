-- ============================================================
-- 044_ai_deepseek.sql — DeepSeek as an AI provider
--
-- DeepSeek exposes an OpenAI-compatible chat API, so the app's
-- OpenAI adapter shape works with a different base URL. This only
-- widens the provider CHECK on `ai_configs`; the code side lives in
-- src/lib/ai (types, providers/deepseek.ts, generate.ts, defaults)
-- and the Settings UI.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE ai_configs
  DROP CONSTRAINT IF EXISTS ai_configs_provider_check;

ALTER TABLE ai_configs
  ADD CONSTRAINT ai_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'deepseek'));
