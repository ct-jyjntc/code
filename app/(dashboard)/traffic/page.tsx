"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/errors"

interface TrafficLog {
  id: string
  date: string
  upload: number
  download: number
  total: number
}

interface TrafficData {
  summary?: {
    today_upload: number
    today_download: number
    month_upload: number
    month_download: number
  }
  logs: TrafficLog[]
}

export default function TrafficPage() {
  const [trafficLogs, setTrafficLogs] = useState<TrafficLog[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchTrafficLog = async () => {
      try {
        const data = (await api.getTrafficLog()) as TrafficData
        setTrafficLogs(data.logs || [])
      } catch (error) {
        console.error("Failed to fetch traffic log:", error)
        toast({
          title: "加载失败",
          description: getErrorMessage(error, "无法加载流量明细，请稍后重试"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTrafficLog()
  }, [toast])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
  }

  const getTotalStats = () => {
    if (!Array.isArray(trafficLogs) || trafficLogs.length === 0) {
      return { upload: 0, download: 0, total: 0 }
    }

    return trafficLogs.reduce(
      (acc, log) => ({
        upload: acc.upload + log.upload,
        download: acc.download + log.download,
        total: acc.total + log.total,
      }),
      { upload: 0, download: 0, total: 0 },
    )
  }

  const stats = getTotalStats()

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">流量明细</h1>
          <p className="text-muted-foreground">查看您的流量使用记录</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">流量明细</h1>
        <p className="text-muted-foreground">查看您的流量使用记录</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总上传</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(stats.upload)}</div>
            <p className="text-xs text-muted-foreground">累计上传流量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总下载</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(stats.download)}</div>
            <p className="text-xs text-muted-foreground">累计下载流量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总使用</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(stats.total)}</div>
            <p className="text-xs text-muted-foreground">总计使用流量</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            使用记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trafficLogs.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">暂无流量记录</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead className="text-right">上传</TableHead>
                    <TableHead className="text-right">下载</TableHead>
                    <TableHead className="text-right">总计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trafficLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{new Date(log.date).toLocaleDateString("zh-CN")}</TableCell>
                      <TableCell className="text-right">{formatBytes(log.upload)}</TableCell>
                      <TableCell className="text-right">{formatBytes(log.download)}</TableCell>
                      <TableCell className="text-right font-medium">{formatBytes(log.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
