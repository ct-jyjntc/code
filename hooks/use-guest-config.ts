"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { GuestConfig } from "@/types/config"

let cachedConfig: GuestConfig | null = null
let inflightPromise: Promise<GuestConfig> | null = null

export const useGuestConfig = () => {
  const [config, setConfig] = useState<GuestConfig | null>(cachedConfig)
  const [loading, setLoading] = useState(!cachedConfig)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig)
      setLoading(false)
      return
    }

    if (!inflightPromise) {
      inflightPromise = api
        .getGuestConfig()
        .then((data) => (data ?? ({} as GuestConfig)))
        .catch((err) => {
          inflightPromise = null
          throw err
        })
    }

    inflightPromise
      .then((data) => {
        cachedConfig = data
        setConfig(data)
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => setLoading(false))
  }, [])

  return { config, loading, error }
}
