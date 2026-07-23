# Native appointments

Migration `037_appointments.sql` adds services, bookable staff,
availability, appointments, audit events, reminder policies, and the
durable reminder queue.

## Production setup

1. Apply all Supabase migrations.
2. Set `AUTOMATION_CRON_SECRET` and optionally
   `APPOINTMENT_ACTION_SECRET`.
3. Call `GET /api/appointments/cron` every minute with
   `x-cron-secret: <AUTOMATION_CRON_SECRET>`.
4. In **Settings → Scheduling**, set the account timezone, add
   services, enable staff, and select approved Meta Utility templates
   for the default 24-hour and 2-hour reminder rules.

The appointment cron is deliberately separate from the generic
automation cron. A failure in one queue cannot prevent the other from
draining.

## WhatsApp booking

Use the automation builder's **Offer appointment slots** action after a
keyword or flow trigger. It sends up to ten live slots as a WhatsApp
list. Each row carries a short-lived signed action id. The webhook
revalidates the signature, account, contact, availability, and database
overlap constraint before confirming the booking.

Appointment lifecycle triggers can then send confirmations or branch
into follow-up workflows. Appointment variables include:

- `{{appointment.start_time}}`
- `{{appointment.local_date}}`
- `{{appointment.local_time}}`
- `{{appointment.service_name}}`
- `{{appointment.staff_name}}`
- `{{appointment.manage_action}}`

Reminder templates receive customer, service, staff, local date, local
time, and business name as positional parameters.
