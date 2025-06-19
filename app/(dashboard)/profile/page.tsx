"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Building2, Calendar, Shield, Save, Camera, FileText, Activity } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
  })
  const [stats, setStats] = useState({
    documentsCreated: 0,
    documentsInDepartment: 0,
    movementsMade: 0,
  })
  const [department, setDepartment] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar_url: user.avatar_url || "",
      })
      fetchUserStats()
      fetchDepartment()
    }
  }, [user])

  const fetchUserStats = async () => {
    if (!user) return

    try {
      const [documentsRes, movementsRes] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("document_movements").select("id", { count: "exact", head: true }).eq("moved_by", user.id),
      ])

      let departmentDocsCount = 0
      if (user.department_id) {
        const { count } = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("current_department_id", user.department_id)
        departmentDocsCount = count || 0
      }

      setStats({
        documentsCreated: documentsRes.count || 0,
        documentsInDepartment: departmentDocsCount,
        movementsMade: movementsRes.count || 0,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const fetchDepartment = async () => {
    if (!user?.department_id) return

    try {
      const { data, error } = await supabase.from("departments").select("*").eq("id", user.department_id).single()

      if (error) throw error
      setDepartment(data)
    } catch (error) {
      console.error("Error fetching department:", error)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq("id", user.id)

      if (error) throw error

      await refreshUser()
      toast({
        title: "Perfil actualizado",
        description: "Tu perfil ha sido actualizado correctamente.",
      })
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil: " + error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm">Administrador</Badge>
      case "supervisor":
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm">Supervisor</Badge>
      case "user":
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 shadow-sm">
            Usuario
          </Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
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

      const fileExt = file.name.split(".").pop()
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      if (!publicUrl) {
        throw new Error("No se pudo obtener la URL de la imagen")
      }

      console.log("Avatar uploaded successfully:", publicUrl)

      // Actualizar perfil con nueva URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id)

      if (updateError) {
        throw updateError
      }

      // Actualizar estado local
      setProfile({ ...profile, avatar_url: publicUrl })
      await refreshUser()

      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil ha sido actualizada correctamente.",
      })
    } catch (error: any) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la imagen.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  if (!user) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gestiona tu información personal</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-white shadow-xl">
                <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 font-bold text-lg sm:text-xl">
                  {profile.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 rounded-full bg-white shadow-lg hover:scale-110 transition-all duration-300"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  disabled={uploading}
                  asChild
                >
                  <label htmlFor="avatar-upload" className="cursor-pointer flex items-center justify-center">
                    {uploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </label>
                </Button>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.full_name}</h2>
                <p className="text-sm sm:text-base text-muted-foreground">{profile.email}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                {getRoleBadge(user.role)}
                {department && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: department.color || "#6B7280" }} />
                    <span className="text-sm text-muted-foreground">{department.name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-1 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Miembro desde {format(new Date(user.created_at), "MMMM yyyy", { locale: es })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documentos Creados</p>
                <p className="text-2xl font-bold text-blue-600">{stats.documentsCreated}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Mi Departamento</p>
                <p className="text-2xl font-bold text-green-600">{stats.documentsInDepartment}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Movimientos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.movementsMade}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Form */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Información Personal</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} disabled className="bg-gray-50 text-gray-500" />
                <p className="text-xs text-muted-foreground">El email no se puede cambiar</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Número de teléfono"
                  className="border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
