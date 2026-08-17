'use client';

import { useEffect, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  DoorOpen,
  Loader2,
  Plus,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  AppointmentReminderRule,
  AppointmentService,
  ClinicRoom,
  StaffSchedulingProfile,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCan } from '@/hooks/use-can';

type Template = { id: string; name: string; language?: string };
type Member = { user_id: string; full_name: string };

export function SchedulingSettings() {
  const canEdit = useCan('edit-settings');
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [staff, setStaff] = useState<StaffSchedulingProfile[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [rules, setRules] = useState<AppointmentReminderRule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState('');
  const [duration, setDuration] = useState('60');
  const [roomName, setRoomName] = useState('');
  const [roomColor, setRoomColor] = useState('#0ea5e9');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  async function load() {
    setLoading(true);
    const [
      serviceRes,
      staffRes,
      reminderRes,
      membersRes,
      settingsRes,
      roomsRes,
    ] = await Promise.all([
      fetch('/api/appointment-services'),
      fetch('/api/appointment-staff'),
      fetch('/api/appointment-reminders'),
      fetch('/api/account/members'),
      fetch('/api/appointment-settings'),
      fetch('/api/clinic-rooms'),
    ]);
    const [
      serviceJson,
      staffJson,
      reminderJson,
      membersJson,
      settingsJson,
      roomsJson,
    ] = await Promise.all([
      serviceRes.json(),
      staffRes.json(),
      reminderRes.json(),
      membersRes.json(),
      settingsRes.json(),
      roomsRes.json(),
    ]);
    setServices(serviceJson.services ?? []);
    setStaff(staffJson.staff ?? []);
    setRules(reminderJson.rules ?? []);
    setTemplates(reminderJson.templates ?? []);
    setMembers(membersJson.members ?? []);
    setRooms(roomsJson.rooms ?? []);
    setTimezone(
      settingsJson.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    setLoading(false);
  }
  useEffect(() => {
    // Initial remote-state synchronization; load updates after awaiting fetches.
    void load();
  }, []);

  async function addService() {
    const response = await fetch('/api/appointment-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: serviceName,
        duration_minutes: Number(duration),
      }),
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error);
    setServiceName('');
    toast.success('Service added');
    await load();
  }

  async function toggleService(service: AppointmentService) {
    await fetch(`/api/appointment-services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !service.is_active }),
    });
    await load();
  }

  async function addRoom() {
    if (!roomName.trim()) return;
    const response = await fetch('/api/clinic-rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: roomName.trim(), color: roomColor }),
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error);
    setRoomName('');
    toast.success('Room added');
    await load();
  }

  async function updateRoom(
    room: ClinicRoom,
    patch: { name?: string; color?: string; is_active?: boolean }
  ) {
    const response = await fetch(`/api/clinic-rooms/${room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error);
    await load();
  }

  async function deleteRoom(room: ClinicRoom) {
    if (
      !window.confirm(
        `Delete "${room.name}"? Appointments in it become unassigned.`
      )
    ) {
      return;
    }
    const response = await fetch(`/api/clinic-rooms/${room.id}`, {
      method: 'DELETE',
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error);
    toast.success('Room deleted');
    await load();
  }

  async function addStaff(userId: string) {
    if (!userId) return;
    const response = await fetch('/api/appointment-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error);
    await fetch(`/api/appointment-staff/${body.staff.id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rules: [1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          start_time: '09:00',
          end_time: '17:00',
        })),
      }),
    });
    toast.success('Staff scheduling enabled with weekday availability');
    await load();
  }

  async function saveRules() {
    const response = await fetch('/api/appointment-reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error);
    toast.success('Reminder policy saved');
    await load();
  }

  async function saveTimezone() {
    const response = await fetch('/api/appointment-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone }),
    });
    const body = await response.json();
    if (!response.ok) return toast.error(body.error);
    toast.success('Scheduling timezone saved');
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="text-primary size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <Heading
          icon={CalendarClock}
          title="Scheduling timezone"
          description="The default timezone used for staff setup, slot labels, and new appointments."
        />
        <div className="mt-4 flex gap-2">
          <Input
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            disabled={!canEdit}
            placeholder="America/New_York"
          />
          <Button variant="outline" onClick={saveTimezone} disabled={!canEdit}>
            Save
          </Button>
        </div>
      </Card>
      <Card className="p-5">
        <Heading
          icon={DoorOpen}
          title="Rooms"
          description="Your operatories. The Rooms board in Appointments shows one column per active room — add, rename, recolor, or deactivate them here."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto]">
          <input
            type="color"
            value={roomColor}
            onChange={(event) => setRoomColor(event.target.value)}
            disabled={!canEdit}
            className="border-border bg-background h-9 w-12 cursor-pointer rounded-lg border p-1"
            aria-label="New room color"
          />
          <Input
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            placeholder="Room 4…"
            disabled={!canEdit}
          />
          <Button onClick={addRoom} disabled={!canEdit || !roomName.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <div className="divide-border border-border mt-4 divide-y rounded-lg border">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex flex-wrap items-center gap-3 px-3 py-2.5"
            >
              <input
                type="color"
                value={room.color}
                onChange={(event) =>
                  void updateRoom(room, { color: event.target.value })
                }
                disabled={!canEdit}
                className="border-border bg-background h-7 w-9 cursor-pointer rounded border p-0.5"
                aria-label={`${room.name} color`}
              />
              <Input
                key={room.id}
                defaultValue={room.name}
                onBlur={(event) => {
                  const name = event.target.value.trim();
                  if (name && name !== room.name) {
                    void updateRoom(room, { name });
                  } else {
                    event.target.value = room.name;
                  }
                }}
                disabled={!canEdit}
                className="h-8 min-w-32 flex-1"
              />
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Switch
                  checked={room.is_active}
                  onCheckedChange={(checked) =>
                    void updateRoom(room, { is_active: checked })
                  }
                  disabled={!canEdit}
                />
                Active
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void deleteRoom(room)}
                disabled={!canEdit}
                aria-label={`Delete ${room.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {!rooms.length && (
            <p className="text-muted-foreground p-4 text-sm">
              No rooms yet.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <Heading
          icon={CalendarClock}
          title="Services"
          description="Durations drive slot discovery and conflict protection."
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
          <Input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="Consultation, estimate, installation…"
            disabled={!canEdit}
          />
          <Input
            type="number"
            min={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={!canEdit}
          />
          <Button
            onClick={addService}
            disabled={!canEdit || !serviceName.trim()}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <div className="divide-border border-border mt-4 divide-y rounded-lg border">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{service.name}</p>
                <p className="text-muted-foreground text-xs">
                  {service.duration_minutes} minutes
                </p>
              </div>
              <Switch
                checked={service.is_active}
                onCheckedChange={() => toggleService(service)}
                disabled={!canEdit}
              />
            </div>
          ))}
          {!services.length && (
            <p className="text-muted-foreground p-4 text-sm">
              No services yet.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <Heading
          icon={UsersRound}
          title="Bookable staff"
          description="New staff receive Monday–Friday, 9–5 availability in their local timezone."
        />
        <select
          className="border-border bg-background mt-4 h-9 w-full rounded-lg border px-3 text-sm"
          defaultValue=""
          disabled={!canEdit}
          onChange={(event) => {
            void addStaff(event.target.value);
            event.currentTarget.value = '';
          }}
        >
          <option value="">Enable scheduling for a team member…</option>
          {members
            .filter(
              (member) => !staff.some((item) => item.user_id === member.user_id)
            )
            .map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name}
              </option>
            ))}
        </select>
        <div className="mt-4 flex flex-wrap gap-2">
          {staff.map((item) => (
            <span
              key={item.id}
              className="border-border bg-muted rounded-full border px-3 py-1.5 text-xs"
            >
              {item.profile?.full_name ?? 'Team member'} · {item.timezone}
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <Heading
          icon={BellRing}
          title="WhatsApp reminders"
          description="Defaults are 24 hours and 2 hours. They remain off until an approved Utility template is selected."
        />
        <div className="mt-4 space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="border-border grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[140px_1fr_auto]"
            >
              <div>
                <Label>Minutes before</Label>
                <Input
                  type="number"
                  min={1}
                  value={rule.offset_minutes}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, offset_minutes: Number(e.target.value) }
                          : item
                      )
                    )
                  }
                />
              </div>
              <div>
                <Label>Approved utility template</Label>
                <select
                  className="border-border bg-background h-9 w-full rounded-lg border px-3 text-sm"
                  value={rule.template_id ?? ''}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              template_id: e.target.value || null,
                              is_active: e.target.value
                                ? item.is_active
                                : false,
                            }
                          : item
                      )
                    )
                  }
                >
                  <option value="">Choose a template…</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex h-9 items-center gap-2">
                <Switch
                  checked={rule.is_active}
                  disabled={!canEdit || !rule.template_id}
                  onCheckedChange={(checked) =>
                    setRules((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, is_active: checked } : item
                      )
                    )
                  }
                />
                <span className="text-muted-foreground text-xs">Active</span>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={saveRules} disabled={!canEdit}>
          Save reminder policy
        </Button>
      </Card>
    </div>
  );
}

function Heading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarClock;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
      </div>
    </div>
  );
}
