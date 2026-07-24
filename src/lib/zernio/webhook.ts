import crypto from 'crypto';

export function verifyZernioSignature(rawBody: string, signature: string | null) {
  const secret = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const supplied = signature.trim().toLowerCase();
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(supplied, 'utf8'),
    Buffer.from(expected, 'utf8'),
  );
}

