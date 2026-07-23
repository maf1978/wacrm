import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { engineSendTemplate } from '@/lib/automations/meta-send';
import { formatAppointmentTime } from '@/lib/appointments/time';
import { runAutomationsForTrigger } from '@/lib/automations/engine';

const RETRY_DELAYS = [5, 30, 120] as const;

export async function GET(request: Request) {
  const expected = process.env.AUTOMATION_CRON_SECRET;
  if (!expected)
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 });
  const supplied = request.headers.get('x-cron-secret') ?? '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const now = new Date();
  // Recover jobs left running after a crashed invocation.
  await admin
    .from('appointment_reminder_jobs')
    .update({ status: 'pending', claimed_at: null })
    .eq('status', 'running')
    .lt('claimed_at', new Date(now.getTime() - 15 * 60_000).toISOString());

  const { data: due, error } = await admin
    .from('appointment_reminder_jobs')
    .select(
      `
      *,
      appointment:appointments(
        *,
        contact:contacts(id,name,phone),
        service:appointment_services(name),
        staff:staff_scheduling_profiles(user_id),
        account:accounts(name)
      ),
      rule:appointment_reminder_rules(
        *,
        template:message_templates(id,name,language,status,category)
      )
    `
    )
    .eq('status', 'pending')
    .lte('run_at', now.toISOString())
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`)
    .order('run_at')
    .limit(50);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of due ?? []) {
    const { data: claim } = await admin
      .from('appointment_reminder_jobs')
      .update({
        status: 'running',
        claimed_at: now.toISOString(),
        attempts: row.attempts + 1,
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (!claim) continue;

    const appointment = one(row.appointment);
    const rule = one(row.rule);
    const template = one(rule?.template);
    if (
      !appointment ||
      !['pending', 'confirmed'].includes(appointment.status) ||
      appointment.revision !== row.appointment_revision ||
      !rule?.is_active ||
      template?.status !== 'APPROVED' ||
      template?.category !== 'Utility'
    ) {
      await admin
        .from('appointment_reminder_jobs')
        .update({ status: 'cancelled' })
        .eq('id', row.id);
      skipped++;
      continue;
    }

    try {
      const conversationId = await ensureConversation(
        appointment.account_id,
        appointment.contact_id,
        appointment.created_by_user_id ?? appointment.staff?.user_id
      );
      const { data: staffProfile } = appointment.staff?.user_id
        ? await admin
            .from('profiles')
            .select('full_name')
            .eq('user_id', appointment.staff.user_id)
            .eq('account_id', appointment.account_id)
            .maybeSingle()
        : { data: null };
      const staffName = staffProfile?.full_name || 'Team';
      const local = formatAppointmentTime(
        appointment.starts_at,
        appointment.timezone
      );
      const { whatsapp_message_id } = await engineSendTemplate({
        accountId: appointment.account_id,
        userId: appointment.created_by_user_id ?? appointment.staff?.user_id,
        conversationId,
        contactId: appointment.contact_id,
        templateName: template.name,
        language: template.language,
        params: [
          appointment.contact?.name || appointment.contact?.phone || 'Customer',
          appointment.service?.name || 'Appointment',
          staffName,
          local.localDate,
          local.localTime,
          appointment.account?.name || 'Business',
        ],
      });
      await admin
        .from('appointment_reminder_jobs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          whatsapp_message_id,
          error_message: null,
        })
        .eq('id', row.id);
      await admin.from('appointment_events').insert({
        account_id: appointment.account_id,
        appointment_id: appointment.id,
        event_type: 'reminder_sent',
        payload: { reminder_rule_id: rule.id, whatsapp_message_id },
      });
      void runAutomationsForTrigger({
        accountId: appointment.account_id,
        contactId: appointment.contact_id,
        triggerType: 'appointment_reminder_due',
        context: {
          appointment: {
            id: appointment.id,
            start_time: appointment.starts_at,
            end_time: appointment.ends_at,
            local_date: local.localDate,
            local_time: local.localTime,
            timezone: appointment.timezone,
            service_name: appointment.service?.name ?? '',
            staff_name: staffName,
          },
        },
      });
      sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempt = row.attempts as number;
      const retryMinutes = RETRY_DELAYS[attempt];
      await admin
        .from('appointment_reminder_jobs')
        .update({
          status: retryMinutes ? 'pending' : 'failed',
          next_attempt_at: retryMinutes
            ? new Date(Date.now() + retryMinutes * 60_000).toISOString()
            : null,
          error_message: message.slice(0, 1000),
          claimed_at: null,
        })
        .eq('id', row.id);
      if (!retryMinutes) {
        await admin.from('appointment_events').insert({
          account_id: appointment.account_id,
          appointment_id: appointment.id,
          event_type: 'reminder_failed',
          payload: { reminder_rule_id: rule.id, error: message.slice(0, 500) },
        });
        failed++;
      }
    }
  }
  return NextResponse.json({
    processed: (due ?? []).length,
    sent,
    failed,
    skipped,
  });
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function ensureConversation(
  accountId: string,
  contactId: string,
  userId: string
) {
  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: userId,
      contact_id: contactId,
      status: 'open',
    })
    .select('id')
    .single();
  if (error || !data)
    throw new Error(error?.message ?? 'Could not create conversation');
  return data.id;
}
