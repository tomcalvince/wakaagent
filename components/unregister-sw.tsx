"use client"

import * as React from "react"

/**
 * Component to unregister any existing service workers
 * This is needed when PWA support is removed
 */
export function UnregisterServiceWorker() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration
            .unregister()
            .then((success) => {
              if (success && process.env.NODE_ENV !== "production") {
                console.log("Service Worker unregistered successfully")
              }
            })
            .catch((error) => {
              console.error("Error unregistering service worker:", error)
            })
        }
      })
    }
  }, [])

  return null
}

