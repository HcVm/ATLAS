"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link, Unlink, Search } from "lucide-react"

export interface LinkedDocument {
  id: string
  document_id: string
  document: {
    id: string
    title: string
    document_number: string
    status: string
  }
}

interface DeliveryDocumentsLinkProps {
  deliveryId: string
  linkedDocuments: LinkedDocument[]
  /** Actualiza tanto el estado local del diálogo como el padre (Kanban) */
  onDocumentsChange: (documents: LinkedDocument[]) => void
  canEdit?: boolean
}

export function DeliveryDocumentsLink({
  deliveryId,
  linkedDocuments,
  onDocumentsChange,
  canEdit = true,
}: DeliveryDocumentsLinkProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [localLinked, setLocalLinked] = useState<LinkedDocument[]>(linkedDocuments)

  // Sincroniza con el prop del Kanban
  useEffect(() => {
    setLocalLinked(linkedDocuments)
  }, [linkedDocuments])

  // Cargar los documentos ya vinculados cuando se abre el diálogo
  const loadLinked = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_documents")
        .select(`
          id,
          document_id,
          document:document_id (id, title, document_number, status)
        `)
        .eq("delivery_id", deliveryId)

      if (error) throw error
      setLocalLinked(data ?? [])
      onDocumentsChange(data ?? [])
    } catch (e: any) {
      console.error("[DeliveryDocumentsLink] load error:", e.message)
    }
  }, [deliveryId, onDocumentsChange])

  useEffect(() => {
    if (open) loadLinked()
  }, [open, loadLinked])

  const searchDocuments = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setAvailableDocuments([])
        return
      }
      setSearching(true)
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("id, title, document_number, status")
          .or(`title.ilike.%${q}%,document_number.ilike.%${q}%`)
          .limit(10)

        if (error) throw error

        const linkedIds = localLinked.map((d) => d.document_id)
        setAvailableDocuments(data.filter((d) => !linkedIds.includes(d.id)))
      } catch (e: any) {
        toast.error("Error al buscar: " + e.message)
      } finally {
        setSearching(false)
      }
    },
    [localLinked],
  )

  const handleLink = useCallback(
    async (docId: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("No authenticated user")

        const { data: link, error } = await supabase
          .from("delivery_documents")
          .insert({
            delivery_id: deliveryId,
            document_id: docId,
            linked_by: user.id,
          })
          .select(`
            id,
            document_id,
            document:document_id (id, title, document_number, status)
          `)
          .single()

        if (error) throw error

        const updated = [...localLinked, link]
        setLocalLinked(updated)
        onDocumentsChange(updated)
        setSearchQuery("")
        setAvailableDocuments([])
        toast.success("Documento vinculado")
      } catch (e: any) {
        toast.error("Error al vincular: " + e.message)
      }
    },
    [deliveryId, localLinked, onDocumentsChange],
  )

  const handleUnlink = useCallback(
    async (linkId: string) => {
      try {
        const { error } = await supabase.from("delivery_documents").delete().eq("id", linkId)
        if (error) throw error

        const updated = localLinked.filter((d) => d.id !== linkId)
        setLocalLinked(updated)
        onDocumentsChange(updated)
        toast.success("Documento desvinculado")
      } catch (e: any) {
        toast.error("Error al desvincular: " + e.message)
      }
    },
    [localLinked, onDocumentsChange],
  )

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Documentos Relacionados</h3>
        <Badge variant="secondary">{localLinked.length}</Badge>
      </div>

      {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              <Link className="h-4 w-4 mr-2" />
              Vincular Documento
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Buscar y Vincular Documento</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Título o número..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchDocuments(e.target.value)
                  }}
                  disabled={searching}
                />
                <Button size="icon" variant="outline" disabled={searching || !searchQuery.trim()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searching && <p className="text-sm text-muted-foreground text-center">Buscando…</p>}

              {!searching && searchQuery.trim() && availableDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">Sin resultados</p>
              )}

              <ScrollArea className="h-64 w-full border rounded-lg p-2">
                <div className="space-y-2">
                  {availableDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.document_number}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleLink(doc.id)} className="flex-shrink-0">
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-2 max-w-xl">
        {localLinked.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay documentos relacionados
          </p>
        ) : (
          localLinked.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-medium truncate">{link.document.title}</p>
                <p className="text-xs text-muted-foreground truncate">{link.document.document_number}</p>
              </div>

              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlink(link.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive flex-shrink-0"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}