"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateMapImageUrl, generateSimpleMapImageUrl } from "@/lib/pdf-generator"

export default function MapTest() {
  const [origin, setOrigin] = useState("Lima, Peru")
  const [destination, setDestination] = useState("Arequipa, Peru")
  const [mapUrl, setMapUrl] = useState("")
  const [simpleMapUrl, setSimpleMapUrl] = useState("")
  const [error, setError] = useState("")

  const testMaps = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError("API Key no encontrada")
      return
    }

    try {
      const fullMapUrl = generateMapImageUrl(origin, destination, apiKey)
      const simpleUrl = generateSimpleMapImageUrl(origin, destination, apiKey)

      setMapUrl(fullMapUrl)
      setSimpleMapUrl(simpleUrl)
      setError("")

      console.log("Full Map URL:", fullMapUrl)
      console.log("Simple Map URL:", simpleUrl)
    } catch (err) {
      setError(`Error: ${err}`)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Prueba de Google Maps API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="origin">Origen</Label>
            <Input
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Dirección de origen"
            />
          </div>
          <div>
            <Label htmlFor="destination">Destino</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Dirección de destino"
            />
          </div>
        </div>

        <Button onClick={testMaps} className="w-full">
          Probar Mapas
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {mapUrl && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Mapa Completo (con marcadores):</h3>
              <div className="border rounded-md p-2">
                <img
                  src={mapUrl || "/placeholder.svg"}
                  alt="Mapa completo"
                  className="w-full h-auto"
                  onError={(e) => {
                    console.error("Error loading full map")
                    e.currentTarget.style.display = "none"
                  }}
                  onLoad={() => console.log("Full map loaded successfully")}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 break-all">{mapUrl}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Mapa Simple (solo destino):</h3>
              <div className="border rounded-md p-2">
                <img
                  src={simpleMapUrl || "/placeholder.svg"}
                  alt="Mapa simple"
                  className="w-full h-auto"
                  onError={(e) => {
                    console.error("Error loading simple map")
                    e.currentTarget.style.display = "none"
                  }}
                  onLoad={() => console.log("Simple map loaded successfully")}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 break-all">{simpleMapUrl}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
