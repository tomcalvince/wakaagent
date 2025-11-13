import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AgentOffice } from "@/lib/services/agent-offices"
import type { DeliveryWindow } from "@/lib/services/orders"

interface OrderFormCacheState {
  agentOffices: AgentOffice[]
  deliveryWindows: DeliveryWindow[]
  lastFetched: number | null
  isLoading: boolean
  setAgentOffices: (offices: AgentOffice[]) => void
  setDeliveryWindows: (windows: DeliveryWindow[]) => void
  setLoading: (loading: boolean) => void
  clearCache: () => void
}

// Cache expires after 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000

export const useOrderFormCache = create<OrderFormCacheState>()(
  persist(
    (set) => ({
      agentOffices: [],
      deliveryWindows: [],
      lastFetched: null,
      isLoading: false,
      setAgentOffices: (offices) =>
        set({ agentOffices: offices, lastFetched: Date.now() }),
      setDeliveryWindows: (windows) =>
        set({ deliveryWindows: windows, lastFetched: Date.now() }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearCache: () =>
        set({
          agentOffices: [],
          deliveryWindows: [],
          lastFetched: null,
        }),
    }),
    {
      name: "order-form-cache-storage",
      // Only persist the data, not loading state
      partialize: (state) => ({
        agentOffices: state.agentOffices,
        deliveryWindows: state.deliveryWindows,
        lastFetched: state.lastFetched,
      }),
    }
  )
)

/**
 * Check if cache is still valid
 */
export function isCacheValid(lastFetched: number | null): boolean {
  if (!lastFetched) return false
  return Date.now() - lastFetched < CACHE_EXPIRY_MS
}

