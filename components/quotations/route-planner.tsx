"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { MapPin, Navigation, Clock, Route, ExternalLink, Save, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import {
  calculateRoute,
  loadGoogleMapsAPI,
  formatDuration,
  formatDistance,
  isGoogleMapsAvailable,
  type RouteInfo,
} from "@/lib/google-maps-utils"

interface RoutePlannerProps {
  quotationId: string
  initialOrigin?: string
  initialDestination?: string
  onRouteCalculated?: (routeInfo: RouteInfo) => void
}

export default function RoutePlanner({
  quotationId,
  initialOrigin = "",
  initialDestination = "",
  onRouteCalculated,
}: RoutePlannerProps) {
  const { user } = useAuth()
  const [origin, setOrigin] = useState(initialOrigin)
  const [destination, setDestination] = useState(initialDestination)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [avoidTolls, setAvoidTolls] = useState(false)
  const [avoidHighways, setAvoidHighways] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null)
  const isInitialized = useRef(false)

  // Cargar Google Maps API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log("🔑 API Key disponible:", !!apiKey)

    if (!apiKey) {
      const errorMsg = "API Key de Google Maps no configurada en las variables de entorno"
      console.error("❌", errorMsg)
      setMapsError(errorMsg)
      toast.error(errorMsg)
      return
    }

    if (isInitialized.current) {
      console.log("⚠️ Ya inicializado, saltando...")
      return
    }

    isInitialized.current = true
    console.log("🚀 Iniciando carga de Google Maps...")

    loadGoogleMapsAPI(apiKey)
      .then(() => {
        console.log("✅ Google Maps cargado, inicializando mapa...")
        setMapsLoaded(true)
        setMapsError(null)
        setTimeout(initializeMap, 200) // Pequeño delay para asegurar que el DOM esté listo
      })
      .catch((error) => {
        console.error("💥 Error cargando Google Maps:", error)
        setMapsError(error.message)
        toast.error("Error cargando Google Maps: " + error.message)
        isInitialized.current = false
      })
  }, [])

  // Inicializar mapa
  const initializeMap = useCallback(() => {
    console.log("🗺️ Inicializando mapa...")

    if (!mapRef.current) {
      console.error("❌ Referencia del mapa no disponible")
      return
    }

    if (!isGoogleMapsAvailable()) {
      console.error("❌ Google Maps no disponible")
      return
    }

    try {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: -12.0464, lng: -77.0428 }, // Lima, Perú
        zoom: 6,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        draggable: false,
        panel: null,
      })

      directionsRenderer.current.setMap(mapInstance.current)
      console.log("✅ Mapa inicializado correctamente")
    } catch (error) {
      console.error("💥 Error inicializando mapa:", error)
      setMapsError("Error inicializando el mapa")
      toast.error("Error inicializando el mapa")
    }
  }, [])

  // Calcular ruta
  const handleCalculateRoute = useCallback(async () => {
    console.log("🎯 Iniciando cálculo de ruta...")

    if (!origin.trim() || !destination.trim()) {
      toast.error("Por favor ingresa origen y destino")
      return
    }

    if (!mapsLoaded || !isGoogleMapsAvailable()) {
      toast.error("Google Maps aún no está cargado")
      return
    }

    setLoading(true)
    try {
      const routeResult = await calculateRoute({
        origin: origin.trim(),
        destination: destination.trim(),
        travelMode: "DRIVING",
        avoidTolls,
        avoidHighways,
      })

      if (routeResult) {
        console.log("✅ Ruta calculada, actualizando estado...")
        setRouteInfo(routeResult)
        onRouteCalculated?.(routeResult)

        // Mostrar ruta en el mapa
        if (directionsRenderer.current && mapInstance.current) {
          console.log("🗺️ Mostrando ruta en el mapa...")
          const directionsService = new window.google.maps.DirectionsService()

          directionsService.route(
            {
              origin: origin.trim(),
              destination: destination.trim(),
              travelMode: window.google.maps.TravelMode.DRIVING,
              avoidTolls,
              avoidHighways,
            },
            (result, status) => {
              if (status === window.google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.current!.setDirections(result)
                console.log("✅ Ruta mostrada en el mapa")
              } else {
                console.error("❌ Error mostrando ruta en mapa:", status)
              }
            },
          )
        }

        toast.success("Ruta calculada exitosamente")
      } else {
        toast.error("No se pudo calcular la ruta")
      }
    } catch (error) {
      console.error("💥 Error calculando ruta:", error)
      toast.error("Error calculando la ruta")
    } finally {
      setLoading(false)
    }
  }, [origin, destination, mapsLoaded, avoidTolls, avoidHighways, onRouteCalculated])

  // Guardar información de ruta
  const handleSaveRoute = useCallback(async () => {
    console.log("💾 Guardando información de ruta...")

    if (!routeInfo || !user) {
      toast.error("No hay información de ruta para guardar")
      return
    }

    setSaving(true)
    try {
      const routeData = {
        route_origin_address: routeInfo.origin,
        route_destination_address: routeInfo.destination,
        route_distance_km: Number((routeInfo.distance.value / 1000).toFixed(2)),
        route_duration_minutes: Math.round(routeInfo.duration.value / 60),
        route_google_maps_url: routeInfo.googleMapsUrl,
        route_created_at: new Date().toISOString(),
        route_created_by: user.id,
      }

      console.log("📝 Datos a guardar:", routeData)

      const { error } = await supabase.from("quotations").update(routeData).eq("id", quotationId)

      if (error) {
        console.error("❌ Error guardando en Supabase:", error)
        throw error
      }

      console.log("✅ Ruta guardada exitosamente")
      toast.success("Información de ruta guardada exitosamente")
    } catch (error: any) {
      console.error("💥 Error guardando ruta:", error)
      toast.error("Error guardando la información de ruta: " + error.message)
    } finally {
      setSaving(false)
    }
  }, [routeInfo, user, quotationId])

  return (
    <div className="space-y-6">
      {/* Estado de Google Maps */}
      {mapsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error con Google Maps:</span>
              <span>{mapsError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuración de Ruta */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Route className="h-5 w-5" />
            Planificador de Ruta
          </CardTitle>
          <CardDescription className="text-slate-600">
            Calcula la ruta óptima para la entrega de esta cotización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Origen y Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="route-origin" className="text-slate-700">
                Origen
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                <Input
                  id="route-origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Dirección de origen..."
                  className="pl-10 border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="route-destination" className="text-slate-700">
                Destino
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-red-500" />
                <Input
                  id="route-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Dirección de destino..."
                  className="pl-10 border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Opciones de Ruta */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Switch id="avoid-tolls" checked={avoidTolls} onCheckedChange={setAvoidTolls} />
              <Label htmlFor="avoid-tolls" className="text-slate-700">
                Evitar peajes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="avoid-highways" checked={avoidHighways} onCheckedChange={setAvoidHighways} />
              <Label htmlFor="avoid-highways" className="text-slate-700">
                Evitar autopistas
              </Label>
            </div>
          </div>

          {/* Botón Calcular */}
          <Button
            onClick={handleCalculateRoute}
            disabled={loading || !mapsLoaded || !!mapsError}
            className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando ruta...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Calcular Ruta
              </>
            )}
          </Button>

          {/* Estado de carga */}
          {!mapsLoaded && !mapsError && (
            <div className="text-center text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p>Cargando Google Maps...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Mapa de Ruta</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={mapRef}
            className="w-full h-96 rounded-lg border border-slate-200 bg-slate-100"
            style={{ minHeight: "400px" }}
          />
          {!mapsLoaded && !mapsError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-slate-600" />
                <p className="text-slate-600">Cargando Google Maps...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de Ruta */}
      {routeInfo && (
        <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-slate-800">
              <span>Información de Ruta</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(routeInfo.googleMapsUrl, "_blank")}
                  className="border-slate-200 hover:bg-slate-100"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ver en Maps
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveRoute}
                  disabled={saving}
                  className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Guardar Ruta
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Route className="h-10 w-10 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">Distancia Total</p>
                  <p className="text-xl font-bold text-blue-600">{formatDistance(routeInfo.distance.value)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Clock className="h-10 w-10 text-green-600" />
                <div>
                  <p className="text-sm text-slate-600">Duración Estimada</p>
                  <p className="text-xl font-bold text-green-600">{formatDuration(routeInfo.duration.value)}</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-slate-600">Origen</Label>
                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                  {routeInfo.origin}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600">Destino</Label>
                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                  {routeInfo.destination}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
