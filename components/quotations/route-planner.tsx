"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { MapPin, Navigation, Clock, Route, ExternalLink, Save, Loader2 } from "lucide-react"
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
        setTimeout(initializeMap, 100) // Pequeño delay para asegurar que el DOM esté listo
      })
      .catch((error) => {
        console.error("Error cargando Google Maps:", error)
        toast.error("Error cargando Google Maps")
        isInitialized.current = false
      })
  }, [])

  // Inicializar mapa
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !isGoogleMapsAvailable()) return

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
    } catch (error) {
      console.error("Error inicializando mapa:", error)
      toast.error("Error inicializando el mapa")
    }
  }, [])

  // Calcular ruta
  const handleCalculateRoute = useCallback(async () => {
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
        setRouteInfo(routeResult)
        onRouteCalculated?.(routeResult)

        // Mostrar ruta en el mapa
        if (directionsRenderer.current && mapInstance.current) {
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
  }, [origin, destination, mapsLoaded, avoidTolls, avoidHighways, onRouteCalculated])

  // Guardar información de ruta
  const handleSaveRoute = useCallback(async () => {
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
          route_google_maps_url: routeInfo.googleMapsUrl,
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
  }, [routeInfo, user, quotationId])

  // Prevenir propagación de eventos
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <div className="space-y-6">
      {/* Configuración de Ruta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Planificador de Ruta
          </CardTitle>
          <CardDescription>Calcula la ruta óptima para la entrega de esta cotización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Origen y Destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="route-origin">Origen</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                <Input
                  id="route-origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Dirección de origen..."
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="route-destination">Destino</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-red-500" />
                <Input
                  id="route-destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Dirección de destino..."
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Opciones de Ruta */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Switch id="avoid-tolls" checked={avoidTolls} onCheckedChange={setAvoidTolls} />
              <Label htmlFor="avoid-tolls">Evitar peajes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="avoid-highways" checked={avoidHighways} onCheckedChange={setAvoidHighways} />
              <Label htmlFor="avoid-highways">Evitar autopistas</Label>
            </div>
          </div>

          {/* Botón Calcular */}
          <Button type="button" onClick={handleCalculateRoute} disabled={loading || !mapsLoaded} className="w-full">
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
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Ruta</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="w-full h-96 rounded-lg border" style={{ minHeight: "400px" }} />
          {!mapsLoaded && (
            <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Cargando Google Maps...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de Ruta */}
      {routeInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Información de Ruta</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(routeInfo.googleMapsUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ver en Maps
                </Button>
                <Button type="button" size="sm" onClick={handleSaveRoute} disabled={saving}>
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
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Route className="h-10 w-10 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Distancia Total</p>
                  <p className="text-xl font-bold text-blue-600">{formatDistance(routeInfo.distance.value)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <Clock className="h-10 w-10 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Duración Estimada</p>
                  <p className="text-xl font-bold text-green-600">{formatDuration(routeInfo.duration.value)}</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-600">Origen</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{routeInfo.origin}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Destino</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{routeInfo.destination}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
