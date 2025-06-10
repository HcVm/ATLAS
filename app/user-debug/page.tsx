"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function UserDebugPage() {
  const { user, loading } = useAuth()
  const [authUser, setAuthUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [allProfiles, setAllProfiles] = useState<any[]>([])

  useEffect(() => {
    if (!loading) {
      fetchUserData()
    }
  }, [loading])

  const fetchUserData = async () => {
    try {
      // Get auth user
      const {
        data: { user: authUserData },
      } = await supabase.auth.getUser()
      setAuthUser(authUserData)

      // Get profile
      if (authUserData) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUserData.id).single()
        setProfile(profileData)
      }

      // Get all profiles for debugging
      const { data: allProfilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
      setAllProfiles(allProfilesData || [])
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  const updateUserRole = async () => {
    if (!authUser) return

    try {
      const { error } = await supabase.from("profiles").update({ role: "admin" }).eq("id", authUser.id)

      if (error) throw error

      alert("Rol actualizado a admin")
      fetchUserData()
      // Refresh the page to update the auth context
      window.location.reload()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Diagnóstico de Usuario</h1>

      <Card>
        <CardHeader>
          <CardTitle>Usuario desde useAuth Hook</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : user ? (
            <div className="space-y-2">
              <p>
                <strong>ID:</strong> {user.id}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Nombre:</strong> {user.full_name}
              </p>
              <p>
                <strong>Rol:</strong> <span className="font-bold text-lg">{user.role}</span>
              </p>
              <p>
                <strong>Departamento ID:</strong> {user.department_id}
              </p>
            </div>
          ) : (
            <p>No hay usuario en useAuth</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuario de Supabase Auth</CardTitle>
        </CardHeader>
        <CardContent>
          {authUser ? (
            <div className="space-y-2">
              <p>
                <strong>ID:</strong> {authUser.id}
              </p>
              <p>
                <strong>Email:</strong> {authUser.email}
              </p>
              <p>
                <strong>Confirmado:</strong> {authUser.email_confirmed_at ? "Sí" : "No"}
              </p>
              <p>
                <strong>Metadata:</strong> {JSON.stringify(authUser.user_metadata, null, 2)}
              </p>
            </div>
          ) : (
            <p>No hay usuario autenticado</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfil en Base de Datos</CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-2">
              <p>
                <strong>ID:</strong> {profile.id}
              </p>
              <p>
                <strong>Email:</strong> {profile.email}
              </p>
              <p>
                <strong>Nombre:</strong> {profile.full_name}
              </p>
              <p>
                <strong>Rol:</strong> <span className="font-bold text-lg">{profile.role}</span>
              </p>
              <p>
                <strong>Departamento ID:</strong> {profile.department_id}
              </p>
              <p>
                <strong>Creado:</strong> {profile.created_at}
              </p>
            </div>
          ) : (
            <p>No se encontró perfil en la base de datos</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Perfiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allProfiles.map((p) => (
              <div key={p.id} className="p-2 border rounded">
                <p>
                  <strong>{p.email}</strong> - {p.full_name} - <span className="font-bold">{p.role}</span>
                </p>
                <p className="text-sm text-gray-600">ID: {p.id}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {authUser && (
        <div className="space-y-4">
          <Button onClick={updateUserRole} className="w-full">
            Actualizar mi rol a Admin
          </Button>

          <Button onClick={() => (window.location.href = "/dashboard")} variant="outline" className="w-full">
            Ir al Dashboard
          </Button>
        </div>
      )}

      {user?.role !== "admin" && (
        <Alert variant="destructive">
          <AlertDescription>
            Tu rol actual es "{user?.role}" pero necesitas ser "admin" para acceder a ciertas funciones. Usa el botón de
            arriba para actualizar tu rol.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
