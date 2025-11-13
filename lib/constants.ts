// API Configuration Constants
// BASE_URL comes from environment variable NEXT_PUBLIC_API_BASE_URL

export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export const API_URLS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  FORGOT_PASSWORD: "/auth/forgot-password",
  REFRESH_TOKEN: "/auth/refresh",
  AGENT_ORDERS: "/agent/orders",
  ORDER_DETAILS: "/orders",
  ORDER_TRACKING: "/orders/track",
  NAVIGATION_DIRECTIONS: "/navigation/directions",
  WALLETS: "/wallets",
  WALLET_TRANSACTIONS: "/wallets",
  MULTIRECIPIENT_ORDERS: "/orders/multi-recipient",
  AGENT_OFFICES: "/agent-offices",
  AGENT_OFFICES_NEARBY: "/agent-offices/nearby-by-location",
  DELIVERY_WINDOWS: "/delivery-windows",
  MARK_ORDER_AS_PAID: "/orders", // Base path, order_id appended in service
  GEOCODE: "/locations/geocode",
  USER_PROFILE: "/me",
  PROFILE_IMAGE: "/profile/image",
} as const

/**
 * Helper function to get full API URL by combining BASE_URL with a path
 * @param path - API endpoint path (should start with /)
 * @returns Full URL string
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL
  return `${cleanBase}${cleanPath}`
}
