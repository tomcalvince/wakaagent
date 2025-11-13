"use client"

import * as React from "react"
import { ArrowLeftIcon, UserIcon } from "@heroicons/react/24/outline"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddParcelDialog } from "./add-parcel-dialog"
import { fetchAgentOffices, type AgentOffice } from "@/lib/services/agent-offices"
import {
  fetchDeliveryWindows,
  createMultiRecipientOrder,
  type DeliveryWindow,
  type ParcelPayload,
} from "@/lib/services/orders"
import { formatPhoneNumber } from "@/lib/utils/phone"
import { ChevronDownIcon } from "@heroicons/react/24/outline"
import { useUserPreferences } from "@/lib/stores/user-preferences"

interface Parcel extends ParcelPayload {
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

interface CreateOrderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrderDrawer({ open, onOpenChange }: CreateOrderDrawerProps) {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const countryCode = useUserPreferences((state) => state.countryCode)
  const [deliveryType, setDeliveryType] = React.useState<"dropoff" | "express">("dropoff")
  const [agentOffices, setAgentOffices] = React.useState<AgentOffice[]>([])
  const [selectedOriginOffice, setSelectedOriginOffice] = React.useState<string>("")
  const [deliveryWindows, setDeliveryWindows] = React.useState<DeliveryWindow[]>([])
  const [selectedDeliveryWindow, setSelectedDeliveryWindow] = React.useState<string>("")
  const [senderName, setSenderName] = React.useState("")
  const [senderPhone, setSenderPhone] = React.useState("")
  const [parcels, setParcels] = React.useState<Parcel[]>([])
  const [isParcelDialogOpen, setIsParcelDialogOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [senderCountryCode, setSenderCountryCode] = React.useState<"+256" | "+254">("+254")
  const [editingParcelId, setEditingParcelId] = React.useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false)

  const COUNTRIES: Array<{ code: "+256" | "+254"; flag: string; name: string }> = [
    { code: "+256", flag: "🇺🇬", name: "Uganda" },
    { code: "+254", flag: "🇰🇪", name: "Kenya" },
  ]

  // Initialize sender country code based on stored country code
  React.useEffect(() => {
    setSenderCountryCode(countryCode === "UG" ? "+256" : "+254")
  }, [countryCode])

  // Fetch agent offices and delivery windows on mount
  React.useEffect(() => {
    if (!open || !session?.accessToken || !session?.refreshToken) return

    async function loadData() {
      const currentSession = session
      if (!currentSession?.accessToken || !currentSession?.refreshToken) return

      setIsLoading(true)
      try {
        // Fetch agent offices
        const offices = await fetchAgentOffices({
          accessToken: currentSession.accessToken,
          refreshToken: currentSession.refreshToken,
          onTokenUpdate: async (newAccessToken, newRefreshToken) => {
            await updateSession({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            })
          },
        })

        if (offices.length > 0) {
          setAgentOffices(offices)
          // Preselect first office
          setSelectedOriginOffice(offices[0].id)
        }

        // Fetch delivery windows
        const windows = await fetchDeliveryWindows({
          accessToken: currentSession.accessToken,
          refreshToken: currentSession.refreshToken,
          onTokenUpdate: async (newAccessToken, newRefreshToken) => {
            await updateSession({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            })
          },
        })

        const activeWindows = windows.filter((w) => w.is_active)
        setDeliveryWindows(activeWindows)
        // Preselect first active window
        if (activeWindows.length > 0) {
          setSelectedDeliveryWindow(activeWindows[0].window_type)
        }
      } catch (error) {
        console.error("Failed to load data:", error)
        if (error instanceof Error && error.message.includes("Token refresh failed")) {
          await signOut({ redirect: false })
          router.push("/login")
          router.refresh()
          return
        }
        toast.error("Failed to load form data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [open, session?.accessToken, session?.refreshToken, updateSession, router, session])

  const handleAddParcel = (parcelData: {
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
  }) => {
    // Calculate estimated_weight from size (rough approximation)
    const weightMap: Record<string, number> = {
      small: 0.5,
      medium: 3,
      large: 10,
      xlarge: 20,
    }

    const parcel: Parcel = {
      id: editingParcelId || Date.now().toString(),
      description: parcelData.description,
      parcel_name: parcelData.description,
      value: parcelData.value,
      cod: parcelData.cod,
      amount: parcelData.amount,
      size: parcelData.size,
      recipientName: parcelData.recipientName,
      recipientPhone: parcelData.recipientPhone,
      specialNotes: parcelData.specialNotes,
      deliveryDestination: parcelData.deliveryDestination,
      destination_agent_office: parcelData.destination_agent_office,
      destination_office_name: parcelData.deliveryDestination,
      estimated_weight: weightMap[parcelData.size] || 1,
      declared_value: parseFloat(parcelData.value) || 0,
      recipient_name: parcelData.recipientName,
      recipient_phone: formatPhoneNumber(parcelData.recipientPhone),
      special_instructions: parcelData.specialNotes || undefined,
    }

    if (editingParcelId) {
      // Update existing parcel
      setParcels(parcels.map((p) => (p.id === editingParcelId ? parcel : p)))
      setEditingParcelId(null)
    } else {
      // Add new parcel
      setParcels([...parcels, parcel])
    }
    setIsParcelDialogOpen(false)
  }

  const handleEditParcel = (parcel: Parcel) => {
    setEditingParcelId(parcel.id)
    setIsParcelDialogOpen(true)
  }

  const handleRemoveParcel = (id: string) => {
    setParcels(parcels.filter((p) => p.id !== id))
  }

  const handleSubmit = () => {
    // Validation
    if (!selectedOriginOffice) {
      toast.error("Please select an origin office")
      return
    }

    if (!senderName.trim()) {
      toast.error("Please enter sender name")
      return
    }

    if (!senderPhone.trim()) {
      toast.error("Please enter sender phone")
      return
    }

    if (!selectedDeliveryWindow) {
      toast.error("Please select a delivery time")
      return
    }

    if (parcels.length === 0) {
      toast.error("Please add at least one parcel")
      return
    }

    // Validate all parcels have required fields
    for (const parcel of parcels) {
      if (!parcel.destination_agent_office) {
        toast.error(`Parcel "${parcel.parcel_name}" is missing destination office`)
        return
      }
    }

    // Show confirmation dialog
    setShowConfirmDialog(true)
  }

  const handleConfirmSubmit = async () => {
    if (!session?.accessToken || !session?.refreshToken) {
      toast.error("Session expired. Please login again.")
      setShowConfirmDialog(false)
      return
    }

    setIsSubmitting(true)
    setShowConfirmDialog(false)

    try {
      // Format phone numbers
      const formattedSenderPhone = formatPhoneNumber(senderPhone, senderCountryCode)

      // Map parcels to payload format
      const parcelPayloads: ParcelPayload[] = parcels.map((parcel) => ({
        parcel_name: parcel.parcel_name,
        estimated_weight: parcel.estimated_weight,
        size: parcel.size,
        declared_value: parcel.declared_value,
        recipient_name: parcel.recipient_name,
        recipient_phone: formatPhoneNumber(parcel.recipientPhone),
        destination_agent_office: parcel.destination_agent_office,
        special_instructions: parcel.special_instructions,
      }))

      const result = await createMultiRecipientOrder({
        origin_agent_office: selectedOriginOffice,
        sender_name: senderName.trim(),
        sender_phone: formattedSenderPhone,
        service_option: deliveryType === "dropoff" ? "drop-off" : "express",
        delivery_time: selectedDeliveryWindow,
        parcels: parcelPayloads,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        onTokenUpdate: async (newAccessToken, newRefreshToken) => {
          await updateSession({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })
        },
      })

      if (result) {
        toast.success(`Order ${result.order_number} created successfully!`)
        handleClose()
        // Optionally refresh the orders list or navigate to order details
      } else {
        toast.error("Failed to create order. Please try again.")
      }
    } catch (error) {
      console.error("Failed to create order:", error)
      if (error instanceof Error && error.message.includes("Token refresh failed")) {
        await signOut({ redirect: false })
        router.push("/login")
        router.refresh()
        return
      }
      toast.error("Failed to create order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form when closing
    setDeliveryType("dropoff")
    setSelectedOriginOffice("")
    setSelectedDeliveryWindow("")
    setSenderName("")
    setSenderPhone("")
    setParcels([])
    setEditingParcelId(null)
  }

  const selectedOriginOfficeData = agentOffices.find((o) => o.id === selectedOriginOffice)

  return (
    <>
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="rounded-t-3xl max-h-[95vh]">
          <DrawerHeader className="px-4 pb-2">
            <div className="flex items-center gap-3">
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <ArrowLeftIcon className="h-5 w-5" />
                </Button>
              </DrawerClose>
              <DrawerTitle className="text-lg font-semibold">Create Delivery</DrawerTitle>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto flex-1 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground text-sm">Loading...</p>
              </div>
            ) : (
              <>
                {/* Delivery Type Selection */}
                <Tabs
                  value={deliveryType}
                  onValueChange={(value) => setDeliveryType(value as "dropoff" | "express")}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 h-12 bg-muted">
                    <TabsTrigger
                      value="dropoff"
                      className="text-sm font-medium"
                    >
                      WAKA-DROPOFF
                    </TabsTrigger>
                    <TabsTrigger
                      value="express"
                      className="text-sm font-medium"
                    >
                      WAKA-EXPRESS
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* From Agent Selection */}
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select value={selectedOriginOffice} onValueChange={setSelectedOriginOffice}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select Agent Office">
                        {selectedOriginOfficeData?.office_name || "Select Agent Office"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {agentOffices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.office_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Time Selection */}
                <div className="space-y-2">
                  <Label>Delivery Time</Label>
                  <Select
                    value={selectedDeliveryWindow}
                    onValueChange={setSelectedDeliveryWindow}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select Delivery Time">
                        {deliveryWindows.find((w) => w.window_type === selectedDeliveryWindow)
                          ?.window_type_display || "Select Delivery Time"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryWindows.map((window) => (
                        <SelectItem key={window.id} value={window.window_type}>
                          {window.window_type_display}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sender Name */}
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Sender Name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="pl-10 h-12 rounded-xl bg-white border"
                    />
                  </div>
                </div>

                {/* Sender Phone */}
                <div className="space-y-2">
                  <Label>Sender Phone</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 pointer-events-none">
                      <span className="text-lg">
                        {COUNTRIES.find((c) => c.code === senderCountryCode)?.flag}
                      </span>
                    </div>
                    <Select
                      value={senderCountryCode}
                      onValueChange={(value) => setSenderCountryCode(value as "+256" | "+254")}
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
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="pl-14 h-12 rounded-xl bg-white border"
                    />
                  </div>
                </div>

                {/* Parcels Section */}
                <div className="space-y-3">
                  <Label>Parcels</Label>

                  {/* Display added parcels */}
                  {parcels.length > 0 && (
                    <div className="space-y-2">
                      {parcels.map((parcel) => (
                        <div
                          key={parcel.id}
                          className="flex items-center justify-between p-3 rounded-xl border bg-background"
                        >
                          <span className="text-sm font-medium">{parcel.parcel_name}</span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditParcel(parcel)}
                              className="h-8"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveParcel(parcel.id)}
                              className="h-8 text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Parcel Button */}
                  <Button
                    type="button"
                    onClick={() => setIsParcelDialogOpen(true)}
                    className="w-full h-12 rounded-xl bg-foreground text-background font-medium"
                  >
                    {parcels.length > 0 ? "Add Another Parcel" : "Add Parcel"}
                  </Button>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-foreground text-background font-medium"
                  >
                    {isSubmitting ? "Creating Order..." : "Create Order"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AddParcelDialog
        open={isParcelDialogOpen}
        onOpenChange={(open) => {
          setIsParcelDialogOpen(open)
          if (!open) {
            setEditingParcelId(null)
          }
        }}
        onAddParcel={handleAddParcel}
        editingParcel={editingParcelId ? parcels.find((p) => p.id === editingParcelId) : undefined}
        countryCode={countryCode}
        accessToken={session?.accessToken || ""}
        refreshToken={session?.refreshToken || ""}
        onTokenUpdate={async (newAccessToken, newRefreshToken) => {
          await updateSession({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })
        }}
      />

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirm Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* Service Type */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Service Type</Label>
              <p className="text-sm font-medium">
                {deliveryType === "dropoff" ? "WAKA-DROPOFF" : "WAKA-EXPRESS"}
              </p>
            </div>

            {/* Origin Office */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <p className="text-sm font-medium">{selectedOriginOfficeData?.office_name}</p>
            </div>

            {/* Delivery Time */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Delivery Time</Label>
              <p className="text-sm font-medium">
                {deliveryWindows.find((w) => w.window_type === selectedDeliveryWindow)
                  ?.window_type_display || selectedDeliveryWindow}
              </p>
            </div>

            {/* Sender Info */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Sender Information</Label>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Name:</span> {senderName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Phone:</span> {formatPhoneNumber(senderPhone)}
                </p>
              </div>
            </div>

            {/* Parcels Summary */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">
                Parcels ({parcels.length})
              </Label>
              <div className="space-y-2">
                {parcels.map((parcel, index) => (
                  <div
                    key={parcel.id}
                    className="p-3 rounded-xl border bg-muted/50 space-y-1"
                  >
                    <p className="text-sm font-medium">
                      {index + 1}. {parcel.parcel_name}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        <span className="font-medium">Size:</span> {parcel.size} (
                        {parcel.estimated_weight} kg)
                      </p>
                      <p>
                        <span className="font-medium">Value:</span> {parcel.declared_value}
                      </p>
                      <p>
                        <span className="font-medium">Recipient:</span> {parcel.recipient_name} (
                        {formatPhoneNumber(parcel.recipientPhone)})
                      </p>
                      <p>
                        <span className="font-medium">Destination:</span>{" "}
                        {parcel.destination_office_name || "Unknown"}
                      </p>
                      {parcel.special_instructions && (
                        <p>
                          <span className="font-medium">Notes:</span> {parcel.special_instructions}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="bg-foreground text-background"
            >
              {isSubmitting ? "Creating..." : "Confirm & Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
