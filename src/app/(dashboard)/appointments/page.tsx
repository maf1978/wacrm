'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  Loader2,
  MoreHorizontal,
  Plus,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type {
  Appointment,
  AppointmentService,
  ClinicRoom,
  Contact,
  StaffSchedulingProfile,
} from '@/types';
import { RoomsView } from '@/components/appointments/rooms-view';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCan } from '@/hooks/use-can';

type View = 'rooms' | 'month' | 'week' | 'agenda';

const statusStyle: Record<Appointment['status'], string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  confirmed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  completed: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  cancelled: 'border-border bg-muted text-muted-foreground line-through',
  no_show: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

export default function AppointmentsPage() {
  const [view, setView] = useState<View>('rooms');
  const [cursor, setCursor] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [staff, setStaff] = useState<StaffSchedulingProfile[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [staffFilter, setStaffFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const canWrite = useCan('send-messages');

  const range = useMemo(() => {
    if (view === 'rooms') {
      const from = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate()
      );
      // Fetch a little padding around the day so blocks that start
      // before/after the visible grid still clamp into view.
      return {
        from: new Date(from.getTime() - 3_600_000),
        to: new Date(addDays(from, 1).getTime() + 3_600_000),
      };
    }
    if (view === 'month') {
      return {
        from: startOfWeek(startOfMonth(cursor)),
        to: addDays(endOfWeek(endOfMonth(cursor)), 1),
      };
    }
    if (view === 'week') {
      return { from: startOfWeek(cursor), to: addDays(endOfWeek(cursor), 1) };
    }
    return { from: new Date(0), to: addMonths(new Date(), 18) };
  }, [cursor, view]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      if (staffFilter) query.set('staff_profile_id', staffFilter);
      if (serviceFilter) query.set('service_id', serviceFilter);
      if (roomFilter) query.set('room_id', roomFilter);
      if (statusFilter) query.set('status', statusFilter);
      const [appointmentRes, serviceRes, staffRes, roomRes] = await Promise.all([
        fetch(`/api/appointments?${query}`),
        fetch('/api/appointment-services'),
        fetch('/api/appointment-staff'),
        fetch('/api/clinic-rooms'),
      ]);
      const [appointmentJson, serviceJson, staffJson, roomJson] =
        await Promise.all([
          appointmentRes.json(),
          serviceRes.json(),
          staffRes.json(),
          roomRes.json(),
        ]);
      if (!appointmentRes.ok) throw new Error(appointmentJson.error);
      setAppointments(appointmentJson.appointments ?? []);
      setServices(serviceJson.services ?? []);
      setStaff(staffJson.staff ?? []);
      setRooms(roomJson.rooms ?? []);
      const { data } = await createClient()
        .from('contacts')
        .select('id,name,phone')
        .order('name')
        .limit(500);
      setContacts((data ?? []) as Contact[]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load appointments'
      );
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, staffFilter, serviceFilter, roomFilter, statusFilter]);

  useEffect(() => void load(), [load]);

  const move = (direction: -1 | 1) => {
    setCursor((value) =>
      view === 'rooms'
        ? direction === 1
          ? addDays(value, 1)
          : addDays(value, -1)
        : view === 'month'
          ? direction === 1
            ? addMonths(value, 1)
            : subMonths(value, 1)
          : direction === 1
            ? addWeeks(value, 1)
            : subWeeks(value, 1)
    );
  };

  const days =
    view === 'month'
      ? Array.from(
          {
            length: Math.round(
              (range.to.getTime() - range.from.getTime()) / 86_400_000
            ),
          },
          (_, index) => addDays(range.from, index)
        )
      : Array.from({ length: 7 }, (_, index) => addDays(range.from, index));

  async function transition(
    appointment: Appointment,
    status: Appointment['status']
  ) {
    const response = await fetch(`/api/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error);
      return;
    }
    toast.success(`Appointment marked ${status.replace('_', ' ')}`);
    setSelected(null);
    await load();
  }

  async function reschedule(appointment: Appointment, startsAt: string) {
    const response = await fetch(`/api/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starts_at: new Date(startsAt).toISOString() }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error);
      return;
    }
    toast.success(
      `Appointment rescheduled · ${body.reminders_scheduled} reminders scheduled`
    );
    setSelected(null);
    await load();
  }

  async function assignRoom(appointment: Appointment, roomId: string) {
    const response = await fetch(`/api/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId || null }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error);
      return;
    }
    toast.success(
      roomId ? 'Room assigned' : 'Room cleared — appointment unassigned'
    );
    await load();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="border-primary/20 bg-primary/5 text-primary mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
            <Clock3 className="size-3" />
            Scheduling desk
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Book, confirm, and track every patient across your rooms.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!canWrite}>
          <Plus className="size-4" />
          New appointment
        </Button>
      </header>

      <section className="border-border bg-card overflow-hidden rounded-xl border shadow-[0_18px_60px_-36px_rgba(0,0,0,.85)]">
        <div className="border-border flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => move(-1)}
              aria-label="Previous period"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => move(1)}
              aria-label="Next period"
            >
              <ChevronRight className="size-4" />
            </Button>
            <p className="text-foreground ml-3 min-w-44 text-sm font-semibold">
              {view === 'rooms'
                ? format(cursor, 'EEEE, MMMM d, yyyy')
                : view === 'month'
                  ? format(cursor, 'MMMM yyyy')
                  : `${format(range.from, 'MMM d')} – ${format(addDays(range.to, -1), 'MMM d, yyyy')}`}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <FilterSelect
              value={staffFilter}
              onChange={setStaffFilter}
              label="All staff"
            >
              {staff.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.profile?.full_name ?? 'Team member'}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={serviceFilter}
              onChange={setServiceFilter}
              label="All services"
            >
              {services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              label="All statuses"
            >
              {[
                'pending',
                'confirmed',
                'completed',
                'cancelled',
                'no_show',
              ].map((item) => (
                <option key={item} value={item}>
                  {item.replace('_', ' ')}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={roomFilter}
              onChange={setRoomFilter}
              label="All rooms"
            >
              {rooms
                .filter((room) => room.is_active)
                .map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
            </FilterSelect>
            <div className="border-border bg-muted/40 flex rounded-lg border p-1">
              {(['rooms', 'month', 'week', 'agenda'] as View[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setView(item)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition',
                    view === item
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-96 items-center justify-center">
            <Loader2 className="text-primary size-6 animate-spin" />
          </div>
        ) : view === 'rooms' ? (
          <RoomsView
            day={cursor}
            rooms={rooms}
            appointments={appointments.filter((appointment) =>
              isSameDay(new Date(appointment.starts_at), cursor)
            )}
            onSelect={setSelected}
          />
        ) : view === 'agenda' ? (
          <Agenda appointments={appointments} onSelect={setSelected} />
        ) : (
          <div
            className={cn(
              'grid',
              view === 'month' ? 'grid-cols-7' : 'grid-cols-1 md:grid-cols-7'
            )}
          >
            {days.map((day) => {
              const items = appointments.filter((appointment) =>
                isSameDay(new Date(appointment.starts_at), day)
              );
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-border/70 min-h-36 border-r border-b p-2',
                    view === 'week' && 'md:min-h-[34rem]',
                    view === 'month' &&
                      day.getMonth() !== cursor.getMonth() &&
                      'bg-muted/20'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                        isSameDay(day, new Date())
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {format(day, view === 'week' ? 'd' : 'd')}
                    </span>
                    {view === 'week' && (
                      <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
                        {format(day, 'EEE')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((appointment) => (
                      <AppointmentPill
                        key={appointment.id}
                        appointment={appointment}
                        onClick={() => setSelected(appointment)}
                      />
                    ))}
                    {items.length === 0 && view === 'week' && (
                      <div className="text-muted-foreground/50 mt-10 text-center text-[11px]">
                        Open
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CreateAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        contacts={contacts}
        services={services}
        staff={staff}
        rooms={rooms}
        onCreated={load}
      />
      <AppointmentDetail
        appointment={selected}
        onClose={() => setSelected(null)}
        onTransition={transition}
        onReschedule={reschedule}
        onAssignRoom={assignRoom}
        rooms={rooms}
        canWrite={canWrite}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-border bg-background text-foreground focus:ring-primary/30 h-9 rounded-lg border px-3 text-xs outline-none focus:ring-2"
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}

function AppointmentPill({
  appointment,
  onClick,
}: {
  appointment: Appointment;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-md border px-2 py-1.5 text-left transition hover:-translate-y-px hover:shadow-md',
        statusStyle[appointment.status]
      )}
    >
      <span className="block text-[10px] font-semibold">
        {format(new Date(appointment.starts_at), 'h:mm a')}
      </span>
      <span className="block truncate text-xs font-medium">
        {appointment.contact?.name || appointment.contact?.phone}
      </span>
      <span className="block truncate text-[10px] opacity-75">
        {appointment.service?.name}
      </span>
    </button>
  );
}

function Agenda({
  appointments,
  onSelect,
}: {
  appointments: Appointment[];
  onSelect: (value: Appointment) => void;
}) {
  if (!appointments.length) return <EmptyState />;
  return (
    <div className="divide-border divide-y">
      {appointments.map((appointment) => (
        <button
          key={appointment.id}
          onClick={() => onSelect(appointment)}
          className="hover:bg-muted/40 grid w-full grid-cols-[72px_1fr_auto] items-center gap-4 px-4 py-3 text-left transition"
        >
          <div className="text-center">
            <p className="text-primary text-[10px] font-semibold tracking-widest uppercase">
              {format(new Date(appointment.starts_at), 'MMM')}
            </p>
            <p className="text-xl font-bold">
              {format(new Date(appointment.starts_at), 'd')}
            </p>
          </div>
          <div>
            <p className="font-medium">
              {appointment.contact?.name || appointment.contact?.phone}
            </p>
            <p className="text-muted-foreground text-xs">
              {appointment.service?.name} ·{' '}
              {format(new Date(appointment.starts_at), 'h:mm a')}
              {appointment.room ? ` · ${appointment.room.name}` : ''}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full border px-2 py-1 text-[10px] font-semibold capitalize',
              statusStyle[appointment.status]
            )}
          >
            {appointment.status.replace('_', ' ')}
          </span>
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center text-center">
      <div className="border-primary/20 bg-primary/10 mb-3 flex size-12 items-center justify-center rounded-2xl border">
        <CalendarDays className="text-primary size-5" />
      </div>
      <p className="font-medium">Your schedule is clear</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Create an appointment to start filling the calendar.
      </p>
    </div>
  );
}

function CreateAppointmentDialog({
  open,
  onOpenChange,
  contacts,
  services,
  staff,
  rooms,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  contacts: Contact[];
  services: AppointmentService[];
  staff: StaffSchedulingProfile[];
  rooms: ClinicRoom[];
  onCreated: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contact_id: '',
    service_id: '',
    staff_profile_id: '',
    room_id: '',
    starts_at: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    status: 'confirmed',
    notes: '',
  });

  // Single-dentist convenience: with exactly one bookable staff
  // profile there's nothing to choose — preselect it.
  useEffect(() => {
    if (staff.length === 1 && !form.staff_profile_id) {
      setForm((value) => ({ ...value, staff_profile_id: staff[0].id }));
    }
  }, [staff, form.staff_profile_id]);
  async function submit() {
    setSaving(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          starts_at: new Date(form.starts_at).toISOString(),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      toast.success(
        `Appointment created · ${body.reminders_scheduled} reminders scheduled`
      );
      onOpenChange(false);
      await onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not create appointment'
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Reserve time and automatically schedule eligible reminders.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Contact">
            <FilterSelect
              value={form.contact_id}
              onChange={(value) => setForm({ ...form, contact_id: value })}
              label="Choose a contact"
            >
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name || contact.phone}
                </option>
              ))}
            </FilterSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service">
              <FilterSelect
                value={form.service_id}
                onChange={(value) => setForm({ ...form, service_id: value })}
                label="Choose service"
              >
                {services
                  .filter((service) => service.is_active)
                  .map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
              </FilterSelect>
            </Field>
            <Field label="Staff">
              <FilterSelect
                value={form.staff_profile_id}
                onChange={(value) =>
                  setForm({ ...form, staff_profile_id: value })
                }
                label="Choose staff"
              >
                {staff
                  .filter((item) => item.is_bookable)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.profile?.full_name ?? 'Team member'}
                    </option>
                  ))}
              </FilterSelect>
            </Field>
          </div>
          <Field label="Room">
            <FilterSelect
              value={form.room_id}
              onChange={(value) => setForm({ ...form, room_id: value })}
              label="No room"
            >
              {rooms
                .filter((room) => room.is_active)
                .map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
            </FilterSelect>
          </Field>
          <Field label="Starts">
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) =>
                setForm({ ...form, starts_at: event.target.value })
              }
            />
          </Field>
          <Field label="Notes">
            <Input
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Access notes, preparation, special requests…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              saving ||
              !form.contact_id ||
              !form.service_id ||
              !form.staff_profile_id ||
              !form.starts_at
            }
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Reserve time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AppointmentDetail({
  appointment,
  onClose,
  onTransition,
  onReschedule,
  onAssignRoom,
  rooms,
  canWrite,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onTransition: (
    appointment: Appointment,
    status: Appointment['status']
  ) => Promise<void>;
  onReschedule: (appointment: Appointment, startsAt: string) => Promise<void>;
  onAssignRoom: (appointment: Appointment, roomId: string) => Promise<void>;
  rooms: ClinicRoom[];
  canWrite: boolean;
}) {
  if (!appointment) return null;
  const active = ['pending', 'confirmed'].includes(appointment.status);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle>{appointment.service?.name}</DialogTitle>
            <span
              className={cn(
                'rounded-full border px-2 py-1 text-[10px] font-semibold capitalize',
                statusStyle[appointment.status]
              )}
            >
              {appointment.status.replace('_', ' ')}
            </span>
          </div>
          <DialogDescription>
            Appointment revision {appointment.revision}
          </DialogDescription>
        </DialogHeader>
        <div className="border-border bg-muted/30 grid gap-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <UserRound className="text-primary size-4" />
            <span>
              {appointment.contact?.name || appointment.contact?.phone}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CalendarDays className="text-primary size-4" />
            <span>
              {format(new Date(appointment.starts_at), 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Clock3 className="text-primary size-4" />
            <span>
              {format(new Date(appointment.starts_at), 'h:mm a')} –{' '}
              {format(new Date(appointment.ends_at), 'h:mm a')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <DoorOpen className="text-primary size-4" />
            <span>{appointment.room?.name ?? 'No room assigned'}</span>
          </div>
        </div>
        {canWrite && active && (
          <AssignRoomControl
            appointment={appointment}
            rooms={rooms}
            onSave={onAssignRoom}
          />
        )}
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {appointment.status === 'pending' && (
              <Button
                size="sm"
                onClick={() => onTransition(appointment, 'confirmed')}
              >
                <Check className="size-4" />
                Confirm
              </Button>
            )}
            {appointment.status === 'confirmed' && (
              <>
                <Button
                  size="sm"
                  onClick={() => onTransition(appointment, 'completed')}
                >
                  <Check className="size-4" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTransition(appointment, 'no_show')}
                >
                  <MoreHorizontal className="size-4" />
                  No show
                </Button>
              </>
            )}
            {['pending', 'confirmed'].includes(appointment.status) && (
              <>
                <RescheduleControl
                  appointment={appointment}
                  onSave={onReschedule}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTransition(appointment, 'cancelled')}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RescheduleControl({
  appointment,
  onSave,
}: {
  appointment: Appointment;
  onSave: (appointment: Appointment, startsAt: string) => Promise<void>;
}) {
  const localValue = new Date(
    new Date(appointment.starts_at).getTime() -
      new Date().getTimezoneOffset() * 60_000
  )
    .toISOString()
    .slice(0, 16);
  const [value, setValue] = useState(localValue);
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <CalendarDays className="size-4" />
        Reschedule
      </Button>
    );
  }
  return (
    <div className="flex w-full gap-2">
      <Input
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button size="sm" onClick={() => onSave(appointment, value)}>
        Save
      </Button>
    </div>
  );
}

function AssignRoomControl({
  appointment,
  rooms,
  onSave,
}: {
  appointment: Appointment;
  rooms: ClinicRoom[];
  onSave: (appointment: Appointment, roomId: string) => Promise<void>;
}) {
  const [value, setValue] = useState(appointment.room_id ?? '');
  const [saving, setSaving] = useState(false);
  const activeRooms = rooms.filter((room) => room.is_active);
  const unchanged = value === (appointment.room_id ?? '');
  return (
    <div className="border-border bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border p-3">
      <DoorOpen className="text-primary size-4 shrink-0" />
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="border-border bg-background text-foreground focus:ring-primary/30 h-9 flex-1 rounded-lg border px-3 text-xs outline-none focus:ring-2"
        aria-label="Assign room"
      >
        <option value="">No room</option>
        {activeRooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={saving || unchanged}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(appointment, value);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        Assign
      </Button>
    </div>
  );
}
