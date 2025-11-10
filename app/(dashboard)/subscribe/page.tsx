"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, Zap, TrendingUp, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Plan {
  id: string
  name: string
  price: number
  duration_days: number
  bandwidth: number
  features: string[]
  popular?: boolean
}

export default function SubscribePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.getPlans()
        setPlans(data)
      } catch (error) {
        console.error("[v0] Failed to fetch plans:", error)
        toast({
          title: "加载失败",
          description: "无法加载套餐信息，请稍后重试",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [toast])

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId)
    try {
      await api.createOrder(planId)
      toast({
        title: "购买成功",
        description: "订单已创建，请前往订单页面查看",
      })
      router.push("/orders")
    } catch (error) {
      console.error("[v0] Failed to create order:", error)
      toast({
        title: "购买失败",
        description: "无法创建订单，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setPurchasing(null)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 GB"
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(0)} GB`
  }

  const getPlanIcon = (index: number) => {
    const icons = [Zap, TrendingUp, Crown]
    return icons[index % icons.length]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">购买订阅</h1>
          <p className="text-muted-foreground">选择适合您的套餐</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-32" />
                <Skeleton className="mt-4 h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">购买订阅</h1>
        <p className="text-muted-foreground">选择适合您的套餐</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, index) => {
          const Icon = getPlanIcon(index)
          return (
            <Card key={plan.id} className={plan.popular ? "border-primary shadow-lg shadow-primary/20" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  {plan.popular && <Badge variant="default">热门</Badge>}
                </div>
                <CardDescription>
                  {plan.duration_days} 天 · {formatBytes(plan.bandwidth)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-4xl font-bold">¥{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.duration_days}天</span>
                </div>
                <ul className="space-y-2">
                  {plan.features?.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  )) || (
                    <>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="text-muted-foreground">高速节点访问</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="text-muted-foreground">{formatBytes(plan.bandwidth)} 流量</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="text-muted-foreground">{plan.duration_days} 天有效期</span>
                      </li>
                    </>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(plan.id)}
                  disabled={purchasing === plan.id}
                >
                  {purchasing === plan.id ? "处理中..." : "立即购买"}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">暂无可用套餐</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
