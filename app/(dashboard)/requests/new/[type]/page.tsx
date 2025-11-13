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
} from "lucide-react"

const REQUEST_TYPES = {
  late_justification: {
    title: "Justificación de Tardanza",
    description: "Justificar llegadas tardías al trabajo",
    icon: Clock,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    timeLimit: "24 horas",
    urgent: true,
  },
  absence_justification: {
    title: "Justificación de Ausencia",
    description: "Justificar ausencias al trabajo",
    icon: UserX,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    timeLimit: "24 horas",
    urgent: true,
  },
  overtime_request: {
    title: "Registro de Horas Extras",
    description: "Registrar horas extras trabajadas",
    icon: Plus,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    timeLimit: "24 horas",
    urgent: true,
  },
  permission_request: {
    title: "Solicitud de Permiso",
    description: "Solicitar permisos y vacaciones",
    icon: Calendar,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    timeLimit: "3 días",
    urgent: false,
  },
  equipment_request: {
    title: "Solicitud de Equipos/Materiales",
    description: "Solicitar equipos o materiales para tu departamento",
    icon: Wrench,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    timeLimit: "Sin límite",
    urgent: false,
  },
  general_request: {
    title: "Solicitud General",
    description: "Comentarios, sugerencias y solicitudes generales",
    icon: MessageSquare,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    timeLimit: "Sin límite",
    urgent: false,
  },
}

const STATUS_CONFIG = {
  INGRESADA: {
    label: "Ingresada",
    icon: AlertCircle,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  EN_GESTION: {
    label: "En Gestión",
    icon: Loader2,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  APROBADA: {
    label: "Aprobada",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  DESAPROBADA: {
    label: "Desaprobada",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  EJECUTADA: {
    label: "Ejecutada",
    icon: CheckCircle,
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  },
  CANCELADA: {
    label: "Cancelada",
    icon: Clock,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
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
            console.error("[v0] Error details:", {
              message: uploadError.message,
              statusCode: uploadError.statusCode,
              error: uploadError.error,
            })

            if (uploadError.message?.includes("row-level security policy") || uploadError.statusCode === "403") {
              toast({
                title: "Error de permisos",
                description: "No tienes permisos para subir archivos. Contacta al administrador del sistema.",
                variant: "destructive",
              })
              setLoading(false)
              return
            } else if (uploadError.message?.includes("Bucket not found")) {
              toast({
                title: "Error de configuración",
                description: "El sistema de archivos no está configurado correctamente. Contacta al administrador.",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/requests/new">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {requestType && (
            <div className={`p-2 rounded-lg ${requestType.color}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          {requestType && (
            <div>
              <h1 className="text-2xl font-bold text-foreground">{requestType.title}</h1>
              <p className="text-muted-foreground">{requestType.description}</p>
            </div>
          )}
        </div>
      </div>

      {timeWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Tiempo límite:</strong> {timeWarning}
          </AlertDescription>
        </Alert>
      )}

      {requestType && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Información de la Solicitud
            </CardTitle>
            <CardDescription>Completa todos los campos requeridos para enviar tu solicitud</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razón</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe detalladamente tu solicitud"
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {resolvedParams.type === "late_justification" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="incident_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de la Tardanza</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
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
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {resolvedParams.type === "absence_justification" && (
                  <FormField
                    control={form.control}
                    name="incident_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de la Ausencia</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                            <Input type="date" {...field} />
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
                              <Input type="time" {...field} />
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
                              <Input type="time" {...field} />
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
                            <Input type="date" {...field} />
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
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {resolvedParams.type === "equipment_request" && (
                  <>
                    <div className="space-y-6 border rounded-lg p-6 bg-card">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="requerimiento_numero"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Requerimiento N°</FormLabel>
                              <FormControl>
                                <Input placeholder="Auto-generado" disabled {...field} />
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
                                <Input type="date" {...field} />
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
                                <Input placeholder="Nombre del responsable o área" {...field} />
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
                                <Input placeholder="Área que solicita" {...field} />
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
                              <Input placeholder="Nombre del solicitante" {...field} />
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
                                className="min-h-[80px] resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
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

                        <div className="border rounded-lg overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted border-b">
                                <th className="p-3 text-left font-medium">#</th>
                                <th className="p-3 text-left font-medium">Especificaciones / Comentarios</th>
                                <th className="p-3 text-left font-medium">Cantidad</th>
                                <th className="p-3 text-left font-medium">Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {form.watch("items_requeridos")?.map((item: any, index: number) => (
                                <tr key={index} className="border-b hover:bg-muted/50">
                                  <td className="p-3">{index + 1}</td>
                                  <td className="p-3">
                                    <FormField
                                      control={form.control}
                                      name={`items_requeridos.${index}.especificaciones`}
                                      render={({ field }) => (
                                        <FormControl>
                                          <Input placeholder="Descripción del ítem" {...field} />
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
                                      onClick={() => {
                                        const items = form.getValues("items_requeridos")
                                        form.setValue(
                                          "items_requeridos",
                                          items.filter((_, i) => i !== index),
                                        )
                                      }}
                                    >
                                      <X className="h-4 w-4" />
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
                                <SelectTrigger>
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
                  </>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Archivos Adjuntos (opcional)</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Puedes adjuntar documentos de soporte (PDF, Word, imágenes). Máximo 10MB por archivo.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Archivos
                      </Button>
                    </div>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Archivos seleccionados:</p>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <span className="text-sm truncate">{file.name}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <Button variant="outline" asChild>
                    <Link href="/requests/new">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={loading}>
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
      )}

      {!requestType && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/requests/new">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tipo de solicitud no válido: "{resolvedParams.type}". Por favor, selecciona un tipo de solicitud válido.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
