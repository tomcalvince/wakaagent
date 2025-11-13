"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { fetchAgentOffices } from "@/lib/services/agent-offices"
import { fetchDeliveryWindows } from "@/lib/services/orders"
import { useOrderFormCache, isCacheValid } from "@/lib/stores/order-form-cache"

/**
 * Preloads agent offices and delivery windows in the background
 * This component should be placed in the main layout to preload data when user is authenticated
 */
export function OrderFormPreloader() {
  const { data: session, update: updateSession } = useSession()
  const { agentOffices, deliveryWindows, lastFetched, setAgentOffices, setDeliveryWindows, setLoading } =
    useOrderFormCache()

  React.useEffect(() => {
    // Only preload if user is authenticated
    if (!session?.accessToken || !session?.refreshToken) {
      return
    }

    // Store tokens in local variables to avoid TypeScript issues in async function
    const accessToken = session.accessToken
    const refreshToken = session.refreshToken

    // Check if cache is valid
    if (isCacheValid(lastFetched) && agentOffices.length > 0 && deliveryWindows.length > 0) {
      return // Cache is still valid, no need to fetch
    }

    // Preload data in the background
    async function preloadData() {
      // Double-check tokens are still available (they might have changed)
      if (!accessToken || !refreshToken) {
        return
      }

      setLoading(true)
      try {
        // Fetch both in parallel
        const [offices, windows] = await Promise.all([
          fetchAgentOffices({
            accessToken,
            refreshToken,
            onTokenUpdate: async (newAccessToken, newRefreshToken) => {
              await updateSession({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              })
            },
          }),
          fetchDeliveryWindows({
            accessToken,
            refreshToken,
            onTokenUpdate: async (newAccessToken, newRefreshToken) => {
              await updateSession({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              })
            },
          }),
        ])

        // Update cache
        setAgentOffices(offices)
        setDeliveryWindows(windows)
      } catch (error) {
        console.error("Failed to preload order form data:", error)
        // Don't show error toast - this is background loading
        // If it fails, the drawer will try to fetch on demand
      } finally {
        setLoading(false)
      }
    }

    // Small delay to avoid blocking initial render
    const timeoutId = setTimeout(preloadData, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [
    session?.accessToken,
    session?.refreshToken,
    lastFetched,
    agentOffices.length,
    deliveryWindows.length,
    setAgentOffices,
    setDeliveryWindows,
    setLoading,
    updateSession,
  ])

  // This component doesn't render anything
  return null
}

