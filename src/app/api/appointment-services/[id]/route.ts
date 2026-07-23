import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await params;
    const body = await request.json();
    const allowed = [
      'name',
      'description',
      'duration_minutes',
      'buffer_before_minutes',
      'buffer_after_minutes',
      'is_active',
    ];
    const update = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowed.includes(key))
    );
    const { data, error } = await supabaseAdmin()
      .from('appointment_services')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .maybeSingle();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ service: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
