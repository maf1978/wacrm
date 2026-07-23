import { NextResponse } from 'next/server';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const [{ data: rules, error }, { data: templates }] = await Promise.all([
      ctx.supabase
        .from('appointment_reminder_rules')
        .select(
          '*, template:message_templates(id,name,language,status,body_text)'
        )
        .eq('account_id', ctx.accountId)
        .order('offset_minutes', { ascending: false }),
      ctx.supabase
        .from('message_templates')
        .select('id,name,language,status,body_text')
        .eq('account_id', ctx.accountId)
        .eq('status', 'APPROVED')
        .eq('category', 'Utility')
        .order('name'),
    ]);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      rules: rules ?? [],
      templates: templates ?? [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json();
    const rules = Array.isArray(body.rules) ? body.rules : [];
    const admin = supabaseAdmin();
    for (const rule of rules) {
      const offset = Number(rule.offset_minutes);
      if (offset < 1 || offset > 525600) {
        return NextResponse.json(
          { error: 'Reminder offset is out of range' },
          { status: 400 }
        );
      }
      if (rule.is_active) {
        const { data: template } = await admin
          .from('message_templates')
          .select('id,body_text')
          .eq('id', rule.template_id)
          .eq('account_id', ctx.accountId)
          .eq('status', 'APPROVED')
          .eq('category', 'Utility')
          .maybeSingle();
        if (!template) {
          return NextResponse.json(
            { error: 'Active reminders require an approved Utility template.' },
            { status: 400 }
          );
        }
        const variables = Array.from(
          String(template.body_text ?? '').matchAll(/\{\{(\d+)\}\}/g),
          (match) => Number(match[1])
        ).sort((a, b) => a - b);
        const expected = [1, 2, 3, 4, 5, 6];
        if (
          variables.length !== expected.length ||
          variables.some((value, index) => value !== expected[index])
        ) {
          return NextResponse.json(
            {
              error:
                'Reminder templates must contain exactly {{1}} through {{6}} for customer, service, staff, date, time, and business.',
            },
            { status: 400 }
          );
        }
      }
      const { error } = await admin.from('appointment_reminder_rules').upsert(
        {
          account_id: ctx.accountId,
          offset_minutes: offset,
          template_id: rule.template_id || null,
          is_active: !!rule.is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,offset_minutes' }
      );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ saved: rules.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
