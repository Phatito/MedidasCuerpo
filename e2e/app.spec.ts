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
  await expect(page.getByRole('button', { name: 'Medir' })).toBeDisabled()
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
const ir = (page: Page, nombre: string) => page.getByRole('navigation').getByRole('button', { name: nombre, exact: true }).click()

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
  await page.getByLabel('Métrica').selectOption('cinturaCm')
  await expect(page.locator('svg.chart')).toContainText('86,5')
  // Solo se ofrecen métricas con datos.
  await expect(page.getByLabel('Métrica').locator('option')).toHaveText(['Peso', 'Cintura', 'IMC'])
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
  expect(descarga.suggestedFilename()).toMatch(/^medidascuerpo-\d{4}-\d{2}-\d{2}\.json$/)
  const contenido = await readFile(await descarga.path(), 'utf8')
  expect(JSON.parse(contenido)).toMatchObject({ app: 'MedidasCuerpo', version: 1, personas: [{ nombre: 'Ana' }], mediciones: [{ pesoKg: 72.5 }] })

  // Un archivo que no es un respaldo se rechaza y no toca los datos.
  await page.getByLabel('Archivo de respaldo').setInputFiles({ name: 'otro.json', mimeType: 'application/json', buffer: Buffer.from('{"hola":1}') })
  await expect(page.getByText('El archivo no es un respaldo de MedidasCuerpo')).toBeVisible()
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
  expect(await readFile(await csv.path(), 'utf8')).toContain(`${haceDias(0)},72.5`)

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
  expect(await manifiesto.json()).toMatchObject({ name: 'MedidasCuerpo', display: 'standalone', start_url: '/MedidasCuerpo/' })
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()) != null)).toBe(true)
})
