import type React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { AuthGuard } from "@/components/auth/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <MobileNav />

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
