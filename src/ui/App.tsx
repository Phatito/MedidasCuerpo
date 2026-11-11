import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { Persona } from '../domain/types'
import { db, listarPersonas } from '../storage/db'
import { Datos } from './Datos'
import { Evolucion } from './Evolucion'
import { Familia } from './Familia'
import { Historial } from './Historial'
import { Medir } from './Medir'

export type Pantalla = 'familia' | 'medir' | 'evolucion' | 'historial' | 'datos'

const PESTANAS: { id: Pantalla; nombre: string; requierePersona: boolean }[] = [
  { id: 'familia', nombre: 'Familia', requierePersona: false },
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
  const personas = useLiveQuery(() => listarPersonas().catch(() => [] as Persona[]), [])

  useEffect(() => {
    db.open().catch(() => setSinAlmacenamiento(true))
    void navigator.storage?.persist?.()
  }, [])

  const persona = personas?.find((p) => p.id === personaId) ?? personas?.[0] ?? null

  function elegirPersona(id: string) {
    setPersonaId(id)
    try {
      localStorage.setItem(CLAVE_PERSONA, id)
    } catch {
      /* la selección solo dura esta visita */
    }
  }

  const actual = PESTANAS.find((t) => t.id === pantalla)!
  const visible: Pantalla = actual.requierePersona && !persona ? 'familia' : pantalla

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
              <button
                key={t.id}
                disabled={t.requierePersona && !persona}
                aria-current={visible === t.id ? 'page' : undefined}
                onClick={() => {
                  setFechaMedir(undefined)
                  setPantalla(t.id)
                }}
              >
                {t.nombre}
              </button>
            ))}
          </nav>
        </div>
        <div className="ruler" aria-hidden="true" />
      </header>
      <main className="wrap">
        {sinAlmacenamiento ? (
          <div className="notice bad">Este navegador no permite guardar datos locales. La app no puede funcionar así.</div>
        ) : personas == null ? (
          <p className="muted">Cargando tus datos…</p>
        ) : (
          <>
            {visible === 'familia' && (
              <Familia
                personas={personas}
                onIrDatos={() => setPantalla('datos')}
                onMedir={(id) => {
                  elegirPersona(id)
                  setPantalla('medir')
                }}
              />
            )}
            {persona && actual.requierePersona && visible !== 'familia' && (
              <div className="head">
                <h2>
                  {actual.nombre}: {persona.nombre}
                </h2>
                {personas.length > 1 && (
                  <div className="field">
                    <label htmlFor="persona-activa" className="small">Persona</label>
                    <select id="persona-activa" value={persona.id} onChange={(e) => elegirPersona(e.target.value)}>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            {visible === 'medir' && persona && (
              <Medir key={`${persona.id}-${fechaMedir ?? ''}`} persona={persona} fechaInicial={fechaMedir} onVerEvolucion={() => setPantalla('evolucion')} />
            )}
            {visible === 'historial' && persona && (
              <Historial
                persona={persona}
                onEditar={(fecha) => {
                  setFechaMedir(fecha)
                  setPantalla('medir')
                }}
                onMedir={() => setPantalla('medir')}
              />
            )}
            {visible === 'evolucion' && persona && <Evolucion persona={persona} onMedir={() => setPantalla('medir')} />}
            {visible === 'datos' && <Datos personas={personas} personaActual={persona} />}
          </>
        )}
      </main>
    </>
  )
}
