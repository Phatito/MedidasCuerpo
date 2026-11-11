import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ChangeEvent } from 'react'
import { CAMPOS_CSV, decodificarTexto, filasAMediciones, medicionesACsv, nombreCampoCsv, parseCsv, sugerirAsignacion, type Asignacion, type CampoCsv } from '../domain/csv'
import { hoyIso } from '../domain/numbers'
import { DIAS_SEMANA, generarIcs } from '../domain/reminders'
import type { Persona } from '../domain/types'
import { exportarRespaldo, leerRespaldo, restaurarRespaldo, type Respaldo } from '../storage/backup'
import { contarExistentes, guardarAjustes, guardarMediciones, leerAjustes, listarMediciones } from '../storage/db'
import { descargar } from './descargar'

interface Props {
  personas: Persona[]
  personaActual: Persona | null
}

interface Csv {
  nombre: string
  columnas: string[]
  filas: string[][]
  asignacion: Asignacion
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function Datos({ personas, personaActual }: Props) {
  const ajustes = useLiveQuery(leerAjustes, [])
  const [personaId, setPersonaId] = useState(personaActual?.id ?? personas[0]?.id ?? '')
  // Tras restaurar un respaldo la persona elegida puede ya no existir: se usa la primera disponible.
  const persona = personas.find((p) => p.id === personaId) ?? personas[0] ?? null

  const [csv, setCsv] = useState<Csv | null>(null)
  const [existentes, setExistentes] = useState(0)
  const [avisoCsv, setAvisoCsv] = useState<{ tipo: 'ok' | 'bad'; texto: string } | null>(null)
  const [claveCsv, setClaveCsv] = useState(0)

  const [pendiente, setPendiente] = useState<Respaldo | null>(null)
  const [avisoRespaldo, setAvisoRespaldo] = useState<{ tipo: 'ok' | 'bad'; texto: string } | null>(null)
  const [claveRespaldo, setClaveRespaldo] = useState(0)

  const resultado = csv && persona ? filasAMediciones(csv.filas, csv.asignacion, persona.id) : null
  const ids = resultado?.mediciones.map((m) => m.id).join('|') ?? ''

  useEffect(() => {
    let vigente = true
    const lista = ids ? ids.split('|') : []
    contarExistentes(lista).then((n) => vigente && setExistentes(n))
    return () => {
      vigente = false
    }
  }, [ids])

  async function elegirCsv(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setAvisoCsv(null)
    const { columnas, filas } = parseCsv(decodificarTexto(new Uint8Array(await archivo.arrayBuffer())))
    if (columnas.length === 0 || filas.length === 0) {
      setCsv(null)
      setAvisoCsv({ tipo: 'bad', texto: 'El archivo está vacío o no tiene filas de datos bajo el encabezado.' })
      return
    }
    setCsv({ nombre: archivo.name, columnas, filas, asignacion: sugerirAsignacion(columnas) })
  }

  async function confirmarImportacion() {
    if (!resultado || !persona || resultado.mediciones.length === 0) return
    await guardarMediciones(resultado.mediciones)
    setAvisoCsv({ tipo: 'ok', texto: `Se importaron ${plural(resultado.mediciones.length, 'medición', 'mediciones')} para ${persona.nombre}.` })
    setCsv(null)
    setClaveCsv((k) => k + 1)
  }

  async function exportarCsv() {
    if (!persona) return
    descargar(`medidas-${persona.nombre}.csv`, medicionesACsv(await listarMediciones(persona.id)), 'text/csv;charset=utf-8')
  }

  async function descargarRespaldo() {
    const respaldo = await exportarRespaldo()
    descargar(`medidascuerpo-${hoyIso()}.json`, JSON.stringify(respaldo, null, 2), 'application/json')
    await guardarAjustes({ ...(await leerAjustes()), ultimoRespaldo: hoyIso() })
    setAvisoRespaldo({ tipo: 'ok', texto: 'Respaldo descargado. Guárdalo fuera de este computador, por ejemplo en un pendrive o en tu nube.' })
  }

  async function elegirRespaldo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setAvisoRespaldo(null)
    setPendiente(null)
    try {
      setPendiente(leerRespaldo(await archivo.text()))
    } catch (error) {
      setAvisoRespaldo({ tipo: 'bad', texto: error instanceof Error ? error.message : 'No se pudo leer el archivo' })
      setClaveRespaldo((k) => k + 1)
    }
  }

  async function restaurar() {
    if (!pendiente) return
    await restaurarRespaldo(pendiente)
    await guardarAjustes({ ...(await leerAjustes()), ultimoRespaldo: hoyIso() })
    setPendiente(null)
    setClaveRespaldo((k) => k + 1)
    setAvisoRespaldo({ tipo: 'ok', texto: 'Respaldo restaurado.' })
  }

  const selectorPersona = (id: string) => (
    <div className="field" style={{ maxWidth: 260 }}>
      <label htmlFor={id}>Persona</label>
      <select id={id} value={persona?.id ?? ''} onChange={(e) => setPersonaId(e.target.value)}>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
    </div>
  )

  return (
    <>
      <h2>Datos</h2>

      <section className="card stack">
        <h3>Recordatorio semanal</h3>
        {ajustes && (
          <div className="form">
            <div className="field">
              <label htmlFor="recordatorio-dia">Día del recordatorio</label>
              <select
                id="recordatorio-dia"
                value={ajustes.diaRecordatorio}
                onChange={(e) => guardarAjustes({ ...ajustes, diaRecordatorio: Number(e.target.value) })}
              >
                {DIAS_SEMANA.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="recordatorio-hora">Hora del recordatorio</label>
              <input
                id="recordatorio-hora"
                type="time"
                value={ajustes.horaRecordatorio}
                onChange={(e) => e.target.value && guardarAjustes({ ...ajustes, horaRecordatorio: e.target.value })}
              />
            </div>
          </div>
        )}
        <div className="row">
          <button
            className="btn primary"
            disabled={!ajustes}
            onClick={() => ajustes && descargar('recordatorio-medidas.ics', generarIcs(ajustes.diaRecordatorio, ajustes.horaRecordatorio, hoyIso()), 'text/calendar;charset=utf-8')}
          >
            Descargar evento de calendario
          </button>
        </div>
        <p className="muted small">
          Ábrelo para agregarlo a tu calendario; el aviso lo emite tu calendario, también en tu teléfono si está sincronizado. Si cambias el día,
          borra el evento anterior de tu calendario y descarga uno nuevo.
        </p>
      </section>

      <section className="card stack">
        <h3>Importar mediciones desde un archivo CSV</h3>
        <p className="muted small">
          Sirve para traer lo que exporte la app de tu báscula o cinta, o una planilla propia. Necesita una columna de fecha y una de peso.
        </p>
        {personas.length === 0 ? (
          <p className="muted">Agrega primero a una persona en la pestaña Familia.</p>
        ) : (
          <>
            {selectorPersona('datos-persona-importar')}
            <div className="field" style={{ maxWidth: 420 }}>
              <label htmlFor="datos-csv">Archivo CSV</label>
              <input key={claveCsv} id="datos-csv" type="file" accept=".csv,text/csv,text/plain" onChange={elegirCsv} />
            </div>
            {csv && resultado && (
              <div className="stack">
                <p className="small">
                  <strong>{csv.nombre}</strong>: revisa a qué columna del archivo corresponde cada dato.
                </p>
                <div className="form">
                  {CAMPOS_CSV.map((campo: CampoCsv) => (
                    <div className="field" key={campo}>
                      <label htmlFor={`csv-${campo}`}>{nombreCampoCsv(campo)}</label>
                      <select
                        id={`csv-${campo}`}
                        aria-label={`Columna para ${nombreCampoCsv(campo)}`}
                        value={csv.asignacion[campo] ?? ''}
                        onChange={(e) => setCsv({ ...csv, asignacion: { ...csv.asignacion, [campo]: e.target.value === '' ? null : Number(e.target.value) } })}
                      >
                        <option value="">No importar</option>
                        {csv.columnas.map((c, i) => (
                          <option key={i} value={i}>{c || `Columna ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="notice num">
                  {resultado.mediciones.length - existentes} nuevas, {existentes} reemplazan, {resultado.errores.length}{' '}
                  {resultado.errores.length === 1 ? 'omitida' : 'omitidas'}
                </p>
                {resultado.errores.length > 0 && (
                  <ul className="small muted" style={{ margin: 0, paddingLeft: 20 }}>
                    {resultado.errores.slice(0, 20).map((e) => (
                      <li key={e.fila}>Fila {e.fila}: {e.motivo}</li>
                    ))}
                    {resultado.errores.length > 20 && <li>…y {resultado.errores.length - 20} filas más.</li>}
                  </ul>
                )}
                <div className="row">
                  <button className="btn primary" disabled={resultado.mediciones.length === 0} onClick={confirmarImportacion}>Confirmar importación</button>
                  <button className="btn" onClick={() => { setCsv(null); setClaveCsv((k) => k + 1) }}>Cancelar</button>
                </div>
              </div>
            )}
            {avisoCsv && <p className={`notice ${avisoCsv.tipo}`} role="status">{avisoCsv.texto}</p>}
          </>
        )}
      </section>

      <section className="card stack">
        <h3>Exportar mediciones a CSV</h3>
        {personas.length === 0 ? (
          <p className="muted">Todavía no hay personas.</p>
        ) : (
          <>
            {selectorPersona('datos-persona-exportar')}
            <div className="row">
              <button className="btn" onClick={exportarCsv}>Exportar CSV</button>
            </div>
          </>
        )}
      </section>

      <section className="card stack">
        <h3>Respaldo</h3>
        <p className="muted small">
          Tus datos viven solo en este navegador. Si borras los datos de navegación o cambias de computador, se pierden a menos que tengas un respaldo.
        </p>
        <div className="row">
          <button className="btn primary" onClick={descargarRespaldo}>Descargar respaldo</button>
        </div>
        <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="datos-respaldo">Archivo de respaldo</label>
          <input key={claveRespaldo} id="datos-respaldo" type="file" accept=".json,application/json" onChange={elegirRespaldo} />
          <span className="hint">Elige un respaldo descargado antes para restaurarlo.</span>
        </div>
        {pendiente && (
          <div className="stack">
            <p className="notice warn">
              El archivo contiene {plural(pendiente.personas.length, 'persona', 'personas')} y {plural(pendiente.mediciones.length, 'medición', 'mediciones')}.
              Reemplazará todos los datos actuales.
            </p>
            <div className="row">
              <button className="btn danger" onClick={restaurar}>Sí, restaurar</button>
              <button className="btn" onClick={() => { setPendiente(null); setClaveRespaldo((k) => k + 1) }}>Cancelar</button>
            </div>
          </div>
        )}
        {avisoRespaldo && <p className={`notice ${avisoRespaldo.tipo}`} role="status">{avisoRespaldo.texto}</p>}
      </section>
    </>
  )
}
