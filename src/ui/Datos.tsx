import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent } from 'react'
import { medicionesACsv } from '../domain/csv'
import { hoyIso } from '../domain/numbers'
import { DIAS_SEMANA, generarIcs } from '../domain/reminders'
import type { Persona } from '../domain/types'
import { exportarRespaldo, leerRespaldo, restaurarRespaldo, type Respaldo } from '../storage/backup'
import { guardarAjustes, leerAjustes, listarMediciones } from '../storage/db'
import { hayServidor } from '../sync/api'
import { Cuenta } from './Cuenta'
import { sesionActual } from '../sync/sesion'
import { descargar } from './descargar'
import { ImportarArchivo, plural } from './ImportarArchivo'

interface Props {
  personas: Persona[]
  personaActual: Persona | null
}


export function Datos({ personas, personaActual }: Props) {
  const ajustes = useLiveQuery(leerAjustes, [])
  // Con sesión iniciada, restaurar también cambia la nube: se avisa.
  const conCuenta = useLiveQuery(() => sesionActual().then((x) => x != null), [], false)
  const [personaId, setPersonaId] = useState(personaActual?.id ?? personas[0]?.id ?? '')
  // Tras restaurar un respaldo la persona elegida puede ya no existir: se usa la primera disponible.
  const persona = personas.find((p) => p.id === personaId) ?? personas[0] ?? null


  const [pendiente, setPendiente] = useState<Respaldo | null>(null)
  const [avisoRespaldo, setAvisoRespaldo] = useState<{ tipo: 'ok' | 'bad'; texto: string } | null>(null)
  const [claveRespaldo, setClaveRespaldo] = useState(0)

  async function exportarCsv() {
    if (!persona) return
    descargar(`medidas-${persona.nombre}.csv`, medicionesACsv(await listarMediciones(persona.id)), 'text/csv;charset=utf-8')
  }

  async function descargarRespaldo() {
    const respaldo = await exportarRespaldo()
    descargar(`mesura-${hoyIso()}.json`, JSON.stringify(respaldo, null, 2), 'application/json')
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
    try {
      await restaurarRespaldo(pendiente)
    } catch {
      setAvisoRespaldo({ tipo: 'bad', texto: 'No se pudo restaurar el respaldo; tus datos actuales no cambiaron.' })
      return
    }
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
      <h2>Ajustes y datos</h2>

      {hayServidor() && <Cuenta />}

      {personas.length > 0 && (
        <section className="card stack">
          <h3>Persona principal</h3>
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="ajustes-principal">Persona principal</label>
            <select
              id="ajustes-principal"
              value={ajustes?.personaPrincipalId ?? ''}
              disabled={!ajustes}
              onChange={(e) => ajustes && guardarAjustes({ ...ajustes, personaPrincipalId: e.target.value })}
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <p className="muted small">Su ficha es la que se abre al iniciar la app.</p>
        </section>
      )}

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
        <ImportarArchivo personas={personas} personaInicial={personaActual} />
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
          Sin cuenta, tus datos viven solo en este navegador: si borras los datos de navegación o cambias de computador, se pierden a menos que tengas un respaldo. Con cuenta, además viajan cifrados a la nube.
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
              {conCuenta && ' Como tienes una cuenta, también se reemplazarán los datos de la nube y de tus otros dispositivos.'}
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
