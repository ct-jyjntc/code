"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Megaphone, Pin, CalendarDays } from "lucide-react"

interface Notice {
  id: string
  title: string
  content: string
  category?: string
  created_at: string
  pinned?: boolean
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const data = await api.getNotices()
        setNotices(data.data || [])
      } catch (error) {
        console.error("Failed to fetch notices:", error)
        toast({
          title: "加载失败",
          description: "无法获取公告信息，请稍后重试。",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchNotices()
  }, [toast])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">公告通知</h1>
        <p className="text-muted-foreground">及时了解维护计划、版本更新与优惠活动</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center text-center text-muted-foreground">
            <Megaphone className="mb-3 h-10 w-10" />
            暂无公告
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className={notice.pinned ? "border-primary" : undefined}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {notice.pinned && <Pin className="h-4 w-4 text-primary" />}
                    {notice.title}
                  </CardTitle>
                  {notice.category && <Badge variant="secondary">{notice.category}</Badge>}
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(notice.created_at).toLocaleString("zh-CN")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{notice.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
