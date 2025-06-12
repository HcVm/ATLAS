"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"

interface Company {
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
  useEffect(() => {
    async function loadCompanies() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Si es admin, cargar todas las empresas
        if (user.role === "admin") {
          const { data, error } = await supabase.from("companies").select("id, name, code, color").order("name")

          if (error) throw error

          setAllCompanies(data || [])

          // Cargar selección guardada
          const savedCompanyId = localStorage.getItem("selectedCompanyId")
          if (savedCompanyId && data) {
            const savedCompany = data.find((c) => c.id === savedCompanyId)
            if (savedCompany) {
              setSelectedCompany(savedCompany)
            } else if (data.length > 0) {
              setSelectedCompany(data[0])
            }
          } else if (data && data.length > 0) {
            setSelectedCompany(data[0])
          }
        }
        // Si es usuario normal, solo cargar su empresa
        else if (user.company_id) {
          const { data, error } = await supabase
            .from("companies")
            .select("id, name, code, color")
            .eq("id", user.company_id)
            .single()

          if (error) throw error

          if (data) {
            setAllCompanies([data])
            setSelectedCompany(data)
          }
        }
      } catch (err: any) {
        console.error("Error loading companies:", err)
        setError(err.message || "Error al cargar empresas")
      } finally {
        setLoading(false)
      }
    }

    loadCompanies()
  }, [user])

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        allCompanies,
        setSelectedCompany,
        loading,
        error,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
