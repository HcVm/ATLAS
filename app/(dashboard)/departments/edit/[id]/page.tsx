"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"

const DEPARTMENT_COLORS = [
  { value: "bg-red-500", label: "Rojo", textColor: "text-white" },
  { value: "bg-blue-500", label: "Azul", textColor: "text-white" },
  { value: "bg-green-500", label: "Verde", textColor: "text-white" },
  { value: "bg-yellow-500", label: "Amarillo", textColor: "text-black" },
  { value: "bg-purple-500", label: "Morado", textColor: "text-white" },
  { value: "bg-pink-500", label: "Rosa", textColor: "text-white" },
  { value: "bg-indigo-500", label: "Índigo", textColor: "text-white" },
  { value: "bg-gray-500", label: "Gris", textColor: "text-white" },
  { value: "bg-orange-500", label: "Naranja", textColor: "text-white" },
  { value: "bg-teal-500", label: "Verde Azulado", textColor: "text-white" },
]

interface Department {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

export default function EditDepartmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "bg-blue-500",
  })

  // Función para verificar si el usuario es administrador
  const isAdmin = (user: any): boolean => {
    return user?.role === "admin" || user?.role === "supervisor"
  }

  useEffect(() => {
    if (currentUser) {
      if (isAdmin(currentUser)) {
        fetchDepartment()
      } else {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder a esta página.",
          variant: "destructive",
        })
        router.push("/departments")
      }
    }
  }, [currentUser, params.id])

  const fetchDepartment = async () => {
    try {
      console.log(`Fetching department: ${params.id}`)

      const response = await fetch(`/api/departments/${params.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`Response status: ${response.status}`)

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Departamento no encontrado",
            description: "El departamento que intentas editar no existe.",
            variant: "destructive",
          })
          router.push("/departments")
          return
        }

        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.error || "Error al cargar el departamento")
      }

      const data = await response.json()
      console.log("Department data received:", data)

      setDepartment(data)
      setFormData({
        name: data.name || "",
        description: data.description || "",
        color: data.color || "bg-blue-500",
      })
    } catch (error: any) {
      console.error("Error fetching department:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el departamento",
        variant: "destructive",
      })
      router.push("/departments")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre del departamento es requerido.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      console.log(`Updating department: ${params.id}`)
      console.log("Form data:", formData)

      const response = await fetch(`/api/departments/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          color: formData.color,
        }),
      })

      console.log(`Update response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Update error response:", errorData)
        throw new Error(errorData.error || "Error al actualizar departamento")
      }

      const result = await response.json()
      console.log("Update result:", result)

      toast({
        title: "Departamento actualizado",
        description: "El departamento se ha actualizado correctamente",
      })

      // Esperar un poco antes de redirigir para que el usuario vea el mensaje
      setTimeout(() => {
        router.push("/departments")
      }, 1500)
    } catch (error: any) {
      console.error("Error updating department:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el departamento",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!isAdmin(currentUser)) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        <p className="text-sm text-muted-foreground mt-2">Tu rol actual: {currentUser.role}</p>
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/departments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Departamento</h1>
          <p className="text-muted-foreground">Modifica la información del departamento: {department.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Departamento</CardTitle>
          <CardDescription>Actualiza los detalles del departamento</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Departamento *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={saving}
                  required
                  placeholder="Ingresa el nombre del departamento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={saving}
                  rows={4}
                  placeholder="Descripción opcional del departamento"
                />
              </div>

              <div className="space-y-2">
                <Label>Color del Departamento *</Label>
                <RadioGroup
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2"
                >
                  {DEPARTMENT_COLORS.map((color) => (
                    <div key={color.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={color.value} id={color.value} className="sr-only" />
                      <Label
                        htmlFor={color.value}
                        className={`flex items-center justify-center px-3 py-2 rounded-md cursor-pointer transition-all ${
                          formData.color === color.value ? "ring-2 ring-offset-2 ring-primary" : ""
                        } ${color.value} ${color.textColor} hover:opacity-80`}
                      >
                        {color.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push("/departments")} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
