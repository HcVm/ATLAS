import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const origin = searchParams.get("origin")
    const destination = searchParams.get("destination")
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!origin || !destination) {
      return NextResponse.json({ error: "Origin and destination are required" }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 })
    }

    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
      origin,
    )}&destination=${encodeURIComponent(destination)}&key=${apiKey}&language=es&region=PE`

    const response = await fetch(directionsUrl)
    const data = await response.json()

    if (data.status === "OK" && data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      const polyline = route.overview_polyline.points

      return NextResponse.json({
        success: true,
        polyline,
        distance: route.legs[0]?.distance?.text || "N/A",
        duration: route.legs[0]?.duration?.text || "N/A",
      })
    } else {
      console.error("Directions API error:", data.status, data.error_message)
      return NextResponse.json(
        {
          error: "Route not found",
          details: data.error_message || data.status,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error in route API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
