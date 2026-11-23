import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sincronizarAhora, suscribirEstado, type EstadoSync } from '../sync/motor'
import { borrarCuenta, cerrarSesion, crearCuenta, iniciarSesion, sesionActual, type DecisionDatosAjenos } from '../sync/sesion'

type Modo = 'inicio' | 'crear' | 'entrar'

function textoEstado(e: EstadoSync, ahora: number): string {
  switch (e.tipo) {
    case 'al-dia': {
      const min = Math.floor((ahora - e.desde) / 60_000)
      return min < 1 ? 'Sincronizado hace un momento' : `Sincronizado hace ${min} min`
    }
    case 'sincronizando':
      return 'Sincronizando…'
    case 'sin-conexion':
      return 'Sin conexión: se sincronizará al volver'
    case 'error':
      return `Error: ${e.motivo}`
    case 'sesion-terminada':
      return 'Tu sesión terminó en este dispositivo. Inicia sesión de nuevo para seguir sincronizando.'
    case 'sin-sesion':
      return ''
  }
}

/** Sección "Cuenta y sincronización" de Ajustes y datos. */
export function Cuenta() {
  const [usuario, setUsuario] = useState<string | null | undefined>(undefined)
  const [estado, setEstado] = useState<EstadoSync>({ tipo: 'sin-sesion' })
  const [modo, setModo] = useState<Modo>('inicio')
  const [nombre, setNombre] = useState('')
  const [frase, setFrase] = useState('')
  const [frase2, setFrase2] = useState('')
  const [entiendo, setEntiendo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preguntaAjenos, setPreguntaAjenos] = useState<{ usuario: string; responder: (d: DecisionDatosAjenos) => void } | null>(null)
  const [borrarLocales, setBorrarLocales] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState('')
  const [pidiendoBorrado, setPidiendoBorrado] = useState(false)
  const [ahora, setAhora] = useState(Date.now())
  const primerBoton = useRef<HTMLButtonElement>(null)

  const recargar = () => sesionActual().then((s) => setUsuario(s?.usuario ?? null))
  useEffect(() => {
    void recargar()
    const quitar = suscribirEstado((e) => {
      setEstado(e)
      if (e.tipo === 'sesion-terminada' || e.tipo === 'sin-sesion') void recargar()
    })
    const reloj = setInterval(() => setAhora(Date.now()), 30_000)
    return () => {
      quitar()
      clearInterval(reloj)
    }
  }, [])
  useEffect(() => {
    if (preguntaAjenos) primerBoton.current?.focus()
  }, [preguntaAjenos])

  const preguntar = (u: string) => () =>
    new Promise<DecisionDatosAjenos>((responder) =>
      setPreguntaAjenos({
        usuario: u,
        responder: (d) => {
          setPreguntaAjenos(null)
          responder(d)
        },
      }),
    )

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (modo === 'crear') {
      if (frase.length < 12) return setError('La frase secreta debe tener al menos 12 caracteres. Te sugerimos usar 4 palabras.')
      if (frase !== frase2) return setError('Las dos frases no coinciden.')
      if (!entiendo) return setError('Marca la casilla para confirmar que entiendes que la frase no se puede recuperar.')
    }
    setOcupado(true)
    try {
      const u = nombre.trim().toLowerCase()
      const ok = modo === 'crear' ? await crearCuenta(u, frase, preguntar(u)) : await iniciarSesion(u, frase, preguntar(u))
      // Entró o canceló ante los datos ajenos: en ambos casos se vuelve al inicio de la sección.
      setFrase('')
      setFrase2('')
      setModo('inicio')
      if (!ok) setError(null)
      await recargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar.')
    } finally {
      setOcupado(false)
    }
  }

  if (usuario === undefined) return null

  return (
    <section className="card stack cuenta" aria-labelledby="cuenta-titulo">
      <h3 id="cuenta-titulo">Cuenta y sincronización</h3>

      {usuario ? (
        <>
          <p>
            Conectado como <b>{usuario}</b>
          </p>
          <p className="muted small" role="status">{textoEstado(estado, ahora)}</p>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => void sincronizarAhora()} disabled={estado.tipo === 'sincronizando'}>
              Sincronizar ahora
            </button>
            <button type="button" className="btn" onClick={() => void cerrarSesion({ borrarDatosLocales: borrarLocales }).then(recargar)}>
              Cerrar sesión
            </button>
          </div>
          <label className="check small">
            <input type="checkbox" checked={borrarLocales} onChange={(e) => setBorrarLocales(e.target.checked)} />
            Al cerrar sesión, borrar también los datos de este dispositivo
          </label>
          {pidiendoBorrado ? (
            <div className="stack">
              <p className="error">
                Se borrará tu cuenta y todo lo guardado en la nube. Los datos de este dispositivo se conservan. Escribe <b>{usuario}</b> para confirmar.
              </p>
              <div className="field" style={{ maxWidth: 320 }}>
                <label htmlFor="cuenta-confirmar">Nombre de usuario</label>
                <input id="cuenta-confirmar" value={confirmarBorrado} onChange={(e) => setConfirmarBorrado(e.target.value)} autoComplete="off" />
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn danger"
                  disabled={confirmarBorrado.trim().toLowerCase() !== usuario}
                  onClick={() =>
                    void borrarCuenta()
                      .then(recargar)
                      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo borrar la cuenta.'))
                  }
                >
                  Borrar cuenta definitivamente
                </button>
                <button type="button" className="btn" onClick={() => setPidiendoBorrado(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn link danger" style={{ alignSelf: 'flex-start' }} onClick={() => setPidiendoBorrado(true)}>
              Borrar cuenta
            </button>
          )}
        </>
      ) : modo === 'inicio' ? (
        <>
          <p className="small">
            Usa los mismos datos en tu computador y en tu celular. Tus datos viajan cifrados con tu frase secreta: solo tú puedes leerlos. Si la
            olvidas, no se puede recuperar.
          </p>
          {estado.tipo === 'sesion-terminada' && <p className="notice warn small">{textoEstado(estado, ahora)}</p>}
          <div className="row">
            <button type="button" className="btn primary" onClick={() => { setModo('crear'); setError(null); setEntiendo(false) }}>Crear cuenta</button>
            <button type="button" className="btn" onClick={() => { setModo('entrar'); setError(null) }}>Iniciar sesión</button>
          </div>
        </>
      ) : (
        <form className="stack" onSubmit={enviar} noValidate>
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="cuenta-usuario">Nombre de usuario</label>
            <input id="cuenta-usuario" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </div>
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="cuenta-frase">Frase secreta</label>
            <input id="cuenta-frase" type="password" value={frase} onChange={(e) => setFrase(e.target.value)} autoComplete={modo === 'crear' ? 'new-password' : 'current-password'} />
            {modo === 'crear' && <span className="hint">Al menos 12 caracteres. Mejor 4 palabras que recuerdes, por ejemplo una frase tuya.</span>}
          </div>
          {modo === 'crear' && (
            <>
              <div className="field" style={{ maxWidth: 360 }}>
                <label htmlFor="cuenta-frase2">Repite la frase secreta</label>
                <input id="cuenta-frase2" type="password" value={frase2} onChange={(e) => setFrase2(e.target.value)} autoComplete="new-password" />
              </div>
              <label className="check small">
                <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
                Entiendo que si olvido la frase no se puede recuperar
              </label>
            </>
          )}
          {error && <p className="notice bad" role="alert">{error}</p>}
          <div className="row">
            <button type="submit" className="btn primary" disabled={ocupado}>
              {ocupado ? (modo === 'crear' ? 'Creando cuenta…' : 'Entrando…') : modo === 'crear' ? 'Crear cuenta y sincronizar' : 'Entrar y sincronizar'}
            </button>
            <button type="button" className="btn" onClick={() => setModo('inicio')} disabled={ocupado}>Cancelar</button>
          </div>
        </form>
      )}

      {preguntaAjenos && (
        <div className="dialogo-fondo">
          <div className="card stack dialogo" role="dialog" aria-modal="true" aria-labelledby="ajenos-titulo">
            <h3 id="ajenos-titulo">Este dispositivo tiene datos que no son de {preguntaAjenos.usuario}</h3>
            <p className="small">Puedes sumarlos a esta cuenta o reemplazarlos por lo que esta cuenta tiene en la nube (los de este dispositivo se borran).</p>
            <div className="row">
              <button ref={primerBoton} type="button" className="btn primary" onClick={() => preguntaAjenos.responder('subir')}>Subirlos a esta cuenta</button>
              <button type="button" className="btn danger" onClick={() => preguntaAjenos.responder('reemplazar')}>Reemplazarlos por los de la nube</button>
              <button type="button" className="btn" onClick={() => preguntaAjenos.responder('cancelar')}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
