import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import {
  appointmentRange,
  canTransitionAppointment,
  isValidTimeZone,
} from '@/lib/appointments/validation';
import type { AppointmentStatus, AutomationTriggerType } from '@/types';
import { dispatchAppointment } from '../route';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await params;
    const body = await request.json();
    const admin = supabaseAdmin();
    const { data: current } = await admin
      .from('appointments')
      .select('*, service:appointment_services(*)')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();
    if (!current)
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      revision: current.revision + 1,
    };
    let eventType = 'updated';
    let automationTrigger: AutomationTriggerType | null = null;

    if (body.status && body.status !== current.status) {
      if (
        !canTransitionAppointment(
          current.status,
          body.status as AppointmentStatus
        )
      ) {
        return NextResponse.json(
          { error: `Cannot transition ${current.status} to ${body.status}` },
          { status: 409 }
        );
      }
      update.status = body.status;
      eventType = body.status;
      automationTrigger =
        ({
          confirmed: 'appointment_confirmed',
          completed: 'appointment_completed',
          cancelled: 'appointment_cancelled',
          no_show: 'appointment_no_show',
        }[body.status as string] as AutomationTriggerType | undefined) ?? null;
      if (body.status === 'confirmed')
        update.confirmed_at = new Date().toISOString();
      if (body.status === 'completed')
        update.completed_at = new Date().toISOString();
      if (body.status === 'cancelled') {
        update.cancelled_at = new Date().toISOString();
        update.cancellation_reason = body.cancellation_reason || null;
      }
    }

    if (body.starts_at) {
      const service = current.service;
      const range = appointmentRange(body.starts_at, service.duration_minutes);
      if (!range)
        return NextResponse.json(
          { error: 'Invalid start time' },
          { status: 400 }
        );
      update.starts_at = range.startsAt;
      update.ends_at = range.endsAt;
      eventType = 'rescheduled';
      automationTrigger = 'appointment_rescheduled';
    }
    if (body.timezone) {
      if (!isValidTimeZone(body.timezone))
        return NextResponse.json(
          { error: 'Invalid timezone' },
          { status: 400 }
        );
      update.timezone = body.timezone;
    }
    if (body.staff_profile_id) update.staff_profile_id = body.staff_profile_id;
    if ('notes' in body) update.notes = body.notes || null;

    const { data: appointment, error } = await admin
      .from('appointments')
      .update(update)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .eq('revision', current.revision)
      .select(
        '*, contact:contacts(id,name,phone), service:appointment_services(*), staff:staff_scheduling_profiles(*)'
      )
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        {
          error:
            error.code === '23P01'
              ? 'That time is no longer available.'
              : error.message,
        },
        { status: error.code === '23P01' ? 409 : 400 }
      );
    }
    if (!appointment)
      return NextResponse.json(
        { error: 'Appointment changed; refresh and retry.' },
        { status: 409 }
      );
    await admin.from('appointment_events').insert({
      account_id: ctx.accountId,
      appointment_id: id,
      actor_user_id: ctx.userId,
      event_type: eventType,
      payload: {
        from_revision: current.revision,
        changes: Object.keys(update),
      },
    });
    if (automationTrigger)
      void dispatchAppointment(appointment, automationTrigger);
    const { count } = await admin
      .from('appointment_reminder_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('appointment_id', id)
      .eq('appointment_revision', appointment.revision)
      .eq('status', 'pending');
    return NextResponse.json({
      appointment,
      revision: appointment.revision,
      reminders_scheduled: count ?? 0,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
