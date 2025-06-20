// ============================================================================
// UTILIDADES PARA GOOGLE MAPS - VERSIÓN SIMPLIFICADA
// Funciones para integración con Google Maps API (sin cálculos de costos)
// ============================================================================

export interface RouteInfo {
  origin: string
  destination: string
  distance: {
    text: string
    value: number // en metros
  }
  duration: {
    text: string
    value: number // en segundos
  }
  polyline: string
  googleMapsUrl: string
}

export interface RouteRequest {
  origin: string
  destination: string
  travelMode?: "DRIVING" | "WALKING" | "TRANSIT" | "BICYCLING"
  avoidTolls?: boolean
  avoidHighways?: boolean
}

// Función para calcular ruta usando Google Maps Directions API
export async function calculateRoute(request: RouteRequest): Promise<RouteInfo | null> {
  try {
    if (!window.google || !window.google.maps) {
      throw new Error("Google Maps API no está cargada")
    }

    const directionsService = new google.maps.DirectionsService()

    const directionsRequest: google.maps.DirectionsRequest = {
      origin: request.origin,
      destination: request.destination,
      travelMode: google.maps.TravelMode[request.travelMode || "DRIVING"],
      avoidTolls: request.avoidTolls || false,
      avoidHighways: request.avoidHighways || false,
      unitSystem: google.maps.UnitSystem.METRIC,
      region: "PE", // Perú
    }

    return new Promise((resolve, reject) => {
      directionsService.route(directionsRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0]
          const leg = route.legs[0]

          // Generar URL de Google Maps
          const googleMapsUrl = generateGoogleMapsUrl(request.origin, request.destination)

          const routeInfo: RouteInfo = {
            origin: request.origin,
            destination: request.destination,
            distance: leg.distance!,
            duration: leg.duration!,
            polyline: route.overview_polyline!.points,
            googleMapsUrl,
          }

          resolve(routeInfo)
        } else {
          reject(new Error(`Error calculando ruta: ${status}`))
        }
      })
    })
  } catch (error) {
    console.error("Error en calculateRoute:", error)
    return null
  }
}

// Función para generar URL de Google Maps
export function generateGoogleMapsUrl(origin: string, destination: string): string {
  const baseUrl = "https://www.google.com/maps/dir/"
  const encodedOrigin = encodeURIComponent(origin)
  const encodedDestination = encodeURIComponent(destination)

  return `${baseUrl}${encodedOrigin}/${encodedDestination}`
}

// Función para formatear duración
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes}min`
}

// Función para formatear distancia
export function formatDistance(meters: number): string {
  const km = meters / 1000
  if (km >= 1) {
    return `${km.toFixed(1)} km`
  }
  return `${meters} m`
}

// Cargar Google Maps API dinámicamente
export function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=es&region=PE`
    script.async = true
    script.defer = true

    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Error cargando Google Maps API"))

    document.head.appendChild(script)
  })
}

// Declaración de tipos para Google Maps
declare global {
  interface Window {
    google: typeof google
  }
}
