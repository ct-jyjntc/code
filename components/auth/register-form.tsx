"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CaptchaWidget } from "@/components/auth/captcha-widget"
import { api } from "@/lib/api"
import { setAuthToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/errors"
import { useGuestConfig } from "@/hooks/use-guest-config"
import { useCaptcha } from "@/hooks/use-captcha"
import { useCountdown } from "@/hooks/use-countdown"

export function RegisterForm() {
  const [emailInput, setEmailInput] = useState("")
  const [emailLocal, setEmailLocal] = useState("")
  const [selectedDomain, setSelectedDomain] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [emailCode, setEmailCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { config } = useGuestConfig()
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

  const requiresEmailCode = config?.is_email_verify === 1
  const inviteRequired = config?.is_invite_force === 1
  const shouldResetCaptcha = Boolean(captcha.captchaRequired && config?.captcha_type !== "recaptcha-v3")
  const hasWhitelist = whitelist.length > 0

  const emailValue = hasWhitelist
    ? emailLocal && selectedDomain
      ? `${emailLocal}@${selectedDomain}`
      : ""
    : emailInput.trim()

  const validateEmailForWhitelist = () => {
    if (!hasWhitelist) return true
    if (!emailLocal.trim()) {
      toast({ title: "请输入邮箱前缀", variant: "destructive" })
      return false
    }
    if (!selectedDomain) {
      toast({ title: "请选择邮箱域名", variant: "destructive" })
      return false
    }
    return true
  }

  const handleSendCode = async () => {
    if (!emailValue) {
      toast({ title: "请输入邮箱", variant: "destructive" })
      return
    }
    if (!validateEmailForWhitelist()) return

    setSendingCode(true)
    try {
      const captchaPayload = await captcha.requestPayload("send_email_code")
      await api.sendEmailCode({ email: emailValue, ...captchaPayload })
      toast({ title: "验证码已发送", description: "请在 5 分钟内输入邮箱验证码" })
      startCountdown()
    } catch (error) {
      toast({
        title: "发送失败",
        description: getErrorMessage(error, "请稍后重试"),
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

    if (password.length < 8) {
      toast({ title: "密码过短", description: "密码长度需大于 8 位", variant: "destructive" })
      return
    }

    if (password !== confirmPassword) {
      toast({ title: "密码不一致", description: "请确认两次输入一致", variant: "destructive" })
      return
    }

    if (!validateEmailForWhitelist()) return

    if (requiresEmailCode && !emailCode.trim()) {
      toast({ title: "请输入邮箱验证码", variant: "destructive" })
      return
    }

    if (inviteRequired && !inviteCode.trim()) {
      toast({ title: "需要邀请码", description: "请填写受邀的邀请码", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const captchaPayload = await captcha.requestPayload("register")
      const response = await api.register({
        email: emailValue.toLowerCase(),
        password,
        invite_code: inviteCode.trim() || undefined,
        email_code: requiresEmailCode ? emailCode.trim() : undefined,
        ...captchaPayload,
      })

      if (!response?.auth_data) {
        throw new Error("注册响应异常，请稍后重试")
      }

      setAuthToken(response.auth_data)
      toast({ title: "注册成功", description: "欢迎加入！" })
      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "注册失败",
        description: getErrorMessage(error, "请稍后重试"),
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">注册</CardTitle>
        <CardDescription>创建一个新账户以开始使用</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasWhitelist ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email-local">邮箱前缀</Label>
                <Input
                  id="email-local"
                  type="text"
                  placeholder="请输入邮箱前缀"
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value.replace(/\s+/g, ""))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-domain">选择邮箱域名</Label>
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger id="email-domain">
                    <SelectValue placeholder="请选择域名" />
                  </SelectTrigger>
                  <SelectContent>
                    {whitelist.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        @{domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {emailValue && (
                <p className="text-xs text-muted-foreground">完整邮箱：{emailValue}</p>
              )}
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
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required={inviteRequired}
            />
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
                  {codeCountdown > 0 ? `${codeCountdown}s` : sendingCode ? "发送中..." : "发送验证码"}
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
            {loading ? "注册中..." : "注册"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
