"use client"

import React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import MobilePageHeader from "@/components/shared/mobile-page-header"
import LeafletMap from "@/components/shared/leaflet-map"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { PhoneIcon } from "@heroicons/react/24/outline"
import { fetchOrderDetails, fetchTrackingData, fetchDirections } from "@/lib/services/orders"
import {
  getStatusLabel,
  getStatusBadgeClasses,
} from "@/lib/utils/orders"
import { cn } from "@/lib/utils"

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Not set"
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

export default function TrackingPage() {
  const params = useParams<{ id: string }>()
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [trackingData, setTrackingData] = React.useState<any>(null)
  const [route, setRoute] = React.useState<Array<[number, number]> | undefined>(undefined)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadTrackingData() {
      const id = params?.id as string
      if (!id || !session?.accessToken || !session?.refreshToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        // First, fetch order details to get tracking_number
        const orderDetails = await fetchOrderDetails({
          orderId: id,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          onTokenUpdate: async (newAccessToken, newRefreshToken) => {
            await updateSession({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            })
          },
        })

        if (!orderDetails || !orderDetails.tracking_number) {
          setError("Order not found or tracking number unavailable")
          setIsLoading(false)
          return
        }

        // Then fetch tracking data using the tracking number
        const tracking = await fetchTrackingData({
          trackingNumber: orderDetails.tracking_number,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          onTokenUpdate: async (newAccessToken, newRefreshToken) => {
            await updateSession({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            })
          },
        })

        if (tracking) {
          setTrackingData(tracking)
          setIsLoading(false) // Allow map to render immediately

          // Fetch directions for the route asynchronously (don't block map rendering)
          const pickupLat = parseFloat(tracking.pickup_latitude)
          const pickupLng = parseFloat(tracking.pickup_longitude)
          const deliveryLat = parseFloat(tracking.delivery_latitude)
          const deliveryLng = parseFloat(tracking.delivery_longitude)
          const country = tracking.pickup_country || tracking.delivery_country || "KE"

          // Fetch directions in background
          fetchDirections({
            start_latitude: pickupLat,
            start_longitude: pickupLng,
            end_latitude: deliveryLat,
            end_longitude: deliveryLng,
            country,
            user_type: "agent",
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            onTokenUpdate: async (newAccessToken, newRefreshToken) => {
              await updateSession({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              })
            },
          })
            .then((directions) => {
              if (directions && directions.directions) {
                // Extract route coordinates from directions
                // API returns coordinates as [lng, lat], convert to [lat, lng] for Leaflet
                const routeCoordinates: Array<[number, number]> = directions.directions
                  .map((step) => {
                    // Validate step has coordinates
                    if (!step.coordinates || !Array.isArray(step.coordinates) || step.coordinates.length !== 2) {
                      return null
                    }
                    const [lng, lat] = step.coordinates
                    // Validate coordinates are numbers
                    if (typeof lat !== 'number' || typeof lng !== 'number') return null
                    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return null
                    // step.coordinates is [lng, lat], convert to [lat, lng]
                    return [lat, lng] as [number, number]
                  })
                  .filter((coord): coord is [number, number] => coord !== null)
                
                // Only set route if we have valid coordinates
                if (routeCoordinates.length >= 2) {
                  setRoute(routeCoordinates)
                } else {
                  console.warn("Invalid route coordinates, skipping route display")
                  setRoute(undefined)
                }
              }
            })
            .catch((err) => {
              console.error("Failed to fetch directions:", err)
              // Don't show error, just continue without route
            })
        } else {
          setError("Tracking data not found")
        }
      } catch (err) {
        console.error("Failed to fetch tracking data:", err)
        // If token refresh failed, logout the user
        if (err instanceof Error && err.message.includes("Token refresh failed")) {
          await signOut({ redirect: false })
          router.push("/login")
          router.refresh()
          return
        }
        setError("Failed to load tracking data. Please try again.")
        setIsLoading(false)
      }
    }

    loadTrackingData()
  }, [params?.id, session?.accessToken, session?.refreshToken, updateSession, router])

  // Calculate center point between pickup and delivery
  const getMapCenter = () => {
    if (!trackingData) return [-1.2921, 36.8219] as [number, number]
    const pickupLat = parseFloat(trackingData.pickup_latitude)
    const pickupLng = parseFloat(trackingData.pickup_longitude)
    const deliveryLat = parseFloat(trackingData.delivery_latitude)
    const deliveryLng = parseFloat(trackingData.delivery_longitude)

    // Center between both points
    return [(pickupLat + deliveryLat) / 2, (pickupLng + deliveryLng) / 2] as [number, number]
  }

  const getPickupPoint = (): [number, number] | undefined => {
    if (!trackingData) return undefined
    return [
      parseFloat(trackingData.pickup_latitude),
      parseFloat(trackingData.pickup_longitude),
    ]
  }

  const getDeliveryPoint = (): [number, number] | undefined => {
    if (!trackingData) return undefined
    return [
      parseFloat(trackingData.delivery_latitude),
      parseFloat(trackingData.delivery_longitude),
    ]
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col md:gap-6 gap-0 md:p-6 p-0 h-full">
        <MobilePageHeader title="Tracking" />
        <div className="flex items-center justify-center flex-1 px-4">
          <p className="text-muted-foreground">Loading tracking data...</p>
        </div>
      </div>
    )
  }

  if (error || !trackingData) {
    return (
      <div className="flex flex-1 flex-col md:gap-6 gap-0 md:p-6 p-0 h-full">
        <MobilePageHeader title="Tracking" />
        <div className="flex items-center justify-center flex-1 px-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PhoneIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>Tracking not found</EmptyTitle>
              <EmptyDescription>
                {error || "Unable to load tracking data. Please try again."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    )
  }

  const pickupPoint = getPickupPoint()
  const deliveryPoint = getDeliveryPoint()

  return (
    <div className="flex flex-1 flex-col md:gap-6 gap-0 md:p-6 p-0 h-full">
      <MobilePageHeader title={`Tracking "${trackingData.tracking_number}"`} />
      <div className="px-4 py-4 md:hidden space-y-4 overflow-y-auto">
        {/* Map */}
        {pickupPoint && deliveryPoint && (
          <LeafletMap
            height={300}
            center={getMapCenter()}
            origin={pickupPoint}
            destination={deliveryPoint}
            route={route}
          />
        )}

        {/* Order Status Card */}
        <Card className="rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Order Status</h2>
              <p className="text-xs text-muted-foreground">
                {trackingData.order_number}
              </p>
            </div>
            <Badge
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                getStatusBadgeClasses(trackingData.status)
              )}
            >
              {trackingData.status_display || getStatusLabel(trackingData.status)}
            </Badge>
          </div>
        </Card>

        {/* Pickup Location */}
        <Card className="rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Pickup Location</h3>
          <p className="text-sm">{trackingData.pickup_address}</p>
        </Card>

        {/* Delivery Location */}
        <Card className="rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Delivery Location</h3>
          <p className="text-sm">{trackingData.delivery_address}</p>
        </Card>

        {/* Timeline */}
        <Card className="rounded-2xl p-4">
          <h3 className="font-semibold mb-4">Timeline</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium text-sm">{formatDate(trackingData.created_at)}</p>
            </div>
            {trackingData.picked_up_at && (
              <div>
                <p className="text-xs text-muted-foreground">Picked Up</p>
                <p className="font-medium text-sm">{formatDate(trackingData.picked_up_at)}</p>
              </div>
            )}
            {trackingData.delivered_at && (
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="font-medium text-sm">{formatDate(trackingData.delivered_at)}</p>
              </div>
            )}
            {trackingData.estimated_delivery_time && (
              <div>
                <p className="text-xs text-muted-foreground">Estimated Delivery</p>
                <p className="font-medium text-sm">{formatDate(trackingData.estimated_delivery_time)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
