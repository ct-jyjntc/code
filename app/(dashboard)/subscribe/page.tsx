"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import type { CouponInfo } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, Zap, TrendingUp, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
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

type CouponStatus = "idle" | "loading" | "valid" | "error"

interface CouponState {
  code: string
  status: CouponStatus
  message?: string
  data?: CouponInfo
}

const calculateDiscount = (price: number, coupon?: CouponInfo) => {
  if (!coupon) return { discount: 0, finalPrice: price }
  const rawDiscount = coupon.type === "amount" ? coupon.value : (price * coupon.value) / 100
  const discount = Math.min(price, Math.max(rawDiscount, 0))
  return {
    discount,
    finalPrice: Math.max(price - discount, 0),
  }
}

export default function SubscribePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, string>>({})
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null)
  const [errorDialog, setErrorDialog] = useState<{ title: string; description: string } | null>(null)
  const [couponStates, setCouponStates] = useState<Record<string, CouponState>>({})
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

  const resolveSelectedPeriodKey = (plan: Plan) =>
    selectedPeriods[plan.id] ?? plan.available_periods?.[0]?.legacyKey ?? plan.purchase_period ?? null

  const getAppliedCoupon = (planId: string) => {
    const state = couponStates[planId]
    if (state?.status !== "valid") return undefined
    return state.data
  }

  const handlePurchase = async (plan: Plan) => {
    const selectedPeriodKey = resolveSelectedPeriodKey(plan)
    if (!selectedPeriodKey) {
      toast({
        title: "缺少周期",
        description: "该套餐暂不支持购买，请选择其他套餐",
        variant: "destructive",
      })
      return
    }
    const periodDetail = plan.available_periods?.find((item) => item.legacyKey === selectedPeriodKey)
    const appliedCoupon = getAppliedCoupon(plan.id)
    const { finalPrice } = calculateDiscount(periodDetail?.price ?? plan.price, appliedCoupon)
    const couponCode = couponStates[plan.id]?.code?.trim() || undefined
    setPurchasing(plan.id)
    try {
      const result = await api.createOrder(plan.id, selectedPeriodKey, couponCode)
      const tradeNo = result.trade_no || "未知订单号"
      let payableAmount = finalPrice
      try {
        const detail = await api.getOrderDetail(tradeNo)
        if (detail?.payable_amount !== undefined) {
          payableAmount = detail.payable_amount
        }
      } catch (detailError) {
        console.warn("[subscribe] Failed to fetch order detail:", detailError)
      }
      setOrderInfo({
        tradeNo,
        planName: plan.name,
        periodLabel: periodDetail?.label ?? plan.duration_label ?? "默认周期",
        amount: payableAmount,
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

  const handleCouponValidate = async (plan: Plan) => {
    const selectedPeriodKey = resolveSelectedPeriodKey(plan)
    if (!selectedPeriodKey) {
      toast({
        title: "缺少周期",
        description: "请先选择计费周期",
        variant: "destructive",
      })
      return
    }
    const code = couponStates[plan.id]?.code?.trim()
    if (!code) {
      toast({
        title: "请输入折扣码",
        description: "请填写折扣码后再验证",
      })
      return
    }
    setCouponStates((prev) => ({
      ...prev,
      [plan.id]: {
        code,
        status: "loading",
      },
    }))
    try {
      const coupon = await api.checkCoupon(code, plan.id, selectedPeriodKey)
      setCouponStates((prev) => ({
        ...prev,
        [plan.id]: {
          code,
          status: "valid",
          data: coupon,
          message: "优惠券可用",
        },
      }))
      toast({
        title: "验证成功",
        description: `${coupon.name || code} 可以用于本次购买`,
      })
    } catch (error) {
      const message = getErrorMessage(error, "优惠券不可用")
      setCouponStates((prev) => ({
        ...prev,
        [plan.id]: {
          code,
          status: "error",
          message,
        },
      }))
      toast({
        title: "验证失败",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleCouponInput = (planId: string, value: string) => {
    setCouponStates((prev) => ({
      ...prev,
      [planId]: {
        code: value,
        status: "idle",
      },
    }))
  }

  const handleCouponClear = (planId: string) => {
    setCouponStates((prev) => ({
      ...prev,
      [planId]: {
        code: "",
        status: "idle",
      },
    }))
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
            const selectedKey = resolveSelectedPeriodKey(plan)
            const selectedPeriod = plan.available_periods?.find((item) => item.legacyKey === selectedKey)
            const periodLabel = selectedPeriod?.label ?? plan.duration_label ?? `${plan.duration_days} 天`
            const periodDays = selectedPeriod?.days ?? plan.duration_days
            const periodPrice = selectedPeriod?.price ?? plan.price
            const couponState = couponStates[plan.id]
            const appliedCoupon = getAppliedCoupon(plan.id)
            const { discount, finalPrice } = calculateDiscount(periodPrice, appliedCoupon)

            return (
              <Card key={plan.id} className={`flex flex-col ${plan.popular ? "border-primary shadow-lg shadow-primary/20" : ""}`}>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{periodLabel}</p>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-4xl font-bold text-foreground">¥{finalPrice.toFixed(2)}</div>
                      {discount > 0 && (
                        <div className="text-sm text-muted-foreground line-through">¥{periodPrice.toFixed(2)}</div>
                      )}
                      <p className="text-xs text-muted-foreground">{periodDays > 0 ? `${periodDays} 天` : "一次性套餐"}</p>
                      {discount > 0 && <p className="text-xs text-emerald-600">已优惠 ¥{discount.toFixed(2)}</p>}
                    </div>
                  </div>
                  {plan.popular && <Badge variant="default" className="w-fit">热门</Badge>}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="space-y-3 rounded-xl border border-dashed px-4 py-3">
                    {plan.available_periods && plan.available_periods.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">计费周期</Label>
                        <Select
                          value={selectedKey ?? undefined}
                          onValueChange={(value) => {
                            setSelectedPeriods((prev) => ({
                              ...prev,
                              [plan.id]: value,
                            }))
                            setCouponStates((prev) => {
                              const current = prev[plan.id]
                              if (!current) return prev
                              return {
                                ...prev,
                                [plan.id]: {
                                  ...current,
                                  status: "idle",
                                  data: undefined,
                                  message: undefined,
                                },
                              }
                            })
                          }}
                        >
                          <SelectTrigger className="h-9 text-left">
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
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">折扣码</Label>
                      <div className="flex w-full items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={couponState?.code ?? ""}
                            onChange={(event) => handleCouponInput(plan.id, event.target.value)}
                            placeholder="输入折扣码"
                            className="h-9 pr-9"
                          />
                          {(couponState?.code || couponState?.status === "valid") && (
                            <button
                              type="button"
                              aria-label="清除折扣码"
                              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                              onClick={() => handleCouponClear(plan.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 px-4"
                          onClick={() => handleCouponValidate(plan)}
                          disabled={couponState?.status === "loading"}
                        >
                          {couponState?.status === "loading" ? "验证中" : "验证"}
                        </Button>
                      </div>
                      {couponState?.status === "valid" && couponState.data && (
                        <p className="text-xs text-emerald-600">
                          已应用 {couponState.data.name || couponState.data.code}，立减 ¥{discount.toFixed(2)}
                        </p>
                      )}
                      {couponState?.status === "error" && couponState.message && (
                        <p className="text-xs text-destructive">{couponState.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3 text-sm">
                    <div className="space-y-2 md:hidden">
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
                    <dl className="hidden gap-3 md:grid md:grid-cols-3">
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">流量额度</dt>
                        <dd className="font-semibold text-foreground">{formatDataVolume(plan.bandwidth)}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">速率限制</dt>
                        <dd className="font-semibold text-foreground">
                          {plan.speed_limit ? `${plan.speed_limit} Mbps` : "不限速"}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-muted-foreground">设备数量</dt>
                        <dd className="font-semibold text-foreground">
                          {typeof plan.device_limit === "number" ? `${plan.device_limit} 台` : "不限制"}
                        </dd>
                      </div>
                    </dl>
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
