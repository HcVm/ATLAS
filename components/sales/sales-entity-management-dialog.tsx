"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit } from "lucide-react"
import { EditSalesEntityDialog } from "./edit-sales-entity-dialog"
import { Badge } from "@/components/ui/badge"

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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
        <DialogHeader>
          <DialogTitle className="text-slate-800 dark:text-slate-100">Gestionar Entidades de Venta</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">
            Busca y edita la información de tus clientes (entidades de venta).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar entidad por nombre, RUC, unidad ejecutora, dirección, email o contacto..."
              value={entitySearchTerm}
              onChange={(e) => setEntitySearchTerm(e.target.value)}
              className="pl-8 border-slate-200 dark:border-slate-700 focus:border-slate-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
            <p className="text-sm text-slate-600 mt-2">Cargando entidades...</p>
          </div>
        ) : filteredSalesEntities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-500 dark:text-slate-400">
              {entitySearchTerm ? "No se encontraron entidades que coincidan" : "No hay entidades registradas"}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                  <TableHead className="text-slate-700 dark:text-slate-200">Nombre</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200">RUC</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200">Tipo</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200">Unidad Ejecutora</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200">Dirección Fiscal</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200">Email</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200">Contacto</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-200 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalesEntities.map((entity) => (
                  <TableRow
                    key={entity.id}
                    className="hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-slate-100/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50"
                  >
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">{entity.name}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">{entity.ruc}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      <Badge variant={getClientTypeBadgeVariant(entity.client_type)}>
                        {getClientTypeLabel(entity.client_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {entity.executing_unit || "N/A"}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {entity.fiscal_address || "N/A"}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">{entity.email || "N/A"}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      {entity.contact_person || "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSalesEntity(entity)}
                        disabled={!canEdit}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

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
