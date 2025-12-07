
"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, AlertTriangle, Wifi, ArrowUp, ArrowDown, Server } from "lucide-react"
import { motion } from "framer-motion"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { KOMARI_API_BASE, buildKomariHeaders, buildKomariWsUrl } from "@/lib/komari"

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

const formatSpeed = (bytesPerSecond: number) => {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "0 B/s"
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"]
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytesPerSecond) / Math.log(1024)))
  const value = bytesPerSecond / Math.pow(1024, index)
  const formatted = value >= 100 || value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)
  return `${formatted} ${units[index]}`
}

// Mock data generator
const generateMockTraffic = (nodes: NodeMeta[]): NodeRealtime[] => {
  return nodes.map(node => ({
    uuid: node.uuid,
    isOnline: Math.random() > 0.1,
    updatedAt: new Date().toISOString(),
    network: {
      up: Math.floor(Math.random() * 1024 * 1024 * 5), // 0-5 MB/s
      down: Math.floor(Math.random() * 1024 * 1024 * 20), // 0-20 MB/s
      totalUp: 0,
      totalDown: 0
    }
  }))
}

const MOCK_NODES: NodeMeta[] = [
  { uuid: "node-1", name: "香港 IPLC 01", region: "HK", group: "VIP" },
  { uuid: "node-2", name: "日本 BGP 01", region: "JP", group: "Standard" },
  { uuid: "node-3", name: "美国 CN2 01", region: "US", group: "Standard" },
  { uuid: "node-4", name: "新加坡 AWS 01", region: "SG", group: "VIP" },
]

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
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const { toast } = useToast()
  
  const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const fetchNodeMeta = async () => {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (cancelled) return
        const map = MOCK_NODES.reduce<Record<string, NodeMeta>>((acc, item) => {
          acc[item.uuid] = item
          return acc
        }, {})
        setNodeMeta(map)
        return
      }

      try {
        // Use local proxy to avoid CORS issues
        const response = await fetch(`/api/komari/nodes`, {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          console.warn(`[realtime] 获取节点列表失败：${response.status}`)
          setErrorMessage(`无法获取节点列表 (${response.status})`)
        } else {
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
        }
      } catch (error) {
        if (cancelled || (error as Error).name === "AbortError") return
        console.error("[realtime] Failed to fetch node metadata:", error)
        setErrorMessage("获取节点列表失败，请检查网络。")
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    fetchNodeMeta()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [toast, USE_MOCK])

  useEffect(() => {
    let mounted = true

    const cleanupSocket = () => {
      heartbeatRef.current && clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
      mockIntervalRef.current && clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
      
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
      if (!mounted || USE_MOCK) return
      const attempts = reconnectAttemptsRef.current + 1
      reconnectAttemptsRef.current = attempts
      const delay = Math.min(10000, 1000 * Math.pow(2, attempts))
      reconnectRef.current = setTimeout(connect, delay)
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data)
        // Support both object and array formats for nodes data
        const nodesData = payload?.data?.data ?? {}
        const onlineIds = new Set<string>(payload?.data?.online ?? [])
        
        let parsed: NodeRealtime[] = []

        if (Array.isArray(nodesData)) {
          // Handle array format
          parsed = nodesData.map((metrics: any) => ({
            uuid: metrics.uuid || metrics.id || "unknown",
            isOnline: onlineIds.has(metrics.uuid || metrics.id),
            updatedAt: metrics?.updated_at ?? null,
            network: {
              up: Number(metrics?.network?.up ?? 0),
              down: Number(metrics?.network?.down ?? 0),
              totalUp: Number(metrics?.network?.totalUp ?? 0),
              totalDown: Number(metrics?.network?.totalDown ?? 0),
            },
          }))
        } else {
          // Handle object format (uuid as key)
          parsed = Object.entries(nodesData).map(([uuid, metrics]: [string, any]) => ({
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
        }

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

      if (USE_MOCK) {
        setTimeout(() => {
          if (!mounted) return
          setConnectionStatus("connected")
          setInitializing(false)
          
          setTraffic(generateMockTraffic(MOCK_NODES))
          setLastUpdatedAt(new Date().toISOString())

          mockIntervalRef.current = setInterval(() => {
            if (!mounted) return
            setTraffic(generateMockTraffic(MOCK_NODES))
            setLastUpdatedAt(new Date().toISOString())
          }, 3000)
        }, 1000)
        return
      }

      try {
        const wsUrl = buildKomariWsUrl()
        console.log("[realtime] Connecting to WebSocket:", wsUrl)
        const socket = new WebSocket(wsUrl)
        socketRef.current = socket

        socket.onopen = () => {
          if (!mounted) return
          console.log("[realtime] WebSocket connected")
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

        socket.onclose = (event) => {
          if (!mounted) return
          console.log("[realtime] WebSocket closed:", event.code, event.reason)
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
  }, [USE_MOCK])

  const displayTraffic = useMemo(() => {
    // Create a map of current traffic data
    const trafficMap = new Map(traffic.map(t => [t.uuid, t]))
    
    // Start with all known nodes from metadata
    const combinedNodes = Object.values(nodeMeta).map(meta => {
      const realtime = trafficMap.get(meta.uuid)
      return {
        uuid: meta.uuid,
        isOnline: realtime?.isOnline ?? false,
        updatedAt: realtime?.updatedAt,
        network: realtime?.network ?? { up: 0, down: 0, totalUp: 0, totalDown: 0 },
        displayName: meta.name,
        region: meta.region,
        group: meta.group
      }
    })

    // Only show nodes that are present in metadata
    // Unknown nodes (deleted but still reporting) are ignored
    return combinedNodes.sort((a, b) => {
      if (a.group !== b.group) return (a.group || "").localeCompare(b.group || "")
      return a.displayName.localeCompare(b.displayName)
    })
  }, [traffic, nodeMeta])

  const renderStatusBadge = () => {
    const map: Record<ConnectionState, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> =
      {
        connecting: { label: "连接中", variant: "secondary" },
        connected: { label: "已连接", variant: "default" },
        disconnected: { label: "已断开", variant: "outline" },
        error: { label: "异常", variant: "destructive" },
      }
    const current = map[connectionStatus]
    return <Badge variant={current.variant} className="shadow-sm">{current.label}</Badge>
  }

  const renderNodeGrid = () => {
    if (initializing) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-full border-none shadow-lg bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-12 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="space-y-2 p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (displayTraffic.length === 0) {
      return (
        <motion.div variants={item}>
          <Card className="border-none shadow-lg bg-card">
            <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <Activity className="h-7 w-7 text-muted-foreground opacity-50" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">暂无实时数据</p>
                <p className="text-sm text-muted-foreground">
                  {connectionStatus === "connected" ? "服务器暂未推送数据" : "等待连接..."}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayTraffic.map((node, index) => {
          return (
            <motion.div 
              key={node.uuid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/realtime/${node.uuid}`} className="block h-full">
                <Card className="h-full border-none shadow-lg bg-card transition-all hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <Server className="w-24 h-24" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <div className="space-y-1">
                      <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1" title={node.displayName}>
                        {node.displayName}
                      </CardTitle>
                      {node.group && (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          {node.group}
                        </Badge>
                      )}
                    </div>
                    <Badge variant={node.isOnline ? "default" : "secondary"} className={node.isOnline ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                      {node.isOnline ? "在线" : "离线"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ArrowUp className="h-3 w-3 text-orange-500" />
                          <span>实时上行</span>
                        </div>
                        <div className="font-mono font-semibold text-foreground text-sm">{formatSpeed(node.network.up)}</div>
                      </div>
                      <div className="space-y-1 p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ArrowDown className="h-3 w-3 text-green-500" />
                          <span>实时下行</span>
                        </div>
                        <div className="font-mono font-semibold text-foreground text-sm">{formatSpeed(node.network.down)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">实时流量</h1>
          <p className="text-muted-foreground">展示入口节点的实时上下行数据。</p>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Wifi className="h-4 w-4" />
            <span>连接状态</span>
            {renderStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground">
            上次更新：{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : "等待数据"}
          </p>
        </div>
      </motion.div>

      {errorMessage && (
        <div>
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>实时连接异常</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Debug Info - Only visible if no nodes are shown but we are initialized */}
      {!initializing && displayTraffic.length === 0 && (
        <div className="p-4 border rounded-lg bg-muted/50 text-xs font-mono space-y-1">
          <p className="font-bold">Debug Info:</p>
          <p>Connection: {connectionStatus}</p>
          <p>Nodes (Meta): {Object.keys(nodeMeta).length}</p>
          <p>Nodes (Traffic): {traffic.length}</p>
          <p>Last Update: {lastUpdatedAt}</p>
          <p>Error: {errorMessage || "None"}</p>
        </div>
      )}

      {renderNodeGrid()}
    </motion.div>
  )
}
