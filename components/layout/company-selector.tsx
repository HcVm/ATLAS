"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

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

  useEffect(() => {
    if (user?.role === "admin") {
      loadCompanies()
    }
  }, [user])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("companies").select("id, name, code, color").order("name")

      if (error) throw error

      setCompanies(data || [])

      // Cargar selección guardada o usar la primera empresa
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
    } catch (error) {
      console.error("Error loading companies:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company)
    localStorage.setItem("selectedCompanyId", company.id)
    setOpen(false)
  }

  // No mostrar si no es admin o no hay empresas
  if (user?.role !== "admin" || loading) {
    return loading ? <div className="w-[200px] h-9 bg-muted animate-pulse rounded-md"></div> : null
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Sin empresas</span>
      </div>
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
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>No se encontraron empresas.</CommandEmpty>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
