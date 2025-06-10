"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Shield, Bell, Palette } from "lucide-react"

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      documentUpdates: true,
      systemAlerts: true,
    },
    security: {
      twoFactor: false,
      sessionTimeout: "30",
    },
    appearance: {
      darkMode: false,
      language: "es",
    },
  })

  const handleSave = async () => {
    setLoading(true)
    setMessage("")

    try {
      // Simular guardado de configuraciones
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessage("Configuraciones guardadas exitosamente")
    } catch (error) {
      console.error("Error saving settings:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Gestiona las configuraciones de tu cuenta</p>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6">
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
                checked={settings.notifications.email}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones push</Label>
                <p className="text-sm text-muted-foreground">Recibir notificaciones push en el navegador</p>
              </div>
              <Switch
                checked={settings.notifications.push}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, push: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Actualizaciones de documentos</Label>
                <p className="text-sm text-muted-foreground">Notificar cuando se actualicen documentos</p>
              </div>
              <Switch
                checked={settings.notifications.documentUpdates}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, documentUpdates: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas del sistema</Label>
                <p className="text-sm text-muted-foreground">Recibir alertas importantes del sistema</p>
              </div>
              <Switch
                checked={settings.notifications.systemAlerts}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, systemAlerts: checked },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad</p>
              </div>
              <Switch
                checked={settings.security.twoFactor}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, twoFactor: checked },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Tiempo de sesión (minutos)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, sessionTimeout: e.target.value },
                  })
                }
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Tiempo antes de cerrar sesión automáticamente por inactividad
              </p>
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">Usar tema oscuro en la aplicación</p>
              </div>
              <Switch
                checked={settings.appearance.darkMode}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, darkMode: checked },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <select
                id="language"
                value={settings.appearance.language}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, language: e.target.value },
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </CardContent>
        </Card>

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
