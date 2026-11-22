import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { Persona } from '../domain/types'
import { listarPersonas } from '../storage/db'
import { ImportarArchivo, plural } from './ImportarArchivo'
import { Medir, type Borrador } from './Medir'

interface Props {
  persona: Persona
  fecha?: string
  borrador?: Borrador
  onBorrador: (b: Borrador | null) => void
  /** Volver a la ficha con un aviso. */
  onListo: (aviso: string) => void
}

type Modo = 'escribir' | 'captura' | 'archivo'
const MODOS: { id: Modo; nombre: string; detalle: string }[] = [
  { id: 'escribir', nombre: 'Escribir', detalle: 'a mano, campo por campo' },
  { id: 'captura', nombre: 'Captura de Xiaomi Home', detalle: 'elige o pega la imagen' },
  { id: 'archivo', nombre: 'Archivo', detalle: 'CSV o Excel con varias fechas' },
]

export function Registrar({ persona, fecha, borrador, onBorrador, onListo }: Props) {
  const [modo, setModo] = useState<Modo>('escribir')
  const personas = useLiveQuery(listarPersonas, [], [] as Persona[])
  const pestanas = useRef<HTMLDivElement>(null)

  // Flechas izquierda y derecha mueven entre pestañas, como en cualquier lista de pestañas.
  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = MODOS.findIndex((m) => m.id === modo)
    const siguiente = MODOS[(i + (e.key === 'ArrowRight' ? 1 : MODOS.length - 1)) % MODOS.length]
    setModo(siguiente.id)
    pestanas.current?.querySelector<HTMLButtonElement>(`#pestana-${siguiente.id}`)?.focus()
  }

  return (
    <div className="stack registrar">
      <h2>Registrar medición · {persona.nombre}</h2>
      <div className="modos" role="tablist" aria-label="Cómo cargar" ref={pestanas} onKeyDown={teclas}>
        {MODOS.map((m) => (
          <button
            key={m.id}
            id={`pestana-${m.id}`}
            type="button"
            role="tab"
            aria-selected={modo === m.id}
            aria-controls={`panel-${m.id}`}
            tabIndex={modo === m.id ? 0 : -1}
            className="modo"
            onClick={() => setModo(m.id)}
          >
            <b>{m.nombre}</b>
            <span className="small">{m.detalle}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${modo}`} aria-labelledby={`pestana-${modo}`}>
        {modo === 'escribir' && (
          <Medir
            key={`${persona.id}-${fecha ?? ''}`}
            persona={persona}
            fechaInicial={fecha}
            borrador={fecha ? undefined : borrador}
            onBorrador={onBorrador}
            onVerEvolucion={() => onListo('')}
            onGuardada={() => onListo('Medición guardada.')}
          />
        )}
        {modo === 'captura' && (
          <div className="card stack">
            <h3>Captura de Xiaomi Home</h3>
            <p>Muy pronto: elige o pega la captura del informe y la app rellenará los campos.</p>
          </div>
        )}
        {modo === 'archivo' && (
          <section className="card stack">
            <h3>Importar desde un archivo</h3>
            <p className="muted small">Un CSV de tu báscula, de tu cinta o de una planilla propia. Necesita una columna de fecha y una de peso.</p>
            <ImportarArchivo
              personas={personas}
              personaFija={persona}
              onImportado={(n) => onListo(`${plural(n, 'medición importada', 'mediciones importadas')}.`)}
            />
          </section>
        )}
      </div>
    </div>
  )
}
