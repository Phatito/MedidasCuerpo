import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { escribirRuta, leerRuta, personaInicio, type Ruta } from '../domain/rutas'
import { hayServidor } from '../sync/api'
import { programarSincronizacion, suscribirEstado } from '../sync/motor'
import type { Medicion, Persona } from '../domain/types'
import { db, guardarAjustes, leerAjustes, listarPersonas, listarTodasLasMediciones } from '../storage/db'
import { Datos } from './Datos'
import { Familia } from './Familia'
import { IconoNube } from './IconoNube'
import { Ficha } from './Ficha'
import { Historial } from './Historial'
import type { Borrador } from './Medir'
import { Registrar } from './Registrar'
import { SelectorPerfil } from './SelectorPerfil'
import { PantallaSemana } from './TuSemana'

const rutaActual = () => leerRuta(window.location.hash)

export function App() {
  const [ruta, setRuta] = useState<Ruta>(rutaActual)
  const [familiaNueva, setFamiliaNueva] = useState(0)
  // Aviso para mostrar en una pantalla concreta (por ejemplo "Medición guardada." al volver a la ficha).
  const [aviso, setAviso] = useState<{ hash: string; texto: string } | null>(null)
  const [sinAlmacenamiento, setSinAlmacenamiento] = useState(false)
  // Lo escrito en Registrar y aún no guardado, por persona: cambiar de persona no debe borrarlo.
  const borradores = useRef(new Map<string, Borrador>())
  const personas = useLiveQuery(() => listarPersonas().catch(() => [] as Persona[]), [])
  const ajustes = useLiveQuery(() => leerAjustes().catch(() => null), [])
  const mediciones = useLiveQuery(() => listarTodasLasMediciones().catch(() => [] as Medicion[]), [], [] as Medicion[])

  useEffect(() => {
    db.open().catch(() => setSinAlmacenamiento(true))
    void navigator.storage?.persist?.()
    const alCambiar = () => setRuta(rutaActual())
    window.addEventListener('hashchange', alCambiar)
    window.addEventListener('popstate', alCambiar)
    return () => {
      window.removeEventListener('hashchange', alCambiar)
      window.removeEventListener('popstate', alCambiar)
    }
  }, [])

  // Sincronización: se programa al abrir (sin sesión, cada ciclo termina enseguida).
  useEffect(() => (hayServidor() ? programarSincronizacion() : undefined), [])
  useEffect(
    () =>
      suscribirEstado((e) => {
        if (e.tipo === 'sesion-terminada')
          setAviso({ hash: window.location.hash, texto: 'Tu sesión terminó en este dispositivo. Inicia sesión de nuevo para seguir sincronizando.' })
      }),
    [],
  )

  const cargado = personas != null && ajustes !== undefined
  const principal = personaInicio(personas ?? [], ajustes?.personaPrincipalId)

  // La persona principal siempre apunta a alguien: la primera creada, o la siguiente si se borra.
  useEffect(() => {
    if (!cargado || !ajustes || !principal || ajustes.personaPrincipalId === principal.id) return
    void guardarAjustes({ ...ajustes, personaPrincipalId: principal.id }).catch(() => undefined)
  }, [cargado, ajustes, principal])

  const personaDeRuta = 'personaId' in ruta ? (personas ?? []).find((p) => p.id === ruta.personaId) ?? null : null
  // Una dirección sin pantalla válida (inicio, o una persona que ya no existe) se reemplaza por la ficha principal.
  const destino: Ruta | null = !cargado
    ? null
    : ruta.pantalla === 'inicio' || ('personaId' in ruta && !personaDeRuta)
      ? principal
        ? { pantalla: 'ficha', personaId: principal.id }
        : { pantalla: 'familia' }
      : null
  useEffect(() => {
    if (!destino) return
    history.replaceState(history.state, '', escribirRuta(destino))
    setRuta(destino)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino && escribirRuta(destino)])

  // La pantalla desde la que se llegó a la actual (dentro de la app), para que Guardar sepa adónde volver.
  const anterior = useRef<string | null>(null)
  const principal_ = useRef<HTMLElement>(null)
  const primeraVista = useRef(true)
  const claveVista = destino || !cargado ? null : escribirRuta(ruta)

  // Al cambiar de pantalla, el foco va a su título y el título de la pestaña del navegador cambia:
  // así quien usa teclado o lector de pantalla sabe que la página cambió.
  useEffect(() => {
    if (!claveVista) return
    const enfocar = !primeraVista.current
    primeraVista.current = false
    // La pantalla puede tardar un instante en mostrar su título (mientras carga sus datos): se espera hasta un segundo.
    let intentos = 0
    let marco = 0
    const buscar = () => {
      const h2 = principal_.current?.querySelector('h2')
      if (!h2) {
        if (++intentos < 60) marco = requestAnimationFrame(buscar)
        return
      }
      document.title = `${h2.textContent} · Mesura`
      if (enfocar) {
        h2.setAttribute('tabindex', '-1')
        h2.focus()
      }
    }
    buscar()
    return () => cancelAnimationFrame(marco)
  }, [claveVista])

  function navegar(r: Ruta) {
    setAviso(null)
    anterior.current = window.location.hash
    if (escribirRuta(r) !== window.location.hash) history.pushState({ app: true }, '', escribirRuta(r))
    setRuta(r)
  }

  /** Vuelve a la pantalla anterior de la app; si se entró directo por la dirección, va a `alternativa`. */
  function volver(alternativa: Ruta) {
    if (history.state?.app) history.back()
    else {
      history.replaceState(null, '', escribirRuta(alternativa))
      setRuta(alternativa)
    }
  }

  const ultimaFecha = new Map<string, string>()
  for (const m of mediciones) if ((ultimaFecha.get(m.personaId) ?? '') < m.fecha) ultimaFecha.set(m.personaId, m.fecha)

  const persona = personaDeRuta ?? principal
  const fichaDe = (id: string): Ruta => ({ pantalla: 'ficha', personaId: id })
  const alInicio: Ruta = principal ? fichaDe(principal.id) : { pantalla: 'familia' }
  const vista = destino ? null : ruta
  const avisoVisible = !!(aviso && vista && aviso.hash === escribirRuta(vista))

  return (
    <>
      <header className="top">
        <div className="wrap">
          <button type="button" className="brand" onClick={() => navegar(alInicio)} aria-label="Mesura, ir al inicio">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
            <span className="brand-nombre">Mesura</span>
          </button>
          {personas && personas.length > 0 && (
            <SelectorPerfil
              personas={personas}
              actual={persona}
              principalId={principal?.id}
              ultimaFecha={ultimaFecha}
              onElegir={(id) => navegar(fichaDe(id))}
              onAgregar={() => {
                setFamiliaNueva((n) => n + 1)
                navegar({ pantalla: 'familia' })
              }}
              onFamilia={() => navegar({ pantalla: 'familia' })}
            />
          )}
          <IconoNube onAbrir={() => navegar({ pantalla: 'ajustes' })} />
          <button type="button" className="icon-btn" aria-label="Ajustes y datos" onClick={() => navegar({ pantalla: 'ajustes' })}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
            </svg>
          </button>
        </div>
      </header>
      <main className="wrap" ref={principal_}>
        {/* Región de avisos siempre presente, para que los lectores de pantalla anuncien su texto cuando aparece. */}
        <p id="aviso-app" role="status" className={avisoVisible ? 'notice ok aviso-app' : 'sr-only'}>
          {avisoVisible ? aviso!.texto : ''}
        </p>
        {sinAlmacenamiento ? (
          <div className="notice bad">Este navegador no permite guardar datos locales. La app no puede funcionar así.</div>
        ) : !cargado || !vista ? (
          <p className="muted">Cargando tus datos…</p>
        ) : (
          <>
            {vista.pantalla !== 'ficha' && (
              <button type="button" className="btn volver" onClick={() => volver(persona ? fichaDe(persona.id) : alInicio)}>
                {vista.pantalla === 'registrar' ? '← Volver a la ficha' : '← Volver'}
              </button>
            )}
            {vista.pantalla === 'familia' && (
              <Familia
                key={familiaNueva}
                nueva={familiaNueva > 0}
                personas={personas}
                onIrDatos={() => navegar({ pantalla: 'ajustes' })}
                onVerFicha={(id) => navegar(fichaDe(id))}
                onMedir={(id) => navegar({ pantalla: 'registrar', personaId: id })}
              />
            )}
            {vista.pantalla === 'ficha' && personaDeRuta && (
              <Ficha
                key={personaDeRuta.id}
                persona={personaDeRuta}
                onMedir={() => navegar({ pantalla: 'registrar', personaId: personaDeRuta.id })}
                onVerMediciones={() => navegar({ pantalla: 'mediciones', personaId: personaDeRuta.id })}
                onVerSemana={() => navegar({ pantalla: 'semana', personaId: personaDeRuta.id })}
              />
            )}
            {vista.pantalla === 'registrar' && personaDeRuta && (
              <Registrar
                key={`${personaDeRuta.id}-${vista.fecha ?? ''}`}
                persona={personaDeRuta}
                fecha={vista.fecha}
                borrador={borradores.current.get(personaDeRuta.id)}
                onBorrador={(b) => (b ? borradores.current.set(personaDeRuta.id, b) : borradores.current.delete(personaDeRuta.id))}
                onListo={(texto) => {
                  const ficha = fichaDe(personaDeRuta.id)
                  // Si se vino desde la ficha, se vuelve atrás; si no (por ejemplo desde Todas las mediciones), se va a la ficha.
                  if (anterior.current === escribirRuta(ficha) && history.state?.app) history.back()
                  else {
                    history.replaceState(history.state, '', escribirRuta(ficha))
                    setRuta(ficha)
                  }
                  setAviso(texto ? { hash: escribirRuta(ficha), texto } : null)
                }}
              />
            )}
            {vista.pantalla === 'mediciones' && personaDeRuta && (
              <>
                <h2>Todas las mediciones · {personaDeRuta.nombre}</h2>
                <Historial
                  persona={personaDeRuta}
                  onEditar={(fecha) => navegar({ pantalla: 'registrar', personaId: personaDeRuta.id, fecha })}
                  onMedir={() => navegar({ pantalla: 'registrar', personaId: personaDeRuta.id })}
                />
              </>
            )}
            {vista.pantalla === 'semana' && personaDeRuta && <PantallaSemana persona={personaDeRuta} />}
            {vista.pantalla === 'ajustes' && <Datos personas={personas} personaActual={persona} />}
          </>
        )}
      </main>
    </>
  )
}
