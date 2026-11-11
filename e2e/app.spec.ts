import { expect, test, type Page } from '@playwright/test'

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
