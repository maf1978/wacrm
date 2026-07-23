import { describe, expect, it } from 'vitest';
import {
  appointmentRange,
  canTransitionAppointment,
  isValidTimeZone,
} from './validation';

describe('appointment validation', () => {
  it('allows only supported lifecycle transitions', () => {
    expect(canTransitionAppointment('pending', 'confirmed')).toBe(true);
    expect(canTransitionAppointment('confirmed', 'no_show')).toBe(true);
    expect(canTransitionAppointment('cancelled', 'confirmed')).toBe(false);
  });

  it('computes an ISO end time', () => {
    expect(appointmentRange('2026-07-23T14:00:00Z', 45)?.endsAt).toBe(
      '2026-07-23T14:45:00.000Z'
    );
  });

  it('validates IANA time zones', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
