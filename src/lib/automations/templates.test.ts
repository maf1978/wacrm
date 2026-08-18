import { describe, it, expect } from 'vitest'
import { getTemplate } from './templates'

describe('automation templates', () => {
  it('ships the GutiDental date-menu booking template', () => {
    const t = getTemplate('book_appointment_dates')
    expect(t).not.toBeNull()
    expect(t!.name).toContain('Reserva de cita')
    expect(t!.trigger_type).toBe('keyword_match')
    expect(t!.trigger_config).toMatchObject({
      keywords: expect.arrayContaining(['cita', 'reservar', 'agendar']),
      match_type: 'contains',
    })
    const step = t!.steps[0]
    expect(step.step_type).toBe('send_list')
    expect(step.step_config).toMatchObject({ kind: 'list' })
    // Rows must carry relative-day ids so the webhook can resolve the date.
    const config = step.step_config as {
      sections?: { rows?: { id: string }[] }[]
    }
    const ids = (config.sections ?? []).flatMap((s) => (s.rows ?? []).map((r) => r.id))
    expect(ids).toEqual(['date:+0', 'date:+1', 'date:+2'])
  })

  it('ships the slots template keyed to the date-menu replies', () => {
    const t = getTemplate('book_appointment_slots')
    expect(t).not.toBeNull()
    expect(t!.trigger_type).toBe('interactive_reply')
    expect(t!.trigger_config).toMatchObject({
      reply_ids: ['date:+0', 'date:+1', 'date:+2'],
    })
    const step = t!.steps[0]
    expect(step.step_type).toBe('offer_appointment_slots')
    expect(step.step_config).toMatchObject({
      date: '{{vars.date}}',
      limit: 10,
    })
    // Service must be filled in by the user before activation.
    expect('service_id' in step.step_config).toBe(true)
  })
})
