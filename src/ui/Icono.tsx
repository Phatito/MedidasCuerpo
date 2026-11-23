/** Íconos de trazo propio, todos con el mismo grosor. */
const TRAZOS = {
  // Flecha para "abrir el detalle".
  abrir: 'M9 5l7 7-7 7',
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
