"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const checkStatus = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      // Verificar usuario actual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      let statusMessage = `📊 Estado del Sistema:\n\n`

      if (userError) {
        statusMessage += `❌ Error de autenticación: ${userError.message}\n`
      } else if (user) {
        statusMessage += `👤 Usuario autenticado: ${user.email}\n`
        statusMessage += `🆔 User ID: ${user.id}\n`

        // Verificar perfiles para este usuario
        const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id)

        if (profileError) {
          statusMessage += `❌ Error verificando perfil: ${profileError.message}\n`
        } else {
          statusMessage += `📋 Perfiles encontrados: ${profiles?.length || 0}\n`

          if (profiles && profiles.length > 0) {
            profiles.forEach((profile, index) => {
              statusMessage += `  Perfil ${index + 1}: ${profile.full_name} (${profile.role})\n`
            })
          }
        }
      } else {
        statusMessage += `👤 No hay usuario autenticado\n`
      }

      // Verificar departamentos
      const { data: departments, error: deptError } = await supabase.from("departments").select("id, name")

      if (deptError) {
        statusMessage += `❌ Error verificando departamentos: ${deptError.message}\n`
      } else {
        statusMessage += `📁 Departamentos: ${departments?.length || 0}\n`
        if (departments && departments.length > 0) {
          departments.forEach((dept) => {
            statusMessage += `  - ${dept.name}\n`
          })
        }
      }

      // Verificar todos los perfiles en el sistema
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")

      if (!allProfilesError && allProfiles) {
        statusMessage += `\n👥 Total de usuarios en el sistema: ${allProfiles.length}\n`
        allProfiles.forEach((profile) => {
          statusMessage += `  - ${profile.email} (${profile.role})\n`
        })
      }

      setMessage(statusMessage)
    } catch (err) {
      setError(`Error: ${err}`)
    }

    setLoading(false)
  }

  const cleanDuplicates = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("No hay usuario autenticado")
        setLoading(false)
        return
      }

      // Obtener todos los perfiles para este usuario
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .order("created_at", { ascending: false })

      if (profileError) {
        setError(`Error obteniendo perfiles: ${profileError.message}`)
        setLoading(false)
        return
      }

      if (!profiles || profiles.length <= 1) {
        setMessage("No hay perfiles duplicados para limpiar")
        setLoading(false)
        return
      }

      // Mantener el más reciente y eliminar los demás
      const keepProfile = profiles[0]
      const duplicateIds = profiles.slice(1).map((p) => p.id)

      // Esto no funcionará porque todos tienen el mismo ID
      // En su lugar, necesitamos una estrategia diferente
      setMessage(
        `Se encontraron ${profiles.length} perfiles. Esto indica un problema en la base de datos que requiere intervención manual.`,
      )
    } catch (err) {
      setError(`Error: ${err}`)
    }

    setLoading(false)
  }

  const createAdminUser = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: "admin@test.com",
        password: "123456789",
        options: {
          data: {
            full_name: "Administrador de Prueba",
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setMessage("✅ El usuario admin@test.com ya existe. Puedes intentar hacer login.")
        } else {
          setError(`Error creando usuario: ${signUpError.message}`)
        }
        setLoading(false)
        return
      }

      if (data.user) {
        setMessage(
          `✅ Usuario admin creado exitosamente!\n\nEmail: admin@test.com\nContraseña: 123456789\n\n⚠️ Revisa tu email para confirmar la cuenta antes de hacer login.`,
        )
      }
    } catch (err) {
      setError(`Error: ${err}`)
    }

    setLoading(false)
  }

  const testLogin = async () => {
    setLoading(true)
    setMessage("")
    setError("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@test.com",
        password: "123456789",
      })

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError(
            `❌ Email no confirmado. Ve a tu bandeja de entrada y confirma el email antes de hacer login.\n\nO puedes deshabilitar la confirmación de email en Supabase Dashboard > Authentication > Settings.`,
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
    } catch (err) {
      setError(`Error: ${err}`)
    }

    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Configuración y Diagnóstico del Sistema</CardTitle>
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
              <h3 className="text-lg font-semibold mb-2">Diagnóstico Completo</h3>
              <Button onClick={checkStatus} disabled={loading} variant="outline" className="w-full">
                {loading ? "Verificando..." : "Verificar Estado Completo del Sistema"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Limpiar Duplicados</h3>
              <Button onClick={cleanDuplicates} disabled={loading} variant="outline" className="w-full">
                {loading ? "Limpiando..." : "Limpiar Perfiles Duplicados"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Crear Usuario Admin</h3>
              <Button onClick={createAdminUser} disabled={loading} className="w-full">
                {loading ? "Creando..." : "Crear Usuario Administrador"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Probar Login</h3>
              <Button onClick={testLogin} disabled={loading} variant="secondary" className="w-full">
                {loading ? "Probando..." : "Probar Login con Usuario Admin"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Button onClick={() => (window.location.href = "/login")} variant="outline" className="w-full">
                Ir al Login
              </Button>
              <Button onClick={() => (window.location.href = "/register")} variant="outline" className="w-full">
                Ir al Registro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
