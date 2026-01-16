"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"

interface Department {
  id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

// Función para convertir RGB a Hexadecimal
const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

// Función para convertir Hexadecimal a RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}

// Función para determinar si un color es oscuro (para elegir texto blanco o negro)
const isColorDark = (hex: string): boolean => {
  const rgb = hexToRgb(hex)
  if (!rgb) return true
  const { r, g, b } = rgb
  // Fórmula para calcular la luminosidad percibida
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

export default function EditDepartmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Estado para el color
  const [colorHex, setColorHex] = useState("#3B82F6") // Azul por defecto
  const [colorRgb, setColorRgb] = useState({ r: 59, g: 130, b: 246 })

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // Función para verificar si el usuario es administrador
  const isAdmin = (user: any): boolean => {
    return user?.role === "admin" || user?.role === "supervisor"
  }

  useEffect(() => {
    if (currentUser) {
      if (isAdmin(currentUser)) {
        fetchDepartment()
      } else {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder a esta página.",
          variant: "destructive",
        })
        router.push("/departments")
      }
    }
  }, [currentUser, params.id])

  // Actualizar RGB cuando cambia el hex
  useEffect(() => {
    const rgb = hexToRgb(colorHex)
    if (rgb) {
      setColorRgb(rgb)
    }
  }, [colorHex])

  // Actualizar Hex cuando cambia RGB
  useEffect(() => {
    const hex = rgbToHex(colorRgb.r, colorRgb.g, colorRgb.b)
    setColorHex(hex)
  }, [colorRgb])

  const fetchDepartment = async () => {
    try {
      console.log(`Fetching department: ${params.id}`)

      const response = await fetch(`/api/departments/${params.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`Response status: ${response.status}`)

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Departamento no encontrado",
            description: "El departamento que intentas editar no existe.",
            variant: "destructive",
          })
          router.push("/departments")
          return
        }

        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.error || "Error al cargar el departamento")
      }

      const data = await response.json()
      console.log("Department data received:", data)

      setDepartment(data)
      setFormData({
        name: data.name || "",
        description: data.description || "",
      })

      // Si el color está en formato hexadecimal, usarlo directamente
      if (data.color && data.color.startsWith("#")) {
        setColorHex(data.color)
      }
      // Si el color está en formato clase Tailwind, convertirlo a hex
      else if (data.color && data.color.startsWith("bg-")) {
        // Colores predefinidos para conversión
        const colorMap: Record<string, string> = {
          "bg-red-500": "#EF4444",
          "bg-blue-500": "#3B82F6",
          "bg-green-500": "#10B981",
          "bg-yellow-500": "#F59E0B",
          "bg-purple-500": "#8B5CF6",
          "bg-pink-500": "#EC4899",
          "bg-indigo-500": "#6366F1",
          "bg-gray-500": "#6B7280",
          "bg-orange-500": "#F97316",
          "bg-teal-500": "#14B8A6",
        }
        setColorHex(colorMap[data.color] || "#3B82F6")
      } else {
        // Color por defecto si no hay coincidencia
        setColorHex("#3B82F6")
      }
    } catch (error: any) {
      console.error("Error fetching department:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el departamento",
        variant: "destructive",
      })
      router.push("/departments")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre del departamento es requerido.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      console.log(`Updating department: ${params.id}`)

      // Usar el color hexadecimal para guardar en la base de datos
      const updateData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        color: colorHex, // Guardar el color en formato hexadecimal
      }

      console.log("Form data:", updateData)

      const response = await fetch(`/api/departments/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      console.log(`Update response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Update error response:", errorData)
        throw new Error(errorData.error || "Error al actualizar departamento")
      }

      const result = await response.json()
      console.log("Update result:", result)

      toast({
        title: "Departamento actualizado",
        description: "El departamento se ha actualizado correctamente",
      })

      // Esperar un poco antes de redirigir para que el usuario vea el mensaje
      setTimeout(() => {
        router.push("/departments")
      }, 1500)
    } catch (error: any) {
      console.error("Error updating department:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el departamento",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRandomColor = () => {
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    setColorRgb({ r, g, b })
  }

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!isAdmin(currentUser)) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        <p className="text-sm text-muted-foreground mt-2">Tu rol actual: {currentUser.role}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando departamento...</p>
      </div>
    )
  }

  if (!department) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Departamento no encontrado</h1>
        <p className="text-muted-foreground">El departamento que buscas no existe.</p>
        <Button onClick={() => router.push("/departments")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Departamentos
        </Button>
      </div>
    )
  }

  const textColor = isColorDark(colorHex) ? "text-white" : "text-black"

  return (
    <div className="min-h-screen space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button 
            variant="ghost" 
            onClick={() => router.push("/departments")}
            className="group pl-0 hover:pl-2 transition-all duration-300 hover:bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Volver a Departamentos
        </Button>
      </div>
      
      <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Editar Departamento
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Modifica la información del departamento: <span className="font-semibold text-slate-700 dark:text-slate-300">{department.name}</span>
          </p>
      </div>

      <Card className="shadow-xl border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-100/60 dark:border-slate-800/60 pb-6">
          <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">Información del Departamento</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Actualiza los detalles y la apariencia visual</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
              <TabsTrigger 
                value="basic"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all"
              >
                Información Básica
              </TabsTrigger>
              <TabsTrigger 
                value="color"
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all"
              >
                Color del Departamento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-0 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-medium">
                    Nombre del Departamento *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={saving}
                    required
                    placeholder="Ej. Recursos Humanos"
                    className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 dark:text-slate-300 font-medium">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={saving}
                    rows={4}
                    placeholder="Descripción breve de las funciones de este departamento..."
                    className="bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all resize-none"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="color" className="mt-0">
              <div className="space-y-8">
                {/* Vista previa del color */}
                <div className="flex flex-col space-y-3">
                  <Label className="text-slate-700 dark:text-slate-300 font-medium">Vista Previa</Label>
                  <div
                    className={`h-32 rounded-xl flex flex-col items-center justify-center shadow-lg transition-colors duration-300 border border-black/5 ${textColor}`}
                    style={{ backgroundColor: colorHex }}
                  >
                    <span className="text-2xl font-bold tracking-tight">{formData.name || "Nombre del Departamento"}</span>
                    <span className="text-sm opacity-80 mt-1 font-mono uppercase">{colorHex}</span>
                  </div>
                </div>

                {/* Selector de color hexadecimal */}
                <div className="space-y-3">
                  <Label htmlFor="colorHex" className="text-slate-700 dark:text-slate-300 font-medium">Selector de Color</Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: colorHex }}></div>
                        <Input
                        id="colorHex"
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="pl-10 font-mono bg-white/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all h-11 uppercase"
                        maxLength={7}
                        />
                    </div>
                    <div className="relative w-14 h-11 overflow-hidden rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 cursor-pointer hover:scale-105 transition-transform">
                        <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="absolute -top-2 -left-2 w-20 h-20 p-0 border-0 cursor-pointer"
                        />
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleRandomColor} 
                        title="Generar color aleatorio"
                        className="h-11 w-11 p-0 rounded-xl border-slate-200/60 bg-white/50 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Button>
                  </div>
                </div>

                {/* Sliders RGB */}
                <div className="space-y-6 p-6 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/60 dark:border-slate-800/60">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="red" className="text-slate-600 dark:text-slate-400 font-medium">Rojo (R)</Label>
                      <span className="text-xs font-mono bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-500">{colorRgb.r}</span>
                    </div>
                    <Slider
                      id="red"
                      min={0}
                      max={255}
                      step={1}
                      value={[colorRgb.r]}
                      onValueChange={(value) => setColorRgb({ ...colorRgb, r: value[0] })}
                      className="[&_[role=slider]]:bg-red-500 [&_[role=slider]]:border-red-600 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="green" className="text-slate-600 dark:text-slate-400 font-medium">Verde (G)</Label>
                      <span className="text-xs font-mono bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-500">{colorRgb.g}</span>
                    </div>
                    <Slider
                      id="green"
                      min={0}
                      max={255}
                      step={1}
                      value={[colorRgb.g]}
                      onValueChange={(value) => setColorRgb({ ...colorRgb, g: value[0] })}
                      className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-600 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="blue" className="text-slate-600 dark:text-slate-400 font-medium">Azul (B)</Label>
                      <span className="text-xs font-mono bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-500">{colorRgb.b}</span>
                    </div>
                    <Slider
                      id="blue"
                      min={0}
                      max={255}
                      step={1}
                      value={[colorRgb.b]}
                      onValueChange={(value) => setColorRgb({ ...colorRgb, b: value[0] })}
                      className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-600 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100/60 dark:border-slate-800/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/departments")}
              disabled={saving}
              className="border-slate-200/60 bg-white/50 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black dark:from-white dark:to-slate-200 dark:hover:from-slate-200 dark:hover:to-slate-300 text-white dark:text-slate-900 shadow-lg shadow-slate-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
