import type { AppointmentStatus } from '@/types';

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
];

export const APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function appointmentRange(
  startsAt: string,
  durationMinutes: number
): { startsAt: string; endsAt: string } | null {
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime()) || durationMinutes < 5) return null;
  return {
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + durationMinutes * 60_000).toISOString(),
  };
}
