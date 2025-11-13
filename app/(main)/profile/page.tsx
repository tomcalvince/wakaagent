"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import MobilePageHeader from '@/components/shared/mobile-page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ChevronRightIcon, BellIcon, HomeIcon, LifebuoyIcon, LockClosedIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { fetchUserProfile, fetchProfileImage, type UserProfile } from '@/lib/services/profile';
import { EditProfileDrawer } from '@/components/profile/edit-profile-drawer';

const ProfilePage = () => {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileImageUrl, setProfileImageUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load profile data
  React.useEffect(() => {
    async function loadProfile() {
      if (!session?.accessToken || !session?.refreshToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch profile and image in parallel
        const [profileData, imageUrl] = await Promise.all([
          fetchUserProfile({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            onTokenUpdate: async (newAccessToken, newRefreshToken) => {
              await updateSession({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              });
            },
          }),
          fetchProfileImage({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            onTokenUpdate: async (newAccessToken, newRefreshToken) => {
              await updateSession({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              });
            },
          }),
        ]);

        if (profileData) {
          setProfile(profileData);
        }
        if (imageUrl) {
          // Ensure URL is absolute
          const absoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${imageUrl}`;
          setProfileImageUrl(absoluteUrl);
          if (process.env.NODE_ENV !== "production") {
            console.log("[profile] Image URL set:", absoluteUrl);
          }
        } else {
          setProfileImageUrl(null);
          if (process.env.NODE_ENV !== "production") {
            console.log("[profile] No image URL returned from API");
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        if (error instanceof Error && error.message.includes("Token refresh failed")) {
          await signOut({ redirect: false });
          router.push("/login");
          router.refresh();
          return;
        }
        toast.error("Failed to load profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [session?.accessToken, session?.refreshToken, updateSession, router]);

  const handleLogout = async () => {
    try {
      setLogoutOpen(false);
      await signOut({ redirect: false });
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Failed to log out. Please try again.");
      console.error("Logout error:", error);
    }
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    // Refresh profile image
    if (session?.accessToken && session?.refreshToken) {
      fetchProfileImage({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        onTokenUpdate: async (newAccessToken, newRefreshToken) => {
          await updateSession({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        },
      }).then((url) => {
        if (url) {
          setProfileImageUrl(url);
        }
      });
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile?.username) {
      return profile.username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };
  return (
    <div className="flex flex-1 flex-col md:gap-6 gap-0 md:p-6 p-0 h-full">
      {/* Mobile header */}
      <MobilePageHeader title="Profile" rightSlot={''}/>

      {/* Mobile content */}
      <div className="md:hidden px-4 py-3 space-y-4 overflow-y-auto">
        {/* Top profile */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-muted-foreground text-sm">Loading profile...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-2 rounded-full bg-green-50">
              <Avatar className="h-20 w-20" key={profileImageUrl || profile?.avatar || "no-image"}>
                {profileImageUrl || profile?.avatar ? (
                  <AvatarImage 
                    src={profileImageUrl || profile?.avatar || ""} 
                    alt="avatar"
                    onError={(e) => {
                      // Hide image on error, show fallback
                      if (process.env.NODE_ENV !== "production") {
                        console.error("[profile] Image failed to load:", profileImageUrl || profile?.avatar);
                      }
                      e.currentTarget.style.display = 'none'
                    }}
                    onLoad={() => {
                      if (process.env.NODE_ENV !== "production") {
                        console.log("[profile] Image loaded successfully:", profileImageUrl || profile?.avatar);
                      }
                    }}
                  />
                ) : null}
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">{profile?.username || 'Agent'}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email || 'agent@example.com'}</p>
            </div>
            <Button className="rounded-full px-5" onClick={() => setEditProfileOpen(true)}>
              Edit profile
            </Button>
          </div>
        )}

        {/* Inventories */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Inventories</p>
          <Card className="rounded-2xl divide-y p-2 overflow-hidden">
            <div className='pb-4'>
              <Button variant={"ghost"} className="w-full flex items-center gap-3 px-3 py-2 text-left" asChild>
                <a href="/offices">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                    <HomeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium">My stores</span>
                    <div className="flex items-center gap-2">
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </a>
              </Button>
            </div>
            <Button variant={"ghost"} className="w-full flex items-center gap-3 px-3 py-2 text-left">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <LifebuoyIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="font-medium">Support</span>
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            </Button>
          </Card>
        </div>

        {/* Preferences */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Preferences</p>
          <Card className="rounded-2xl divide-y p-2 overflow-hidden">
            <div className="w-full flex items-center gap-3 px-3 py-2">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <BellIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="font-medium">Push notifications</span>
                <Switch />
              </div>
            </div>
            <Button variant={"ghost"} className="w-full flex items-center gap-3 px-3 py-3 text-left">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <LockClosedIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="font-medium">PIN Code</span>
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            </Button>
          </Card>
        </div>

        {/* Logout */}
        <Card className="rounded-none p-2 overflow-hidden">
          <Button onClick={() => setLogoutOpen(true)} variant={"ghost"} className="w-full flex items-center gap-3 p-3 text-left justify-items-start text-red-600">
            <div className="h-9 w-9 rounded-xl text-red-600 flex items-center justify-center">
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
            </div>
            <span className="font-medium">Logout</span>
          </Button>
        </Card>
      </div>
      {/* Logout confirmation */}
      <Drawer open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DrawerContent className="rounded-t-3xl">
          <DrawerHeader>
            <DrawerTitle>Logout</DrawerTitle>
            <DrawerDescription>Are you sure you want to log out?</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full h-12">No</Button>
              </DrawerClose>
              <Button className="w-full h-12" onClick={handleLogout}>Yes</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Profile Drawer */}
      <EditProfileDrawer
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        profile={profile}
        profileImageUrl={profileImageUrl}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  )
}

export default ProfilePage