"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { User, Mail, Calendar, Shield, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getErrorMessage } from "@/lib/errors"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"

interface UserInfo {
  id: string
  username: string
  email: string
  created_at: string
  subscription_status?: string
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

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await api.getUserInfo()
        setUserInfo(data)
      } catch (error) {
        console.error("[v0] Failed to fetch user info:", error)
        toast({
          title: "加载失败",
          description: getErrorMessage(error, "无法加载用户信息，请稍后重试"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [toast])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 h-[300px]">
            <CardHeader>
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-32 mx-auto" />
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card className="h-[200px]">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <Card className="h-[300px]">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handlePasswordUpdate = async () => {
    setPasswordError(null)
    if (!currentPassword || !newPassword || !confirmPassword) {
      const message = "所有密码字段均为必填"
      setPasswordError(message)
      toast({ title: "请填写完整", description: message, variant: "destructive" })
      return
    }
    if (newPassword.length < 8) {
      const message = "密码长度需至少 8 位"
      setPasswordError(message)
      toast({ title: "新密码过短", description: message, variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      const message = "请确认两次输入一致"
      setPasswordError(message)
      toast({ title: "密码不一致", description: message, variant: "destructive" })
      return
    }
    if (newPassword === currentPassword) {
      const message = "新密码不能与当前密码相同"
      setPasswordError(message)
      toast({ title: "无效的新密码", description: message, variant: "destructive" })
      return
    }

    setUpdatingPassword(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      toast({ title: "修改成功", description: "密码已更新，请使用新密码重新登录" })
      setPasswordError(null)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      const message = getErrorMessage(error, "无法更新密码，请稍后重试")
      setPasswordError(message)
      toast({
        title: "修改失败",
        description: message,
        variant: "destructive",
      })
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">个人中心</h1>
        <p className="text-muted-foreground">管理您的账户信息</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="h-full border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <User className="w-32 h-32" />
            </div>
            <CardHeader className="relative z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl relative">
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                      {userInfo ? getInitials(userInfo.username) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold">{userInfo?.username}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{userInfo?.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">账户状态</p>
                    <p className="text-xs text-muted-foreground">{userInfo?.subscription_status || "正常"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">注册时间</p>
                    <p className="text-xs text-muted-foreground">
                      {userInfo?.created_at ? new Date(userInfo.created_at).toLocaleDateString("zh-CN") : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6 lg:col-span-2">
          <motion.div variants={item}>
            <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <User className="w-32 h-32" />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle>
                  基本信息
                </CardTitle>
                <CardDescription>查看和管理您的个人信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input id="username" value={userInfo?.username || ""} disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input id="email" type="email" value={userInfo?.email || ""} disabled className="bg-muted/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-id">用户 ID</Label>
                  <Input id="user-id" value={userInfo?.id || ""} disabled className="font-mono bg-muted/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Lock className="w-32 h-32" />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle>
                  修改密码
                </CardTitle>
                <CardDescription>更新您的账户密码以保护账户安全</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="current-password">当前密码</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="bg-background/50"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">新密码</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">确认新密码</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="bg-background/50"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all" onClick={handlePasswordUpdate} disabled={updatingPassword}>
                    {updatingPassword ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner />
                        更新中...
                      </span>
                    ) : (
                      "更新密码"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}