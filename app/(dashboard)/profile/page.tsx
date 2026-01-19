"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PhotocheckCard } from "@/components/dashboard/photocheck-card"
import {
  User,
  Shield,
  Save,
  FileText,
  Activity,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  Smartphone,
  Mail,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/hooks/use-toast"
import { useCompany } from "@/lib/company-context"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { selectedCompany } = useCompany()
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
      const userId = user?.id || "unknown"
      const fileName = `${userId}/avatar-${timestamp}.${fileExt}`

      if (profile.avatar_url) {
        try {
          const oldPath = profile.avatar_url.split("/").pop()
          if (oldPath) {
            await supabase.storage.from("avatars").remove([`${userId}/${oldPath}`])
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
        .eq("id", userId)

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
      className="p-6 space-y-8 min-h-screen pb-20 max-w-7xl mx-auto"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
          Mi Perfil
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Gestiona tu credencial digital y configuración de cuenta
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Photocheck Card */}
        <div className="w-full lg:w-[380px] shrink-0">
          <PhotocheckCard
            user={user}
            profile={profile}
            department={department}
            selectedCompany={selectedCompany}
            showUploadButton={true}
            onUpload={handleAvatarUpload}
            uploading={uploading}
          />
        </div>

        {/* Right Column: Settings Tabs */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">
                Información
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">
                Seguridad
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview & Editing */}
            <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
              {/* Stats Mini-Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.documentsCreated}</p>
                      <p className="text-xs text-slate-500">Docs. Creados</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.movementsMade}</p>
                      <p className="text-xs text-slate-500">Movimientos</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-0.5">Estado</p>
                      <p className="text-sm font-bold">Cuenta Verificada</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-indigo-500" />
                    Datos Personales
                  </CardTitle>
                  <CardDescription>
                    Información visible para los administradores y en tus reportes
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="full_name"
                          value={profile.full_name}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="pl-9"
                          placeholder="+51 999 999 999"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico (Solo Lectura)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        value={profile.email}
                        disabled
                        className="pl-9 bg-slate-50 dark:bg-slate-900/50 text-slate-500"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/30 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Tab 2: Security */}
            <TabsContent value="security" className="space-y-6 focus-visible:outline-none">
              <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden border-l-4 border-l-purple-500">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="h-5 w-5 text-purple-500" />
                    Contraseña y Seguridad
                  </CardTitle>
                  <CardDescription>
                    Asegúrate de usar una contraseña segura que no uses en otros sitios.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Contraseña Actual</Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-2" />

                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/30 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center">
                  <p className="text-xs text-slate-500 italic">
                    Último cambio: Desconocido
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={changingPassword}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {changingPassword ? "Actualizando..." : "Actualizar Contraseña"}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  )
}
