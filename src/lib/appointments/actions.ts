import { supabaseAdmin } from '@/lib/automations/admin-client';
import { appointmentRange, canTransitionAppointment } from './validation';
import type { AppointmentStatus } from '@/types';
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { formatAppointmentTime } from './time';

import { contactHash, verifyAppointmentActionToken } from './action-token';
export {
  createAppointmentActionToken,
  verifyAppointmentActionToken,
} from './action-token';

/** Consume a signed reply id from the WhatsApp webhook.
 * Revision + contact guards make tokens one-use and tenant-safe. */
export async function consumeAppointmentAction(input: {
  token: string;
  accountId: string;
  contactId: string;
  actorUserId?: string | null;
}) {
  const action = verifyAppointmentActionToken(input.token);
  if (!action || action.contactHash !== contactHash(input.contactId))
    return { consumed: false as const };

  const admin = supabaseAdmin();
  if (action.action === 'book') {
    if (!action.startsAt || !action.serviceId || !action.staffProfileId) {
      return { consumed: true as const, outcome: 'expired' as const };
    }
    const [{ data: service }, { data: staff }] = await Promise.all([
      admin
        .from('appointment_services')
        .select('duration_minutes,name')
        .eq('id', action.serviceId)
        .eq('account_id', input.accountId)
        .eq('is_active', true)
        .maybeSingle(),
      admin
        .from('staff_scheduling_profiles')
        .select('id,timezone')
        .eq('id', action.staffProfileId)
        .eq('account_id', input.accountId)
        .eq('is_bookable', true)
        .maybeSingle(),
    ]);
    const range =
      service && appointmentRange(action.startsAt, service.duration_minutes);
    if (!range || !staff)
      return { consumed: true as const, outcome: 'expired' as const };
    const { data: created, error } = await admin
      .from('appointments')
      .insert({
        account_id: input.accountId,
        contact_id: input.contactId,
        service_id: action.serviceId,
        staff_profile_id: action.staffProfileId,
        starts_at: range.startsAt,
        ends_at: range.endsAt,
        timezone: staff.timezone,
        status: 'confirmed',
        source: 'whatsapp',
        confirmed_at: new Date().toISOString(),
      })
      .select('*, staff:staff_scheduling_profiles(user_id)')
      .single();
    if (error?.code === '23P01') {
      return { consumed: true as const, outcome: 'unavailable' as const };
    }
    if (error || !created)
      throw error ?? new Error('appointment insert failed');
    await admin.from('appointment_events').insert({
      account_id: input.accountId,
      appointment_id: created.id,
      event_type: 'confirmed',
      payload: { source: 'whatsapp' },
    });
    const local = formatAppointmentTime(created.starts_at, created.timezone);
    const { data: staffProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('user_id', created.staff?.user_id)
      .eq('account_id', input.accountId)
      .maybeSingle();
    void runAutomationsForTrigger({
      accountId: input.accountId,
      contactId: input.contactId,
      triggerType: 'appointment_confirmed',
      context: {
        appointment: {
          id: created.id,
          start_time: created.starts_at,
          end_time: created.ends_at,
          local_date: local.localDate,
          local_time: local.localTime,
          timezone: created.timezone,
          service_name: service.name,
          staff_name: staffProfile?.full_name ?? '',
        },
      },
    });
    return { consumed: true as const, outcome: 'book' as const };
  }
  if (!action.appointmentId) {
    return { consumed: true as const, outcome: 'expired' as const };
  }
  const { data: current } = await admin
    .from('appointments')
    .select(
      '*, service:appointment_services(duration_minutes,name), staff:staff_scheduling_profiles(user_id)'
    )
    .eq('id', action.appointmentId)
    .eq('account_id', input.accountId)
    .eq('contact_id', input.contactId)
    .eq('revision', action.revision)
    .maybeSingle();
  if (!current) return { consumed: true as const, outcome: 'expired' as const };

  const target: AppointmentStatus =
    action.action === 'confirm'
      ? 'confirmed'
      : action.action === 'cancel'
        ? 'cancelled'
        : current.status;
  if (
    action.action !== 'reschedule' &&
    !canTransitionAppointment(current.status, target)
  ) {
    return { consumed: true as const, outcome: 'expired' as const };
  }

  const update: Record<string, unknown> = {
    revision: current.revision + 1,
    updated_at: new Date().toISOString(),
  };
  if (action.action === 'confirm') {
    update.status = 'confirmed';
    update.confirmed_at = new Date().toISOString();
  } else if (action.action === 'cancel') {
    update.status = 'cancelled';
    update.cancelled_at = new Date().toISOString();
    update.cancellation_reason = 'Cancelled by customer via WhatsApp';
  } else {
    const duration = current.service?.duration_minutes;
    const range =
      action.startsAt && appointmentRange(action.startsAt, duration);
    if (!range) return { consumed: true as const, outcome: 'expired' as const };
    update.starts_at = range.startsAt;
    update.ends_at = range.endsAt;
  }

  const { data: changed, error } = await admin
    .from('appointments')
    .update(update)
    .eq('id', current.id)
    .eq('revision', current.revision)
    .select('id')
    .maybeSingle();
  if (error?.code === '23P01' || !changed) {
    return { consumed: true as const, outcome: 'unavailable' as const };
  }
  if (error) throw error;
  await admin.from('appointment_events').insert({
    account_id: input.accountId,
    appointment_id: current.id,
    actor_user_id: input.actorUserId ?? null,
    event_type: action.action === 'reschedule' ? 'rescheduled' : action.action,
    payload: { source: 'whatsapp', from_revision: current.revision },
  });
  const local = formatAppointmentTime(
    String(update.starts_at ?? current.starts_at),
    current.timezone
  );
  const { data: staffProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('user_id', current.staff?.user_id)
    .eq('account_id', input.accountId)
    .maybeSingle();
  void runAutomationsForTrigger({
    accountId: input.accountId,
    contactId: input.contactId,
    triggerType:
      action.action === 'confirm'
        ? 'appointment_confirmed'
        : action.action === 'cancel'
          ? 'appointment_cancelled'
          : 'appointment_rescheduled',
    context: {
      appointment: {
        id: current.id,
        start_time: String(update.starts_at ?? current.starts_at),
        end_time: String(update.ends_at ?? current.ends_at),
        local_date: local.localDate,
        local_time: local.localTime,
        timezone: current.timezone,
        service_name: current.service?.name ?? '',
        staff_name: staffProfile?.full_name ?? '',
      },
    },
  });
  return { consumed: true as const, outcome: action.action };
}
