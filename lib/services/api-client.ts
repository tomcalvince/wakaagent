import { refreshToken as refreshTokenService } from "./auth"

/**
 * Error response structure from API when token is invalid
 */
interface TokenErrorResponse {
  detail?: string
  code?: string
  messages?: Array<{
    token_class?: string
    token_type?: string
    message?: string
  }>
}

/**
 * Check if error response indicates expired token
 */
function isTokenExpiredError(errorData: any): boolean {
  if (!errorData || typeof errorData !== "object") {
    return false
  }

  const error = errorData as TokenErrorResponse

  // Check if code is token_not_valid
  if (error.code === "token_not_valid") {
    // Check if any message indicates token is expired
    if (error.messages && Array.isArray(error.messages)) {
      return error.messages.some(
        (msg) =>
          msg.token_type === "access" &&
          (msg.message === "Token is expired" || msg.message?.toLowerCase().includes("expired"))
      )
    }
  }

  return false
}

// Track ongoing refresh operations to prevent concurrent refresh attempts
let refreshPromise: Promise<{ access: string; refresh: string }> | null = null

/**
 * Fetches with automatic token refresh on expiration
 * @param url - The URL to fetch
 * @param options - Fetch options (headers, method, body, etc.)
 * @param accessToken - Current access token
 * @param refreshToken - Current refresh token
 * @param onTokenUpdate - Callback to update session with new tokens
 * @returns Response from the API
 * @throws Error if refresh fails or request fails after refresh
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit,
  accessToken: string,
  refreshToken: string,
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
): Promise<Response> {
  // Make the initial request
  const makeRequest = (token: string) => {
    // For FormData, don't set Content-Type - browser will set it with boundary
    const isFormData = options.body instanceof FormData
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    }
    
    // Only add other headers if not FormData
    if (!isFormData && options.headers) {
      Object.assign(headers, options.headers)
    }
    
    return fetch(url, {
      ...options,
      headers,
    })
  }

  let response = await makeRequest(accessToken)

  // Check if token expired
  if (response.status === 401) {
    let errorData: any = {}
    try {
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        // Clone response to read body without consuming it
        const clonedResponse = response.clone()
        errorData = await clonedResponse.json()
      }
    } catch {
      // Ignore parse errors
    }

    if (isTokenExpiredError(errorData)) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[api-client] Token expired, attempting refresh...")
      }

      // Prevent concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const newTokens = await refreshTokenService(refreshToken)
            await onTokenUpdate(newTokens.access, newTokens.refresh)
            return newTokens
          } finally {
            refreshPromise = null
          }
        })()
      }

      try {
        const newTokens = await refreshPromise
        if (newTokens) {
          if (process.env.NODE_ENV !== "production") {
            console.log("[api-client] Token refreshed, retrying request...")
          }
          // Retry the request with new token
          response = await makeRequest(newTokens.access)
        }
      } catch (refreshError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[api-client] Token refresh failed", refreshError)
        }
        // Refresh failed, throw error to trigger logout
        throw new Error("Token refresh failed. Please login again.")
      }
    }
  }

  return response
}

