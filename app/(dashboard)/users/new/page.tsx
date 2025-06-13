"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { User, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { createNotification } from "@/lib/notifications"
import { supabase } from "@/lib/supabase"

const formSchema = z.object({
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  full_name: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres." }),
  phone: z.string().optional(),
  role: z.enum(["admin", "supervisor", "user"]),
  department_id: z.string().optional(),
  company_id: z.string().optional(),
})

export default function NewUserPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDeps, setLoadingDeps] = useState(true)
  const [loadingCompanies, setLoadingCompanies] = useState(true)

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
      company_id: "",
      phone: "",
    },
  })

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name")
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los departamentos.", variant: "destructive" })
      } else {
        setDepartments(data || [])
      }
      setLoadingDeps(false)
    }

    const fetchCompanies = async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name")
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar las empresas.", variant: "destructive" })
      } else {
        setCompanies(data || [])
      }
      setLoadingCompanies(false)
    }

    fetchDepartments()
    fetchCompanies()
  }, [])

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
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          fullName: values.full_name,
          phone: values.phone || null,
          departmentId: values.department_id || null,
          companyId: values.company_id || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || "No se pudo crear el usuario.")

      await createNotification({
        userId: user.id,
        title: "Usuario creado con éxito",
        message: `Has creado el usuario ${values.full_name} (${values.email})`,
        type: "user_created",
        relatedId: result.user.id,
      })

      toast({ title: "Usuario creado", description: "El usuario se ha creado correctamente." })
      router.push("/users")
    } catch (error: any) {
      console.error("Error creando usuario:", error)
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al crear el usuario.",
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
          <Link href="/users"><ArrowLeft className="h-4 w-4" /></Link>
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
          <CardDescription>Ingresa los detalles del nuevo usuario que deseas registrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField name="full_name" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl><Input placeholder="Nombre completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="correo@ejemplo.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField name="phone" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (opcional)</FormLabel>
                    <FormControl><Input placeholder="Número de teléfono" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name="password" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl><Input type="password" placeholder="Contraseña" {...field} /></FormControl>
                    <FormDescription>Debe tener al menos 6 caracteres.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField name="role" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="user">Usuario</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField name="department_id" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona un departamento" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingDeps ? (
                          <div className="p-2">Cargando departamentos...</div>
                        ) : departments.length === 0 ? (
                          <div className="p-2 text-muted-foreground">No hay departamentos</div>
                        ) : (
                          departments.map(dep => (
                            <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField name="company_id" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecciona una empresa" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingCompanies ? (
                        <div className="p-2">Cargando empresas...</div>
                      ) : companies.length === 0 ? (
                        <div className="p-2 text-muted-foreground">No hay empresas</div>
                      ) : (
                        companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <CardFooter className="flex justify-end gap-2 px-0">
                <Button variant="outline" asChild><Link href="/users">Cancelar</Link></Button>
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
