"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>("Verificando...")
  const [user, setUser] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Test Supabase connection
      const { data, error } = await supabase.from("departments").select("*").limit(1)

      if (error) {
        setConnectionStatus(`Error de conexión: ${error.message}`)
        return
      }

      setConnectionStatus("✅ Conexión exitosa a Supabase")

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.log("No hay usuario autenticado:", userError.message)
      } else {
        setUser(user)
      }

      // Get departments
      const { data: depts } = await supabase.from("departments").select("*")
      setDepartments(depts || [])
    } catch (error) {
      setConnectionStatus(`Error: ${error}`)
    }
  }

  const createTestUser = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: "test@example.com",
        password: "123456789",
      })

      if (error) {
        alert(`Error creando usuario: ${error.message}`)
        return
      }

      alert("Usuario de prueba creado. Revisa tu email para confirmar.")
    } catch (error) {
      alert(`Error: ${error}`)
    }
  }

  const signInTestUser = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "123456789",
      })

      if (error) {
        alert(`Error iniciando sesión: ${error.message}`)
        return
      }

      alert("Sesión iniciada exitosamente")
      window.location.href = "/dashboard"
    } catch (error) {
      alert(`Error: ${error}`)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Página de Prueba</h1>

      <Card>
        <CardHeader>
          <CardTitle>Estado de Conexión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{connectionStatus}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuario Actual</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div>
              <p>
                <strong>ID:</strong> {user.id}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Confirmado:</strong> {user.email_confirmed_at ? "Sí" : "No"}
              </p>
            </div>
          ) : (
            <p>No hay usuario autenticado</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departamentos ({departments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length > 0 ? (
            <ul className="list-disc list-inside">
              {departments.map((dept) => (
                <li key={dept.id}>{dept.name}</li>
              ))}
            </ul>
          ) : (
            <p>No se encontraron departamentos</p>
          )}
        </CardContent>
      </Card>

      <div className="space-x-4">
        <Button onClick={createTestUser}>Crear Usuario de Prueba</Button>
        <Button onClick={signInTestUser} variant="outline">
          Iniciar Sesión con Usuario de Prueba
        </Button>
        <Button onClick={() => (window.location.href = "/login")} variant="secondary">
          Ir al Login
        </Button>
      </div>
    </div>
  )
}
