"use client"

import { useState } from "react"
import { Check, Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"

interface Company {
  id: string
  name: string
  code: string
  color: string
}

export function CompanySelector() {
  const { user, setSelectedCompanyId } = useAuth()
  const { allCompanies, selectedCompany, setSelectedCompany, refreshCompanies, loading } = useCompany()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleCompanySelect = (company: Company | null) => {
    console.log("COMPANY SELECTOR: Selecting company:", company)

    // Actualizar en el contexto de empresa
    setSelectedCompany(company)

    // Actualizar en el contexto de autenticación
    setSelectedCompanyId(company?.id || null)

    if (company) {
      toast.success(`Company selected: ${company.name}`)
    } else {
      toast.success("General mode activated - All users visible")
    }
    setDialogOpen(false)
  }

  const handleReload = async () => {
    setRefreshing(true)
    toast.info("Reloading company list...")
    await refreshCompanies()
    setRefreshing(false)
  }

  // No mostrar si no es admin
  if (user?.role !== "admin") {
    return null
  }

  // Mostrar loading si está cargando
  if (loading) {
    return <div className="w-[200px] h-9 bg-muted animate-pulse rounded-md"></div>
  }

  // Asegurar que allCompanies sea un array
  const companies = Array.isArray(allCompanies) ? allCompanies : []

  return (
    <>
      {/* Botón para abrir el selector visual */}
      <Button
        variant="outline"
        className="flex items-center gap-2 pr-3 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300"
        onClick={() => setDialogOpen(true)}
      >
        {selectedCompany ? (
          <>
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: selectedCompany.color || "#888888" }}
            >
              {selectedCompany.code.substring(0, 2).toUpperCase()}
            </div>
            <span className="truncate max-w-[120px]">{selectedCompany.name}</span>
          </>
        ) : (
          <>
            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
              G
            </div>
            <span>General</span>
          </>
        )}
      </Button>

      {/* Diálogo de selector visual de empresas */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">What company do you want to manage?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-muted-foreground mb-6">
              Select a company to manage its users and documents, or use general mode to see all users.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Opción General */}
              <div
                className={`relative rounded-lg border-2 ${
                  selectedCompany === null ? "border-slate-300 bg-slate-100" : "border-slate-200 hover:border-slate-300"
                } p-4 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center`}
                onClick={() => handleCompanySelect(null)}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white mb-2">
                  <Building2 className="h-8 w-8" />
                </div>
                <h3 className="font-medium text-center">General</h3>
                <p className="text-xs text-muted-foreground text-center">View all users</p>
                {selectedCompany === null && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-5 w-5 text-slate-600" />
                  </div>
                )}
              </div>

              {/* Empresas */}
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={`relative rounded-lg border-2 ${
                    selectedCompany?.id === company.id
                      ? "border-slate-300 bg-slate-100"
                      : "border-slate-200 hover:border-slate-300"
                  } p-4 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center`}
                  onClick={() => handleCompanySelect(company)}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-2 text-white font-bold text-xl"
                    style={{ backgroundColor: company.color || "#888888" }}
                  >
                    {company.code.substring(0, 2).toUpperCase()}
                  </div>
                  <h3 className="font-medium text-center">{company.code}</h3>
                  <p className="text-xs text-muted-foreground text-center truncate max-w-full">{company.name}</p>
                  {selectedCompany?.id === company.id && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}

              {/* Añadir nueva empresa */}
              <div
                className="rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-300 p-4 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center"
                onClick={() => {
                  setDialogOpen(false)
                  toast.info("Add company functionality in development")
                }}
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Plus className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="font-medium text-center">Add</h3>
                <p className="text-xs text-muted-foreground text-center">New company</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="outline" onClick={handleReload} className="gap-2" disabled={refreshing}>
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
                className={`lucide lucide-refresh-cw h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              Reload companies
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
