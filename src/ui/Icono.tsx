/** Íconos de trazo propio, todos con el mismo grosor. */
const TRAZOS = {
  // Flecha para "abrir el detalle".
  abrir: 'M9 5l7 7-7 7',
  volver: 'M15 5l-7 7 7 7',
  mas: 'M12 5v14M5 12h14',
  si: 'M5 12.5l4.5 4.5L19 7',
  no: 'M6 6l12 12M18 6L6 18',
  // Lápiz para editar.
  editar: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  // Muesca del molde con una línea: "esta semana".
  semana: 'M4 7h16M4 12h10M4 17h6M17 14l3 3-3 3',
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
