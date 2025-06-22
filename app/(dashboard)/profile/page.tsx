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
import { User, Building2, Calendar, Shield, Save, Camera, FileText, Activity, Eye, EyeOff, Lock } from "lucide-react"
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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [changingPassword, setChangingPassword] = useState(false)

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
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 text-gray-700 dark:text-slate-200 shadow-sm"
          >
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

      // Crear nombre de archivo con estructura que funcione con RLS
      const fileExt = file.name.split(".").pop()
      const timestamp = Date.now()
      const fileName = `${user?.id}/avatar-${timestamp}.${fileExt}`

      console.log("Uploading file:", fileName)
      console.log("User ID:", user?.id)

      // Eliminar avatar anterior si existe
      if (profile.avatar_url) {
        try {
          const oldPath = profile.avatar_url.split("/").pop()
          if (oldPath) {
            await supabase.storage.from("avatars").remove([`${user?.id}/${oldPath}`])
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
        .eq("id", user?.id)

      if (updateError) {
        console.error("Profile update error:", updateError)
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
      // Limpiar el input file
      const input = document.getElementById("avatar-upload") as HTMLInputElement
      if (input) input.value = ""
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas nuevas no coinciden.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe ser diferente a la actual.",
        variant: "destructive",
      })
      return
    }

    setChangingPassword(true)
    try {
      // Primero verificar la contraseña actual intentando hacer login
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordForm.currentPassword,
      })

      if (verifyError) {
        toast({
          title: "Error",
          description: "La contraseña actual es incorrecta.",
          variant: "destructive",
        })
        return
      }

      // Si la verificación es exitosa, actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (updateError) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la contraseña: " + updateError.message,
          variant: "destructive",
        })
        return
      }

      // Limpiar el formulario
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente.",
      })
    } catch (error: any) {
      console.error("Error changing password:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado.",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
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
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Mi Perfil</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gestiona tu información personal</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-700/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-white dark:ring-slate-600 shadow-xl">
                <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg sm:text-xl">
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
                  className="h-8 w-8 rounded-full bg-white dark:bg-slate-700 shadow-lg hover:scale-110 transition-all duration-300"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 dark:border-slate-300 border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{profile.full_name}</h2>
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
        <Card className="shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documentos Creados</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.documentsCreated}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                <FileText className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Mi Departamento</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.documentsInDepartment}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Building2 className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Movimientos</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.movementsMade}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Activity className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Form */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-700/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Información Personal</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-200">
                  Nombre Completo
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="border-gray-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-400 focus:ring-slate-400/20 dark:focus:ring-slate-400/20 transition-all duration-300 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50 dark:bg-slate-600 text-gray-500 dark:text-slate-400"
                />
                <p className="text-xs text-muted-foreground">El email no se puede cambiar</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-200">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Número de teléfono"
                  className="border-gray-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-400 focus:ring-slate-400/20 dark:focus:ring-slate-400/20 transition-all duration-300 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-700 dark:text-slate-200">
                  Rol
                </Label>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-600" />

            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full sm:w-auto bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-700/50 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                <Lock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Cambiar Contraseña</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="current_password" className="text-slate-700 dark:text-slate-200">
                  Contraseña Actual
                </Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="border-gray-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-400 focus:ring-slate-400/20 dark:focus:ring-slate-400/20 transition-all duration-300 pr-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="Ingresa tu contraseña actual"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-slate-700 dark:text-slate-200">
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="border-gray-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-400 focus:ring-slate-400/20 dark:focus:ring-slate-400/20 transition-all duration-300 pr-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="Ingresa tu nueva contraseña"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-slate-700 dark:text-slate-200">
                  Confirmar Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="border-gray-200 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-400 focus:ring-slate-400/20 dark:focus:ring-slate-400/20 transition-all duration-300 pr-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder="Confirma tu nueva contraseña"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-600" />

            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  })
                }}
                className="w-full sm:w-auto border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                disabled={changingPassword}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={
                  changingPassword ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmPassword
                }
                className="w-full sm:w-auto bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Lock className="h-4 w-4 mr-2" />
                {changingPassword ? "Cambiando..." : "Cambiar Contraseña"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
