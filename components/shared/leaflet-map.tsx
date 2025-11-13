"use client"

import * as React from "react"

interface LeafletMapProps {
  className?: string
  height?: number
  center: [number, number]
  zoom?: number
  route?: Array<[number, number]>
  origin?: [number, number]
  destination?: [number, number]
}

// Lightweight Leaflet loader using CDN (no npm dependency)
export function LeafletMap({ className, height = 260, center, zoom = 13, route, origin, destination }: LeafletMapProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const instanceRef = React.useRef<any>(null)
  const polylineRef = React.useRef<any>(null)
  const markersRef = React.useRef<any[]>([])

  // Initialize map (only once or when origin/destination change)
  React.useEffect(() => {
    let isMounted = true

    async function ensureLeaflet() {
      if (typeof window === "undefined") return null
      // Load CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }
      // Load JS
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.async = true
          script.onload = () => resolve()
          document.body.appendChild(script)
        })
      }
      return (window as any).L
    }

    ensureLeaflet().then((L) => {
      if (!isMounted || !L || !mapRef.current) return
      
      // Validate center coordinates
      if (!Array.isArray(center) || center.length !== 2) {
        console.error("Invalid center coordinates:", center)
        return
      }
      const [centerLat, centerLng] = center
      if (typeof centerLat !== 'number' || typeof centerLng !== 'number' ||
          isNaN(centerLat) || isNaN(centerLng) || !isFinite(centerLat) || !isFinite(centerLng) ||
          centerLat < -90 || centerLat > 90 || centerLng < -180 || centerLng > 180) {
        console.error("Invalid center coordinate values:", center)
        return
      }
      
      // Only create map if it doesn't exist
      if (!instanceRef.current) {
        try {
          const map = L.map(mapRef.current, { zoomControl: false }).setView(center, zoom)
          instanceRef.current = map

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map)
        } catch (error) {
          console.error("Failed to create map:", error)
          return
        }
      } else {
        // Map already exists, just update view if needed
        try {
          instanceRef.current.setView(center, zoom)
        } catch (error) {
          console.error("Failed to update map view:", error)
        }
      }

      const map = instanceRef.current
      
      // Remove existing markers (if any)
      markersRef.current.forEach((marker) => {
        map.removeLayer(marker)
      })
      markersRef.current = []

      const markerPositions: any[] = []
      
      // Validate and add origin marker
      if (origin && Array.isArray(origin) && origin.length === 2) {
        const [lat, lng] = origin
        if (typeof lat === 'number' && typeof lng === 'number' && 
            !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) &&
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          try {
            const originMarker = L.circleMarker(origin, { radius: 8, color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.9, weight: 2 })
            originMarker.addTo(map)
            markersRef.current.push(originMarker)
            markerPositions.push(origin)
          } catch (error) {
            console.error("Failed to create origin marker:", error)
          }
        }
      }
      
      // Validate and add destination marker
      if (destination && Array.isArray(destination) && destination.length === 2) {
        const [lat, lng] = destination
        if (typeof lat === 'number' && typeof lng === 'number' && 
            !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) &&
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          try {
            const destMarker = L.circleMarker(destination, { radius: 8, color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.9, weight: 2 })
            destMarker.addTo(map)
            markersRef.current.push(destMarker)
            markerPositions.push(destination)
          } catch (error) {
            console.error("Failed to create destination marker:", error)
          }
        }
      }
      
      // Fit bounds to show markers (only if we have valid markers)
      if (markerPositions.length >= 1) {
        try {
          if (markerPositions.length === 2) {
            const bounds = L.latLngBounds(markerPositions)
            map.fitBounds(bounds, { padding: [50, 50] })
          } else if (markerPositions.length === 1) {
            // If only one marker, center on it
            map.setView(markerPositions[0], zoom)
          }
        } catch (error) {
          console.error("Failed to fit bounds:", error)
        }
      }
    })

    return () => {
      isMounted = false
    }
  }, [center[0], center[1], origin?.[0], origin?.[1], destination?.[0], destination?.[1]])

  // Update route polyline when route changes (without recreating map)
  React.useEffect(() => {
    if (!instanceRef.current || !route || route.length < 2) return
    
    const L = (window as any).L
    if (!L) return

    const map = instanceRef.current

    // Validate and filter route coordinates
    // Remove any null, undefined, or invalid coordinate pairs
    const validRoute = route.filter((coord): coord is [number, number] => {
      // Check if coordinate is an array with 2 elements
      if (!Array.isArray(coord) || coord.length !== 2) return false
      
      // Check if both elements are valid numbers
      const [lat, lng] = coord
      if (typeof lat !== 'number' || typeof lng !== 'number') return false
      if (isNaN(lat) || isNaN(lng)) return false
      if (!isFinite(lat) || !isFinite(lng)) return false
      
      // Validate coordinate ranges (lat: -90 to 90, lng: -180 to 180)
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
      
      return true
    })

    // Only create polyline if we have at least 2 valid coordinates
    if (validRoute.length < 2) {
      // Remove existing polyline if we don't have enough valid coordinates
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
        polylineRef.current = null
      }
      return
    }

    // Remove existing polyline if any
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }

    try {
      // Add new polyline with validated coordinates
      const poly = L.polyline(validRoute, { color: "#3b82f6", weight: 4, opacity: 0.9 })
      poly.addTo(map)
      polylineRef.current = poly

      // Fit bounds to show route
      map.fitBounds(poly.getBounds(), { padding: [20, 20] })
    } catch (error) {
      console.error("Failed to create polyline:", error)
      // Remove polyline reference on error
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
        polylineRef.current = null
      }
    }
  }, [route])

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
      polylineRef.current = null
    }
  }, [])

  return (
    <div className={className} style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden" />
    </div>
  )
}

export default LeafletMap


