-- ============================================================
-- 047_report_support.sql — Nightly report prerequisites
--
--   1. `ai_usage_log.provider` only allowed 'openai'/'anthropic',
--      so DeepSeek token spend was rejected by the CHECK (the log
--      insert fails silently). The nightly report needs real AI
--      usage, so widen the constraint.
--   2. `notifications.type` only allowed 'conversation_assigned'.
--      The nightly report is delivered as an in-app notification,
--      so add the 'report' type.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_provider_check;
ALTER TABLE ai_usage_log
  ADD CONSTRAINT ai_usage_log_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'deepseek'));

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('conversation_assigned', 'report'));
