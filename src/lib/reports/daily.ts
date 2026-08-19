// ============================================================
// Daily report — pure helpers for the nightly conversation report.
//
// The endpoint (`/api/reports/nightly`) fetches the counts; these
// functions turn them into the report body text and extract the
// most-mentioned topics from customer messages. Kept pure so they
// are unit-testable without a database.
// ============================================================

export interface DailyMetrics {
  /** Local label, e.g. "lunes, 17 de agosto". */
  dateLabel: string
  conversationsNew: number
  conversationsActive: number
  unanswered: number
  newContacts: number
  customerMessages: number
  aiReplies: number
  handoffs: number
  appointmentsTotal: number
  appointmentsWhatsApp: number
  /** Top mentioned topics (already ranked). */
  topics: string[]
}

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'que', 'por', 'para',
  'con', 'un', 'una', 'unos', 'unas', 'me', 'mi', 'mis', 'te', 'tu', 'se',
  'su', 'sus', 'es', 'son', 'estoy', 'esta', 'estas', 'este', 'esto', 'hay',
  'quiero', 'necesito', 'hola', 'buenas', 'buenos', 'dias', 'tardes',
  'noches', 'gracias', 'porfa', 'favor', 'puedo', 'pueden', 'podria',
  'puedes', 'tengo', 'tiene', 'tener', 'hacer', 'hace', 'hacerte', 'soy',
  'eres', 'ser', 'si', 'no', 'sí', 'ya', 'bien', 'muy', 'mas', 'más',
  'menos', 'todo', 'toda', 'todos', 'todas', 'nada', 'algo', 'otra', 'otro',
  'otros', 'ahora', 'hoy', 'manana', 'mañana', 'ayer', 'día', 'dia', 'vez',
  'veces', 'cuando', 'cuanto', 'donde', 'como', 'cual', 'cuales', 'cualquier',
])

/** Normalize + tokenize a message body for topic frequency. */
export function tokensOf(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (normalized.match(/[a-zñáéíóúü0-9]{3,}/g) ?? []).filter(
    (word) => !STOPWORDS.has(word) && !/^\d+$/.test(word),
  )
}

/** Rank the n most-mentioned topics across customer messages. */
export function topTopics(messages: string[], n = 5): string[] {
  const counts = new Map<string, number>()
  for (const text of messages) {
    for (const word of tokensOf(text)) {
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([word]) => word)
}

/** Percentage of AI replies that ended in a human handoff. */
export function handoffPercent(aiReplies: number, handoffs: number): number {
  if (aiReplies <= 0) return 0
  return Math.round((handoffs / aiReplies) * 100)
}

/** Build the plain-text report body shown in the notification. */
export function buildDailyReport(m: DailyMetrics): string {
  const lines: string[] = [
    `📊 Reporte del día — ${m.dateLabel}`,
    '',
    `💬 Conversaciones: ${m.conversationsNew} nuevas · ${m.conversationsActive} activas · ${m.unanswered} sin responder`,
    `👥 Contactos nuevos: ${m.newContacts} · Mensajes de pacientes: ${m.customerMessages}`,
    '',
  ]

  const pct = handoffPercent(m.aiReplies, m.handoffs)
  if (m.aiReplies > 0) {
    lines.push(
      `🤖 Bot IA: ${m.aiReplies} respuestas automáticas · ${m.handoffs} derivaron a humano (${pct}%)`,
    )
  } else {
    lines.push('🤖 Bot IA: sin respuestas automáticas hoy')
  }

  lines.push(
    '',
    `🦷 Citas creadas: ${m.appointmentsTotal} (${m.appointmentsWhatsApp} por WhatsApp)`,
  )

  if (m.topics.length > 0) {
    lines.push('', `🔝 Temas: ${m.topics.join(', ')}`)
  }

  return lines.join('\n')
}
