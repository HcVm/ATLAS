"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { signIn } = useAuth()
  const { toast } = useToast()

  const validateForm = () => {
    if (!email) {
      setError("El correo electrónico es requerido")
      return false
    }
    if (!email.includes("@")) {
      setError("Por favor ingresa un correo electrónico válido")
      return false
    }
    if (!password) {
      setError("La contraseña es requerida")
      return false
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return false
    }
    return true
  }

  const getErrorMessage = (error: any) => {
    if (!error) return "Error desconocido"

    const message = error.message || error.toString()

    if (message.includes("Invalid login credentials")) {
      return "❌ Credenciales incorrectas. Verifica tu email y contraseña."
    }
    if (message.includes("Email not confirmed")) {
      return "📧 Por favor confirma tu email antes de iniciar sesión."
    }
    if (message.includes("Too many requests")) {
      return "⏰ Demasiados intentos. Espera unos minutos antes de intentar nuevamente."
    }
    if (message.includes("User not found")) {
      return "👤 No existe una cuenta con este email."
    }
    if (message.includes("Invalid email")) {
      return "📧 El formato del email no es válido."
    }
    if (message.includes("Network")) {
      return "🌐 Error de conexión. Verifica tu internet."
    }

    return `❌ ${message}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        const errorMessage = getErrorMessage(error)
        setError(errorMessage)
        toast({
          title: "Error de inicio de sesión",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        })
      } else if (data.user) {
        toast({
          title: "✅ Bienvenido",
          description: "Has iniciado sesión correctamente",
          duration: 3000,
        })

        // Limpiar formulario
        setEmail("")
        setPassword("")
        setError("")

        // Redirigir después de un momento
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      toast({
        title: "Error inesperado",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-file-text"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M10 9H8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
            <CardDescription>Sistema de Seguimiento de Documentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError("")
                  }}
                  required
                  disabled={loading}
                  placeholder="tu@email.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError("")
                  }}
                  required
                  disabled={loading}
                  placeholder="Tu contraseña"
                  className="h-11"
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>

              <div className="text-center mt-4">
                <Button variant="link" onClick={() => router.push("/register")} disabled={loading}>
                  ¿No tienes cuenta? Regístrate
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
