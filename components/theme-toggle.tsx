"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 animate-pulse" />
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="icon"
      className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-slate-800/20 hover:bg-white/30 dark:hover:bg-slate-700/30 backdrop-blur-xl border border-white/30 dark:border-slate-600/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-slate-700 dark:text-slate-300"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Cambiar tema</span>
    </Button>
  )
}
