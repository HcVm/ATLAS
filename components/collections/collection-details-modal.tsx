"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Clock, Plus } from "lucide-react"
import { DeliveryAttachments } from "@/components/deliveries/delivery-attachments"
import { DeliveryDocumentsLink } from "@/components/deliveries/delivery-documents-link"
import { CollectionNoteForm } from "./collection-note-form"

interface CollectionData {
  id: string
  delivery_id: string
  sale_id: string
  collection_status: string
  days_in_current_status: number
  status_start_date: string
  created_at: string
  sales: {
    id: string
    sale_number: string
    entity_name: string
    entity_ruc: string
    total_sale: number
    sale_status: string
    created_at: string
    company_id: string
  }
  deliveries: {
    id: string
    delivery_status: string
    actual_delivery_date: string
  }
}

interface CollectionNote {
  id: string
  action_taken: string
  attended_by: string // Now storing text instead of UUID
  instructions_given: string
  next_steps: string
  collection_sale_status: string
  notes: string | null
  created_at: string
}

interface DeliveryAttachment {
  id: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  created_at: string
}

interface LinkedDocument {
  id: string
  document_id: string
  document: {
    id: string
    title: string
    document_number: string
    status: string
  }
}

interface CollectionDetailsModalProps {
  collection: CollectionData
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function CollectionDetailsModal({ collection, open, onOpenChange, onRefresh }: CollectionDetailsModalProps) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<CollectionNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newStatus, setNewStatus] = useState(collection.collection_status)
  const [attachments, setAttachments] = useState<DeliveryAttachment[]>([])
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([])
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [currentSaleStatus, setCurrentSaleStatus] = useState(collection.sales?.sale_status)

  useEffect(() => {
    if (open) {
      fetchCollectionNotes()
      fetchAttachments()
      fetchLinkedDocuments()
    }
  }, [open])

  const fetchCollectionNotes = async () => {
    try {
      setLoadingNotes(true)
      const { data, error } = await supabase
        .from("collection_notes")
        .select(
          `
          id,
          action_taken,
          attended_by,
          instructions_given,
          next_steps,
          collection_sale_status,
          notes,
          created_at
        `,
        )
        .eq("sale_id", collection.sale_id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error: any) {
      console.error("Error fetching notes:", error)
      toast.error("Error al cargar notas")
    } finally {
      setLoadingNotes(false)
    }
  }

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_attachments")
        .select("*")
        .eq("delivery_id", collection.delivery_id)

      if (error) throw error
      setAttachments(data || [])
    } catch (error: any) {
      console.error("Error fetching attachments:", error)
    }
  }

  const fetchLinkedDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_documents")
        .select(
          `
          id,
          document_id,
          documents (id, title, document_number, status)
        `,
        )
        .eq("delivery_id", collection.delivery_id)

      if (error) throw error
      setLinkedDocuments(data || [])
    } catch (error: any) {
      console.error("Error fetching linked documents:", error)
    }
  }

  const handleStatusUpdate = async (newSt: string) => {
    try {
      if (newSt === "verde" && collection.sales?.company_id && isValidUUID(collection.sales.company_id)) {
        try {
          // Get users from sales, secretaría, administración, and gerencia logística departments
          const { data: departmentUsers } = await supabase
            .from("profiles")
            .select(`
              id,
              email,
              full_name,
              department:current_department_id(name)
            `)
            .eq("company_id", collection.sales.company_id)
            .in("current_department_id.name", ["Ventas", "Secretaría", "Administración", "Gerencia Logística"]);

          if (departmentUsers && departmentUsers.length > 0) {
            const today = new Date()
            const fiveDaysLater = new Date(today)
            fiveDaysLater.setDate(fiveDaysLater.getDate() + 5)
            const tenDaysLater = new Date(today)
            tenDaysLater.setDate(tenDaysLater.getDate() + 10)

            // Create events for each user
            const calendarEvents = []
            for (const user of departmentUsers) {
              // 5 days event
              calendarEvents.push({
                user_id: user.id,
                company_id: collection.sales.company_id,
                title: `Seguimiento Cobranza - Venta #${collection.sales?.sale_number}`,
                description: `Revisar estado de cobranza para ${collection.sales?.entity_name}. Total: S/ ${collection.sales?.total_sale}`,
                event_date: fiveDaysLater.toISOString().split("T")[0],
                importance: "medium",
                category: "cobranza",
              })
              // 10 days event
              calendarEvents.push({
                user_id: user.id,
                company_id: collection.sales.company_id,
                title: `Seguimiento Cobranza - Venta #${collection.sales?.sale_number}`,
                description: `Revisar notas y estado de cobranza para ${collection.sales?.entity_name}. Total: S/ ${collection.sales?.total_sale}`,
                event_date: tenDaysLater.toISOString().split("T")[0],
                importance: "high",
                category: "cobranza",
              })
            }

            // Insert calendar events
            if (calendarEvents.length > 0) {
              await supabase.from("calendar_events").insert(calendarEvents)
            }
          }
        } catch (calendarError) {
          console.warn("Error creating calendar events:", calendarError)
          // Continue with status update even if calendar fails
        }
      } else if (newSt === "verde") {
        console.error("Company ID is invalid or undefined, skipping calendar event creation");
      }

      const { error } = await supabase
        .from("collection_tracking")
        .update({
          collection_status: newSt,
          days_in_current_status: 0,
          status_start_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", collection.id)

      if (error) throw error
      toast.success("Estado actualizado")
      onRefresh()
      onOpenChange(false)
    } catch (error: any) {
      toast.error("Error al actualizar: " + error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-gray-100 text-gray-800 border-gray-300"
      case "verde":
        return "bg-green-100 text-green-800 border-green-300"
      case "amarillo":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "rojo":
        return "bg-red-100 text-red-800 border-red-300"
      case "pagado":
        return "bg-blue-100 text-blue-800 border-blue-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Cobranza</DialogTitle>
          <DialogDescription>
            Venta #{collection.sales?.sale_number} - {collection.sales?.entity_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="informacion" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="informacion">Información</TabsTrigger>
            <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="archivos">Archivos</TabsTrigger>
          </TabsList>

          <TabsContent value="informacion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Datos Generales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                    <p className="text-lg font-semibold">{collection.sales?.entity_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">RUC</p>
                    <p className="text-lg font-semibold">{collection.sales?.entity_ruc}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monto</p>
                    <p className="text-lg font-semibold">
                      S/ {(collection.sales?.total_sale || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Venta</p>
                    <p className="text-lg font-semibold">
                      {collection.sales?.created_at ? format(new Date(collection.sales.created_at), "dd/MM/yyyy", { locale: es }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado de Cobranza</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Semáforo de Estado</p>
                  <Badge className={`text-base py-2 px-3 ${getStatusColor(collection.collection_status)}`}>
                    {collection.collection_status.toUpperCase()} ({collection.days_in_current_status} días)
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Cambiar Estado</p>
                  <div className="flex gap-2 flex-wrap">
                    {["pendiente", "verde", "amarillo", "rojo", "pagado"].map((status) => (
                      <Button
                        key={status}
                        variant={newStatus === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleStatusUpdate(status)}
                        className={newStatus === status ? getStatusColor(status) : ""}
                      >
                        {status === "pendiente" ? "A ESPERA" : status.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado de Venta</p>
                  <Badge variant="outline" className="mt-1">
                    {(currentSaleStatus || collection.sales?.sale_status || "").toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguimiento" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowNoteForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Nota
              </Button>
            </div>

            {showNoteForm && (
              <CollectionNoteForm
                collectionId={collection.id}
                saleId={collection.sale_id}
                onSuccess={() => {
                  setShowNoteForm(false)
                  fetchCollectionNotes()
                }}
                onCancel={() => setShowNoteForm(false)}
              />
            )}

            {loadingNotes ? (
              <div className="text-center py-4">Cargando...</div>
            ) : notes.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No hay notas de seguimiento</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-96 space-y-3 p-4 border rounded-lg">
                {notes.map((note) => (
                  <Card key={note.id} className="mb-3">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{note.action_taken}</CardTitle>
                          <CardDescription>
                            {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{note.collection_sale_status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium">Atendido por: {note.attended_by}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Se indicó:</p>
                        <p className="text-sm">{note.instructions_given}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Próximos pasos:</p>
                        <p className="text-sm">{note.next_steps}</p>
                      </div>
                      {note.notes && (
                        <div>
                          <p className="font-medium text-muted-foreground">Observaciones:</p>
                          <p className="text-sm">{note.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="documentos">
            <DeliveryDocumentsLink
              deliveryId={collection.delivery_id}
              linkedDocuments={linkedDocuments}
              onDocumentsChange={setLinkedDocuments}
              canEdit={user?.role === "admin" || user?.role === "supervisor"}
              companyId={collection.sales?.company_id}
            />
          </TabsContent>

          <TabsContent value="archivos">
            <DeliveryAttachments
              deliveryId={collection.delivery_id}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              canEdit={user?.role === "admin" || user?.role === "supervisor"}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}