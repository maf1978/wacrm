import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import {
  buildDailyReport,
  topTopics,
  type DailyMetrics,
} from '@/lib/reports/daily';

/**
 * GET /api/reports/nightly
 *
 * Nightly conversation report, triggered by Supabase Cron via
 * `net.http_post` (the same `x-cron-secret` pattern the automations /
 * appointments / flows cron endpoints use). For every account it
 * aggregates the day's metrics (in the account's scheduling timezone)
 * and delivers them as an in-app notification to owners/admins.
 *
 * Auth: requires AUTOMATION_CRON_SECRET env + matching `x-cron-secret`
 * header (timing-safe compare).
 */

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Start/end of the account's LOCAL day, as UTC instants. */
function localDayRange(tz: string): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  const from = new Date(
    Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day')))
  );
  return { from: from.toISOString(), to: new Date(from.getTime() + 86_400_000).toISOString() };
}

export async function GET(request: Request) {
  const expected = process.env.AUTOMATION_CRON_SECRET;
  if (!expected)
    return NextResponse.json(
      { error: 'cron not configured' },
      { status: 503 }
    );
  const supplied = request.headers.get('x-cron-secret') ?? '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return unauthorized();

  const admin = supabaseAdmin();
  const { data: accounts, error: accountsError } = await admin
    .from('accounts')
    .select('id, name, scheduling_timezone');
  if (accountsError)
    return NextResponse.json({ error: accountsError.message }, { status: 500 });

  let notified = 0;
  for (const account of accounts ?? []) {
    const tz = account.scheduling_timezone || 'America/New_York';
    const { from, to } = localDayRange(tz);

    const [
      newConvs,
      activeConvs,
      unanswered,
      newContacts,
      customerMsgs,
      aiReplies,
      handoffs,
      appts,
    ] = await Promise.all([
      admin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', from)
        .lt('created_at', to),
      admin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('last_message_at', from)
        .lt('last_message_at', to),
      admin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .eq('status', 'open'),
      admin
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', from)
        .lt('created_at', to),
      admin
        .from('messages')
        .select('id, conversations!inner(account_id)', {
          count: 'exact',
          head: true,
        })
        .eq('conversations.account_id', account.id)
        .eq('sender_type', 'customer')
        .gte('created_at', from)
        .lt('created_at', to),
      admin
        .from('messages')
        .select('id, conversations!inner(account_id)', {
          count: 'exact',
          head: true,
        })
        .eq('conversations.account_id', account.id)
        .eq('ai_generated', true)
        .gte('created_at', from)
        .lt('created_at', to),
      admin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .not('ai_handoff_summary', 'is', null)
        .gte('updated_at', from)
        .lt('updated_at', to),
      admin
        .from('appointments')
        .select('id, source')
        .eq('account_id', account.id)
        .gte('created_at', from)
        .lt('created_at', to),
    ]);

    const { data: topicRows } = await admin
      .from('messages')
      .select('content_text, conversations!inner(account_id)')
      .eq('conversations.account_id', account.id)
      .eq('sender_type', 'customer')
      .gte('created_at', from)
      .lt('created_at', to)
      .limit(500);
    const topics = topTopics((topicRows ?? []).map((r) => r.content_text ?? ''));

    const apptRows = (appts.data ?? []) as { source: string }[];
    const dateLabel = new Intl.DateTimeFormat('es', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(from));

    const metrics: DailyMetrics = {
      dateLabel,
      conversationsNew: newConvs.count ?? 0,
      conversationsActive: activeConvs.count ?? 0,
      unanswered: unanswered.count ?? 0,
      newContacts: newContacts.count ?? 0,
      customerMessages: customerMsgs.count ?? 0,
      aiReplies: aiReplies.count ?? 0,
      handoffs: handoffs.count ?? 0,
      appointmentsTotal: apptRows.length,
      appointmentsWhatsApp: apptRows.filter((a) => a.source === 'whatsapp').length,
      topics,
    };

    const body = buildDailyReport(metrics);

    const { data: recipients } = await admin
      .from('profiles')
      .select('user_id')
      .eq('account_id', account.id)
      .in('account_role', ['owner', 'admin']);
    for (const recipient of recipients ?? []) {
      const { error: notifError } = await admin.from('notifications').insert({
        account_id: account.id,
        user_id: recipient.user_id,
        type: 'report',
        title: '📊 Reporte del día',
        body,
      });
      if (!notifError) notified++;
    }
  }

  return NextResponse.json({ accounts: (accounts ?? []).length, notified });
}
