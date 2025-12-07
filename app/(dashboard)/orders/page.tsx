
"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Calendar, DollarSign, Package, CreditCard, RefreshCw, CheckCircle, XCircle, Clock, ArrowRight, Receipt } from "lucide-react"
import { getErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

interface Order {
  id: string
  trade_no?: string
  plan_name: string
  amount: number
  status: string
  created_at: string
  paid_at?: string
}

interface PlanDetail {
  id?: string
  name?: string
  content?: string
  transfer_enable?: number
  speed_limit?: number
  device_limit?: number
}

interface OrderDetail extends Order {
  payable_amount?: number
  total_amount?: number
  balance_amount?: number
  handling_amount?: number
  discount_amount?: number
  period?: string
  period_label?: string
  plan_detail?: PlanDetail
}

interface PaymentMethod {
  id: string
  name: string
  payment: string
  icon?: string
  handling_fee_percent?: number
  handling_fee_fixed?: number
}

interface CheckoutResult {
  type: number
  data: any
}

const formatCurrency = (value?: number) => `¥${(value ?? 0).toFixed(2)}`

const formatDateTime = (value?: string) => {
  if (!value) return "--"
  return new Date(value).toLocaleString("zh-CN")
}

const formatBandwidth = (value?: number) => {
  if (!value) return "不限"
  const gb = value / (1024 * 1024 * 1024)
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${gb.toFixed(0)} GB`
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null)
  const [orderDetailLoading, setOrderDetailLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  const [paying, setPaying] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const { toast } = useToast()

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const data = await api.getOrders()
        setOrders(data)
      } catch (error) {
        console.error("Failed to fetch orders:", error)
        toast({
          title: "加载失败",
          description: getErrorMessage(error, "无法加载订单信息，请稍后重试"),
          variant: "destructive",
        })
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string; icon: any }> = {
      pending: { variant: "secondary", label: "待支付", className: "bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 border-yellow-500/20", icon: Clock },
      processing: { variant: "secondary", label: "开通中", className: "bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20", icon: RefreshCw },
      completed: { variant: "default", label: "已完成", className: "bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/20", icon: CheckCircle },
      cancelled: { variant: "outline", label: "已取消", className: "bg-muted text-muted-foreground", icon: XCircle },
    }

    const statusInfo = statusMap[status] || { variant: "outline", label: status, icon: Clock }
    const Icon = statusInfo.icon
    
    return (
      <Badge variant={statusInfo.variant} className={cn("flex items-center gap-1 px-2 py-0.5", statusInfo.className)}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </Badge>
    )
  }

  const resetDialogState = () => {
    setOrderDetail(null)
    setPaymentMethods([])
    setSelectedPaymentMethod("")
    setCheckoutResult(null)
    setOrderDetailLoading(false)
    setPaying(false)
    setCheckingStatus(false)
    setCanceling(false)
  }

  const handleCloseDialog = () => {
    setOrderDialogOpen(false)
    resetDialogState()
  }

  const openOrderDialog = async (tradeNo: string) => {
    setOrderDialogOpen(true)
    setOrderDetailLoading(true)
    setCheckoutResult(null)
    try {
      const detail = await api.getOrderDetail(tradeNo)
      if (!detail) {
        throw new Error("订单详情为空")
      }
      setOrderDetail(detail)

      if (detail.status === "pending") {
        const methods = await api.getPaymentMethods()
        setPaymentMethods(methods)
        setSelectedPaymentMethod(methods[0]?.id ?? "")
      } else {
        setPaymentMethods([])
        setSelectedPaymentMethod("")
      }
    } catch (error) {
      console.error("Failed to load order detail:", error)
      toast({
        title: "加载失败",
        description: getErrorMessage(error, "无法加载订单详情，请稍后再试"),
        variant: "destructive",
      })
      handleCloseDialog()
    } finally {
      setOrderDetailLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!orderDetail) return
    setPaying(true)
    try {
      const result = await api.checkoutOrder(orderDetail.trade_no!, selectedPaymentMethod)
      setCheckoutResult(result)
      
      // 如果是跳转支付，自动跳转
      if (result.type === -1 && result.data) {
        window.location.href = result.data
      }
    } catch (error) {
      console.error("Checkout failed:", error)
      toast({
        title: "支付失败",
        description: getErrorMessage(error, "发起支付失败，请重试"),
        variant: "destructive",
      })
    } finally {
      setPaying(false)
    }
  }

  const checkOrderStatus = async () => {
    if (!orderDetail) return
    setCheckingStatus(true)
    try {
      const status = await api.checkOrderStatus(orderDetail.trade_no!)
      if (status) {
        toast({
          title: "支付成功",
          description: "订单已完成支付",
        })
        handleCloseDialog()
        fetchOrders(true)
      } else {
        toast({
          title: "尚未支付",
          description: "系统尚未收到支付回调，请稍后刷新",
          variant: "secondary",
        })
      }
    } catch (error) {
      console.error("Check status failed:", error)
      toast({
        title: "查询失败",
        description: "无法查询订单状态",
        variant: "destructive",
      })
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!orderDetail) return
    setCanceling(true)
    try {
      await api.cancelOrder(orderDetail.trade_no!)
      toast({
        title: "订单已取消",
        description: "订单已成功取消",
      })
      handleCloseDialog()
      fetchOrders(true)
    } catch (error) {
      console.error("Cancel failed:", error)
      toast({
        title: "取消失败",
        description: getErrorMessage(error, "无法取消订单"),
        variant: "destructive",
      })
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <motion.div 
        className="space-y-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">我的订单</h1>
          <p className="text-muted-foreground">查看您的购买记录与账单详情</p>
        </motion.div>

        {orders.length === 0 ? (
          <motion.div variants={item} className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted/30 p-6 rounded-full mb-4">
              <Receipt className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">暂无订单</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              您还没有任何购买记录。购买订阅后，您的订单将显示在这里。
            </p>
            <Button className="mt-6" onClick={() => window.location.href = "/subscribe"}>
              前往订阅
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <motion.div 
                key={order.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="h-full overflow-hidden border-none shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer group"
                  onClick={() => openOrderDialog(order.trade_no || "")}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-background/50">
                        #{order.id}
                      </Badge>
                      {getStatusBadge(order.status)}
                    </div>
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {order.plan_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(order.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">订单金额</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(order.amount)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/5" size="sm">
                      查看详情
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={orderDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">订单详情</DialogTitle>
            <DialogDescription>
              订单号: <span className="font-mono select-all">{orderDetail?.trade_no}</span>
            </DialogDescription>
          </DialogHeader>

          {orderDetailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : orderDetail ? (
            <div className="space-y-6 py-2">
              {/* 订单状态概览 */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">订单状态</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(orderDetail.status)}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">支付金额</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(orderDetail.total_amount)}</p>
                </div>
              </div>

              {/* 商品详情 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" /> 商品信息
                </h4>
                <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{orderDetail.plan_name}</span>
                    <span className="text-sm text-muted-foreground">{orderDetail.period_label}</span>
                  </div>
                  {orderDetail.plan_detail && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        流量: {formatBandwidth(orderDetail.plan_detail.transfer_enable)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 支付方式选择 (仅待支付状态显示) */}
              {orderDetail.status === "pending" && !checkoutResult && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> 选择支付方式
                  </h4>
                  {paymentMethods.length > 0 ? (
                    <RadioGroup
                      value={selectedPaymentMethod}
                      onValueChange={setSelectedPaymentMethod}
                      className="grid grid-cols-2 gap-3"
                    >
                      {paymentMethods.map((method) => (
                        <div key={method.id}>
                          <RadioGroupItem value={method.id} id={method.id} className="peer sr-only" />
                          <Label
                            htmlFor={method.id}
                            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                          >
                            {method.icon ? (
                              <img src={method.icon} alt={method.name} className="h-6 w-6 object-contain" />
                            ) : (
                              <DollarSign className="h-6 w-6" />
                            )}
                            <span className="text-sm font-medium">{method.name}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                      暂无可用支付方式
                    </div>
                  )}
                </div>
              )}

              {/* 支付结果展示 */}
              {checkoutResult && (
                <div className="space-y-4">
                  {checkoutResult.type === 1 ? (
                    // 二维码支付
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-border shadow-sm">
                      <div className="w-48 h-48 bg-gray-100 flex items-center justify-center mb-4">
                        {/* 这里应该是一个二维码组件，暂时用文字代替 */}
                        <img src={checkoutResult.data} alt="Payment QR Code" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-sm text-gray-500">请使用{paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}扫码支付</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">正在跳转支付...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {orderDetail?.status === "pending" ? (
              <>
                <Button variant="outline" onClick={handleCancelOrder} disabled={canceling || paying} className="w-full sm:w-auto">
                  {canceling ? "取消中..." : "取消订单"}
                </Button>
                {checkoutResult ? (
                  <Button onClick={checkOrderStatus} disabled={checkingStatus} className="w-full sm:w-auto">
                    {checkingStatus ? "查询中..." : "我已支付"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCheckout} 
                    disabled={paying || !selectedPaymentMethod} 
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                  >
                    {paying ? "处理中..." : "立即支付"}
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={handleCloseDialog} className="w-full sm:w-auto">
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
