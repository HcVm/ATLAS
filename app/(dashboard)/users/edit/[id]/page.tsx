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

      if (!file.type.startsWith("image/")) {
        throw new Error("El archivo debe ser una imagen.")
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("La imagen debe ser menor a 5MB.")
      }

      const fileExt = file.name.split(".").pop()
      const timestamp = Date.now()
      const fileName = `${params.id}/avatar-${timestamp}.${fileExt}`

      console.log("Uploading file:", fileName)
      console.log("User ID:", params.id)

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
      const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      console.log("Upload successful:", uploadData)

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      const publicUrl = data.publicUrl

      if (!publicUrl) {
        throw new Error("No se pudo obtener la URL de la imagen")
      }

      console.log("Public URL:", publicUrl)

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", params.id)

      if (updateError) {
        console.error("Profile update error:", updateError)
        throw updateError
      }

      setUser({ ...user, avatar_url: publicUrl })

      toast.success("Foto actualizada correctamente")
    } catch (error: any) {
      console.error("Error uploading avatar:", error)
      toast.error(error.message || "No se pudo subir la imagen.")
    } finally {
      setUploading(false)
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
    <div className="min-h-screen space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button 
            variant="ghost" 
            onClick={() => router.push("/users")}
            className="group pl-0 hover:pl-2 transition-all duration-300 hover:bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Volver a Usuarios
        </Button>
      </div>
      
      <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Editar Usuario
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gestiona la información personal, roles y permisos del usuario.
          </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Foto de Perfil</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Imagen visible para otros usuarios</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 pb-8">
            <div className="relative group">
                <Avatar className="h-40 w-40 ring-4 ring-white dark:ring-slate-900 shadow-lg">
                <AvatarImage src={user.avatar_url || ""} className="object-cover" />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-500 dark:text-slate-400">
                    {user.full_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => document.getElementById("avatar-upload")?.click()}>
                    <Camera className="h-8 w-8 text-white" />
                </div>
            </div>
            
            <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            
            <div className="flex flex-col items-center gap-2 w-full px-4">
                <Button
                variant="outline"
                className="w-full border-slate-200/60 bg-white/50 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-slate-800 transition-all shadow-sm"
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
                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
                    Recomendado: 500x500px. Máx 5MB.<br/>Formatos: JPG, PNG.
                </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCompanies}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <span className="flex items-center gap-1">Recargar datos de empresas</span>
            </Button>
          </div>

          <UserEditForm user={user} departments={departments} companies={companies} />
        </div>
      </div>
    </div>
  )
}
