import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import styles from './gutidental.module.css';

// ============================================================
// GutiDental — business landing page (separate from the WACRM
// SaaS landing at `/`). Route: /gutidental
//
// ⚠️ Replace WHATSAPP_NUMBER with the clinic's real WhatsApp
// number (country code + number, digits only) before going live.
// ============================================================

const WHATSAPP_NUMBER = '1XXXXXXXXXX';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hola GutiDental, quiero agendar una cita.'
)}`;

const MAPS_LINK =
  'https://www.google.com/maps/search/?api=1&query=GutiDental+Hialeah+FL';

export const metadata: Metadata = {
  title: 'GutiDental — Clínica Dental en Hialeah, FL',
  description:
    'Odontología general, endodoncia y odontología cosmética en Hialeah, FL. Dr. Jorge Gutierrez. Abierto de 9:00 AM a 7:00 PM. Agenda por WhatsApp.',
  // This is a public business page — index it (the app-wide layout
  // defaults to noindex).
  robots: { index: true, follow: true },
  alternates: { canonical: '/gutidental' },
};

const SERVICES = [
  {
    icon: Stethoscope,
    title: 'Exámenes dentales',
    text: 'Evaluación completa de tu salud bucal y diagnóstico claro antes de cualquier tratamiento.',
  },
  {
    icon: Sparkles,
    title: 'Limpieza dental',
    text: 'Profilaxis y pulido profesional para mantener tu sonrisa sana y brillante.',
  },
  {
    icon: Smile,
    title: 'Tratamiento de caries',
    text: 'Detección temprana y restauración del diente para detener el daño a tiempo.',
  },
  {
    icon: Syringe,
    title: 'Empastes y reparación',
    text: 'Reemplazo o reparación de empastes existentes con materiales duraderos.',
  },
];

const FAQS = [
  {
    q: '¿Cómo agendo una cita?',
    a: 'Escríbenos por WhatsApp con tu nombre y el motivo de tu visita. Te ofrecemos los horarios disponibles y confirmamos tu cita, con recordatorio automático el día anterior y dos horas antes.',
  },
  {
    q: '¿Cuál es el horario de atención?',
    a: 'Atendemos de 9:00 AM a 7:00 PM. Escríbenos por WhatsApp y te confirmamos la disponibilidad para hoy o los próximos días.',
  },
  {
    q: '¿Aceptan seguros dentales?',
    a: 'Envía los datos de tu póliza por WhatsApp y te verificamos la cobertura antes de tu cita, sin compromiso.',
  },
  {
    q: '¿Qué hago ante una urgencia dental?',
    a: 'Si tienes dolor intenso, inflamación o una fractura, escríbenos por WhatsApp de inmediato con una descripción del problema. Priorizamos las urgencias dentro de nuestro horario.',
  },
];

function ToothIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C9 2 6.5 3.8 5.2 6.5 4.3 8.4 3.8 10.6 4.5 13c.5 1.9 1 3.7 1.6 5.4.3.9.9 1.8 1.9 1.8 1.1 0 1.6-.9 1.9-1.8.3-.9.5-1.8 1.1-2.4.8-.8 1.9-.8 2.7 0 .6.6.8 1.5 1.1 2.4.3.9.8 1.8 1.9 1.8 1 0 1.6-.9 1.9-1.8.6-1.7 1.1-3.5 1.6-5.4.7-2.4.2-4.6-.7-6.5C17.5 3.8 15 2 12 2z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function GutiDentalPage() {
  return (
    <main className={styles.page}>
      {/* Topbar */}
      <header className={`${styles.container} ${styles.topbar}`}>
        <a href="#inicio" className={styles.brand}>
          <span className={styles.brandMark}>
            <ToothIcon />
          </span>
          <span>
            GutiDental
            <small>Clínica dental · Hialeah, FL</small>
          </span>
        </a>
        <div className={styles.topActions}>
          <span className={styles.hoursBadge}>
            <Clock3 width={13} height={13} />
            9:00 AM – 7:00 PM
          </span>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className={styles.btnPrimarySm}>
            <WhatsAppIcon />
            Agenda por WhatsApp
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className={`${styles.container} ${styles.hero}`}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck width={13} height={13} />
            Perfil verificado en Google
          </p>
          <h1 className={styles.h1}>
            Tu sonrisa, en{' '}
            <span className={styles.accent}>buenas manos</span>.
          </h1>
          <p className={styles.sub}>
            GutiDental es la clínica dental del{' '}
            <strong>Dr. Jorge Gutierrez</strong> en Hialeah, FL — atención
            personalizada en odontología general, endodoncia y odontología
            cosmética.
          </p>

          <div className={styles.ratingRow}>
            <span className={styles.stars} aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} width={15} height={15} fill="currentColor" />
              ))}
            </span>
            <span>
              <strong>5.0</strong> · 6 reseñas en Google
            </span>
          </div>

          <div className={styles.ctaRow}>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className={styles.btnPrimary}>
              <WhatsAppIcon />
              Agenda por WhatsApp
            </a>
            <a href="#servicios" className={styles.btnGhost}>
              Ver servicios
            </a>
          </div>
        </div>

        {/* Identity card */}
        <aside className={styles.heroCard} aria-label="Información de la clínica">
          <div className={styles.heroCardHead}>
            <span className={styles.brandMarkLarge}>
              <ToothIcon />
            </span>
            <div>
              <p className={styles.heroCardName}>GutiDental</p>
              <p className={styles.heroCardMeta}>Hialeah, FL</p>
            </div>
          </div>
          <ul className={styles.specialtyList}>
            <li>Odontología general</li>
            <li>Endodoncia</li>
            <li>Odontología cosmética</li>
          </ul>
          <div className={styles.heroCardFooter}>
            <div>
              <Clock3 width={14} height={14} />
              <span>
                Abierto hoy
                <small>9:00 AM – 7:00 PM</small>
              </span>
            </div>
            <div>
              <Star width={14} height={14} fill="currentColor" />
              <span>
                5.0
                <small>6 reseñas</small>
              </span>
            </div>
          </div>
        </aside>
      </section>

      {/* Services */}
      <section id="servicios" className={`${styles.container} ${styles.section}`}>
        <p className={styles.sectionEyebrow}>Servicios</p>
        <h2 className={styles.sectionTitle}>Cuidamos cada detalle de tu sonrisa</h2>
        <div className={styles.servicesGrid}>
          {SERVICES.map(({ icon: Icon, title, text }) => (
            <article key={title} className={styles.serviceCard}>
              <span className={styles.serviceIcon}>
                <Icon width={20} height={20} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p className={styles.servicesNote}>
          También realizamos <strong>endodoncia</strong> y{' '}
          <strong>odontología cosmética</strong> — consulta por WhatsApp para
          conocer todos nuestros tratamientos.
        </p>
      </section>

      {/* Hours + Location */}
      <section id="ubicacion" className={`${styles.container} ${styles.section}`}>
        <p className={styles.sectionEyebrow}>Visítanos</p>
        <h2 className={styles.sectionTitle}>Horario y ubicación</h2>
        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <span className={styles.infoIcon}>
              <Clock3 width={20} height={20} />
            </span>
            <div>
              <h3>Horario</h3>
              <p className={styles.infoBig}>9:00 AM – 7:00 PM</p>
              <p className={styles.infoSmall}>
                Escríbenos por WhatsApp para confirmar disponibilidad.
              </p>
            </div>
          </article>
          <article className={styles.infoCard}>
            <span className={styles.infoIcon}>
              <MapPin width={20} height={20} />
            </span>
            <div>
              <h3>Ubicación</h3>
              <p className={styles.infoBig}>Hialeah, FL</p>
              <a href={MAPS_LINK} target="_blank" rel="noreferrer" className={styles.textLink}>
                Ver en Google Maps →
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={`${styles.container} ${styles.section}`}>
        <p className={styles.sectionEyebrow}>Preguntas frecuentes</p>
        <h2 className={styles.sectionTitle}>Resolvemos tus dudas</h2>
        <div className={styles.faqList}>
          {FAQS.map(({ q, a }) => (
            <details key={q} className={styles.faqItem}>
              <summary>
                {q}
                <span className={styles.faqPlus} aria-hidden="true">
                  +
                </span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <h2>¿Listo para tu próxima visita?</h2>
          <p>
            Agenda hoy mismo por WhatsApp y confirma tu cita en minutos.
          </p>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className={styles.btnPrimary}>
            <WhatsAppIcon />
            Agenda por WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerRow}>
            <span className={styles.brand}>
              <span className={styles.brandMark}>
                <ToothIcon />
              </span>
              <span>
                GutiDental
                <small>Clínica dental · Hialeah, FL</small>
              </span>
            </span>
            <Link href="/login" className={styles.footerLink}>
              <MessageCircle width={13} height={13} />
              Acceso del equipo
            </Link>
          </div>
          <p className={styles.footerLegal}>
            © {new Date().getFullYear()} GutiDental · Hialeah, FL ·{' '}
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
              Agenda por WhatsApp
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
