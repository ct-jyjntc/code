"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Plus, Clock, ImagePlus } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getErrorMessage } from "@/lib/errors"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"

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
  const [priority, setPriority] = useState("0")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
        description: getErrorMessage(error, "无法加载工单信息，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!dialogOpen) {
      setDialogError(null)
      setSubject("")
      setMessage("")
      setPriority("0")
      setUploadingImage(false)
    }
  }, [dialogOpen])

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("source", file)

      const response = await fetch("/api/picgo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`上传失败（${response.status}）`)
      }

      const data = await response.json()
      const imageUrl =
        data?.image?.url || data?.image?.image?.url || data?.image?.display_url || data?.image?.thumb?.url || data?.image?.url_viewer

      if (!imageUrl) {
        throw new Error("图床未返回图片地址")
      }

      setMessage((prev) => {
        const addition = `![图片](${imageUrl})`
        return prev.trim().length > 0 ? `${prev.trimEnd()}\n\n${addition}\n` : `${addition}\n`
      })

      toast({ title: "图片上传成功", description: "已插入 Markdown，可直接提交" })
    } catch (error) {
      console.error("Upload image failed:", error)
      toast({
        title: "上传失败",
        description: getErrorMessage(error, "无法上传图片，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCreateTicket = async () => {
    setDialogError(null)
    if (!subject.trim() || !message.trim()) {
      const messageText = "标题和内容不能为空"
      setDialogError(messageText)
      toast({
        title: "请填写完整信息",
        description: messageText,
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      await api.createTicket(subject, message, Number(priority))
      toast({
        title: "创建成功",
        description: "工单已创建，客服将尽快回复",
      })
      setDialogOpen(false)
      setDialogError(null)
      await fetchTickets()
    } catch (error) {
      console.error("[v0] Failed to create ticket:", error)
      const messageText = getErrorMessage(error, "无法创建工单，请稍后重试")
      setDialogError(messageText)
      toast({
        title: "创建失败",
        description: messageText,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    setClosingTicketId(ticketId)
    try {
      await api.closeTicket(ticketId)
      toast({
        title: "工单已关闭",
        description: "该工单已成功关闭",
      })
      await fetchTickets()
    } catch (error) {
      console.error("[v0] Failed to close ticket:", error)
      toast({
        title: "关闭失败",
        description: getErrorMessage(error, "无法关闭该工单，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setClosingTicketId((prev) => (prev === ticketId ? null : prev))
    }
  }

  const filteredTickets =
    statusFilter === "all" ? tickets : tickets.filter((ticket) => ticket.status === statusFilter)

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="open">进行中</SelectItem>
              <SelectItem value="replied">已回复</SelectItem>
              <SelectItem value="closed">已关闭</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                创建工单
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] max-h-[min(90vh,700px)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建新工单</DialogTitle>
                <DialogDescription>描述您遇到的问题，我们的客服团队将尽快回复</DialogDescription>
              </DialogHeader>
              {dialogError && (
                <Alert variant="destructive">
                  <AlertDescription>{dialogError}</AlertDescription>
                </Alert>
              )}
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
                    className="break-all"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage || creating}>
                      {uploadingImage ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-4" /> 上传中...
                        </span>
                      ) : (
                        <>
                          <ImagePlus className="mr-2 h-4 w-4" /> 上传图片
                        </>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          handleUploadImage(file)
                          event.target.value = ""
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">优先级</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="请选择优先级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">普通</SelectItem>
                      <SelectItem value="1">急需</SelectItem>
                      <SelectItem value="2">紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                  取消
                </Button>
                <Button onClick={handleCreateTicket} disabled={creating}>
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <Spinner />
                      创建中...
                    </span>
                  ) : (
                    "提交工单"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredTickets.length === 0 ? (
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
          {filteredTickets.map((ticket) => (
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
                {ticket.status !== "closed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/tickets/${ticket.id}`)
                      }}
                    >
                      查看详情
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCloseTicket(ticket.id)
                      }}
                      disabled={closingTicketId === ticket.id}
                    >
                      {closingTicketId === ticket.id ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-3.5" />
                          关闭中...
                        </span>
                      ) : (
                        "关闭工单"
                      )}
                    </Button>
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
