import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { leerCapturaXiaomi, unirLecturas, type LecturaCaptura } from '../domain/capturaXiaomi'
import { ImagenChica, ImagenIlegible, reconocerImagen } from './ocr'

interface Props {
  /** Antes de leer: devuelve false si el usuario no quiere reemplazar lo que tiene sin guardar. */
  puedeLeer: () => boolean
  /** `inicio`: cuándo empezó la lectura, para saber si se escribió algo mientras tanto. */
  onLectura: (l: LecturaCaptura, imagen: Blob, inicio: number) => void
  /** Avisa cuando empieza y termina una lectura (Registrar ignora lo pegado mientras tanto). */
  onLeyendo?: (activo: boolean) => void
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

export function LeerCaptura({ puedeLeer, onLectura, onLeyendo, pegada }: Props) {
  const [leyendo, setLeyendo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clave, setClave] = useState(0)
  const vigente = useRef(true)
  const ultimaPegada = useRef<number | null>(null)

  async function leer(imagenes: Blob[]) {
    if (!puedeLeer()) {
      // Así se puede volver a elegir el mismo archivo.
      setClave((k) => k + 1)
      return
    }
    const inicio = Date.now()
    setError(null)
    setLeyendo(0)
    onLeyendo?.(true)
    try {
      // Varias capturas del mismo informe (por ejemplo, una por cada parte) se leen una tras otra y se juntan.
      const lecturas: LecturaCaptura[] = []
      for (const [i, imagen] of imagenes.entries()) {
        const { lineas, ancho } = await reconocerImagen(imagen, (f) => vigente.current && setLeyendo((i + f) / imagenes.length))
        lecturas.push(leerCapturaXiaomi(lineas, ancho))
      }
      try {
        localStorage.setItem(CLAVE_USADO, '1')
      } catch {
        /* solo cambia el aviso de la descarga */
      }
      if (!vigente.current) return
      const lectura = unirLecturas(lecturas)
      if (Object.keys(lectura.valores).length === 0) setError(ERROR)
      else onLectura(lectura, imagenes[0], inicio)
    } catch (e) {
      if (!vigente.current) return
      setError(
        e instanceof ImagenChica
          ? `Esta imagen es muy pequeña (${e.ancho} × ${e.alto} px) para leer las letras chicas del informe. Suele pasar al mandarla por WhatsApp como foto, que la achica. Pásala sin comprimir (por WhatsApp como documento, por correo o con cable), o haz varias capturas normales del informe y elígelas juntas.`
          : e instanceof ImagenIlegible
            ? ERROR
            : 'No se pudo cargar el lector de capturas. Revisa tu conexión la primera vez que lo uses e inténtalo de nuevo.',
      )
    } finally {
      onLeyendo?.(false)
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
    void leer([pegada.imagen])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegada?.id])

  function elegir(e: ChangeEvent<HTMLInputElement>) {
    const archivos = [...(e.target.files ?? [])]
    if (archivos.length) void leer(archivos)
  }

  return (
    <section className="card stack" ref={(el) => void (vigente.current = el != null)}>
      <h3>Captura de Xiaomi Home</h3>
      <p className="muted small">
        En Xiaomi Home comparte el informe de tu pesada y elige <b>Guardar en Archivos</b>; luego aquí toca el botón y elige <b>Elegir archivo</b> (en
        Android, <b>Archivos</b>). También sirven varias capturas normales del informe elegidas juntas. Si la pasas a otro equipo, que sea sin comprimir:
        por WhatsApp como documento, no como foto. Las imágenes se leen aquí mismo y nunca salen de tu dispositivo.
      </p>
      <div className="row">
        <label className="btn primary grande archivo-btn">
          Leer capturas de Xiaomi Home
          <input key={clave} type="file" accept="image/*" multiple aria-label="Elegir la captura de Xiaomi Home" onChange={elegir} disabled={leyendo != null} />
        </label>
        <span className="muted small">o pega la imagen (Ctrl+V)</span>
      </div>
      {/* Región de estado siempre presente: anuncia el inicio de la lectura una vez, no cada porcentaje. */}
      <p role="status" className={leyendo != null ? '' : 'sr-only'}>
        {leyendo != null ? 'Leyendo la captura…' : ''}
      </p>
      {leyendo != null && (
        <div className="stack">
          <progress max={1} value={leyendo} aria-label="Avance de la lectura" />
          <span className="muted small num" aria-hidden="true">{Math.round(leyendo * 100)} %</span>
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
