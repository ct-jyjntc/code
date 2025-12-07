"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, TrendingUp, TrendingDown, Calendar, ArrowUp, ArrowDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/errors"
import { Badge } from "@/components/ui/badge"

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
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
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
      <motion.div variants={item} className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">流量明细</h1>
        <p className="text-muted-foreground">查看您的流量使用记录和统计</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={item}>
          <Card className="h-full border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm transition-all hover:shadow-xl hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总上传</CardTitle>
              <ArrowUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatBytes(stats.upload)}</div>
              <p className="text-xs text-muted-foreground">历史累计上传流量</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="h-full border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm transition-all hover:shadow-xl hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总下载</CardTitle>
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatBytes(stats.download)}</div>
              <p className="text-xs text-muted-foreground">历史累计下载流量</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="h-full border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm transition-all hover:shadow-xl hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总流量</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatBytes(stats.total)}</div>
              <p className="text-xs text-muted-foreground">历史累计总流量</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              每日明细
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>日期</TableHead>
                    <TableHead>上传</TableHead>
                    <TableHead>下载</TableHead>
                    <TableHead className="text-right">总计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trafficLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        暂无流量记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    trafficLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{log.date}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3 text-muted-foreground" />
                            {formatBytes(log.upload)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ArrowDown className="h-3 w-3 text-muted-foreground" />
                            {formatBytes(log.download)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatBytes(log.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}