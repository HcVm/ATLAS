"use client"

import type React from "react"

import type { ReactElement } from "react"
import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Clock,
  UserX,
  Plus,
  Calendar,
  Wrench,
  MessageSquare,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Upload,
  X,
  CheckCircle,
  XCircle,
  FileText,
  Trash2,
} from "lucide-react"

const REQUEST_TYPES = {
  late_justification: {
    title: "Justificación de Tardanza",
    description: "Justificar llegadas tardías al trabajo",
    icon: Clock,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    gradient: "from-orange-500 to-amber-500",
    timeLimit: "24 horas",
    urgent: true,
  },
  absence_justification: {
    title: "Justificación de Ausencia",
    description: "Justificar ausencias al trabajo",
    icon: UserX,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    gradient: "from-red-500 to-rose-500",
    timeLimit: "24 horas",
    urgent: true,
  },
  overtime_request: {
    title: "Registro de Horas Extras",
    description: "Registrar horas extras trabajadas",
    icon: Plus,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    gradient: "from-blue-500 to-cyan-500",
    timeLimit: "24 horas",
    urgent: true,
  },
  permission_request: {
    title: "Solicitud de Permiso",
    description: "Solicitar permisos y vacaciones",
    icon: Calendar,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    gradient: "from-green-500 to-emerald-500",
    timeLimit: "3 días",
    urgent: false,
  },
  equipment_request: {
    title: "Solicitud de Equipos/Materiales",
    description: "Solicitar equipos o materiales para tu departamento",
    icon: Wrench,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    gradient: "from-purple-500 to-violet-500",
    timeLimit: "Sin límite",
    urgent: false,
  },
  general_request: {
    title: "Solicitud General",
    description: "Comentarios, sugerencias y solicitudes generales",
    icon: MessageSquare,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    gradient: "from-slate-500 to-gray-500",
    timeLimit: "Sin límite",
    urgent: false,
  },
}

const baseSchema = z.object({
  reason: z.string().min(10, "La razón debe tener al menos 10 caracteres"),
  attachments: z.array(z.any()).optional(),
})

const lateJustificationSchema = baseSchema.extend({
  incident_date: z.string().min(1, "La fecha del incidente es requerida"),
  incident_time: z.string().min(1, "La hora del incidente es requerida"),
})

const absenceJustificationSchema = baseSchema.extend({
  incident_date: z.string().min(1, "La fecha de ausencia es requerida"),
})

const overtimeRequestSchema = baseSchema.extend({
  incident_date: z.string().min(1, "La fecha de trabajo es requerida"),
  incident_time: z.string().min(1, "La hora de inicio es requerida"),
  end_time: z.string().min(1, "La hora de fin es requerida"),
})

const permissionRequestSchema = baseSchema.extend({
  incident_date: z.string().min(1, "La fecha de inicio es requerida"),
  end_date: z.string().optional(),
})

const equipmentRequestSchema = baseSchema.extend({
  requerimiento_numero: z.string().optional(),
  fecha_entrega_solicitada: z.string().min(1, "La fecha de entrega es requerida"),
  dirigido_a: z.string().min(1, "Campo 'Dirigido a' es requerido"),
  area_solicitante: z.string().min(1, "El área solicitante es requerida"),
  solicitante_nombre: z.string().min(1, "El solicitante es requerido"),
  motivo_requerimiento: z.string().min(10, "El motivo debe tener al menos 10 caracteres"),
  items_requeridos: z
    .array(
      z.object({
        item: z.number().min(1),
        especificaciones: z.string().min(1, "Las especificaciones son requeridas"),
        cantidad: z.number().min(1, "Debe haber al menos 1 item"),
      }),
    )
    .min(1, "Debe agregar al menos un item"),
  urgencia: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
})

const generalRequestSchema = baseSchema

function getSchemaForType(type: string) {
  switch (type) {
    case "late_justification":
      return lateJustificationSchema
    case "absence_justification":
      return absenceJustificationSchema
    case "overtime_request":
      return overtimeRequestSchema
    case "permission_request":
      return permissionRequestSchema
    case "equipment_request":
      return equipmentRequestSchema
    case "general_request":
      return generalRequestSchema
    default:
      return baseSchema
  }
}

export default function NewRequestTypePage({ params }: { params: Promise<{ type: string }> }): ReactElement {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const resolvedParams = use(params)
  const requestType = REQUEST_TYPES[resolvedParams.type as keyof typeof REQUEST_TYPES]

  const schema = getSchemaForType(resolvedParams.type)
  const Icon = requestType?.icon
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: "",
      attachments: [],
      ...(resolvedParams.type === "equipment_request" && {
        requerimiento_numero: "",
        fecha_entrega_solicitada: "",
        dirigido_a: "",
        area_solicitante: "",
        solicitante_nombre: "",
        motivo_requerimiento: "",
        items_requeridos: [{ item: 1, especificaciones: "", cantidad: 1 }],
        urgencia: "normal",
      }),
    },
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]

      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} excede el límite de 10MB`,
          variant: "destructive",
        })
        return false
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de archivo no permitido",
          description: `${file.name} no es un tipo de archivo válido`,
          variant: "destructive",
        })
        return false
      }

      return true
    })

    setUploadedFiles((prev) => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: any) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para crear solicitudes",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const attachmentUrls: string[] = []

      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileName = `${user.id}/${Date.now()}-${file.name}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("request-attachments")
            .upload(fileName, file)

          if (uploadError) {
            console.error("[v0] Error uploading file:", uploadError)
            
            if (uploadError.message?.includes("row-level security policy") || uploadError.statusCode === "403") {
              toast({
                title: "Error de permisos",
                description: "No tienes permisos para subir archivos. Contacta al administrador del sistema.",
                variant: "destructive",
              })
              setLoading(false)
              return
            } else {
              toast({
                title: "Error subiendo archivo",
                description: `No se pudo subir ${file.name}: ${uploadError.message}`,
                variant: "destructive",
              })
              continue
            }
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("request-attachments").getPublicUrl(fileName)

          attachmentUrls.push(publicUrl)
        }
      }

      const requestData = {
        user_id: user.id,
        company_id: user.company_id,
        department_id: user.department_id,
        request_type: resolvedParams.type,
        incident_date:
          resolvedParams.type === "equipment_request" ? new Date().toISOString().split("T")[0] : values.incident_date,
        end_date: values.end_date || null,
        incident_time: values.incident_time || null,
        end_time: values.end_time || null,
        reason: resolvedParams.type === "equipment_request" ? values.motivo_requerimiento : values.reason,
        ...(resolvedParams.type === "equipment_request" && {
          requerimiento_numero: values.requerimiento_numero || `REQ-${Date.now()}`,
          fecha_entrega_solicitada: values.fecha_entrega_solicitada,
          dirigido_a: values.dirigido_a,
          area_solicitante: values.area_solicitante,
          solicitante_nombre: values.solicitante_nombre,
          motivo_requerimiento: values.motivo_requerimiento,
          items_requeridos: values.items_requeridos,
          urgencia: values.urgencia,
        }),
        priority: resolvedParams.type === "equipment_request" ? values.urgencia : values.urgency || "normal",
        supporting_documents: attachmentUrls.length > 0 ? attachmentUrls : null,
      }

      const { data, error } = await supabase.from("employee_requests").insert(requestData).select().single()

      if (error) {
        console.error("[v0] Error creating request:", error)
        throw error
      }

      toast({
        title: "Solicitud creada",
        description: `Tu ${requestType?.title.toLowerCase()} ha sido enviada correctamente`,
      })

      router.push("/requests")
    } catch (error: any) {
      console.error("[v0] Error in onSubmit:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la solicitud",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isTimeSensitive = requestType?.urgent
  const timeWarning = isTimeSensitive ? `Esta solicitud debe presentarse dentro de ${requestType?.timeLimit}` : null

  if (!requestType) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tipo de solicitud no válido: "{resolvedParams.type}". Por favor, selecciona un tipo de solicitud válido.
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href="/requests/new">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Selección
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 p-6 pb-20 max-w-4xl mx-auto"
    >
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <Link href="/requests/new">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Tipos de Solicitud
          </Link>
        </Button>
        
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${requestType.bg} ${requestType.color} mt-1`}>
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              {requestType.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg mt-1">
              {requestType.description}
            </p>
          </div>
        </div>
      </div>

      {timeWarning && (
        <Alert className="border-orange-200/50 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> {timeWarning}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-lg relative overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${requestType.gradient}`} />
        
        <CardHeader>
          <CardTitle>Formulario de Solicitud</CardTitle>
          <CardDescription>
            Completa los detalles a continuación. Los campos marcados con * son obligatorios.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Type Specific Fields - BEFORE Reason */}
              <div className="grid gap-6">
                {resolvedParams.type === "late_justification" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="incident_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de la Tardanza</FormLabel>
                          <FormControl>
                            <Input type="date" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="incident_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de Llegada</FormLabel>
                          <FormControl>
                            <Input type="time" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {resolvedParams.type === "absence_justification" && (
                  <FormField
                    control={form.control}
                    name="incident_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de la Ausencia</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {resolvedParams.type === "overtime_request" && (
                  <>
                    <FormField
                      control={form.control}
                      name="incident_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha del Trabajo Extra</FormLabel>
                          <FormControl>
                            <Input type="date" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="incident_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora de Inicio</FormLabel>
                            <FormControl>
                              <Input type="time" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora de Fin</FormLabel>
                            <FormControl>
                              <Input type="time" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {resolvedParams.type === "permission_request" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="incident_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Inicio</FormLabel>
                          <FormControl>
                            <Input type="date" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Fin (opcional)</FormLabel>
                          <FormControl>
                            <Input type="date" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {resolvedParams.type === "equipment_request" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="requerimiento_numero"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Requerimiento N°</FormLabel>
                            <FormControl>
                              <Input placeholder="Auto-generado" disabled className="bg-slate-100 dark:bg-slate-800" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fecha_entrega_solicitada"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Entrega Solicitada</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dirigido_a"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirigido a</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre del responsable o área" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="area_solicitante"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Área Solicitante</FormLabel>
                            <FormControl>
                              <Input placeholder="Área que solicita" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="solicitante_nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Solicitante</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del solicitante" className="bg-white/50 dark:bg-slate-900/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="motivo_requerimiento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo de Requerimiento</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe el motivo del requerimiento"
                              className="min-h-[80px] resize-none bg-white/50 dark:bg-slate-900/50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Ítems Requeridos</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const items = form.getValues("items_requeridos") || []
                            form.setValue("items_requeridos", [
                              ...items,
                              { item: items.length + 1, especificaciones: "", cantidad: 1 },
                            ])
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar Ítem
                        </Button>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="p-3 text-left font-medium w-12">#</th>
                              <th className="p-3 text-left font-medium">Especificaciones / Comentarios</th>
                              <th className="p-3 text-left font-medium w-24">Cant.</th>
                              <th className="p-3 text-center font-medium w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900">
                            {form.watch("items_requeridos")?.map((item: any, index: number) => (
                              <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
                                <td className="p-3 text-center">{index + 1}</td>
                                <td className="p-3">
                                  <FormField
                                    control={form.control}
                                    name={`items_requeridos.${index}.especificaciones`}
                                    render={({ field }) => (
                                      <FormControl>
                                        <Input placeholder="Descripción del ítem" className="h-8" {...field} />
                                      </FormControl>
                                    )}
                                  />
                                </td>
                                <td className="p-3">
                                  <FormField
                                    control={form.control}
                                    name={`items_requeridos.${index}.cantidad`}
                                    render={({ field }) => (
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="1"
                                          className="h-8"
                                          {...field}
                                          onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
                                        />
                                      </FormControl>
                                    )}
                                  />
                                </td>
                                <td className="p-3">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      const items = form.getValues("items_requeridos")
                                      form.setValue(
                                        "items_requeridos",
                                        items.filter((_, i) => i !== index),
                                      )
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="urgencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgencia</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/50 dark:bg-slate-900/50">
                                <SelectValue placeholder="Selecciona la urgencia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Baja</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón / Descripción General</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe detalladamente el motivo de tu solicitud..."
                        className="min-h-[120px] resize-none bg-white/50 dark:bg-slate-900/50 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <FormLabel className="text-base">Archivos Adjuntos</FormLabel>
                  <CardDescription className="mb-4">
                    Puedes adjuntar documentos de soporte (PDF, Word, imágenes). Máximo 10MB por archivo.
                  </CardDescription>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer" onClick={() => document.getElementById("file-upload")?.click()}>
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-full mb-3 shadow-sm">
                        <Upload className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                        Haz clic para subir archivos
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        PDF, DOCX, JPG, PNG (Max. 10MB)
                      </p>
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                    </div>

                    <div className="space-y-3">
                      {uploadedFiles.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                          No hay archivos seleccionados
                        </div>
                      ) : (
                        uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <FileText className="h-4 w-4 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button variant="outline" asChild className="px-6">
                  <Link href="/requests/new">Cancelar</Link>
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 px-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitud"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
