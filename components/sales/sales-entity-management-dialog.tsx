"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Building2, User, Mail, MapPin, Hash, Briefcase, Plus } from "lucide-react"
import { EditSalesEntityDialog } from "./edit-sales-entity-dialog"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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

interface SalesEntityManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string | undefined
  canEdit: boolean
}

export function SalesEntityManagementDialog({
  open,
  onOpenChange,
  companyId,
  canEdit,
}: SalesEntityManagementDialogProps) {
  const [salesEntities, setSalesEntities] = useState<SalesEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [entitySearchTerm, setEntitySearchTerm] = useState("")
  const [editingSalesEntity, setEditingSalesEntity] = useState<SalesEntity | null>(null)
  const [showEditSalesEntityDialog, setShowEditSalesEntityDialog] = useState(false)

  useEffect(() => {
    if (open && companyId) {
      fetchSalesEntities(companyId)
    }
  }, [open, companyId])

  const fetchSalesEntities = async (companyId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("sales_entities")
        .select("id, name, ruc, executing_unit, fiscal_address, email, contact_person, client_type")
        .eq("company_id", companyId)
        .order("name")

      if (error) throw error
      setSalesEntities(data || [])
    } catch (error: any) {
      console.error("Error fetching sales entities:", error)
      toast.error("Error al cargar las entidades de venta: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSalesEntity = (entity: SalesEntity) => {
    setEditingSalesEntity(entity)
    setShowEditSalesEntityDialog(true)
  }

  const handleSalesEntityUpdateSuccess = () => {
    setShowEditSalesEntityDialog(false)
    setEditingSalesEntity(null)
    if (companyId) {
      fetchSalesEntities(companyId) // Refresh the list after successful edit
    }
  }

  const getClientTypeLabel = (clientType: "private" | "government" | null) => {
    switch (clientType) {
      case "private":
        return "Privado"
      case "government":
        return "Gubernamental"
      default:
        return "No definido"
    }
  }

  const getClientTypeBadgeVariant = (clientType: "private" | "government" | null) => {
    switch (clientType) {
      case "private":
        return "secondary"
      case "government":
        return "default"
      default:
        return "outline"
    }
  }

  const filteredSalesEntities = salesEntities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
      entity.ruc.includes(entitySearchTerm) ||
      (entity.executing_unit && entity.executing_unit.toLowerCase().includes(entitySearchTerm.toLowerCase())) ||
      (entity.fiscal_address && entity.fiscal_address.toLowerCase().includes(entitySearchTerm.toLowerCase())) ||
      (entity.email && entity.email.toLowerCase().includes(entitySearchTerm.toLowerCase())) ||
      (entity.contact_person && entity.contact_person.toLowerCase().includes(entitySearchTerm.toLowerCase())),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-2xl p-0">
        <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                   <Building2 className="h-6 w-6 text-indigo-500" />
                   Gestionar Entidades de Venta
                </DialogTitle>
                <DialogDescription className="text-slate-500 mt-1">
                   Administra tu directorio de clientes y entidades
                </DialogDescription>
             </div>
             {/* Note: In a real app we might want an 'Add New' button here, but the EntitySelector handles creation too */}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
           {/* Search Bar */}
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder="Buscar por nombre, RUC, dirección, email..."
                value={entitySearchTerm}
                onChange={(e) => setEntitySearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 dark:bg-slate-800/50"
              />
           </div>

           {/* Content Area */}
           {loading ? (
             <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                   <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                         <Skeleton className="h-4 w-1/3" />
                         <Skeleton className="h-3 w-1/4" />
                      </div>
                   </div>
                ))}
             </div>
           ) : filteredSalesEntities.length === 0 ? (
             <Card className="border-none shadow-none bg-slate-50/50 dark:bg-slate-800/50 rounded-xl py-12 text-center">
                <CardContent className="flex flex-col items-center gap-4">
                   <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <Building2 className="h-8 w-8 text-slate-400" />
                   </div>
                   <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                      {entitySearchTerm ? "No se encontraron coincidencias" : "No hay entidades registradas"}
                   </h3>
                   <p className="text-slate-500 max-w-xs mx-auto">
                      {entitySearchTerm 
                         ? "Intenta con otros términos de búsqueda" 
                         : "Las entidades se crean automáticamente al registrar nuevas ventas o cotizaciones"}
                   </p>
                </CardContent>
             </Card>
           ) : (
             <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
               <Table>
                 <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                   <TableRow>
                     <TableHead className="pl-6 font-semibold text-slate-700 dark:text-slate-200">Entidad / Razón Social</TableHead>
                     <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Identificación</TableHead>
                     <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Contacto</TableHead>
                     <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Ubicación</TableHead>
                     <TableHead className="text-right pr-6 font-semibold text-slate-700 dark:text-slate-200">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   <AnimatePresence>
                      {filteredSalesEntities.map((entity, index) => (
                        <motion.tr
                          key={entity.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <TableCell className="pl-6 py-4">
                             <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{entity.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                   <Badge variant={getClientTypeBadgeVariant(entity.client_type)} className="text-[10px] px-1.5 h-5 font-normal">
                                      {getClientTypeLabel(entity.client_type)}
                                   </Badge>
                                   {entity.executing_unit && (
                                      <span className="text-xs text-slate-500 flex items-center gap-1">
                                         <Briefcase className="h-3 w-3" /> {entity.executing_unit}
                                      </span>
                                   )}
                                </div>
                             </div>
                          </TableCell>
                          <TableCell className="py-4">
                             <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-slate-400" />
                                <span className="font-mono text-sm text-slate-600 dark:text-slate-300">{entity.ruc}</span>
                             </div>
                          </TableCell>
                          <TableCell className="py-4">
                             <div className="space-y-1">
                                {entity.contact_person && (
                                   <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                      <User className="h-3.5 w-3.5 text-slate-400" />
                                      {entity.contact_person}
                                   </div>
                                )}
                                {entity.email && (
                                   <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                                      {entity.email}
                                   </div>
                                )}
                                {!entity.contact_person && !entity.email && <span className="text-xs text-slate-400 italic">No registrado</span>}
                             </div>
                          </TableCell>
                          <TableCell className="py-4">
                             {entity.fiscal_address ? (
                                <div className="flex items-start gap-2 max-w-[200px]">
                                   <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                   <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{entity.fiscal_address}</span>
                                </div>
                             ) : (
                                <span className="text-xs text-slate-400 italic">No registrada</span>
                             )}
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSalesEntity(entity)}
                              disabled={!canEdit}
                              className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                   </AnimatePresence>
                 </TableBody>
               </Table>
             </div>
           )}
        </div>

        {/* Nested EditSalesEntityDialog */}
        {editingSalesEntity && (
          <EditSalesEntityDialog
            open={showEditSalesEntityDialog}
            onOpenChange={setShowEditSalesEntityDialog}
            entity={editingSalesEntity}
            onSuccess={handleSalesEntityUpdateSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
