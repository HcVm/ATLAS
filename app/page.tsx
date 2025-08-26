"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"

// Componente de partículas animadas minimalista
function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Configurar canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Partículas más sutiles
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
    }> = []

    // Crear menos partículas para look minimalista
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
      })
    }

    // Animar partículas
    function animate() {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particleColor = "148, 163, 184"
      const lineColor = "148, 163, 184"

      particles.forEach((particle, index) => {
        // Actualizar posición
        particle.x += particle.vx
        particle.y += particle.vy

        // Rebotar en los bordes
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        // Dibujar partícula más sutil
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${particleColor}, ${particle.opacity})`
        ctx.fill()

        // Conectar partículas cercanas con líneas muy sutiles
        particles.slice(index + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.strokeStyle = `rgba(${lineColor}, ${0.05 * (1 - distance / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [mounted])

  if (!mounted) {
    return (
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900" />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        background:
          theme === "dark"
            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
            : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)",
      }}
    />
  )
}

// Componente de logos estáticos
function CompanyLogos() {
  const companies = [
    {
      name: "AGLE",
      logo: "/logos/agle-logo.png",
      fallbackColor: "from-blue-500 to-blue-600",
    },
    {
      name: "ARM",
      logo: "/logos/arm-logo.png",
      fallbackColor: "from-green-500 to-green-600",
    },
    {
      name: "GALUR",
      logo: "/logos/galur-logo.png",
      fallbackColor: "from-purple-500 to-purple-600",
    },
    {
      name: "GMC",
      logo: "/logos/gmc-logo.png",
      fallbackColor: "from-red-500 to-red-600",
    },
    {
      name: "AMCO",
      logo: "/logos/amco-logo.png",
      fallbackColor: "from-orange-500 to-orange-600",
    },
  ]

  return (
    <div className="flex flex-wrap justify-center items-center gap-6 py-8 max-w-2xl mx-auto">
      {companies.map((company, index) => (
        <div
          key={company.name}
          className="flex-shrink-0 group"
          style={{
            animationDelay: `${index * 0.1}s`,
          }}
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-lg flex items-center justify-center p-3 hover:scale-105 hover:shadow-xl transition-all duration-300 animate-fade-in-up">
            <div className="relative w-full h-full">
              <Image
                src={company.logo || "/placeholder.svg"}
                alt={`${company.name} Logo`}
                fill
                className="object-contain"
                onError={(e) => {
                  // Fallback si la imagen no carga
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  const parent = target.parentElement?.parentElement
                  if (parent) {
                    parent.className = `w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-r ${company.fallbackColor} flex items-center justify-center shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300`
                    parent.innerHTML = `<span class="text-white font-bold text-sm md:text-lg">${company.name}</span>`
                  }
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-12">
              <div className="relative">
                <div className="absolute inset-0 bg-white/40 dark:bg-slate-700/40 rounded-3xl blur-xl" />
                <div className="relative flex h-32 w-38 items-center justify-center rounded-3xl bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/30 dark:border-slate-600/30 shadow-2xl">
                  <div className="h-32 w-38 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Fondo minimalista */}
      <ParticlesBackground />

      {/* Contenido principal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Icono con efecto glass */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-white/40 dark:bg-slate-700/40 rounded-3xl blur-xl" />
              <div className="relative flex h-32 w-38 items-center justify-center rounded-3xl bg-white/20 dark:bg-slate-800/20 backdrop-blur-xl border border-white/30 dark:border-slate-600/30 shadow-2xl">
                <img
                  src={theme === "dark" ? "/logos/atlas-logo-dark.png" : "/logos/atlas-logo-white.png"}
                  alt="logo"
                  className="h-32 w-38"
                />
              </div>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-5xl md:text-7xl font-bold text-slate-800 dark:text-slate-200 mb-6 tracking-tight">
            Sistema de
            <br />
            <span className="bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent">
              Gestión
            </span>
          </h1>

          {/* Flecha hacia abajo animada */}
          <div className="flex justify-center mb-4">
            <ArrowDown className="h-6 w-6 text-slate-500 dark:text-slate-400 animate-bounce" />
          </div>

          {/* Logos de empresas estáticos */}
          <div className="mb-12">
            <CompanyLogos />
          </div>

          {/* Botón de acceso con efecto glass */}
          <Button
            asChild
            size="lg"
            className="bg-white/30 dark:bg-slate-800/30 hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-slate-600/40 backdrop-blur-xl px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 group hover:scale-105 rounded-2xl"
          >
            <Link href="/login" className="flex items-center gap-3">
              Iniciar Sesión
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          {/* Texto informativo */}
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-8 font-medium">
            Acceso reservado para usuarios autorizados
          </p>
        </div>
      </div>

      {/* Efectos de luz sutil */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/20 dark:from-slate-700/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-slate-200/30 dark:from-slate-600/30 to-transparent rounded-full blur-3xl" />

      <style jsx>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
