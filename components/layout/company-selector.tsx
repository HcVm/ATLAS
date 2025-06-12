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
  const { user } = useAuth()
  const { allCompanies, selectedCompany, setSelectedCompany, refreshCompanies } = useCompany()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCompanySelect = (company: Company | null) => {
    setSelectedCompany(company)
    if (company) {
      localStorage.setItem("selectedCompanyId", company.id)
      toast.success(`Empresa seleccionada: ${company.name}`)
    } else {
      localStorage.removeItem("selectedCompanyId")
      toast.success("Modo general activado - Todos los usuarios visibles")
    }
    setDialogOpen(false)
  }

  const handleReload = async () => {
    setLoading(true)
    toast.info("Recargando lista de empresas...")
    await refreshCompanies()
    setLoading(false)
  }

  // No mostrar si no es admin
  if (user?.role !== "admin") {
    return null
  }

  if (loading) {
    return <div className="w-[200px] h-9 bg-muted animate-pulse rounded-md"></div>
  }

  return (
    <>
      {/* Botón para abrir el selector visual */}
      <Button variant="outline" className="flex items-center gap-2 pr-3" onClick={() => setDialogOpen(true)}>
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
            <DialogTitle className="text-center text-2xl font-bold">¿Qué empresa quieres gestionar?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-muted-foreground mb-6">
              Selecciona una empresa para gestionar sus usuarios y documentos, o usa el modo general para ver todos los
              usuarios.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Opción General */}
              <div
                className={`relative rounded-lg border-2 ${
                  selectedCompany === null
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-purple-300"
                } p-4 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center`}
                onClick={() => handleCompanySelect(null)}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white mb-2">
                  <Building2 className="h-8 w-8" />
                </div>
                <h3 className="font-medium text-center">General</h3>
                <p className="text-xs text-muted-foreground text-center">Ver todos los usuarios</p>
                {selectedCompany === null && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-5 w-5 text-purple-500" />
                  </div>
                )}
              </div>

              {/* Empresas */}
              {allCompanies.map((company) => (
                <div
                  key={company.id}
                  className={`relative rounded-lg border-2 ${
                    selectedCompany?.id === company.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
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
                      <Check className="h-5 w-5 text-purple-500" />
                    </div>
                  )}
                </div>
              ))}

              {/* Añadir nueva empresa */}
              <div
                className="rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-300 p-4 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center"
                onClick={() => {
                  setDialogOpen(false)
                  toast.info("Funcionalidad para añadir empresas en desarrollo")
                }}
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Plus className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="font-medium text-center">Añadir</h3>
                <p className="text-xs text-muted-foreground text-center">Nueva empresa</p>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <Button variant="outline" onClick={handleReload} className="gap-2">
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
                className="lucide lucide-refresh-cw h-4 w-4"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              Recargar empresas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
