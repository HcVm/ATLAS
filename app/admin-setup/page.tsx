"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [email, setEmail] = useState("admin@test.com")

  const updateUserRole = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      // Actualizar el rol del usuario a admin
      const { data, error } = await supabase.from("profiles").update({ role: "admin" }).eq("email", email).select()

      if (error) {
        throw new Error(`Error actualizando rol: ${error.message}`)
      }

      if (data && data.length > 0) {
        setMessage(`✅ Usuario ${email} actualizado a rol admin exitosamente`)
      } else {
        setError(`❌ No se encontró usuario con email ${email}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkAdminUsers = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("email, full_name, role, created_at")
        .eq("role", "admin")

      if (error) {
        throw new Error(`Error consultando admins: ${error.message}`)
      }

      if (data && data.length > 0) {
        const adminList = data.map((admin) => `- ${admin.email} (${admin.full_name})`).join("\n")
        setMessage(`👥 Administradores encontrados:\n${adminList}`)
      } else {
        setMessage("⚠️ No se encontraron administradores en el sistema")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createSuperAdmin = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      // Crear un nuevo usuario super admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "superadmin@test.com",
        password: "admin123456",
        options: {
          data: {
            full_name: "Super Administrador",
          },
        },
      })

      if (authError) {
        if (authError.message.includes("already registered")) {
          // Si ya existe, intentar actualizar su rol
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ role: "admin" })
            .eq("email", "superadmin@test.com")

          if (updateError) {
            throw new Error(`Error actualizando usuario existente: ${updateError.message}`)
          }

          setMessage("✅ Usuario superadmin@test.com ya existe y fue actualizado a admin")
        } else {
          throw new Error(`Error creando usuario: ${authError.message}`)
        }
      } else {
        // Esperar un momento para que el trigger cree el perfil
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Actualizar el rol a admin
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ role: "admin" })
          .eq("email", "superadmin@test.com")

        if (updateError) {
          console.error("Error actualizando rol:", updateError)
        }

        setMessage(`✅ Super admin creado exitosamente:
Email: superadmin@test.com
Contraseña: admin123456
Rol: admin

⚠️ Confirma el email antes de hacer login.`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testAdminLogin = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "superadmin@test.com",
        password: "admin123456",
      })

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError(
            "❌ Email no confirmado. Ve a Supabase Dashboard > Authentication > Users y confirma manualmente el email del usuario.",
          )
        } else {
          setError(`Error en login: ${error.message}`)
        }
      } else {
        setMessage("✅ Login exitoso! Redirigiendo al dashboard...")
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Administrador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <AlertDescription className="whitespace-pre-line">{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Actualizar Rol de Usuario Existente</h3>
              <div className="space-y-2">
                <Label htmlFor="email">Email del usuario</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@test.com"
                />
              </div>
              <Button onClick={updateUserRole} disabled={loading} className="w-full mt-2">
                {loading ? "Actualizando..." : "Actualizar a Admin"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Verificar Administradores</h3>
              <Button onClick={checkAdminUsers} disabled={loading} variant="outline" className="w-full">
                {loading ? "Verificando..." : "Ver Administradores Actuales"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Crear Super Administrador</h3>
              <Button onClick={createSuperAdmin} disabled={loading} className="w-full">
                {loading ? "Creando..." : "Crear Super Admin"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Probar Login de Super Admin</h3>
              <Button onClick={testAdminLogin} disabled={loading} variant="secondary" className="w-full">
                {loading ? "Probando..." : "Probar Login Super Admin"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Button onClick={() => (window.location.href = "/login")} variant="outline" className="w-full">
                Ir al Login
              </Button>
              <Button onClick={() => (window.location.href = "/dashboard")} variant="outline" className="w-full">
                Ir al Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
