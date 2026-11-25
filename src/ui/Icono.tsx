/** Íconos de trazo propio, todos con el mismo grosor. */
const TRAZOS = {
  // Flecha para "abrir el detalle".
  abrir: 'M9 5l7 7-7 7',
  volver: 'M15 5l-7 7 7 7',
  mas: 'M12 5v14M5 12h14',
  si: 'M5 12.5l4.5 4.5L19 7',
  no: 'M6 6l12 12M18 6L6 18',
  estrella: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z',
  // Lápiz para editar.
  editar: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  // Muesca del molde con una línea: "esta semana".
  semana: 'M4 7h16M4 12h10M4 17h6M17 14l3 3-3 3',
  // Flechas y señales del veredicto de la cinta.
  baja: 'M12 5v14M6 13l6 6 6-6',
  sube: 'M12 19V5M6 11l6-6 6 6',
  igual: 'M6 9h12M6 15h12',
  cambio: 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4',
  alerta: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  // Báscula: plataforma con su visor.
  bascula: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 9h6M12 9l1.5-1.5',
  // Cinta métrica enrollada con su punta.
  cinta: 'M12 5a7 7 0 1 0 0 14h8M12 9a3 3 0 1 0 0 6M20 16v6M16 19v3',
} as const

export function Icono({ nombre, className = '' }: { nombre: keyof typeof TRAZOS; className?: string }) {
  return (
    <svg className={`icono ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}

/**
 * Muesca del molde: el triángulo que marca un cambio. Abajo si bajó, arriba si subió.
 * El lector de pantalla oye "bajó" o "subió".
 */
export function Muesca({ cambio }: { cambio: number }) {
  const baja = cambio < 0
  return (
    <>
      <svg className="muesca" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        <path d={baja ? 'M1 2h8L5 9z' : 'M1 8h8L5 1z'} />
      </svg>
      <span className="sr-only">{baja ? 'bajó' : 'subió'}</span>
    </>
  )
}
