"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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

export default function EditDepartmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [department, setDepartment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "bg-blue-500",
  })

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchDepartment()
    }
  }, [currentUser, params.id])

  const fetchDepartment = async () => {
    try {
      const response = await fetch(`/api/departments/${params.id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar el departamento")
      }

      const data = await response.json()

      setDepartment(data)
      setFormData({
        name: data.name || "",
        description: data.description || "",
        color: data.color || "bg-blue-500",
      })
    } catch (error: any) {
      console.error("Error fetching department:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`/api/departments/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar departamento")
      }

      setMessage("Departamento actualizado exitosamente")
      setTimeout(() => {
        router.push("/departments")
      }, 2000)
    } catch (error: any) {
      console.error("Error updating department:", error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (currentUser?.role !== "admin") {
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/departments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Departamento</h1>
          <p className="text-muted-foreground">Modifica la información del departamento</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Departamento</CardTitle>
          <CardDescription>Actualiza los detalles del departamento</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Departamento</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={saving}
                  required
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
                />
              </div>

              <div className="space-y-2">
                <Label>Color del Departamento</Label>
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
                        className={`flex items-center justify-center px-3 py-2 rounded-md cursor-pointer ${
                          formData.color === color.value ? "ring-2 ring-offset-2 ring-primary" : ""
                        } ${color.value} ${color.textColor}`}
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
                  "Guardando..."
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
