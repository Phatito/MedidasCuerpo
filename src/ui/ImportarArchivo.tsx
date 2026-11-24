import { useEffect, useState, type ChangeEvent } from 'react'
import { CAMPOS_CSV, decodificarTexto, filasAMediciones, nombreCampoCsv, parseCsv, sugerirAsignacion, type Asignacion, type CampoCsv } from '../domain/csv'
import { hoyIso } from '../domain/numbers'
import type { Persona } from '../domain/types'
import { contarExistentes, guardarMediciones } from '../storage/db'

interface Props {
  personas: Persona[]
  /** Con persona fija (desde Registrar medición) no se muestra el selector de persona. */
  personaFija?: Persona
  personaInicial?: Persona | null
  onImportado?: (cuantas: number) => void
  /** Si se elige una imagen (una captura de Xiaomi Home) en vez de un CSV, se entrega aquí para leerla. */
  onImagen?: (imagen: File) => void
}

interface Csv {
  nombre: string
  columnas: string[]
  filas: string[][]
  asignacion: Asignacion
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Importar mediciones desde un CSV: elegir archivo, revisar columnas, ver el resumen y confirmar. */
export function ImportarArchivo({ personas, personaFija, personaInicial, onImportado, onImagen }: Props) {
  const [personaId, setPersonaId] = useState(personaFija?.id ?? personaInicial?.id ?? personas[0]?.id ?? '')
  // Tras restaurar un respaldo la persona elegida puede ya no existir: se usa la primera disponible.
  const persona = personaFija ?? personas.find((p) => p.id === personaId) ?? personas[0] ?? null

  const [csv, setCsv] = useState<Csv | null>(null)
  const [existentes, setExistentes] = useState(0)
  const [avisoCsv, setAvisoCsv] = useState<{ tipo: 'ok' | 'bad'; texto: string } | null>(null)
  const [claveCsv, setClaveCsv] = useState(0)

  const resultado = csv && persona ? filasAMediciones(csv.filas, csv.asignacion, persona.id, { hoy: hoyIso(), columnas: csv.columnas.length }) : null
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
    // Una captura (PNG, JPG…) no es un CSV: se lee como captura de Xiaomi Home, o se explica dónde subirla.
    if (archivo.type.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif|gif|bmp)$/i.test(archivo.name)) {
      setCsv(null)
      setClaveCsv((k) => k + 1)
      if (onImagen) onImagen(archivo)
      else setAvisoCsv({ tipo: 'bad', texto: 'Esto es una imagen, no un CSV. Para leer una captura de Xiaomi Home ve a Registrar medición → Captura de Xiaomi Home.' })
      return
    }
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
    try {
      await guardarMediciones(resultado.mediciones)
    } catch {
      setAvisoCsv({ tipo: 'bad', texto: 'No se pudieron guardar las mediciones. Puede que el navegador se haya quedado sin espacio; no se importó nada.' })
      return
    }
    const cuantas = resultado.mediciones.length
    setAvisoCsv({ tipo: 'ok', texto: `Se importaron ${plural(cuantas, 'medición', 'mediciones')} para ${persona.nombre}.` })
    setCsv(null)
    setClaveCsv((k) => k + 1)
    onImportado?.(cuantas)
  }

  const selectorPersona = (id: string) =>
    personaFija ? null : (
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
        {personas.length === 0 ? (
          <p className="muted">Agrega primero a una persona en Familia.</p>
        ) : (
          <>
            {selectorPersona('datos-persona-importar')}
            <div className="field" style={{ maxWidth: 420 }}>
              <label htmlFor="datos-csv">Archivo CSV</label>
              <input key={claveCsv} id="datos-csv" type="file" accept=".csv,text/csv,text/plain,image/*" onChange={elegirCsv} />
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
    </>
  )
}
