// Utilidades para manejar zona horaria de Perú (UTC-5)

export function getPeruTime(): Date {
  // Obtiene la hora actual en Perú (UTC-5)
  const now = new Date()
  const peruOffset = -5 * 60 // Perú está a UTC-5 (en minutos)
  const localOffset = now.getTimezoneOffset() // Offset local en minutos
  const diffOffset = localOffset + peruOffset

  return new Date(now.getTime() - diffOffset * 60 * 1000)
}

export function getPeruTimeAsUTC(): string {
  // Retorna la hora actual de Perú pero en formato UTC para guardar en Supabase
  // Supabase guarda todo en UTC, así que guardamos la hora actual tal cual
  return new Date().toISOString()
}

export function getPeruTimeISO(): string {
  // Retorna la hora de Perú en formato ISO
  return getPeruTime().toISOString()
}

export function convertUTCToPeruTime(utcDate: string | Date): Date {
  // Convierte una fecha UTC a hora de Perú
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate
  return new Date(date.getTime() - 5 * 60 * 60 * 1000)
}
