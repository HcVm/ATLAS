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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-2xl p-0">
        <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            Seguimiento - {clientName}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Registra y visualiza el historial de seguimiento del cliente
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 min-h-0 overflow-hidden">
          {/* Formulario de nuevo seguimiento */}
          <div className="flex flex-col border-r border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 px-6 pt-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Nuevo Seguimiento
            </h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 pb-6 flex-1 overflow-y-auto">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">Estado *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-10 focus:ring-2 focus:ring-indigo-500/20 rounded-lg">
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
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">Notas *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el resultado del contacto, observaciones, etc..."
                          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none min-h-[120px] focus:ring-2 focus:ring-indigo-500/20 rounded-lg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                        {field.value.length}/1000
                      </p>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting} 
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 rounded-lg shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02]"
                >
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Seguimiento
                </Button>
              </form>
            </Form>
          </div>

          {/* Historial de seguimientos */}
          <div className="flex flex-col bg-slate-50/30 dark:bg-slate-800/30">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 px-6 pt-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Historial
            </h3>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8 flex-1">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : followUps.length === 0 ? (
              <div className="text-center py-12 px-6 text-slate-500 dark:text-slate-400 flex-1 flex flex-col items-center justify-center">
                <MessageSquare className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="font-medium">No hay historial</p>
                <p className="text-xs mt-1 max-w-[200px]">Los seguimientos registrados aparecerán aquí</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-4 px-6 pb-6">
                  {followUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={getStatusVariant(followUp.status)} className="rounded-md capitalize shadow-none">
                          {getStatusLabel(followUp.status)}
                        </Badge>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-full">
                          {new Date(followUp.created_at).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {followUp.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1 border-l-2 border-slate-100 dark:border-slate-700">
                          {followUp.notes}
                        </p>
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
