"use client"

import { AlertDialogContent } from "@/components/ui/alert-dialog"
import { AlertDialogAction } from "@/components/ui/alert-dialog"
import { AlertDialogCancel } from "@/components/ui/alert-dialog"
import { AlertDialogFooter } from "@/components/ui/alert-dialog"
import { AlertDialogDescription } from "@/components/ui/alert-dialog"
import { AlertDialogTitle } from "@/components/ui/alert-dialog"
import { AlertDialogHeader } from "@/components/ui/alert-dialog"
import { AlertDialog, AlertDialogPortal, AlertDialogOverlay } from "@/components/ui/alert-dialog"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Users } from "lucide-react"
import { ClientForm } from "@/components/sales/client-form"
import { ClientFollowUpDialog } from "@/components/sales/client-follow-up-dialog"
import { ClientCard } from "@/components/sales/client-card"
import { generatePresentationLetter } from "@/lib/presentation-letter-generator"

interface SalesEntity {
  id: string
  name: string
  ruc: string
  executing_unit: string | null
  fiscal_address: string | null
  email: string | null
  contact_person: string | null
  client_type: "private" | "government" | null
}

interface ClientFollowUp {
  client_id: string
  status: string
  created_at: string
}

const statusOrder = {
  por_contactar: 0,
  contactado: 1,
  negociando: 2,
  inactivo: 3,
  descartado: 4,
}

const statusLabels = {
  por_contactar: "Por Contactar",
  contactado: "Contactado",
  negociando: "Negociando",
  inactivo: "Inactivo",
  descartado: "Descartado",
}

export default function CRMPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const [clients, setClients] = useState<SalesEntity[]>([])
  const [followUps, setFollowUps] = useState<Record<string, ClientFollowUp>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingClient, setEditingClient] = useState<SalesEntity | null>(null)
  const [deletingClient, setDeletingClient] = useState<SalesEntity | null>(null)
  const [followUpClient, setFollowUpClient] = useState<SalesEntity | null>(null)

  const companyToUse =
    user?.role === "admin"
      ? selectedCompany
      : user?.company_id
        ? { id: user.company_id, name: user.company_name }
        : null

  const canManageClients =
    user?.role === "admin" ||
    user?.role === "supervisor" ||
    user?.departments?.name === "Ventas" ||
    user?.departments?.name === "Administración" ||
    user?.departments?.name === "Operaciones" ||
    user?.departments?.name === "Jefatura de Ventas"

  useEffect(() => {
    if (companyToUse?.id) {
      fetchClientsAndFollowUps()
    }
  }, [companyToUse?.id])

  const fetchClientsAndFollowUps = async () => {
    if (!companyToUse?.id) return

    setLoading(true)
    try {
      const [clientsResponse, followUpsResponse] = await Promise.all([
        supabase
          .from("sales_entities")
          .select("id, name, ruc, executing_unit, fiscal_address, email, contact_person, client_type")
          .eq("company_id", companyToUse.id)
          .order("name", { ascending: true }),
        supabase
          .from("client_follow_ups")
          .select("client_id, status, created_at")
          .eq("company_id", companyToUse.id)
          .order("created_at", { ascending: false }),
      ])

      if (clientsResponse.error) throw clientsResponse.error
      if (followUpsResponse.error) throw followUpsResponse.error

      setClients(clientsResponse.data || [])

      // Build a map of the latest follow-up for each client
      const followUpMap: Record<string, ClientFollowUp> = {}
      ;(followUpsResponse.data || []).forEach((followUp) => {
        if (!followUpMap[followUp.client_id]) {
          followUpMap[followUp.client_id] = followUp
        }
      })
      setFollowUps(followUpMap)
    } catch (error: any) {
      toast.error("Error al cargar clientes: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!deletingClient) return

    try {
      const { error } = await supabase.from("sales_entities").delete().eq("id", deletingClient.id)

      if (error) throw error
      toast.success("Cliente eliminado exitosamente")
      setDeletingClient(null)
      await fetchClientsAndFollowUps()
    } catch (error: any) {
      toast.error("Error al eliminar cliente: " + error.message)
    }
  }

  const handleGenerateLetter = async (client: SalesEntity) => {
    if (!companyToUse) {
      toast.error("No se pudo identificar la empresa actual")
      return
    }

    try {
      toast.info(`Generando carta de presentación para ${client.name}...`)

      // Generar número de carta simple (simulado ya que no hay secuencia en BD)
      // Formato: CODIGO-AÑO-RANDOM
      const currentYear = new Date().getFullYear()
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
      
      // Obtener código de empresa (si companyToUse tiene code, usarlo, sino intentar derivarlo o usar default)
      let companyCode = "ARM" // Default fallback
      const companyName = companyToUse.name || ""
      const userEmail = user?.email || ""
      
      if ('code' in companyToUse && (companyToUse as any).code) {
         companyCode = (companyToUse as any).code
      } else if (companyName.toUpperCase().includes("AGLE")) {
        companyCode = "AGLE"
      } else if (companyName.toUpperCase().includes("GALUR")) {
        companyCode = "GALUR"
      } else if (companyName.toUpperCase().includes("ARM")) {
        companyCode = "ARM"
      } else {
        // Fallback: Check user email if company name didn't match
        if (userEmail.toLowerCase().includes("agle")) companyCode = "AGLE"
        else if (userEmail.toLowerCase().includes("galur")) companyCode = "GALUR"
        else if (userEmail.toLowerCase().includes("arm")) companyCode = "ARM"
      }

      // Prefijo según empresa para el número
      let prefix = "CARTA"
      if (companyCode.includes("ARM")) prefix = "NºARM"
      if (companyCode.includes("AGLE")) prefix = "N°AGLEP"
      if (companyCode.includes("GALUR")) prefix = "GBC"

      const letterNumber = `${prefix}-${randomNum}-${currentYear}`

      await generatePresentationLetter({
        companyName: companyToUse.name,
        companyCode: companyCode,
        // companyRuc: companyToUse.ruc, // Si estuviera disponible en companyToUse
        letterNumber: letterNumber,
        clientName: client.name,
        clientRuc: client.ruc,
        clientAddress: client.fiscal_address || "Dirección no registrada",
        createdBy: user?.full_name || "Usuario del Sistema",
      })

      toast.success("Carta de presentación generada exitosamente")
    } catch (error: any) {
      console.error("Error generating presentation letter:", error)
      toast.error("Error al generar la carta: " + error.message)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.ruc.includes(searchTerm) ||
      (client.executing_unit && client.executing_unit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.fiscal_address && client.fiscal_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const groupedClients = filteredClients.reduce(
    (acc, client) => {
      const status = followUps[client.id]?.status || "por_contactar"
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push(client)
      return acc
    },
    {} as Record<string, SalesEntity[]>,
  )

  if (!canManageClients) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50">
          <CardContent className="pt-6">
            <p className="text-red-800 dark:text-red-200">No tienes permiso para acceder a esta sección</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Users className="h-8 w-8 text-slate-700 dark:text-slate-300" />
                CRM - Gestión de Clientes
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {clients.length} cliente{clients.length !== 1 ? "s" : ""} registrado{clients.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingClient(null)
                setShowCreateForm(true)
              }}
              className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>

          {/* Search Bar */}
          <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, RUC, dirección, email o contacto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200 dark:border-slate-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* Clients by Status */}
          {loading ? (
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-400"></div>
                  <span className="ml-3 text-slate-600 dark:text-slate-300">Cargando clientes...</span>
                </div>
              </CardContent>
            </Card>
          ) : filteredClients.length === 0 ? (
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {searchTerm ? "No se encontraron clientes que coincidan" : "No hay clientes registrados"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(statusOrder)
                .sort(([, a], [, b]) => a - b)
                .map(([status]) => {
                  const statusClientsCount = groupedClients[status]?.length || 0
                  return (
                    <div key={status} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                          {statusLabels[status as keyof typeof statusLabels]}
                        </h2>
                        <Badge
                          variant="secondary"
                          className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          {statusClientsCount}
                        </Badge>
                      </div>

                      {statusClientsCount === 0 ? (
                        <Card className="bg-slate-50/50 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700">
                          <CardContent className="pt-6">
                            <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                              No hay clientes en este estado
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(groupedClients[status] || []).map((client) => (
                            <ClientCard
                              key={client.id}
                              client={client}
                              lastFollowUpStatus={followUps[client.id]?.status || "por_contactar"}
                              onEdit={(client) => {
                                setEditingClient(client)
                                setShowCreateForm(true)
                              }}
                              onDelete={(client) => setDeletingClient(client)}
                              onFollowUp={(client) => setFollowUpClient(client)}
                              onGenerateLetter={handleGenerateLetter}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      <ClientForm
        open={showCreateForm || !!editingClient}
        onOpenChange={(open) => {
          setShowCreateForm(open && !editingClient)
          if (!open) setEditingClient(null)
        }}
        entity={editingClient}
        companyId={companyToUse?.id}
        onSuccess={fetchClientsAndFollowUps}
      />

      {/* Follow-up Dialog */}
      {followUpClient && (
        <ClientFollowUpDialog
          open={!!followUpClient}
          onOpenChange={(open) => {
            if (!open) setFollowUpClient(null)
          }}
          clientId={followUpClient.id}
          clientName={followUpClient.name}
          companyId={companyToUse?.id}
          onSuccess={fetchClientsAndFollowUps}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-slate-50">Eliminar Cliente</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                ¿Estás seguro de que deseas eliminar a {deletingClient?.name}? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-200 dark:border-slate-700">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClient} className="bg-red-600 hover:bg-red-700 text-white">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  )
}
