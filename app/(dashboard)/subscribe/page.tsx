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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getErrorMessage } from "@/lib/errors"

interface PlanPeriod {
  legacyKey: string
  label: string
  days: number
  price: number
}

interface Plan {
  id: string
  name: string
  price: number
  duration_days: number
  duration_label?: string
  bandwidth: number
  features: string[]
  popular?: boolean
  purchase_period?: string
  available_periods?: PlanPeriod[]
  speed_limit?: number | null
  device_limit?: number | null
}

interface OrderInfo {
  tradeNo: string
  planName: string
  periodLabel: string
  amount: number
}

export default function SubscribePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, string>>({})
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [errorDialog, setErrorDialog] = useState<{ title: string; description: string } | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.getPlans()
        setPlans(data)
        const defaults: Record<string, string> = {}
        data.forEach((plan) => {
          const defaultPeriod = plan.available_periods?.[0]?.legacyKey ?? plan.purchase_period ?? "month_price"
          defaults[plan.id] = defaultPeriod
        })
        setSelectedPeriods(defaults)
      } catch (error) {
        console.error("[v0] Failed to fetch plans:", error)
        toast({
          title: "加载失败",
          description: getErrorMessage(error, "无法加载套餐信息，请稍后重试"),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [toast])

  const handlePurchase = async (plan: Plan) => {
    const selectedPeriodKey =
      selectedPeriods[plan.id] ?? plan.available_periods?.[0]?.legacyKey ?? plan.purchase_period ?? null
    if (!selectedPeriodKey) {
      toast({
        title: "缺少周期",
        description: "该套餐暂不支持购买，请选择其他套餐",
        variant: "destructive",
      })
      return
    }
    const periodDetail = plan.available_periods?.find((item) => item.legacyKey === selectedPeriodKey)
    setPurchasing(plan.id)
    try {
      const result = await api.createOrder(plan.id, selectedPeriodKey)
      const tradeNo = result.trade_no || "未知订单号"
      setOrderInfo({
        tradeNo,
        planName: plan.name,
        periodLabel: periodDetail?.label ?? plan.duration_label ?? "默认周期",
        amount: periodDetail?.price ?? plan.price,
      })
      toast({
        title: "订单已创建",
        description: `订单号：${tradeNo}，请尽快完成支付`,
      })
    } catch (error) {
      console.error("[v0] Failed to create order:", error)
      setErrorDialog({
        title: "购买失败",
        description: getErrorMessage(error, "无法创建订单，请稍后重试"),
      })
    } finally {
      setPurchasing(null)
    }
  }

  const formatDataVolume = (bytes: number) => {
    if (!bytes || bytes <= 0) return "不限"
    const units = ["B", "KB", "MB", "GB", "TB", "PB"]
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
    const value = bytes / Math.pow(1024, index)
    const displayValue = value % 1 === 0 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2)
    return `${displayValue.replace(/\.0+$/, "")} ${units[index]}`
  }

  const getPlanIcon = (index: number) => {
    const icons = [Zap, TrendingUp, Crown]
    return icons[index % icons.length]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
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
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-balance text-foreground">购买订阅</h1>
          <p className="text-muted-foreground">选择适合您的套餐</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const Icon = getPlanIcon(index)
            const selectedKey =
              selectedPeriods[plan.id] ?? plan.available_periods?.[0]?.legacyKey ?? plan.purchase_period
            const selectedPeriod = plan.available_periods?.find((item) => item.legacyKey === selectedKey)
            const periodLabel = selectedPeriod?.label ?? plan.duration_label ?? `${plan.duration_days} 天`
            const periodDays = selectedPeriod?.days ?? plan.duration_days
            const periodPrice = selectedPeriod?.price ?? plan.price

            return (
              <Card key={plan.id} className={`flex flex-col ${plan.popular ? "border-primary shadow-lg shadow-primary/20" : ""}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{periodLabel}</p>
                      </div>
                    </div>
                    {plan.popular && <Badge variant="default">热门</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div>
                    <div className="text-4xl font-bold text-foreground">¥{periodPrice.toFixed(2)}</div>
                    <p className="text-sm text-muted-foreground">{periodDays > 0 ? `${periodDays} 天` : "一次性套餐"}</p>
                  </div>

                  {plan.available_periods && plan.available_periods.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-dashed px-3 py-3">
                      <Label className="text-xs text-muted-foreground">选择计费周期</Label>
                      <Select
                        value={selectedKey}
                        onValueChange={(value) =>
                          setSelectedPeriods((prev) => ({
                            ...prev,
                            [plan.id]: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="选择计费周期" />
                        </SelectTrigger>
                        <SelectContent align="start">
                          {plan.available_periods.map((period) => (
                            <SelectItem key={period.legacyKey} value={period.legacyKey}>
                              {period.label} · ¥{period.price.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid gap-3 rounded-lg bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>流量额度</span>
                      <span className="font-semibold text-foreground">{formatDataVolume(plan.bandwidth)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>速率限制</span>
                      <span className="font-semibold text-foreground">
                        {plan.speed_limit ? `${plan.speed_limit} Mbps` : "不限速"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>设备数量</span>
                      <span className="font-semibold text-foreground">
                        {typeof plan.device_limit === "number" ? `${plan.device_limit} 台` : "不限制"}
                      </span>
                    </div>
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePurchase(plan)}
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

      <Dialog
        open={Boolean(orderInfo)}
        onOpenChange={(open) => {
          if (!open) setOrderInfo(null)
        }}
      >
        <DialogContent className="max-h-[min(90vh,700px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订单已创建</DialogTitle>
            <DialogDescription>请前往订单中心完成支付</DialogDescription>
          </DialogHeader>
          {orderInfo && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">订单编号</span>
                <span className="font-mono text-base">{orderInfo.tradeNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">套餐</span>
                <span>{orderInfo.planName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">周期</span>
                <span>{orderInfo.periodLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">应付金额</span>
                <span className="text-lg font-semibold text-primary">¥{orderInfo.amount.toFixed(2)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setOrderInfo(null)}>
              继续选购
            </Button>
            <Button
              onClick={() => {
                setOrderInfo(null)
                router.push("/orders")
              }}
            >
              前往订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(errorDialog)}
        onOpenChange={(open) => {
          if (!open) setErrorDialog(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{errorDialog?.title ?? "操作提示"}</DialogTitle>
            <DialogDescription>{errorDialog?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialog(null)}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
