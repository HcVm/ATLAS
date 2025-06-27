import type React from "react"
import "./globals.css"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-context"
import { Analytics } from "@vercel/analytics/next" 

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Seguimiento de Documentos - SISDOC V3.0",
  description: "Aplicación para el seguimiento de documentos entre departamentos y empresas",
    generator: 'Héctor Vega - GmKO'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
            <Toaster />
            <SpeedInsights/>
            <Analytics/>            
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
