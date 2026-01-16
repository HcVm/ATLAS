"use client"

import { AlertDialogContent } from "@/components/ui/alert-dialog"
import { AlertDialogAction } from "@/components/ui/alert-dialog"
import { AlertDialogCancel } from "@/components/ui/alert-dialog"
import { AlertDialogFooter } from "@/components/ui/alert-dialog"
import { AlertDialogDescription } from "@/components/ui/alert-dialog"
import { AlertDialogTitle } from "@/components/ui/alert-dialog"
import { AlertDialogHeader } from "@/components/ui/alert-dialog"
import { AlertDialog, AlertDialogPortal, AlertDialogOverlay } from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Users, Loader2, LayoutGrid, List as ListIcon, Edit, MessageSquare, MoreHorizontal, FileText, Trash2 } from "lucide-react"
import { ClientForm } from "@/components/sales/client-form"
import { ClientFollowUpDialog } from "@/components/sales/client-follow-up-dialog"
import { ClientCard } from "@/components/sales/client-card"
import { generatePresentationLetter } from "@/lib/presentation-letter-generator"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SalesEntity {
  id: string
  name: string
  ruc: string
  executing_unit: string | null
  fiscal_address: string | null
  email: string | null
  contact_person: string | null
  client_type: "private" | "government" | null
  presentation_letter_number: string | null
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
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
  const [showLetterNumberDialog, setShowLetterNumberDialog] = useState(false)
  const [clientForLetter, setClientForLetter] = useState<SalesEntity | null>(null)
  const [letterNumberInput, setLetterNumberInput] = useState("")
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

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
          .select("id, name, ruc, executing_unit, fiscal_address, email, contact_person, client_type, presentation_letter_number")
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

  const generateLetterWithNumber = async (client: SalesEntity, letterNumber: string) => {
    if (!companyToUse) return

    try {
      toast.info(`Generando carta de presentación para ${client.name}...`)

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

  const handleGenerateLetter = async (client: SalesEntity) => {
    if (!companyToUse) {
      toast.error("No se pudo identificar la empresa actual")
      return
    }

    if (client.presentation_letter_number) {
      await generateLetterWithNumber(client, client.presentation_letter_number)
    } else {
      // Sugerir un número basado en la lógica anterior o dejar vacío
      const currentYear = new Date().getFullYear()
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
      
      // Obtener código de empresa para el prefijo sugerido
      let companyCode = "ARM"
      const companyName = companyToUse.name || ""
      if (companyName.toUpperCase().includes("AGLE")) companyCode = "AGLE"
      else if (companyName.toUpperCase().includes("GALUR")) companyCode = "GALUR"
      
      let prefix = "CARTA"
      if (companyCode.includes("ARM")) prefix = "NºARM"
      if (companyCode.includes("AGLE")) prefix = "N°AGLEP"
      if (companyCode.includes("GALUR")) prefix = "GBC"

      const suggestedNumber = `${prefix}-${randomNum}-${currentYear}`
      
      setClientForLetter(client)
      setLetterNumberInput(suggestedNumber)
      setShowLetterNumberDialog(true)
    }
  }

  const handleLetterNumberSubmit = async () => {
    if (!clientForLetter || !letterNumberInput.trim()) {
      toast.error("Por favor ingrese un número de carta")
      return
    }

    setIsGeneratingLetter(true)
    try {
      // Guardar el número en la base de datos
      const { error } = await supabase
        .from("sales_entities")
        .update({ presentation_letter_number: letterNumberInput })
        .eq("id", clientForLetter.id)

      if (error) throw error

      // Actualizar estado local
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientForLetter.id ? { ...c, presentation_letter_number: letterNumberInput } : c
        )
      )

      // Generar la carta
      await generateLetterWithNumber(clientForLetter, letterNumberInput)
      
      setShowLetterNumberDialog(false)
      setClientForLetter(null)
    } catch (error: any) {
      toast.error("Error al guardar el número de carta: " + error.message)
    } finally {
      setIsGeneratingLetter(false)
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
      let status = followUps[client.id]?.status || "por_contactar"
      status = status.toLowerCase()
      
      // Normalize common status mismatches if necessary
      if (!statusOrder.hasOwnProperty(status)) {
        // Try to find a partial match or default to 'por_contactar'
        // But for now, just let's assume if it's not valid, treat as 'por_contactar' 
        // unless we want to show them in a specific "Others" section.
        // Given the user complaint, likely they are disappearing because of mismatch.
        if (status === "pending") status = "por_contactar"
        else if (status === "contacted") status = "contactado"
        else if (status === "negotiating") status = "negociando"
        else if (status === "inactive") status = "inactivo"
        else if (status === "discarded") status = "descartado"
        // If still not found in statusOrder, we might want to default to 'por_contactar'
        // so they at least appear somewhere.
        else if (!Object.keys(statusOrder).includes(status)) {
           status = "por_contactar"
        }
      }

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50">
        <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p className="text-red-800 dark:text-red-200">No tienes permiso para acceder a esta sección</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
                <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                CRM - Gestión de Clientes
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {clients.length} cliente{clients.length !== 1 ? "s" : ""} registrado{clients.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
               <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700/50">
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setViewMode("grid")}
                     className={`h-8 w-8 p-0 rounded-md transition-all ${
                        viewMode === "grid" 
                        ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                     }`}
                  >
                     <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setViewMode("list")}
                     className={`h-8 w-8 p-0 rounded-md transition-all ${
                        viewMode === "list" 
                        ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                     }`}
                  >
                     <ListIcon className="h-4 w-4" />
                  </Button>
               </div>
               <Button
                  onClick={() => {
                  setEditingClient(null)
                  setShowCreateForm(true)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 rounded-xl h-11 px-6"
               >
                  <Plus className="h-5 w-5 mr-2" />
                  Nuevo Cliente
               </Button>
            </div>
          </motion.div>

          {/* Search Bar */}
          <motion.div variants={itemVariants}>
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-20 dark:opacity-40" />
              <Card className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-2">
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                    <Input
                      placeholder="Buscar por nombre, RUC, dirección, email o contacto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 bg-transparent border-none h-12 text-lg focus-visible:ring-0 placeholder:text-slate-400"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Stats Overview (Optional enhancement) */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {/* Simple stats could go here if we calculated them, for now we skip to keep it clean */}
          </motion.div>

          {/* Clients by Status */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200/50 dark:border-slate-700/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-600 dark:text-slate-400" />
                      <span className="ml-3 text-slate-600 dark:text-slate-300">Cargando clientes...</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : filteredClients.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200/50 dark:border-slate-700/50">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400">
                        {searchTerm ? "No se encontraron clientes que coincidan" : "No hay clientes registrados"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div 
                key="content" 
                className="space-y-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {Object.entries(statusOrder)
                  .sort(([, a], [, b]) => a - b)
                  .map(([status]) => {
                    const statusClientsCount = groupedClients[status]?.length || 0
                    return (
                      <motion.div key={status} variants={itemVariants} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-sm">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                              {statusLabels[status as keyof typeof statusLabels]}
                            </h2>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800"
                          >
                            {statusClientsCount}
                          </Badge>
                        </div>

                        {statusClientsCount === 0 ? (
                          <Card className="bg-slate-50/30 dark:bg-slate-800/20 border-dashed border-slate-300 dark:border-slate-700 backdrop-blur-sm">
                            <CardContent className="pt-6">
                              <p className="text-center text-slate-500 dark:text-slate-400 text-sm">
                                No hay clientes en este estado
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                           viewMode === "grid" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(groupedClients[status] || []).map((client, index) => (
                                <motion.div
                                  key={client.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: index * 0.05 }}
                                >
                                  <ClientCard
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
                                </motion.div>
                              ))}
                            </div>
                           ) : (
                              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                                 <Table>
                                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                                       <TableRow>
                                          <TableHead>Cliente</TableHead>
                                          <TableHead>RUC</TableHead>
                                          <TableHead>Contacto</TableHead>
                                          <TableHead>Email</TableHead>
                                          <TableHead className="text-right">Acciones</TableHead>
                                       </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                       {(groupedClients[status] || []).map((client, index) => (
                                          <TableRow key={client.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50">
                                             <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                                {client.name}
                                             </TableCell>
                                             <TableCell className="font-mono text-xs text-slate-500">{client.ruc}</TableCell>
                                             <TableCell className="text-slate-600 dark:text-slate-300">{client.contact_person || "---"}</TableCell>
                                             <TableCell className="text-slate-500 text-xs">{client.email || "---"}</TableCell>
                                             <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                   <Button 
                                                      size="sm" 
                                                      variant="ghost" 
                                                      onClick={() => setFollowUpClient(client)}
                                                      className="h-8 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/20"
                                                   >
                                                      <MessageSquare className="h-4 w-4 mr-2" />
                                                      Seguimiento
                                                   </Button>
                                                   
                                                   <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                         </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                         <DropdownMenuItem onClick={() => handleGenerateLetter(client)}>
                                                            <FileText className="h-4 w-4 mr-2" />
                                                            Generar Carta
                                                         </DropdownMenuItem>
                                                         <DropdownMenuItem onClick={() => {
                                                            setEditingClient(client)
                                                            setShowCreateForm(true)
                                                         }}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Editar
                                                         </DropdownMenuItem>
                                                         <DropdownMenuItem 
                                                            onClick={() => setDeletingClient(client)}
                                                            className="text-red-600 focus:text-red-600"
                                                         >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Eliminar
                                                         </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                   </DropdownMenu>
                                                </div>
                                             </TableCell>
                                          </TableRow>
                                       ))}
                                    </TableBody>
                                 </Table>
                              </div>
                           )
                        )}
                      </motion.div>
                    )
                  })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
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
          <AlertDialogOverlay className="backdrop-blur-sm bg-black/40" />
          <AlertDialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-slate-200 dark:border-slate-700 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-slate-50">Eliminar Cliente</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                ¿Estás seguro de que deseas eliminar a {deletingClient?.name}? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClient} className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* Letter Number Input Dialog */}
      <Dialog open={showLetterNumberDialog} onOpenChange={setShowLetterNumberDialog}>
        <DialogContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-slate-200 dark:border-slate-700 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-50">Número de Carta</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Ingresa el número de carta para {clientForLetter?.name}. Este número se guardará y se usará para futuras impresiones.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="letter-number" className="text-slate-900 dark:text-slate-50">Número</Label>
            <Input
              id="letter-number"
              value={letterNumberInput}
              onChange={(e) => setLetterNumberInput(e.target.value)}
              placeholder="Ej: NºARM-001-2024"
              className="mt-2 bg-white/50 dark:bg-slate-900/50"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLetterNumberDialog(false)} className="bg-transparent border-slate-200 dark:border-slate-700">
              Cancelar
            </Button>
            <Button onClick={handleLetterNumberSubmit} disabled={isGeneratingLetter} className="bg-slate-900 dark:bg-slate-50 dark:text-slate-900">
              {isGeneratingLetter ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : "Guardar y Generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
