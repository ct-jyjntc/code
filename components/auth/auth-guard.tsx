"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { getAuthToken } from "@/lib/auth"
import { Spinner } from "@/components/ui/spinner"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      const url =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/dashboard"
      const redirect = encodeURIComponent(url || "/dashboard")
      router.replace(`/login?redirect=${redirect}`)
      return
    }
    setAuthorized(true)
  }, [router])

  if (!authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
