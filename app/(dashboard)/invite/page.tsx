"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Users, Copy, Plus, Gift, TrendingUp, ArrowRightLeft, Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/errors"

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
  pending_commission: number
  available_commission: number
  available_commission_raw: number
  commission_rate: number
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

export default function InvitePage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [stats, setStats] = useState<InviteStats>({
    total_invites: 0,
    active_invites: 0,
    commission_earned: 0,
    pending_commission: 0,
    available_commission: 0,
    available_commission_raw: 0,
    commission_rate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [transferAmount, setTransferAmount] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [withdrawMethods, setWithdrawMethods] = useState<string[]>([])
  const [withdrawMethod, setWithdrawMethod] = useState("")
  const [withdrawAccount, setWithdrawAccount] = useState("")
  const [withdrawing, setWithdrawing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchInvites()
    fetchWithdrawConfig()
  }, [])

  const fetchInvites = async () => {
    try {
      const data = await api.getInvites()
      setInvites(data.invites || [])
      setStats({
        total_invites: data.total_invites || 0,
        active_invites: data.active_invites || 0,
        commission_earned: data.commission_earned || 0,
        pending_commission: data.pending_commission || 0,
        available_commission: data.available_commission || 0,
        available_commission_raw: data.available_commission_raw || 0,
        commission_rate: data.commission_rate || 0,
      })
    } catch (error) {
      console.error("[v0] Failed to fetch invites:", error)
      toast({
        title: "加载失败",
        description: getErrorMessage(error, "无法加载邀请信息，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchWithdrawConfig = async () => {
    try {
      const config = await api.getCommConfig()
      const methods = Array.isArray(config?.withdraw_methods) ? config.withdraw_methods : []
      setWithdrawMethods(methods)
      if (methods.length > 0) {
        setWithdrawMethod(methods[0])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch withdraw config:", error)
      toast({
        title: "配置加载失败",
        description: getErrorMessage(error, "无法加载提现配置，请稍后再试"),
        variant: "destructive",
      })
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
        description: getErrorMessage(error, "无法生成邀请码，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    const inviteUrl = `${window.location.origin}/register?code=${code}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast({
        title: "复制成功",
        description: "邀请链接已复制到剪贴板",
      })
    } catch (error) {
      console.error("[v0] Failed to copy invite link:", error)
      toast({
        title: "复制失败",
        description: "请检查浏览器权限后重试",
        variant: "destructive",
      })
    }
  }

  const handleTransfer = async () => {
    const numericAmount = parseFloat(transferAmount)
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "金额有误",
        description: "请输入正确的划转金额",
        variant: "destructive",
      })
      return
    }
    const amountInCents = Math.round(numericAmount * 100)
    if (amountInCents > stats.available_commission_raw) {
      toast({
        title: "余额不足",
        description: "划转金额不能超过可用佣金",
        variant: "destructive",
      })
      return
    }
    setTransferring(true)
    try {
      await api.transferCommission(amountInCents)
      toast({
        title: "划转成功",
        description: "佣金已转入账户余额",
      })
      setTransferAmount("")
      await fetchInvites()
    } catch (error) {
      console.error("[v0] Failed to transfer commission:", error)
      toast({
        title: "划转失败",
        description: getErrorMessage(error, "请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setTransferring(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawMethod) {
      toast({
        title: "请选择提现方式",
        variant: "destructive",
      })
      return
    }
    if (!withdrawAccount.trim()) {
      toast({
        title: "请填写收款信息",
        description: "请输入提现账号或备注信息",
        variant: "destructive",
      })
      return
    }
    setWithdrawing(true)
    try {
      await api.withdrawCommission(withdrawMethod, withdrawAccount.trim())
      toast({
        title: "提现申请已提交",
        description: "系统已创建工单，请等待客服处理",
      })
      setWithdrawAccount("")
      await fetchInvites()
    } catch (error) {
      console.error("[v0] Failed to submit withdraw:", error)
      toast({
        title: "提交失败",
        description: getErrorMessage(error, "请稍后重试或联系管理员"),
        variant: "destructive",
      })
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-48" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2].map((i) => (
            <Card key={i} className="h-full border-none shadow-lg bg-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
          <Card className="h-full border-none shadow-lg bg-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full border-none shadow-lg bg-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
          <Card className="h-full border-none shadow-lg bg-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        </div>
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">我的邀请</h1>
        <p className="text-muted-foreground">邀请好友并获得返佣</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="h-full border-none shadow-lg bg-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Users className="w-24 h-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">总邀请</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold">{stats.total_invites}</div>
              <p className="text-xs text-muted-foreground">已成功邀请人数</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full border-none shadow-lg bg-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <TrendingUp className="w-24 h-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">活跃邀请</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold">{stats.active_invites}</div>
              <p className="text-xs text-muted-foreground">仍在订阅中</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="h-full border-none shadow-lg bg-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Gift className="w-24 h-24" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">佣金概览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 relative z-10">
              <div>
                <div className="text-2xl font-bold">¥{stats.available_commission.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">可用佣金</p>
              </div>
              <div className="text-xs text-muted-foreground">
                累计返佣 ¥{stats.commission_earned.toFixed(2)} · 待确认 ¥
                {stats.pending_commission.toFixed(2)} · 返佣比例 {stats.commission_rate}%
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full border-none shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                划转至账户余额
              </CardTitle>
              <CardDescription>将可用佣金划转为账户余额，用于购买套餐</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground p-3 rounded-lg bg-background/50 border border-border/50">
                当前可划转：<span className="font-semibold text-foreground">¥{stats.available_commission.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-amount">划转金额（¥）</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="例如 50"
                  min="0"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <Button className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all" onClick={handleTransfer} disabled={transferring}>
                {transferring ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    划转中...
                  </span>
                ) : (
                  "确认划转"
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="h-full border-none shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                推广佣金提现
              </CardTitle>
              <CardDescription>提交提现申请，系统会自动创建工单</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>提现方式</Label>
                {withdrawMethods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无可用提现方式，请联系管理员</p>
                ) : (
                  <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="选择提现方式" />
                    </SelectTrigger>
                    <SelectContent>
                      {withdrawMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-account">收款账号 / 备注</Label>
                <Input
                  id="withdraw-account"
                  placeholder="请输入收款账号或备注信息"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <Button
                className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
                onClick={handleWithdraw}
                disabled={withdrawing || withdrawMethods.length === 0}
              >
                {withdrawing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    提交中...
                  </span>
                ) : (
                  "提交提现申请"
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                提交后系统会创建工单，请等待客服审核处理。
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-none shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              生成邀请码
            </CardTitle>
            <CardDescription>创建新的邀请码分享给好友，当他们注册并订阅后，您将获得返佣</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerateCode} disabled={generating} className="shadow-md hover:shadow-lg transition-all">
              {generating ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  生成中...
                </span>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  生成新邀请码
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="border-none shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              邀请记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <p className="mt-2 text-sm text-muted-foreground">暂无邀请记录</p>
                  <p className="text-xs text-muted-foreground">点击上方按钮生成您的第一个邀请码</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>邀请码</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium">{invite.code}</TableCell>
                        <TableCell>{new Date(invite.created_at).toLocaleDateString("zh-CN")}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="inline-flex items-center gap-2 hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleCopyCode(invite.code)}
                          >
                            <Copy className="h-4 w-4" />
                            复制链接
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  )
}