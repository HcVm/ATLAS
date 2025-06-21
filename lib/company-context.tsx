"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"
import { toast } from "sonner"

export interface Company {
  id: string
  ruc: string
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
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para actualizar la empresa seleccionada
  const setSelectedCompany = (company: Company | null) => {
    console.log("CompanyContext: Setting selected company:", company)
    setSelectedCompanyState(company)

    // Guardar en localStorage
    if (company) {
      localStorage.setItem("selectedCompanyId", company.id)
    } else {
      localStorage.removeItem("selectedCompanyId")
    }
  }

  // Cargar todas las empresas disponibles
  const loadCompanies = async () => {
    if (!user) {
      console.log("CompanyContext: No user, clearing companies")
      setAllCompanies([])
      setSelectedCompanyState(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log("CompanyContext: Loading companies for user:", user.id, user.role)

      // Si es admin, cargar todas las empresas
      if (user.role === "admin") {
        const { data, error } = await supabase.from("companies").select("id, name, code, color").order("name")

        if (error) {
          console.error("Error loading companies:", error)
          setError(error.message)
          setAllCompanies([])
          return
        }

        console.log("CompanyContext: Companies loaded for admin:", data?.length || 0)
        setAllCompanies(data || [])

        // Cargar selección guardada o usar modo general (null)
        const savedCompanyId = localStorage.getItem("selectedCompanyId")
        if (savedCompanyId && data) {
          const savedCompany = data.find((c) => c.id === savedCompanyId)
          if (savedCompany) {
            setSelectedCompanyState(savedCompany)
            console.log("CompanyContext: Restored saved company:", savedCompany.name)
          } else {
            setSelectedCompanyState(null)
            console.log("CompanyContext: General mode (saved company not found)")
          }
        } else {
          setSelectedCompanyState(null)
          console.log("CompanyContext: General mode (no saved selection)")
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
          console.error("Error loading user company:", error)
          setError(error.message)
          setAllCompanies([])
          return
        }

        if (data) {
          console.log("CompanyContext: User company loaded:", data.name)
          setAllCompanies([data])
          setSelectedCompanyState(data)
        }
      } else {
        console.log("CompanyContext: User has no company assigned")
        setAllCompanies([])
        setSelectedCompanyState(null)
      }
    } catch (err: any) {
      console.error("Error in CompanyContext:", err)
      setError(err.message || "Error loading companies")
      setAllCompanies([])
    } finally {
      setLoading(false)
    }
  }

  // Función para actualizar manualmente las empresas
  const refreshCompanies = async () => {
    await loadCompanies()
    toast.success("Company list updated")
  }

  // Cargar empresas cuando cambia el usuario
  useEffect(() => {
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
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
