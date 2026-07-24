import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Check,
  ChevronDown,
  ContactRound,
  GitBranch,
  Megaphone,
  MessagesSquare,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'WACRM — CRM y automatización para WhatsApp',
  description:
    'Centraliza conversaciones, automatiza respuestas, agenda citas, envía campañas y gestiona tu operación desde un solo CRM.',
};

const features = [
  {
    eyebrow: 'Bandeja compartida',
    title: 'Cada conversación, contacto y oportunidad en un solo lugar.',
    description:
      'Tu equipo responde desde una bandeja colaborativa, asigna conversaciones y conserva todo el historial del cliente sin perder contexto.',
    bullets: [
      'Asignación y seguimiento entre agentes',
      'Contactos, etiquetas, notas y campos personalizados',
      'Estados de conversación y notificaciones internas',
    ],
    image: '/landing/wacrm-dashboard.png',
    icon: MessagesSquare,
  },
  {
    eyebrow: 'Citas y recordatorios',
    title: 'Citas que se confirman. Recordatorios que reducen ausencias.',
    description:
      'Configura servicios, horarios y disponibilidad. Tus clientes pueden confirmar, cancelar o reprogramar desde WhatsApp.',
    bullets: [
      'Calendario por servicio y miembro del equipo',
      'Recordatorios configurables de 24 y 2 horas',
      'Protección contra reservas duplicadas',
    ],
    image: '/landing/wacrm-dashboard.png',
    icon: CalendarCheck,
  },
  {
    eyebrow: 'Automatizaciones visuales',
    title: 'Convierte procesos repetitivos en flujos que trabajan solos.',
    description:
      'Activa respuestas, etiquetas, asignaciones, citas y seguimientos según mensajes, palabras clave, estados y eventos.',
    bullets: [
      'Constructor visual sin código',
      'Condiciones, esperas y acciones conectadas',
      'Historial de ejecución y auditoría',
    ],
    image: '/landing/wacrm-dashboard.png',
    icon: GitBranch,
  },
  {
    eyebrow: 'Agente de IA',
    title: 'La IA responde al instante. Tu equipo entra cuando importa.',
    description:
      'Entrena el asistente con el conocimiento de tu negocio, prueba cada respuesta y define cuándo debe transferir la conversación a una persona.',
    bullets: [
      'Respuestas basadas en tu información',
      'Borradores y respuestas automáticas controladas',
      'Transferencia humana con contexto completo',
    ],
    image: '/landing/wacrm-dashboard.png',
    icon: Bot,
  },
];

const industries = [
  ['Servicios y clínicas', 'Reservas, recordatorios, formularios y seguimiento de pacientes o clientes.', CalendarCheck],
  ['Agencias', 'Administra varias cuentas, equipos y automatizaciones desde una plataforma.', UsersRound],
  ['Comercio y ventas', 'Campañas segmentadas, contactos, oportunidades y seguimiento comercial.', Megaphone],
  ['Negocios locales', 'Responde más rápido, organiza solicitudes y convierte chats en clientes.', ContactRound],
] as const;

const integrations = [
  ['WA', 'WhatsApp', 'Mensajes y plantillas'],
  ['AI', 'OpenAI', 'Agentes y conocimiento'],
  ['ZI', 'Zernio', 'Redes sociales'],
  ['IG', 'Instagram', 'Publicación e inbox'],
  ['FB', 'Facebook', 'Páginas y mensajes'],
  ['LI', 'LinkedIn', 'Contenido social'],
  ['GB', 'Google Business', 'Presencia y reseñas'],
  ['SB', 'Supabase', 'Datos y autenticación'],
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className={styles.brand} aria-label="WACRM inicio">
            <span className={styles.brandMark}>W</span>
            <span>WACRM</span>
          </Link>
          <nav className={styles.links} aria-label="Navegación principal">
            <a href="#soluciones">Soluciones</a>
            <a href="#industrias">Industrias</a>
            <a href="#integraciones">Integraciones</a>
          </nav>
          <div className={styles.actions}>
            <Link href="/login" className={styles.login}>Iniciar sesión</Link>
            <Link href="/signup" className={styles.primarySmall}>Comenzar</Link>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.pill}><span /> CRM para WhatsApp y redes sociales</div>
          <h1>
            Automatiza conversaciones.
            <br />
            <em>Convierte más clientes.</em>
          </h1>
          <p>
            WACRM conecta WhatsApp, tu equipo, las citas, campañas,
            automatizaciones e IA en una sola plataforma preparada para crecer.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/signup" className={styles.primary}>Crear cuenta</Link>
            <a href="#soluciones" className={styles.secondary}>
              Ver cómo funciona <ChevronDown size={17} />
            </a>
          </div>
          <div className={styles.heroStats}>
            <div><strong>1</strong><span>Bandeja compartida</span></div>
            <div><strong>24/7</strong><span>Automatización activa</span></div>
            <div><strong>360°</strong><span>Vista del cliente</span></div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.glow} />
          <div className={styles.browserCard}>
            <div className={styles.browserTop}><i /><i /><i /><span>wacrm.app</span></div>
            <Image
              src="/landing/wacrm-dashboard.png"
              alt="Panel de agentes de IA de WACRM"
              width={1280}
              height={800}
              priority
            />
          </div>
          <div className={`${styles.floatCard} ${styles.floatTop}`}>
            <Sparkles size={17} /> IA lista para responder
          </div>
          <div className={`${styles.floatCard} ${styles.floatBottom}`}>
            <span className={styles.online} /> Conversaciones centralizadas
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Capacidades principales">
        <div><strong>WhatsApp</strong><span>Conversaciones y campañas</span></div>
        <div><strong>IA</strong><span>Respuestas y conocimiento</span></div>
        <div><strong>Citas</strong><span>Agenda y recordatorios</span></div>
        <div><strong>Social</strong><span>Publicación multicanal</span></div>
      </section>

      <section id="soluciones" className={styles.features}>
        <div className={styles.sectionIntro}>
          <span>UNA PLATAFORMA, TODO TU EQUIPO</span>
          <h2>Del primer mensaje al seguimiento final.</h2>
          <p>Herramientas conectadas para atender, automatizar y crecer sin saltar entre aplicaciones.</p>
        </div>
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className={`${styles.feature} ${index % 2 ? styles.reverse : ''}`}
            >
              <div className={styles.featureCopy}>
                <div className={styles.eyebrow}><Icon size={15} /> {feature.eyebrow}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>
                  {feature.bullets.map((bullet) => (
                    <li key={bullet}><Check size={16} /> {bullet}</li>
                  ))}
                </ul>
                <Link href="/signup">Explorar en WACRM <ArrowRight size={16} /></Link>
              </div>
              <div className={styles.productShot}>
                <Image src={feature.image} alt="" width={1280} height={800} />
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.statement}>
        <div>
          <span>CONSTRUIDO PARA OPERACIONES REALES</span>
          <h2>Un CRM flexible, no otra herramienta aislada.</h2>
          <p>Configura tu equipo, tus procesos y tus canales sin perder la propiedad de tus datos.</p>
        </div>
      </section>

      <section id="industrias" className={styles.gridSection}>
        <div className={styles.sectionIntroLeft}>
          <span>PARA TU TIPO DE NEGOCIO</span>
          <h2>Tu operación, tus flujos.</h2>
        </div>
        <div className={styles.industryGrid}>
          {industries.map(([title, copy, Icon]) => (
            <article key={title}>
              <div className={styles.iconBox}><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
              <Link href="/signup">Ver posibilidades <ArrowRight size={14} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section id="integraciones" className={styles.gridSection}>
        <div className={styles.sectionIntroLeft}>
          <span>CONECTADO CON TU STACK</span>
          <h2>Los canales que ya usa tu negocio.</h2>
        </div>
        <div className={styles.integrationGrid}>
          {integrations.map(([initials, name, copy]) => (
            <div key={name}>
              <b>{initials}</b>
              <span><strong>{name}</strong><small>{copy}</small></span>
            </div>
          ))}
        </div>
        <p className={styles.stackNote}>
          API, webhooks y arquitectura multiempresa para conectar WACRM con el resto de tu operación.
        </p>
      </section>

      <section className={styles.cta}>
        <span>EMPIEZA CON WACRM</span>
        <h2>Tu negocio ya conversa por WhatsApp.<br />Ahora haz que cada conversación trabaje.</h2>
        <p>Centraliza tu equipo, configura automatizaciones y empieza a gestionar clientes desde un solo lugar.</p>
        <div>
          <Link href="/signup" className={styles.primary}>Crear cuenta</Link>
          <Link href="/login" className={styles.secondary}>Iniciar sesión</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark}>W</span><span>WACRM</span>
            </Link>
            <p>CRM, automatización, citas, IA y canales sociales para equipos que venden y atienden por conversación.</p>
          </div>
          <div><strong>Producto</strong><a href="#soluciones">Soluciones</a><Link href="/login">Iniciar sesión</Link><Link href="/signup">Crear cuenta</Link></div>
          <div><strong>Capacidades</strong><span>WhatsApp</span><span>Automatizaciones</span><span>Citas</span><span>Agentes de IA</span></div>
          <div><strong>Canales</strong><span>Instagram</span><span>Facebook</span><span>LinkedIn</span><span>Google Business</span></div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 WACRM. Todos los derechos reservados.</span>
          <span>Privacidad · Términos</span>
        </div>
      </footer>
    </main>
  );
}
