"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { MapPin, Navigation, Clock, Fuel, DollarSign, Route, ExternalLink, Save, Loader2 } from "lucide-react"
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
  const [waypoints, setWaypoints] = useState<string[]>([])
  const [newWaypoint, setNewWaypoint] = useState("")
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [avoidTolls, setAvoidTolls] = useState(false)
  const [avoidHighways, setAvoidHighways] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null)
  const isInitialized = useRef(false)

  // Cargar Google Maps API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      toast.error("API Key de Google Maps no configurada")
      return
    }

    if (isInitialized.current) return
    isInitialized.current = true

    loadGoogleMapsAPI(apiKey)
      .then(() => {
        setMapsLoaded(true)
        setTimeout(initializeMap, 100)
      })
      .catch((error) => {
        console.error("Error cargando Google Maps:", error)
        toast.error("Error cargando Google Maps")
        isInitialized.current = false
      })
  }, [])

  // Inicializar mapa
  const initializeMap = () => {
    if (!mapRef.current || !isGoogleMapsAvailable()) return

    try {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: -12.0464, lng: -77.0428 }, // Lima, Perú
        zoom: 6,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      directionsRenderer.current = new google.maps.DirectionsRenderer({
        draggable: true,
        panel: null,
      })

      directionsRenderer.current.setMap(mapInstance.current)
    } catch (error) {
      console.error("Error inicializando mapa:", error)
      toast.error("Error inicializando el mapa")
    }
  }

  // Calcular ruta
  const handleCalculateRoute = async () => {
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
        waypoints: waypoints.filter((w) => w.trim()),
        travelMode: "DRIVING",
        avoidTolls,
        avoidHighways,
      })

      if (routeResult) {
        setRouteInfo(routeResult)
        onRouteCalculated?.(routeResult)

        // Mostrar ruta en el mapa
        if (directionsRenderer.current && mapInstance.current) {
          const directionsService = new google.maps.DirectionsService()

          directionsService.route(
            {
              origin: origin.trim(),
              destination: destination.trim(),
              waypoints: waypoints.filter((w) => w.trim()).map((w) => ({ location: w, stopover: true })),
              travelMode: google.maps.TravelMode.DRIVING,
              avoidTolls,
              avoidHighways,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.current!.setDirections(result)
              }
            },
          )
        }

        toast.success("Ruta calculada exitosamente")
      } else {
        toast.error("No se pudo calcular la ruta")
      }
    } catch (error) {
      console.error("Error calculando ruta:", error)
      toast.error("Error calculando la ruta")
    } finally {
      setLoading(false)
    }
  }

  // Guardar información de ruta
  const handleSaveRoute = async () => {
    if (!routeInfo || !user) {
      toast.error("No hay información de ruta para guardar")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from("quotations")
        .update({
          route_origin_address: routeInfo.origin,
          route_destination_address: routeInfo.destination,
          route_distance_km: routeInfo.distance.value / 1000,
          route_duration_minutes: Math.round(routeInfo.duration.value / 60),
          route_toll_cost: routeInfo.tollCost,
          route_fuel_cost: routeInfo.fuelCost,
          route_google_maps_url: routeInfo.googleMapsUrl,
          route_waypoints: waypoints.length > 0 ? waypoints : null,
          route_created_at: new Date().toISOString(),
          route_created_by: user.id,
        })
        .eq("id", quotationId)

      if (error) throw error

      toast.success("Información de ruta guardada exitosamente")
    } catch (error) {
      console.error("Error guardando ruta:", error)
      toast.error("Error guardando la información de ruta")
    } finally {
      setSaving(false)
    }
  }

  // Agregar punto intermedio
  const addWaypoint = () => {
    if (newWaypoint.trim() && waypoints.length < 8) {
      setWaypoints([...waypoints, newWaypoint.trim()])
      setNewWaypoint("")
    }
  }

  // Remover punto intermedio
  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
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
              <Label htmlFor="origin" className="text-slate-700">
                Origen
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                <Input
                  id="origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Dirección de origen..."
                  className="pl-10 border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="destination" className="text-slate-700">
                Destino
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-red-500" />
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Dirección de destino..."
                  className="pl-10 border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Puntos Intermedios */}
          <div>
            <Label className="text-slate-700">Puntos Intermedios (Opcional)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newWaypoint}
                onChange={(e) => setNewWaypoint(e.target.value)}
                placeholder="Agregar punto intermedio..."
                onKeyPress={(e) => e.key === "Enter" && addWaypoint()}
                className="border-slate-200 focus:border-slate-400"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addWaypoint}
                disabled={!newWaypoint.trim() || waypoints.length >= 8}
                className="border-slate-200 hover:bg-slate-100"
              >
                Agregar
              </Button>
            </div>
            {waypoints.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {waypoints.map((waypoint, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer bg-slate-100 text-slate-700">
                    {waypoint}
                    <button onClick={() => removeWaypoint(index)} className="ml-2 text-red-500 hover:text-red-700">
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
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
            disabled={loading || !mapsLoaded}
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
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Mapa de Ruta</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="w-full h-96 rounded-lg border border-slate-200" style={{ minHeight: "400px" }} />
          {!mapsLoaded && (
            <div className="flex items-center justify-center h-96 bg-slate-100 rounded-lg">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Route className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">Distancia</p>
                  <p className="font-bold text-blue-600">{formatDistance(routeInfo.distance.value)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-slate-600">Duración</p>
                  <p className="font-bold text-green-600">{formatDuration(routeInfo.duration.value)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Fuel className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-slate-600">Combustible</p>
                  <p className="font-bold text-orange-600">S/ {routeInfo.fuelCost?.toFixed(2) || "0.00"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <DollarSign className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-slate-600">Peajes</p>
                  <p className="font-bold text-purple-600">S/ {routeInfo.tollCost?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
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
              {waypoints.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-slate-600">Puntos Intermedios</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {waypoints.map((waypoint, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-slate-300 text-slate-600">
                        {waypoint}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
