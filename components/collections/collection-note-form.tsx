"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface CollectionNoteFormProps {
  collectionId: string
  saleId: string
  onSuccess: () => void
  onCancel: () => void
}

export function CollectionNoteForm({ collectionId, saleId, onSuccess, onCancel }: CollectionNoteFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    attended_by: "", // Changed from auto-filled user ID to empty manual field
    action_taken: "",
    instructions_given: "",
    next_steps: "",
    collection_sale_status: "comprometido",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.attended_by.trim() ||
      !formData.action_taken.trim() ||
      !formData.instructions_given.trim() ||
      !formData.next_steps.trim()
    ) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.from("collection_notes").insert({
        collection_tracking_id: collectionId,
        sale_id: saleId,
        attended_by: formData.attended_by, // Now storing the contact person name as text
        action_taken: formData.action_taken,
        instructions_given: formData.instructions_given,
        next_steps: formData.next_steps,
        collection_sale_status: formData.collection_sale_status,
        notes: formData.notes || null,
      })

      if (error) throw error
      toast.success("Nota de seguimiento registrada")
      onSuccess()
    } catch (error: any) {
      toast.error("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Nota de Seguimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="attended_by">¿Quién le atendió? (De parte del cliente) *</Label>
            <Input
              id="attended_by"
              placeholder="Ej: Juan García, Responsable de Compras"
              value={formData.attended_by}
              onChange={(e) => setFormData({ ...formData, attended_by: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="action_taken">Acción Realizada *</Label>
            <Input
              id="action_taken"
              placeholder="Ej: Llamada telefónica al cliente"
              value={formData.action_taken}
              onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="instructions_given">¿Qué se le indicó? *</Label>
            <Textarea
              id="instructions_given"
              placeholder="Detalla las instrucciones dadas al cliente..."
              value={formData.instructions_given}
              onChange={(e) => setFormData({ ...formData, instructions_given: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="next_steps">Próximos Pasos *</Label>
            <Textarea
              id="next_steps"
              placeholder="Indica los pasos a seguir en la próxima iteración..."
              value={formData.next_steps}
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="status">Estado de Venta</Label>
            <Select
              value={formData.collection_sale_status}
              onValueChange={(value) => setFormData({ ...formData, collection_sale_status: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comprometido">Comprometido</SelectItem>
                <SelectItem value="devengado">Devengado</SelectItem>
                <SelectItem value="girado">Girado</SelectItem>
                <SelectItem value="firmado">Firmado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observaciones (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Nota
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
