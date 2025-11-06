"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { supabase } from "./supabase"
import { toast } from "sonner"

export interface Company {
  id: string
  ruc: string | null
  name: string
  code: string
  color: string
  logo_url?: string | null
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

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company)

    if (company) {
      localStorage.setItem("selectedCompanyId", company.id)
    } else {
      localStorage.removeItem("selectedCompanyId")
    }
  }

  const loadCompanies = async () => {
    if (!user) {
      setAllCompanies([])
      setSelectedCompanyState(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (user.role === "admin") {
        const { data, error } = await supabase.from("companies").select("id, name, code, color, ruc, logo_url").order("name")

        if (error) {
          console.error("Error loading companies:", error)
          setError(error.message)
          setAllCompanies([])
          return
        }
        setAllCompanies(data || [])
        const savedCompanyId = localStorage.getItem("selectedCompanyId")
        if (savedCompanyId && data) {
          const savedCompany = data.find((c) => c.id === savedCompanyId)
          if (savedCompany) {
            setSelectedCompanyState(savedCompany)
          } else {
            setSelectedCompanyState(null)
          }
        } else {
          setSelectedCompanyState(null)
        }
      }

      else if (user.company_id) {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, code, color, ruc, logo_url")
          .eq("id", user.company_id)
          .single()

        if (error) {
          console.error("Error loading user company:", error)
          setError(error.message)
          setAllCompanies([])
          return
        }

        if (data) {
          setAllCompanies([data])
          setSelectedCompanyState(data)
        }
      } else {
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

  const refreshCompanies = async () => {
    await loadCompanies()
    toast.success("Company list updated")
  }

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
