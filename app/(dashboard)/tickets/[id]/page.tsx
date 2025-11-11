"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Send, ArrowLeft, User, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Message {
  id: string
  message: string
  is_admin: boolean
  created_at: string
  sender_name?: string
}

interface TicketDetail {
  id: string
  subject: string
  status: "open" | "replied" | "closed"
  created_at: string
  messages: Message[]
}

export default function TicketDetailPage() {
  const params = useParams()
  const ticketId = params.id as string
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchTicketDetail()
  }, [ticketId])

  const fetchTicketDetail = async () => {
    try {
      const data = await api.getTicketDetail(ticketId)
      setTicket(data)
    } catch (error) {
      console.error("[v0] Failed to fetch ticket detail:", error)
      toast({
        title: "加载失败",
        description: "无法加载工单详情，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!reply.trim()) {
      toast({
        title: "请输入回复内容",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      await api.replyTicket(ticketId, reply)
      toast({
        title: "回复成功",
        description: "您的回复已发送",
      })
      setReply("")
      await fetchTicketDetail()
    } catch (error) {
      console.error("[v0] Failed to reply to ticket:", error)
      toast({
        title: "回复失败",
        description: "无法发送回复，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = async () => {
    setClosing(true)
    try {
      await api.closeTicket(ticketId)
      toast({
        title: "工单已关闭",
        description: "该工单已成功关闭",
      })
      await fetchTicketDetail()
    } catch (error) {
      console.error("[v0] Failed to close ticket:", error)
      toast({
        title: "关闭失败",
        description: "无法关闭该工单，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setClosing(false)
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
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">工单不存在</p>
          <Button variant="outline" className="mt-4 bg-transparent" onClick={() => router.push("/tickets")}>
            返回工单列表
          </Button>
        </div>
        {ticket.status !== "closed" && (
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={closing}>
            <XCircle className="mr-2 h-4 w-4" />
            {closing ? "关闭中..." : "关闭工单"}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tickets")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-balance text-foreground">{ticket.subject}</h1>
            {getStatusBadge(ticket.status)}
          </div>
          <p className="text-sm text-muted-foreground">
            工单编号: {ticket.id} · 创建于 {new Date(ticket.created_at).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            对话记录
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.is_admin ? "" : "flex-row-reverse"}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className={message.is_admin ? "bg-primary/10" : "bg-accent"}>
                  {message.is_admin ? <User className="h-4 w-4 text-primary" /> : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className={`flex-1 ${message.is_admin ? "" : "flex flex-col items-end"}`}>
                <div
                  className={`p-3 ${message.is_admin ? "bg-muted" : "bg-primary text-primary-foreground"}`}
                  style={{ maxWidth: "80%" }}
                >
                  <p className="text-sm font-medium">{message.is_admin ? message.sender_name || "客服" : "您"}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{message.message}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleString("zh-CN")}
                </p>
              </div>
            </div>
          ))}

          {ticket.messages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">暂无消息记录</div>
          )}
        </CardContent>
      </Card>

      {ticket.status !== "closed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">添加回复</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="输入您的回复..." rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="flex justify-end">
              <Button onClick={handleReply} disabled={sending}>
                <Send className="mr-2 h-4 w-4" />
                {sending ? "发送中..." : "发送回复"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
