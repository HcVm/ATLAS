"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Building2, ArrowLeft, Loader2, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { createNotification } from "@/lib/notifications"

const formSchema = z.object({
  name: z.string().min(3, {
    message: "El nombre debe tener al menos 3 caracteres.",
  }),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, {
    message: "Debe ser un color hexadecimal válido (ej: #FF0000)",
  }),
})

// Colores predefinidos para departamentos
const predefinedColors = [
  { name: "Rojo", value: "#EF4444" },
  { name: "Verde", value: "#10B981" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Púrpura", value: "#8B5CF6" },
  { name: "Ámbar", value: "#F59E0B" },
  { name: "Cian", value: "#06B6D4" },
  { name: "Lima", value: "#84CC16" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Naranja", value: "#F97316" },
  { name: "Violeta", value: "#A855F7" },
  { name: "Índigo", value: "#6366F1" },
]

export default function NewDepartmentPage() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6", // Azul por defecto
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || user.role !== "admin") {
      toast({
        title: "Error",
        description: "No tienes permisos para crear departamentos.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Crear departamento con color
      const { data: department, error } = await supabase
        .from("departments")
        .insert({
          name: values.name,
          description: values.description || null,
          color: values.color,
        })
        .select()
        .single()

      if (error) throw error

      // Crear notificación para el administrador
      await createNotification({
        userId: user.id,
        title: "Departamento creado con éxito",
        message: `Has creado el departamento "${values.name}" con color ${values.color}`,
        type: "department_created",
        relatedId: department.id,
      })

      toast({
        title: "Departamento creado",
        description: "El departamento se ha creado correctamente con su color asignado.",
      })

      router.push("/departments")
    } catch (error: any) {
      console.error("Error creating department:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el departamento.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button variant="outline" size="icon" asChild className="self-start">
            <Link href="/departments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Crear Nuevo Departamento</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Completa el formulario para crear un nuevo departamento
            </p>
          </div>
        </div>

        {/* Form Card - Responsive */}
        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
              <Building2 className="h-5 w-5 self-start sm:self-center" />
              <span>Información del Departamento</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">
              Ingresa los detalles del nuevo departamento que deseas registrar en el sistema.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del departamento" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Nombre descriptivo del departamento.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description Field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción detallada del departamento"
                          className="min-h-[100px] sm:min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Información adicional sobre el departamento (opcional).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Color Field - Responsive */}
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Color del Departamento
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-3 sm:space-y-4">
                          {/* Color Input Row - Responsive */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <Input type="color" className="w-16 h-10 p-1 border rounded flex-shrink-0" {...field} />
                            <Input placeholder="#3B82F6" className="flex-1 min-w-0" {...field} />
                            <div
                              className="w-10 h-10 rounded border-2 border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: field.value }}
                            />
                          </div>

                          {/* Predefined Colors Grid - Responsive */}
                          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                style={{ backgroundColor: color.value }}
                                onClick={() => field.onChange(color.value)}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Color que identificará este departamento en los movimientos de documentos.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons - Responsive */}
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-0 pt-4 sm:pt-6">
                  <Button variant="outline" asChild className="w-full sm:w-auto order-2 sm:order-1">
                    <Link href="/departments">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <span className="hidden sm:inline">Crear Departamento</span>
                    <span className="sm:hidden">Crear</span>
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
