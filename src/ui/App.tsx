import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { hoyIso } from '../domain/numbers'
import { estadoMedicion } from '../domain/reminders'
import type { Medicion, Persona } from '../domain/types'
import { db, listarPersonas, listarTodasLasMediciones } from '../storage/db'
import { Datos } from './Datos'
import { Evolucion } from './Evolucion'
import { Familia } from './Familia'
import { Ficha } from './Ficha'
import { Historial } from './Historial'
import { Medir, type Borrador } from './Medir'
import { PersonasBar } from './PersonasBar'

export type Pantalla = 'familia' | 'ficha' | 'medir' | 'evolucion' | 'historial' | 'datos'

const PESTANAS: { id: Pantalla; nombre: string; requierePersona: boolean }[] = [
  { id: 'familia', nombre: 'Familia', requierePersona: false },
  { id: 'ficha', nombre: 'Ficha', requierePersona: true },
  { id: 'medir', nombre: 'Medir', requierePersona: true },
  { id: 'evolucion', nombre: 'Evolución', requierePersona: true },
  { id: 'historial', nombre: 'Historial', requierePersona: true },
  { id: 'datos', nombre: 'Datos', requierePersona: false },
]

const CLAVE_PERSONA = 'medidascuerpo.persona'

function leerPersonaGuardada(): string | null {
  try {
    return localStorage.getItem(CLAVE_PERSONA)
  } catch {
    return null
  }
}

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('familia')
  const [personaId, setPersonaId] = useState<string | null>(leerPersonaGuardada)
  const [fechaMedir, setFechaMedir] = useState<string | undefined>(undefined)
  const [sinAlmacenamiento, setSinAlmacenamiento] = useState(false)
  // Lo escrito en Medir y aún no guardado, por persona: cambiar de persona con un toque no debe borrarlo.
  const borradores = useRef(new Map<string, Borrador>())
  const personas = useLiveQuery(() => listarPersonas().catch(() => [] as Persona[]), [])
  const mediciones = useLiveQuery(() => listarTodasLasMediciones().catch(() => [] as Medicion[]), [], [] as Medicion[])

  useEffect(() => {
    db.open().catch(() => setSinAlmacenamiento(true))
    void navigator.storage?.persist?.()
  }, [])

  const persona = personas?.find((p) => p.id === personaId) ?? personas?.[0] ?? null

  // Quién tiene medición pendiente: 7 días o más desde la última, o ninguna.
  const hoy = hoyIso()
  const ultimaFecha = new Map<string, string>()
  for (const m of mediciones) if ((ultimaFecha.get(m.personaId) ?? '') < m.fecha) ultimaFecha.set(m.personaId, m.fecha)
  const pendientes = new Set((personas ?? []).filter((p) => estadoMedicion(ultimaFecha.get(p.id) ?? null, hoy).pendiente).map((p) => p.id))

  function guardarSeleccion(id: string) {
    setPersonaId(id)
    try {
      localStorage.setItem(CLAVE_PERSONA, id)
    } catch {
      /* la selección solo dura esta visita */
    }
  }

  function irA(destino: Pantalla) {
    setFechaMedir(undefined)
    setPantalla(destino)
  }

  // Desde Familia o Datos, elegir a alguien abre su ficha; en las demás pantallas solo cambia de persona.
  function elegirPersona(id: string) {
    guardarSeleccion(id)
    setFechaMedir(undefined)
    if (visible === 'familia' || visible === 'datos') setPantalla('ficha')
  }

  const actual = PESTANAS.find((t) => t.id === pantalla)!
  const visible: Pantalla = actual.requierePersona && !persona ? 'familia' : pantalla
  const pestana = PESTANAS.find((t) => t.id === visible)!

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
            <h1>MedidasCuerpo</h1>
          </div>
          <nav className="tabs" aria-label="Secciones">
            {PESTANAS.map((t) => (
              <button key={t.id} disabled={t.requierePersona && !persona} aria-current={visible === t.id ? 'page' : undefined} onClick={() => irA(t.id)}>
                {t.nombre}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="wrap">
        {sinAlmacenamiento ? (
          <div className="notice bad">Este navegador no permite guardar datos locales. La app no puede funcionar así.</div>
        ) : personas == null ? (
          <p className="muted">Cargando tus datos…</p>
        ) : (
          <>
            <PersonasBar personas={personas} activaId={pestana.requierePersona ? (persona?.id ?? null) : null} pendientes={pendientes} onElegir={elegirPersona} />
            {visible === 'familia' && (
              <Familia
                personas={personas}
                onIrDatos={() => irA('datos')}
                onVerFicha={(id) => {
                  guardarSeleccion(id)
                  irA('ficha')
                }}
                onMedir={(id) => {
                  guardarSeleccion(id)
                  irA('medir')
                }}
              />
            )}
            {persona && pestana.requierePersona && visible !== 'ficha' && (
              <h2>
                {pestana.nombre}: {persona.nombre}
              </h2>
            )}
            {visible === 'ficha' && persona && <Ficha persona={persona} onMedir={() => irA('medir')} onVerEvolucion={() => irA('evolucion')} />}
            {visible === 'medir' && persona && (
              <Medir
                key={`${persona.id}-${fechaMedir ?? ''}`}
                persona={persona}
                fechaInicial={fechaMedir}
                borrador={fechaMedir ? undefined : borradores.current.get(persona.id)}
                onBorrador={(b) => (b ? borradores.current.set(persona.id, b) : borradores.current.delete(persona.id))}
                onVerEvolucion={() => irA('evolucion')}
              />
            )}
            {visible === 'evolucion' && persona && <Evolucion persona={persona} onMedir={() => irA('medir')} />}
            {visible === 'historial' && persona && (
              <Historial
                persona={persona}
                onEditar={(fecha) => {
                  setFechaMedir(fecha)
                  setPantalla('medir')
                }}
                onMedir={() => irA('medir')}
              />
            )}
            {visible === 'datos' && <Datos personas={personas} personaActual={persona} />}
          </>
        )}
      </main>
    </>
  )
}
