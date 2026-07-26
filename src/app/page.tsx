/*
THESIS: WACRM turns every conversation into a visible route toward action; it refuses the standard SaaS hero-plus-card-grid.
OWN-WORLD: Cool operational paper, graphite infrastructure, teal/cobalt/amber signals, condensed display type, and routed state labels.
STORY: A message enters, AI decides, automations act, and the team grows; the visitor requests a demonstration.
FIRST VIEWPORT: Promise at left, stage 01 proof at right, a central vertical route connecting both, and the demo action above the fold.
FORM: Vertical signal spine, ranked third in the structure exploration, approved composition C, direction seed 3f8c7fc5.
*/

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  Bot,
  CalendarCheck,
  Check,
  Clock3,
  GitBranch,
  LogIn,
  Megaphone,
  MessageCircle,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Zap,
} from 'lucide-react';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'WACRM — Convierte conversaciones en acción',
  description:
    'Centraliza WhatsApp, citas, automatizaciones, agentes de IA y publicación social en una plataforma instalable.',
};

const capabilities = [
  ['WhatsApp', 'Bandeja compartida y campañas', MessageCircle, 'teal'],
  ['Citas', 'Agenda, confirmación y recordatorios', CalendarCheck, 'amber'],
  ['Automatizaciones', 'Flujos visuales y disparadores', GitBranch, 'blue'],
  ['Agentes IA', 'Conocimiento y transferencia humana', Bot, 'blue'],
  ['Publicación social', 'Planificación multicanal con Zernio', Send, 'teal'],
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className={styles.brand} aria-label="WACRM inicio">
            <span>WACRM</span>
            <small>Centro de rutas conversacionales</small>
          </Link>

          <div className={styles.systemStatus} aria-label="Estado del sistema">
            <span />
            Sistema activo
          </div>

          <nav aria-label="Navegación principal">
            <a href="#producto">Producto</a>
            <a href="#soluciones">Soluciones</a>
            <a href="#integraciones">Integraciones</a>
          </nav>

          <div className={styles.navActions}>
            <Link href="/login" className={styles.login}>
              <LogIn size={15} />
              Iniciar sesión
            </Link>
            <Link href="/signup?intent=demo" className={styles.demoButton}>
              Solicitar demostración
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.routeWorld}>
        <div className={styles.routeRail} aria-hidden="true" />

        <section id="producto" className={`${styles.routeSection} ${styles.hero}`}>
          <div className={styles.heroCopy}>
            <p className={styles.routeLabel}>
              <Radio size={14} />
              Ruta RC-01 · Operación conectada
            </p>
            <h1>
              Del mensaje
              <br />
              al resultado,
              <br />
              <em>sin cambiar de plataforma.</em>
            </h1>
            <p className={styles.lead}>
              WACRM centraliza WhatsApp, organiza citas, automatiza procesos,
              potencia a tu equipo con IA y publica en redes sociales.
            </p>
            <div className={styles.heroActions}>
              <Link href="/signup?intent=demo" className={styles.demoButton}>
                Solicitar demostración
                <ArrowRight size={18} />
              </Link>
              <a href="#recorrido" className={styles.textAction}>
                Ver el recorrido
                <ArrowDown size={16} />
              </a>
            </div>
            <div className={styles.installable}>
              <ShieldCheck size={18} />
              <span>
                <strong>Instalable y controlado por ti.</strong>
                Tu infraestructura, configuración y datos.
              </span>
            </div>
          </div>

          <RouteMarker number="01" label="Mensaje" tone="teal" icon={<MessageCircle />} />

          <div className={styles.proofColumn}>
            <ProofHeader label="Ejemplo demostrativo" code="MSG-001" status="Recibido" />
            <div className={styles.chatDemo}>
              <div className={styles.chatSource}>
                <MessageCircle size={19} />
                <strong>WhatsApp</strong>
                <span>Conectado</span>
              </div>
              <div className={styles.incoming}>
                Hola, quiero agendar una cita para mañana en la tarde.
                <time>09:31</time>
              </div>
              <div className={styles.outgoing}>
                ¡Listo! ¿A qué hora te viene mejor?
                <time>09:31 · Entregado</time>
              </div>
            </div>
            <RouteTicket
              code="RC-01"
              rows={[
                ['Estado', 'Recibido'],
                ['Canal', 'WhatsApp'],
                ['Fuente', 'Chat entrante'],
              ]}
            />
          </div>
        </section>

        <section id="recorrido" className={`${styles.routeSection} ${styles.stage}`}>
          <div className={styles.proofColumn}>
            <ProofHeader label="Ejemplo demostrativo" code="IA-002" status="Evaluando" />
            <div className={styles.analysisDemo}>
              <div className={styles.analysisTop}>
                <Sparkles size={19} />
                <strong>Análisis de intención</strong>
              </div>
              <dl>
                <div><dt>Intención</dt><dd>Agendar cita</dd></div>
                <div><dt>Prioridad</dt><dd>Media</dd></div>
                <div><dt>Siguiente acción</dt><dd>Consultar disponibilidad</dd></div>
              </dl>
              <div className={styles.confidence}>
                <span>Contexto suficiente</span>
                <b>Listo para actuar</b>
              </div>
            </div>
          </div>

          <RouteMarker number="02" label="Decide" tone="blue" icon={<Bot />} />

          <div className={styles.stageCopy}>
            <p className={styles.routeLabel}>Agentes IA + conocimiento</p>
            <h2>Entiende la intención. Decide el siguiente paso.</h2>
            <p>
              Los agentes de IA responden con la información de tu negocio,
              clasifican la conversación y saben cuándo transferirla a una persona.
            </p>
            <ul>
              <li><Check /> Base de conocimiento propia</li>
              <li><Check /> Límites y transferencia configurables</li>
              <li><Check /> Contexto completo para el equipo</li>
            </ul>
          </div>
        </section>

        <section className={`${styles.routeSection} ${styles.stage}`}>
          <div className={styles.stageCopy}>
            <p className={styles.routeLabel}>Flujos + agenda</p>
            <h2>Automatiza y ejecuta sin perder el control.</h2>
            <p>
              Diseña recorridos visuales, coordina disponibilidad y dispara
              recordatorios que se invalidan correctamente si la cita cambia.
            </p>
            <ul>
              <li><Check /> Constructor visual sin código</li>
              <li><Check /> Horarios, servicios y personal</li>
              <li><Check /> Recordatorios de WhatsApp configurables</li>
            </ul>
          </div>

          <RouteMarker number="03" label="Actúa" tone="amber" icon={<Zap />} />

          <div className={styles.proofColumn}>
            <ProofHeader label="Ejemplo demostrativo" code="AUT-003" status="En ejecución" />
            <div className={styles.workflowDemo}>
              <div className={styles.appointment}>
                <CalendarCheck size={22} />
                <span><small>Próxima cita</small><strong>Mañana · 15:00</strong></span>
                <b>Confirmada</b>
              </div>
              <div className={styles.workflowSteps}>
                <span><i /> Mensaje entrante <b>Completado</b></span>
                <span><i /> Verificar disponibilidad <b>Completado</b></span>
                <span><i /> Proponer opciones <b>Completado</b></span>
                <span><i /> Programar recordatorios <b>Activo</b></span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.routeSection} ${styles.stage}`}>
          <div className={styles.proofColumn}>
            <ProofHeader label="Ejemplo demostrativo" code="OPS-004" status="Coordinado" />
            <div className={styles.growthDemo}>
              <div>
                <Megaphone size={24} />
                <span><small>Publicación social</small><strong>Contenido programado</strong></span>
              </div>
              <div>
                <UserRoundCheck size={24} />
                <span><small>Transferencia</small><strong>Agente con contexto</strong></span>
              </div>
              <div>
                <Clock3 size={24} />
                <span><small>Seguimiento</small><strong>Próxima acción lista</strong></span>
              </div>
            </div>
          </div>

          <RouteMarker number="04" label="Crece" tone="teal" icon={<ArrowRight />} />

          <div className={styles.stageCopy}>
            <p className={styles.routeLabel}>Un sistema, múltiples canales</p>
            <h2>Crea experiencias consistentes. Haz crecer tu operación.</h2>
            <p>
              Atiende, agenda, automatiza y publica desde una plataforma
              multiempresa preparada para equipos y procesos reales.
            </p>
            <div className={styles.roleStrip}>
              <span>Propietario</span><span>Administrador</span><span>Agente</span><span>Observador</span>
            </div>
          </div>
        </section>
      </div>

      <section id="soluciones" className={styles.capabilitySection}>
        <div className={styles.capabilityLead}>
          <p>Motor operativo WACRM</p>
          <h2>Cada módulo comparte el mismo contexto.</h2>
        </div>
        <div className={styles.capabilityList}>
          {capabilities.map(([title, copy, Icon, tone], index) => (
            <article key={title}>
              <span className={`${styles.capabilityCode} ${styles[tone]}`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <Icon aria-hidden="true" />
              <div><h3>{title}</h3><p>{copy}</p></div>
              <ArrowRight aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section id="integraciones" className={styles.integrationSection}>
        <div>
          <p className={styles.routeLabel}>Integraciones y propiedad</p>
          <h2>Conecta tus canales. Conserva el control.</h2>
        </div>
        <div className={styles.integrationTrack}>
          <span>WhatsApp Business</span>
          <i />
          <span>OpenAI</span>
          <i />
          <span>Zernio</span>
          <i />
          <span>Supabase</span>
          <i />
          <span>API + Webhooks</span>
        </div>
      </section>

      <section id="demo" className={styles.finalCta}>
        <div className={styles.destination}>
          <small>Destino</small>
          <strong>Una operación conectada</strong>
        </div>
        <div>
          <p>Conoce WACRM en acción</p>
          <h2>Solicita una demostración.</h2>
        </div>
        <Link href="/signup?intent=demo" className={styles.finalButton}>
          Solicitar demostración
          <ArrowRight />
        </Link>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>WACRM</strong>
          <span>CRM conversacional instalable</span>
        </div>
        <div>
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/signup">Crear cuenta</Link>
        </div>
        <span>© 2026 WACRM</span>
      </footer>
    </main>
  );
}

function RouteMarker({
  number,
  label,
  tone,
  icon,
}: {
  number: string;
  label: string;
  tone: 'teal' | 'blue' | 'amber';
  icon: React.ReactNode;
}) {
  return (
    <div className={`${styles.marker} ${styles[tone]}`}>
      <span>{number}</span>
      <strong>{label}</strong>
      <i>{icon}</i>
    </div>
  );
}

function ProofHeader({
  label,
  code,
  status,
}: {
  label: string;
  code: string;
  status: string;
}) {
  return (
    <div className={styles.proofHeader}>
      <span>{label}</span>
      <b>{status}</b>
      <code>{code}</code>
    </div>
  );
}

function RouteTicket({
  code,
  rows,
}: {
  code: string;
  rows: [string, string][];
}) {
  return (
    <aside className={styles.ticket}>
      <small>Ruta</small>
      <strong>{code}</strong>
      {rows.map(([label, value]) => (
        <div key={label}><span>{label}</span><b>{value}</b></div>
      ))}
    </aside>
  );
}
