"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Shield,
  Database,
  Download,
  Trash2,
  AlertTriangle,
  Info,
  Monitor,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    documents: true,
    movements: true,
    sales: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
    toast.success("Configuración de notificaciones actualizada")
  }

  const handleExportData = () => {
    toast.info("Función de exportación en desarrollo")
  }

  const handleDeleteAccount = () => {
    toast.error("Esta acción requiere confirmación del administrador")
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-background via-background to-muted/20 dark:from-background dark:via-background dark:to-muted/10 min-h-screen p-6">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <Settings className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Configuración</h1>
                <p className="text-muted-foreground dark:text-muted-foreground">
                  Personaliza tu experiencia y gestiona tu cuenta
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Appearance Settings */}
            <Card className="border-border/50 dark:border-border/50 bg-card/95 dark:bg-card/95">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-card-foreground dark:text-card-foreground flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Apariencia
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                  Personaliza la apariencia de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-card-foreground dark:text-card-foreground text-base font-medium">Tema</Label>
                    <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-3">
                      Selecciona tu tema preferido
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        onClick={() => setTheme("light")}
                        className="flex items-center gap-2 h-auto p-4"
                      >
                        <Sun className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">Claro</div>
                          <div className="text-xs opacity-70">Tema claro</div>
                        </div>
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        onClick={() => setTheme("dark")}
                        className="flex items-center gap-2 h-auto p-4"
                      >
                        <Moon className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">Oscuro</div>
                          <div className="text-xs opacity-70">Tema oscuro</div>
                        </div>
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        onClick={() => setTheme("system")}
                        className="flex items-center gap-2 h-auto p-4"
                      >
                        <Monitor className="h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">Sistema</div>
                          <div className="text-xs opacity-70">Auto</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Settings */}
            <Card className="border-border/50 dark:border-border/50 bg-card/95 dark:bg-card/95">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-card-foreground dark:text-card-foreground flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificaciones
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                  Configura cómo y cuándo recibir notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-card-foreground dark:text-card-foreground text-base">
                        Notificaciones por email
                      </Label>
                      <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                        Recibe notificaciones importantes por correo electrónico
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                    />
                  </div>

                  <Separator className="bg-border dark:bg-border" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-card-foreground dark:text-card-foreground text-base">
                        Notificaciones push
                      </Label>
                      <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                        Recibe notificaciones en tiempo real en el navegador
                      </p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                    />
                  </div>

                  <Separator className="bg-border dark:bg-border" />

                  <div className="space-y-4">
                    <Label className="text-card-foreground dark:text-card-foreground text-base">
                      Notificaciones por módulo
                    </Label>

                    <div className="space-y-4 pl-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-card-foreground dark:text-card-foreground text-sm">Documentos</Label>
                          <p className="text-muted-foreground dark:text-muted-foreground text-xs">
                            Nuevos documentos y movimientos
                          </p>
                        </div>
                        <Switch
                          checked={notifications.documents}
                          onCheckedChange={(checked) => handleNotificationChange("documents", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-card-foreground dark:text-card-foreground text-sm">Inventario</Label>
                          <p className="text-muted-foreground dark:text-muted-foreground text-xs">
                            Movimientos de stock y alertas
                          </p>
                        </div>
                        <Switch
                          checked={notifications.movements}
                          onCheckedChange={(checked) => handleNotificationChange("movements", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-card-foreground dark:text-card-foreground text-sm">Ventas</Label>
                          <p className="text-muted-foreground dark:text-muted-foreground text-xs">
                            Nuevas ventas y cotizaciones
                          </p>
                        </div>
                        <Switch
                          checked={notifications.sales}
                          onCheckedChange={(checked) => handleNotificationChange("sales", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card className="border-border/50 dark:border-border/50 bg-card/95 dark:bg-card/95">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-card-foreground dark:text-card-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Cuenta
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                  Gestiona tu cuenta y datos personales
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-card-foreground dark:text-card-foreground text-base">
                        Información de la cuenta
                      </Label>
                      <p className="text-muted-foreground dark:text-muted-foreground text-sm">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {user?.role === "admin"
                            ? "Administrador"
                            : user?.role === "supervisor"
                              ? "Supervisor"
                              : "Usuario"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border dark:bg-border" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-card-foreground dark:text-card-foreground text-base">
                          Exportar datos
                        </Label>
                        <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                          Descarga una copia de tus datos personales
                        </p>
                      </div>
                      <Button variant="outline" onClick={handleExportData}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card className="border-border/50 dark:border-border/50 bg-card/95 dark:bg-card/95">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-card-foreground dark:text-card-foreground flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Datos y Privacidad
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                  Controla cómo se utilizan tus datos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      Tus datos están protegidos y solo se utilizan para el funcionamiento de la aplicación. No
                      compartimos información personal con terceros.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-card-foreground dark:text-card-foreground text-base">
                        Retención de datos
                      </Label>
                      <p className="text-muted-foreground dark:text-muted-foreground text-sm mt-1">
                        Los datos se conservan mientras tu cuenta esté activa y por un período adicional según las
                        políticas de la empresa.
                      </p>
                    </div>

                    <div>
                      <Label className="text-card-foreground dark:text-card-foreground text-base">
                        Cookies y seguimiento
                      </Label>
                      <p className="text-muted-foreground dark:text-muted-foreground text-sm mt-1">
                        Utilizamos cookies esenciales para el funcionamiento de la aplicación. No utilizamos cookies de
                        seguimiento publicitario.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="border-b border-red-200 dark:border-red-800">
                <CardTitle className="text-card-foreground dark:text-card-foreground flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-5 w-5" />
                  Zona de Peligro
                </CardTitle>
                <CardDescription className="text-red-600 dark:text-red-300">
                  Acciones irreversibles que afectan tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-card-foreground dark:text-card-foreground text-base text-red-800 dark:text-red-200">
                        Eliminar cuenta
                      </Label>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Esta acción no se puede deshacer. Todos tus datos serán eliminados permanentemente.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Cuenta
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
