import { zonedDateTimeToUtc } from './time';

export interface AvailabilityWindow {
  start_time: string;
  end_time: string;
}
export interface BusyWindow {
  starts_at: string;
  ends_at: string;
}
export interface AvailableSlot {
  starts_at: string;
  ends_at: string;
  display_label: string;
}

export function calculateSlots(input: {
  date: string;
  timezone: string;
  windows: AvailabilityWindow[];
  busy: BusyWindow[];
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  intervalMinutes?: number;
  now?: Date;
}): AvailableSlot[] {
  const duration = input.durationMinutes * 60_000;
  const before = (input.bufferBeforeMinutes ?? 0) * 60_000;
  const after = (input.bufferAfterMinutes ?? 0) * 60_000;
  const interval = (input.intervalMinutes ?? 15) * 60_000;
  const now = input.now ?? new Date();
  const slots: AvailableSlot[] = [];

  for (const window of input.windows) {
    const windowStart = zonedDateTimeToUtc(
      input.date,
      window.start_time,
      input.timezone
    ).getTime();
    const windowEnd = zonedDateTimeToUtc(
      input.date,
      window.end_time,
      input.timezone
    ).getTime();

    for (
      let start = windowStart;
      start + duration <= windowEnd;
      start += interval
    ) {
      const end = start + duration;
      if (start <= now.getTime()) continue;
      const collides = input.busy.some((busy) => {
        const busyStart = new Date(busy.starts_at).getTime();
        const busyEnd = new Date(busy.ends_at).getTime();
        return start - before < busyEnd && end + after > busyStart;
      });
      if (collides) continue;
      slots.push({
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        display_label: new Intl.DateTimeFormat('en-US', {
          timeZone: input.timezone,
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(start)),
      });
    }
  }
  return slots;
}
