"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface Company {
  id: string
  name: string
  code: string
  color: string
}

export function CompanySelector() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role === "admin") {
      loadCompanies()
    }
  }, [user])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Cargando empresas desde Supabase...")

      // Verificar conexión con Supabase
      const { data: testData, error: testError } = await supabase.from("companies").select("count").limit(1)

      if (testError) {
        console.error("Error de conexión con Supabase:", testError)
        setError(`Error de conexión: ${testError.message}`)
        throw testError
      }

      console.log("Conexión con Supabase establecida, obteniendo empresas...")
      const { data, error } = await supabase.from("companies").select("*").order("name")

      if (error) {
        console.error("Error al cargar empresas:", error)
        setError(`Error al cargar empresas: ${error.message}`)
        toast.error(`Error al cargar empresas: ${error.message}`)
        throw error
      }

      console.log("Empresas cargadas:", data?.length || 0, data)
      setCompanies(data || [])

      // Si no hay empresas, verificar y mostrar mensaje
      if (!data || data.length === 0) {
        console.warn("No se encontraron empresas en la base de datos")
        toast.warning("No hay empresas configuradas. Ejecute el script para crear empresas.")
        return
      }

      // Cargar selección guardada o usar la primera empresa
      const savedCompanyId = localStorage.getItem("selectedCompanyId")
      if (savedCompanyId && data) {
        const savedCompany = data.find((c) => c.id === savedCompanyId)
        if (savedCompany) {
          setSelectedCompany(savedCompany)
          console.log("Empresa guardada cargada:", savedCompany.name)
        } else if (data.length > 0) {
          setSelectedCompany(data[0])
          console.log("Primera empresa seleccionada:", data[0].name)
        }
      } else if (data && data.length > 0) {
        setSelectedCompany(data[0])
        console.log("Primera empresa seleccionada:", data[0].name)
      }
    } catch (error: any) {
      console.error("Error loading companies:", error)
      setError(error.message || "Error desconocido al cargar empresas")
    } finally {
      setLoading(false)
    }
  }

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company)
    localStorage.setItem("selectedCompanyId", company.id)
    setOpen(false)
    toast.success(`Empresa seleccionada: ${company.name}`)
  }

  const handleReload = () => {
    toast.info("Recargando lista de empresas...")
    loadCompanies()
  }

  // No mostrar si no es admin
  if (user?.role !== "admin") {
    return null
  }

  if (loading) {
    return <div className="w-[200px] h-9 bg-muted animate-pulse rounded-md"></div>
  }

  if (error) {
    return (
      <Button variant="destructive" size="sm" className="gap-2" onClick={handleReload}>
        <Building2 className="h-4 w-4" />
        <span className="truncate">Error: {error.substring(0, 20)}...</span>
      </Button>
    )
  }

  if (companies.length === 0) {
    return (
      <Button variant="outline" className="flex items-center gap-2" onClick={handleReload}>
        <Building2 className="h-4 w-4" />
        <span>Sin empresas</span>
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between">
          {selectedCompany ? (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedCompany.color || "#888888" }} />
              <span className="truncate">{selectedCompany.code}</span>
            </div>
          ) : (
            <span>Seleccionar empresa</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground">No se encontraron empresas.</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={handleReload}>
                  Recargar
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.code}
                  onSelect={() => handleCompanySelect(company)}
                  className="flex items-center gap-2"
                >
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: company.color || "#888888" }} />
                  <div className="flex flex-col">
                    <span className="font-medium">{company.code}</span>
                    <span className="text-xs text-muted-foreground truncate">{company.name}</span>
                  </div>
                  <Check
                    className={cn("ml-auto h-4 w-4", selectedCompany?.id === company.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleReload}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-refresh-cw mr-2 h-4 w-4"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M8 16H3v5" />
                </svg>
                Recargar empresas
              </Button>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
