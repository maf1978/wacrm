import { describe, expect, it } from 'vitest';

import {
  buildOrderConfirmationPatch,
  normalizeOrderInput,
  OrderValidationError,
} from './validation';

describe('normalizeOrderInput', () => {
  it('normalizes a minimal order', () => {
    expect(
      normalizeOrderInput({
        title: '  AC repair parts ',
        total: '125.50',
        currency: 'usd',
      }),
    ).toMatchObject({
      title: 'AC repair parts',
      total: 125.5,
      currency: 'USD',
      status: 'draft',
    });
  });

  it('rejects missing titles', () => {
    expect(() => normalizeOrderInput({ title: ' ' })).toThrow(
      OrderValidationError,
    );
  });

  it('rejects invalid statuses', () => {
    expect(() =>
      normalizeOrderInput({ title: 'Order', status: 'done' }),
    ).toThrow('Invalid order status');
  });
});

describe('buildOrderConfirmationPatch', () => {
  it('marks the order as confirmed by the user', () => {
    const patch = buildOrderConfirmationPatch('user-1');
    expect(patch.status).toBe('confirmed');
    expect(patch.confirmed_by_user_id).toBe('user-1');
    expect(new Date(patch.confirmed_at).toString()).not.toBe('Invalid Date');
  });
});
