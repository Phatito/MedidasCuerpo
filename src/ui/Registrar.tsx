import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { LecturaCaptura } from '../domain/capturaXiaomi'
import type { Persona } from '../domain/types'
import { listarPersonas } from '../storage/db'
import { ImportarArchivo, plural } from './ImportarArchivo'
import { LeerCaptura } from './LeerCaptura'
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
  { id: 'archivo', nombre: 'Archivo', detalle: 'CSV o Excel con varias semanas' },
]

export function Registrar({ persona, fecha, borrador, onBorrador, onListo }: Props) {
  const [modo, setModo] = useState<Modo>('escribir')
  const personas = useLiveQuery(listarPersonas, [], [] as Persona[])
  const pestanas = useRef<HTMLDivElement>(null)
  const [lectura, setLectura] = useState<{ id: number; datos: LecturaCaptura; imagenUrl: string } | null>(null)
  const [pegada, setPegada] = useState<{ id: number; imagen: Blob } | null>(null)
  // Lo que el formulario sabe de sí mismo: si tiene algo sin guardar y cuándo se escribió por última vez.
  const formulario = useRef({ sucio: false, editadoEn: 0 })
  const leyendo = useRef(false)

  // La miniatura de la captura vive solo en memoria mientras Registrar está abierto.
  useEffect(() => () => void (lectura && URL.revokeObjectURL(lectura.imagenUrl)), [lectura])

  // Pegar una imagen (Ctrl+V) en cualquier pestaña la lee como captura.
  useEffect(() => {
    function alPegar(e: ClipboardEvent) {
      const archivo = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (!archivo || leyendo.current) return
      // Pegar texto en un campo sigue funcionando aunque el portapapeles traiga además una imagen.
      const destino = e.target
      if (destino instanceof Element && destino.closest('input, textarea') && e.clipboardData?.types.includes('text/plain')) return
      e.preventDefault()
      setModo('captura')
      setPegada((p) => ({ id: (p?.id ?? 0) + 1, imagen: archivo }))
    }
    document.addEventListener('paste', alPegar)
    return () => document.removeEventListener('paste', alPegar)
  }, [])

  function puedeLeer() {
    return !formulario.current.sucio || window.confirm('Tienes cambios sin guardar en Medir. ¿Reemplazarlos con la captura?')
  }

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
      <h1>Registrar medición · {persona.nombre}</h1>
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
      {/* Los tres paneles quedan montados y solo se ocultan: cambiar de pestaña no pierde lo escrito. */}
      <div role="tabpanel" id="panel-escribir" aria-labelledby="pestana-escribir" hidden={modo !== 'escribir'}>
        <Medir
          key={`${persona.id}-${fecha ?? ''}`}
          persona={persona}
          fechaInicial={fecha}
          borrador={fecha ? undefined : borrador}
          // Editar una medición de otra fecha no debe tocar el borrador de la medición nueva.
          onBorrador={fecha ? undefined : onBorrador}
          onVerEvolucion={() => onListo('')}
          onGuardada={() => onListo('Medición guardada.')}
          lectura={lectura ?? undefined}
          estado={formulario}
        />
      </div>
      <div role="tabpanel" id="panel-captura" aria-labelledby="pestana-captura" hidden={modo !== 'captura'}>
        <LeerCaptura
          puedeLeer={puedeLeer}
          pegada={pegada}
          onLeyendo={(activo) => (leyendo.current = activo)}
          onLectura={(datos, imagen, inicio) => {
            // Si se escribió algo mientras se leía, no se pisa sin preguntar.
            if (formulario.current.editadoEn > inicio && !window.confirm('Escribiste en el formulario mientras se leía la captura. ¿Reemplazarlo con la captura?')) return
            setLectura((l) => ({ id: (l?.id ?? 0) + 1, datos, imagenUrl: URL.createObjectURL(imagen) }))
            setModo('escribir')
          }}
        />
      </div>
      <div role="tabpanel" id="panel-archivo" aria-labelledby="pestana-archivo" hidden={modo !== 'archivo'}>
        <section className="card stack">
          <h3>Importar desde un archivo</h3>
          <p className="muted small">Un CSV de tu báscula, de tu cinta o de una planilla propia. Necesita una columna de fecha y una de peso.</p>
          <ImportarArchivo
            personas={personas}
            personaFija={persona}
            onImportado={(n) => onListo(`${plural(n, 'medición importada', 'mediciones importadas')}.`)}
            onImagen={(imagen) => {
              setModo('captura')
              setPegada((p) => ({ id: (p?.id ?? 0) + 1, imagen }))
            }}
          />
        </section>
      </div>
    </div>
  )
}
