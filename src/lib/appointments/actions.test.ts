import { afterEach, describe, expect, it } from 'vitest';
import {
  createAppointmentActionToken,
  verifyAppointmentActionToken,
} from './actions';

afterEach(() => {
  delete process.env.APPOINTMENT_ACTION_SECRET;
});

describe('appointment action tokens', () => {
  it('signs and verifies scoped action data', () => {
    process.env.APPOINTMENT_ACTION_SECRET = 'test-secret-that-is-long-enough';
    const token = createAppointmentActionToken({
      appointmentId: '11111111-1111-4111-8111-111111111111',
      accountId: '22222222-2222-4222-8222-222222222222',
      contactId: '33333333-3333-4333-8333-333333333333',
      revision: 2,
      action: 'confirm',
    });
    expect(verifyAppointmentActionToken(token)?.revision).toBe(2);
    expect(token.length).toBeLessThan(200);
    expect(verifyAppointmentActionToken(`${token}x`)).toBeNull();
  });

  it('rejects expired actions', () => {
    process.env.APPOINTMENT_ACTION_SECRET = 'test-secret-that-is-long-enough';
    const token = createAppointmentActionToken({
      appointmentId: '11111111-1111-4111-8111-111111111111',
      accountId: '22222222-2222-4222-8222-222222222222',
      contactId: '33333333-3333-4333-8333-333333333333',
      revision: 1,
      action: 'cancel',
      expiresAt: Date.now() - 1,
    });
    expect(verifyAppointmentActionToken(token)).toBeNull();
  });
});
