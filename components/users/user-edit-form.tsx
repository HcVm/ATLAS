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
    <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100/60 dark:border-slate-800/60 pb-6">
        <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Información del Usuario</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">
          Actualiza los datos personales, contacto y asignaciones de empresa.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">Nombre completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre completo"
                        {...field}
                        className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all"
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
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@ejemplo.com"
                        {...field}
                        className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all"
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
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Teléfono"
                        {...field}
                        className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all"
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
                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">Rol del sistema</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all">
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

              <div className="col-span-1 md:col-span-2 border-t border-slate-100/60 dark:border-slate-800/60 pt-6 mt-2">
                 <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    Asignación Organizacional
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="company_id"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">Empresa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all">
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
                            <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                            Departamento
                            {selectedCompanyId && selectedCompanyId !== "none" && (
                                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-2">(Filtrado por empresa)</span>
                            )}
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all">
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
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100/60 dark:border-slate-800/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="border-slate-200/60 bg-white/50 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black dark:from-white dark:to-slate-200 dark:hover:from-slate-200 dark:hover:to-slate-300 text-white dark:text-slate-900 shadow-lg shadow-slate-500/20"
              >
                {isLoading ? (
                    <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Guardando...
                    </>
                ) : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
