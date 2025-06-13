"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { User, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { createNotification } from "@/lib/notifications"

const formSchema = z.object({
  email: z.string().email({
    message: "Debe ser un correo electrónico válido.",
  }),
  password: z.string().min(6, {
    message: "La contraseña debe tener al menos 6 caracteres.",
  }),
  full_name: z.string().min(3, {
    message: "El nombre completo debe tener al menos 3 caracteres.",
  }),
  role: z.enum(["admin", "supervisor", "user"], {
    required_error: "Debes seleccionar un rol.",
  }),
  department_id: z.string().optional(),
})

export default function NewUserPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      role: "user",
      department_id: "",
    },
  })

  // Cargar departamentos
  useState(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase.from("departments").select("*").order("name")
        if (error) throw error
        setDepartments(data || [])
      } catch (error) {
        console.error("Error fetching departments:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los departamentos.",
          variant: "destructive",
        })
      } finally {
        setLoadingDepartments(false)
      }
    }

    fetchDepartments()
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || user.role !== "admin") {
      toast({
        title: "Error",
        description: "No tienes permisos para crear usuarios.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
        user_metadata: {
          full_name: values.full_name,
          role: values.role,
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario")
      }

      // Actualizar perfil con departamento si es necesario
      if (values.department_id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ department_id: values.department_id })
          .eq("id", authData.user.id)

        if (profileError) throw profileError
      }

      // Crear notificación para el administrador
      await createNotification({
        userId: user.id,
        title: "Usuario creado con éxito",
        message: `Has creado el usuario ${values.full_name} (${values.email}) con rol ${values.role}`,
        type: "user_created",
        relatedId: authData.user.id,
      })

      toast({
        title: "Usuario creado",
        description: "El usuario se ha creado correctamente.",
      })

      router.push("/users")
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Crear Nuevo Usuario</h1>
          <p className="text-muted-foreground">Completa el formulario para crear un nuevo usuario</p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Usuario
          </CardTitle>
          <CardDescription>Ingresa los detalles del nuevo usuario que deseas registrar en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre completo" {...field} />
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
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Contraseña" {...field} />
                    </FormControl>
                    <FormDescription>Debe tener al menos 6 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="user">Usuario</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Nivel de acceso del usuario en el sistema.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un departamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingDepartments ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span>Cargando departamentos...</span>
                            </div>
                          ) : departments.length === 0 ? (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              No hay departamentos disponibles
                            </div>
                          ) : (
                            departments.map((department) => (
                              <SelectItem key={department.id} value={department.id}>
                                {department.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>Departamento al que pertenece el usuario.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end gap-2 px-0">
                <Button variant="outline" asChild>
                  <Link href="/users">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Usuario
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
