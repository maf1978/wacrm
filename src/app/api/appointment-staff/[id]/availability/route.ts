import { NextResponse } from 'next/server';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getCurrentAccount();
    const { id } = await params;
    const [{ data: rules }, { data: exceptions }] = await Promise.all([
      ctx.supabase
        .from('staff_availability_rules')
        .select('*')
        .eq('account_id', ctx.accountId)
        .eq('staff_profile_id', id),
      ctx.supabase
        .from('staff_availability_exceptions')
        .select('*')
        .eq('account_id', ctx.accountId)
        .eq('staff_profile_id', id)
        .order('starts_at'),
    ]);
    return NextResponse.json({
      rules: rules ?? [],
      exceptions: exceptions ?? [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await params;
    const body = await request.json();
    const rules: { weekday: number; start_time: string; end_time: string }[] =
      Array.isArray(body.rules) ? body.rules : [];
    if (
      rules.some(
        (r) =>
          r.weekday < 0 ||
          r.weekday > 6 ||
          !r.start_time ||
          !r.end_time ||
          r.start_time >= r.end_time
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid availability rule' },
        { status: 400 }
      );
    }
    const admin = supabaseAdmin();
    const { data: staff } = await admin
      .from('staff_scheduling_profiles')
      .select('id')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();
    if (!staff)
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    await admin
      .from('staff_availability_rules')
      .delete()
      .eq('staff_profile_id', id);
    if (rules.length) {
      const { error } = await admin.from('staff_availability_rules').insert(
        rules.map((rule) => ({
          account_id: ctx.accountId,
          staff_profile_id: id,
          weekday: rule.weekday,
          start_time: rule.start_time,
          end_time: rule.end_time,
        }))
      );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ saved: rules.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
