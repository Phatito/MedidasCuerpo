import { useEffect, useState } from 'react'
import { suscribirEstado, type EstadoSync } from '../sync/motor'

const ETIQUETA: Partial<Record<EstadoSync['tipo'], string>> = {
  'al-dia': 'al día',
  sincronizando: 'sincronizando',
  'sin-conexion': 'sin conexión',
  error: 'error',
}

/** Nube del encabezado: solo con sesión iniciada; lleva a Ajustes y datos. */
export function IconoNube({ onAbrir }: { onAbrir: () => void }) {
  const [estado, setEstado] = useState<EstadoSync>({ tipo: 'sin-sesion' })
  useEffect(() => suscribirEstado(setEstado), [])
  const texto = ETIQUETA[estado.tipo]
  if (!texto) return null
  const etiqueta = `Sincronización: ${texto}`
  return (
    <button type="button" className={`icon-btn nube nube-${estado.tipo}`} aria-label={etiqueta} title={etiqueta} onClick={onAbrir}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5H7z" />
        {estado.tipo === 'al-dia' && <path d="m9.5 13.5 2 2 3.5-3.5" />}
        {estado.tipo === 'sin-conexion' && <path d="M4 4l16 16" />}
        {estado.tipo === 'error' && <path d="M12 11v3M12 16.5v.01" />}
      </svg>
    </button>
  )
}
