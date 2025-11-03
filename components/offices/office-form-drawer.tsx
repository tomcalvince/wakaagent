"use client"

import * as React from "react"
import { ArrowLeftIcon, MagnifyingGlassIcon, MapPinIcon, CheckIcon } from "@heroicons/react/24/outline"
import { CheckIcon as CheckIconSolid } from "@heroicons/react/24/solid"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createAgentOffice,
  updateAgentOffice,
  type AgentOffice,
} from "@/lib/services/agent-offices"
import { geocodeLocation, type GeocodeResult } from "@/lib/services/locations"
import { formatPhoneNumber } from "@/lib/utils/phone"
import { getUserLocation, getCountryFromCoordinates } from "@/lib/utils/location"
import { cn } from "@/lib/utils"
import { LocationPinMap } from "./location-pin-map"

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const

interface OfficeFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  office: AgentOffice | null
  onSuccess: () => void
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}

export function OfficeFormDrawer({
  open,
  onOpenChange,
  office,
  onSuccess,
  accessToken,
  refreshToken,
  onTokenUpdate,
}: OfficeFormDrawerProps) {
  const [officeName, setOfficeName] = React.useState("")
  const [latitude, setLatitude] = React.useState("")
  const [longitude, setLongitude] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [city, setCity] = React.useState("")
  const [county, setCounty] = React.useState("")
  const [country, setCountry] = React.useState("KE")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [openingHours, setOpeningHours] = React.useState<{
    [key: string]: string
  }>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(false)
  const [locationSearch, setLocationSearch] = React.useState("")
  const [geocodeResults, setGeocodeResults] = React.useState<GeocodeResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [selectedGeocodeResult, setSelectedGeocodeResult] = React.useState<GeocodeResult | null>(null)
  const [showMap, setShowMap] = React.useState(false)
  const [mapCenter, setMapCenter] = React.useState<[number, number]>([-1.2921, 36.8219]) // Default: Nairobi
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Initialize form when drawer opens or office changes
  React.useEffect(() => {
    if (open) {
      if (office) {
        // Edit mode - populate with existing office data
        setOfficeName(office.office_name || "")
        const lat = parseFloat(office.latitude || "0")
        const lng = parseFloat(office.longitude || "0")
        setLatitude(office.latitude || "")
        setLongitude(office.longitude || "")
        setAddress(office.address || "")
        setCity(office.city || "")
        setCounty(office.county || "")
        setCountry(office.country || "KE")
        setPhone(office.phone || "")
        setEmail(office.email || "")
        setOpeningHours(office.opening_hours || {})
        // Set map center if we have coordinates
        if (lat !== 0 && lng !== 0) {
          setMapCenter([lat, lng])
          setShowMap(true)
        }
        setSelectedGeocodeResult(null)
      } else {
        // Create mode - reset form and get location
        setOfficeName("")
        setLatitude("")
        setLongitude("")
        setAddress("")
        setCity("")
        setCounty("")
        setCountry("KE")
        setPhone("")
        setEmail("")
        setOpeningHours({
          monday: "08:00-18:00",
          tuesday: "08:00-18:00",
          wednesday: "08:00-18:00",
          thursday: "08:00-18:00",
          friday: "08:00-18:00",
          saturday: "09:00-14:00",
          sunday: "closed",
        })
        setShowMap(false)
        setSelectedGeocodeResult(null)

        // Try to get user location for defaults
        setIsLoadingLocation(true)
        getUserLocation()
          .then((location) => {
            setLatitude(location.latitude.toString())
            setLongitude(location.longitude.toString())
            const countryCode = getCountryFromCoordinates(location.latitude, location.longitude)
            if (countryCode) {
              setCountry(countryCode)
            }
          })
          .catch((err) => {
            console.warn("Failed to get user location:", err)
          })
          .finally(() => {
            setIsLoadingLocation(false)
          })
      }
      setIsSubmitting(false)
      setLocationSearch("")
      setGeocodeResults([])
      setSelectedGeocodeResult(null)
      setIsSearching(false)
    }
  }, [open, office])

  // Debounced geocode search
  React.useEffect(() => {
    if (!locationSearch.trim() || locationSearch.length < 3) {
      setGeocodeResults([])
      setIsSearching(false)
      return
    }

    if (!country || country.length !== 2) {
      setGeocodeResults([])
      setIsSearching(false)
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const result = await geocodeLocation({
          query: locationSearch,
          country: country,
          limit: 5,
          accessToken,
          refreshToken,
          onTokenUpdate,
        })

        if (result && result.results) {
          setGeocodeResults(result.results)
        } else {
          setGeocodeResults([])
        }
      } catch (error) {
        console.error("Failed to geocode location:", error)
        setGeocodeResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500) // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [locationSearch, country, accessToken, refreshToken, onTokenUpdate])

  const handleSelectGeocodeResult = (result: GeocodeResult) => {
    setSelectedGeocodeResult(result)
    const lat = result.latitude
    const lng = result.longitude
    setLatitude(lat.toString())
    setLongitude(lng.toString())
    
    // Update map center and show map
    setMapCenter([lat, lng])
    setShowMap(true)
    
    // Build address from result
    const addressParts: string[] = []
    if (result.address.house_number) addressParts.push(result.address.house_number)
    if (result.address.road) addressParts.push(result.address.road)
    if (result.address.building) addressParts.push(result.address.building)
    if (result.address.shop) addressParts.push(result.address.shop)
    if (result.address.neighbourhood) addressParts.push(result.address.neighbourhood)
    if (result.address.village) addressParts.push(result.address.village)
    
    setAddress(addressParts.length > 0 ? addressParts.join(", ") : result.display_name)
    
    // Set city, county, country
    if (result.address.city) {
      setCity(result.address.city)
    }
    if (result.address.county || result.address.state) {
      setCounty(result.address.county || result.address.state || "")
    }
    if (result.address.country_code) {
      const countryCode = result.address.country_code.toUpperCase()
      // Map country codes (ug -> UG, ke -> KE)
      if (countryCode === "UG") setCountry("UG")
      else if (countryCode === "KE") setCountry("KE")
      else setCountry(countryCode)
    }
    
    // Clear search results after selection
    setGeocodeResults([])
    setLocationSearch("")
  }

  // Handle location change from map
  const handleMapLocationChange = (lat: number, lng: number) => {
    setLatitude(lat.toString())
    setLongitude(lng.toString())
    setMapCenter([lat, lng])
  }

  // Sync map center when coordinates are manually edited (but not from map interaction)
  React.useEffect(() => {
    const latNum = parseFloat(latitude)
    const lngNum = parseFloat(longitude)
    if (!isNaN(latNum) && !isNaN(lngNum) && showMap) {
      // Only update if the coordinates actually changed (avoid infinite loop)
      // Small epsilon check to handle floating point comparisons
      const epsilon = 0.000001
      if (Math.abs(mapCenter[0] - latNum) > epsilon || Math.abs(mapCenter[1] - lngNum) > epsilon) {
        setMapCenter([latNum, lngNum])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, showMap])

  const handleOpeningHourChange = (day: string, value: string) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!officeName.trim()) {
      toast.error("Office name is required")
      return
    }

    // Validate location - either from geocode selection or manual entry
    if (!latitude || !longitude) {
      toast.error("Please search and select a location, or enter latitude and longitude manually")
      return
    }

    const latNum = parseFloat(latitude)
    const lngNum = parseFloat(longitude)

    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error("Invalid latitude or longitude")
      return
    }

    // Round coordinates to 6 decimal places (approximately 0.1 meter precision)
    // This ensures we stay within the 9-digit limit for the API
    const roundedLat = Math.round(latNum * 1000000) / 1000000
    const roundedLng = Math.round(lngNum * 1000000) / 1000000

    if (!address.trim()) {
      toast.error("Address is required")
      return
    }

    if (!city.trim()) {
      toast.error("City is required")
      return
    }

    if (!country.trim()) {
      toast.error("Country is required")
      return
    }

    if (!phone.trim()) {
      toast.error("Phone number is required")
      return
    }

    if (!email.trim()) {
      toast.error("Email is required")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      const formattedPhone = formatPhoneNumber(phone, country === "KE" ? "+254" : "+256")

      if (office) {
        // Update existing office
        await updateAgentOffice({
          officeId: office.id,
          office_name: officeName.trim(),
          latitude: roundedLat,
          longitude: roundedLng,
          address: address.trim(),
          city: city.trim(),
          county: county.trim(),
          country: country.trim(),
          phone: formattedPhone,
          email: email.trim(),
          opening_hours: openingHours,
          accessToken,
          refreshToken,
          onTokenUpdate,
        })
        toast.success("Office updated successfully!")
      } else {
        // Create new office
        await createAgentOffice({
          office_name: officeName.trim(),
          latitude: roundedLat,
          longitude: roundedLng,
          address: address.trim(),
          city: city.trim(),
          county: county.trim(),
          country: country.trim(),
          phone: formattedPhone,
          email: email.trim(),
          opening_hours: openingHours,
          accessToken,
          refreshToken,
          onTokenUpdate,
        })
        toast.success("Office created successfully!")
      }

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save office. Please try again."
      toast.error(errorMessage)
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl max-h-[95vh]">
        <DrawerHeader className="px-4 pb-2">
          <div className="flex items-center gap-3">
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="text-lg font-semibold">
              {office ? "Edit Office" : "Create Office"}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-4 pb-6 overflow-y-auto flex-1 space-y-6">
          {/* Office Name */}
          <div className="space-y-2">
            <Label htmlFor="office_name">Office Name *</Label>
            <Input
              id="office_name"
              type="text"
              placeholder="e.g., Nairobi Central Office"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="h-12 rounded-xl"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Location Search */}
          <div className="space-y-2">
            <Label htmlFor="location_search">Search Location *</Label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="location_search"
                type="text"
                placeholder="e.g., Kampala, Nairobi, etc."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="h-12 rounded-xl pl-10 pr-4"
                disabled={isSubmitting || isLoadingLocation}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            
            {/* Geocode Results */}
            {geocodeResults.length > 0 && (
              <div className="mt-2 space-y-2 border rounded-xl p-2 bg-background max-h-60 overflow-y-auto">
                {geocodeResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectGeocodeResult(result)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all duration-200 relative",
                      selectedGeocodeResult === result
                        ? "bg-foreground text-background border-foreground shadow-md"
                        : "bg-background hover:bg-muted border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <MapPinIcon className="h-4 w-4 shrink-0" />
                          {result.display_name}
                        </div>
                        {result.address.city && (
                          <p className="text-xs mt-1 opacity-80">
                            {result.address.city}
                            {result.address.state && `, ${result.address.state}`}
                          </p>
                        )}
                      </div>
                      {selectedGeocodeResult === result && (
                        <CheckIconSolid className={cn(
                          "h-4 w-4 shrink-0",
                          selectedGeocodeResult === result ? "text-background" : "text-foreground"
                        )} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Location Display */}
            {selectedGeocodeResult && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckIconSolid className="h-4 w-4" />
                  <span className="text-sm font-medium">Selected: {selectedGeocodeResult.display_name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Map for location pinning */}
          {showMap && latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) && (
            <div className="space-y-2">
              <Label>Pin exact location on map</Label>
              <p className="text-sm text-muted-foreground">
                Click on the map or drag the red pin to set the exact coordinates
              </p>
              <LocationPinMap
                center={mapCenter}
                onLocationChange={handleMapLocationChange}
                height={300}
                zoom={15}
              />
            </div>
          )}

          {/* Latitude and Longitude (editable after selection, or can be entered manually) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g., -1.2921"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value)
                  // Clear selected result if manually editing
                  if (selectedGeocodeResult && e.target.value !== selectedGeocodeResult.latitude.toString()) {
                    setSelectedGeocodeResult(null)
                  }
                }}
                className={cn(
                  "h-12 rounded-xl",
                  selectedGeocodeResult ? "bg-muted" : ""
                )}
                disabled={isSubmitting || isLoadingLocation}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g., 36.8219"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value)
                  // Clear selected result if manually editing
                  if (selectedGeocodeResult && e.target.value !== selectedGeocodeResult.longitude.toString()) {
                    setSelectedGeocodeResult(null)
                  }
                }}
                className={cn(
                  "h-12 rounded-xl",
                  selectedGeocodeResult ? "bg-muted" : ""
                )}
                disabled={isSubmitting || isLoadingLocation}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              placeholder="e.g., Kenyatta Avenue, opposite Hilton Hotel"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-h-[80px] rounded-xl resize-none"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* City, County, Country */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                type="text"
                placeholder="e.g., Nairobi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-12 rounded-xl"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                type="text"
                placeholder="e.g., Nairobi"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="h-12 rounded-xl"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                type="text"
                placeholder="e.g., KE"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                className="h-12 rounded-xl"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., +254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 rounded-xl"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., nairobi@pickupwaka.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Opening Hours */}
          <div className="space-y-3">
            <Label>Opening Hours</Label>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="flex items-center gap-3">
                  <Label htmlFor={`hours-${day.key}`} className="w-24 text-sm">
                    {day.label}
                  </Label>
                  <Input
                    id={`hours-${day.key}`}
                    type="text"
                    placeholder="e.g., 08:00-18:00 or closed"
                    value={openingHours[day.key] || ""}
                    onChange={(e) => handleOpeningHourChange(day.key, e.target.value)}
                    className="h-12 rounded-xl flex-1"
                    disabled={isSubmitting}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (office ? "Updating..." : "Creating...") : office ? "Update Office" : "Create Office"}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

