"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Save, Loader2, Tag } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Category {
  id: string
  name: string
  color: string
  description?: string | null
}

interface InternalCategoryCreatorDialogProps {
  companyId: string
  onCategoryCreated: (category: Category) => void
  trigger?: React.ReactNode
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
  "#000000", // black
]

export function InternalCategoryCreatorDialog({
  companyId,
  onCategoryCreated,
  trigger,
}: InternalCategoryCreatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6b7280",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("El nombre de la categoría es obligatorio")
      return
    }

    try {
      setSaving(true)

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("internal_product_categories").insert(categoryData).select().single()

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya existe una categoría con ese nombre")
          return
        }
        throw error
      }

      const newCategory: Category = {
        id: data.id,
        name: data.name,
        color: data.color,
        description: data.description,
      }

      onCategoryCreated(newCategory)
      toast.success("Categoría creada correctamente")

      // Reset form
      setFormData({
        name: "",
        description: "",
        color: "#6b7280",
      })
      setOpen(false)
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Error al crear la categoría")
    } finally {
      setSaving(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="w-full bg-transparent">
      <Plus className="h-4 w-4 mr-2" />
      Crear nueva categoría
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Crear Nueva Categoría
          </DialogTitle>
          <DialogDescription>Crea una nueva categoría para organizar tus productos internos.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nombre de la categoría *</Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Tecnología, Mobiliario, Herramientas..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">Descripción (opcional)</Label>
            <Textarea
              id="category-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Breve descripción de la categoría..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Color de la categoría</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-8 p-1 border rounded"
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Crear Categoría
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
