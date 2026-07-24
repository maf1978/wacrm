# Zernio social integration

WACRM uses one Zernio profile per WACRM account. Zernio handles platform
OAuth and publishing; WACRM remains the tenant, permissions, content, and
audit source of truth.

## Setup

1. Apply `supabase/migrations/038_zernio_social.sql`.
2. Set `ZERNIO_API_KEY` and `ZERNIO_WEBHOOK_SECRET` in the deployment.
3. Configure a Zernio webhook:
   - URL: `https://YOUR_DOMAIN/api/social/zernio/webhook`
   - Secret: the exact `ZERNIO_WEBHOOK_SECRET`
   - Events: `account.connected`, `account.disconnected`,
     `post.published`, `post.failed`, `post.partial`,
     `message.received`, `conversation.started`, `comment.received`,
     and `review.new`.
4. Open **Settings → Social accounts** and connect channels.

Webhook delivery is HMAC-SHA256 verified and deduplicated by the stable
Zernio event id. Incoming inbox events are durably accepted in
`zernio_webhook_events`; AI reply execution is intentionally disabled
until account-level approval and safety policies are configured.

