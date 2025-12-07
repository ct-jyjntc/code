"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  CreditCard,
  Server,
  User,
  MessageSquare,
  Activity,
  LogOut,
  Menu,
  ShieldCheck,
  BookOpen,
  Signal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { removeAuthToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/subscription", label: "我的订阅", icon: ShieldCheck },
  { href: "/subscribe", label: "订阅商店", icon: CreditCard },
  { href: "/orders", label: "我的订单", icon: ShoppingCart },
  { href: "/realtime", label: "实时流量", icon: Signal },
  { href: "/nodes", label: "节点状态", icon: Server },
  { href: "/knowledge", label: "使用文档", icon: BookOpen },
  { href: "/invite", label: "我的邀请", icon: Users },
  { href: "/tickets", label: "我的工单", icon: MessageSquare },
  { href: "/traffic", label: "流量明细", icon: Activity },
  { href: "/profile", label: "个人中心", icon: User },
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
    <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/50 bg-background/60 backdrop-blur-xl px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">打开菜单</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 border-r border-border/50 bg-background/80 backdrop-blur-2xl">
            <SheetHeader className="sr-only">
              <SheetTitle>移动端导航菜单</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b border-border/50 px-6">
                <div className="flex flex-col leading-tight">
                  <span className="text-xl font-bold text-foreground tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Seele Cloud
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground tracking-[0.2em] font-medium">
                    Control Panel
                  </span>
                </div>
              </div>

              <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-none">
                <AnimatePresence>
                  {navItems.map((item, index) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeNavMobile"
                              className="absolute inset-0 rounded-lg bg-primary/10"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                          <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                          <span className="relative z-10">{item.label}</span>
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicatorMobile"
                              className="absolute left-0 h-full w-1 rounded-r-full bg-primary"
                            />
                          )}
                        </Link>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </nav>

              <div className="border-t border-border/50 px-4 py-4 bg-background/40">
                <div className="flex items-center justify-between gap-2">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">退出登录</span>
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold text-foreground tracking-tight">Seele Cloud</span>
          <span className="text-[10px] uppercase text-muted-foreground tracking-[0.25em]">Control Panel</span>
        </div>
      </div>
    </div>
  )
}
