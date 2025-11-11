"use client"

import dynamic from "next/dynamic"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { CaptchaPayload } from "@/types/captcha"
import type { GuestConfig } from "@/types/config"

const Turnstile = dynamic(() => import("@marsidev/react-turnstile").then((mod) => mod.Turnstile), {
  ssr: false,
})

const GoogleReCAPTCHA = dynamic(() => import("react-google-recaptcha"), {
  ssr: false,
})

interface CaptchaWidgetProps {
  config?: GuestConfig | null
  onChange: (value: CaptchaPayload | null) => void
  refreshKey?: number
  className?: string
}

export function CaptchaWidget({ config, onChange, refreshKey = 0, className }: CaptchaWidgetProps) {
  if (!config?.is_captcha) return null

  const type = config.captcha_type || "recaptcha"

  if (type === "recaptcha-v3") {
    return (
      <Alert className={cn("text-sm", className)}>
        <AlertDescription>已启用 reCAPTCHA v3，提交操作时将自动完成验证。</AlertDescription>
      </Alert>
    )
  }

  const renderWidget = () => {
    if (type === "turnstile") {
      if (!config.turnstile_site_key) {
        return <AlertDescription>管理员尚未配置 Turnstile Site Key，无法完成人机验证。</AlertDescription>
      }
      return (
        <Turnstile
          key={refreshKey}
          siteKey={config.turnstile_site_key}
          onSuccess={(token) => onChange(token ? { turnstile_token: token } : null)}
          onExpire={() => onChange(null)}
          onError={() => onChange(null)}
          options={{ action: "auth" }}
        />
      )
    }

    if (!config.recaptcha_site_key) {
      return <AlertDescription>管理员尚未配置 reCAPTCHA Site Key。</AlertDescription>
    }

    return (
      <GoogleReCAPTCHA
        key={refreshKey}
        sitekey={config.recaptcha_site_key}
        onChange={(token) => onChange(token ? { recaptcha_data: token } : null)}
        onExpired={() => onChange(null)}
      />
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-foreground">安全验证</Label>
      <div className="rounded-lg border bg-card/30 p-3 text-center text-sm text-muted-foreground">
        {renderWidget()}
      </div>
    </div>
  )
}
