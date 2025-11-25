import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">404</p>
        <h1 className="mt-2 text-4xl font-semibold text-foreground">页面未找到</h1>
        <p className="mt-2 text-sm text-muted-foreground">抱歉，您访问的页面不存在或已被移动。</p>
      </div>
      <Button asChild>
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  )
}
