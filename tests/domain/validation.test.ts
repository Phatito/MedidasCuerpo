import { expect, test } from 'vitest'
import { validarValor } from '../../src/domain/validation'

test('peso dentro de rango es válido', () => expect(validarValor('pesoKg', 70)).toBeNull())
test('peso bajo el mínimo se rechaza', () => expect(validarValor('pesoKg', 1)).not.toBeNull())
test('peso sobre el máximo se rechaza', () => expect(validarValor('pesoKg', 401)).not.toBeNull())
test('los límites son inclusivos', () => {
  expect(validarValor('pesoKg', 2)).toBeNull()
  expect(validarValor('pesoKg', 400)).toBeNull()
})
test('grasa visceral 60 se rechaza', () => expect(validarValor('grasaVisceral', 60)).not.toBeNull())
test('estatura 30 cm se rechaza', () => expect(validarValor('estaturaCm', 30)).not.toBeNull())
test('el mensaje nombra el rango', () => expect(validarValor('pesoKg', 900)).toContain('400'))
