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
import { Server, Activity, CreditCard, Sparkles, BookOpen, ArrowRight, Zap, LifeBuoy, Rocket } from "lucide-react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/errors"
import { motion, AnimatePresence } from "framer-motion"

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
  const expireDisplay = expireDateText || "长期有效"
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
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      href: "/knowledge",
    },
    {
      label: "创建工单",
      description: "联系支持团队解决问题",
      icon: LifeBuoy,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
      href: "/tickets",
    },
    {
      label: "一键订阅",
      description: "根据当前使用量自动推荐套餐",
      icon: Zap,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
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
        <div className="space-y-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <motion.div 
        className="space-y-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">仪表盘</h1>
          <p className="text-muted-foreground">欢迎回来，查看您的账户概览</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 flex flex-col"
          >
            <Card className="flex-1 overflow-hidden border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">站点公告</CardTitle>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {activeAnnouncements.length ? `${announcementIndex + 1}/${activeAnnouncements.length}` : "0/0"}
                  </span>
                </div>
                <CardDescription>最新消息与提醒</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-4">
                {announcementsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : activeAnnouncements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Sparkles className="h-12 w-12 mb-3 opacity-20" />
                    <p>暂无公告</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full justify-between gap-6 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={announcementIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                      >
                        <h3 className="text-xl font-semibold text-foreground line-clamp-1">{activeAnnouncement.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {activeAnnouncement.description || activeAnnouncement.detail?.slice(0, 100) || "查看详情了解更多"}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                    <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-border/50">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                          onClick={() => goToAnnouncement("prev")}
                          disabled={!activeAnnouncements.length}
                        >
                          ←
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                          onClick={() => goToAnnouncement("next")}
                          disabled={!activeAnnouncements.length}
                        >
                          →
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => setDetailIndex(announcementIndex)} 
                        disabled={!activeAnnouncements.length}
                        className="rounded-full px-4 shadow-md hover:shadow-lg transition-all"
                      >
                        查看详情
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-7"
          >
            <Card 
              className="h-full border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden group cursor-pointer transition-all hover:shadow-xl"
              onClick={() => router.push("/subscription")}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard className="w-32 h-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg font-medium">我的订阅</CardTitle>
                <CardDescription>查看当前套餐与流量使用情况</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 relative z-10">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">当前套餐</p>
                    <p className="text-2xl font-bold text-primary">{planName}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">到期时间</p>
                    <p className="text-2xl font-bold">{expireDisplay}</p>
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-muted-foreground">流量使用情况</span>
                    <span className={usagePercentage > 80 ? "text-destructive" : "text-primary"}>{usageLabel}</span>
                  </div>
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${hasStats ? usagePercentage : 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>已用: {usedText}</span>
                    <span>总计: {totalText}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="lg:col-span-12">
            <h3 className="text-lg font-semibold mb-4 px-1">快捷操作</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, idx) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.25 + idx * 0.05 } }}
                  whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(action.href)}
                  className="relative flex flex-col gap-4 p-6 rounded-xl border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300 text-left group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{action.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={detailIndex !== null} onOpenChange={(open) => !open && setDetailIndex(null)}>
        <DialogContent className="max-w-3xl max-h-[min(90vh,800px)] overflow-y-auto border-none shadow-2xl bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {detailIndex !== null && activeAnnouncements[detailIndex] ? activeAnnouncements[detailIndex].title : ""}
            </DialogTitle>
            <DialogDescription>站点公告详情</DialogDescription>
          </DialogHeader>
          {detailIndex !== null && activeAnnouncements[detailIndex] ? (
            <div className="mt-4 prose prose-sm max-w-none text-muted-foreground dark:prose-invert prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} className="text-primary underline decoration-dashed hover:decoration-solid font-medium transition-all" target="_blank" rel="noreferrer" />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="my-4 overflow-x-auto rounded-lg border border-border/50 shadow-sm">
                      <table {...props} className="w-full text-sm" />
                    </div>
                  ),
                  code: ({ node, inline, className, children, ...props }) => (
                    <code
                      {...props}
                      className={`rounded bg-muted/50 px-1.5 py-0.5 text-xs font-semibold text-primary ${className ?? ""}`}
                    >
                      {children}
                    </code>
                  ),
                  details: ({ node, ...props }) => (
                    <details {...props} className="rounded-lg border border-dashed border-border/50 bg-muted/20 px-4 py-2 text-sm" />
                  ),
                  summary: ({ node, ...props }) => (
                    <summary {...props} className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary transition-colors" />
                  ),
                  hr: () => <hr className="my-6 border-dashed border-border" />,
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
