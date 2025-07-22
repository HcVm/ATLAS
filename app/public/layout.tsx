import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import "@/app/globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Documento Público - Sistema de Seguimiento",
  description: "Vista pública de documento certificado",
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <main className="min-h-screen bg-background">{children}</main>
      <Toaster />
    </ThemeProvider>
  )
}
