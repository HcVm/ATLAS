"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { UserEditForm } from "@/components/users/user-edit-form"
import { toast } from "sonner"

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUser()
      fetchDepartments()
      fetchCompanies()
    }
  }, [currentUser, params.id])

  const fetchUser = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          departments!profiles_department_id_fkey (
            id,
            name
          ),
          companies!profiles_company_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error
      setUser(data)
    } catch (error: any) {
      console.error("Error fetching user:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("id, name, company_id").order("name")
      if (error) throw error
      setDepartments(data || [])
    } catch (error: any) {
      console.error("Error fetching departments:", error)
    }
  }

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from("companies").select("id, name, code").order("name")

      if (error) {
        console.error("Error al cargar empresas:", error)
        toast.error(`Error al cargar empresas: ${error.message}`)
        throw error
      }

      console.log("Empresas cargadas:", data)
      setCompanies(data || [])
    } catch (error: any) {
      console.error("Error fetching companies:", error)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Debes seleccionar una imagen para subir.")
      }

      const file = event.target.files[0]

      // Validar tipo de archivo
      if (!file.type.startsWith("image/")) {
        throw new Error("El archivo debe ser una imagen.")
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("La imagen debe ser menor a 5MB.")
      }

      // Crear nombre de archivo con estructura que funcione con RLS
      const fileExt = file.name.split(".").pop()
      const timestamp = Date.now()
      const fileName = `${params.id}/avatar-${timestamp}.${fileExt}`

      console.log("Uploading file:", fileName)
      console.log("User ID:", params.id)

      // Eliminar avatar anterior si existe
      if (user.avatar_url) {
        try {
          const oldPath = user.avatar_url.split("/").pop()
          if (oldPath) {
            await supabase.storage.from("avatars").remove([`${params.id}/${oldPath}`])
          }
        } catch (error) {
          console.log("Could not delete old avatar:", error)
        }
      }

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      console.log("Upload successful:", uploadData)

      // Obtener URL pública
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      const publicUrl = data.publicUrl

      if (!publicUrl) {
        throw new Error("No se pudo obtener la URL de la imagen")
      }

      console.log("Public URL:", publicUrl)

      // Actualizar perfil con nueva URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", params.id)

      if (updateError) {
        console.error("Profile update error:", updateError)
        throw updateError
      }

      // Actualizar estado local
      setUser({ ...user, avatar_url: publicUrl })

      toast.success("Foto actualizada correctamente")
    } catch (error: any) {
      console.error("Error uploading avatar:", error)
      toast.error(error.message || "No se pudo subir la imagen.")
    } finally {
      setUploading(false)
      // Limpiar el input file
      const input = document.getElementById("avatar-upload") as HTMLInputElement
      if (input) input.value = ""
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 bg-clip-text text-transparent">
            Editar Usuario
          </h1>
          <p className="text-muted-foreground">Modifica la información del usuario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg border-slate-200/50 bg-gradient-to-br from-white to-slate-50/50">
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
            <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("avatar-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Cambiar Foto
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-4">
            <Button
              variant="outline"
              onClick={fetchCompanies}
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent"
            >
              <span>Recargar empresas</span>
            </Button>
          </div>

          <UserEditForm user={user} departments={departments} companies={companies} />
        </div>
      </div>
    </div>
  )
}
