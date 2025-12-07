"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Server, Globe, SignalHigh, Wifi, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/errors"


interface Node {
  id: string
  name: string
  location: string
  status: "online" | "offline" | "maintenance"
  type?: string
  load?: number
  rate?: number
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

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const data = await api.getNodes()
        setNodes(data)
      } catch (error) {
        console.error("[v0] Failed to fetch nodes:", error)
        toast({
          title: "加载失败",
          description: getErrorMessage(error, "无法加载节点信息，请稍后重试"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchNodes()
    // Refresh every 30 seconds
    const interval = setInterval(fetchNodes, 30000)
    return () => clearInterval(interval)
  }, [toast])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      online: { variant: "default", label: "在线", className: "bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/20" },
      offline: { variant: "destructive", label: "离线", className: "" },
      maintenance: { variant: "secondary", label: "维护中", className: "bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 border-yellow-500/20" },
    }

    const statusInfo = statusMap[status] || { variant: "outline", label: "未知" }
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-[180px] rounded-xl border-none shadow-lg bg-card">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const onlineCount = nodes.filter(n => n.status === 'online').length
  const totalCount = nodes.length

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">节点列表</h1>
          <p className="text-muted-foreground">查看所有可用节点及其状态</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 px-3 py-1.5 rounded-full border border-border/50">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>在线: {onlineCount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 px-3 py-1.5 rounded-full border border-border/50">
            <Server className="h-3 w-3" />
            <span>总计: {totalCount}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
          <Card 
            className="h-full overflow-hidden border-none shadow-lg bg-card transition-all hover:shadow-xl hover:-translate-y-1 group relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Globe className="w-24 h-24" />
            </div>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative z-10">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">
                  {node.name}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {node.type || "标准节点"}
                  </span>
                  {node.rate && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-background/50">
                      {node.rate}x 倍率
                    </Badge>
                  )}
                </div>
              </div>
              {getStatusBadge(node.status)}
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3" />
                  <span>{node.location || "未知位置"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <SignalHigh className="h-3 w-3" />
                  <span>优选线路</span>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}