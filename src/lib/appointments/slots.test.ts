import { describe, expect, it } from 'vitest';
import { calculateSlots } from './slots';

describe('calculateSlots', () => {
  it('removes overlapping times and honors service buffers', () => {
    const slots = calculateSlots({
      date: '2026-07-23',
      timezone: 'America/New_York',
      windows: [{ start_time: '09:00', end_time: '11:00' }],
      busy: [
        {
          starts_at: '2026-07-23T14:00:00.000Z',
          ends_at: '2026-07-23T14:30:00.000Z',
        },
      ],
      durationMinutes: 30,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      intervalMinutes: 30,
      now: new Date('2026-01-01T00:00:00Z'),
    });
    // The 15-minute post-buffer blocks 9:30 and the 15-minute
    // pre-buffer blocks 10:30 around the 10:00–10:30 booking.
    expect(slots.map((s) => s.display_label)).toEqual(['9:00 AM']);
  });

  it('uses the correct DST offset', () => {
    const [slot] = calculateSlots({
      date: '2026-03-09',
      timezone: 'America/New_York',
      windows: [{ start_time: '09:00', end_time: '10:00' }],
      busy: [],
      durationMinutes: 60,
      now: new Date('2026-01-01T00:00:00Z'),
    });
    expect(slot.starts_at).toBe('2026-03-09T13:00:00.000Z');
  });
});
