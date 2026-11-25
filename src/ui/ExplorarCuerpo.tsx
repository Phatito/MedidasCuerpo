import { useEffect, useRef } from 'react'
import { leerCinta, sentidoCambio, zonaDeCampo } from '../domain/cinta'
import { PERIMETROS, resumenFicha, type CampoPerimetro } from '../domain/ficha'
import { fechaLegible, formatear, hoyIso } from '../domain/numbers'
import { serieMetrica } from '../domain/series'
import { ETIQUETAS, type Medicion, type Persona } from '../domain/types'
import { medidasConBase } from './Cinta'
import { Cuerpo } from './Cuerpo'
import { GraficoVivo } from './GraficoVivo'
import { Icono, Muesca } from './Icono'

interface Props {
  persona: Persona
  mediciones: Medicion[]
  medida: CampoPerimetro
  onCambiar: (m: CampoPerimetro) => void
}

const r1 = (x: number) => Math.round(x * 10) / 10

function Cambio({ d, zona, leyenda }: { d: number | null; zona: ReturnType<typeof zonaDeCampo>; leyenda: string }) {
  if (d == null) return null
  const sentido = zona ? sentidoCambio(zona, d, 0, 0) : 'neutro'
  return (
    <span className={`zona-cambio ${sentido}${d !== 0 && Math.abs(d) < 0.5 ? ' leve' : ''}`}>
      {d === 0 ? '=' : <Muesca cambio={d} />} {formatear(Math.abs(d))} cm <span className="muted">{leyenda}</span>
    </span>
  )
}

/** Los perímetros sobre el cuerpo: tocar una zona muestra su historia. */
export function ExplorarCuerpo({ persona, mediciones, medida, onCambiar }: Props) {
  const r = resumenFicha(persona, mediciones, { hoy: hoyIso() })
  const lectura = leerCinta(persona, mediciones, 'anterior')
  const medidas = medidasConBase(r.medidas, lectura, mediciones)
  const zonas = PERIMETROS.filter((c) => medidas.some((m) => m.campo === c))
  const serie = serieMetrica(persona, mediciones, medida, 'todo', hoyIso())
  const zona = zonaDeCampo(medida)
  const panel = useRef<HTMLHeadingElement>(null)
  const primera = useRef(true)

  // Al elegir otra zona, el foco va a su panel (no al cargar la pantalla).
  useEffect(() => {
    if (primera.current) {
      primera.current = false
      return
    }
    panel.current?.focus({ preventScroll: true })
  }, [medida])

  const i = zonas.indexOf(medida)
  const vecina = (paso: number) => zonas[(i + paso + zonas.length) % zonas.length]
  const ultimo = serie[serie.length - 1]
  const dAnterior = serie.length > 1 ? r1(ultimo.valor - serie[serie.length - 2].valor) : null
  const dInicio = serie.length > 2 ? r1(ultimo.valor - serie[0].valor) : null
  const nombre = ETIQUETAS[medida].nombre

  return (
    <div className="explorar">
      <section className="card explorar-cuerpo" aria-label="Elige una zona del cuerpo">
        <p className="muted small explorar-ayuda">Toca una zona para ver su historia.</p>
        <Cuerpo sexo={persona.sexo} medidas={medidas} seleccionada={medida} onElegir={onCambiar} />
      </section>

      <section className="card stack explorar-zona" aria-labelledby="zona-titulo">
        <div className="zona-cabeza">
          {zonas.length > 1 && i >= 0 && (
            <button type="button" className="zona-flecha" onClick={() => onCambiar(vecina(-1))} aria-label={`Zona anterior: ${ETIQUETAS[vecina(-1)].nombre}`}>
              <Icono nombre="volver" />
            </button>
          )}
          <div className="zona-t">
            <h2 id="zona-titulo" ref={panel} tabIndex={-1}>
              {nombre}
            </h2>
            {ultimo && (
              <p className="zona-v num">
                {formatear(ultimo.valor)} <small>cm</small>
              </p>
            )}
          </div>
          {zonas.length > 1 && i >= 0 && (
            <button type="button" className="zona-flecha" onClick={() => onCambiar(vecina(1))} aria-label={`Zona siguiente: ${ETIQUETAS[vecina(1)].nombre}`}>
              <Icono nombre="abrir" />
            </button>
          )}
        </div>
        {ultimo ? (
          <>
            <p className="zona-cambios small num">
              <Cambio d={dAnterior} zona={zona} leyenda="desde la anterior" />
              <Cambio d={dInicio} zona={zona} leyenda={`desde el ${fechaLegible(serie[0].fecha).slice(0, 5)}`} />
              {serie.length === 1 && <span className="muted">Primera medida de esta zona: con la próxima verás cómo cambia.</span>}
            </p>
            <GraficoVivo puntos={serie} unidad="cm" etiqueta={nombre} tono={zona === 'brazo' || zona === 'muslo' ? 'subir' : 'bajar'} />
            <details className="zona-historia" open={serie.length <= 6}>
              <summary>Todos los valores ({serie.length})</summary>
              <ol className="zona-lista num">
                {[...serie].reverse().map((p, k, todos) => {
                  const antes = todos[k + 1]
                  const d = antes ? r1(p.valor - antes.valor) : null
                  return (
                    <li key={p.fecha}>
                      <span>{fechaLegible(p.fecha)}</span>
                      <b>{formatear(p.valor)} cm</b>
                      <Cambio d={d} zona={zona} leyenda="" />
                    </li>
                  )
                })}
              </ol>
            </details>
          </>
        ) : (
          <p className="muted">Todavía no hay medidas de {nombre.toLowerCase()}.</p>
        )}
      </section>
    </div>
  )
}
