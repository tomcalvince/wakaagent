import { getApiUrl, API_URLS } from "@/lib/constants"
import { fetchWithAuth } from "./api-client"

export interface UserProfile {
  username: string
  email: string
  phone_number: string
  user_type: string
  is_verified: boolean
  profile: {
    preferred_contact: string
  }
  avatar: string | null
}

export interface UpdateProfileParams {
  username: string
  phone_number: string
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}

export interface ProfileImageResponse {
  image_url: string
  message: string
}

export interface ProfileImageError {
  detail: string
}

/**
 * Fetches the current user's profile
 * @param params - Parameters including tokens and token update callback
 * @returns User profile data or null on error
 * @throws Error if token refresh fails
 */
export async function fetchUserProfile(params: {
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}): Promise<UserProfile | null> {
  const { accessToken, refreshToken, onTokenUpdate } = params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.fetchUserProfile] GET", getApiUrl(API_URLS.USER_PROFILE))
    }

    const url = getApiUrl(API_URLS.USER_PROFILE)

    const response = await fetchWithAuth(
      url,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      accessToken,
      refreshToken,
      onTokenUpdate
    )

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.fetchUserProfile] status", response.status)
    }

    if (!response.ok) {
      let errorData: any = {}
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          errorData = await response.json()
        }
      } catch (parseError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[profile.fetchUserProfile] failed to parse error response", parseError)
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[profile.fetchUserProfile] error", errorData)
      }

      return null
    }

    const data: UserProfile = await response.json()

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.fetchUserProfile] success", {
        username: data?.username,
        email: data?.email,
      })
    }

    return data
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[profile.fetchUserProfile] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    return null
  }
}

/**
 * Updates the current user's profile
 * @param params - Parameters including profile data, tokens, and token update callback
 * @returns Updated user profile data or null on error
 * @throws Error if token refresh fails
 */
export async function updateUserProfile(
  params: UpdateProfileParams
): Promise<UserProfile | null> {
  const { username, phone_number, accessToken, refreshToken, onTokenUpdate } = params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.updateUserProfile] PUT", getApiUrl(API_URLS.USER_PROFILE))
      console.log("[profile.updateUserProfile] payload", { username, phone_number })
    }

    const url = getApiUrl(API_URLS.USER_PROFILE)

    const payload = {
      username,
      phone_number,
    }

    const response = await fetchWithAuth(
      url,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      accessToken,
      refreshToken,
      onTokenUpdate
    )

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.updateUserProfile] status", response.status)
    }

    if (!response.ok) {
      let errorData: any = {}
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          errorData = await response.json()
        }
      } catch (parseError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[profile.updateUserProfile] failed to parse error response", parseError)
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[profile.updateUserProfile] error", errorData)
      }

      return null
    }

    const data: UserProfile = await response.json()

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.updateUserProfile] success", {
        username: data?.username,
        email: data?.email,
      })
    }

    return data
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[profile.updateUserProfile] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    return null
  }
}

/**
 * Fetches the current user's profile image
 * @param params - Parameters including tokens and token update callback
 * @returns Profile image URL or null if no image exists
 * @throws Error if token refresh fails
 */
export async function fetchProfileImage(params: {
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}): Promise<string | null> {
  const { accessToken, refreshToken, onTokenUpdate } = params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.fetchProfileImage] GET", getApiUrl(API_URLS.PROFILE_IMAGE))
    }

    const url = getApiUrl(API_URLS.PROFILE_IMAGE)

    const response = await fetchWithAuth(
      url,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      accessToken,
      refreshToken,
      onTokenUpdate
    )

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.fetchProfileImage] status", response.status)
    }

    if (!response.ok) {
      // 404 means no profile image exists, which is fine
      if (response.status === 404) {
        return null
      }

      let errorData: any = {}
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          errorData = await response.json()
        }
      } catch (parseError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[profile.fetchProfileImage] failed to parse error response", parseError)
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[profile.fetchProfileImage] error", errorData)
      }

      return null
    }

    const data: ProfileImageResponse = await response.json()

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.fetchProfileImage] success", {
        hasImage: Boolean(data?.image_url),
      })
    }

    return data?.image_url || null
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[profile.fetchProfileImage] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    return null
  }
}

/**
 * Uploads a profile image
 * @param params - Parameters including image file, tokens, and token update callback
 * @returns Profile image URL or null on error
 * @throws Error if token refresh fails or file is too large
 */
export async function uploadProfileImage(params: {
  file: File
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}): Promise<string | null> {
  const { file, accessToken, refreshToken, onTokenUpdate } = params

  // Check file size (15MB max)
  const maxSize = 15 * 1024 * 1024 // 15MB in bytes
  if (file.size > maxSize) {
    throw new Error("File size exceeds 15MB limit")
  }

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.uploadProfileImage] POST", getApiUrl(API_URLS.PROFILE_IMAGE))
      console.log("[profile.uploadProfileImage] file", {
        name: file.name,
        size: file.size,
        type: file.type,
      })
    }

    const url = getApiUrl(API_URLS.PROFILE_IMAGE)

    // Create FormData for multipart/form-data
    const formData = new FormData()
    formData.append("image", file)

    // Use fetchWithAuth but we need to handle multipart differently
    // Since fetchWithAuth might set Content-Type, we need to let the browser set it for FormData
    const response = await fetchWithAuth(
      url,
      {
        method: "POST",
        // Don't set Content-Type header - browser will set it with boundary for FormData
        body: formData,
      },
      accessToken,
      refreshToken,
      onTokenUpdate
    )

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.uploadProfileImage] status", response.status)
    }

    if (!response.ok) {
      let errorData: any = {}
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          errorData = await response.json()
        }
      } catch (parseError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[profile.uploadProfileImage] failed to parse error response", parseError)
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[profile.uploadProfileImage] error", errorData)
      }

      return null
    }

    const data: ProfileImageResponse = await response.json()

    if (process.env.NODE_ENV !== "production") {
      console.log("[profile.uploadProfileImage] success", {
        image_url: data?.image_url,
      })
    }

    return data?.image_url || null
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[profile.uploadProfileImage] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    throw error
  }
}

