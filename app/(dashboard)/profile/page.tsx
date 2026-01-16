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
import { motion } from "framer-motion"

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
        return <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm border-0">Administrador</Badge>
      case "supervisor":
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm border-0">Supervisor</Badge>
      case "user":
        return (
          <Badge
            variant="secondary"
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-0"
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

      if (!file.type.startsWith("image/")) {
        throw new Error("El archivo debe ser una imagen.")
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("La imagen debe ser menor a 5MB.")
      }

      const fileExt = file.name.split(".").pop()
      const timestamp = Date.now()
      const fileName = `${user?.id}/avatar-${timestamp}.${fileExt}`

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

      const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      const publicUrl = data.publicUrl

      if (!publicUrl) {
        throw new Error("No se pudo obtener la URL de la imagen")
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id)

      if (updateError) {
        throw updateError
      }

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-muted-foreground animate-pulse">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-8 min-h-screen pb-20"
    >
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
          Mi Perfil
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Gestiona tu información personal y preferencias de cuenta
        </p>
      </div>

      {/* Profile Header Card */}
      <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="h-48 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 opacity-90" />
          <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        </div>
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 gap-6">
            <div className="relative group">
              <div className="p-1.5 rounded-full bg-white dark:bg-slate-950 shadow-xl">
                <Avatar className="h-32 w-32 sm:h-40 sm:w-40 ring-4 ring-white dark:ring-slate-900">
                  <AvatarImage src={profile.avatar_url || "/placeholder.svg"} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-4xl">
                    {profile.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute bottom-2 right-2">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-2 border-white dark:border-slate-950 transition-all duration-300 hover:scale-110"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 mb-2 pt-4 sm:pt-0">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{profile.full_name}</h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">{profile.email}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
                {getRoleBadge(user.role)}
                {department && (
                  <Badge variant="outline" className="gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color || "#6B7280" }} />
                    {department.name}
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full bg-slate-100/50 dark:bg-slate-800/50">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Miembro desde {format(new Date(user.created_at), "MMM yyyy", { locale: es })}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Documentos Creados", value: stats.documentsCreated, icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "En Mi Departamento", value: stats.documentsInDepartment, icon: Building2, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: "Movimientos", value: stats.movementsMade, icon: Activity, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        ].map((stat, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm h-full">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Form */}
        <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm h-full">
          <CardContent className="p-6 sm:p-8 space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Información Personal</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Actualiza tus datos básicos</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-300">
                  Nombre Completo
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-500"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  El correo electrónico está vinculado a tu cuenta y no se puede cambiar directamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Tu número de teléfono"
                  className="bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  Rol del Sistema
                </Label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{user.role}</p>
                  </div>
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm h-full">
          <CardContent className="p-6 sm:p-8 space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seguridad</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Actualiza tu contraseña</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="current_password" className="text-slate-700 dark:text-slate-300">
                  Contraseña Actual
                </Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="pr-10 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-purple-500/20"
                    placeholder="••••••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-slate-700 dark:text-slate-300">
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="pr-10 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-purple-500/20"
                    placeholder="••••••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-slate-700 dark:text-slate-300">
                  Confirmar Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="pr-10 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:ring-purple-500/20"
                    placeholder="••••••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  })
                }}
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white transition-all duration-300"
              >
                {changingPassword ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Actualizar Contraseña
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
