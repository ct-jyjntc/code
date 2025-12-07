"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import Link from "next/link"
import { isAuthenticated } from "@/lib/auth"
import { motion } from "framer-motion"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard")
    }
  }, [router])

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:60px_60px]" />

      <motion.div 
        className="relative z-10 w-full max-w-md space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Brand header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80 font-medium">Seele Cloud</p>
            <h1 className="text-4xl font-bold text-foreground mt-2 tracking-tight">
              欢迎回来
            </h1>
            <p className="text-sm text-muted-foreground mt-2">高速、安全、稳定的网络体验中心</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <LoginForm />
        </motion.div>

        <motion.p 
          className="text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          还没有账户？{" "}
          <Link href="/register" className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors">
            立即注册
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
