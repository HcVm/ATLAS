"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface Product {
  id: string
  name: string
  cost_price: number | null
}

interface Serial {
  id: string
  serial_number: string
}

interface QuickSerialMovementDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  type: "salida" | "baja"
  product: Product | null
  serial: Serial | null
  companyId: string
  onSuccess: () => void
}

export function QuickSerialMovementDialog({
  isOpen,
  onOpenChange,
  type,
  product,
  serial,
  companyId,
  onSuccess,
}: QuickSerialMovementDialogProps) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")
  const [requestedBy, setRequestedBy] = useState(type === "baja" ? "Franco Quintos" : "")
  const [department, setDepartment] = useState("")
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (isOpen && companyId) {
      fetchDepartments()
      if (type === "baja") {
        setRequestedBy("Franco Quintos")
      }
    }
  }, [isOpen, companyId, type])

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").eq("company_id", companyId)
    setDepartments(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !serial) return

    setLoading(true)
    try {
      const movementData = {
        product_id: product.id,
        serial_id: serial.id,
        movement_type: type,
        quantity: 1,
        cost_price: product.cost_price || 0,
        total_amount: product.cost_price || 0,
        reason: reason,
        requested_by: requestedBy,
        department_requesting: type === "salida" ? department : "Almacén",
        movement_date: new Date().toISOString().split("T")[0],
        company_id: companyId,
        notes: `Movimiento rápido de ${type === "salida" ? "asignación" : "baja"} para serie ${serial.serial_number}`,
      }

      const { error } = await supabase.from("internal_inventory_movements").insert(movementData)

      if (error) throw error

      toast.success(`Serie ${type === "salida" ? "asignada" : "dada de baja"} correctamente`)
      onOpenChange(false)
      onSuccess()
      setReason("")
      if (type === "salida") {
        setRequestedBy("")
        setDepartment("")
      }
    } catch (error) {
      console.error("Error registering movement:", error)
      toast.error("Error al registrar el movimiento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{type === "salida" ? "Asignar Serie" : "Dar de Baja Serie"}</DialogTitle>
          <DialogDescription>
            Serie: <span className="font-mono font-bold text-foreground">{serial?.serial_number}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Textarea
              id="reason"
              placeholder="Ej: Entrega a personal, Producto dañado, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {type === "salida" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="requestedBy">Solicitado Por</Label>
                <Input
                  id="requestedBy"
                  placeholder="Nombre de la persona"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento Solicitante</Label>
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {type === "baja" && (
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <p>
                <span className="font-medium">Solicitado por:</span> Franco Quintos
              </p>
              <p>
                <span className="font-medium">Departamento:</span> Almacén
              </p>
              <p>
                <span className="font-medium">Fecha:</span> {new Date().toLocaleDateString("es-PE")}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Procesando..." : type === "salida" ? "Confirmar Asignación" : "Confirmar Baja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
