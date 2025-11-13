import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UserPreferencesState {
  countryCode: "KE" | "UG"
  setCountryCode: (code: "KE" | "UG") => void
}

export const useUserPreferences = create<UserPreferencesState>()(
  persist(
    (set) => ({
      countryCode: "KE", // Default to Kenya
      setCountryCode: (code) => set({ countryCode: code }),
    }),
    {
      name: "user-preferences-storage", // localStorage key
    }
  )
)

