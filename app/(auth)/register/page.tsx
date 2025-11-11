import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-background to-cyan-950 opacity-50" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Seele Cloud</p>
          <h1 className="text-4xl font-semibold text-white">开启全新旅程</h1>
          <p className="text-sm text-white/70">创建账户，解锁极速网络与高级节点</p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground">
          已有账户？{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  )
}
