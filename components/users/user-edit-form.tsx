"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const userEditSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  role: z.string().min(1, "El rol es requerido"),
  department_id: z.string().optional(),
  company_id: z.string().optional(),
  phone: z.string().optional(),
})

type UserEditFormValues = z.infer<typeof userEditSchema>

interface Department {
  id: string
  name: string
}

interface Company {
  id: string
  name: string
  code: string
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  department_id: string | null
  company_id: string | null
  phone: string | null
  departments?: {
    id: string
    name: string
  } | null
  companies?: {
    id: string
    name: string
    code: string
  } | null
}

interface UserEditFormProps {
  user: UserProfile
  departments: Department[]
  companies: Company[]
}

export function UserEditForm({
  user,
  departments: initialDepartments,
  companies: initialCompanies,
}: UserEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || "none",
      company_id: user.company_id || "none",
      phone: user.phone || "",
    },
  })

  // Cargar empresas si no se pasaron como prop
  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies()
    }
  }, [companies.length])

  // Cargar departamentos si no se pasaron como prop
  useEffect(() => {
    if (departments.length === 0) {
      loadDepartments()
    }
  }, [departments.length])

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase.from("companies").select("id, name, code").order("name")
      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error("Error loading companies:", error)
      toast.error("Error al cargar empresas")
    }
  }

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("id, name").order("name")
      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error loading departments:", error)
      toast.error("Error al cargar departamentos")
    }
  }

  async function onSubmit(data: UserEditFormValues) {
    try {
      setIsLoading(true)

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          department_id: data.department_id === "none" ? null : data.department_id,
          company_id: data.company_id === "none" ? null : data.company_id,
          phone: data.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast.success("Usuario actualizado correctamente")
      router.refresh()
      router.push("/users")
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast.error(`Error al actualizar usuario: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Usuario</CardTitle>
        <CardDescription>Actualiza la información del usuario y asigna empresa</CardDescription>
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
                    <FormLabel>Nombre completo</FormLabel>
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Teléfono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin empresa</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.code} - {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin departamento</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
