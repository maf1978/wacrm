import crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyZernioSignature } from './webhook';

describe('verifyZernioSignature', () => {
  afterEach(() => {
    delete process.env.ZERNIO_WEBHOOK_SECRET;
  });

  it('accepts a valid HMAC-SHA256 signature', () => {
    process.env.ZERNIO_WEBHOOK_SECRET = 'test-secret';
    const body = '{"id":"evt_1"}';
    const signature = crypto
      .createHmac('sha256', 'test-secret')
      .update(body)
      .digest('hex');
    expect(verifyZernioSignature(body, signature)).toBe(true);
  });

  it('fails closed when the secret or signature is absent', () => {
    expect(verifyZernioSignature('{}', null)).toBe(false);
  });
});

