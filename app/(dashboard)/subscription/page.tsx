"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Check, Copy, Loader2, RefreshCw, ShieldCheck, TimerReset, Gauge, Zap, Smartphone, Download } from "lucide-react"
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
  speed_limit?: number
  device_limit?: number
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<"reset" | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied">("idle")
  const copyResetRef = useRef<NodeJS.Timeout | null>(null)
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
    if (!subscription?.subscribe_url || copyState === "copying") return
    setCopyState("copying")
    try {
      await navigator.clipboard.writeText(subscription.subscribe_url)
      setCopyState("copied")
      toast({ title: "复制成功", description: "订阅链接已复制到剪贴板" })
    } catch (error) {
      console.error("Failed to copy subscribe url:", error)
      setCopyState("idle")
      toast({
        title: "复制失败",
        description: getErrorMessage(error, "无法复制订阅链接，请稍后重试。"),
        variant: "destructive",
      })
      return
    } finally {
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
      copyResetRef.current = setTimeout(() => setCopyState("idle"), 2000)
    }
  }

  const handleResetToken = async () => {
    if (action === "reset") return
    setAction("reset")
    try {
      const newSubInfo = await api.resetSubscriptionToken()
      setSubscription(newSubInfo)
      toast({ title: "重置成功", description: "订阅链接已更新，请重新导入到客户端" })
    } catch (error) {
      console.error("Failed to reset token:", error)
      toast({
        title: "重置失败",
        description: getErrorMessage(error, "无法重置订阅链接，请稍后重试。"),
        variant: "destructive",
      })
    } finally {
      setAction(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-48" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="h-full border-none shadow-lg bg-card">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-48 mt-1" />
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="h-full border-none shadow-lg bg-card">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32 mt-1" />
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg bg-card">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">我的订阅</h1>
        <p className="text-muted-foreground">管理您的订阅信息与连接配置</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full border-none shadow-lg bg-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <ShieldCheck className="w-32 h-32" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle>
                套餐详情
              </CardTitle>
              <CardDescription>当前生效的订阅计划信息</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 relative z-10">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">当前套餐</p>
                <p className="text-2xl font-bold text-primary">{subscription?.plan?.name || "未订阅"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">到期时间</p>
                <p className="text-2xl font-bold">
                  {subscription?.expired_at ? new Date(subscription.expired_at).toLocaleDateString() : "长期有效"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">流量重置日</p>
                <p className="text-lg font-semibold">
                  {subscription?.reset_day ? `每月 ${subscription.reset_day} 日` : "不重置"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">下次重置</p>
                <p className="text-lg font-semibold">
                  {subscription?.next_reset_at ? new Date(subscription.next_reset_at).toLocaleDateString() : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border-none shadow-lg bg-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Gauge className="w-32 h-32" />
            </div>
            <CardHeader className="relative z-10">
              <CardTitle>
                使用限制
              </CardTitle>
              <CardDescription>当前套餐的限制参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">速率限制</p>
                    <p className="text-xs text-muted-foreground">最高连接速率</p>
                  </div>
                </div>
                <span className="font-bold text-lg">
                  {effectiveSpeedLimit ? `${effectiveSpeedLimit} Mbps` : "无限制"}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">设备限制</p>
                    <p className="text-xs text-muted-foreground">同时在线设备数</p>
                  </div>
                </div>
                <span className="font-bold text-lg">
                  {effectiveDeviceLimit ? `${effectiveDeviceLimit} 台` : "无限制"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="border-none shadow-lg bg-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Download className="w-32 h-32" />
          </div>
          <CardHeader className="relative z-10">
            <CardTitle>
              流量使用
            </CardTitle>
            <CardDescription>实时流量统计与剩余用量</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>已用 {usage.percent}%</span>
                <span className={usage.percent > 80 ? "text-destructive" : "text-primary"}>
                  {formatBytes(usage.used)} / {formatBytes(subscription?.transfer_enable || 0)}
                </span>
              </div>
              <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${usage.percent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">上传流量</p>
                <p className="text-lg font-semibold">{formatBytes(subscription?.u || 0)}</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">下载流量</p>
                <p className="text-lg font-semibold">{formatBytes(subscription?.d || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="border-none shadow-lg bg-card">
          <CardHeader>
            <CardTitle>订阅连接</CardTitle>
            <CardDescription>
              您的专属订阅链接，请勿泄露给他人。如遇连接问题，可尝试重置订阅。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                readOnly
                value={subscription?.subscribe_url || ""}
                className="min-h-[100px] resize-none font-mono text-xs bg-muted/50 border-border/50 focus-visible:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleCopySubscribe} 
                className="flex-1 gap-2 shadow-md hover:shadow-lg transition-all"
                disabled={!subscription?.subscribe_url}
              >
                {copyState === "copied" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copyState === "copied" ? "已复制" : "复制订阅链接"}
              </Button>
              <Button
                variant="outline"
                onClick={handleResetToken}
                disabled={action === "reset"}
                className="flex-1 gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
              >
                {action === "reset" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                重置订阅链接
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}