import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Header, MobileNav } from "@/components/shared";
import { OrderFormPreloader } from "@/components/providers/order-form-preloader";
import React from "react";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <OrderFormPreloader />
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto md:overflow-y-auto overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
