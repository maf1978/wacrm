'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import styles from './gutidental.module.css';

/**
 * Floating FAQ chat widget for the GutiDental landing page.
 *
 * Pure frontend — no backend, no phone required. Answers scripted
 * clinic FAQs via quick chips and keyword matching, with a typing
 * delay for a natural feel. When a real WhatsApp number is configured
 * (see page.tsx: WHATSAPP_NUMBER), the widget adds a "Agenda por
 * WhatsApp" handoff button in its messages.
 */

interface ChatMessage {
  id: number;
  role: 'bot' | 'user';
  text: string;
  action?: { label: string; href: string } | null;
}

interface FaqEntry {
  q: string;
  a: string;
  keywords: string[];
}

export function FAQChatWidget({
  whatsappEnabled,
  whatsappLink,
}: {
  whatsappEnabled: boolean;
  whatsappLink: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'bot',
      text: '¡Hola! 👋 Bienvenido a GutiDental. ¿En qué puedo ayudarte? Elige una opción o escribe tu pregunta.',
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  const FAQS: FaqEntry[] = [
    {
      q: '¿Cómo agendo una cita?',
      a: '¡Claro! Hacemos citas por WhatsApp: dime tu nombre y el motivo de tu visita y, si el horario está disponible, reservamos tu cita y te confirmamos con recordatorio automático el día anterior y dos horas antes.',
      keywords: ['cita', 'agendar', 'agenda', 'reservar', 'turno', 'cómo saco', 'disponible', 'disponibilidad'],
    },
    {
      q: '¿Cuál es el horario de atención?',
      a: 'Atendemos de 9:00 AM a 7:00 PM. Escríbenos por WhatsApp y te confirmamos la disponibilidad para hoy o los próximos días.',
      keywords: ['horario', 'hora', 'abierto', 'atienden', 'cuándo', 'días', 'trabajan'],
    },
    {
      q: '¿Qué servicios ofrecen?',
      a: 'Ofrecemos 4 servicios principales: 1) Exámenes dentales, 2) Limpieza dental, 3) Tratamiento de caries y 4) Empastes y reparación. También realizamos endodoncia y odontología cosmética.',
      keywords: ['servicio', 'servicios', 'tratamiento', 'tratamientos', 'qué hacen', 'ofrecen'],
    },
    {
      q: '¿Aceptan seguros? ¿Atienden sin seguro?',
      a: 'Atendemos sin seguro. Y si tienes seguro, aceptamos la mayoría de los seguros dentales, pero hay que chequear qué beneficios tienes para la parte dental: envíanos los datos de tu póliza y verificamos tu cobertura antes de la cita.',
      keywords: ['seguro', 'seguros', 'póliza', 'poliza', 'cobertura', 'beneficio', 'beneficios', 'pago', 'pagar', 'tarjeta', 'efectivo'],
    },
    {
      q: '¿Qué hago ante una urgencia dental?',
      a: 'Si tienes dolor intenso, inflamación o una fractura, escríbenos por WhatsApp de inmediato con una descripción del problema. Priorizamos las urgencias dentro de nuestro horario.',
      keywords: ['urgencia', 'dolor', 'emergencia', 'fractura', 'inflamación', 'sangrado', 'accidente'],
    },
    {
      q: '¿Dónde está la clínica?',
      a: 'Estamos en Hialeah, FL. Escríbenos por WhatsApp y te enviamos la ubicación exacta y las indicaciones.',
      keywords: ['dónde', 'donde', 'ubicación', 'ubicacion', 'dirección', 'direccion', 'hialeah', 'maps'],
    },
  ];

  useEffect(() => {
    bodyRef.current?.scrollTo({
      top: bodyRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, typing, open]);

  const pushBot = (text: string, action?: ChatMessage['action']) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: 'bot', text, action },
      ]);
    }, 750);
  };

  const answer = (question: string) => {
    const q = question.toLowerCase();
    const hit = FAQS.find((f) =>
      f.keywords.some((k) => q.includes(k))
    );
    if (hit) {
      pushBot(
        hit.a,
        whatsappEnabled
          ? { label: 'Agenda por WhatsApp', href: whatsappLink }
          : null
      );
      return;
    }
    pushBot(
      'Aún no tengo una respuesta exacta para eso. Prueba con una de las opciones rápidas o escríbenos y te ayudaremos personalmente.',
      whatsappEnabled
        ? { label: 'Hablar con la clínica', href: whatsappLink }
        : null
    );
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || typing) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: 'user', text: clean },
    ]);
    setInput('');
    answer(clean);
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={styles.chatFab}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat de GutiDental'}
        aria-expanded={open}
      >
        {open ? (
          <X size={22} />
        ) : (
          <>
            <MessageCircle size={22} />
            <span className={styles.chatFabPing} aria-hidden="true" />
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.chatPanel} role="dialog" aria-label="Chat de GutiDental">
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderBrand}>
              <span className={styles.chatHeaderIcon}>
                <MessageCircle size={15} />
              </span>
              <div>
                <p className={styles.chatHeaderTitle}>GutiDental</p>
                <p className={styles.chatHeaderSub}>Respondemos tus dudas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={styles.chatClose}
              aria-label="Cerrar chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.chatBody} ref={bodyRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot
                }
              >
                <p>{m.text}</p>
                {m.action && (
                  <a
                    href={m.action.href}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.chatAction}
                  >
                    {m.action.label}
                  </a>
                )}
              </div>
            ))}
            {typing && (
              <div className={styles.chatBubbleBot}>
                <p className={styles.chatTyping}>
                  <span />
                  <span />
                  <span />
                </p>
              </div>
            )}
            {messages.length === 1 && (
              <div className={styles.chatChips}>
                {FAQS.map((f) => (
                  <button
                    key={f.q}
                    type="button"
                    onClick={() => send(f.q)}
                    className={styles.chatChip}
                  >
                    {f.q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className={styles.chatForm}
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              aria-label="Escribe tu pregunta"
              className={styles.chatInput}
            />
            <button
              type="submit"
              className={styles.chatSend}
              aria-label="Enviar"
              disabled={!input.trim() || typing}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
