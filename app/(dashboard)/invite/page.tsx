"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Copy, Plus, Gift, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Invite {
  id: string
  code: string
  used_by?: string
  created_at: string
  status: "active" | "used" | "expired"
}

interface InviteStats {
  total_invites: number
  active_invites: number
  commission_earned: number
}

export default function InvitePage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [stats, setStats] = useState<InviteStats>({
    total_invites: 0,
    active_invites: 0,
    commission_earned: 0,
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      const data = await api.getInvites()
      setInvites(data.invites || [])
      setStats({
        total_invites: data.total_invites || 0,
        active_invites: data.active_invites || 0,
        commission_earned: data.commission_earned || 0,
      })
    } catch (error) {
      console.error("[v0] Failed to fetch invites:", error)
      toast({
        title: "加载失败",
        description: "无法加载邀请信息，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    setGenerating(true)
    try {
      const result = await api.generateInviteCode()
      toast({
        title: "生成成功",
        description: "邀请码已生成",
      })
      await fetchInvites()
    } catch (error) {
      console.error("[v0] Failed to generate invite code:", error)
      toast({
        title: "生成失败",
        description: "无法生成邀请码，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyCode = (code: string) => {
    const inviteUrl = `${window.location.origin}/register?code=${code}`
    navigator.clipboard.writeText(inviteUrl)
    toast({
      title: "复制成功",
      description: "邀请链接已复制到剪贴板",
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">我的邀请</h1>
          <p className="text-muted-foreground">邀请好友并获得返佣</p>
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
        <h1 className="text-3xl font-bold text-balance text-foreground">我的邀请</h1>
        <p className="text-muted-foreground">邀请好友并获得返佣</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总邀请</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_invites}</div>
            <p className="text-xs text-muted-foreground">已成功邀请人数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃邀请</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_invites}</div>
            <p className="text-xs text-muted-foreground">仍在订阅中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计返佣</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{stats.commission_earned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">总收益</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            生成邀请码
          </CardTitle>
          <CardDescription>创建新的邀请码分享给好友，当他们注册并订阅后，您将获得返佣</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateCode} disabled={generating}>
            <Plus className="mr-2 h-4 w-4" />
            {generating ? "生成中..." : "生成新邀请码"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            邀请记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">暂无邀请记录</p>
                <p className="text-xs text-muted-foreground">点击上方按钮生成您的第一个邀请码</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邀请码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>使用者</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-mono font-medium">{invite.code}</TableCell>
                      <TableCell>
                        {invite.status === "active" && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            可用
                          </span>
                        )}
                        {invite.status === "used" && (
                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                            已使用
                          </span>
                        )}
                        {invite.status === "expired" && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                            已过期
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{invite.used_by || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{new Date(invite.created_at).toLocaleDateString("zh-CN")}</TableCell>
                      <TableCell className="text-right">
                        {invite.status === "active" && (
                          <Button variant="ghost" size="sm" onClick={() => handleCopyCode(invite.code)}>
                            <Copy className="mr-2 h-4 w-4" />
                            复制链接
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">返佣规则</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 好友通过您的邀请链接注册后，您将获得返佣资格</p>
          <p>• 当好友购买订阅时，您将获得订单金额的 10% 作为返佣</p>
          <p>• 返佣将自动计入您的账户余额，可用于购买订阅</p>
          <p>• 邀请码永久有效，可重复使用</p>
        </CardContent>
      </Card>
    </div>
  )
}
