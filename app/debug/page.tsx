"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugPage() {
  const [status, setStatus] = useState<any>({
    connection: "Verificando...",
    departments: [],
    users: [],
    profiles: [],
    authUser: null,
  })

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    try {
      // Test connection
      const { data: testData, error: testError } = await supabase.from("departments").select("count").single()

      if (testError) {
        setStatus((prev: any) => ({ ...prev, connection: `❌ Error: ${testError.message}` }))
        return
      }

      setStatus((prev: any) => ({ ...prev, connection: "✅ Conexión exitosa" }))

      // Get departments
      const { data: departments } = await supabase.from("departments").select("*")

      // Get profiles
      const { data: profiles } = await supabase.from("profiles").select(`
          *,
          departments (name)
        `)

      // Get current auth user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setStatus({
        connection: "✅ Conexión exitosa",
        departments: departments || [],
        profiles: profiles || [],
        authUser: user,
      })
    } catch (error) {
      setStatus((prev: any) => ({ ...prev, connection: `❌ Error: ${error}` }))
    }
  }

  const testLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@test.com",
        password: "123456789",
      })

      if (error) {
        alert(`Error: ${error.message}`)
      } else {
        alert("Login exitoso!")
        window.location.href = "/dashboard"
      }
    } catch (error) {
      alert(`Error: ${error}`)
    }
  }

  const createTestProfile = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: "test@example.com",
        password: "123456789",
        options: {
          data: {
            full_name: "Usuario de Prueba",
          },
        },
      })

      if (authError) {
        alert(`Error creando usuario: ${authError.message}`)
        return
      }

      alert("Usuario creado. El trigger debería crear el perfil automáticamente.")
      setTimeout(runDiagnostics, 2000)
    } catch (error) {
      alert(`Error: ${error}`)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Diagnóstico del Sistema</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Conexión</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{status.connection}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuario Autenticado</CardTitle>
          </CardHeader>
          <CardContent>
            {status.authUser ? (
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong> {status.authUser.email}
                </p>
                <p>
                  <strong>ID:</strong> {status.authUser.id}
                </p>
                <p>
                  <strong>Confirmado:</strong> {status.authUser.email_confirmed_at ? "Sí" : "No"}
                </p>
              </div>
            ) : (
              <p>No hay usuario autenticado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departamentos ({status.departments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {status.departments.length > 0 ? (
              <ul className="space-y-1">
                {status.departments.map((dept: any) => (
                  <li key={dept.id} className="text-sm">
                    {dept.name} - {dept.id}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay departamentos</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfiles ({status.profiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {status.profiles.length > 0 ? (
              <div className="space-y-2">
                {status.profiles.map((profile: any) => (
                  <div key={profile.id} className="p-2 border rounded text-sm">
                    <p>
                      <strong>{profile.full_name}</strong> ({profile.role})
                    </p>
                    <p>{profile.email}</p>
                    <p>Depto: {profile.departments?.name || "Sin departamento"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No hay perfiles</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-x-4">
        <Button onClick={testLogin}>Probar Login Admin</Button>
        <Button onClick={createTestProfile} variant="outline">
          Crear Usuario de Prueba
        </Button>
        <Button onClick={runDiagnostics} variant="secondary">
          Actualizar Diagnóstico
        </Button>
      </div>

      {status.profiles.length === 0 && status.departments.length > 0 && (
        <Alert>
          <AlertDescription>
            Hay departamentos pero no hay perfiles. Esto sugiere que el trigger no está funcionando o que no se han
            creado usuarios.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
