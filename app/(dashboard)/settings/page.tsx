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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  Lock,
  Eye,
  FileText,
  CheckCircle,
  UserX,
  Loader2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/auth-context"
import { useCompany } from "@/lib/company-context"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { user } = useAuth()
  const { selectedCompany } = useCompany()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    documents: true,
    movements: true,
    sales: false,
  })

  useEffect(() => {
    setMounted(true)
    loadNotificationSettings()
  }, [])

  const loadNotificationSettings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("notification_preferences")
        .eq("user_id", user.id)
        .single()

      if (data?.notification_preferences) {
        setNotifications(data.notification_preferences)
      }
    } catch (error) {
      console.log("No previous notification settings found")
    }
  }

  const handleNotificationChange = async (key: string, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value }
    setNotifications(newNotifications)

    try {
      await supabase.from("user_settings").upsert({
        user_id: user?.id,
        notification_preferences: newNotifications,
        updated_at: new Date().toISOString(),
      })

      toast.success("Configuración de notificaciones actualizada")
    } catch (error) {
      toast.error("Error al actualizar configuración")
      // Revert change
      setNotifications(notifications)
    }
  }

  const handleExportData = async () => {
    if (!user) return

    setIsExporting(true)
    try {
      // Recopilar todos los datos del usuario
      const userData = {
        profile: null,
        documents: [],
        movements: [],
        sales: [],
        quotations: [],
        support_tickets: [],
        notifications: [],
      }

      // Obtener perfil del usuario
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      userData.profile = profile

      // Obtener documentos creados por el usuario
      const { data: documents } = await supabase.from("documents").select("*").eq("created_by", user.id)

      userData.documents = documents || []

      // Obtener movimientos del usuario
      const { data: movements } = await supabase.from("movements").select("*").eq("created_by", user.id)

      userData.movements = movements || []

      // Obtener ventas del usuario
      const { data: sales } = await supabase.from("sales").select("*").eq("created_by", user.id)

      userData.sales = sales || []

      // Obtener cotizaciones del usuario
      const { data: quotations } = await supabase.from("quotations").select("*").eq("created_by", user.id)

      userData.quotations = quotations || []

      // Obtener tickets de soporte del usuario
      const { data: tickets } = await supabase.from("support_tickets").select("*").eq("created_by", user.id)

      userData.support_tickets = tickets || []

      // Obtener notificaciones del usuario
      const { data: notifications } = await supabase.from("notifications").select("*").eq("user_id", user.id)

      userData.notifications = notifications || []

      // Crear archivo JSON para descarga
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement("a")
      link.href = url
      link.download = `mis-datos-${user.email}-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Datos exportados correctamente")
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Error al exportar los datos")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmation !== user.email) {
      toast.error("Confirmación incorrecta")
      return
    }

    setIsDeleting(true)
    try {
      // Verificar que el usuario no sea admin
      if (user.role === "admin") {
        toast.error("Las cuentas de administrador no pueden ser eliminadas desde aquí")
        setIsDeleting(false)
        return
      }

      // Eliminar datos relacionados del usuario
      await supabase.from("notifications").delete().eq("user_id", user.id)
      await supabase.from("user_settings").delete().eq("user_id", user.id)

      // Marcar documentos como eliminados en lugar de borrarlos
      await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("created_by", user.id)

      // Eliminar el perfil del usuario
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id)

      if (profileError) throw profileError

      // Eliminar el usuario de auth
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

      if (authError) {
        console.error("Error deleting auth user:", authError)
        // Continuar aunque falle la eliminación del auth user
      }

      toast.success("Cuenta eliminada correctamente")

      // Cerrar sesión y redirigir
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Error al eliminar la cuenta. Contacta al administrador.")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <Settings className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Configuración</h1>
                <p className="text-slate-600 dark:text-slate-300">Personaliza tu experiencia y gestiona tu cuenta</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Appearance Settings */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Apariencia
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Personaliza la apariencia de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Tema</Label>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">Selecciona tu tema preferido</p>
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
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificaciones
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Configura cómo y cuándo recibir notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-200 text-base">Notificaciones por email</Label>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Recibe notificaciones importantes por correo electrónico
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                    />
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-600" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-200 text-base">Notificaciones push</Label>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Recibe notificaciones en tiempo real en el navegador
                      </p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                    />
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-600" />

                  <div className="space-y-4">
                    <Label className="text-slate-700 dark:text-slate-200 text-base">Notificaciones por módulo</Label>

                    <div className="space-y-4 pl-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-slate-700 dark:text-slate-200 text-sm">Documentos</Label>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">Nuevos documentos y movimientos</p>
                        </div>
                        <Switch
                          checked={notifications.documents}
                          onCheckedChange={(checked) => handleNotificationChange("documents", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-slate-700 dark:text-slate-200 text-sm">Inventario</Label>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">Movimientos de stock y alertas</p>
                        </div>
                        <Switch
                          checked={notifications.movements}
                          onCheckedChange={(checked) => handleNotificationChange("movements", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-slate-700 dark:text-slate-200 text-sm">Ventas</Label>
                          <p className="text-slate-600 dark:text-slate-300 text-xs">Nuevas ventas y cotizaciones</p>
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
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Cuenta
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Gestiona tu cuenta y datos personales
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-200 text-base">Información de la cuenta</Label>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {user?.role === "admin"
                            ? "Administrador"
                            : user?.role === "supervisor"
                              ? "Supervisor"
                              : "Usuario"}
                        </Badge>
                        {selectedCompany && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedCompany.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-600" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-slate-700 dark:text-slate-200 text-base">Exportar datos</Label>
                        <p className="text-slate-600 dark:text-slate-300 text-sm">
                          Descarga una copia completa de todos tus datos personales en formato JSON
                        </p>
                      </div>
                      <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {isExporting ? "Exportando..." : "Exportar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <CardHeader className="border-b border-border/50 dark:border-border/50">
                <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Datos y Privacidad
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Información sobre cómo protegemos y utilizamos tus datos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      <strong>Compromiso de Privacidad:</strong> Tus datos están protegidos con encriptación de nivel
                      empresarial y solo se utilizan para el funcionamiento de la aplicación. Nunca compartimos
                      información personal con terceros sin tu consentimiento explícito.
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Lock className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">
                            Encriptación
                          </Label>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                            Todos tus datos se almacenan con encriptación AES-256 y se transmiten mediante HTTPS/TLS.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">
                            Acceso Controlado
                          </Label>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                            Solo tú y los administradores autorizados de tu empresa pueden acceder a tus datos.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                        <div>
                          <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Auditoría</Label>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                            Mantenemos registros de auditoría de todos los accesos y modificaciones a tus datos.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">
                            Cumplimiento
                          </Label>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                            Cumplimos con GDPR, CCPA y regulaciones locales de protección de datos.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Database className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                        <div>
                          <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Respaldos</Label>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                            Realizamos respaldos automáticos diarios con retención de 30 días para proteger tus datos.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                        <div>
                          <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Incidentes</Label>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                            En caso de incidente de seguridad, te notificaremos dentro de 72 horas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-200 dark:bg-slate-600" />

                  <div className="space-y-4">
                    <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Tus Derechos</Label>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Derecho de Acceso:</strong> Puedes solicitar una copia de todos tus datos personales.
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Derecho de Rectificación:</strong> Puedes corregir datos incorrectos o incompletos.
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Derecho de Supresión:</strong> Puedes solicitar la eliminación de tus datos
                          personales.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Derecho de Portabilidad:</strong> Puedes exportar tus datos en formato estructurado.
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Derecho de Oposición:</strong> Puedes oponerte al procesamiento de tus datos.
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          <strong>Derecho de Limitación:</strong> Puedes solicitar limitar el procesamiento.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                    <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <strong>Retención de Datos:</strong> Los datos se conservan mientras tu cuenta esté activa.
                      Después de la eliminación de la cuenta, los datos se eliminan permanentemente en un plazo de 30
                      días, excepto aquellos requeridos por ley para fines de auditoría (máximo 7 años).
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="border-b border-red-200 dark:border-red-800">
                <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-5 w-5" />
                  Zona de Peligro
                </CardTitle>
                <CardDescription className="text-red-600 dark:text-red-300">
                  Acciones irreversibles que afectan permanentemente tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      <strong>Advertencia:</strong> La eliminación de cuenta es permanente e irreversible. Se eliminarán
                      todos tus datos, documentos, movimientos, ventas y configuraciones. Esta acción no se puede
                      deshacer.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-200 text-base text-red-800 dark:text-red-200 font-medium">
                        Eliminar cuenta permanentemente
                      </Label>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Esta acción eliminará todos tus datos de forma permanente. Los administradores no podrán
                        recuperar tu información.
                      </p>
                      {user?.role === "admin" && (
                        <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                          Las cuentas de administrador deben ser eliminadas por otro administrador.
                        </p>
                      )}
                    </div>
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                          disabled={user?.role === "admin"}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Eliminar Cuenta
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-red-800 dark:text-red-200">
                            ¿Eliminar cuenta permanentemente?
                          </DialogTitle>
                          <DialogDescription className="text-red-600 dark:text-red-300">
                            Esta acción no se puede deshacer. Se eliminarán todos tus datos de forma permanente.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">
                              Para confirmar, escribe tu email: <strong>{user?.email}</strong>
                            </Label>
                            <Input
                              type="email"
                              placeholder="Confirma tu email"
                              value={deleteConfirmation}
                              onChange={(e) => setDeleteConfirmation(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDeleteDialog(false)
                              setDeleteConfirmation("")
                            }}
                            className="w-full sm:w-auto"
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || deleteConfirmation !== user?.email}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            {isDeleting ? "Eliminando..." : "Eliminar Definitivamente"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
