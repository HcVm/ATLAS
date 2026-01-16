"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useMotionTemplate, useMotionValue, useSpring } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Building2, Mail } from "lucide-react"
import Image from "next/image"

// Configuración de empresas por dominio - colores minimalistas
const COMPANY_DOMAINS = {
  agle: {
    name: "AGLE",
    logo: "/logos/agle-logo.png",
    bgColor: "bg-slate-50 dark:bg-slate-900",
    accent: "text-slate-600 dark:text-slate-400",
    borderColor: "border-slate-200 dark:border-slate-700",
  },
  arm: {
    name: "ARM",
    logo: "/logos/arm-logo.png",
    bgColor: "bg-gray-50 dark:bg-gray-900",
    accent: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-700",
  },
  galur: {
    name: "GALUR",
    logo: "/logos/galur-logo.png",
    bgColor: "bg-zinc-50 dark:bg-zinc-900",
    accent: "text-zinc-600 dark:text-zinc-400",
    borderColor: "border-zinc-200 dark:border-zinc-700",
  },
  gmc: {
    name: "GMC",
    logo: "/logos/gmc-logo.png",
    bgColor: "bg-stone-50 dark:bg-stone-900",
    accent: "text-stone-600 dark:text-stone-400",
    borderColor: "border-stone-200 dark:border-stone-700",
  },
  amco: {
    name: "AMCO",
    logo: "/logos/amco-logo.png",
    bgColor: "bg-neutral-50 dark:bg-neutral-900",
    accent: "text-neutral-600 dark:text-neutral-400",
    borderColor: "border-neutral-200 dark:border-neutral-700",
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
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()
  const { signIn } = useAuth()

  // Mouse tilt effect state
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left - width / 2)
    mouseY.set(clientY - top - height / 2)
  }

  const rotateX = useSpring(useMotionTemplate`${mouseY}deg`, { stiffness: 100, damping: 30 })
  const rotateY = useSpring(useMotionTemplate`${mouseX}deg`, { stiffness: 100, damping: 30 })

  // Detectar empresa cuando cambia el email
  useEffect(() => {
    if (email.includes("@")) {
      const company = detectCompanyFromEmail(email)
      setDetectedCompany(company)
      setLogoError(false) // Reset logo error when company changes
    } else {
      setDetectedCompany(null)
      setLogoError(false)
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
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-700 relative overflow-hidden ${
        companyConfig
          ? companyConfig.bgColor
          : "bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900"
      }`}
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
         {/* Grid Pattern */}
         <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
         
         {/* Floating Orbs */}
         <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen filter"
         />
         <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
              x: [0, 100, 0],
            }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute top-1/2 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen filter"
         />
         <motion.div 
             animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
              y: [0, -100, 0],
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen filter"
         />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10 perspective-1000"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          mouseX.set(0)
          mouseY.set(0)
        }}
      >
        <motion.div
           style={{ 
             rotateX: useSpring(useMotionTemplate`${mouseY.get() / 20}deg`, { stiffness: 200, damping: 20 }), 
             rotateY: useSpring(useMotionTemplate`${mouseX.get() / -20}deg`, { stiffness: 200, damping: 20 }),
             transformStyle: "preserve-3d" 
           }}
        >
        <Card className="shadow-2xl border-0 overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl ring-1 ring-slate-200/50 dark:ring-slate-700/50 transform-gpu">
          {/* Header con logo de empresa */}
          <CardHeader className="space-y-1 text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border-b border-gray-100 dark:border-slate-700 pb-8">
            <div className="flex justify-center mb-6 h-24">
              <AnimatePresence mode="wait">
                {companyConfig ? (
                  <motion.div
                    key="company-logo"
                    initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-white/90 dark:bg-slate-700/90 backdrop-blur-xl border-2 ${companyConfig.borderColor} mb-3 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300`}
                    >
                      {!logoError ? (
                        <Image
                          src={companyConfig.logo || "/placeholder.svg"}
                          alt={`Logo ${companyConfig.name}`}
                          width={80}
                          height={80}
                          className="object-contain w-full h-full p-3 group-hover:scale-110 transition-transform duration-500"
                          onError={() => setLogoError(true)}
                          priority
                        />
                      ) : (
                        <div className={`flex items-center justify-center w-full h-full ${companyConfig.accent}`}>
                          <Building2 className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-base font-bold tracking-wide ${companyConfig.accent}`}
                    >
                      {companyConfig.name}
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="default-logo"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-700 shadow-xl border border-slate-200 dark:border-slate-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-700 dark:text-slate-300 drop-shadow-sm"
                    >
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      <path d="M10 9H8" />
                      <path d="M16 13H8" />
                      <path d="M16 17H8" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 relative">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Bienvenido
              </motion.span>
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-base h-6">
               <motion.span
                  key={companyConfig ? companyConfig.name : "default"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
               >
                 {companyConfig ? `Ingresa a tu cuenta de ${companyConfig.name}` : "Sistema de Gestión Empresarial"}
               </motion.span>
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  >
                    <Alert
                      variant="destructive"
                      className="bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-800 shadow-sm"
                    >
                      <AlertDescription className="text-red-700 dark:text-red-300 font-medium">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                  Correo Electrónico
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-600 dark:group-focus-within:text-slate-300 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-12 h-14 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-400 dark:focus:border-slate-500 transition-all shadow-sm group-hover:bg-white dark:group-hover:bg-slate-800"
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <AnimatePresence>
                  {detectedCompany && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex items-center gap-2 text-sm mt-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-lg px-4 py-2 border ${companyConfig?.borderColor || "border-gray-200 dark:border-slate-600"} shadow-sm`}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className={`font-medium ${companyConfig?.accent || "text-slate-600 dark:text-slate-400"}`}>
                        Empresa detectada: {COMPANY_DOMAINS[detectedCompany].name}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Contraseña
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-14 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-400 dark:focus:border-slate-500 transition-all shadow-sm hover:bg-white dark:hover:bg-slate-800"
                  placeholder="••••••••"
                />
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-400 to-slate-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <Button
                  type="submit"
                  className="relative w-full h-14 text-lg font-bold transition-all duration-300 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500 text-white shadow-lg hover:shadow-xl rounded-xl overflow-hidden"
                  disabled={loading}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  />
                  {loading ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center"
                    >
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Iniciando sesión...
                    </motion.div>
                  ) : (
                    "Ingresar al Sistema"
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Aviso para nuevos usuarios */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50"
            >
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Acceso restringido a personal autorizado. Si necesitas credenciales, contacta al administrador del sistema.
                </p>
              </div>
            </motion.div>
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
