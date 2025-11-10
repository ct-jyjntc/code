"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Plus, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Ticket {
  id: string
  subject: string
  status: "open" | "replied" | "closed"
  created_at: string
  updated_at: string
  priority?: string
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const data = await api.getTickets()
      setTickets(data)
    } catch (error) {
      console.error("[v0] Failed to fetch tickets:", error)
      toast({
        title: "加载失败",
        description: "无法加载工单信息，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "请填写完整信息",
        description: "标题和内容不能为空",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      await api.createTicket(subject, message)
      toast({
        title: "创建成功",
        description: "工单已创建，客服将尽快回复",
      })
      setDialogOpen(false)
      setSubject("")
      setMessage("")
      await fetchTickets()
    } catch (error) {
      console.error("[v0] Failed to create ticket:", error)
      toast({
        title: "创建失败",
        description: "无法创建工单，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      open: { variant: "default", label: "进行中" },
      replied: { variant: "secondary", label: "已回复" },
      closed: { variant: "outline", label: "已关闭" },
    }

    const statusInfo = statusMap[status] || { variant: "outline", label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">我的工单</h1>
            <p className="text-muted-foreground">查看和管理您的支持工单</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance text-foreground">我的工单</h1>
          <p className="text-muted-foreground">查看和管理您的支持工单</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建工单
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>创建新工单</DialogTitle>
              <DialogDescription>描述您遇到的问题，我们的客服团队将尽快回复</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">标题</Label>
                <Input
                  id="subject"
                  placeholder="简要描述您的问题"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">问题详情</Label>
                <Textarea
                  id="message"
                  placeholder="请详细描述您遇到的问题..."
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                取消
              </Button>
              <Button onClick={handleCreateTicket} disabled={creating}>
                {creating ? "创建中..." : "提交工单"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">暂无工单</p>
              <p className="text-sm text-muted-foreground">您还没有创建任何支持工单</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              创建第一个工单
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push(`/tickets/${ticket.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      {ticket.subject}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(ticket.created_at).toLocaleDateString("zh-CN")}
                      </span>
                      {ticket.priority && <Badge variant="outline">{ticket.priority}</Badge>}
                    </div>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  工单编号: <span className="font-mono">{ticket.id}</span>
                </div>
                {ticket.updated_at && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    最后更新: {new Date(ticket.updated_at).toLocaleString("zh-CN")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
