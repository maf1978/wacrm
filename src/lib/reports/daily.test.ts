import { describe, it, expect } from 'vitest'
import {
  buildDailyReport,
  handoffPercent,
  tokensOf,
  topTopics,
  type DailyMetrics,
} from './daily'

const base: DailyMetrics = {
  dateLabel: 'lunes, 17 de agosto',
  conversationsNew: 12,
  conversationsActive: 8,
  unanswered: 5,
  newContacts: 8,
  customerMessages: 47,
  aiReplies: 20,
  handoffs: 3,
  appointmentsTotal: 4,
  appointmentsWhatsApp: 3,
  topics: ['limpieza', 'cita', 'seguro'],
}

describe('buildDailyReport', () => {
  it('renders every metric section', () => {
    const body = buildDailyReport(base)
    expect(body).toContain('lunes, 17 de agosto')
    expect(body).toContain('12 nuevas')
    expect(body).toContain('5 sin responder')
    expect(body).toContain('Contactos nuevos: 8')
    expect(body).toContain('47')
    expect(body).toContain('20 respuestas automáticas')
    expect(body).toContain('3 derivaron a humano (15%)')
    expect(body).toContain('4 (3 por WhatsApp)')
    expect(body).toContain('limpieza, cita, seguro')
  })

  it('reports zero AI usage without a handoff ratio', () => {
    const body = buildDailyReport({ ...base, aiReplies: 0, handoffs: 0 })
    expect(body).toContain('sin respuestas automáticas hoy')
    expect(body).not.toContain('%')
  })

  it('omits the topics line when there are no topics', () => {
    const body = buildDailyReport({ ...base, topics: [] })
    expect(body).not.toContain('Temas')
  })
})

describe('topTopics', () => {
  it('ranks the most mentioned words across messages', () => {
    const topics = topTopics([
      'quiero una cita para limpieza',
      'me duele y necesito cita urgente',
      'cuanto cuesta una limpieza',
    ])
    expect(topics[0]).toBe('cita')
    expect(topics.slice(0, 3)).toEqual(
      expect.arrayContaining(['limpieza', 'cita']),
    )
  })

  it('ignores stopwords, numbers, case and accents', () => {
    expect(topTopics(['HOLA quiero CITA mañana a las 3'])).toEqual(['cita'])
    expect(topTopics(['sí no y de la el un una para'])).toEqual([])
  })

  it('caps at the requested n', () => {
    const topics = topTopics(
      'a b c d e f g h'.split(' ').map((w) => `palabra ${w}`),
      3,
    )
    expect(topics.length).toBeLessThanOrEqual(3)
  })
})

describe('tokensOf', () => {
  it('normalizes accents and lowercases', () => {
    expect(tokensOf('EXTRACCIÓN')).toContain('extraccion')
  })

  it('filters stopwords', () => {
    expect(tokensOf('quiero una cita')).not.toContain('quiero')
  })
})

describe('handoffPercent', () => {
  it('rounds the ratio and guards division by zero', () => {
    expect(handoffPercent(20, 3)).toBe(15)
    expect(handoffPercent(0, 0)).toBe(0)
  })
})
