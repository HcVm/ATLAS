"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

const formSchema = z.object({
  to_department_id: z.string({
    required_error: "Por favor seleccione un departamento destino",
  }),
  notes: z.string().optional(),
})

type MovementFormProps = {
  documentId: string
  currentDepartmentId: string
  onComplete: () => void
}

export function MovementForm({ documentId, currentDepartmentId, onComplete }: MovementFormProps) {
  const { user } = useAuth()
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  })

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("*")
          .neq("id", currentDepartmentId) // Exclude current department
          .order("name")

        if (error) throw error
        setDepartments(data || [])
      } catch (error) {
        console.error("Error fetching departments:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los departamentos. Intente nuevamente.",
          variant: "destructive",
        })
      }
    }

    fetchDepartments()
  }, [currentDepartmentId])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debe iniciar sesión para realizar esta acción.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Create the movement record
      const { error: movementError } = await supabase.from("document_movements").insert({
        document_id: documentId,
        from_department_id: currentDepartmentId,
        to_department_id: values.to_department_id,
        moved_by: user.id,
        notes: values.notes || null,
      })

      if (movementError) throw movementError

      // Update the document's department
      const { error: documentError } = await supabase
        .from("documents")
        .update({
          department_id: values.to_department_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)

      if (documentError) throw documentError

      toast({
        title: "Documento movido",
        description: "El documento ha sido movido exitosamente.",
      })

      onComplete()
    } catch (error: any) {
      console.error("Error moving document:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo mover el documento. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="to_department_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento Destino</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un departamento" />
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
              <FormDescription>Seleccione el departamento al que desea mover este documento.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Agregue notas o comentarios sobre este movimiento"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>Puede agregar notas o comentarios adicionales sobre este movimiento.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Moviendo documento..." : "Mover Documento"}
        </Button>
      </form>
    </Form>
  )
}
