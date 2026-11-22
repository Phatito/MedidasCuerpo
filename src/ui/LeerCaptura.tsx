import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { leerCapturaXiaomi, type LecturaCaptura } from '../domain/capturaXiaomi'
import { reconocerImagen } from './ocr'

interface Props {
  /** Antes de leer: devuelve false si el usuario no quiere reemplazar lo que tiene sin guardar. */
  puedeLeer: () => boolean
  onLectura: (l: LecturaCaptura, imagen: Blob) => void
  /** Imagen pegada con Ctrl+V desde Registrar. */
  pegada?: { id: number; imagen: Blob } | null
}

const CLAVE_USADO = 'medidascuerpo.lector-usado'
const ERROR = 'No pude leer esta imagen. Usa la captura completa del informe de Xiaomi Home, sin recortar ni comprimir.'

function lectorYaUsado(): boolean {
  try {
    return localStorage.getItem(CLAVE_USADO) === '1'
  } catch {
    return false
  }
}

export function LeerCaptura({ puedeLeer, onLectura, pegada }: Props) {
  const [leyendo, setLeyendo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clave, setClave] = useState(0)
  const vigente = useRef(true)
  const ultimaPegada = useRef<number | null>(null)

  async function leer(imagen: Blob) {
    if (!puedeLeer()) return
    setError(null)
    setLeyendo(0)
    try {
      const { lineas, ancho } = await reconocerImagen(imagen, (f) => vigente.current && setLeyendo(f))
      try {
        localStorage.setItem(CLAVE_USADO, '1')
      } catch {
        /* solo cambia el aviso de la descarga */
      }
      if (!vigente.current) return
      const lectura = leerCapturaXiaomi(lineas, ancho)
      if (Object.keys(lectura.valores).length === 0) setError(ERROR)
      else onLectura(lectura, imagen)
    } catch {
      if (vigente.current) setError('No se pudo cargar el lector de capturas. Revisa tu conexión la primera vez que lo uses e inténtalo de nuevo.')
    } finally {
      if (vigente.current) {
        setLeyendo(null)
        setClave((k) => k + 1)
      }
    }
  }

  // Una imagen pegada con Ctrl+V se lee una sola vez.
  useEffect(() => {
    if (!pegada || ultimaPegada.current === pegada.id) return
    ultimaPegada.current = pegada.id
    void leer(pegada.imagen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegada?.id])

  function elegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (archivo) void leer(archivo)
  }

  return (
    <section className="card stack" ref={(el) => void (vigente.current = el != null)}>
      <h3>Captura de Xiaomi Home</h3>
      <p className="muted small">
        En Xiaomi Home abre el informe de tu pesada y haz una captura de pantalla completa. Pásala al computador sin comprimir (AirDrop, iCloud Drive o
        como archivo por correo). La imagen se lee aquí mismo y nunca sale de tu computador.
      </p>
      <div className="row">
        <label className="btn primary grande archivo-btn">
          Leer captura de Xiaomi Home
          <input key={clave} type="file" accept="image/*" aria-label="Elegir la captura de Xiaomi Home" onChange={elegir} disabled={leyendo != null} />
        </label>
        <span className="muted small">o pega la imagen (Ctrl+V)</span>
      </div>
      {leyendo != null && (
        <div className="stack" role="status">
          <p>Leyendo la captura… {Math.round(leyendo * 100)} %</p>
          <progress max={1} value={leyendo} aria-label="Avance de la lectura" />
          {!lectorYaUsado() && <p className="muted small">La primera vez descarga el lector, unos 6 MB.</p>}
        </div>
      )}
      {error && (
        <p className="notice bad" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
