import { fechaLegible, formatear } from '../domain/numbers'

/** Barras apiladas: grasa abajo, masa magra arriba, por pesada. */
export function Composicion({ barras, descripcion }: { barras: { fecha: string; grasaKg: number; magraKg: number }[]; descripcion?: string }) {
  const max = Math.max(...barras.map((b) => b.grasaKg + b.magraKg))
  const ultima = barras[barras.length - 1]
  return (
    <>
      <div className="comp" role="img" aria-label={descripcion ?? `Última pesada: ${formatear(ultima.grasaKg)} kg de grasa y ${formatear(ultima.magraKg)} kg de masa magra.`}>
        {barras.map((b, k) => (
          <div key={b.fecha} className="comp-col" style={{ animationDelay: `${k * 0.05}s` }}>
            <div className="comp-barra" style={{ height: `${((b.grasaKg + b.magraKg) / max) * 100}%` }}>
              <span className="comp-magra" style={{ flexGrow: b.magraKg }} />
              <span className="comp-grasa" style={{ flexGrow: b.grasaKg }} />
            </div>
            <span className="comp-f num">{fechaLegible(b.fecha).slice(0, 5)}</span>
          </div>
        ))}
      </div>
      <p className="small num comp-leyenda">
        <i className="comp-grasa" /> Grasa {formatear(ultima.grasaKg)} kg <i className="comp-magra" /> Masa magra {formatear(ultima.magraKg)} kg
      </p>
    </>
  )
}
