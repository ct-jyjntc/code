"use client"

import { useCallback, useState } from "react"
import { executeRecaptchaV3 } from "@/lib/captcha"
import type { CaptchaPayload } from "@/types/captcha"
import type { GuestConfig } from "@/types/config"

export const useCaptcha = (config?: GuestConfig | null) => {
  const captchaRequired = Boolean(config?.is_captcha)
  const [solution, setSolution] = useState<CaptchaPayload | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const requestPayload = useCallback(
    async (action: string): Promise<CaptchaPayload> => {
      if (!captchaRequired) {
        return {}
      }

      const type = config?.captcha_type
      if (type === "recaptcha-v3") {
        const siteKey = config?.recaptcha_v3_site_key
        if (!siteKey) {
          throw new Error("未配置 reCAPTCHA v3 Site Key")
        }
        const token = await executeRecaptchaV3(siteKey, action)
        return { recaptcha_v3_token: token }
      }

      if (!solution) {
        throw new Error("请先完成验证码")
      }

      return { ...solution }
    },
    [captchaRequired, config?.captcha_type, config?.recaptcha_v3_site_key, solution],
  )

  const resetSolution = useCallback(() => {
    setSolution(null)
    setRefreshKey((key) => key + 1)
  }, [])

  return {
    captchaRequired,
    captchaType: config?.captcha_type,
    solution,
    setSolution,
    refreshKey,
    resetSolution,
    requestPayload,
  }
}
