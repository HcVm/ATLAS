"use client"

import type React from "react"

import type { ReactElement } from "react"
import { useState } from "react"
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
  equipment_details: z.object({
    type: z.string().min(1, "El tipo de equipo es requerido"),
    quantity: z.number().min(1, "La cantidad debe ser al menos 1"),
    specifications: z.string().optional(),
    urgency: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  }),
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

  const resolvedParams = params
  const requestType = REQUEST_TYPES[resolvedParams.type as keyof typeof REQUEST_TYPES]

  const schema = getSchemaForType(resolvedParams.type)
  const Icon = requestType?.icon
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: "",
      attachments: [],
      ...(resolvedParams.type === "equipment_request" && {
        equipment_details: {
          type: "",
          quantity: 1,
          specifications: "",
          urgency: "normal",
        },
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
            console.error("Error uploading file:", uploadError)
            toast({
              title: "Error subiendo archivo",
              description: `No se pudo subir ${file.name}`,
              variant: "destructive",
            })
            continue
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
        incident_date: values.incident_date,
        end_date: values.end_date || null,
        incident_time: values.incident_time || null,
        end_time: values.end_time || null,
        reason: values.reason,
        equipment_details: values.equipment_details || null,
        priority: values.equipment_details?.urgency || "normal",
        supporting_documents: attachmentUrls.length > 0 ? attachmentUrls : null,
      }

      const { data, error } = await supabase.from("employee_requests").insert(requestData).select().single()

      if (error) throw error

      toast({
        title: "Solicitud creada",
        description: `Tu ${requestType?.title.toLowerCase()} ha sido enviada correctamente`,
      })

      router.push("/requests")
    } catch (error: any) {
      console.error("Error creating request:", error)
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="equipment_details.type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Equipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona el tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="computer">Computadora/Laptop</SelectItem>
                                <SelectItem value="software">Software</SelectItem>
                                <SelectItem value="office_supplies">Suministros de Oficina</SelectItem>
                                <SelectItem value="tools">Herramientas</SelectItem>
                                <SelectItem value="furniture">Mobiliario</SelectItem>
                                <SelectItem value="other">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="equipment_details.quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="equipment_details.urgency"
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
                    <FormField
                      control={form.control}
                      name="equipment_details.specifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Especificaciones (opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Especifica detalles adicionales del equipo"
                              className="min-h-[80px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
