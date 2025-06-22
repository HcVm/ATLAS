"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Mail, Phone, Building, Calendar, Shield, Camera, Save, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface UserProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  created_at: string
  avatar_url: string | null
  department?: {
    name: string
    color: string
  } | null
  company?: {
    name: string
    code: string
  } | null
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, full_name, email, phone, role, created_at, avatar_url,
          departments!profiles_department_id_fkey (name, color),
          companies (name, code)
        `)
        .eq("id", user?.id)
        .single()

      if (error) throw error

      setProfile(data)
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
      })
    } catch (error: any) {
      console.error("Error fetching profile:", error)
      toast.error("Error al cargar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id)

      if (error) throw error

      toast.success("Perfil actualizado exitosamente")
      await fetchProfile()
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error("Error al actualizar el perfil")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("La imagen debe ser menor a 2MB")
        return
      }

      // Validar tipo
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen")
        return
      }

      setUploadingAvatar(true)

      // Generar nombre único
      const fileExt = file.name.split(".").pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Subir archivo
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      // Actualizar perfil
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user?.id)

      if (updateError) throw updateError

      toast.success("Avatar actualizado exitosamente")
      await fetchProfile()
    } catch (error: any) {
      console.error("Error uploading avatar:", error)
      toast.error("Error al subir el avatar")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "supervisor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "user":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador"
      case "supervisor":
        return "Supervisor"
      case "user":
        return "Usuario"
      default:
        return role
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-1 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center space-y-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No se pudo cargar la información del perfil</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                <User className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Mi Perfil</h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                  Gestiona tu información personal y configuración de cuenta
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <Card className="lg:col-span-1 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary text-xl">
                        {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-1 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 rounded-full cursor-pointer transition-colors"
                    >
                      <Camera className="h-4 w-4 text-primary-foreground" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </div>

                  {/* Basic Info */}
                  <div className="text-center space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {profile.full_name}
                    </h3>
                    <Badge className={getRoleColor(profile.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-600" />

                  {/* Additional Info */}
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                      <span className="text-slate-800 dark:text-slate-100">{profile.email}</span>
                    </div>

                    {profile.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                        <span className="text-slate-800 dark:text-slate-100">{profile.phone}</span>
                      </div>
                    )}

                    {profile.company && (
                      <div className="flex items-center gap-3 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                        <span className="text-slate-800 dark:text-slate-100">{profile.company.name}</span>
                      </div>
                    )}

                    {profile.department && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: profile.department.color }} />
                        <span className="text-slate-800 dark:text-slate-100">{profile.department.name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                      <span className="text-slate-800 dark:text-slate-100">
                        Miembro desde {new Date(profile.created_at).toLocaleDateString("es-PE")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Form */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-slate-800 dark:text-slate-100">Información Personal</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Actualiza tu información personal y datos de contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-200">
                      Nombre Completo
                    </Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                      className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-slate-100 dark:bg-slate-600 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground">
                      El correo electrónico no se puede modificar
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 dark:text-slate-200">
                      Teléfono
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Número de teléfono"
                      className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-200">Rol</Label>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(profile.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {getRoleLabel(profile.role)}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground">
                        Contacta al administrador para cambiar tu rol
                      </span>
                    </div>
                  </div>

                  {profile.company && (
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-200">Empresa</Label>
                      <Input
                        value={`${profile.company.code} - ${profile.company.name}`}
                        disabled
                        className="bg-slate-100 dark:bg-slate-600 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                      />
                    </div>
                  )}

                  {profile.department && (
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-200">Departamento</Label>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted dark:bg-muted border border-border dark:border-border">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: profile.department.color }} />
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          {profile.department.name}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving || uploadingAvatar}
                      className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700 text-white"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
