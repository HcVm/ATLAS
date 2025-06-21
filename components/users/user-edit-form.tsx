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
  company_id: string | null
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
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([])

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

  // Watch company changes to filter departments
  const selectedCompanyId = form.watch("company_id")

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

  // Filter departments when company changes
  useEffect(() => {
    filterDepartmentsByCompany()
  }, [selectedCompanyId, departments])

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
      const { data, error } = await supabase.from("departments").select("id, name, company_id").order("name")
      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error loading departments:", error)
      toast.error("Error al cargar departamentos")
    }
  }

  const filterDepartmentsByCompany = () => {
    if (!selectedCompanyId || selectedCompanyId === "none") {
      // Show all departments if no company selected
      setFilteredDepartments(departments)
    } else {
      // Filter departments by selected company
      const filtered = departments.filter((dept) => dept.company_id === selectedCompanyId)
      setFilteredDepartments(filtered)

      // Reset department selection if current department doesn't belong to selected company
      const currentDeptId = form.getValues("department_id")
      if (currentDeptId && currentDeptId !== "none") {
        const currentDeptBelongsToCompany = filtered.some((dept) => dept.id === currentDeptId)
        if (!currentDeptBelongsToCompany) {
          form.setValue("department_id", "none")
        }
      }
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
    <Card className="shadow-lg border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50">
      <CardHeader>
        <CardTitle className="text-slate-700">Información del Usuario</CardTitle>
        <CardDescription className="text-slate-600">
          Actualiza la información del usuario y asigna empresa
        </CardDescription>
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
                    <FormLabel className="text-slate-700">Nombre completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre completo"
                        {...field}
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20"
                      />
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
                    <FormLabel className="text-slate-700">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@ejemplo.com"
                        {...field}
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20"
                      />
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
                    <FormLabel className="text-slate-700">Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Teléfono"
                        {...field}
                        className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20"
                      />
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
                    <FormLabel className="text-slate-700">Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20">
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
                    <FormLabel className="text-slate-700">Empresa</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20">
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
                    <FormLabel className="text-slate-700">
                      Departamento
                      {selectedCompanyId && selectedCompanyId !== "none" && (
                        <span className="text-sm text-muted-foreground ml-2">(Solo de la empresa seleccionada)</span>
                      )}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-200 focus:border-slate-400 focus:ring-slate-400/20">
                          <SelectValue placeholder="Seleccionar departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin departamento</SelectItem>
                        {filteredDepartments.map((department) => (
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
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white"
              >
                {isLoading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
