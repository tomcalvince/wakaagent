"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { searchAgentOfficesByLocation, type AgentOffice } from "@/lib/services/agent-offices"
import { formatPhoneNumber } from "@/lib/utils/phone"
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUserPreferences } from "@/lib/stores/user-preferences"

interface Parcel {
  id: string
  description: string
  parcel_name: string
  value: string
  cod: boolean
  amount: string
  size: string
  recipientName: string
  recipientPhone: string
  specialNotes: string
  deliveryDestination: string
  destination_agent_office: string
  destination_office_name?: string
}

interface AddParcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddParcel: (data: {
    description: string
    value: string
    cod: boolean
    amount: string
    size: string
    recipientName: string
    recipientPhone: string
    specialNotes: string
    deliveryDestination: string
    destination_agent_office: string
  }) => void
  editingParcel?: Parcel
  countryCode: string
  accessToken: string
  refreshToken: string
  onTokenUpdate: (accessToken: string, refreshToken: string) => Promise<void>
}

const SIZES = [
  { value: "small", label: "Small", weight: "< 1 kg" },
  { value: "medium", label: "Medium", weight: "1 - 5 kg" },
  { value: "large", label: "Large", weight: "5 - 15 kg" },
  { value: "xlarge", label: "X-Large", weight: "> 15 kg" },
]

const COUNTRIES: Array<{ code: "+256" | "+254"; flag: string; name: string }> = [
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
]

export function AddParcelDialog({
  open,
  onOpenChange,
  onAddParcel,
  editingParcel,
  countryCode,
  accessToken,
  refreshToken,
  onTokenUpdate,
}: AddParcelDialogProps) {
  const storedCountryCode = useUserPreferences((state) => state.countryCode)
  const [description, setDescription] = React.useState("")
  const [value, setValue] = React.useState("")
  const [cod, setCod] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const [selectedSize, setSelectedSize] = React.useState<string>("")
  const [recipientName, setRecipientName] = React.useState("")
  const [recipientPhone, setRecipientPhone] = React.useState("")
  const [specialNotes, setSpecialNotes] = React.useState("")
  const [deliveryLocationSearch, setDeliveryLocationSearch] = React.useState("")
  const [destinationOffices, setDestinationOffices] = React.useState<AgentOffice[]>([])
  const [selectedDestinationOffice, setSelectedDestinationOffice] = React.useState<string>("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [recipientCountryCode, setRecipientCountryCode] = React.useState<"+256" | "+254">("+254")
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const isMountedRef = React.useRef(true)

  // Initialize recipient country code from store or prop
  React.useEffect(() => {
    const effectiveCountryCode = storedCountryCode || countryCode
    setRecipientCountryCode(effectiveCountryCode === "UG" ? "+256" : "+254")
  }, [storedCountryCode, countryCode])

  // Populate form when editing parcel
  React.useEffect(() => {
    if (editingParcel && open) {
      setDescription(editingParcel.description)
      setValue(editingParcel.value)
      setCod(editingParcel.cod)
      setAmount(editingParcel.amount)
      setSelectedSize(editingParcel.size)
      setRecipientName(editingParcel.recipientName)
      setSpecialNotes(editingParcel.specialNotes)
      setDeliveryLocationSearch(editingParcel.deliveryDestination)
      setSelectedDestinationOffice(editingParcel.destination_agent_office)
      // Extract country code from phone if it starts with +256 or +254
      let phoneNumber = editingParcel.recipientPhone
      if (editingParcel.recipientPhone.startsWith("+256")) {
        setRecipientCountryCode("+256")
        phoneNumber = editingParcel.recipientPhone.replace("+256", "")
      } else if (editingParcel.recipientPhone.startsWith("+254")) {
        setRecipientCountryCode("+254")
        phoneNumber = editingParcel.recipientPhone.replace("+254", "")
      }
      setRecipientPhone(phoneNumber)
    } else if (!editingParcel && open) {
      // Reset form when opening for new parcel
      setDescription("")
      setValue("")
      setCod(false)
      setAmount("")
      setSelectedSize("")
      setRecipientName("")
      setRecipientPhone("")
      setSpecialNotes("")
      setDeliveryLocationSearch("")
      setDestinationOffices([])
      setSelectedDestinationOffice("")
    }
  }, [editingParcel, open])

  // Debounced search for destination offices
  React.useEffect(() => {
    isMountedRef.current = true

    if (!deliveryLocationSearch.trim() || deliveryLocationSearch.length < 3) {
      if (isMountedRef.current) {
        setDestinationOffices([])
        setSelectedDestinationOffice("")
      }
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()

      setIsSearching(true)
      try {
        const offices = await searchAgentOfficesByLocation({
          country: countryCode,
          location_name: deliveryLocationSearch,
          radius_km: 10,
          accessToken,
          refreshToken,
          onTokenUpdate,
        })

        // Only update state if component is still mounted and search hasn't changed
        if (isMountedRef.current) {
          setDestinationOffices(offices)
          // Auto-select first result if only one
          if (offices.length === 1) {
            setSelectedDestinationOffice(offices[0].id)
          } else {
            setSelectedDestinationOffice("")
          }
        }
      } catch (error) {
        if (isMountedRef.current && !(error instanceof Error && error.name === "AbortError")) {
          console.error("Failed to search offices:", error)
          setDestinationOffices([])
          setSelectedDestinationOffice("")
        }
      } finally {
        if (isMountedRef.current) {
          setIsSearching(false)
        }
      }
    }, 800) // 800ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      isMountedRef.current = false
    }
  }, [deliveryLocationSearch, countryCode, accessToken, refreshToken, onTokenUpdate])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleSubmit = () => {
    if (!description || !selectedSize || !recipientName || !recipientPhone) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedDestinationOffice) {
      toast.error("Please select a destination office")
      return
    }

    const selectedOffice = destinationOffices.find((o) => o.id === selectedDestinationOffice)
    if (!selectedOffice) {
      toast.error("Please select a valid destination office")
      return
    }

    // Format phone number with country code before passing
    const formattedRecipientPhone = formatPhoneNumber(recipientPhone, recipientCountryCode)

    onAddParcel({
      description,
      value,
      cod,
      amount: cod ? amount : "",
      size: selectedSize,
      recipientName,
      recipientPhone: formattedRecipientPhone,
      specialNotes,
      deliveryDestination: selectedOffice.office_name,
      destination_agent_office: selectedDestinationOffice,
    })

    // Reset form only if not editing
    if (!editingParcel) {
      setDescription("")
      setValue("")
      setCod(false)
      setAmount("")
      setSelectedSize("")
      setRecipientName("")
      setRecipientPhone("")
      setSpecialNotes("")
      setDeliveryLocationSearch("")
      setDestinationOffices([])
      setSelectedDestinationOffice("")
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form when closing
    setDescription("")
    setValue("")
    setCod(false)
    setAmount("")
    setSelectedSize("")
    setRecipientName("")
    setRecipientPhone("")
    setSpecialNotes("")
    setDeliveryLocationSearch("")
    setDestinationOffices([])
    setSelectedDestinationOffice("")
  }

  const selectedDestinationOfficeData = destinationOffices.find(
    (o) => o.id === selectedDestinationOffice
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {editingParcel ? "Edit Parcel" : "Add Parcel"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              type="text"
              placeholder="eg. Light bulbs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              type="number"
              placeholder="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {/* COD */}
          <div className="space-y-2">
            <Label>COD</Label>
            <div className="flex gap-2">
              <Button
                variant={cod ? "default" : "outline"}
                onClick={() => setCod(true)}
                className={cn(
                  "flex-1 h-12 rounded-xl",
                  cod
                    ? "bg-foreground text-background"
                    : "bg-background border border-border"
                )}
              >
                YES
              </Button>
              <Button
                variant={!cod ? "default" : "outline"}
                onClick={() => setCod(false)}
                className={cn(
                  "flex-1 h-12 rounded-xl",
                  !cod
                    ? "bg-foreground text-background"
                    : "bg-background border border-border"
                )}
              >
                NO
              </Button>
            </div>
          </div>

          {/* Amount (if COD is YES) */}
          {cod && (
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          )}

          {/* Size Selection */}
          <div className="space-y-2">
            <Label>Size</Label>
            <div className="grid grid-cols-2 gap-2">
              {SIZES.map((size) => (
                <Button
                  key={size.value}
                  variant={selectedSize === size.value ? "default" : "outline"}
                  onClick={() => setSelectedSize(size.value)}
                  className={cn(
                    "h-20 flex flex-col items-center justify-center gap-1 rounded-xl",
                    selectedSize === size.value
                      ? "bg-foreground text-background"
                      : "bg-background border border-border"
                  )}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  <span className="text-xs font-medium">{size.label}</span>
                  <span className="text-xs opacity-80">{size.weight}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label>Recipient Name</Label>
            <Input
              type="text"
              placeholder="Recipient Name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Recipient Phone */}
          <div className="space-y-2">
            <Label>Recipient Phone</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 pointer-events-none">
                <span className="text-lg">
                  {COUNTRIES.find((c) => c.code === recipientCountryCode)?.flag}
                </span>
              </div>
              <Select
                value={recipientCountryCode}
                onValueChange={(value) => setRecipientCountryCode(value as "+256" | "+254")}
              >
                <SelectTrigger className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 pointer-events-auto z-20">
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name} {country.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder="phone number"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="pl-14 h-12 rounded-xl"
              />
            </div>
          </div>

          {/* Special Notes */}
          <div className="space-y-2">
            <Label>Special notes</Label>
            <Textarea
              placeholder="Special notes"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="min-h-[100px] rounded-xl resize-none"
            />
          </div>

          {/* Delivery Destination Search */}
          <div className="space-y-2">
            <Label>Delivery Destination</Label>
            <div className="relative">
              {/* Pentagon icon for agent selector */}
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <Input
                type="text"
                placeholder="Search by location (e.g. Nairobi CBD)"
                value={deliveryLocationSearch}
                onChange={(e) => setDeliveryLocationSearch(e.target.value)}
                className="pl-10 h-12 rounded-xl"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Office selection dropdown */}
            {destinationOffices.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Select destination office:
                </Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {destinationOffices.map((office) => {
                    const isSelected = selectedDestinationOffice === office.id
                    return (
                      <button
                        key={office.id}
                        type="button"
                        onClick={() => setSelectedDestinationOffice(office.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border transition-all duration-200 relative",
                          isSelected
                            ? "bg-foreground text-background border-foreground shadow-md"
                            : "bg-background hover:bg-muted border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm flex items-center gap-2">
                              {office.office_name}
                              {isSelected && (
                                <CheckIcon className="h-4 w-4 text-background" />
                              )}
                            </div>
                            <div className={cn("text-xs mt-1", isSelected ? "opacity-90" : "opacity-80")}>
                              {office.address}
                            </div>
                            {office.distance_km && (
                              <div className={cn("text-xs mt-1", isSelected ? "opacity-80" : "opacity-60")}>
                                {office.distance_km.toFixed(2)} km away
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {deliveryLocationSearch.length >= 3 &&
              !isSearching &&
              destinationOffices.length === 0 && (
                <p className="text-xs text-muted-foreground">No offices found</p>
              )}
          </div>

          {/* Selected Office Display */}
          {selectedDestinationOffice && selectedDestinationOfficeData && (
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Selected: {selectedDestinationOfficeData.office_name}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!selectedDestinationOffice}
              className="w-full h-12 rounded-xl bg-green-600 text-background font-medium disabled:opacity-50"
            >
              {editingParcel ? "Update Parcel" : "Add Parcel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
