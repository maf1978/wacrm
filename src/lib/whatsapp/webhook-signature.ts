import crypto from 'node:crypto'

/**
 * Verify the HMAC-SHA256 signature on inbound webhook POSTs.
 *
 * Supports two signing formats:
 *   1. Meta format:  `x-hub-signature-256: sha256=<hex>` signed with META_APP_SECRET
 *   2. Kapso format: `x-webhook-signature: <hex>` signed with KAPOO_WEBHOOK_SECRET
 *
 * Meta format is used when the webhook is configured as "Meta webhook" in
 * Kapso (raw Meta payload forwarding). Kapso format is used when the webhook
 * is configured as "Kapso webhook" (Kapso's own payload structure).
 *
 * Contract:
 *   - If `KAPOO_WEBHOOK_SECRET` is set, prefer Kapso signature verification.
 *   - Otherwise, fall back to Meta signature verification with `META_APP_SECRET`.
 *   - If neither is set, reject every request.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  // Kapso webhook format: X-Webhook-Signature
  const kapsoSecret = process.env.KAPOSO_WEBHOOK_SECRET
  if (kapsoSecret) {
    const kapsoSig = signatureHeader // caller should pass the right header
    if (!kapsoSig) return false
    const expected =
      crypto.createHmac('sha256', kapsoSecret).update(rawBody).digest('hex')
    const a = Buffer.from(kapsoSig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  }

  // Meta format: x-hub-signature-256: sha256=<hex>
  const secret = process.env.META_APP_SECRET
  if (!secret) {
    console.error(
      '[webhook] Neither KAPOSO_WEBHOOK_SECRET nor META_APP_SECRET is set — rejecting request. ' +
        'Configure at least one to enable signature verification.',
    )
    return false
  }

  if (!signatureHeader) return false
  if (!signatureHeader.startsWith('sha256=')) return false

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  // Bail if lengths differ — timingSafeEqual throws otherwise.
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
