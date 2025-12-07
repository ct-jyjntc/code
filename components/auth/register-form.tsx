"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CaptchaWidget } from "@/components/auth/captcha-widget"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { extractAuthToken, setAuthToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/errors"
import { useGuestConfig } from "@/hooks/use-guest-config"
import { useCaptcha } from "@/hooks/use-captcha"
import { useCountdown } from "@/hooks/use-countdown"
import { Skeleton } from "@/components/ui/skeleton"

export function RegisterForm() {
  const [emailInput, setEmailInput] = useState("")
  const [emailLocal, setEmailLocal] = useState("")
  const [selectedDomain, setSelectedDomain] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [lockedInviteCode, setLockedInviteCode] = useState<string | null>(null)
  const [emailCode, setEmailCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { config, loading: configLoading, error: configError } = useGuestConfig()
  const { remaining: codeCountdown, start: startCountdown, reset: resetCountdown } = useCountdown(60)
  const captcha = useCaptcha(config)

  const whitelist = useMemo(() => {
    return Array.isArray(config?.email_whitelist_suffix) ? config?.email_whitelist_suffix.filter(Boolean) : []
  }, [config?.email_whitelist_suffix])

  useEffect(() => {
    if (whitelist.length > 0) {
      setSelectedDomain((prev) => (prev && whitelist.includes(prev) ? prev : whitelist[0]))
    } else {
      setSelectedDomain("")
    }
  }, [whitelist])

  useEffect(() => {
    const codeFromLink = searchParams?.get("code") || searchParams?.get("invite_code")
    if (codeFromLink) {
      const trimmed = codeFromLink.trim()
      if (trimmed) {
        setInviteCode(trimmed)
        setLockedInviteCode(trimmed)
      }
    }
  }, [searchParams])

  const requiresEmailCode = config?.is_email_verify === 1
  const inviteRequired = config?.is_invite_force === 1
  const shouldResetCaptcha = Boolean(captcha.captchaRequired && config?.captcha_type !== "recaptcha-v3")
  const hasWhitelist = whitelist.length > 0
  const inviteCodeLocked = Boolean(lockedInviteCode)
  const effectiveInviteCode = (lockedInviteCode ?? inviteCode).trim()

  const raiseInlineError = (title: string, description?: string) => {
    setFormError(description ?? title)
    toast({ title, description, variant: "destructive" })
  }

  const emailValue = hasWhitelist
    ? emailLocal && selectedDomain
      ? `${emailLocal}@${selectedDomain}`
      : ""
    : emailInput.trim()

  const validateEmailForWhitelist = () => {
    if (!hasWhitelist) return true
    if (!emailLocal.trim()) {
      raiseInlineError("请输入邮箱前缀")
      return false
    }
    if (!selectedDomain) {
      raiseInlineError("请选择邮箱域名")
      return false
    }
    return true
  }

  if (configLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">注册</CardTitle>
          <CardDescription>正在加载安全策略…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (configError) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">注册</CardTitle>
          <CardDescription>暂时无法加载安全配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>系统未能加载注册配置，请刷新页面后重试。</p>
          <Button onClick={() => window.location.reload()}>刷新页面</Button>
        </CardContent>
      </Card>
    )
  }

  const handleSendCode = async () => {
    setFormError(null)
    if (!emailValue) {
      raiseInlineError("请输入邮箱")
      return
    }
    if (!validateEmailForWhitelist()) return

    setSendingCode(true)
    try {
      const captchaPayload = await captcha.requestPayload("send_email_code")
      await api.sendEmailCode({ email: emailValue, ...captchaPayload })
      toast({ title: "验证码已发送", description: "请在 5 分钟内输入邮箱验证码" })
      setFormError(null)
      startCountdown()
    } catch (error) {
      const message = getErrorMessage(error, "请稍后重试")
      setFormError(message)
      toast({
        title: "发送失败",
        description: message,
        variant: "destructive",
      })
      resetCountdown()
    } finally {
      setSendingCode(false)
      if (shouldResetCaptcha) {
        captcha.resetSolution()
      }
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (password.length < 8) {
      raiseInlineError("密码过短", "密码长度需大于 8 位")
      return
    }

    if (password !== confirmPassword) {
      raiseInlineError("密码不一致", "请确认两次输入一致")
      return
    }

    if (!validateEmailForWhitelist()) return

    if (requiresEmailCode && !emailCode.trim()) {
      raiseInlineError("请输入邮箱验证码")
      return
    }

    if (inviteRequired && !effectiveInviteCode) {
      raiseInlineError("需要邀请码", "请填写受邀的邀请码")
      return
    }

    setLoading(true)
    try {
      const captchaPayload = await captcha.requestPayload("register")
      const response = await api.register({
        email: emailValue.toLowerCase(),
        password,
        invite_code: effectiveInviteCode || undefined,
        email_code: requiresEmailCode ? emailCode.trim() : undefined,
        ...captchaPayload,
      })

      const token = extractAuthToken(response)
      if (!token) {
        throw new Error("注册响应异常，请稍后重试")
      }

      setAuthToken(token)
      toast({ title: "注册成功", description: "欢迎加入！" })
      router.push("/dashboard")
    } catch (error) {
      const message = getErrorMessage(error, "请稍后重试")
      setFormError(message)
      toast({
        title: "注册失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      if (shouldResetCaptcha) {
        captcha.resetSolution()
      }
    }
  }

  return (
    <Card className="w-full max-w-md border-none shadow-2xl bg-card/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl">注册</CardTitle>
        <CardDescription>创建一个新账户以开始使用</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {hasWhitelist ? (
            <div className="space-y-2">
              <Label htmlFor="email-local">邮箱</Label>
              <div className="flex gap-2">
                <Input
                  id="email-local"
                  type="text"
                  placeholder="请输入邮箱"
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value.replace(/\s+/g, ""))}
                  className="flex-1"
                />
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="@域名" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {whitelist.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        @{domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {emailValue && <p className="text-xs text-muted-foreground">完整邮箱：{emailValue}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              minLength={8}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteCode">邀请码{inviteRequired ? "（必填）" : "（可选）"}</Label>
            <Input
              id="inviteCode"
              type="text"
              placeholder="邀请码"
              value={inviteCodeLocked ? lockedInviteCode ?? "" : inviteCode}
              onChange={(e) => {
                if (inviteCodeLocked) return
                setInviteCode(e.target.value)
              }}
              readOnly={inviteCodeLocked}
              required={inviteRequired}
            />
            {inviteCodeLocked && (
              <p className="text-xs text-muted-foreground">已通过邀请链接自动填入，无法修改</p>
            )}
          </div>

          {requiresEmailCode && (
            <div className="space-y-2">
              <Label htmlFor="emailCode">邮箱验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="emailCode"
                  type="text"
                  inputMode="numeric"
                  placeholder="请输入 6 位验证码"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={sendingCode || codeCountdown > 0}
                >
                  {codeCountdown > 0 ? (
                    `${codeCountdown}s`
                  ) : sendingCode ? (
                    <span className="flex items-center gap-2">
                      <Spinner />
                      发送中...
                    </span>
                  ) : (
                    "发送验证码"
                  )}
                </Button>
              </div>
            </div>
          )}

          <CaptchaWidget
            config={config}
            onChange={(value) => captcha.setSolution(value)}
            refreshKey={captcha.refreshKey}
          />

          {config?.tos_url && (
            <p className="text-xs text-muted-foreground">
              注册即表示您同意
              <Link href={config.tos_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4">
                《服务条款》
              </Link>
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                注册中...
              </span>
            ) : (
              "注册"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
