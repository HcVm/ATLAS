"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, MessageSquare } from "lucide-react"

interface ClientFollowUp {
  id: string
  status: string
  notes: string | null
  created_at: string
  created_by?: string
}

interface ClientFollowUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  companyId: string | undefined
  onSuccess: () => void
}

const followUpSchema = z.object({
  status: z.enum(["por_contactar", "contactado", "negociando", "inactivo", "descartado"], {
    required_error: "Debe seleccionar un estado",
  }),
  notes: z.string().min(1, "Las notas son requeridas").max(1000, "Las notas no pueden exceder 1000 caracteres"),
})

export function ClientFollowUpDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  companyId,
  onSuccess,
}: ClientFollowUpDialogProps) {
  const [followUps, setFollowUps] = useState<ClientFollowUp[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const form = useForm<z.infer<typeof followUpSchema>>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      status: "por_contactar",
      notes: "",
    },
  })

  useEffect(() => {
    if (open && clientId) {
      fetchFollowUpHistory()
    }
  }, [open, clientId])

  const fetchFollowUpHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from("client_follow_ups")
        .select("id, status, notes, created_at, created_by")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setFollowUps(data || [])
    } catch (error: any) {
      toast.error("Error al cargar el historial: " + error.message)
    } finally {
      setLoadingHistory(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "por_contactar":
        return "Por Contactar"
      case "contactado":
        return "Contactado"
      case "negociando":
        return "Negociando"
      case "inactivo":
        return "Inactivo"
      case "descartado":
        return "Descartado"
      default:
        return "No definido"
    }
  }

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case "por_contactar":
        return "secondary"
      case "contactado":
        return "default"
      case "negociando":
        return "outline"
      case "inactivo":
        return "secondary"
      case "descartado":
        return "destructive"
      default:
        return "outline"
    }
  }

  const onSubmit = async (values: z.infer<typeof followUpSchema>) => {
    if (!companyId) {
      toast.error("Empresa no identificada")
      return
    }

    try {
      const { error } = await supabase.from("client_follow_ups").insert([
        {
          client_id: clientId,
          company_id: companyId,
          status: values.status,
          notes: values.notes,
        },
      ])

      if (error) throw error
      toast.success("Seguimiento registrado exitosamente")
      form.reset()
      await fetchFollowUpHistory()
      onSuccess()
    } catch (error: any) {
      toast.error("Error al registrar seguimiento: " + error.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50">
        <DialogHeader>
          <DialogTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Seguimiento - {clientName}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-300">
            Registra y visualiza el historial de seguimiento del cliente
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Formulario de nuevo seguimiento */}
          <div className="flex flex-col border-r border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 px-4 pt-4">Nuevo Seguimiento</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4 flex-1">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-200">Estado *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="por_contactar">Por Contactar</SelectItem>
                          <SelectItem value="contactado">Contactado</SelectItem>
                          <SelectItem value="negociando">Negociando</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
                          <SelectItem value="descartado">Descartado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-200">Notas *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el resultado del contacto, observaciones, etc..."
                          className="border-slate-200 dark:border-slate-700 resize-none min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {field.value.length}/1000 caracteres
                      </p>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Seguimiento
                </Button>
              </form>
            </Form>
          </div>

          {/* Historial de seguimientos */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 px-4 pt-4">Historial</h3>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : followUps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <p className="text-sm">No hay seguimientos registrados aún</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-3 px-4 pb-4">
                  {followUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-700/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={getStatusVariant(followUp.status)}>{getStatusLabel(followUp.status)}</Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(followUp.created_at).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {followUp.notes && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{followUp.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
