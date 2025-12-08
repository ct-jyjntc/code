"use client"

import { AlertTriangle, ArrowLeft, Info, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { use, useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { KOMARI_API_BASE, buildKomariHeaders } from "@/lib/komari"
import { cn } from "@/lib/utils"

type NodeMeta = {
  uuid: string
  name: string
  region?: string
  group?: string
}

type PingTask = {
  id: number
  interval: number
  name: string
  loss: number
}

type TaskWithLatest = PingTask & {
  latest?: {
    time: string | null
    value: number | null
  } | null
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

export default function RealtimeLatencyPage({ params }: { params: Promise<{ uuid: string }> }) {
  const resolvedParams = use(params)
  const uuid = resolvedParams?.uuid ?? ""
  const [node, setNode] = useState<NodeMeta | null>(null)
  const [tasks, setTasks] = useState<TaskWithLatest[]>([])
  const [latestByTask, setLatestByTask] = useState<Map<number, { time: number; value: number }>>(new Map())
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const fetchNodeMeta = async () => {
      try {
        const response = await fetch(`${KOMARI_API_BASE}/api/nodes`, {
          headers: buildKomariHeaders(),
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`获取节点信息失败：${response.status}`)
        }

        const payload = await response.json()
        const nodes = Array.isArray(payload?.data) ? payload.data : []
        if (cancelled) return

        const matched = nodes.find((item: NodeMeta) => item?.uuid === uuid)
        if (matched) {
          setNode({
            uuid: matched.uuid,
            name: matched.name ?? matched.uuid,
            region: matched.region || matched.group,
            group: matched.group,
          })
        }
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return
        console.error("[realtime-detail] Failed to load node meta:", error)
      }
    }

    fetchNodeMeta()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [uuid])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const fetchPingData = async () => {
      setRefreshing(true)
      setErrorMessage(null)
      try {
        const response = await fetch(`/api/komari/ping?uuid=${uuid}&hours=1`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`获取延迟数据失败：${response.status}`)
        }

        const payload = await response.json()
        const tasksPayload = Array.isArray(payload?.data?.tasks) ? (payload.data.tasks as TaskWithLatest[]) : []
        const latestMap = new Map<number, { time: number; value: number }>()

        tasksPayload.forEach((task) => {
          if (task.latest?.time) {
            const time = Date.parse(task.latest.time)
            if (Number.isFinite(time)) {
              latestMap.set(task.id, {
                time,
                value: Number(task.latest.value ?? 0),
              })
            }
          }
        })

        const lastUpdatedValue = typeof payload?.data?.lastUpdated === "string" ? payload.data.lastUpdated : null
        const latestTimeFallback = Array.from(latestMap.values()).reduce((max, item) => Math.max(max, item.time), 0)

        if (cancelled) return

        setTasks(tasksPayload)
        setLatestByTask(latestMap)
        setLastUpdated(lastUpdatedValue ?? (latestTimeFallback ? new Date(latestTimeFallback).toISOString() : null))
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return
        console.error("[realtime-detail] Failed to load ping data:", error)
        setErrorMessage("延迟数据加载失败，请稍后重试。")
        toast({
          title: "加载失败",
          description: "无法加载节点延迟数据，请稍后重试。",
          variant: "destructive",
        })
      } finally {
        if (cancelled) return
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchPingData()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [uuid, refreshTick, toast])

  const handleRefresh = () => {
    setRefreshTick((prev) => prev + 1)
  }

  const formatLatency = (value?: number | string) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return "-"
    return `${numeric.toFixed(1)} ms`
  }

  const renderLoadingState = () => (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/realtime">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回实时流量
        </Link>
      </Button>

      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Card className="border-none shadow-lg bg-card">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (loading && !tasks.length) {
    return renderLoadingState()
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="hover:bg-background/50">
            <Link href="/realtime">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回实时流量
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">延迟详情</h1>
            <p className="text-muted-foreground">
              查看节点 {node?.name ?? uuid} 的实时延迟与丢包概览。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            最近更新：{lastUpdated ? new Date(lastUpdated).toLocaleString("zh-CN", { hour12: false }) : "等待数据"}
          </span>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} className="bg-background/50">
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </motion.div>

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>加载异常</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-none shadow-lg bg-card">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              节点状态
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              显示每个地区的最新延迟和丢包率
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无监测任务</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => {
                  const latest = latestByTask.get(task.id)
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2 transition-colors hover:bg-background/50"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{task.name || `任务 ${task.id}`}</p>
                        <p className="text-xs text-muted-foreground">
                          丢包率：{Number(task.loss ?? 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          {formatLatency(latest?.value)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          更新时间：{latest?.time ? new Date(latest.time).toLocaleTimeString("zh-CN", { hour12: false }) : "-"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
