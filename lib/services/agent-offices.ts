import { getApiUrl, API_URLS } from "@/lib/constants"
import { fetchWithAuth } from "./api-client"

export interface AgentOffice {
  id: string
  office_code: string
  office_name: string
  agent: string
  agent_name: string
  latitude: string
  longitude: string
  address: string
  city: string
  county: string
  region: string
  country: string
  phone: string
  email: string
  opening_hours: {
    [key: string]: string
  }
  is_active: boolean
  created_at: string
  updated_at: string
  distance_km?: number
}

export interface FetchAgentOfficesParams {
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}

export interface SearchAgentOfficesParams {
  country: string
  location_name: string
  radius_km?: number
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}

export interface AgentOfficesResponse {
  count: number
  message: string
  offices: AgentOffice[]
}

/**
 * Fetches the authenticated user's own agent offices
 * @param params - Parameters including tokens and token update callback
 * @returns Array of agent offices or empty array on error
 */
export async function fetchAgentOffices(
  params: FetchAgentOfficesParams
): Promise<AgentOffice[]> {
  const { accessToken, refreshToken, onTokenUpdate } = params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.fetchAgentOffices] GET", getApiUrl(API_URLS.AGENT_OFFICES))
    }

    const url = getApiUrl(API_URLS.AGENT_OFFICES)

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
      console.log("[agent-offices.fetchAgentOffices] status", response.status)
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
          console.error(
            "[agent-offices.fetchAgentOffices] failed to parse error response",
            parseError
          )
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[agent-offices.fetchAgentOffices] error", errorData)
      }

      return []
    }

    const responseData: AgentOfficesResponse = await response.json()

    // Extract offices array from response
    const offices = responseData?.offices || []

    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.fetchAgentOffices] success", { 
        count: responseData?.count ?? 0,
        officesCount: offices.length 
      })
    }

    return Array.isArray(offices) ? offices : []
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[agent-offices.fetchAgentOffices] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    return []
  }
}

/**
 * Searches for agent offices near a location
 * @param params - Parameters including location details, tokens, and token update callback
 * @returns Array of nearby agent offices or empty array on error
 */
export async function searchAgentOfficesByLocation(
  params: SearchAgentOfficesParams
): Promise<AgentOffice[]> {
  const { country, location_name, radius_km = 10, accessToken, refreshToken, onTokenUpdate } =
    params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[agent-offices.searchAgentOfficesByLocation] POST",
        getApiUrl(API_URLS.AGENT_OFFICES_NEARBY)
      )
      console.log("[agent-offices.searchAgentOfficesByLocation] payload", {
        country,
        location_name,
        radius_km,
      })
    }

    const url = getApiUrl(API_URLS.AGENT_OFFICES_NEARBY)

    const response = await fetchWithAuth(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          location_name,
          radius_km,
        }),
      },
      accessToken,
      refreshToken,
      onTokenUpdate
    )

    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.searchAgentOfficesByLocation] status", response.status)
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
          console.error(
            "[agent-offices.searchAgentOfficesByLocation] failed to parse error response",
            parseError
          )
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[agent-offices.searchAgentOfficesByLocation] error", errorData)
      }

      return []
    }

    const data: AgentOffice[] = await response.json()

    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.searchAgentOfficesByLocation] success", {
        count: data?.length ?? 0,
      })
    }

    return data || []
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[agent-offices.searchAgentOfficesByLocation] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    return []
  }
}

export interface CreateAgentOfficeParams {
  office_name: string
  latitude: number
  longitude: number
  address: string
  city: string
  county: string
  country: string
  phone: string
  email: string
  opening_hours: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  }
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}

export interface UpdateAgentOfficeParams extends CreateAgentOfficeParams {
  officeId: string
}

export interface DeleteAgentOfficeParams {
  officeId: string
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}

/**
 * Creates a new agent office
 * @param params - Parameters including office data, tokens, and token update callback
 * @returns Created agent office or null on error
 */
export async function createAgentOffice(
  params: CreateAgentOfficeParams
): Promise<AgentOffice | null> {
  const {
    office_name,
    latitude,
    longitude,
    address,
    city,
    county,
    country,
    phone,
    email,
    opening_hours,
    accessToken,
    refreshToken,
    onTokenUpdate,
  } = params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.createAgentOffice] POST", getApiUrl(API_URLS.AGENT_OFFICES))
      console.log("[agent-offices.createAgentOffice] payload", {
        office_name,
        city,
        country,
      })
    }

    const url = getApiUrl(API_URLS.AGENT_OFFICES)

    const payload = {
      office_name,
      latitude,
      longitude,
      address,
      city,
      county,
      country,
      phone,
      email,
      opening_hours,
    }

    const response = await fetchWithAuth(
      url,
      {
        method: "POST",
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
      console.log("[agent-offices.createAgentOffice] status", response.status)
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
          console.error(
            "[agent-offices.createAgentOffice] failed to parse error response",
            parseError
          )
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[agent-offices.createAgentOffice] error", errorData)
      }

      throw new Error(errorData.message || errorData.detail || "Failed to create office")
    }

    const data: AgentOffice = await response.json()

    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.createAgentOffice] success", { office_id: data?.id })
    }

    return data || null
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[agent-offices.createAgentOffice] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error("An unexpected error occurred while creating office.")
  }
}

/**
 * Updates an existing agent office
 * @param params - Parameters including officeId, office data, tokens, and token update callback
 * @returns Updated agent office or null on error
 */
export async function updateAgentOffice(
  params: UpdateAgentOfficeParams
): Promise<AgentOffice | null> {
  const {
    officeId,
    office_name,
    latitude,
    longitude,
    address,
    city,
    county,
    country,
    phone,
    email,
    opening_hours,
    accessToken,
    refreshToken,
    onTokenUpdate,
  } = params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[agent-offices.updateAgentOffice] PUT",
        `${getApiUrl(API_URLS.AGENT_OFFICES)}/${officeId}`
      )
      console.log("[agent-offices.updateAgentOffice] payload", {
        office_name,
        city,
        country,
      })
    }

    const url = `${getApiUrl(API_URLS.AGENT_OFFICES)}/${officeId}`

    const payload = {
      office_name,
      latitude,
      longitude,
      address,
      city,
      county,
      country,
      phone,
      email,
      opening_hours,
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
      console.log("[agent-offices.updateAgentOffice] status", response.status)
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
          console.error(
            "[agent-offices.updateAgentOffice] failed to parse error response",
            parseError
          )
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[agent-offices.updateAgentOffice] error", errorData)
      }

      throw new Error(errorData.message || errorData.detail || "Failed to update office")
    }

    const data: AgentOffice = await response.json()

    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.updateAgentOffice] success", { office_id: data?.id })
    }

    return data || null
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[agent-offices.updateAgentOffice] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error("An unexpected error occurred while updating office.")
  }
}

/**
 * Deletes an agent office
 * @param params - Parameters including officeId, tokens, and token update callback
 * @returns true if successful, false otherwise
 */
export async function deleteAgentOffice(params: DeleteAgentOfficeParams): Promise<boolean> {
  const { officeId, accessToken, refreshToken, onTokenUpdate } = params

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[agent-offices.deleteAgentOffice] DELETE",
        `${getApiUrl(API_URLS.AGENT_OFFICES)}/${officeId}`
      )
    }

    const url = `${getApiUrl(API_URLS.AGENT_OFFICES)}/${officeId}`

    const response = await fetchWithAuth(
      url,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
      accessToken,
      refreshToken,
      onTokenUpdate
    )

    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.deleteAgentOffice] status", response.status)
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
          console.error(
            "[agent-offices.deleteAgentOffice] failed to parse error response",
            parseError
          )
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.error("[agent-offices.deleteAgentOffice] error", errorData)
      }

      throw new Error(errorData.message || errorData.detail || "Failed to delete office")
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[agent-offices.deleteAgentOffice] success")
    }

    return true
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[agent-offices.deleteAgentOffice] exception", error)
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
      throw error
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error("An unexpected error occurred while deleting office.")
  }
}
