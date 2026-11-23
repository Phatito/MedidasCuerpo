import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

async function agregarAna(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Agregar persona' }).click()
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Sexo').selectOption('mujer')
  await page.getByLabel('Estatura (cm)').fill('165')
  await page.getByRole('button', { name: 'Guardar persona' }).click()
  await expect(page.getByRole('heading', { name: 'Ana' })).toBeVisible()
}

test('agregar a la primera persona', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByText('Agrega a la primera persona para empezar a registrar mediciones.')).toBeVisible()
  await expect(page.locator('.perfil-boton')).toHaveCount(0)
  await agregarAna(page)
  await expect(page.getByText('Le toca medirse')).toBeVisible()
})

test('una estatura fuera de rango no se guarda', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Agregar persona' }).click()
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Estatura (cm)').fill('1,65')
  await page.getByRole('button', { name: 'Guardar persona' }).click()
  await expect(page.getByText('Debe estar entre 40 y 250')).toBeVisible()
})

const filas = (page: Page) => page.locator('tbody tr')
const elegirMetrica = (page: Page, nombre: string) => page.getByRole('group', { name: 'Medida del gráfico' }).getByRole('button', { name: nombre }).click()
// Navegación sin pestañas: selector de perfil, botones de la ficha y ⚙.
const perfiles = (page: Page) => page.getByRole('menu', { name: 'Perfiles' })
async function abrirPerfiles(page: Page) {
  if (!(await perfiles(page).isVisible())) await page.locator('.perfil-boton').click()
}
async function elegirPerfil(page: Page, nombre: string) {
  await abrirPerfiles(page)
  await perfiles(page).getByRole('menuitem', { name: new RegExp(nombre) }).click()
  await expect(page.locator('.perfil-nombre')).toHaveText(nombre)
}
async function irAFicha(page: Page) {
  await abrirPerfiles(page)
  await perfiles(page).locator('[aria-current="true"]').click()
}
async function ir(page: Page, destino: 'Ficha' | 'Medir' | 'Historial' | 'Familia' | 'Datos' | 'Evolución') {
  if (destino === 'Ficha' || destino === 'Evolución') return irAFicha(page)
  if (destino === 'Datos') return page.getByRole('button', { name: 'Ajustes y datos' }).click()
  if (destino === 'Familia') {
    await abrirPerfiles(page)
    return perfiles(page).getByRole('menuitem', { name: 'Administrar familia…' }).click()
  }
  await irAFicha(page)
  if (destino === 'Medir') return page.getByRole('main').getByRole('button', { name: /Registrar medición/ }).first().click()
  return page.getByRole('button', { name: 'Ver todas las mediciones →' }).click()
}

test('registrar, actualizar y validar una medición', async ({ page }) => {
  await agregarAna(page)
  await page.getByRole('button', { name: 'Registrar medición' }).click()
  await page.getByLabel('Peso (kg)').fill('72,5')
  await page.getByLabel('Cintura (cm)').fill('88')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()

  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('72,5')

  // Guardar otra vez el mismo día reemplaza la medición.
  await ir(page, 'Medir')
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('72,5')
  await page.getByLabel('Peso (kg)').fill('72')
  await page.getByRole('button', { name: 'Actualizar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('72,0')

  // Un valor fuera de rango no se guarda.
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('900')
  await page.getByRole('button', { name: 'Actualizar medición' }).click()
  await expect(page.getByText('Debe estar entre 2 y 400')).toBeVisible()
  await ir(page, 'Historial')
  await expect(filas(page).first()).toContainText('72,0')

  // Eliminar pide confirmación en la fila.
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('button', { name: 'Sí, eliminar' }).click()
  await expect(page.getByText('Todavía no hay mediciones de Ana.')).toBeVisible()
})

test('el formulario exige el peso', async ({ page }) => {
  await agregarAna(page)
  await page.getByRole('button', { name: 'Registrar medición' }).click()
  await page.getByLabel('Cintura (cm)').fill('88')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('El peso es obligatorio', { exact: true })).toBeVisible()
})

function haceDias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function medir(page: Page, fecha: string, peso: string, cintura: string) {
  await ir(page, 'Medir')
  await page.getByLabel('Fecha').fill(fecha)
  await page.getByLabel('Peso (kg)').fill(peso)
  await page.getByLabel('Cintura (cm)').fill(cintura)
  await page.getByRole('button', { name: /Guardar medición|Actualizar medición/ }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
}

test('la evolución interpreta dos mediciones', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await medir(page, haceDias(0), '72,4', '86,5')
  await ir(page, 'Evolución')
  await expect(page.getByRole('heading', { name: 'Mismo peso, menos cintura' })).toBeVisible()
  await expect(page.getByText('Orientación general, no diagnóstico médico.')).toBeVisible()
  await expect(page.locator('svg.chart circle.dot')).toHaveCount(2)
  await expect(page.locator('svg.chart')).toContainText('72,4')
  await elegirMetrica(page, 'Cintura')
  await expect(page.locator('svg.chart')).toContainText('86,5')
  // Solo se ofrecen métricas con datos.
  await expect(page.getByRole('group', { name: 'Medida del gráfico' }).getByRole('button')).toHaveText(['Peso', 'Cintura'])
  await expect(page.getByLabel('Más medidas').locator('option')).toHaveText(['Más…', 'IMC'])
})

test('con una sola medición la evolución invita a seguir', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(0), '72,5', '88')
  await ir(page, 'Evolución')
  await expect(page.getByText('Registra otra medición para ver la línea.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Primera medición registrada' })).toBeVisible()
  await expect(page.locator('svg.chart circle.dot')).toHaveCount(1)
})

const CSV_EXCEL = fileURLToPath(new URL('./fixtures/excel.csv', import.meta.url))

async function importarCsv(page: Page) {
  await ir(page, 'Datos')
  await page.getByLabel('Archivo CSV').setInputFiles(CSV_EXCEL)
}

test('importar un CSV de Excel en español', async ({ page }) => {
  await agregarAna(page)
  await importarCsv(page)
  await expect(page.getByLabel('Columna para Peso')).toHaveValue('1')
  await expect(page.getByLabel('Columna para Grasa corporal')).toHaveValue('2')
  await expect(page.getByText('3 nuevas, 0 reemplazan, 1 omitida')).toBeVisible()
  await expect(page.getByText('Fila 4: Falta el peso')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar importación' }).click()
  await expect(page.getByText('Se importaron 3 mediciones para Ana.')).toBeVisible()
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(3)
  await expect(filas(page).first()).toContainText('26/10/2025')
  await expect(filas(page).first()).toContainText('72,6')

  // Importar de nuevo avisa que reemplaza.
  await importarCsv(page)
  await expect(page.getByText('0 nuevas, 3 reemplazan, 1 omitida')).toBeVisible()
})

test('respaldo: descargar, rechazar un archivo ajeno y restaurar', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(0), '72,5', '88')
  await ir(page, 'Familia')
  await expect(page.getByText('Todavía no has hecho un respaldo de tus datos.')).toBeVisible()

  await ir(page, 'Datos')
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar respaldo' }).click()])
  expect(descarga.suggestedFilename()).toMatch(/^mesura-\d{4}-\d{2}-\d{2}\.json$/)
  const contenido = await readFile(await descarga.path(), 'utf8')
  expect(JSON.parse(contenido)).toMatchObject({ app: 'MedidasCuerpo', version: 1, personas: [{ nombre: 'Ana' }], mediciones: [{ pesoKg: 72.5 }] })

  // Un archivo que no es un respaldo se rechaza y no toca los datos.
  await page.getByLabel('Archivo de respaldo').setInputFiles({ name: 'otro.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') })
  await expect(page.getByText('El archivo no es un respaldo de Mesura')).toBeVisible()
  await ir(page, 'Familia')
  await expect(page.getByRole('heading', { name: 'Ana' })).toBeVisible()
  await expect(page.getByText('Todavía no has hecho un respaldo de tus datos.')).toBeHidden()

  // Se agrega otra medición y luego se restaura el respaldo: vuelve a haber una sola.
  await medir(page, haceDias(1), '73', '89')
  await ir(page, 'Datos')
  await page.getByLabel('Archivo de respaldo').setInputFiles({ name: 'respaldo.json', mimeType: 'application/json', buffer: Buffer.from(contenido) })
  await expect(page.getByText('El archivo contiene 1 persona y 1 medición. Reemplazará todos los datos actuales.')).toBeVisible()
  await page.getByRole('button', { name: 'Sí, restaurar' }).click()
  await expect(page.getByText('Respaldo restaurado.')).toBeVisible()
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(1)
})

test('exportar CSV y descargar el recordatorio de calendario', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(0), '72,5', '88')
  await ir(page, 'Datos')

  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()])
  expect(csv.suggestedFilename()).toBe('medidas-Ana.csv')
  expect(await readFile(await csv.path(), 'utf8')).toContain(`${haceDias(0)};72,5;`)

  await page.getByLabel('Día del recordatorio').selectOption('3')
  await page.getByLabel('Hora del recordatorio').fill('20:30')
  const [ics] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar evento de calendario' }).click()])
  expect(ics.suggestedFilename()).toBe('recordatorio-medidas.ics')
  const texto = await readFile(await ics.path(), 'utf8')
  expect(texto).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE')
  expect(texto).toMatch(/DTSTART:\d{8}T203000/)

  // El día y la hora elegidos se recuerdan.
  await page.reload()
  await ir(page, 'Datos')
  await expect(page.getByLabel('Día del recordatorio')).toHaveValue('3')
  await expect(page.getByLabel('Hora del recordatorio')).toHaveValue('20:30')
})

test('es instalable: tiene manifiesto y service worker', async ({ page, request }) => {
  await page.goto('./')
  const manifiesto = await request.get('manifest.webmanifest')
  expect(manifiesto.ok()).toBe(true)
  expect(await manifiesto.json()).toMatchObject({ name: 'Mesura', short_name: 'Mesura', display: 'standalone', start_url: '/MedidasCuerpo/' })
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()) != null)).toBe(true)
})

test('cambiar la fecha en Medir no borra lo ya escrito', async ({ page }) => {
  await agregarAna(page)
  await page.getByRole('button', { name: 'Registrar medición' }).click()
  await page.getByLabel('Peso (kg)').fill('72,5')
  await page.getByLabel('Cintura (cm)').fill('88')
  await page.getByLabel('Fecha').fill(haceDias(1))
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('72,5')
  await expect(page.getByLabel('Cintura (cm)')).toHaveValue('88')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(1)
  const [a, mes, d] = haceDias(1).split('-')
  await expect(filas(page).first()).toContainText(`${d}/${mes}/${a}`)
})

test('una pantalla Medir que quedó abierta pasa al día de hoy al volver a ella', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 10, 0))
  await agregarAna(page)
  await page.getByRole('button', { name: 'Registrar medición' }).click()
  await page.getByLabel('Peso (kg)').fill('72,5')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  // Guardar vuelve a la ficha; se abre Registrar otra vez y se deja abierto.
  await ir(page, 'Medir')
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('72,5')

  // Una semana después la ventana sigue abierta y la persona vuelve a ella.
  await page.clock.setFixedTime(new Date(2026, 10, 11, 10, 0))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByLabel('Fecha')).toHaveValue('2026-11-11')
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('')
  await page.getByLabel('Peso (kg)').fill('72')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(2)
})

test('tras restaurar un respaldo con otras personas, exportar sigue funcionando', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Agregar persona' }).click()
  await page.getByLabel('Nombre').fill('Prueba')
  await page.getByLabel('Sexo').selectOption('hombre')
  await page.getByLabel('Estatura (cm)').fill('170')
  await page.getByRole('button', { name: 'Guardar persona' }).click()
  await ir(page, 'Datos')
  const respaldo = {
    app: 'MedidasCuerpo', version: 1, exportadoEn: '2026-11-01T00:00:00.000Z',
    personas: [{ id: 'ana', nombre: 'Ana', sexo: 'mujer', fechaNacimiento: '', estaturaCm: 165, objetivo: 'mantener', creadaEn: '2026-01-01T00:00:00.000Z' }],
    mediciones: [{ id: 'ana_2026-10-01', personaId: 'ana', fecha: '2026-10-01', pesoKg: 60, origen: 'manual' }],
    ajustes: { diaRecordatorio: 0, horaRecordatorio: '09:00' },
  }
  await page.getByLabel('Archivo de respaldo').setInputFiles({ name: 'r.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(respaldo)) })
  await page.getByRole('button', { name: 'Sí, restaurar' }).click()
  await expect(page.getByText('Respaldo restaurado.')).toBeVisible()
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()])
  expect(csv.suggestedFilename()).toBe('medidas-Ana.csv')
})

test('el sexo no viene elegido de antemano y es obligatorio', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Agregar persona' }).click()
  await expect(page.getByLabel('Sexo')).toHaveValue('')
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Estatura (cm)').fill('165')
  await page.getByRole('button', { name: 'Guardar persona' }).click()
  await expect(page.getByText('Elige el sexo')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ana' })).toBeHidden()
})

test('con cuatro mediciones ya se ve el promedio de las últimas 4', async ({ page }) => {
  await agregarAna(page)
  for (const [dias, peso] of [[21, '73'], [14, '72,6'], [7, '72,4'], [0, '72']] as const) await medir(page, haceDias(dias), peso, '88')
  await ir(page, 'Evolución')
  // En el peso, el promedio se reemplaza por la tendencia; las demás métricas lo conservan.
  await expect(page.locator('svg.chart .avg-dot')).toHaveCount(0)
  await elegirMetrica(page, 'Cintura')
  await expect(page.locator('svg.chart .avg-dot')).toHaveCount(1)
  await expect(page.getByText('Promedio de las últimas 4')).toBeVisible()
})

test('si el navegador no puede guardar, se avisa y no se dice que se guardó', async ({ page }) => {
  await agregarAna(page)
  await page.getByRole('button', { name: 'Registrar medición' }).click()
  await page.getByLabel('Peso (kg)').fill('72,5')
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('Sin espacio', 'QuotaExceededError')
    }
  })
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('No se pudo guardar la medición')).toBeVisible()
  await expect(page.getByText('Medición guardada')).toBeHidden()
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('72,5')
})

test('el resumen de importación no cuenta dos veces una fecha repetida ni acepta fechas futuras', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Datos')
  const csv = 'fecha;peso\n05/10/2025;72\n05/10/2025;73\n01/01/2999;70\n'
  await page.getByLabel('Archivo CSV').setInputFiles({ name: 'd.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.getByText('1 nuevas, 0 reemplazan, 2 omitidas')).toBeVisible()
  await expect(page.getByText('Fila 4: La fecha 01/01/2999 es futura')).toBeVisible()
})

// ---------- Rediseño ----------

async function agregarPersona(page: Page, nombre: string, sexo: 'hombre' | 'mujer' = 'hombre', estatura = '170') {
  // Sin personas todavía no hay selector de perfil: se agrega desde Familia.
  if ((await page.locator('.perfil-boton').count()) === 0) await page.getByRole('button', { name: 'Agregar persona' }).click()
  else {
    await abrirPerfiles(page)
    await perfiles(page).getByRole('menuitem', { name: '+ Agregar persona' }).click()
  }
  await page.getByLabel('Nombre').fill(nombre)
  await page.getByLabel('Sexo').selectOption(sexo)
  await page.getByLabel('Estatura (cm)').fill(estatura)
  await page.getByRole('button', { name: 'Guardar persona' }).click()
  await expect(page.getByRole('heading', { name: nombre, exact: true })).toBeVisible()
}

test('el selector de perfil marca a quien le toca y abre su ficha', async ({ page }) => {
  await agregarAna(page)
  await abrirPerfiles(page)
  const ana = perfiles(page).getByRole('menuitem', { name: /Ana/ })
  await expect(ana).toContainText('Le toca medirse')
  await expect(ana).toContainText('★ principal')
  await ana.click()
  await expect(figura(page)).toBeVisible()
  await abrirPerfiles(page)
  await expect(perfiles(page).getByRole('menuitem', { name: /Ana/ })).toHaveAttribute('aria-current', 'true')
  await page.keyboard.press('Escape')
  await expect(perfiles(page)).toBeHidden()
})

test('cambiar de persona en Registrar no arrastra lo escrito', async ({ page }) => {
  await agregarAna(page)
  await agregarPersona(page, 'Beto')
  await elegirPerfil(page, 'Ana')
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('72,5')
  await elegirPerfil(page, 'Beto')
  await ir(page, 'Medir')
  await expect(page.getByRole('heading', { name: /Registrar medición · Beto/ })).toBeVisible()
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('')
  // Lo escrito para Ana no se pierde: vuelve al regresar a ella.
  await elegirPerfil(page, 'Ana')
  await ir(page, 'Medir')
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('72,5')
  await expect(page.getByText('Recuperamos lo que habías escrito sin guardar.')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  // Una vez guardado ya no hay borrador que recuperar.
  await elegirPerfil(page, 'Beto')
  await elegirPerfil(page, 'Ana')
  await ir(page, 'Medir')
  await expect(page.getByText('Recuperamos lo que habías escrito sin guardar.')).toBeHidden()
})

test('doce personas con nombres largos no desbordan a 400 px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await page.goto('./')
  for (let i = 1; i <= 12; i++) await agregarPersona(page, `Maximiliano Alejandro ${i}`)
  await abrirPerfiles(page)
  // 12 personas más "Agregar persona" y "Administrar familia…".
  await expect(perfiles(page).getByRole('menuitem')).toHaveCount(14)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await ir(page, 'Datos')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

const figura = (page: Page) => page.locator('svg.body-fig')

test('la ficha dibuja la figura según el sexo y solo las medidas registradas', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(0), '72,5', '88')
  await ir(page, 'Ficha')
  await expect(figura(page)).toHaveAttribute('data-sexo', 'mujer')
  await expect(figura(page).locator('[data-medida]')).toHaveCount(1)
  await expect(figura(page).locator('[data-medida="cinturaCm"]')).toContainText('88,0 cm')
  await expect(page.getByText('NaN')).toHaveCount(0)
  await expect(page.getByText('undefined')).toHaveCount(0)
})

test('la ficha muestra el cambio frente a la medición anterior y la interpretación', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await medir(page, haceDias(0), '72,4', '86,5')
  await ir(page, 'Ficha')
  await expect(figura(page).locator('[data-medida="cinturaCm"]')).toContainText('▼ 1,5')
  await expect(figura(page)).toHaveAttribute('aria-label', /cintura 86,5 cm \(bajó 1,5\)/)
  await expect(page.locator('.hero')).toContainText('72,4')
  await expect(page.getByRole('heading', { name: 'Mismo peso, menos cintura' })).toBeVisible()
  await expect(page.locator('svg.chart circle.dot')).toHaveCount(2)
  await expect(page.locator('svg.chart .area')).toHaveCount(1)
})

test('sin mediciones la ficha invita a registrar la primera', async ({ page }) => {
  await agregarAna(page)
  await page.getByRole('button', { name: 'Ver ficha' }).click()
  await expect(figura(page)).toBeVisible()
  await expect(figura(page).locator('[data-medida]')).toHaveCount(0)
  await expect(page.getByText('Todavía no hay mediciones de Ana.')).toBeVisible()
  await page.getByRole('button', { name: /Registrar medición/ }).first().click()
  await expect(page.getByRole('heading', { name: /Registrar medición · Ana/ })).toBeVisible()
})

test('un hombre recibe la figura de hombre', async ({ page }) => {
  await page.goto('./')
  await agregarPersona(page, 'Beto', 'hombre')
  await page.getByRole('button', { name: 'Ver ficha' }).click()
  await expect(figura(page)).toHaveAttribute('data-sexo', 'hombre')
})

test('el gráfico de la ficha se lee en un teléfono', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await medir(page, haceDias(0), '72,4', '86,5')
  await ir(page, 'Ficha')
  const px = await page.locator('svg.chart text.axis').first().evaluate((t) => {
    const svg = t.closest('svg')!
    return (parseFloat(getComputedStyle(t).fontSize) * svg.getBoundingClientRect().width) / svg.viewBox.baseVal.width
  })
  expect(px).toBeGreaterThanOrEqual(10)
  const etiqueta = await figura(page).locator('text.lab').first().evaluate((t) => {
    const svg = t.closest('svg')!
    return (parseFloat(getComputedStyle(t).fontSize) * svg.getBoundingClientRect().width) / svg.viewBox.baseVal.width
  })
  expect(etiqueta).toBeGreaterThanOrEqual(10)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('la tipografía queda guardada para usar la app sin conexión', async ({ page, request }) => {
  await page.goto('./')
  const sw = await (await request.get('sw.js')).text()
  expect(sw).toContain('.woff2')
})

test('la inicial de la tarjeta de Familia cabe en su círculo', async ({ page }) => {
  await agregarAna(page)
  const px = await page.locator('.person .avatar').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(px).toBeLessThanOrEqual(20)
})

// ---------- Medidas por lado ----------

const HOJA = fileURLToPath(new URL('./fixtures/hoja-entrenador.csv', import.meta.url))

test('registrar ambos brazos y ambos muslos', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('72,5')
  await page.getByLabel('Brazo izquierdo (cm)').fill('38')
  await page.getByLabel('Brazo derecho (cm)').fill('39,5')
  await page.getByLabel('Muslo izquierdo (cm)').fill('60')
  await expect(page.getByLabel('Brazo (sin lado) (cm)')).toHaveCount(0)
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  await ir(page, 'Historial')
  const columnas = await page.locator('thead th').allTextContents()
  const celda = (nombre: string) => filas(page).first().locator('td').nth(columnas.findIndex((c) => c.startsWith(nombre)))
  await expect(celda('Brazo izq.')).toHaveText('38,0')
  await expect(celda('Brazo der.')).toHaveText('39,5')
  await expect(celda('Muslo izq.')).toHaveText('60,0')
  await expect(celda('Muslo der.')).toHaveText('–')
})

test('importar la hoja del entrenador', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Datos')
  await page.getByLabel('Archivo CSV').setInputFiles(HOJA)
  await expect(page.getByLabel('Columna para Pecho')).toHaveValue('2')
  await expect(page.getByLabel('Columna para Brazo izquierdo')).toHaveValue('3')
  await expect(page.getByLabel('Columna para Muslo derecho')).toHaveValue('8')
  await expect(page.getByLabel('Columna para Brazo (sin lado)')).toHaveValue('')
  await expect(page.getByText('3 nuevas, 0 reemplazan, 0 omitidas')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar importación' }).click()
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(3)
  await expect(filas(page).first()).toContainText('34,5')
  await expect(filas(page).first()).toContainText('54,5')
})

test('una medición antigua sin lado sigue visible y editable', async ({ page }) => {
  await page.goto('./')
  await agregarPersona(page, 'Prueba')
  await ir(page, 'Datos')
  const respaldo = {
    app: 'MedidasCuerpo', version: 1, exportadoEn: '2026-11-01T00:00:00.000Z',
    personas: [{ id: 'ana', nombre: 'Ana', sexo: 'mujer', fechaNacimiento: '', estaturaCm: 165, objetivo: 'mantener', creadaEn: '2026-01-01T00:00:00.000Z' }],
    mediciones: [{ id: 'ana_2026-10-01', personaId: 'ana', fecha: '2026-10-01', pesoKg: 60, brazoCm: 34, musloCm: 52, origen: 'manual' }],
    ajustes: { diaRecordatorio: 0, horaRecordatorio: '09:00' },
  }
  await page.getByLabel('Archivo de respaldo').setInputFiles({ name: 'r.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(respaldo)) })
  await page.getByRole('button', { name: 'Sí, restaurar' }).click()
  await expect(page.getByText('Respaldo restaurado.')).toBeVisible()
  await elegirPerfil(page, 'Ana')
  await ir(page, 'Historial')
  await expect(page.locator('thead')).toContainText('Brazo (sin lado)')
  await expect(filas(page).first()).toContainText('34,0')
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByLabel('Brazo (sin lado) (cm)')).toHaveValue('34')
  await page.getByLabel('Peso (kg)').fill('61')
  await page.getByRole('button', { name: 'Actualizar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  await ir(page, 'Historial')
  await expect(filas(page).first()).toContainText('61,0')
  await expect(filas(page).first()).toContainText('34,0')
  await expect(filas(page).first()).toContainText('52,0')
})

test('la persona puede tener un peso objetivo', async ({ page }) => {
  await agregarAna(page)
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Peso objetivo (kg, opcional)').fill('900')
  await page.getByRole('button', { name: 'Guardar persona' }).click()
  await expect(page.getByText('Debe estar entre 2 y 400')).toBeVisible()
  await page.getByLabel('Peso objetivo (kg, opcional)').fill('58,5')
  await page.getByRole('button', { name: 'Guardar persona' }).click()
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByLabel('Peso objetivo (kg, opcional)')).toHaveValue('58,5')
})

test('la ficha muestra ambos brazos y la diferencia entre lados', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('72,5')
  await page.getByLabel('Brazo izquierdo (cm)').fill('38')
  await page.getByLabel('Brazo derecho (cm)').fill('39,5')
  await page.getByLabel('Muslo izquierdo (cm)').fill('60')
  await page.getByLabel('Muslo derecho (cm)').fill('60,5')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  await ir(page, 'Ficha')
  await expect(figura(page).locator('[data-medida="brazoIzqCm"]')).toContainText('38,0 cm')
  await expect(figura(page).locator('[data-medida="brazoDerCm"]')).toContainText('39,5 cm')
  await expect(figura(page).locator('[data-medida]')).toHaveCount(4)
  await expect(page.getByText('Brazo derecho 1,5 cm mayor que el izquierdo')).toBeVisible()
  await expect(page.getByText(/Muslo (izquierdo|derecho) \d/)).toHaveCount(0)
  // El lado izquierdo de la persona se dibuja a la derecha de la imagen.
  const x = (campo: string) => figura(page).locator(`[data-medida="${campo}"] circle`).evaluate((c) => c.getBoundingClientRect().x)
  expect(await x('brazoIzqCm')).toBeGreaterThan(await x('brazoDerCm'))
  expect(await x('musloIzqCm')).toBeGreaterThan(await x('musloDerCm'))
})

test('el peso se lee por su tendencia', async ({ page }) => {
  await agregarAna(page)
  for (const [dias, peso] of [[14, '74'], [7, '72'], [0, '74']] as const) await medir(page, haceDias(dias), peso, '88')
  await ir(page, 'Ficha')
  const tarjeta = page.locator('.hero')
  await expect(tarjeta).toContainText('Última pesada: 74,0 kg')
  // 74 → 72 → 74 con pesadas semanales deja la tendencia en 73,5: la subida puntual se suaviza.
  await expect(tarjeta.locator('.hero-v')).toContainText('73,5')
  await expect(page.locator('svg.chart path.trend')).toHaveCount(1)
  await expect(page.getByText('La tendencia es un promedio que da más importancia a las pesadas recientes')).toBeVisible()
  await elegirMetrica(page, 'Cintura')
  await expect(page.locator('svg.chart path.trend')).toHaveCount(0)
})

test('la meta muestra fecha estimada o avisa si el ritmo va en contra', async ({ page }) => {
  await agregarAna(page)
  for (const [dias, peso] of [[28, '74'], [21, '73,5'], [14, '73'], [7, '72,5'], [0, '72']] as const) await medir(page, haceDias(dias), peso, '88')
  await ir(page, 'Ficha')
  await expect(page.getByRole('heading', { name: 'Meta' })).toHaveCount(0)
  const fijarMeta = async (kg: string) => {
    await ir(page, 'Familia')
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Peso objetivo (kg, opcional)').fill(kg)
    await page.getByRole('button', { name: 'Guardar persona' }).click()
    await page.getByRole('button', { name: 'Ver ficha' }).click()
  }
  await fijarMeta('70')
  const meta = page.locator('.card', { has: page.getByRole('heading', { name: 'Meta' }) })
  await expect(meta).toContainText('70,0 kg')
  await expect(meta).toContainText(/Fecha estimada: \d{2}\/\d{2}\/\d{4}/)
  await expect(meta).toContainText('por semana')
  await fijarMeta('80')
  await expect(meta).toContainText('te alejas de la meta')
  await expect(meta).not.toContainText('Fecha estimada')
  await expect(page.getByText(/NaN|Infinity|undefined/)).toHaveCount(0)
})

test('una pesada sin perímetros no borra la figura', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await ir(page, 'Medir')
  await page.getByLabel('Fecha').fill(haceDias(3))
  await page.getByLabel('Peso (kg)').fill('72')
  await page.getByLabel('Cintura (cm)').fill('')
  await page.getByRole('button', { name: /Guardar medición|Actualizar medición/ }).click()
  await expect(page.getByText('Medición guardada')).toBeVisible()
  await ir(page, 'Ficha')
  await expect(figura(page).locator('[data-medida="cinturaCm"]')).toContainText('88,0 cm')
  await expect(page.getByText(/Perímetros del \d{2}\/\d{2}\/\d{4}, la última vez que se midieron/)).toBeVisible()
  await expect(page.getByText('Registra perímetros para verlos sobre la figura.')).toHaveCount(0)
  // En Medir, el valor anterior de la cintura sigue a la vista aunque la última medición fuera solo peso.
  await ir(page, 'Medir')
  await page.getByLabel('Fecha').fill(haceDias(0))
  await expect(page.locator('.field', { has: page.getByLabel('Cintura (cm)') }).getByText('antes: 88,0')).toBeVisible()
})

test('la guía para medir está en la pantalla Medir', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByText('Cómo medir cada zona').click()
  await expect(page.getByText('a la altura del ombligo')).toBeVisible()
})

// ---------- Navegación sin pestañas ----------

test('no hay barra de pestañas', async ({ page }) => {
  await agregarAna(page)
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toHaveCount(0)
})

test('al abrir la app se ve la ficha de la persona principal', async ({ page }) => {
  await agregarAna(page)
  await agregarPersona(page, 'Beto')
  // Abrir la app de nuevo, desde su dirección inicial.
  await page.goto('./')
  await expect(page.locator('.perfil-nombre')).toHaveText('Ana')
  await expect(figura(page)).toBeVisible()
  await expect(page).toHaveURL(/#\/p\//)
})

test('el botón Atrás del navegador vuelve a la pantalla anterior', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Ficha')
  await expect(figura(page)).toBeVisible()
  await ir(page, 'Datos')
  await expect(page.getByRole('heading', { name: 'Datos' })).toBeVisible()
  await page.goBack()
  await expect(figura(page)).toBeVisible()
})

test('Volver regresa a la ficha', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByRole('button', { name: '← Volver a la ficha' }).click()
  await expect(figura(page)).toBeVisible()
})

test('una dirección inválida lleva al inicio', async ({ page }) => {
  await agregarAna(page)
  await page.goto('./#/p/no-existe')
  await expect(figura(page)).toBeVisible()
  await expect(page.locator('.perfil-nombre')).toHaveText('Ana')
  await page.goto('./#/cualquier/cosa')
  await expect(figura(page)).toBeVisible()
})

test('sin personas se abre Familia', async ({ page }) => {
  await page.goto('./#/p/alguien')
  await expect(page.getByText('Agrega a la primera persona para empezar a registrar mediciones.')).toBeVisible()
})

// ---------- Ficha completa ----------

test('la ficha muestra todas las medidas de la báscula con su estado', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Datos')
  // Números inventados.
  const csv = `Fecha;Peso;Grasa (%);Grasa visceral;Masa ósea;Metabolismo basal;Proteína (%)\n${haceDias(0).split('-').reverse().join('/')};70;30;16;2,4;1400;17\n`
  await page.getByLabel('Archivo CSV').setInputFiles({ name: 'b.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Confirmar importación' }).click()
  await ir(page, 'Ficha')
  const tile = (clave: string) => page.locator(`.tile[data-clave="${clave}"]`)
  await expect(tile('grasaVisceral')).toContainText('Muy alto')
  await expect(tile('grasaVisceral').getByRole('img')).toHaveAttribute('aria-label', /Tu valor está en Muy alto/)
  await expect(tile('metabolismoBasalKcal')).toContainText('1400')
  await expect(tile('masaOseaKg')).toContainText('2,4')
  await expect(tile('proteinaPct')).toContainText('Estándar')
  await expect(page.locator('.hero')).toContainText('IMC')
})

test('el gráfico cambia de período', async ({ page }) => {
  await agregarAna(page)
  for (const dias of [400, 200, 30, 0]) await medir(page, haceDias(dias), '72', '88')
  await ir(page, 'Ficha')
  const periodo = page.getByRole('group', { name: 'Período' })
  await expect(periodo.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('svg.chart circle.dot')).toHaveCount(2)
  await periodo.getByRole('button', { name: '1 año' }).click()
  await expect(page.locator('svg.chart circle.dot')).toHaveCount(3)
  await periodo.getByRole('button', { name: 'Todo' }).click()
  await expect(page.locator('svg.chart circle.dot')).toHaveCount(4)
})

test('la ficha no tiene desplazamiento horizontal a 400 px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await medir(page, haceDias(0), '72,4', '86,5')
  await ir(page, 'Ficha')
  await expect(page.locator('.hero')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

// ---------- Registrar medición ----------

test('registrar se abre aparte con tres formas de cargar', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await expect(page.getByRole('heading', { name: 'Registrar medición · Ana' })).toBeVisible()
  const pestanas = page.getByRole('tablist', { name: 'Cómo cargar' })
  await expect(pestanas.getByRole('tab')).toHaveText([/Escribir/, /Captura de Xiaomi Home/, /Archivo/])
  await expect(pestanas.getByRole('tab', { name: /Escribir/ })).toHaveAttribute('aria-selected', 'true')
  await pestanas.getByRole('tab', { name: /Captura de Xiaomi Home/ }).click()
  await expect(page.getByLabel('Elegir la captura de Xiaomi Home')).toBeVisible()
})

test('guardar vuelve a la ficha con el aviso', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('70')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.locator('.hero')).toContainText('70,0')
  await expect(page.getByRole('status').filter({ hasText: 'Medición guardada' })).toBeVisible()
})

test('importar un archivo desde Registrar sin pasar por Ajustes', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByRole('tab', { name: /Archivo/ }).click()
  await expect(page.getByLabel('Persona')).toHaveCount(0)
  await page.getByLabel('Archivo CSV').setInputFiles(CSV_EXCEL)
  await page.getByRole('button', { name: 'Confirmar importación' }).click()
  await expect(page.locator('.hero')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /importad/ })).toBeVisible()
  await ir(page, 'Historial')
  await expect(filas(page)).not.toHaveCount(0)
})

test('los campos nuevos de la báscula se guardan y se ven en la ficha', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('70')
  await page.getByText('Más de la báscula').click()
  await page.getByLabel('Masa ósea (kg)').fill('2,4')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.locator('.tile[data-clave="masaOseaKg"]')).toContainText('2,4')
})

// ---------- Mediciones, persona principal y ajustes ----------

test('la estrella en Familia cambia la persona principal', async ({ page }) => {
  await agregarAna(page)
  await agregarPersona(page, 'Beto')
  await ir(page, 'Familia')
  const beto = page.locator('article.person', { hasText: 'Beto' })
  await beto.getByRole('button', { name: 'Marcar a Beto como persona principal' }).click()
  await expect(beto.getByRole('button', { name: 'Marcar a Beto como persona principal' })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('./')
  await expect(page.locator('.perfil-nombre')).toHaveText('Beto')
})

test('elegir la persona principal en Ajustes y datos', async ({ page }) => {
  await agregarAna(page)
  await agregarPersona(page, 'Beto')
  await ir(page, 'Datos')
  await expect(page.getByRole('heading', { name: 'Ajustes y datos' })).toBeVisible()
  await page.getByLabel('Persona principal').selectOption({ label: 'Beto' })
  await page.goto('./')
  await expect(page.locator('.perfil-nombre')).toHaveText('Beto')
})

test('borrar la persona principal deja como inicio a la siguiente', async ({ page }) => {
  await agregarAna(page)
  await agregarPersona(page, 'Beto')
  await ir(page, 'Familia')
  const ana = page.locator('article.person', { hasText: 'Ana' })
  await ana.getByRole('button', { name: 'Eliminar' }).click()
  await ana.getByRole('button', { name: 'Sí, borrar' }).click()
  await expect(ana).toHaveCount(0)
  await page.goto('./')
  await expect(page.locator('.perfil-nombre')).toHaveText('Beto')
  await expect(figura(page)).toBeVisible()
})

test('Editar en Todas las mediciones abre Registrar en esa fecha', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await ir(page, 'Historial')
  await expect(page.getByRole('heading', { name: 'Todas las mediciones · Ana' })).toBeVisible()
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByRole('heading', { name: 'Registrar medición · Ana' })).toBeVisible()
  await expect(page.getByLabel('Fecha')).toHaveValue(haceDias(7))
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('72,5')
})

test('las columnas de los campos nuevos aparecen solo si hay datos', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(0), '72', '88')
  await ir(page, 'Historial')
  await expect(page.getByRole('columnheader', { name: 'Masa ósea (kg)' })).toHaveCount(0)
  await ir(page, 'Medir')
  await page.getByLabel('Fecha').fill(haceDias(1))
  await page.getByLabel('Peso (kg)').fill('72')
  await page.getByText('Más de la báscula').click()
  await page.getByLabel('Masa ósea (kg)').fill('2,4')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await ir(page, 'Historial')
  await expect(page.getByRole('columnheader', { name: 'Masa ósea (kg)' })).toBeVisible()
})

test('la tabla de mediciones no desborda la página a 400 px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await agregarAna(page)
  await medir(page, haceDias(0), '72', '88')
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

// ---------- Revisión final: accesibilidad ----------

test('al cambiar de pantalla el foco va al título de la nueva', async ({ page }) => {
  await agregarAna(page)
  await agregarPersona(page, 'Beto')
  await page.locator('.perfil-boton').focus()
  await page.keyboard.press('Enter')
  await perfiles(page).getByRole('menuitem', { name: /Beto/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Beto', level: 2 })).toBeFocused()
  await page.getByRole('button', { name: '+ Registrar medición' }).click()
  await expect(page.getByRole('heading', { name: 'Registrar medición · Beto' })).toBeFocused()
  await expect(page).toHaveTitle(/Registrar medición/)
})

test('los enlaces y desplegables de la ficha miden al menos 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await agregarAna(page)
  await medir(page, haceDias(0), '72', '88')
  await ir(page, 'Ficha')
  for (const objetivo of [page.getByRole('button', { name: 'Ver todas las mediciones →' }), page.getByText('Cómo leer estas cifras')]) {
    expect((await objetivo.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})

test('un nombre largo no parte el encabezado en varias filas', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await page.goto('./')
  await agregarPersona(page, 'María Fernanda de los Ángeles Pérez')
  expect((await page.locator('header.top').boundingBox())!.height).toBeLessThan(90)
})

test('salir del menú de perfiles con Tab lo cierra', async ({ page }) => {
  await agregarAna(page)
  await abrirPerfiles(page)
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
  await expect(perfiles(page)).toBeHidden()
})

test('el aviso de guardado vive en una región que ya existía', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Ficha')
  await expect(page.locator('#aviso-app')).toHaveAttribute('role', 'status')
  await expect(page.locator('#aviso-app')).toHaveText('')
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('70')
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await expect(page.locator('#aviso-app')).toHaveText('Medición guardada.')
})

test('editar una medición antigua no borra el borrador de la nueva', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('70')
  await page.getByRole('button', { name: '← Volver a la ficha' }).click()
  await ir(page, 'Historial')
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Cintura (cm)').fill('87')
  await page.getByRole('button', { name: /Actualizar medición|Guardar medición/ }).click()
  await ir(page, 'Medir')
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('70')
})

// ---------- Lector de capturas ----------

test('el lector se sirve desde el propio sitio y queda fuera del precache', async ({ request }) => {
  // Los archivos van en una carpeta con la versión del lector: al actualizarlo, la caché vieja no se mezcla con la nueva.
  const version = JSON.parse(await readFile(fileURLToPath(new URL('../node_modules/tesseract.js/package.json', import.meta.url)), 'utf8')).version
  for (const nombre of ['worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js', 'spa.traineddata.gz']) {
    const archivo = `ocr/${version}/${nombre}`
    const r = await request.get(archivo)
    expect(r.status(), archivo).toBe(200)
    // No la página de la app (el servidor responde con ella a cualquier ruta desconocida).
    const cuerpo = await r.body()
    expect(cuerpo.subarray(0, 15).toString().toLowerCase(), archivo).not.toContain('<!doctype')
    expect(cuerpo.length, archivo).toBeGreaterThan(100_000)
  }
  const sw = await (await request.get('sw.js')).text()
  // Ninguna entrada del precache es del lector; sí hay una regla para guardarlo la primera vez que se use.
  expect(sw).not.toMatch(/url:"ocr\//)
  expect(sw).toContain('lector-ocr')
})

const CAPTURA = fileURLToPath(new URL('./fixtures/captura-xiaomi.png', import.meta.url))
const CAPTURA_CLARA = fileURLToPath(new URL('./fixtures/captura-xiaomi-clara.png', import.meta.url))
const CAPTURA_CHICA = fileURLToPath(new URL('./fixtures/captura-xiaomi-chica.png', import.meta.url))
const LEIDA = 'Revisa los valores y pulsa Guardar.'

async function leerCaptura(page: Page, archivo: string) {
  await page.getByRole('tab', { name: /Captura de Xiaomi Home/ }).click()
  await page.getByLabel('Elegir la captura de Xiaomi Home').setInputFiles(archivo)
}
const marca = (page: Page, etiqueta: string) => page.locator('.field', { has: page.getByLabel(etiqueta, { exact: true }) }).locator('.marca')

test('lee la captura de Xiaomi Home y rellena Registrar sin guardar', async ({ page }) => {
  test.setTimeout(120_000)
  const ajenas: string[] = []
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) ajenas.push(r.url())
  })
  await agregarAna(page)
  await ir(page, 'Medir')
  await leerCaptura(page, CAPTURA)
  await expect(page.getByText(LEIDA)).toBeVisible({ timeout: 90_000 })
  await expect(page.getByRole('tab', { name: /Escribir/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByLabel('Fecha')).toHaveValue('2026-11-15')
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('82,4')
  await expect(page.getByLabel('Grasa corporal (%)')).toHaveValue('22,7')
  await expect(page.getByLabel('Agua corporal (%)')).toHaveValue('54,6')
  await expect(page.getByLabel('Músculo esquelético (kg)')).toHaveValue('33,6')
  await expect(page.getByLabel('Grasa visceral (nivel)')).toHaveValue('9')
  await expect(marca(page, 'Peso (kg)')).toHaveText('de la captura')
  await expect(marca(page, 'Músculo esquelético (kg)')).toHaveText('revisa con la imagen')
  await expect(page.getByLabel('Nota (opcional)')).toHaveValue('Xiaomi Home 07:45')
  await expect(page.getByRole('img', { name: 'Tu captura' })).toBeVisible()
  // Nada se guardó todavía.
  await page.getByRole('button', { name: '← Volver a la ficha' }).click()
  await expect(page.getByText('Todavía no hay mediciones de Ana.')).toBeVisible()
  await ir(page, 'Medir')
  // Lo leído antes quedó como borrador sin guardar: leer otra vez pide confirmar.
  page.once('dialog', (d) => d.accept())
  await leerCaptura(page, CAPTURA)
  await expect(page.getByText(LEIDA)).toBeVisible({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Guardar medición' }).click()
  await ir(page, 'Historial')
  await expect(filas(page)).toHaveCount(1)
  expect(ajenas).toEqual([])
})

test('la captura conserva la cintura guardada ese día', async ({ page }) => {
  test.setTimeout(120_000)
  await agregarAna(page)
  await medir(page, '2026-11-15', '80', '88')
  await ir(page, 'Medir')
  await leerCaptura(page, CAPTURA)
  await expect(page.getByText(LEIDA)).toBeVisible({ timeout: 90_000 })
  await expect(page.getByLabel('Cintura (cm)')).toHaveValue('88')
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('82,4')
})

test('con cambios sin guardar la captura pide confirmar; si no, no toca nada', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('70')
  page.once('dialog', (d) => d.dismiss())
  await leerCaptura(page, CAPTURA)
  await expect(page.getByText('Leyendo la captura…')).toHaveCount(0)
  await page.getByRole('tab', { name: /Escribir/ }).click()
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('70')
})

test('lee también la captura en modo claro', async ({ page }) => {
  test.setTimeout(120_000)
  await agregarAna(page)
  await ir(page, 'Medir')
  await leerCaptura(page, CAPTURA_CLARA)
  await expect(page.getByText(LEIDA)).toBeVisible({ timeout: 90_000 })
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('82,4')
})

test('una captura comprimida muestra un error y no cambia el formulario', async ({ page }) => {
  test.setTimeout(120_000)
  await agregarAna(page)
  await ir(page, 'Medir')
  await leerCaptura(page, CAPTURA_CHICA)
  await expect(page.getByText('No pude leer esta imagen. Usa la captura completa del informe de Xiaomi Home, sin recortar ni comprimir.')).toBeVisible({ timeout: 90_000 })
  await page.getByRole('tab', { name: /Escribir/ }).click()
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('')
})

test('pegar la captura con Ctrl+V la lee', async ({ page }) => {
  test.setTimeout(120_000)
  await agregarAna(page)
  await ir(page, 'Medir')
  const bytes = [...(await readFile(CAPTURA))]
  await page.evaluate((datos) => {
    const dt = new DataTransfer()
    dt.items.add(new File([new Uint8Array(datos)], 'captura.png', { type: 'image/png' }))
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }))
  }, bytes)
  await expect(page.getByText(LEIDA)).toBeVisible({ timeout: 90_000 })
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('82,4')
})

// ---------- Revisión final de la captura ----------

test('al editar una fecha pasada, la captura pide confirmar antes de reemplazar lo escrito', async ({ page }) => {
  await agregarAna(page)
  await medir(page, haceDias(7), '72,5', '88')
  await ir(page, 'Historial')
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Cintura (cm)').fill('86')
  let pregunto = false
  page.once('dialog', (d) => {
    pregunto = true
    void d.dismiss()
  })
  await leerCaptura(page, CAPTURA)
  await page.getByRole('tab', { name: /Escribir/ }).click()
  await expect(page.getByLabel('Cintura (cm)')).toHaveValue('86')
  expect(pregunto).toBe(true)
})

test('lo escrito mientras se lee la captura no se pierde sin preguntar', async ({ page }) => {
  test.setTimeout(120_000)
  await agregarAna(page)
  await ir(page, 'Medir')
  await leerCaptura(page, CAPTURA)
  await page.getByRole('tab', { name: /Escribir/ }).click()
  await page.getByLabel('Peso (kg)').fill('70')
  page.once('dialog', (d) => void d.dismiss())
  await expect(page.getByText('Leyendo la captura')).toHaveCount(0, { timeout: 90_000 })
  await expect(page.getByLabel('Peso (kg)')).toHaveValue('70')
})

test('tras leer, el foco va al resultado y cada campo dice si hay que revisarlo', async ({ page }) => {
  test.setTimeout(120_000)
  await agregarAna(page)
  await ir(page, 'Medir')
  await leerCaptura(page, CAPTURA)
  await expect(page.getByRole('heading', { name: 'Captura leída' })).toBeFocused({ timeout: 90_000 })
  await expect(page.getByLabel('Músculo esquelético (kg)')).toHaveAccessibleDescription(/revisa con la imagen/)
  // Al corregir un campo a mano, deja de decir que viene de la captura.
  await page.getByLabel('Peso (kg)').fill('80')
  await expect(marca(page, 'Peso (kg)')).toHaveCount(0)
})

test('una imagen que el navegador no puede abrir muestra el error de imagen', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByRole('tab', { name: /Captura de Xiaomi Home/ }).click()
  await page.getByLabel('Elegir la captura de Xiaomi Home').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('esto no es una imagen') })
  await expect(page.getByText(/No pude leer esta imagen/)).toBeVisible()
})

test('tras cancelar la confirmación se puede elegir el mismo archivo otra vez', async ({ page }) => {
  test.setTimeout(120_000)
  await agregarAna(page)
  await ir(page, 'Medir')
  await page.getByLabel('Peso (kg)').fill('70')
  page.once('dialog', (d) => void d.dismiss())
  await leerCaptura(page, CAPTURA)
  page.once('dialog', (d) => void d.accept())
  await page.getByLabel('Elegir la captura de Xiaomi Home').setInputFiles(CAPTURA)
  await expect(page.getByText(LEIDA)).toBeVisible({ timeout: 90_000 })
})

// ---------- Nombre ----------

test('la app se llama Mesura', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle(/Mesura/)
  await expect(page.getByRole('button', { name: 'Mesura, ir al inicio' })).toBeVisible()
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Mesura')
})

test('un respaldo hecho antes del cambio de nombre se sigue restaurando', async ({ page }) => {
  await agregarAna(page)
  await ir(page, 'Datos')
  const viejo = { app: 'MedidasCuerpo', version: 1, exportadoEn: '2026-11-01T00:00:00.000Z', personas: [{ id: 'v1', nombre: 'Vieja', sexo: 'mujer', fechaNacimiento: '', estaturaCm: 160, objetivo: 'mantener', creadaEn: '2026-01-01T00:00:00.000Z' }], mediciones: [], ajustes: { diaRecordatorio: 1, horaRecordatorio: '09:00' } }
  await page.getByLabel('Archivo de respaldo').setInputFiles({ name: 'medidascuerpo-2026-11-01.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(viejo)) })
  await page.getByRole('button', { name: 'Sí, restaurar' }).click()
  await expect(page.getByText('Respaldo restaurado.')).toBeVisible()
})

// ---------- Cuenta y sincronización ----------

const BASE = 'http://localhost:4173/MedidasCuerpo/'
const FRASE_E2E = 'mi frase secreta de prueba'
const unico = (nombre: string) => `${nombre}.${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`
const nube = (page: Page) => page.getByRole('button', { name: /^Sincronización:/ })

async function abrirCuenta(page: Page) {
  await page.getByRole('button', { name: 'Ajustes y datos' }).click()
  await expect(page.getByRole('heading', { name: 'Cuenta y sincronización' })).toBeVisible()
}
async function crearCuentaE2E(page: Page, usuario: string) {
  await abrirCuenta(page)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel('Nombre de usuario').fill(usuario)
  await page.getByLabel('Frase secreta', { exact: true }).fill(FRASE_E2E)
  await page.getByLabel('Repite la frase secreta').fill(FRASE_E2E)
  await page.getByLabel('Entiendo que si olvido la frase no se puede recuperar').check()
  await page.getByRole('button', { name: 'Crear cuenta y sincronizar' }).click()
  await expect(page.getByText(`Conectado como ${usuario}`)).toBeVisible({ timeout: 20_000 })
}
async function entrarE2E(page: Page, usuario: string) {
  await page.goto('./')
  await abrirCuenta(page)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.getByLabel('Nombre de usuario').fill(usuario)
  await page.getByLabel('Frase secreta', { exact: true }).fill(FRASE_E2E)
  await page.getByRole('button', { name: 'Entrar y sincronizar' }).click()
  await expect(page.getByText(`Conectado como ${usuario}`)).toBeVisible({ timeout: 20_000 })
}

test('lo registrado en el PC aparece en el celular, cifrado en el camino', async ({ browser }) => {
  test.setTimeout(90_000)
  const usuario = unico('ana')
  const pc = await (await browser.newContext({ baseURL: BASE })).newPage()
  const cuerpos: string[] = []
  pc.on('request', (r) => {
    if (r.url().startsWith('http://localhost:8787')) cuerpos.push(r.postData() ?? '')
  })
  await agregarAna(pc)
  await medir(pc, haceDias(0), '72,5', '88')
  await crearCuentaE2E(pc, usuario)
  await expect(nube(pc)).toHaveAttribute('aria-label', 'Sincronización: al día')
  expect(cuerpos.join('\n')).not.toContain('Ana')
  expect(cuerpos.join('\n')).not.toContain('72.5')

  const cel = await (await browser.newContext({ baseURL: BASE, viewport: { width: 400, height: 800 } })).newPage()
  await entrarE2E(cel, usuario)
  await cel.getByRole('button', { name: /ir al inicio/ }).click()
  await expect(cel.locator('.perfil-nombre')).toHaveText('Ana')
  await expect(cel.locator('.hero')).toContainText('72,5')

  // Un cambio en el celular llega al PC.
  await ir(cel, 'Medir')
  await cel.getByLabel('Fecha').fill(haceDias(1))
  await cel.getByLabel('Peso (kg)').fill('73')
  await cel.getByRole('button', { name: 'Guardar medición' }).click()
  await abrirCuenta(cel)
  await cel.getByRole('button', { name: 'Sincronizar ahora' }).click()
  await expect(cel.getByText(/Sincronizado/)).toBeVisible()
  await pc.getByRole('button', { name: 'Sincronizar ahora' }).click()
  await expect(pc.getByText(/Sincronizado/)).toBeVisible()
  await ir(pc, 'Historial')
  await expect(filas(pc)).toHaveCount(2)
})

test('sin conexión se guarda igual y se sincroniza al volver', async ({ browser }) => {
  test.setTimeout(90_000)
  const usuario = unico('beto')
  const ctx = await browser.newContext({ baseURL: BASE })
  const pc = await ctx.newPage()
  await agregarAna(pc)
  await crearCuentaE2E(pc, usuario)
  await ctx.setOffline(true)
  await pc.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(nube(pc)).toHaveAttribute('aria-label', 'Sincronización: sin conexión')
  await medir(pc, haceDias(0), '70', '85')
  await ctx.setOffline(false)
  await pc.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(nube(pc)).toHaveAttribute('aria-label', 'Sincronización: al día', { timeout: 20_000 })
  const cel = await (await browser.newContext({ baseURL: BASE })).newPage()
  await entrarE2E(cel, usuario)
  await ir(cel, 'Historial')
  await expect(filas(cel)).toHaveCount(1)
})

test('cerrar sesión conserva los datos y quita la nube', async ({ browser }) => {
  test.setTimeout(60_000)
  const pc = await (await browser.newContext({ baseURL: BASE })).newPage()
  await agregarAna(pc)
  await crearCuentaE2E(pc, unico('caro'))
  await pc.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(pc.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  await expect(nube(pc)).toHaveCount(0)
  await pc.getByRole('button', { name: /ir al inicio/ }).click()
  await expect(pc.locator('.perfil-nombre')).toHaveText('Ana')
})

test('entrar con otra cuenta en un dispositivo con datos pregunta antes', async ({ browser }) => {
  test.setTimeout(90_000)
  const otra = unico('dani')
  const aparte = await (await browser.newContext({ baseURL: BASE })).newPage()
  await aparte.goto('./')
  await crearCuentaE2E(aparte, otra)

  const pc = await (await browser.newContext({ baseURL: BASE })).newPage()
  await agregarAna(pc)
  await crearCuentaE2E(pc, unico('eli'))
  await pc.getByRole('button', { name: 'Cerrar sesión' }).click()
  await pc.getByRole('button', { name: 'Iniciar sesión' }).click()
  await pc.getByLabel('Nombre de usuario').fill(otra)
  await pc.getByLabel('Frase secreta', { exact: true }).fill(FRASE_E2E)
  await pc.getByRole('button', { name: 'Entrar y sincronizar' }).click()
  const dialogo = pc.getByRole('dialog', { name: /datos que no son de/ })
  await expect(dialogo).toBeVisible({ timeout: 20_000 })
  await expect(dialogo.getByRole('button', { name: 'Subirlos a esta cuenta' })).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Reemplazarlos por los de la nube' })).toBeVisible()
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(pc.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  await pc.getByRole('button', { name: /ir al inicio/ }).click()
  await expect(pc.locator('.perfil-nombre')).toHaveText('Ana')
})

test('crear cuenta exige frase larga, confirmación y un nombre libre', async ({ page }) => {
  test.setTimeout(60_000)
  const usuario = unico('fede')
  await page.goto('./')
  await crearCuentaE2E(page, usuario)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.getByLabel('Nombre de usuario').fill(usuario)
  await page.getByLabel('Frase secreta', { exact: true }).fill('corta')
  await page.getByLabel('Repite la frase secreta').fill('corta')
  await page.getByRole('button', { name: 'Crear cuenta y sincronizar' }).click()
  await expect(page.getByText(/al menos 12 caracteres/)).toBeVisible()
  await page.getByLabel('Frase secreta', { exact: true }).fill(FRASE_E2E)
  await page.getByLabel('Repite la frase secreta').fill(FRASE_E2E)
  await page.getByRole('button', { name: 'Crear cuenta y sincronizar' }).click()
  await expect(page.getByText(/Marca la casilla/)).toBeVisible()
  await page.getByLabel('Entiendo que si olvido la frase no se puede recuperar').check()
  await page.getByRole('button', { name: 'Crear cuenta y sincronizar' }).click()
  await expect(page.getByText('Ese nombre de usuario ya está en uso')).toBeVisible({ timeout: 20_000 })
})
