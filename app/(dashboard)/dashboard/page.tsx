"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Server, Activity, Clock, CreditCard, TrendingUp, Calendar } from "lucide-react"

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

  const usagePercentage = stats ? Math.round((stats.used_bandwidth / (stats.total_bandwidth || 1)) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">仪表盘</h1>
          <p className="text-muted-foreground">欢迎回来，查看您的账户概览</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">仪表盘</h1>
        <p className="text-muted-foreground">欢迎回来，查看您的账户概览</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">流量使用</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? formatBytes(stats.used_bandwidth) : "0 B"}</div>
            <p className="text-xs text-muted-foreground">
              总计 {stats ? formatBytes(stats.total_bandwidth) : "0 B"} · {usagePercentage}% 已使用
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${usagePercentage}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">剩余流量</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? formatBytes(stats.remaining_bandwidth) : "0 B"}</div>
            <p className="text-xs text-muted-foreground">可用流量配额</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃订阅</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_subscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.plan_name || "暂无套餐"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">邀请返佣</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats?.commission_balance?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">{stats?.total_invites || 0} 人已邀请</p>
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
                <p className="text-lg font-semibold">{stats.plan_name || "未订阅"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">到期时间</p>
                <p className="text-lg font-semibold">{new Date(stats.expire_date).toLocaleDateString("zh-CN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            快速操作
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => router.push("/subscribe")}
            className="flex items-center gap-3 border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">购买订阅</p>
              <p className="text-xs text-muted-foreground">选择适合的套餐</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/nodes")}
            className="flex items-center gap-3 border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-accent/50">
              <Server className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-medium">节点状态</p>
              <p className="text-xs text-muted-foreground">查看可用节点</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/tickets")}
            className="flex items-center gap-3 border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-muted">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">创建工单</p>
              <p className="text-xs text-muted-foreground">获取技术支持</p>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
