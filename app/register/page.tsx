"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const validateForm = () => {
    if (!fullName.trim()) {
      toast({
        title: "❌ Error",
        description: "El nombre completo es requerido",
        variant: "destructive",
        duration: 5000,
      })
      return false
    }

    if (!email.trim()) {
      toast({
        title: "❌ Error",
        description: "El email es requerido",
        variant: "destructive",
        duration: 5000,
      })
      return false
    }

    if (!email.includes("@")) {
      toast({
        title: "❌ Error",
        description: "Por favor ingresa un email válido",
        variant: "destructive",
        duration: 5000,
      })
      return false
    }

    if (!password) {
      toast({
        title: "❌ Error",
        description: "La contraseña es requerida",
        variant: "destructive",
        duration: 5000,
      })
      return false
    }

    if (password.length < 6) {
      toast({
        title: "❌ Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
        duration: 5000,
      })
      return false
    }

    if (password !== confirmPassword) {
      toast({
        title: "❌ Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
        duration: 5000,
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsLoading(true)

      // Registrar usuario con Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
        },
      })

      if (error) {
        console.error("Error de registro:", error)

        let errorMessage = "No se pudo completar el registro"
        if (error.message.includes("User already registered")) {
          errorMessage = "Ya existe una cuenta con este email"
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "El formato del email no es válido"
        } else if (error.message.includes("Password")) {
          errorMessage = "La contraseña no cumple con los requisitos"
        }

        toast({
          title: "❌ Error de registro",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      if (data.user) {
        toast({
          title: "✅ Registro exitoso",
          description:
            "Tu cuenta ha sido creada. Por favor verifica tu email y espera a que un administrador te asigne un departamento.",
          duration: 8000,
        })

        // Limpiar formulario
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setFullName("")
        setPhone("")

        // Redirigir después de un momento
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (error: any) {
      console.error("Error inesperado:", error)
      toast({
        title: "❌ Error",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Crear cuenta</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus datos para registrarte. Un administrador te asignará un departamento después.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo *</Label>
              <Input
                id="fullName"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
              <strong>Nota:</strong> Después del registro, un administrador te asignará un departamento. Recibirás una
              notificación cuando tu cuenta esté completamente configurada.
            </div>

            <div className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Registrarse"
              )}
            </Button>

            <div className="text-center text-sm">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
