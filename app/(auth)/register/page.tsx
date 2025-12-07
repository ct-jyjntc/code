"use client"

import { useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"
import { isAuthenticated } from "@/lib/auth"
import { motion } from "framer-motion"

export default function RegisterPage() {
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
              开启全新旅程
            </h1>
            <p className="text-sm text-muted-foreground mt-2">创建账户，解锁极速网络与高级节点</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Suspense fallback={<div className="w-full max-w-md mx-auto text-center text-white/80">正在加载...</div>}>
            <RegisterForm />
          </Suspense>
        </motion.div>

        <motion.p 
          className="text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          已有账户？{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors">
            立即登录
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
