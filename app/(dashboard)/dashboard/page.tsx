"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Server, Activity, CreditCard, Calendar, Sparkles } from "lucide-react"

interface DashboardStats {
  total_bandwidth: number
  used_bandwidth: number
  remaining_bandwidth: number
  active_subscriptions: number
  total_invites: number
  commission_balance: number
  plan_name?: string
  expire_date?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const hasStats = Boolean(stats && stats.total_bandwidth)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
  }

  const usagePercentage = hasStats ? Math.round((stats!.used_bandwidth / (stats!.total_bandwidth || 1)) * 100) : 0
  const expireDateText = stats?.expire_date ? new Date(stats.expire_date).toLocaleDateString("zh-CN") : null
  const planName = stats?.plan_name || "未订阅"
  const expireDisplay = expireDateText || "—"
  const usedText = hasStats ? formatBytes(stats!.used_bandwidth) : "—"
  const totalText = hasStats ? formatBytes(stats!.total_bandwidth) : "—"
  const usageLabel = hasStats ? `${usagePercentage}%` : "--"

  const announcements = [
    {
      title: "节点维护",
      description: "节点状态每 30 秒自动刷新，如发现异常请在工单中心反馈。",
      detail:
        "为了保证服务体验，我们对部分节点进行分批维护，刷新周期为 30 秒。如出现连接异常或无法使用，请在工单中心反馈，我们会第一时间响应。",
    },
    {
      title: "流量提示",
      description: stats
        ? `当前已使用 ${formatBytes(stats.used_bandwidth)}，请关注剩余流量。`
        : "正在获取您的流量信息，请稍候。",
      detail:
        "系统会根据您的历史使用情况发出流量提醒，若已接近上限，建议及时续费或升级套餐，避免影响日常使用。",
    },
    {
      title: "订阅提醒",
      description: expireDateText
        ? `当前套餐预计 ${expireDateText} 到期，敬请提前续费。`
        : "尚未开通订阅，点击下方操作可快速购买套餐。",
      detail:
        "当订阅即将到期或未开通时，我们会发送多渠道提醒。您也可以在订阅页面开启自动续费，确保服务不中断。",
    },
  ]
  const quickActions = [
    {
      label: "购买订阅",
      description: "快速续费或选购新套餐",
      icon: CreditCard,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      href: "/subscribe",
    },
    {
      label: "节点状态",
      description: "查看可用节点列表",
      icon: Server,
      iconBg: "bg-accent/50",
      iconColor: "text-accent-foreground",
      href: "/nodes",
    },
    {
      label: "创建工单",
      description: "联系支持团队解决问题",
      icon: Activity,
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground",
      href: "/tickets",
    },
    {
      label: "一键订阅",
      description: "根据当前使用量自动推荐套餐",
      icon: Sparkles,
      iconBg: "bg-secondary",
      iconColor: "text-secondary-foreground",
      href: "/subscribe",
    },
  ]

  const [announcementIndex, setAnnouncementIndex] = useState(0)
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const activeAnnouncement = announcements[announcementIndex]

  const goToAnnouncement = (direction: "prev" | "next") => {
    setAnnouncementIndex((prev) => {
      if (direction === "prev") {
        return prev === 0 ? announcements.length - 1 : prev - 1
      }
      return prev === announcements.length - 1 ? 0 : prev + 1
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">仪表盘</h1>
          <p className="text-muted-foreground">欢迎回来，查看您的账户概览</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5 lg:flex lg:flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex flex-1 flex-col gap-3 border px-3 py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-16 w-full" />
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>

          <Card className="lg:col-span-12">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance text-foreground">仪表盘</h1>
          <p className="text-muted-foreground">欢迎回来，查看您的账户概览</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <Card className="lg:col-span-5 lg:flex lg:flex-col">
          <CardHeader>
            <CardTitle>站点公告</CardTitle>
            <CardDescription>最新消息与提醒</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground lg:flex-1">
            <div className="space-y-4 border px-3 py-4 lg:flex lg:flex-1 lg:flex-col">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>最新公告</span>
                <span>
                  {announcementIndex + 1}/{announcements.length}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-foreground">{activeAnnouncement.title}</p>
                <p className="leading-relaxed">{activeAnnouncement.description}</p>
              </div>
              <div className="flex items-center justify-between gap-2 lg:mt-auto">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    onClick={() => goToAnnouncement("prev")}
                  >
                    上一条
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    onClick={() => goToAnnouncement("next")}
                  >
                    下一条
                  </Button>
                </div>
                <Button size="sm" onClick={() => setDetailIndex(announcementIndex)}>
                  查看详情
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>我的订阅</CardTitle>
            <CardDescription>查看当前套餐与流量使用情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border bg-card">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                    当前套餐
                  </CardDescription>
                  <CardTitle className="text-xl font-semibold">{planName}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border bg-card">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                    到期时间
                  </CardDescription>
                  <CardTitle className="text-xl font-semibold">{expireDisplay}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="border bg-card">
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>已使用</span>
                  <span>{usageLabel}</span>
                </div>
                <div className="h-2 w-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${hasStats ? usagePercentage : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{usedText}</span>
                  <span>总计 {totalText}</span>
                </div>
              </CardContent>
            </Card>

          </CardContent>
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle className="text-base">快捷操作</CardTitle>
            <CardDescription>快速完成常用操作</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="flex items-center gap-3 border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:border-primary focus-visible:outline-none"
              >
                <div className={`flex h-10 w-10 items-center justify-center ${action.iconBg}`}>
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

        {stats?.expire_date && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              订阅信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">当前套餐</p>
                <p className="text-lg font-semibold">{planName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">到期时间</p>
                <p className="text-lg font-semibold">{new Date(stats.expire_date).toLocaleDateString("zh-CN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      </div>

      <Dialog open={detailIndex !== null} onOpenChange={(open) => !open && setDetailIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailIndex !== null ? announcements[detailIndex].title : ""}</DialogTitle>
            <DialogDescription>站点公告详情</DialogDescription>
          </DialogHeader>
          <div className="text-sm leading-relaxed text-muted-foreground">
            {detailIndex !== null ? announcements[detailIndex].detail : ""}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
