import { describe, it, expect } from 'vitest'
import { AUTOMATION_TEMPLATES, getTemplate } from './templates'

describe('automation templates', () => {
  it('ships the GutiDental "Reserva de cita" booking template', () => {
    const t = getTemplate('book_appointment')
    expect(t).not.toBeNull()
    expect(t!.name).toBe('Reserva de cita')
    expect(t!.trigger_type).toBe('keyword_match')
    expect(t!.trigger_config).toMatchObject({
      keywords: expect.arrayContaining(['cita', 'reservar', 'agendar']),
      match_type: 'contains',
    })
  })

  it('books via offer_appointment_slots on today ({{vars.date}})', () => {
    const t = AUTOMATION_TEMPLATES.book_appointment
    const step = t.steps[0]
    expect(step.step_type).toBe('offer_appointment_slots')
    expect(step.step_config).toMatchObject({
      date: '{{vars.date}}',
      limit: 10,
    })
    // Service must be filled in by the user before activation.
    expect('service_id' in step.step_config).toBe(true)
  })
})
