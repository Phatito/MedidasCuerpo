import { useLiveQuery } from 'dexie-react-hooks'
import type { MouseEvent } from 'react'
import { PERIMETROS } from '../domain/ficha'
import { escribirRuta, type Ruta } from '../domain/rutas'
import type { Persona } from '../domain/types'
import { listarMediciones } from '../storage/db'
import { Icono } from './Icono'

interface Props {
  persona: Persona
  vista: Ruta
  onIr: (r: Ruta) => void
}

type Seccion = 'ficha' | 'peso' | 'cuerpo' | 'semana'

function activa(v: Ruta): Seccion | null {
  if (v.pantalla === 'ficha') return 'ficha'
  if (v.pantalla === 'semana') return 'semana'
  if (v.pantalla === 'medida') return (PERIMETROS as string[]).includes(v.medida) ? 'cuerpo' : 'peso'
  return null
}

/** Las secciones principales siempre a mano: abajo en el teléfono, bajo el encabezado en el PC. */
export function Pestanas({ persona, vista, onIr }: Props) {
  const mediciones = useLiveQuery(() => listarMediciones(persona.id), [persona.id])
  // El cuerpo abre en la primera zona con datos (de arriba hacia abajo, con la cintura primero si la hay).
  const zona = (['cinturaCm', ...PERIMETROS] as const).find((c) => mediciones?.some((m) => m[c] != null)) ?? 'cinturaCm'
  const id = persona.id
  const destinos: Record<Seccion, Ruta> = {
    ficha: { pantalla: 'ficha', personaId: id },
    peso: { pantalla: 'medida', personaId: id, medida: 'pesoKg' },
    cuerpo: { pantalla: 'medida', personaId: id, medida: zona },
    semana: { pantalla: 'semana', personaId: id },
  }
  const actual = activa(vista)
  // Enlaces de verdad (se pueden abrir en otra pestaña), pero dentro de la app navegan sin recargar.
  const ir = (r: Ruta) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onIr(r)
  }
  const pestana = (s: Seccion, nombre: string, icono: Parameters<typeof Icono>[0]['nombre']) => (
    <a href={escribirRuta(destinos[s])} className="pestana" aria-current={actual === s ? 'page' : undefined} onClick={ir(destinos[s])}>
      <Icono nombre={icono} />
      <span>{nombre}</span>
    </a>
  )
  const registrar: Ruta = { pantalla: 'registrar', personaId: id }
  return (
    <nav className="pestanas" aria-label="Secciones">
      <div className="pestanas-fila">
        {pestana('ficha', 'Ficha', 'persona')}
        {pestana('peso', 'Peso', 'bascula')}
        <a href={escribirRuta(registrar)} className="pestana pestana-mas" onClick={ir(registrar)} aria-label="Registrar medición">
          <span className="pestana-mas-circulo">
            <Icono nombre="mas" />
          </span>
          <span className="pestana-mas-texto">Registrar</span>
        </a>
        {pestana('cuerpo', 'Cuerpo', 'cinta')}
        {pestana('semana', 'Semana', 'semana')}
      </div>
    </nav>
  )
}
