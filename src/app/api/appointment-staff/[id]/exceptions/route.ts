import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await params;
    const body = await request.json();
    const startsAt = new Date(body.starts_at);
    const endsAt = new Date(body.ends_at);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      startsAt >= endsAt
    ) {
      return NextResponse.json(
        { error: 'A valid start and end are required' },
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
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    const { data, error } = await admin
      .from('staff_availability_exceptions')
      .insert({
        account_id: ctx.accountId,
        staff_profile_id: id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_available: !!body.is_available,
        note: body.note || null,
      })
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ exception: data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await params;
    const exceptionId = new URL(request.url).searchParams.get('exception_id');
    if (!exceptionId)
      return NextResponse.json(
        { error: 'exception_id is required' },
        { status: 400 }
      );
    const { error } = await supabaseAdmin()
      .from('staff_availability_exceptions')
      .delete()
      .eq('id', exceptionId)
      .eq('staff_profile_id', id)
      .eq('account_id', ctx.accountId);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
