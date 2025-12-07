"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Send, ArrowLeft, User, ImagePlus, CheckCircle2, AlertCircle } from "lucide-react"
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
  // Keep the key for compatibility with existing logic, though it seems unused in the fetch
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
        description: "您的回复已提交",
      })
      setReply("")
      await fetchTicketDetail()
    } catch (error) {
      console.error("[v0] Failed to reply ticket:", error)
      toast({
        title: "回复失败",
        description: getErrorMessage(error, "无法提交回复，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleCloseTicket = async () => {
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
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">工单未找到</h2>
        <p className="text-muted-foreground mb-6">无法找到该工单的信息，可能已被删除。</p>
        <Button onClick={() => router.push("/tickets")}>返回工单列表</Button>
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
      <motion.div variants={item} className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tickets")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{ticket.subject}</h1>
            {getStatusBadge(ticket.status)}
          </div>
          <p className="text-sm text-muted-foreground">
            工单编号: <span className="font-mono">{ticket.id}</span>
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={item} className="space-y-4">
            {ticket.messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-4 ${msg.is_admin ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarFallback className={msg.is_admin ? "bg-primary text-primary-foreground" : "bg-muted"}>
                    {msg.is_admin ? "客服" : <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex max-w-[85%] flex-col gap-1 ${msg.is_admin ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{msg.is_admin ? "客服支持" : "我"}</span>
                    <span>{new Date(msg.created_at).toLocaleString("zh-CN")}</span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.is_admin
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card border rounded-tl-none"
                    }`}
                  >
                    <div className={`prose prose-sm max-w-none break-words ${msg.is_admin ? "prose-invert" : "dark:prose-invert"}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {ticket.status !== "closed" && (
            <motion.div variants={item}>
              <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">回复工单</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {awaitingSupportReply && (
                    <Alert className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        您的工单正在等待客服回复，请耐心等待。如果问题有更新，您可以继续补充信息。
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="relative">
                    <Textarea
                      placeholder="请输入您的回复内容... (支持 Markdown)"
                      rows={6}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      className="resize-y min-h-[120px] bg-background/50 pr-12"
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage || sending}
                        title="上传图片"
                      >
                        {uploadingImage ? <Spinner className="h-4 w-4" /> : <ImagePlus className="h-5 w-5" />}
                      </Button>
                    </div>
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
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCloseTicket}
                      disabled={closing || sending}
                      className="bg-background/50"
                    >
                      {closing ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-4" />
                          关闭中...
                        </span>
                      ) : (
                        "关闭工单"
                      )}
                    </Button>
                    <Button onClick={handleReply} disabled={sending || !reply.trim()}>
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-4" />
                          发送中...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          发送回复
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {ticket.status === "closed" && (
            <motion.div variants={item}>
              <Alert className="bg-muted/50 border-muted">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-muted-foreground">
                  此工单已关闭。如果您有新的问题，请创建一个新工单。
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </div>

        <motion.div variants={item} className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">工单信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">状态</span>
                {getStatusBadge(ticket.status)}
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">创建时间</span>
                <span>{new Date(ticket.created_at).toLocaleString("zh-CN")}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">消息数量</span>
                <span>{ticket.messages.length}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}