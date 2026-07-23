import { NextResponse } from 'next/server';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import {
  appointmentRange,
  isValidTimeZone,
} from '@/lib/appointments/validation';
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { formatAppointmentTime } from '@/lib/appointments/time';
import type { Appointment, AutomationTriggerType } from '@/types';
import { createAppointmentActionToken } from '@/lib/appointments/action-token';

const select = `
  *,
  contact:contacts(id, name, phone, email),
  service:appointment_services(*),
  staff:staff_scheduling_profiles(id, user_id, timezone, is_bookable)
`;

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const url = new URL(request.url);
    let query = ctx.supabase
      .from('appointments')
      .select(select)
      .eq('account_id', ctx.accountId)
      .order('starts_at');
    for (const [param, column] of [
      ['from', 'starts_at'],
      ['to', 'starts_at'],
    ] as const) {
      const value = url.searchParams.get(param);
      if (value)
        query =
          param === 'from' ? query.gte(column, value) : query.lt(column, value);
    }
    const contact = url.searchParams.get('contact_id');
    const staff = url.searchParams.get('staff_profile_id');
    const service = url.searchParams.get('service_id');
    const status = url.searchParams.get('status');
    if (contact) query = query.eq('contact_id', contact);
    if (staff) query = query.eq('staff_profile_id', staff);
    if (service) query = query.eq('service_id', service);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ appointments: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const body = await request.json();
    if (
      !body.contact_id ||
      !body.service_id ||
      !body.staff_profile_id ||
      !body.starts_at
    ) {
      return NextResponse.json(
        {
          error:
            'contact_id, service_id, staff_profile_id, and starts_at are required',
        },
        { status: 400 }
      );
    }
    const timezone = String(body.timezone ?? 'America/New_York');
    if (!isValidTimeZone(timezone)) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }
    const admin = supabaseAdmin();
    const [{ data: service }, { data: contact }, { data: staff }] =
      await Promise.all([
        admin
          .from('appointment_services')
          .select('*')
          .eq('id', body.service_id)
          .eq('account_id', ctx.accountId)
          .eq('is_active', true)
          .maybeSingle(),
        admin
          .from('contacts')
          .select('id')
          .eq('id', body.contact_id)
          .eq('account_id', ctx.accountId)
          .maybeSingle(),
        admin
          .from('staff_scheduling_profiles')
          .select('*')
          .eq('id', body.staff_profile_id)
          .eq('account_id', ctx.accountId)
          .eq('is_bookable', true)
          .maybeSingle(),
      ]);
    if (!service || !contact || !staff) {
      return NextResponse.json(
        { error: 'Contact, active service, or bookable staff not found' },
        { status: 400 }
      );
    }
    const range = appointmentRange(body.starts_at, service.duration_minutes);
    if (!range)
      return NextResponse.json(
        { error: 'Invalid start time' },
        { status: 400 }
      );
    const { data: appointment, error } = await admin
      .from('appointments')
      .insert({
        account_id: ctx.accountId,
        contact_id: body.contact_id,
        service_id: body.service_id,
        staff_profile_id: body.staff_profile_id,
        starts_at: range.startsAt,
        ends_at: range.endsAt,
        timezone,
        status: body.status === 'confirmed' ? 'confirmed' : 'pending',
        source: ['staff', 'whatsapp', 'automation'].includes(body.source)
          ? body.source
          : 'staff',
        notes: body.notes || null,
        created_by_user_id: ctx.userId,
        confirmed_at:
          body.status === 'confirmed' ? new Date().toISOString() : null,
      })
      .select(select)
      .single();
    if (error) {
      const conflict = error.code === '23P01';
      return NextResponse.json(
        {
          error: conflict
            ? 'That staff member is no longer available at this time.'
            : error.message,
        },
        { status: conflict ? 409 : 400 }
      );
    }
    await admin.from('appointment_events').insert({
      account_id: ctx.accountId,
      appointment_id: appointment.id,
      actor_user_id: ctx.userId,
      event_type: appointment.status === 'confirmed' ? 'confirmed' : 'created',
      payload: { source: appointment.source },
    });
    const reminderCount = await countReminderJobs(
      appointment.id,
      appointment.revision
    );
    void dispatchAppointment(
      appointment,
      appointment.status === 'confirmed'
        ? 'appointment_confirmed'
        : 'appointment_created'
    );
    return NextResponse.json(
      {
        appointment,
        revision: appointment.revision,
        reminders_scheduled: reminderCount,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function countReminderJobs(appointmentId: string, revision: number) {
  const { count } = await supabaseAdmin()
    .from('appointment_reminder_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('appointment_id', appointmentId)
    .eq('appointment_revision', revision)
    .eq('status', 'pending');
  return count ?? 0;
}

export async function dispatchAppointment(
  appointment: Appointment,
  triggerType: AutomationTriggerType
) {
  const service = Array.isArray(appointment.service)
    ? appointment.service[0]
    : appointment.service;
  const staff = Array.isArray(appointment.staff)
    ? appointment.staff[0]
    : appointment.staff;
  const { data: staffProfile } = staff?.user_id
    ? await supabaseAdmin()
        .from('profiles')
        .select('full_name')
        .eq('user_id', staff.user_id)
        .eq('account_id', appointment.account_id)
        .maybeSingle()
    : { data: null };
  const local = formatAppointmentTime(
    appointment.starts_at,
    appointment.timezone
  );
  let manageAction = '';
  try {
    manageAction = createAppointmentActionToken({
      appointmentId: appointment.id,
      accountId: appointment.account_id,
      contactId: appointment.contact_id,
      revision: appointment.revision,
      action: appointment.status === 'pending' ? 'confirm' : 'cancel',
    });
  } catch {
    // Environments that have not configured appointment actions can still
    // run lifecycle automations; only the optional action variable is empty.
  }
  await runAutomationsForTrigger({
    accountId: appointment.account_id,
    contactId: appointment.contact_id,
    triggerType,
    context: {
      appointment: {
        id: appointment.id,
        start_time: appointment.starts_at,
        end_time: appointment.ends_at,
        local_date: local.localDate,
        local_time: local.localTime,
        timezone: appointment.timezone,
        service_name: service?.name ?? '',
        staff_name: staffProfile?.full_name ?? '',
        manage_action: manageAction,
      },
    },
  });
}
