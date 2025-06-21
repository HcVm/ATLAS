// ============================================================================
// UTILIDADES PARA GOOGLE MAPS - VERSIÓN CORREGIDA
// Funciones para integración con Google Maps API
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

// Variable global para controlar si Google Maps ya está cargado
let isGoogleMapsLoaded = false
let googleMapsPromise: Promise<void> | null = null

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

// Cargar Google Maps API dinámicamente con async
export function loadGoogleMapsAPI(apiKey: string): Promise<void> {
  // Si ya está cargado, resolver inmediatamente
  if (isGoogleMapsLoaded && window.google && window.google.maps) {
    return Promise.resolve()
  }

  // Si ya hay una promesa en curso, devolverla
  if (googleMapsPromise) {
    return googleMapsPromise
  }

  // Crear nueva promesa de carga
  googleMapsPromise = new Promise((resolve, reject) => {
    // Verificar si ya existe el script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.remove()
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=es&region=PE&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      isGoogleMapsLoaded = true
      resolve()
    }

    script.onerror = () => {
      googleMapsPromise = null
      reject(new Error("Error cargando Google Maps API"))
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}

// Función para verificar si Google Maps está disponible
export function isGoogleMapsAvailable(): boolean {
  return isGoogleMapsLoaded && window.google && window.google.maps
}

// Declaración de tipos para Google Maps
declare global {
  interface Window {
    google: typeof google
  }
}
