"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Save, Shield, Bell, Palette, Eye, Activity, Clock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface UserSettings {
  notifications_email: boolean
  notifications_push: boolean
  notifications_document_updates: boolean
  notifications_system_alerts: boolean
  security_two_factor: boolean
  security_session_timeout: number
  appearance_dark_mode: boolean
  appearance_language: string
  privacy_profile_visibility: string
  privacy_activity_tracking: boolean
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [settings, setSettings] = useState<UserSettings>({
    notifications_email: true,
    notifications_push: false,
    notifications_document_updates: true,
    notifications_system_alerts: true,
    security_two_factor: false,
    security_session_timeout: 30,
    appearance_dark_mode: false,
    appearance_language: "es",
    privacy_profile_visibility: "department",
    privacy_activity_tracking: true,
  })

  useEffect(() => {
    if (user) {
      loadUserSettings()
    }
  }, [user])

  const loadUserSettings = async () => {
    try {
      setInitialLoading(true)

      const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user?.id).maybeSingle()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setSettings({
          notifications_email: data.notifications_email,
          notifications_push: data.notifications_push,
          notifications_document_updates: data.notifications_document_updates,
          notifications_system_alerts: data.notifications_system_alerts,
          security_two_factor: data.security_two_factor,
          security_session_timeout: data.security_session_timeout,
          appearance_dark_mode: data.appearance_dark_mode,
          appearance_language: data.appearance_language,
          privacy_profile_visibility: data.privacy_profile_visibility,
          privacy_activity_tracking: data.privacy_activity_tracking,
        })
      } else {
        // Crear configuraciones por defecto si no existen
        await createDefaultSettings()
      }
    } catch (error: any) {
      console.error("Error loading settings:", error)
      toast({
        title: "Error",
        description: "Error al cargar configuraciones: " + error.message,
        variant: "destructive",
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const createDefaultSettings = async () => {
    try {
      const { error } = await supabase.from("user_settings").insert({
        user_id: user?.id,
        ...settings,
      })

      if (error) throw error
    } catch (error: any) {
      console.error("Error creating default settings:", error)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        ...settings,
      })

      if (error) throw error

      setMessage("Configuraciones guardadas exitosamente")
      toast({
        title: "Éxito",
        description: "Configuraciones guardadas correctamente",
      })
    } catch (error: any) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Error al guardar configuraciones: " + error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  if (initialLoading) {
    return <div>Cargando configuraciones...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Gestiona las configuraciones de tu cuenta y seguridad</p>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notificaciones
            </CardTitle>
            <CardDescription>Configura cómo quieres recibir notificaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones por email</Label>
                <p className="text-sm text-muted-foreground">Recibir notificaciones por correo electrónico</p>
              </div>
              <Switch
                checked={settings.notifications_email}
                onCheckedChange={(checked) => updateSetting("notifications_email", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones push</Label>
                <p className="text-sm text-muted-foreground">Recibir notificaciones push en el navegador</p>
              </div>
              <Switch
                checked={settings.notifications_push}
                onCheckedChange={(checked) => updateSetting("notifications_push", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Actualizaciones de documentos</Label>
                <p className="text-sm text-muted-foreground">Notificar cuando se actualicen documentos</p>
              </div>
              <Switch
                checked={settings.notifications_document_updates}
                onCheckedChange={(checked) => updateSetting("notifications_document_updates", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas del sistema</Label>
                <p className="text-sm text-muted-foreground">Recibir alertas importantes del sistema</p>
              </div>
              <Switch
                checked={settings.notifications_system_alerts}
                onCheckedChange={(checked) => updateSetting("notifications_system_alerts", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seguridad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Seguridad
            </CardTitle>
            <CardDescription>Configura las opciones de seguridad de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticación de dos factores</Label>
                <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad (próximamente)</p>
              </div>
              <Switch
                checked={settings.security_two_factor}
                onCheckedChange={(checked) => updateSetting("security_two_factor", checked)}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Tiempo de sesión (minutos)
              </Label>
              <Select
                value={settings.security_session_timeout.toString()}
                onValueChange={(value) => updateSetting("security_session_timeout", Number.parseInt(value))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="480">8 horas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Tiempo antes de cerrar sesión automáticamente por inactividad
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Privacidad
            </CardTitle>
            <CardDescription>Controla la visibilidad de tu información</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Visibilidad del perfil</Label>
              <Select
                value={settings.privacy_profile_visibility}
                onValueChange={(value) => updateSetting("privacy_profile_visibility", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público - Visible para todos</SelectItem>
                  <SelectItem value="department">Departamento - Solo mi departamento</SelectItem>
                  <SelectItem value="private">Privado - Solo yo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Controla quién puede ver tu información de perfil</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Seguimiento de actividad
                </Label>
                <p className="text-sm text-muted-foreground">Permitir el registro de tu actividad en el sistema</p>
              </div>
              <Switch
                checked={settings.privacy_activity_tracking}
                onCheckedChange={(checked) => updateSetting("privacy_activity_tracking", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Apariencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="h-5 w-5 mr-2" />
              Apariencia
            </CardTitle>
            <CardDescription>Personaliza la apariencia de la aplicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo oscuro</Label>
                <p className="text-sm text-muted-foreground">Usar tema oscuro en la aplicación (próximamente)</p>
              </div>
              <Switch
                checked={settings.appearance_dark_mode}
                onCheckedChange={(checked) => updateSetting("appearance_dark_mode", checked)}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select
                value={settings.appearance_language}
                onValueChange={(value) => updateSetting("appearance_language", value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              "Guardando..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
