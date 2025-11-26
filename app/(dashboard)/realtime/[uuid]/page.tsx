"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, Info, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { KOMARI_API_BASE, buildKomariHeaders } from "@/lib/komari"
import { cn } from "@/lib/utils"

type NodeMeta = {
  uuid: string
  name: string
  region?: string
  group?: string
}

type PingRecord = {
  task_id: number
  time: string
  value: number
}

type PingTask = {
  id: number
  interval: number
  name: string
  loss: number
}

type TimeRangeKey = "1h" | "4h" | "24h"

const RANGE_HOURS: Record<TimeRangeKey, number> = {
  "1h": 1,
  "4h": 4,
  "24h": 24,
}

export default function RealtimeLatencyPage({ params }: { params: Promise<{ uuid: string }> }) {
  const resolvedParams = use(params)
  const uuid = resolvedParams?.uuid ?? ""
  const [node, setNode] = useState<NodeMeta | null>(null)
  const [records, setRecords] = useState<PingRecord[]>([])
  const [tasks, setTasks] = useState<PingTask[]>([])
  const [range, setRange] = useState<TimeRangeKey>("1h")
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
        const hours = RANGE_HOURS[range] ?? 1
        const response = await fetch(`${KOMARI_API_BASE}/api/records/ping?uuid=${uuid}&hours=${hours}`, {
          headers: buildKomariHeaders(),
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`获取延迟数据失败：${response.status}`)
        }

        const payload = await response.json()
        const tasksPayload = Array.isArray(payload?.data?.tasks) ? (payload.data.tasks as PingTask[]) : []
        const recordPayload = Array.isArray(payload?.data?.records) ? (payload.data.records as PingRecord[]) : []

        if (cancelled) return

        setTasks(tasksPayload)
        setRecords(recordPayload)
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
  }, [uuid, range, refreshTick, toast])

  const latestByTask = useMemo(() => {
    const map = new Map<number, { time: number; value: number }>()
    records.forEach((record) => {
      const time = Date.parse(record.time)
      const existing = map.get(record.task_id)
      if (!existing || time > existing.time) {
        map.set(record.task_id, { time, value: Number(record.value ?? 0) })
      }
    })
    return map
  }, [records])

  const lastUpdated = useMemo(() => {
    let latest = 0
    records.forEach((record) => {
      const time = Date.parse(record.time)
      if (Number.isFinite(time) && time > latest) {
        latest = time
      }
    })
    return latest > 0 ? new Date(latest).toISOString() : null
  }, [records])

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
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/realtime">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回实时流量
          </Link>
        </Button>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Card>
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
              <div key={index} className="rounded-lg border px-3 py-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
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

  if (loading && !records.length) {
    return renderLoadingState()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild>
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

        <div className="flex flex-col items-end gap-3">
          <Tabs value={range} onValueChange={(value) => setRange(value as TimeRangeKey)}>
            <TabsList>
              <TabsTrigger value="1h">1小时</TabsTrigger>
              <TabsTrigger value="4h">4小时</TabsTrigger>
              <TabsTrigger value="24h">1天</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              最近更新：{lastUpdated ? new Date(lastUpdated).toLocaleString("zh-CN", { hour12: false }) : "等待数据"}
            </span>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载异常</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
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
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
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
    </div>
  )
}
