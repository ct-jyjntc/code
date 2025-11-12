"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, AlertTriangle, Download, Upload, Wifi } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

const DEFAULT_BASE_URL = "http://8.218.248.238:25774"
const DEFAULT_WS_URL = "ws://8.218.248.238:25774/api/clients"
const DEFAULT_API_KEY = "komari-nRVg6wXYN5SbwK1Q02LsW2jh8SaFIqJD"

const KOMARI_API_BASE = process.env.NEXT_PUBLIC_KOMARI_BASE_URL ?? DEFAULT_BASE_URL
const KOMARI_WS_URL = process.env.NEXT_PUBLIC_KOMARI_WS_URL ?? DEFAULT_WS_URL
const KOMARI_API_KEY = process.env.NEXT_PUBLIC_KOMARI_API_KEY ?? DEFAULT_API_KEY

type NodeMeta = {
  uuid: string
  name: string
  region?: string
  group?: string
}

type NodeRealtime = {
  uuid: string
  isOnline: boolean
  updatedAt?: string
  network: {
    up: number
    down: number
    totalUp: number
    totalDown: number
  }
}

type ConnectionState = "connecting" | "connected" | "disconnected" | "error"

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB", "PB"]
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, index)
  return `${value >= 100 || value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[index]}`
}

const formatSpeed = (bytesPerSecond: number) => `${formatBytes(bytesPerSecond)}/s`

const buildWsUrl = () => {
  try {
    const url = new URL(KOMARI_WS_URL)
    if (KOMARI_API_KEY) {
      url.searchParams.set("api_key", KOMARI_API_KEY)
    }
    return url.toString()
  } catch {
    return KOMARI_WS_URL
  }
}

export default function RealtimeTrafficPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("connecting")
  const [traffic, setTraffic] = useState<NodeRealtime[]>([])
  const [nodeMeta, setNodeMeta] = useState<Record<string, NodeMeta>>({})
  const [initializing, setInitializing] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const fetchNodeMeta = async () => {
      try {
        const headers: HeadersInit = {
          Accept: "application/json",
        }
        if (KOMARI_API_KEY) {
          headers["Authorization"] = `Bearer ${KOMARI_API_KEY}`
        }

        const response = await fetch(`${KOMARI_API_BASE}/api/nodes`, {
          headers,
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`获取节点列表失败：${response.status}`)
        }

        const payload = await response.json()
        const nodes = Array.isArray(payload?.data) ? payload.data : []
        if (cancelled) return

        const map = nodes.reduce<Record<string, NodeMeta>>((acc, item) => {
          if (!item?.uuid) return acc
          acc[item.uuid] = {
            uuid: item.uuid,
            name: item.name ?? item.uuid,
            region: item.region || item.group,
            group: item.group,
          }
          return acc
        }, {})

        setNodeMeta(map)
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return
        console.error("[realtime] Failed to fetch node metadata:", error)
        toast({
          title: "节点信息获取失败",
          description: "无法加载节点基础信息，将仅展示 UUID。",
          variant: "destructive",
        })
      }
    }

    fetchNodeMeta()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [toast])

  useEffect(() => {
    let mounted = true

    const cleanupSocket = () => {
      heartbeatRef.current && clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
      if (socketRef.current) {
        socketRef.current.onopen = null
        socketRef.current.onmessage = null
        socketRef.current.onerror = null
        socketRef.current.onclose = null
        socketRef.current.close()
        socketRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (!mounted) return
      const attempts = reconnectAttemptsRef.current + 1
      reconnectAttemptsRef.current = attempts
      const delay = Math.min(10000, 1000 * Math.pow(2, attempts))
      reconnectRef.current = setTimeout(connect, delay)
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data)
        const nodesData = payload?.data?.data ?? {}
        const onlineIds = new Set<string>(payload?.data?.online ?? [])

        const parsed: NodeRealtime[] = Object.entries(nodesData).map(([uuid, metrics]: [string, any]) => ({
          uuid,
          isOnline: onlineIds.has(uuid),
          updatedAt: metrics?.updated_at ?? null,
          network: {
            up: Number(metrics?.network?.up ?? 0),
            down: Number(metrics?.network?.down ?? 0),
            totalUp: Number(metrics?.network?.totalUp ?? 0),
            totalDown: Number(metrics?.network?.totalDown ?? 0),
          },
        }))

        setTraffic(parsed)
        setInitializing(false)
        setErrorMessage(null)
        if (parsed.length > 0) {
          const latest = parsed.reduce<number>((max, node) => {
            const time = node.updatedAt ? Date.parse(node.updatedAt) : 0
            return Number.isFinite(time) ? Math.max(max, time) : max
          }, 0)
          if (latest > 0) {
            setLastUpdatedAt(new Date(latest).toISOString())
          } else {
            setLastUpdatedAt(new Date().toISOString())
          }
        } else {
          setLastUpdatedAt(new Date().toISOString())
        }
      } catch (error) {
        console.error("[realtime] Failed to parse websocket message:", error)
      }
    }

    const connect = () => {
      cleanupSocket()
      setConnectionStatus("connecting")
      setErrorMessage(null)

      try {
        const socket = new WebSocket(buildWsUrl())
        socketRef.current = socket

        socket.onopen = () => {
          if (!mounted) return
          setConnectionStatus("connected")
          reconnectAttemptsRef.current = 0
          socket.send("get")
          heartbeatRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send("get")
            }
          }, 5000)
        }

        socket.onmessage = handleMessage

        socket.onerror = (event) => {
          console.error("[realtime] WebSocket error:", event)
          setConnectionStatus("error")
          setErrorMessage("实时连接异常，正在尝试重连。")
        }

        socket.onclose = () => {
          if (!mounted) return
          setConnectionStatus("disconnected")
          heartbeatRef.current && clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
          setErrorMessage("连接已断开，正在重新连接...")
          scheduleReconnect()
        }
      } catch (error) {
        console.error("[realtime] Unable to establish WebSocket connection:", error)
        setConnectionStatus("error")
        setErrorMessage("无法建立实时连接，请检查配置。")
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      mounted = false
      heartbeatRef.current && clearInterval(heartbeatRef.current)
      reconnectRef.current && clearTimeout(reconnectRef.current)
      cleanupSocket()
    }
  }, [])

  const filteredTraffic = useMemo(() => {
    const knownIds = Object.keys(nodeMeta)
    // 当节点元数据为空时（尚未加载或请求失败）保留原始数据，避免界面空白
    if (knownIds.length === 0) {
      return traffic
    }
    return traffic.filter((node) => Boolean(nodeMeta[node.uuid]))
  }, [traffic, nodeMeta])

  const summary = useMemo(() => {
    return filteredTraffic.reduce(
      (acc, node) => {
        acc.up += node.network.up
        acc.down += node.network.down
        acc.totalUp += node.network.totalUp
        acc.totalDown += node.network.totalDown
        return acc
      },
      { up: 0, down: 0, totalUp: 0, totalDown: 0 },
    )
  }, [filteredTraffic])

  const renderStatusBadge = () => {
    const map: Record<ConnectionState, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> =
      {
        connecting: { label: "连接中", variant: "secondary" },
        connected: { label: "已连接", variant: "default" },
        disconnected: { label: "已断开", variant: "outline" },
        error: { label: "异常", variant: "destructive" },
      }
    const current = map[connectionStatus]
    return <Badge variant={current.variant}>{current.label}</Badge>
  }

  const renderNodeGrid = () => {
    if (initializing) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="mt-2 h-4 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (filteredTraffic.length === 0) {
      return (
        <Card>
          <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Activity className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">暂无实时数据</p>
              <p className="text-sm text-muted-foreground">等待服务器发送实时流量数据...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTraffic.map((node) => {
          const meta = nodeMeta[node.uuid]
          return (
            <Card key={node.uuid} className={node.isOnline ? "border-primary/40" : undefined}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-foreground">{meta?.name ?? node.uuid}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {meta?.region || meta?.group || "未分组"} · {node.uuid.slice(0, 8)}
                    </p>
                  </div>
                  <Badge variant={node.isOnline ? "default" : "secondary"}>{node.isOnline ? "在线" : "离线"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  更新于 {node.updatedAt ? new Date(node.updatedAt).toLocaleString() : "—"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">实时上行</span>
                  <span className="font-semibold text-foreground">{formatSpeed(node.network.up)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">实时下行</span>
                  <span className="font-semibold text-foreground">{formatSpeed(node.network.down)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      累计上行
                    </p>
                    <p className="mt-1 text-base font-semibold">{formatBytes(node.network.totalUp)}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Download className="h-4 w-4" />
                      累计下行
                    </p>
                    <p className="mt-1 text-base font-semibold">{formatBytes(node.network.totalDown)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-balance text-foreground">实时流量</h1>
        <p className="text-muted-foreground">通过 WebSocket 实时洞察节点上行/下行速率与累计流量。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">连接状态</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-foreground">{renderStatusBadge()}</div>
            <p className="text-xs text-muted-foreground">
              上次更新：{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "等待数据"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">实时总上行</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatSpeed(summary.up)}</div>
            <p className="text-xs text-muted-foreground">当前所有在线节点上行速率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">实时总下行</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatSpeed(summary.down)}</div>
            <p className="text-xs text-muted-foreground">当前所有在线节点下行速率</p>
          </CardContent>
        </Card>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>实时连接异常</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {renderNodeGrid()}
    </div>
  )
}
