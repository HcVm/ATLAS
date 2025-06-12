"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Save, Camera } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "",
    department_id: "",
  })

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUser()
      fetchDepartments()
    }
  }, [currentUser, params.id])

  const fetchUser = async () => {
    try {
      // Usar la API del servidor para obtener el usuario
      const response = await fetch(`/api/users/${params.id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar el usuario")
      }

      const data = await response.json()

      setUser(data)
      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        role: data.role || "",
        department_id: data.department_id || "none",
      })
    } catch (error: any) {
      console.error("Error fetching user:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar departamentos")
      }

      const data = await response.json()
      setDepartments(data || [])
    } catch (error: any) {
      console.error("Error fetching departments:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          department_id: formData.department_id === "none" ? null : formData.department_id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar usuario")
      }

      setMessage("Usuario actualizado exitosamente")
      setTimeout(() => {
        router.push("/users")
      }, 2000)
    } catch (error: any) {
      console.error("Error updating user:", error)
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
        <p className="mt-4 text-muted-foreground">Cargando usuario...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Usuario no encontrado</h1>
        <p className="text-muted-foreground">El usuario que buscas no existe.</p>
        <Button onClick={() => router.push("/users")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Usuarios
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Usuario</h1>
          <p className="text-muted-foreground">Modifica la información del usuario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>Imagen del usuario</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback className="text-2xl">
                {user.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Cambiar Foto
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del Usuario</CardTitle>
              <CardDescription>Actualiza la información del usuario</CardDescription>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select
                      value={formData.department_id}
                      onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin departamento</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/users")} disabled={saving}>
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
      </div>
    </div>
  )
}
