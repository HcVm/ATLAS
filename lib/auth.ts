"use client"

// Archivo de compatibilidad - redirige al nuevo sistema de contexto
// Este archivo mantiene la compatibilidad con importaciones antiguas

export { useAuth } from "./auth-context"
export type { AuthContextType } from "./auth-context"

// Re-exportar las funciones principales del contexto
import { useAuth as useAuthContext } from "./auth-context"

// Funciones de compatibilidad
export const signIn = async (email: string, password: string) => {
  // Esta función ahora debe usarse a través del contexto
  throw new Error("Use signIn from useAuth() hook instead")
}

export const signUp = async (email: string, password: string, fullName: string, departmentId: string) => {
  // Esta función ahora debe usarse a través del contexto
  throw new Error("Use signUp from useAuth() hook instead")
}

export const signOut = async () => {
  // Esta función ahora debe usarse a través del contexto
  throw new Error("Use signOut from useAuth() hook instead")
}

// Exportar el hook principal
export { useAuthContext as useAuth }
