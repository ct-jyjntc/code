"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Send, ArrowLeft, User, ImagePlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getErrorMessage } from "@/lib/errors"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
  const [uploadingImage, setUploadingImage] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const picgoApiKey = "chv_SPkDM_c248014d65780b4af1faedba654c0df56d978b516d50258aba77a9d1f9101a9d46c8238b550df61dafbd8a60665e3604b14a443f4bb4d39f9851cc57aab79fd9"

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
        description: getErrorMessage(error, "无法加载工单详情，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const lastMessage = ticket?.messages?.[ticket.messages.length - 1]
  const awaitingSupportReply = Boolean(ticket && ticket.messages.length > 0 && lastMessage && !lastMessage.is_admin)

  const handleUploadImage = async (file: File) => {
    if (!picgoApiKey) {
      toast({
        title: "缺少图床配置",
        description: "尚未设置 PicGo API Key，无法上传图片",
        variant: "destructive",
      })
      return
    }

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
        data?.image?.url ||
        data?.image?.image?.url ||
        data?.image?.display_url ||
        data?.image?.thumb?.url ||
        data?.image?.url_viewer

      if (!imageUrl) {
        throw new Error("图床未返回图片地址")
      }

      setReply((prev) => {
        const addition = `![图片](${imageUrl})`
        return prev.trim().length > 0 ? `${prev.trimEnd()}\n\n${addition}\n` : `${addition}\n`
      })

      toast({ title: "图片已上传", description: "已插入 Markdown，可直接发送" })
    } catch (error) {
      console.error("Failed to upload image:", error)
      toast({
        title: "上传失败",
        description: getErrorMessage(error, "无法上传图片，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleReply = async () => {
    if (awaitingSupportReply) {
      toast({
        title: "请等待客服回复",
        description: "客服回复前暂时无法继续发送新消息。",
        variant: "destructive",
      })
      return
    }
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
      const message = getErrorMessage(error, "无法发送回复，请稍后重试")
      toast({
        title: "回复失败",
        description: message,
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
        description: getErrorMessage(error, "无法关闭该工单，请稍后重试"),
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
                  <div className="prose prose-sm break-words dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            className="underline decoration-dashed hover:decoration-solid"
                            target="_blank"
                            rel="noreferrer"
                          />
                        ),
                        img: ({ node, ...props }) => <img {...props} className="my-2 max-h-64 w-auto rounded border" loading="lazy" />,
                      }}
                    >
                      {message.message || ""}
                    </ReactMarkdown>
                  </div>
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
            {awaitingSupportReply && (
              <Alert>
                <AlertDescription>客服尚未回复，请耐心等待，期间无法发送新的消息。</AlertDescription>
              </Alert>
            )}
            <Textarea
              placeholder="输入您的回复..."
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              disabled={awaitingSupportReply || sending}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || awaitingSupportReply || sending}
                >
                  {uploadingImage ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      上传中...
                    </span>
                  ) : (
                    <>
                      <ImagePlus className="mr-2 h-4 w-4" />
                      上传图片
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
              <Button onClick={handleReply} disabled={sending || awaitingSupportReply}>
                {sending ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" />
                    发送中...
                  </span>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    发送回复
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
