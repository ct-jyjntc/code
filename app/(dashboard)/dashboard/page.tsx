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
import { Server, Activity, CreditCard, Sparkles, BookOpen } from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/errors"

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
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; description: string; detail: string }>>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const hasStats = Boolean(stats && stats.total_bandwidth)
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("[v0] Failed to fetch dashboard stats:", error)
        toast({
          title: "加载失败",
          description: getErrorMessage(error, "无法获取仪表盘数据，请稍后重试"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    const fetchNotices = async () => {
      try {
        const response = await api.getNotices()
        const data = response?.data || []
        setAnnouncements(
          data.map((notice: any) => ({
            id: notice.id ?? getSafeId(),
            title: notice.title ?? "站点公告",
            description: notice.summary || notice.description || "",
            detail: notice.content ?? notice.description ?? "",
          })),
        )
      } catch (error) {
        console.error("Failed to fetch announcements:", error)
        toast({
          title: "公告获取失败",
          description: getErrorMessage(error, "无法加载站点公告"),
          variant: "destructive",
        })
      } finally {
        setAnnouncementsLoading(false)
      }
    }

    fetchStats()
    fetchNotices()
  }, [toast])

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

  const activeAnnouncements = announcements.length > 0 ? announcements : []
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
      label: "使用文档",
      description: "查看配置指南与常见问题",
      icon: BookOpen,
      iconBg: "bg-accent/50",
      iconColor: "text-accent-foreground",
      href: "/knowledge",
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
      href: "/subscription",
    },
  ]

  const [announcementIndex, setAnnouncementIndex] = useState(0)
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const activeAnnouncement = activeAnnouncements[announcementIndex]

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
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="space-y-3 rounded-lg border p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center justify-between text-sm">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-12">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
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
                  {activeAnnouncements.length ? `${announcementIndex + 1}/${activeAnnouncements.length}` : "0/0"}
                </span>
              </div>
              {announcementsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : activeAnnouncements.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无公告</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-foreground">{activeAnnouncement.title}</p>
                    <p className="leading-relaxed">
                      {activeAnnouncement.description || activeAnnouncement.detail?.slice(0, 80) || "查看详情了解更多"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 lg:mt-auto">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2"
                        onClick={() => goToAnnouncement("prev")}
                        disabled={!activeAnnouncements.length}
                      >
                        上一条
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2"
                        onClick={() => goToAnnouncement("next")}
                        disabled={!activeAnnouncements.length}
                      >
                        下一条
                      </Button>
                    </div>
                    <Button size="sm" onClick={() => setDetailIndex(announcementIndex)} disabled={!activeAnnouncements.length}>
                      查看详情
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7 cursor-pointer" onClick={() => router.push("/subscription")}>
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
      </div>

      <Dialog open={detailIndex !== null} onOpenChange={(open) => !open && setDetailIndex(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detailIndex !== null && activeAnnouncements[detailIndex] ? activeAnnouncements[detailIndex].title : ""}
            </DialogTitle>
            <DialogDescription>站点公告详情</DialogDescription>
          </DialogHeader>
          {detailIndex !== null && activeAnnouncements[detailIndex] ? (
            <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} className="text-primary underline decoration-dashed hover:decoration-solid" target="_blank" rel="noreferrer" />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="my-4 overflow-x-auto rounded-lg border">
                      <table {...props} className="w-full text-sm" />
                    </div>
                  ),
                  code: ({ node, inline, className, children, ...props }) => (
                    <code
                      {...props}
                      className={`rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground ${className ?? ""}`}
                    >
                      {children}
                    </code>
                  ),
                  details: ({ node, ...props }) => (
                    <details {...props} className="rounded-lg border border-dashed bg-muted/40 px-4 py-2 text-sm" />
                  ),
                  summary: ({ node, ...props }) => (
                    <summary {...props} className="cursor-pointer text-sm font-semibold text-foreground" />
                  ),
                  hr: () => <hr className="my-6 border-dashed border-primary/30" />,
                }}
              >
                {activeAnnouncements[detailIndex].detail || activeAnnouncements[detailIndex].description || ""}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">暂无内容</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
  const getSafeId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
