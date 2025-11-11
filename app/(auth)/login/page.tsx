import { LoginForm } from "@/components/auth/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-background to-cyan-950 opacity-50" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Seele Cloud</p>
          <h1 className="text-4xl font-semibold text-white">
            欢迎回来
          </h1>
          <p className="text-sm text-white/70">高速、安全、稳定的网络体验中心</p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          还没有账户？{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  )
}
