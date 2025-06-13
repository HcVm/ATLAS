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
import { useCompany } from "@/lib/company-context"
import Link from "next/link"
import { createNotification } from "@/lib/notifications"
import { createUser } from "@/app/actions/user-actions"

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
  const { selectedCompany } = useCompany()

  // Redirigir si no es administrador
  useState(() => {
    if (user && user.role !== "admin") {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para crear usuarios.",
        variant: "destructive",
      })
      router.push("/dashboard")
    }
  })

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
      // Usar la Server Action para crear el usuario
      const result = await createUser({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        role: values.role,
        department_id: values.department_id || null,
        company_id: selectedCompany?.id || null,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // Crear notificación para el administrador
      await createNotification({
        userId: user.id,
        title: "Usuario creado con éxito",
        message: `Has creado el usuario ${values.full_name} (${values.email}) con rol ${values.role}${
          selectedCompany ? ` en la empresa ${selectedCompany.name}` : ""
        }`,
        type: "user_created",
        relatedId: result.user?.id,
      })

      toast({
        title: "Usuario creado",
        description: "El usuario se ha creado correctamente.",
      })

      router.push("/users")
      router.refresh()
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button variant="outline" size="icon" asChild className="self-start">
            <Link href="/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Crear Nuevo Usuario</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Completa el formulario para crear un nuevo usuario
              {selectedCompany && <span className="font-medium text-primary"> en {selectedCompany.name}</span>}
            </p>
          </div>
        </div>

        {/* Form Card - Responsive */}
        <Card className="shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
              <User className="h-5 w-5 self-start sm:self-center" />
              <span>Información del Usuario</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">
              Ingresa los detalles del nuevo usuario que deseas registrar en el sistema.
              {selectedCompany && (
                <span className="block mt-1">
                  El usuario será asignado automáticamente a la empresa <strong>{selectedCompany.name}</strong>.
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Name and Email - Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

                {/* Password - Full Width */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Contraseña" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-sm">
                        Debe tener al menos 6 caracteres.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role and Department - Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                        <FormDescription className="text-xs sm:text-sm">
                          Nivel de acceso del usuario en el sistema.
                        </FormDescription>
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
                                <span className="text-sm">Cargando departamentos...</span>
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
                        <FormDescription className="text-xs sm:text-sm">
                          Departamento al que pertenece el usuario.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Información sobre la empresa asignada */}
                {selectedCompany && (
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Empresa asignada:</span> {selectedCompany.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      El usuario será asignado automáticamente a esta empresa. Para asignar a otra empresa, cambia la
                      selección en el selector de empresas.
                    </p>
                  </div>
                )}

                {/* Action Buttons - Responsive */}
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 px-0 pt-4 sm:pt-6">
                  <Button variant="outline" asChild className="w-full sm:w-auto order-2 sm:order-1">
                    <Link href="/users">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <span className="hidden sm:inline">Crear Usuario</span>
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
