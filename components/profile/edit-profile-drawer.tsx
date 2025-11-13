"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
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
import { ArrowLeftIcon, CameraIcon } from "@heroicons/react/24/outline"
import { updateUserProfile, uploadProfileImage, type UserProfile } from "@/lib/services/profile"
import { formatPhoneNumber } from "@/lib/utils/phone"
import { ChevronDownIcon } from "@heroicons/react/24/outline"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUserPreferences } from "@/lib/stores/user-preferences"

interface EditProfileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile | null
  profileImageUrl: string | null
  onProfileUpdate: (profile: UserProfile) => void
}

const COUNTRIES: Array<{ code: "+256" | "+254"; flag: string; name: string }> = [
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
]

export function EditProfileDrawer({
  open,
  onOpenChange,
  profile,
  profileImageUrl,
  onProfileUpdate,
}: EditProfileDrawerProps) {
  const { data: session, update: updateSession } = useSession()
  const countryCode = useUserPreferences((state) => state.countryCode)
  const [username, setUsername] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [phoneCountryCode, setPhoneCountryCode] = React.useState<"+256" | "+254">("+254")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isUploadingImage, setIsUploadingImage] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Initialize form with profile data
  React.useEffect(() => {
    if (profile && open) {
      setUsername(profile.username || "")
      
      // Extract country code from phone number
      if (profile.phone_number.startsWith("+256")) {
        setPhoneCountryCode("+256")
        setPhoneNumber(profile.phone_number.replace("+256", ""))
      } else if (profile.phone_number.startsWith("+254")) {
        setPhoneCountryCode("+254")
        setPhoneNumber(profile.phone_number.replace("+254", ""))
      } else {
        // Default based on stored country code
        const defaultCode = countryCode === "UG" ? "+256" : "+254"
        setPhoneCountryCode(defaultCode)
        setPhoneNumber(profile.phone_number)
      }
    }
  }, [profile, open, countryCode])

  // Initialize phone country code based on stored country code
  React.useEffect(() => {
    if (!profile && open) {
      setPhoneCountryCode(countryCode === "UG" ? "+256" : "+254")
    }
  }, [countryCode, open, profile])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!session?.accessToken || !session?.refreshToken) {
      toast.error("Session expired. Please login again.")
      return
    }

    if (!username.trim()) {
      toast.error("Username is required")
      return
    }

    if (!phoneNumber.trim()) {
      toast.error("Phone number is required")
      return
    }

    setIsSubmitting(true)

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber, phoneCountryCode)

      const updatedProfile = await updateUserProfile({
        username: username.trim(),
        phone_number: formattedPhone,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        onTokenUpdate: async (newAccessToken, newRefreshToken) => {
          await updateSession({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })
        },
      })

      if (updatedProfile) {
        toast.success("Profile updated successfully!")
        onProfileUpdate(updatedProfile)
        onOpenChange(false)
      } else {
        toast.error("Failed to update profile. Please try again.")
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
      if (error instanceof Error && error.message.includes("Token refresh failed")) {
        toast.error("Session expired. Please login again.")
        return
      }
      toast.error("Failed to update profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!session?.accessToken || !session?.refreshToken) {
      toast.error("Session expired. Please login again.")
      return
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (15MB max)
    const maxSize = 15 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("Image size must be less than 15MB")
      return
    }

    setIsUploadingImage(true)

    try {
      const imageUrl = await uploadProfileImage({
        file,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        onTokenUpdate: async (newAccessToken, newRefreshToken) => {
          await updateSession({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          })
        },
      })

      if (imageUrl) {
        toast.success("Profile image uploaded successfully!")
        // Update profile with new image URL
        if (profile) {
          onProfileUpdate({
            ...profile,
            avatar: imageUrl,
          })
        }
      } else {
        toast.error("Failed to upload image. Please try again.")
      }
    } catch (error) {
      console.error("Failed to upload image:", error)
      if (error instanceof Error) {
        if (error.message.includes("Token refresh failed")) {
          toast.error("Session expired. Please login again.")
        } else if (error.message.includes("15MB")) {
          toast.error(error.message)
        } else {
          toast.error("Failed to upload image. Please try again.")
        }
      } else {
        toast.error("Failed to upload image. Please try again.")
      }
    } finally {
      setIsUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
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
            <DrawerTitle className="text-lg font-semibold">Edit Profile</DrawerTitle>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-4 pb-6 overflow-y-auto flex-1 space-y-6">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="p-2 rounded-full bg-green-50">
                <img
                  src={profile?.avatar || profileImageUrl || "https://i.pravatar.cc/160?img=12"}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder on error
                    e.currentTarget.src = "https://i.pravatar.cc/160?img=12"
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                <CameraIcon className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {isUploadingImage && (
              <p className="text-xs text-muted-foreground">Uploading image...</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={profile?.email || ""}
              disabled
              className="h-12 rounded-xl bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 rounded-xl"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 pointer-events-none">
                <span className="text-lg">
                  {COUNTRIES.find((c) => c.code === phoneCountryCode)?.flag}
                </span>
              </div>
              <Select
                value={phoneCountryCode}
                onValueChange={(value) => setPhoneCountryCode(value as "+256" | "+254")}
                disabled={isSubmitting}
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
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-14 h-12 rounded-xl"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-foreground text-background font-medium"
            >
              {isSubmitting ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

