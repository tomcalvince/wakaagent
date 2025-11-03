"use client"

import * as React from "react"

interface LocationPinMapProps {
  center: [number, number]
  onLocationChange: (latitude: number, longitude: number) => void
  className?: string
  height?: number
  zoom?: number
}

/**
 * Interactive map component for selecting office location with a draggable pin
 */
export function LocationPinMap({
  center,
  onLocationChange,
  className,
  height = 300,
  zoom = 15,
}: LocationPinMapProps) {
  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const instanceRef = React.useRef<any>(null)
  const markerRef = React.useRef<any>(null)

  // Initialize map and marker
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

      // Create map if it doesn't exist
      if (!instanceRef.current) {
        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView(center, zoom)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        instanceRef.current = map

        // Create a custom icon for the big red pin
        const redPinIcon = L.divIcon({
          className: "custom-pin-marker",
          html: `
            <div style="
              width: 40px;
              height: 40px;
              background-color: #dc2626;
              border: 4px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 3px 10px rgba(0,0,0,0.4);
              position: relative;
            ">
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
                width: 14px;
                height: 14px;
                background-color: white;
                border-radius: 50%;
              "></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
        })

        // Add initial marker
        const marker = L.marker(center, {
          icon: redPinIcon,
          draggable: true,
        }).addTo(map)

        markerRef.current = marker

        // Handle marker drag end
        marker.on("dragend", (e: any) => {
          const position = marker.getLatLng()
          onLocationChange(position.lat, position.lng)
        })

        // Handle map click - move marker to clicked position
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng
          marker.setLatLng([lat, lng])
          onLocationChange(lat, lng)
        })

        // Initial callback
        onLocationChange(center[0], center[1])
      } else {
        // Map exists - update center and marker position
        const map = instanceRef.current
        map.setView(center, zoom)

        if (markerRef.current) {
          markerRef.current.setLatLng(center)
        } else {
          // Recreate marker if it doesn't exist
          const L = (window as any).L
          const redPinIcon = L.divIcon({
            className: "custom-pin-marker",
            html: `
              <div style="
                width: 40px;
                height: 40px;
                background-color: #dc2626;
                border: 4px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                position: relative;
              ">
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(45deg);
                  width: 14px;
                  height: 14px;
                  background-color: white;
                  border-radius: 50%;
                "></div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40],
          })

          const marker = L.marker(center, {
            icon: redPinIcon,
            draggable: true,
          }).addTo(map)

          markerRef.current = marker

          marker.on("dragend", (e: any) => {
            const position = marker.getLatLng()
            onLocationChange(position.lat, position.lng)
          })

          map.on("click", (e: any) => {
            const { lat, lng } = e.latlng
            marker.setLatLng([lat, lng])
            onLocationChange(lat, lng)
          })
        }
      }
    })

    return () => {
      isMounted = false
    }
  }, [center[0], center[1], zoom])

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove()
        instanceRef.current = null
      }
      markerRef.current = null
    }
  }, [])

  return (
    <div className={className} style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-2xl overflow-hidden border border-border" />
      <style jsx global>{`
        .custom-pin-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  )
}

