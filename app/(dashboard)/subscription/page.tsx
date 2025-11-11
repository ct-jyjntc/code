"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Copy, RefreshCw, ShieldCheck, TimerReset } from "lucide-react"
import { getErrorMessage } from "@/lib/errors"

interface SubscriptionInfo {
  token: string
  subscribe_url: string
  plan?: {
    id: string
    name: string
    transfer_enable: number
    speed_limit?: number
    device_limit?: number
    features?: string[]
  }
  u: number
  d: number
  transfer_enable: number
  expired_at?: string
  reset_day?: number
  next_reset_at?: string
  last_reset_at?: string
  remarks?: string
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"reset">()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subInfo = await api.getSubscriptionInfo()
        setSubscription(subInfo)
      } catch (error) {
        console.error("Failed to fetch subscription info:", error)
        toast({
          title: "加载失败",
          description: getErrorMessage(error, "无法获取订阅信息，请稍后重试。"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const usage = useMemo(() => {
    if (!subscription) return { used: 0, percent: 0 }
    const used = subscription.u + subscription.d
    const percent = subscription.transfer_enable
      ? Math.min(100, Math.round((used / subscription.transfer_enable) * 100))
      : 0
    return { used, percent }
  }, [subscription])

  const effectiveSpeedLimit = subscription?.plan?.speed_limit ?? subscription?.speed_limit ?? null
  const effectiveDeviceLimit = subscription?.plan?.device_limit ?? subscription?.device_limit ?? null

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const handleCopySubscribe = async () => {
    if (!subscription?.subscribe_url) return
    await navigator.clipboard.writeText(subscription.subscribe_url)
    toast({ title: "复制成功", description: "订阅链接已复制到剪贴板" })
  }

  const handleResetSecurity = async () => {
    setAction("reset")
    try {
      const data = await api.resetSecurity()
      setSubscription(data)
      toast({ title: "重置成功", description: "已重新生成订阅链接和安全凭据" })
    } catch (error) {
      console.error("Failed to reset security:", error)
      toast({
        title: "操作失败",
        description: getErrorMessage(error, "无法重置，请稍后重试。"),
        variant: "destructive",
      })
    } finally {
      setAction(undefined)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-lg border p-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-14 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3 rounded-lg border border-dashed p-6 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">暂无订阅信息</p>
        <p className="text-sm text-muted-foreground">请先购买套餐，系统将自动生成订阅详情</p>
        <Button asChild>
          <a href="/subscribe">前往购买套餐</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">我的订阅</h1>
        <p className="text-muted-foreground">查看订阅详情、管理安全信息与活跃会话</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              当前套餐
            </CardTitle>
            <CardDescription>订阅状态与流量使用情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold">{subscription.plan?.name || "未订阅"}</p>
              {subscription.expired_at && (
                <Badge variant="outline">
                  到期：{new Date(subscription.expired_at).toLocaleDateString("zh-CN")}
                </Badge>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>已使用 {formatBytes(usage.used)}</span>
                <span>总计 {formatBytes(subscription.transfer_enable)}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${usage.percent}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">上传</p>
                <p className="text-xl font-semibold">{formatBytes(subscription.u)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">下载</p>
                <p className="text-xl font-semibold">{formatBytes(subscription.d)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">速率 / 设备</p>
                <p className="text-xl font-semibold">
                  {effectiveSpeedLimit ? `${effectiveSpeedLimit} Mbps` : "不限速"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {typeof effectiveDeviceLimit === "number" ? `设备上限 ${effectiveDeviceLimit} 台` : "不限制设备上限"}
                </p>
              </div>
            </div>
            {subscription.remarks && (
              <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                {subscription.remarks}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>订阅链接</CardTitle>
            <CardDescription>导入到客户端即可同步节点</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              readOnly
              value={subscription.subscribe_url}
              className="h-32 w-full resize-none font-mono text-sm break-all"
            />
            <Button className="w-full" variant="secondary" onClick={handleCopySubscribe}>
              <Copy className="mr-2 h-4 w-4" />
              复制订阅链接
            </Button>
            <Button className="w-full" onClick={handleResetSecurity} disabled={action === "reset"}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${action === "reset" ? "animate-spin" : ""}`}
                aria-hidden={action !== "reset"}
              />
              重新生成链接
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TimerReset className="h-5 w-5 text-primary" />
            重置信息
          </CardTitle>
          <CardDescription>流量将在每月第 {subscription.reset_day ?? "-"} 天自动重置</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">下次重置</p>
            <p className="text-lg font-semibold">
              {subscription.next_reset_at ? new Date(subscription.next_reset_at).toLocaleDateString("zh-CN") : "--"}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">上次重置</p>
            <p className="text-lg font-semibold">
              {subscription.last_reset_at ? new Date(subscription.last_reset_at).toLocaleDateString("zh-CN") : "--"}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">订阅 Token</p>
            <div className="break-all rounded-md border border-dashed bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
              {subscription.token}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
