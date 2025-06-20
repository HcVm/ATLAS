"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateMapWithRouteImageUrl, generateSimpleMapImageUrl, getRoutePolyline } from "@/lib/pdf-generator"

export default function RouteMapTest() {
  const [origin, setOrigin] = useState("Lima, Peru")
  const [destination, setDestination] = useState("Arequipa, Peru")
  const [mapUrl, setMapUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const testRouteMap = async () => {
    setIsLoading(true)
    setError("")
    setMapUrl("")

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error("API Key no encontrada")
      }

      console.log("Testing route map generation...")

      // Test polyline generation first
      const polyline = await getRoutePolyline(origin, destination, apiKey)
      console.log("Polyline result:", polyline ? "Success" : "Failed")

      // Generate map with route
      const url = await generateMapWithRouteImageUrl(origin, destination, apiKey)
      setMapUrl(url)

      console.log("Generated URL:", url)
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const testSimpleMap = async () => {
    setIsLoading(true)
    setError("")
    setMapUrl("")

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error("API Key no encontrada")
      }

      const url = generateSimpleMapImageUrl(origin, destination, apiKey)
      setMapUrl(url)

      console.log("Generated simple URL:", url)
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prueba de Mapa con Ruta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">Origen</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Ej: Lima, Peru"
              />
            </div>
            <div>
              <Label htmlFor="destination">Destino</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ej: Arequipa, Peru"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={testRouteMap} disabled={isLoading}>
              {isLoading ? "Generando..." : "Probar Mapa con Ruta"}
            </Button>
            <Button onClick={testSimpleMap} disabled={isLoading} variant="outline">
              {isLoading ? "Generando..." : "Probar Mapa Simple"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {mapUrl && (
            <div className="space-y-2">
              <h3 className="font-semibold">Resultado:</h3>
              <div className="border rounded-md p-4">
                <img
                  src={mapUrl || "/placeholder.svg"}
                  alt="Mapa de ruta"
                  className="max-w-full h-auto rounded"
                  onLoad={() => console.log("Image loaded successfully")}
                  onError={(e) => {
                    console.error("Image failed to load")
                    setError("La imagen del mapa no se pudo cargar")
                  }}
                />
              </div>
              <div className="text-sm text-gray-600 break-all">
                <strong>URL generada:</strong> {mapUrl}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
