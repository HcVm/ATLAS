import { format } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Funciones utilitarias para manejo consistente de fechas en toda la aplicación
 * Usa date-fns con locale español (Perú) para consistencia
 */

// Obtener fecha actual en formato YYYY-MM-DD (para base de datos)
export const getCurrentDateISO = (): string => {
  return format(new Date(), "yyyy-MM-dd")
}

export const getCurrentDatePeru = getCurrentDateISO
export const formatDatePeru = getCurrentDateISO

// Obtener fecha y hora actual en formato ISO (para timestamps de base de datos)
export const getCurrentDateTimeISO = (): string => {
  return new Date().toISOString()
}

// Formatear fecha para mostrar (DD/MM/YYYY)
export const formatDateForDisplay = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return format(dateObj, "dd/MM/yyyy", { locale: es })
}

export const formatDateDisplay = formatDateForDisplay

// Formatear fecha larga (DD de MMMM de YYYY)
export const formatDateLong = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date
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
  return formatDateForDisplay(new Date())
}

// Obtener fecha actual en formato largo
export const getCurrentDateLong = (): string => {
  return formatDateLong(new Date())
}
