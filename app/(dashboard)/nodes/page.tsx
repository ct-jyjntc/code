"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Server, Globe } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Node {
  id: string
  name: string
  location: string
  status: "online" | "offline" | "maintenance"
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
          description: "无法加载节点信息，请稍后重试",
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
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      online: { variant: "default", label: "在线" },
      offline: { variant: "destructive", label: "离线" },
      maintenance: { variant: "secondary", label: "维护中" },
    }

    const statusInfo = statusMap[status] || { variant: "outline", label: "未知" }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">节点状态</h1>
          <p className="text-muted-foreground">查看所有可用节点的实时状态</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
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
        <h1 className="text-3xl font-bold text-balance text-foreground">节点状态</h1>
        <p className="text-muted-foreground">查看所有可用节点的实时状态</p>
      </div>

      {nodes.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center bg-muted">
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">暂无节点</p>
              <p className="text-sm text-muted-foreground">当前没有可用的节点</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <Card
              key={node.id}
              className={
                node.status === "online"
                  ? "border-primary/30"
                  : node.status === "offline"
                    ? "border-destructive/30"
                    : ""
              }
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center ${
                      node.status === "online"
                        ? "bg-primary/10"
                        : node.status === "offline"
                          ? "bg-destructive/10"
                          : "bg-secondary"
                    }`}
                  >
                    <Server
                      className={`h-4 w-4 ${
                        node.status === "online"
                          ? "text-primary"
                          : node.status === "offline"
                            ? "text-destructive"
                            : "text-secondary-foreground"
                      }`}
                    />
                  </div>
                  <div className="text-sm font-medium text-foreground">{node.name}</div>
                </div>
                {getStatusBadge(node.status)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
