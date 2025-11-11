"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [forgetOpen, setForgetOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { config, loading: configLoading, error: configError } = useGuestConfig()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!email.trim() || !password.trim()) {
      const message = "请输入邮箱和密码"
      setFormError(message)
      toast({
        title: "登录失败",
        description: message,
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await api.login(email, password)
      const token = extractAuthToken(response)
      if (!token) {
        throw new Error("认证信息缺失，请重试")
      }
      setAuthToken(token)
      setFormError(null)
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      })
      router.replace("/dashboard")
    } catch (error) {
      const message = getErrorMessage(error, "请检查您的凭据")
      setFormError(message)
      toast({
        title: "登录失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>输入您的凭据以访问您的账户</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <Button type="button" variant="link" className="px-0 text-primary" onClick={() => setForgetOpen(true)}>
                忘记密码？
              </Button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  登录中...
                </span>
              ) : (
                "登录"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ForgotPasswordDialog
        open={forgetOpen}
        onOpenChange={setForgetOpen}
        config={config}
        configLoading={configLoading}
        configError={configError}
      />
    </>
  )
}

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ReturnType<typeof useGuestConfig>["config"]
  configLoading: boolean
  configError: Error | null
}

function ForgotPasswordDialog({ open, onOpenChange, config, configLoading, configError }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [emailCode, setEmailCode] = useState("")
  const [sendingCode, setSendingCode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const { toast } = useToast()
  const captcha = useCaptcha(config)
  const { remaining: countdown, start: startCountdown, reset: resetCountdown } = useCountdown(60)
  const shouldResetCaptcha = Boolean(captcha.captchaRequired && config?.captcha_type !== "recaptcha-v3")
  const resetCaptchaSolution = captcha.resetSolution
  const controlsDisabled = configLoading || Boolean(configError)

  useEffect(() => {
    if (!open) {
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setEmailCode("")
      setSendingCode(false)
      setSubmitting(false)
      setDialogError(null)
      resetCountdown()
      if (shouldResetCaptcha) {
        resetCaptchaSolution()
      }
    }
  }, [open, resetCountdown, resetCaptchaSolution, shouldResetCaptcha])

  const handleSendCode = async () => {
    if (controlsDisabled) {
      const message = configLoading ? "配置加载中，请稍后再试" : "配置异常，请刷新页面后重试"
      setDialogError(message)
      toast({
        title: configLoading ? "配置加载中" : "配置异常",
        description: message,
        variant: "destructive",
      })
      return
    }
    if (!email) {
      const message = "请输入邮箱"
      setDialogError(message)
      toast({ title: message, variant: "destructive" })
      return
    }
    setDialogError(null)
    setSendingCode(true)
    try {
      const captchaPayload = await captcha.requestPayload("forget_send_code")
      await api.sendEmailCode({ email: email.trim(), ...captchaPayload })
      toast({ title: "验证码已发送", description: "请前往邮箱获取验证码" })
      startCountdown()
    } catch (error) {
      const message = getErrorMessage(error, "请稍后再试")
      setDialogError(message)
      toast({
        title: "发送失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSendingCode(false)
      if (shouldResetCaptcha) {
        captcha.resetSolution()
      }
    }
  }

  const handleResetPassword = async () => {
    if (controlsDisabled) {
      const message = configLoading ? "配置加载中，请稍后再试" : "配置异常，请刷新页面后重试"
      setDialogError(message)
      toast({
        title: configLoading ? "配置加载中" : "配置异常",
        description: message,
        variant: "destructive",
      })
      return
    }
    if (!email || !emailCode) {
      const message = "请填写完整信息"
      setDialogError(message)
      toast({ title: message, variant: "destructive" })
      return
    }
    if (password.length < 8) {
      const message = "密码长度需大于 8 位"
      setDialogError(message)
      toast({ title: "新密码过短", description: message, variant: "destructive" })
      return
    }
    if (password !== confirmPassword) {
      const message = "请确认两次输入一致"
      setDialogError(message)
      toast({ title: "密码不一致", description: message, variant: "destructive" })
      return
    }

    setDialogError(null)
    setSubmitting(true)
    try {
      await api.forgetPassword({
        email: email.trim().toLowerCase(),
        password,
        email_code: emailCode.trim(),
      })
      toast({ title: "重置成功", description: "请使用新密码重新登录" })
      setDialogError(null)
      onOpenChange(false)
    } catch (error) {
      const message = getErrorMessage(error, "请稍后再试")
      setDialogError(message)
      toast({
        title: "重置失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>输入注册邮箱并完成验证即可重置密码</DialogDescription>
        </DialogHeader>
        {dialogError && !configLoading && !configError && (
          <Alert variant="destructive">
            <AlertDescription>{dialogError}</AlertDescription>
          </Alert>
        )}
        {configLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">正在加载安全配置…</div>
        ) : configError ? (
          <div className="space-y-4 py-6 text-center text-sm text-muted-foreground">
            <p>无法加载安全配置，请刷新页面后重试。</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email">邮箱</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-email-code">邮箱验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="reset-email-code"
                  type="text"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="请输入验证码"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0 || controlsDisabled}
                >
                  {countdown > 0 ? (
                    `${countdown}s`
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
            <div className="space-y-2">
              <Label htmlFor="reset-password">新密码</Label>
              <Input
                id="reset-password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入新密码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm">确认新密码</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
              />
            </div>

            <CaptchaWidget
              config={config}
              onChange={(value) => captcha.setSolution(value)}
              refreshKey={captcha.refreshKey}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleResetPassword} disabled={submitting || controlsDisabled}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Spinner />
                提交中...
              </span>
            ) : (
              "重置密码"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
