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
import { motion } from "framer-motion"
import { LetterheadManager } from "./_components/letterhead-manager"

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-6 pb-20 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
          Configuración
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Personaliza tu experiencia y gestiona tu cuenta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Appearance Settings */}
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <Monitor className="h-5 w-5 text-blue-500" />
                Apariencia
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Personaliza la apariencia de la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Tema</Label>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Selecciona tu tema preferido para la interfaz</p>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      onClick={() => setTheme("light")}
                      className={`h-auto p-4 flex flex-col items-center gap-3 transition-all duration-300 ${theme === "light"
                          ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2 dark:ring-offset-slate-950"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                    >
                      <Sun className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Claro</div>
                      </div>
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      onClick={() => setTheme("dark")}
                      className={`h-auto p-4 flex flex-col items-center gap-3 transition-all duration-300 ${theme === "dark"
                          ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2 dark:ring-offset-slate-950 dark:bg-white dark:text-slate-900 dark:ring-white"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                    >
                      <Moon className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Oscuro</div>
                      </div>
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      onClick={() => setTheme("system")}
                      className={`h-auto p-4 flex flex-col items-center gap-3 transition-all duration-300 ${theme === "system"
                          ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2 dark:ring-offset-slate-950 dark:bg-white dark:text-slate-900 dark:ring-white"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                    >
                      <Monitor className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">Sistema</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Settings */}
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-500" />
                Notificaciones
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Configura cómo y cuándo recibir notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Notificaciones por email</Label>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Recibe actualizaciones importantes en tu correo
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                />
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="space-y-0.5">
                  <Label className="text-slate-700 dark:text-slate-200 text-base font-medium">Notificaciones push</Label>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Recibe alertas en tiempo real en tu navegador
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                />
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              <div className="space-y-4">
                <Label className="text-slate-700 dark:text-slate-200 text-sm font-semibold uppercase tracking-wider pl-3">Por Módulo</Label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium">Documentos</Label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Creación y actualización de documentos</p>
                    </div>
                    <Switch
                      checked={notifications.documents}
                      onCheckedChange={(checked) => handleNotificationChange("documents", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium">Inventario</Label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Movimientos de stock y alertas de bajo stock</p>
                    </div>
                    <Switch
                      checked={notifications.movements}
                      onCheckedChange={(checked) => handleNotificationChange("movements", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium">Ventas</Label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Nuevas ventas, cotizaciones y clientes</p>
                    </div>
                    <Switch
                      checked={notifications.sales}
                      onCheckedChange={(checked) => handleNotificationChange("sales", checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Admin Settings */}
          {user?.role === "admin" && (
            <div className="space-y-8">
              <LetterheadManager />
            </div>
          )}

          {/* Data & Privacy */}
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-500" />
                Datos y Privacidad
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Información sobre la protección y uso de tus datos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <Alert className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                  <strong>Privacidad garantizada:</strong> Tus datos están protegidos con encriptación de nivel
                  empresarial. No compartimos información con terceros sin tu consentimiento.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium">
                        Encriptación Total
                      </Label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                        Datos almacenados con AES-256 y transmitidos vía HTTPS/TLS.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium">
                        Acceso Controlado
                      </Label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                        Acceso restringido únicamente a personal autorizado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium">Auditoría</Label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                        Registro detallado de todos los accesos y modificaciones.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-slate-700 dark:text-slate-200 text-sm font-medium">Respaldos Diarios</Label>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                        Backups automáticos con retención de 30 días.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Account Settings */}
          <Card className="border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-sm overflow-hidden h-fit">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                Cuenta
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Detalles de tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Registrado</Label>
                <p className="text-slate-900 dark:text-slate-100 font-medium mt-1">{user?.email}</p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rol & Permisos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/50">
                    {user?.role === "admin"
                      ? "Administrador"
                      : user?.role === "supervisor"
                        ? "Supervisor"
                        : "Usuario"}
                  </Badge>
                  {selectedCompany && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      {selectedCompany.name}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-900 dark:text-white font-medium">Exportar mis datos</Label>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 mb-3">
                    Descarga una copia de tu información personal en formato JSON.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="w-full justify-start border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isExporting ? "Generando archivo..." : "Descargar Datos"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200/50 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
              <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Zona de Peligro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-red-600 dark:text-red-300">
                La eliminación de cuenta es irreversible. Se perderán todos tus datos y configuraciones.
              </p>

              {user?.role === "admin" && (
                <div className="p-3 rounded bg-red-100/50 dark:bg-red-900/20 text-xs text-red-800 dark:text-red-200">
                  Las cuentas de administrador no pueden auto-eliminarse.
                </div>
              )}

              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                    disabled={user?.role === "admin"}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Eliminar Cuenta
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md border-red-200 dark:border-red-900">
                  <DialogHeader>
                    <DialogTitle className="text-red-700 dark:text-red-400">
                      ¿Eliminar cuenta permanentemente?
                    </DialogTitle>
                    <DialogDescription>
                      Esta acción no se puede deshacer. Por favor escribe tu email para confirmar.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Email de confirmación: <span className="font-bold select-all">{user?.email}</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder="tucorreo@ejemplo.com"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="border-red-200 focus:ring-red-500/20"
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
                      Eliminar Definitivamente
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
