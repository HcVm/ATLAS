"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"
import { toast } from "sonner"

export interface Company {
  id: string
  name: string
  code: string
  color: string
}

interface CompanyContextType {
  selectedCompany: Company | null
  allCompanies: Company[]
  setSelectedCompany: (company: Company | null) => void
  loading: boolean
  error: string | null
  refreshCompanies: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar todas las empresas disponibles
  const loadCompanies = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log("CompanyContext: Cargando empresas para usuario:", user.id, user.role)

      // Si es admin, cargar todas las empresas
      if (user.role === "admin") {
        const { data, error } = await supabase.from("companies").select("id, name, code, color").order("name")

        if (error) {
          console.error("Error cargando empresas:", error)
          setError(error.message)
          throw error
        }

        console.log("CompanyContext: Empresas cargadas para admin:", data?.length || 0)
        setAllCompanies(data || [])

        // Cargar selección guardada o usar modo general (null)
        const savedCompanyId = localStorage.getItem("selectedCompanyId")
        if (savedCompanyId && data) {
          const savedCompany = data.find((c) => c.id === savedCompanyId)
          if (savedCompany) {
            setSelectedCompany(savedCompany)
            console.log("CompanyContext: Empresa guardada seleccionada:", savedCompany.name)
          } else {
            // Si no se encuentra la empresa guardada, usar modo general
            setSelectedCompany(null)
            console.log("CompanyContext: Modo general activado (empresa guardada no encontrada)")
          }
        } else {
          // Si no hay selección guardada, usar modo general
          setSelectedCompany(null)
          console.log("CompanyContext: Modo general activado (sin selección guardada)")
        }
      }
      // Si es usuario normal, solo cargar su empresa
      else if (user.company_id) {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, code, color")
          .eq("id", user.company_id)
          .single()

        if (error) {
          console.error("Error cargando empresa del usuario:", error)
          setError(error.message)
          throw error
        }

        if (data) {
          console.log("CompanyContext: Empresa del usuario cargada:", data.name)
          setAllCompanies([data])
          setSelectedCompany(data)
        }
      } else {
        console.log("CompanyContext: Usuario sin empresa asignada")
        setAllCompanies([])
        setSelectedCompany(null)
      }
    } catch (err: any) {
      console.error("Error en CompanyContext:", err)
      setError(err.message || "Error al cargar empresas")
    } finally {
      setLoading(false)
    }
  }

  // Cargar empresas cuando cambia el usuario
  useEffect(() => {
    loadCompanies()
  }, [user])

  // Función para actualizar manualmente las empresas
  const refreshCompanies = async () => {
    await loadCompanies()
    toast.success("Lista de empresas actualizada")
  }

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        allCompanies,
        setSelectedCompany,
        loading,
        error,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
