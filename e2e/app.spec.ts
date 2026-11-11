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
