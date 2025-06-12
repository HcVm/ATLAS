"use client"

import { useState } from "react"
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

export function UserEditForm({ user, departments, companies }: UserEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department_id: user.department_id || undefined,
      company_id: user.company_id || undefined,
      phone: user.phone || "",
    },
  })

  async function onSubmit(data: UserEditFormValues) {
    try {
      setIsLoading(true)

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          department_id: data.department_id || null,
          company_id: data.company_id || null,
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
                    <SelectItem value="admin">Administrador</SelectItem>
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
  )
}
