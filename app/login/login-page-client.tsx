"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Building2, Mail } from "lucide-react"

// Configuración de empresas por dominio - colores minimalistas
const COMPANY_DOMAINS = {
  agle: {
    name: "AGLE",
    logo: "/logos/agle.png",
    color: "from-slate-600 to-slate-700",
    bgColor: "bg-slate-50",
    accent: "text-slate-600",
  },
  arm: {
    name: "ARM",
    logo: "/logos/arm.png",
    color: "from-gray-600 to-gray-700",
    bgColor: "bg-gray-50",
    accent: "text-gray-600",
  },
  galur: {
    name: "GALUR",
    logo: "/logos/galur.png",
    color: "from-zinc-600 to-zinc-700",
    bgColor: "bg-zinc-50",
    accent: "text-zinc-600",
  },
  gmc: {
    name: "GMC",
    logo: "/logos/gmc.png",
    color: "from-stone-600 to-stone-700",
    bgColor: "bg-stone-50",
    accent: "text-stone-600",
  },
  amco: {
    name: "AMCO",
    logo: "/logos/amco.png",
    color: "from-neutral-600 to-neutral-700",
    bgColor: "bg-neutral-50",
    accent: "text-neutral-600",
  },
} as const

type CompanyKey = keyof typeof COMPANY_DOMAINS

function detectCompanyFromEmail(email: string): CompanyKey | null {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return null

  // Buscar coincidencia exacta o parcial
  for (const [key, config] of Object.entries(COMPANY_DOMAINS)) {
    if (domain === key || domain.includes(key)) {
      return key as CompanyKey
    }
  }
  return null
}

export default function LoginPageClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [detectedCompany, setDetectedCompany] = useState<CompanyKey | null>(null)
  const router = useRouter()
  const { signIn } = useAuth()

  // Detectar empresa cuando cambia el email
  useEffect(() => {
    if (email.includes("@")) {
      const company = detectCompanyFromEmail(email)
      setDetectedCompany(company)
    } else {
      setDetectedCompany(null)
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Credenciales inválidas. Por favor verifica tu email y contraseña."
            : error.message,
        )
      } else {
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  const companyConfig = detectedCompany ? COMPANY_DOMAINS[detectedCompany] : null

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-500 ${
        companyConfig ? companyConfig.bgColor : "bg-gradient-to-br from-slate-50 to-gray-100"
      }`}
    >
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 overflow-hidden bg-white/80 backdrop-blur-xl">
          {/* Header minimalista */}
          <CardHeader className="space-y-1 text-center bg-white/50 backdrop-blur-xl border-b border-gray-100">
            <div className="flex justify-center mb-4">
              {companyConfig ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-xl border border-gray-200 mb-3 shadow-lg">
                    <Building2 className={`h-8 w-8 ${companyConfig.accent}`} />
                  </div>
                  <div className={`text-sm font-semibold ${companyConfig.accent}`}>{companyConfig.name}</div>
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/60 backdrop-blur-xl border border-gray-200 shadow-lg">
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
                    className="text-slate-600"
                  >
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Iniciar Sesión</CardTitle>
            <CardDescription className="text-slate-600">
              {companyConfig ? `Acceso al sistema ${companyConfig.name}` : "Sistema de Gestión Empresarial"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 bg-white/30 backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-red-50/80 border-red-200 backdrop-blur-xl">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 h-12 transition-all duration-200 bg-white/50 backdrop-blur-xl border-gray-200 focus:border-slate-400 focus:ring-slate-400"
                    placeholder="usuario@empresa.com"
                  />
                </div>
                {detectedCompany && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-2 bg-white/40 backdrop-blur-xl rounded-lg px-3 py-2 border border-gray-200">
                    <Building2 className="h-4 w-4" />
                    <span>Empresa detectada: {COMPANY_DOMAINS[detectedCompany].name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-white/50 backdrop-blur-xl border-gray-200 focus:border-slate-400 focus:ring-slate-400"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 font-semibold transition-all duration-300 bg-slate-700 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>

            {/* Aviso para nuevos usuarios */}
            <div className="mt-8 p-4 bg-white/40 backdrop-blur-xl rounded-xl border border-gray-200">
              <div className="text-center">
                <p className="text-sm text-slate-700 mb-2 font-medium">
                  <strong>¿No tienes una cuenta?</strong>
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Las cuentas son creadas únicamente por el administrador del sistema. Si necesitas acceso, contacta a
                  tu administrador de TI o al departamento correspondiente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
