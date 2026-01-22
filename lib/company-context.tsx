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
  description?: string | null
  address?: string | null
}

interface CompanyContextType {
  selectedCompany: Company | null
  allCompanies: Company[]
  setSelectedCompany: (company: Company | null) => void
  loading: boolean
  error: string | null
  refreshCompanies: () => Promise<void>
  createCompany: (company: Omit<Company, "id" | "logo_url">, logoFile?: File) => Promise<Company | null>
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
        const { data, error } = await supabase.from("companies").select("*").order("name")

        if (error) {
          console.error("Error loading companies:", error)
          setError(error.message)
          setAllCompanies([])
          return
        }
        const validData = (data || []).map(c => ({
          ...c,
          color: c.color || "#64748b" // Default slate color
        }))
        setAllCompanies(validData)

        const savedCompanyId = localStorage.getItem("selectedCompanyId")
        if (savedCompanyId) {
          const savedCompany = validData.find((c) => c.id === savedCompanyId)
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
          .select("*")
          .eq("id", user.company_id)
          .single()

        if (error) {
          console.error("Error loading user company:", error)
          setError(error.message)
          setAllCompanies([])
          return
        }

        if (data) {
          const validCompany = { ...data, color: data.color || "#64748b" }
          setAllCompanies([validCompany])
          setSelectedCompanyState(validCompany)
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

  const createCompany = async (company: Omit<Company, "id" | "logo_url">, logoFile?: File) => {
    try {
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized: Only admins can create companies")
      }

      setLoading(true)
      let logo_url = null

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${company.code.toLowerCase()}_${Date.now()}.${fileExt}`
        const filePath = `logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, logoFile)

        if (uploadError) {
          throw new Error(`Error uploading logo: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath)

        logo_url = publicUrl
      }

      const { data, error } = await supabase
        .from("companies")
        .insert([{
          name: company.name,
          code: company.code,
          ruc: company.ruc,
          color: company.color || "#3b82f6",
          logo_url: logo_url,
          description: company.description,
          address: company.address
        }])
        .select()
        .single()

      if (error) throw error

      if (data) {
        setAllCompanies((prev) => [...prev, data as Company])
        toast.success("Company created successfully")
        return data as Company
      }
      return null
    } catch (err: any) {
      console.error("Error creating company:", err)
      toast.error(err.message || "Failed to create company")
      return null
    } finally {
      setLoading(false)
    }
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
        createCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
