"use client"

import React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import MobilePageHeader from "@/components/shared/mobile-page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline"
import {
  fetchAgentOffices,
  createAgentOffice,
  updateAgentOffice,
  deleteAgentOffice,
  type AgentOffice,
} from "@/lib/services/agent-offices"
import { OfficeFormDrawer } from "@/components/offices/office-form-drawer"
import { DeleteOfficeDialog } from "@/components/offices/delete-office-dialog"
import { cn } from "@/lib/utils"

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

function formatOpeningHours(openingHours: { [key: string]: string } | undefined) {
  if (!openingHours) return "Not set"
  const hours = DAYS_OF_WEEK.map((day) => {
    const hour = openingHours[day]
    if (!hour || hour === "closed") return null
    const dayName = day.charAt(0).toUpperCase() + day.slice(1)
    return `${dayName}: ${hour}`
  })
    .filter(Boolean)
    .slice(0, 3)
  return hours.length > 0 ? hours.join(", ") : "Closed"
}

export default function OfficesPage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [offices, setOffices] = React.useState<AgentOffice[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isFormDrawerOpen, setIsFormDrawerOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [selectedOffice, setSelectedOffice] = React.useState<AgentOffice | null>(null)
  const isRefreshingRef = React.useRef(false)
  const isFormDrawerOpenRef = React.useRef(false)

  // Keep ref in sync with state
  React.useEffect(() => {
    isFormDrawerOpenRef.current = isFormDrawerOpen
  }, [isFormDrawerOpen])

  // Stable token update callback
  const handleTokenUpdate = React.useCallback(
    async (newAccessToken: string, newRefreshToken: string) => {
      await updateSession({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      })
    },
    [updateSession]
  )

  const loadOffices = React.useCallback(async (skipLoadingState = false, force = false) => {
    if (!session?.accessToken || !session?.refreshToken) {
      if (!skipLoadingState) setIsLoading(false)
      return
    }

    // Don't reload if already refreshing, unless forced
    if (!force && isRefreshingRef.current) {
      return
    }

    if (!skipLoadingState) {
      setIsLoading(true)
    }
    isRefreshingRef.current = true
    setError(null)
    try {
      const data = await fetchAgentOffices({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        onTokenUpdate: handleTokenUpdate,
      })

      // Ensure data is always an array
      setOffices(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch offices:", err)
      if (err instanceof Error && err.message.includes("Token refresh failed")) {
        await signOut({ redirect: false })
        router.push("/login")
        router.refresh()
        return
      }
      setError("Failed to load offices. Please try again.")
    } finally {
      if (!skipLoadingState) {
        setIsLoading(false)
      }
      isRefreshingRef.current = false
    }
  }, [session?.accessToken, session?.refreshToken, handleTokenUpdate, router])

  // Store loadOffices in a ref to avoid dependency issues
  const loadOfficesRef = React.useRef(loadOffices)
  React.useEffect(() => {
    loadOfficesRef.current = loadOffices
  }, [loadOffices])

  React.useEffect(() => {
    // Only load on initial mount or when session tokens change, and drawer is not open
    if (session?.accessToken && session?.refreshToken && !isFormDrawerOpenRef.current) {
      loadOfficesRef.current()
    }
  }, [session?.accessToken, session?.refreshToken])

  const handleCreateOffice = () => {
    setSelectedOffice(null)
    setIsFormDrawerOpen(true)
  }

  const handleEditOffice = (office: AgentOffice) => {
    setSelectedOffice(office)
    setIsFormDrawerOpen(true)
  }

  const handleDeleteOffice = (office: AgentOffice) => {
    setSelectedOffice(office)
    setIsDeleteDialogOpen(true)
  }

  const handleFormSuccess = React.useCallback(() => {
    setIsFormDrawerOpen(false)
    setSelectedOffice(null)
    // Delay the reload to allow drawer to close smoothly, and force reload even if drawer state hasn't updated yet
    setTimeout(() => {
      loadOffices(true, true) // Skip loading state and force reload
    }, 300)
  }, [loadOffices])

  const handleDeleteSuccess = React.useCallback(() => {
    setIsDeleteDialogOpen(false)
    setSelectedOffice(null)
    // Delay the reload to allow dialog to close smoothly, and force reload
    setTimeout(() => {
      loadOffices(true, true) // Skip loading state and force reload
    }, 300)
  }, [loadOffices])

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col md:gap-6 gap-0 md:p-6 p-0 h-full">
        <MobilePageHeader title="Offices" />
        <div className="flex items-center justify-center flex-1 px-4">
          <p className="text-muted-foreground">Loading offices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col md:gap-6 gap-0 md:p-6 p-0 h-full">
      <MobilePageHeader
        title="Offices"
        rightSlot={
          <Button
            size="sm"
            onClick={handleCreateOffice}
            className="h-9 rounded-full"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Office
          </Button>
        }
      />

      <div className="px-4 py-4 md:hidden space-y-4 overflow-y-auto">
        {error && (
          <Card className="rounded-2xl p-4 border-red-200 bg-red-50 dark:bg-red-950">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}

        {!error && Array.isArray(offices) && offices.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BuildingOfficeIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No offices found</EmptyTitle>
              <EmptyDescription>
                Get started by creating your first office location.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={handleCreateOffice} className="mt-4">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Office
            </Button>
          </Empty>
        ) : (
          Array.isArray(offices) && offices.map((office) => (
            <Card key={office.id} className="rounded-2xl p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base">{office.office_name}</h3>
                    {office.office_code && (
                      <Badge variant="outline" className="text-xs">
                        {office.office_code}
                      </Badge>
                    )}
                    {!office.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{office.city}, {office.country}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => handleEditOffice(office)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteOffice(office)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="flex-1">{office.address}</p>
                </div>
                {office.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p>{office.phone}</p>
                  </div>
                )}
                {office.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p>{office.email}</p>
                  </div>
                )}
                {office.opening_hours && (
                  <div className="flex items-start gap-2">
                    <ClockIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="flex-1 text-xs">{formatOpeningHours(office.opening_hours)}</p>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Form Drawer */}
      <OfficeFormDrawer
        open={isFormDrawerOpen}
        onOpenChange={setIsFormDrawerOpen}
        office={selectedOffice}
        onSuccess={handleFormSuccess}
        accessToken={session?.accessToken || ""}
        refreshToken={session?.refreshToken || ""}
        onTokenUpdate={handleTokenUpdate}
      />

      {/* Delete Dialog */}
      {selectedOffice && (
        <DeleteOfficeDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          office={selectedOffice}
          onSuccess={handleDeleteSuccess}
          accessToken={session?.accessToken || ""}
          refreshToken={session?.refreshToken || ""}
          onTokenUpdate={handleTokenUpdate}
        />
      )}
    </div>
  )
}

