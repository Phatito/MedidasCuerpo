import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { fechaLegible, hoyIso } from '../domain/numbers'
import { estadoMedicion } from '../domain/reminders'
import type { Persona } from '../domain/types'

interface Props {
  personas: Persona[]
  actual: Persona | null
  principalId: string | undefined
  /** Fecha de la última medición de cada persona. */
  ultimaFecha: Map<string, string>
  onElegir: (id: string) => void
  onAgregar: () => void
  onFamilia: () => void
}

export const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase() || '?'

export function SelectorPerfil({ personas, actual, principalId, ultimaFecha, onElegir, onAgregar, onFamilia }: Props) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const hoy = hoyIso()

  useEffect(() => {
    if (!abierto) return
    // Al abrir, el foco va a la persona actual (o a la primera opción).
    const items = caja.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    const elegido = caja.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')
    ;(elegido ?? items?.[0])?.focus()
    function fuera(e: MouseEvent) {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  function cerrar(devolverFoco = true) {
    setAbierto(false)
    if (devolverFoco) boton.current?.focus()
  }

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      cerrar()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(caja.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const siguiente = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
    items[siguiente]?.focus()
  }

  function elegir(accion: () => void) {
    cerrar(false)
    accion()
  }

  return (
    <div className="perfil" ref={caja} onKeyDown={teclas}>
      <button ref={boton} type="button" className="perfil-boton" aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <span className="avatar" aria-hidden="true">{inicial(actual?.nombre ?? '?')}</span>
        <span className="perfil-nombre">{actual?.nombre ?? 'Elegir persona'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d={abierto ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} />
        </svg>
      </button>
      {abierto && (
        <div className="perfil-menu" role="menu" aria-label="Perfiles">
          {personas.map((p) => {
            const fecha = ultimaFecha.get(p.id) ?? null
            const pendiente = estadoMedicion(fecha, hoy).pendiente
            return (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                className="perfil-item"
                aria-current={p.id === actual?.id ? 'true' : undefined}
                onClick={() => elegir(() => onElegir(p.id))}
              >
                <span className="avatar" aria-hidden="true">{inicial(p.nombre)}</span>
                <span className="perfil-texto">
                  <b>{p.nombre}</b>
                  <span className={pendiente ? 'warn-text small' : 'ok-text small'}>
                    {pendiente ? 'Le toca medirse' : `Al día · ${fechaLegible(fecha!).slice(0, 5)}`}
                  </span>
                </span>
                {p.id === principalId && <span className="muted small">★ principal</span>}
              </button>
            )
          })}
          <hr />
          <button type="button" role="menuitem" className="perfil-item accion" onClick={() => elegir(onAgregar)}>+ Agregar persona</button>
          <button type="button" role="menuitem" className="perfil-item" onClick={() => elegir(onFamilia)}>Administrar familia…</button>
        </div>
      )}
    </div>
  )
}
