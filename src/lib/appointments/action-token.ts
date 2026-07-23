import { createHmac, timingSafeEqual } from 'node:crypto';

const PREFIX = 'waappt.';

export interface AppointmentAction {
  appointmentId?: string;
  accountId: string;
  contactId: string;
  revision: number;
  action: 'book' | 'confirm' | 'cancel' | 'reschedule';
  startsAt?: string;
  serviceId?: string;
  staffProfileId?: string;
  timezone?: string;
  expiresAt: number;
  contactHash?: string;
}

function secret() {
  const value =
    process.env.APPOINTMENT_ACTION_SECRET ?? process.env.AUTOMATION_CRON_SECRET;
  if (!value) throw new Error('appointment action secret not configured');
  return value;
}

export function createAppointmentActionToken(
  payload: Omit<AppointmentAction, 'expiresAt'> & { expiresAt?: number }
) {
  const actionCode = { book: 'b', confirm: 'f', cancel: 'c', reschedule: 'r' }[
    payload.action
  ];
  const encoded = [
    actionCode,
    packUuid(payload.appointmentId),
    packUuid(payload.serviceId),
    packUuid(payload.staffProfileId),
    payload.startsAt
      ? Math.floor(new Date(payload.startsAt).getTime() / 60_000).toString(36)
      : '',
    payload.revision.toString(36),
    contactHash(payload.contactId),
    Math.floor(
      (payload.expiresAt ?? Date.now() + 7 * 24 * 60 * 60_000) / 60_000
    ).toString(36),
  ].join('~');
  const signature = createHmac('sha256', secret())
    .update(encoded)
    .digest('base64url')
    .slice(0, 24);
  return `${PREFIX}${encoded}.${signature}`;
}

export function verifyAppointmentActionToken(
  token: string
): AppointmentAction | null {
  if (!token.startsWith(PREFIX)) return null;
  const [encoded, supplied] = token.slice(PREFIX.length).split('.');
  if (!encoded || !supplied) return null;
  const expected = createHmac('sha256', secret())
    .update(encoded)
    .digest('base64url')
    .slice(0, 24);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const [
      code,
      appointment,
      service,
      staff,
      starts,
      revision,
      boundContact,
      expiry,
    ] = encoded.split('~');
    const expiresAt = Number.parseInt(expiry, 36) * 60_000;
    if (!expiresAt || expiresAt < Date.now()) return null;
    const action = { b: 'book', f: 'confirm', c: 'cancel', r: 'reschedule' }[
      code
    ] as AppointmentAction['action'] | undefined;
    if (!action) return null;
    return {
      appointmentId: unpackUuid(appointment),
      accountId: '',
      contactId: '',
      contactHash: boundContact,
      revision: Number.parseInt(revision, 36),
      action,
      startsAt: starts
        ? new Date(Number.parseInt(starts, 36) * 60_000).toISOString()
        : undefined,
      serviceId: unpackUuid(service),
      staffProfileId: unpackUuid(staff),
      expiresAt,
    } as AppointmentAction;
  } catch {
    return null;
  }
}

function packUuid(value?: string) {
  if (!value) return '';
  const hex = value.replaceAll('-', '');
  if (!/^[0-9a-f]{32}$/i.test(hex))
    throw new Error('invalid UUID in appointment action');
  return Buffer.from(hex, 'hex').toString('base64url');
}

function unpackUuid(value?: string) {
  if (!value) return undefined;
  const hex = Buffer.from(value, 'base64url').toString('hex');
  if (hex.length !== 32) return undefined;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function contactHash(contactId: string) {
  return createHmac('sha256', secret())
    .update(`contact:${contactId}`)
    .digest('base64url')
    .slice(0, 12);
}
