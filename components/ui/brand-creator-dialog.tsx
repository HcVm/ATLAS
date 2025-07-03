"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Save, Loader2, Palette } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

interface Brand {
  id: string
  name: string
  color: string
  description?: string
  isExternal?: boolean
}

interface BrandCreatorDialogProps {
  onBrandCreated: (brand: Brand) => void
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

export function BrandCreatorDialog({ onBrandCreated, trigger }: BrandCreatorDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6b7280",
    isExternal: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("El nombre de la marca es obligatorio")
      return
    }

    try {
      setSaving(true)

      const brandData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        company_id: formData.isExternal ? null : user?.company_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("brands").insert(brandData).select().single()

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya existe una marca con ese nombre")
          return
        }
        throw error
      }

      const newBrand: Brand = {
        id: data.id,
        name: data.name,
        color: data.color,
        description: data.description,
        isExternal: data.company_id === null,
      }

      onBrandCreated(newBrand)
      toast.success(`Marca ${formData.isExternal ? "externa" : "de empresa"} creada correctamente`)

      // Reset form
      setFormData({
        name: "",
        description: "",
        color: "#6b7280",
        isExternal: false,
      })
      setOpen(false)
    } catch (error) {
      console.error("Error creating brand:", error)
      toast.error("Error al crear la marca")
    } finally {
      setSaving(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="w-full bg-transparent">
      <Plus className="h-4 w-4 mr-2" />
      Crear nueva marca
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Crear Nueva Marca
          </DialogTitle>
          <DialogDescription>
            Crea una nueva marca para usar en tus productos. Puede ser una marca de tu empresa o una marca externa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Nombre de la marca *</Label>
            <Input
              id="brand-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Nike, Apple, Mi Marca..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-description">Descripción (opcional)</Label>
            <Textarea
              id="brand-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Breve descripción de la marca..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Color de la marca</Label>
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

          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
            <Switch
              id="is-external"
              checked={formData.isExternal}
              onCheckedChange={(checked) => setFormData({ ...formData, isExternal: checked })}
            />
            <div className="flex-1">
              <Label htmlFor="is-external" className="font-medium">
                Marca externa
              </Label>
              <p className="text-sm text-muted-foreground">
                {formData.isExternal
                  ? "Esta marca estará disponible para todas las empresas"
                  : "Esta marca solo estará disponible para tu empresa"}
              </p>
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
                  Crear Marca
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
