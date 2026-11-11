import { diasEntre } from './numbers'

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const DIAS_PARA_PENDIENTE = 7

export function estadoMedicion(ultimaFecha: string | null, hoy: string): { pendiente: boolean; diasDesde: number | null } {
  if (ultimaFecha == null) return { pendiente: true, diasDesde: null }
  const diasDesde = diasEntre(ultimaFecha, hoy)
  return { pendiente: diasDesde >= DIAS_PARA_PENDIENTE, diasDesde }
}

/** Evento semanal recurrente. `dia` 0 = domingo; `hora` HH:MM; `desde` AAAA-MM-DD. */
export function generarIcs(dia: number, hora: string, desde: string): string {
  const inicio = new Date(desde + 'T00:00:00Z')
  inicio.setUTCDate(inicio.getUTCDate() + ((dia - inicio.getUTCDay() + 7) % 7))
  const fecha = inicio.toISOString().slice(0, 10).replace(/-/g, '')
  const [hh, mm] = hora.split(':')
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedidasCuerpo//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:medidascuerpo-recordatorio-${fecha}-${dia}@medidascuerpo`,
    `DTSTAMP:${desde.replace(/-/g, '')}T000000Z`,
    `DTSTART:${fecha}T${hh}${mm}00`,
    'DURATION:PT15M',
    `RRULE:FREQ=WEEKLY;BYDAY=${DIAS_ICS[dia]}`,
    'SUMMARY:Pesarse y medirse',
    'DESCRIPTION:Registra el peso y las medidas de la semana en MedidasCuerpo.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Pesarse y medirse',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lineas.join('\r\n') + '\r\n'
}
