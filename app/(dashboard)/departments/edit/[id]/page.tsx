"use client"

import { useState, useEffect } from "react"
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

export default function EditDepartmentPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [department, setDepartment] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
    },
  })

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchDepartment()
    }
  }, [user, params.id])

  const fetchDepartment = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*").eq("id", params.id).single()

      if (error) throw error

      setDepartment(data)
      form.reset({
        name: data.name,
        description: data.description || "",
        color: data.color || "#3B82F6",
      })
    } catch (error: any) {
      console.error("Error fetching department:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el departamento.",
        variant: "destructive",
      })
      router.push("/departments")
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || user.role !== "admin") {
      toast({
        title: "Error",
        description: "No tienes permisos para editar departamentos.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from("departments")
        .update({
          name: values.name,
          description: values.description || null,
          color: values.color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      // Crear notificación para el administrador
      await createNotification({
        userId: user.id,
        title: "Departamento actualizado",
        message: `Has actualizado el departamento "${values.name}" con color ${values.color}`,
        type: "department_updated",
        relatedId: params.id,
      })

      toast({
        title: "Departamento actualizado",
        description: "El departamento se ha actualizado correctamente.",
      })

      router.push("/departments")
    } catch (error: any) {
      console.error("Error updating department:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el departamento.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando departamento...</p>
      </div>
    )
  }

  if (!department) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Departamento no encontrado</h1>
        <p className="text-muted-foreground">El departamento que buscas no existe.</p>
        <Button onClick={() => router.push("/departments")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Departamentos
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/departments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Departamento</h1>
          <p className="text-muted-foreground">Modifica la información del departamento</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información del Departamento
          </CardTitle>
          <CardDescription>Actualiza los detalles del departamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del departamento" {...field} />
                    </FormControl>
                    <FormDescription>Nombre descriptivo del departamento.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción detallada del departamento"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Información adicional sobre el departamento (opcional).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Input type="color" className="w-16 h-10 p-1 border rounded" {...field} />
                          <Input placeholder="#3B82F6" className="flex-1" {...field} />
                          <div
                            className="w-10 h-10 rounded border-2 border-gray-300"
                            style={{ backgroundColor: field.value }}
                          />
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {predefinedColors.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                              style={{ backgroundColor: color.value }}
                              onClick={() => field.onChange(color.value)}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Color que identificará este departamento en los movimientos de documentos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CardFooter className="flex justify-end gap-2 px-0">
                <Button variant="outline" asChild>
                  <Link href="/departments">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Actualizar Departamento
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
