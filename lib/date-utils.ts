import { format } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Funciones utilitarias para manejo consistente de fechas en toda la aplicación
 * Usa date-fns con locale español (Perú) para consistencia
 */

const getPeruDate = (): Date => {
  const now = new Date()
  // Convertir a zona horaria de Perú (UTC-5)
  const peruTime = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  return peruTime
}

// Obtener fecha actual en formato YYYY-MM-DD (para base de datos)
export const getCurrentDateISO = (): string => {
  const peruDate = getPeruDate()
  return format(peruDate, "yyyy-MM-dd")
}

export const getCurrentDatePeru = getCurrentDateISO
export const formatDatePeru = getCurrentDateISO

// Obtener fecha y hora actual en formato ISO (for timestamps de base de datos)
export const getCurrentDateTimeISO = (): string => {
  return new Date().toISOString()
}

// Formatear fecha para mostrar (DD/MM/YYYY)
export const formatDateForDisplay = (date: string | Date): string => {
  let dateObj: Date
  if (typeof date === "string") {
    // Si es una cadena en formato YYYY-MM-DD, crear fecha sin problemas de zona horaria
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split("-").map(Number)
      dateObj = new Date(year, month - 1, day)
    } else {
      dateObj = new Date(date)
    }
  } else {
    dateObj = date
  }
  return format(dateObj, "dd/MM/yyyy", { locale: es })
}

export const formatDateDisplay = formatDateForDisplay

// Formatear fecha larga (DD de MMMM de YYYY)
export const formatDateLong = (date: string | Date): string => {
  let dateObj: Date
  if (typeof date === "string") {
    // Si es una cadena en formato YYYY-MM-DD, crear fecha sin problemas de zona horaria
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split("-").map(Number)
      dateObj = new Date(year, month - 1, day)
    } else {
      dateObj = new Date(date)
    }
  } else {
    dateObj = date
  }
  return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: es })
}

// Formatear fecha corta (DD MMM)
export const formatDateShort = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return format(dateObj, "dd MMM", { locale: es })
}

// Formatear fecha y hora completa
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return format(dateObj, "dd/MM/yyyy HH:mm", { locale: es })
}

// Formatear fecha para nombres de archivo (YYYYMMDD_HHMMSS)
export const formatDateForFilename = (date?: Date): string => {
  const dateObj = date || new Date()
  return format(dateObj, "yyyyMMdd_HHmmss")
}

// Obtener fecha actual formateada para mostrar
export const getCurrentDateForDisplay = (): string => {
  return formatDateForDisplay(getPeruDate())
}

// Obtener fecha actual en formato largo
export const getCurrentDateLong = (): string => {
  return formatDateLong(getPeruDate())
}
