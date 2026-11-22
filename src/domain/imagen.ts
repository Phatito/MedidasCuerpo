/**
 * Preparación de la captura antes de leerla: en la prueba de factibilidad, Tesseract leía "33,6" como "33,0"
 * con la captura a tamaño real; a 620 px de ancho, con texto oscuro sobre fondo claro, leyó bien todos los números.
 */
export const ANCHO_OCR = 620

/** Las capturas en modo oscuro (brillo medio bajo) se invierten para dejar texto oscuro sobre fondo claro. */
export function debeInvertir(brilloMedio: number): boolean {
  return brilloMedio < 128
}

export function tamanoOcr(ancho: number, alto: number): { ancho: number; alto: number } {
  return { ancho: ANCHO_OCR, alto: Math.round((alto * ANCHO_OCR) / ancho) }
}
