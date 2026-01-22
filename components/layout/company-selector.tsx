"use client"

import { useState } from "react"
import { Check, Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useCompany, type Company } from "@/lib/company-context"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function CompanySelector() {
  const { user, setSelectedCompanyId } = useAuth()
  const { allCompanies, selectedCompany, setSelectedCompany, refreshCompanies, createCompany, loading } = useCompany()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<"list" | "create">("list")
  const [newCompany, setNewCompany] = useState<{
    name: string
    code: string
    ruc: string
    color: string
    description: string
    address: string
    logoFile: File | null
  }>({
    name: "",
    code: "",
    ruc: "",
    color: "#3b82f6",
    description: "",
    address: "",
    logoFile: null
  })
  const [creating, setCreating] = useState(false)

  const handleCompanySelect = (company: Company | null) => {
    console.log("COMPANY SELECTOR: Selecting company:", company)

    // Actualizar en el contexto de empresa
    setSelectedCompany(company)

    // Actualizar en el contexto de autenticación
    setSelectedCompanyId(company?.id || null)

    if (company) {
      toast.success(`Empresa Seleccionada: ${company.name}`)
    } else {
      toast.success("Modo General Activado - Toda la información es visible")
    }
    setDialogOpen(false)
  }

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.code) {
      toast.error("Nombre y Código son requeridos")
      return
    }

    setCreating(true)
    const created = await createCompany({
      name: newCompany.name,
      code: newCompany.code,
      ruc: newCompany.ruc || null,
      color: newCompany.color,
      description: newCompany.description || null,
      address: newCompany.address || null
    }, newCompany.logoFile || undefined)

    setCreating(false)
    if (created) {
      setView("list")
      setNewCompany({
        name: "",
        code: "",
        ruc: "",
        color: "#3b82f6",
        description: "",
        address: "",
        logoFile: null
      })
    }
  }

  const handleReload = async () => {
    setRefreshing(true)
    toast.info("Recargando lista de empresas...")
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

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setTimeout(() => setView("list"), 300) // Reset after animation
      }}>
        <DialogContent className="sm:max-w-[700px] bg-slate-50 p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-center text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              {view === "list" ? "Seleccionar Organización" : "Nueva Organización"}
            </DialogTitle>
            <p className="text-center text-slate-500 mt-2">
              {view === "list"
                ? "Administra múltiples empresas desde una sola cuenta"
                : "Ingresa los detalles para registrar una nueva empresa"}
            </p>
          </DialogHeader>

          {view === "list" ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {/* Opción General */}
                <div
                  className={`group relative rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${selectedCompany === null
                    ? "border-blue-600 bg-white shadow-lg shadow-blue-900/5 ring-1 ring-blue-600"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-1"
                    }`}
                  onClick={() => handleCompanySelect(null)}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${selectedCompany === null ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                    }`}>
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <h3 className={`font-bold transition-colors ${selectedCompany === null ? "text-blue-900" : "text-slate-700"}`}>Vista Global</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Todos los usuarios</p>
                  </div>

                  {selectedCompany === null && (
                    <div className="absolute top-3 right-3 text-blue-600">
                      <div className="bg-blue-600 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Empresas */}
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className={`group relative rounded-xl border-2 p-6 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${selectedCompany?.id === company.id
                      ? "border-blue-600 bg-white shadow-lg shadow-blue-900/5 ring-1 ring-blue-600"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-1"
                      }`}
                    onClick={() => handleCompanySelect(company)}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm transition-transform duration-300 group-hover:scale-110 overflow-hidden"
                      style={{ backgroundColor: !company.logo_url ? (company.color || "#64748b") : "transparent" }}
                    >
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.code} className="w-full h-full object-contain p-1" />
                      ) : (
                        company.code.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="text-center w-full">
                      <h3 className={`font-bold truncate px-2 ${selectedCompany?.id === company.id ? "text-blue-900" : "text-slate-700"}`}>{company.code}</h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium truncate w-full">{company.name}</p>
                    </div>

                    {selectedCompany?.id === company.id && (
                      <div className="absolute top-3 right-3 text-blue-600">
                        <div className="bg-blue-600 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Añadir nueva empresa */}
                <div
                  className="group rounded-xl border-2 border-dashed border-slate-300 p-6 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/50"
                  onClick={() => setView("create")}
                >
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center transition-colors group-hover:bg-blue-100">
                    <Plus className="h-7 w-7 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-slate-600 group-hover:text-blue-600">Nueva Empresa</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Crear organización</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-8 pt-6 border-t border-slate-200">
                <Button
                  variant="ghost"
                  onClick={handleReload}
                  className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 gap-2 font-medium"
                  disabled={refreshing}
                >
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
                  Sincronizar Lista
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Ej. Acme Corp"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    placeholder="Ej. ACME"
                    value={newCompany.code}
                    onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruc">RUC (Opcional)</Label>
                <Input
                  id="ruc"
                  placeholder="Ej. 20123456789"
                  value={newCompany.ruc}
                  onChange={(e) => setNewCompany({ ...newCompany, ruc: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Breve descripción de la empresa"
                  value={newCompany.description}
                  onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Dirección fiscal"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color de Marca</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    className="w-12 h-10 p-1 cursor-pointer"
                    value={newCompany.color}
                    onChange={(e) => setNewCompany({ ...newCompany, color: e.target.value })}
                  />
                  <Input
                    placeholder="#3b82f6"
                    value={newCompany.color}
                    onChange={(e) => setNewCompany({ ...newCompany, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo (Imagen)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setNewCompany({ ...newCompany, logoFile: file })
                  }}
                />
                <p className="text-[10px] text-slate-400">
                  Formatos recomendados: PNG, JPG. El logo se guardará en /logos
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setView("list")} disabled={creating}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCompany} disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {creating ? "Creando..." : "Crear Empresa"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog >
    </>
  )
}
