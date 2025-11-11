"use client"

import { useCallback, useEffect, useState } from "react"

export const useCountdown = (defaultSeconds = 60) => {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [remaining])

  const start = useCallback(
    (seconds = defaultSeconds) => {
      setRemaining(seconds)
    },
    [defaultSeconds],
  )

  const reset = useCallback(() => setRemaining(0), [])

  return { remaining, start, reset }
}
