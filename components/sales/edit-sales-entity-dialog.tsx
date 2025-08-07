"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface SalesEntity {
  id: string
  name: string
  ruc: string
  executing_unit: string | null
  fiscal_address: string | null
}

interface EditSalesEntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: SalesEntity
  onSuccess: () => void
}

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  ruc: z.string().min(1, "El RUC es requerido").max(11, "El RUC no puede tener más de 11 caracteres"),
  executing_unit: z.string().nullable(),
  fiscal_address: z.string().nullable(),
})

export function EditSalesEntityDialog({ open, onOpenChange, entity, onSuccess }: EditSalesEntityDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: entity.name,
      ruc: entity.ruc,
      executing_unit: entity.executing_unit,
      fiscal_address: entity.fiscal_address,
    },
  })

  useEffect(() => {
    if (entity) {
      form.reset({
        name: entity.name,
        ruc: entity.ruc,
        executing_unit: entity.executing_unit,
        fiscal_address: entity.fiscal_address,
      })
    }
  }, [entity, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error } = await supabase
        .from("sales_entities")
        .update({
          name: values.name,
          ruc: values.ruc,
          executing_unit: values.executing_unit,
          fiscal_address: values.fiscal_address,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entity.id)

      if (error) throw error

      toast.success("Entidad de venta actualizada exitosamente.")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error updating sales entity:", error)
      toast.error("Error al actualizar la entidad de venta: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
        <DialogHeader>
          <DialogTitle className="text-slate-800 dark:text-slate-100">Editar Entidad de Venta</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">
            Modifica los datos de la entidad de venta seleccionada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la entidad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ruc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUC</FormLabel>
                  <FormControl>
                    <Input placeholder="RUC de la entidad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="executing_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad Ejecutora (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Unidad Ejecutora" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fiscal_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección Fiscal (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección fiscal de la entidad" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
