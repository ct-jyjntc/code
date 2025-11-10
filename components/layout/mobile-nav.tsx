"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  CreditCard,
  Server,
  User,
  MessageSquare,
  Activity,
  LogOut,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { removeAuthToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/docs", label: "使用文档", icon: FileText },
  { href: "/orders", label: "我的订单", icon: ShoppingCart },
  { href: "/invite", label: "我的邀请", icon: Users },
  { href: "/subscribe", label: "购买订阅", icon: CreditCard },
  { href: "/nodes", label: "节点状态", icon: Server },
  { href: "/profile", label: "个人中心", icon: User },
  { href: "/tickets", label: "我的工单", icon: MessageSquare },
  { href: "/traffic", label: "流量明细", icon: Activity },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = () => {
    removeAuthToken()
    toast({
      title: "已退出",
      description: "您已成功退出登录",
    })
    setOpen(false)
    router.push("/login")
  }

  return (
    <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">打开菜单</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-border px-6">
                <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-xl font-bold text-transparent">
                  SeeleCloud
                </h1>
              </div>

              <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 border px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="border-t border-border p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  退出登录
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-lg font-bold text-transparent">
          SeeleCloud
        </h1>
      </div>
      <ThemeToggle />
    </div>
  )
}
