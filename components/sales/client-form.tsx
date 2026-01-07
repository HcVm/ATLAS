"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

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

interface ClientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity?: SalesEntity | null
  companyId: string | undefined
  onSuccess: () => void
}

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  ruc: z.string().min(1, "El RUC es requerido").max(11, "El RUC no puede tener más de 11 caracteres"),
  executing_unit: z.string().nullable().optional(),
  fiscal_address: z.string().nullable().optional(),
  email: z.string().email("Formato de email inválido").nullable().or(z.literal("")).optional(),
  contact_person: z.string().nullable().optional(),
  client_type: z.enum(["private", "government"], {
    required_error: "Debe seleccionar un tipo de cliente",
  }),
})

export function ClientForm({ open, onOpenChange, entity, companyId, onSuccess }: ClientFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      ruc: "",
      executing_unit: null,
      fiscal_address: null,
      email: null,
      contact_person: null,
      client_type: "private",
    },
  })

  const isEditing = !!entity

  useEffect(() => {
    if (entity) {
      form.reset({
        name: entity.name,
        ruc: entity.ruc,
        executing_unit: entity.executing_unit,
        fiscal_address: entity.fiscal_address,
        email: entity.email,
        contact_person: entity.contact_person,
        client_type: entity.client_type || "private",
      })
    } else {
      form.reset({
        name: "",
        ruc: "",
        executing_unit: null,
        fiscal_address: null,
        email: null,
        contact_person: null,
        client_type: "private",
      })
    }
  }, [entity, open, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!companyId) {
      toast.error("Empresa no identificada")
      return
    }

    try {
      if (isEditing && entity) {
        const { error } = await supabase
          .from("sales_entities")
          .update({
            name: values.name,
            ruc: values.ruc,
            executing_unit: values.executing_unit || null,
            fiscal_address: values.fiscal_address || null,
            email: values.email || null,
            contact_person: values.contact_person || null,
            client_type: values.client_type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entity.id)

        if (error) throw error
        toast.success("Cliente actualizado exitosamente")
      } else {
        const { error } = await supabase.from("sales_entities").insert([
          {
            name: values.name,
            ruc: values.ruc,
            executing_unit: values.executing_unit || null,
            fiscal_address: values.fiscal_address || null,
            email: values.email || null,
            contact_person: values.contact_person || null,
            client_type: values.client_type,
            company_id: companyId,
          },
        ])

        if (error) throw error
        toast.success("Cliente creado exitosamente")
      }

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error.message || "Error al guardar el cliente")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
        <DialogHeader>
          <DialogTitle className="text-slate-800 dark:text-slate-100">
            {isEditing ? "Editar Cliente" : "Crear Nuevo Cliente"}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">
            {isEditing ? "Actualiza la información del cliente" : "Registra un nuevo cliente (entidad) en el sistema"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-200">Nombre de la Entidad *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre completo de la entidad"
                      className="border-slate-200 dark:border-slate-700"
                      {...field}
                    />
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
                  <FormLabel className="text-slate-700 dark:text-slate-200">RUC *</FormLabel>
                  <FormControl>
                    <Input placeholder="20123456789" className="border-slate-200 dark:border-slate-700" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-200">Tipo de Cliente *</FormLabel>
                  <Select value={field.value || "private"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="private">Privado</SelectItem>
                      <SelectItem value="government">Gubernamental</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="executing_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-200">Unidad Ejecutora (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: 001, 002, etc."
                      className="border-slate-200 dark:border-slate-700"
                      {...field}
                      value={field.value || ""}
                    />
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
                  <FormLabel className="text-slate-700 dark:text-slate-200">Dirección Fiscal (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Dirección fiscal de la entidad"
                      className="border-slate-200 dark:border-slate-700"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-200">Correo Electrónico (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="correo@ejemplo.com"
                      type="email"
                      className="border-slate-200 dark:border-slate-700"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 dark:text-slate-200">Persona de Contacto (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre de la persona de contacto"
                      className="border-slate-200 dark:border-slate-700"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700"
              >
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar" : "Crear"} Cliente
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
