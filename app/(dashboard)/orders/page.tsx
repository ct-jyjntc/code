"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ShoppingCart, Calendar, DollarSign, Package, CreditCard, RefreshCw, CheckCircle } from "lucide-react"
import { getErrorMessage } from "@/lib/errors"

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
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "待支付" },
      processing: { variant: "secondary", label: "开通中" },
      completed: { variant: "default", label: "已完成" },
      cancelled: { variant: "outline", label: "已取消" },
    }

    const statusInfo = statusMap[status] || { variant: "outline", label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
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
    if (!selectedPaymentMethod) {
      toast({
        title: "请选择支付方式",
        variant: "destructive",
      })
      return
    }
    setPaying(true)
    setCheckoutResult(null)
    try {
      const result = await api.checkoutOrder(orderDetail.trade_no ?? orderDetail.id, selectedPaymentMethod)
      if (result.type === -1) {
        toast({
          title: "支付完成",
          description: "订单已支付成功",
        })
        handleCloseDialog()
        fetchOrders(true)
        return
      }
      if (result.type === 1 && typeof result.data === "string") {
        if (typeof window !== "undefined") {
          window.open(result.data, "_blank", "noopener")
        }
        toast({
          title: "已打开支付页面",
          description: "请在新窗口完成支付",
        })
      }
      setCheckoutResult(result)
    } catch (error) {
      console.error("Checkout failed:", error)
      toast({
        title: "拉起支付失败",
        description: getErrorMessage(error, "请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setPaying(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!orderDetail) return
    setCheckingStatus(true)
    try {
      const result = await api.checkOrderStatus(orderDetail.trade_no ?? orderDetail.id)
      if (result.status !== "pending") {
        toast({
          title: "订单状态已更新",
          description: `当前状态：${result.status === "completed" ? "已完成" : "已取消"}`,
        })
        handleCloseDialog()
        fetchOrders(true)
      } else {
        toast({
          title: "仍在等待支付",
          description: "请完成支付后再尝试刷新状态",
        })
      }
    } catch (error) {
      console.error("Check status failed:", error)
      toast({
        title: "查询失败",
        description: getErrorMessage(error, "无法获取订单状态，请稍后重试"),
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
      await api.cancelOrder(orderDetail.trade_no ?? orderDetail.id)
      toast({
        title: "已取消订单",
        description: "订单已成功取消",
      })
      handleCloseDialog()
      fetchOrders(true)
    } catch (error) {
      console.error("Cancel order failed:", error)
      toast({
        title: "取消失败",
        description: getErrorMessage(error, "无法取消该订单，请稍后重试"),
        variant: "destructive",
      })
    } finally {
      setCanceling(false)
    }
  }

  const paymentDescription = useMemo(() => {
    if (!orderDetail) return null
    if (!orderDetail.payable_amount) return null
    const fee = (orderDetail.handling_amount ?? 0) > 0 ? `（含手续费 ¥${(orderDetail.handling_amount ?? 0).toFixed(2)}）` : ""
    return `本次需支付 ${formatCurrency(orderDetail.payable_amount)}${fee}`
  }, [orderDetail])

  const renderCheckoutResult = () => {
    if (!checkoutResult) return null
    if (checkoutResult.type === 0 && typeof checkoutResult.data === "string") {
      return (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">请使用支付 App 扫描下方二维码完成支付</p>
          <div className="mt-3 flex justify-center">
            <img src={checkoutResult.data} alt="支付二维码" className="h-48 w-48 rounded-md border bg-white p-2" />
          </div>
          <Button
            variant="link"
            className="mt-2 text-sm"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open(checkoutResult.data, "_blank", "noopener")
              }
            }}
          >
            无法扫码？点此打开链接
          </Button>
        </div>
      )
    }

    const dataString =
      typeof checkoutResult.data === "string" ? checkoutResult.data : JSON.stringify(checkoutResult.data, null, 2)

    return (
      <div className="rounded-lg border border-dashed p-4 text-sm">
        <p className="mb-2 font-medium">支付信息</p>
        <p className="break-all text-muted-foreground">{dataString}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">我的订单</h1>
          <p className="text-muted-foreground">查看您的购买记录</p>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance text-foreground">我的订单</h1>
          <p className="text-muted-foreground">查看您的购买记录并完成支付</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center bg-muted">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">暂无订单</p>
                <p className="text-sm text-muted-foreground">您还没有任何订单记录</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {order.plan_name}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.created_at).toLocaleDateString("zh-CN")}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(order.amount)}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">订单编号</p>
                      <p className="font-mono font-medium">{order.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">创建时间</p>
                      <p className="font-medium">{formatDateTime(order.created_at)}</p>
                    </div>
                    {order.paid_at && (
                      <div>
                        <p className="text-muted-foreground">支付时间</p>
                        <p className="font-medium">{formatDateTime(order.paid_at)}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" onClick={() => openOrderDialog(order.id)}>
                      查看详情
                    </Button>
                    {order.status === "pending" && (
                      <Button size="sm" onClick={() => openOrderDialog(order.id)}>
                        去支付
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={orderDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[min(90vh,800px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
            <DialogDescription>订单编号：{orderDetail?.trade_no ?? orderDetail?.id ?? "--"}</DialogDescription>
          </DialogHeader>

          {orderDetailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : orderDetail ? (
            <div className="space-y-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">订单状态</p>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(orderDetail.status)}
                    {orderDetail.period_label && <span className="text-xs text-muted-foreground">{orderDetail.period_label}</span>}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">应付金额</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(orderDetail.payable_amount ?? orderDetail.amount)}
                  </p>
                  {paymentDescription && <p className="text-xs text-muted-foreground">{paymentDescription}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">创建时间</p>
                  <p className="font-medium">{formatDateTime(orderDetail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">支付时间</p>
                  <p className="font-medium">{formatDateTime(orderDetail.paid_at)}</p>
                </div>
              </div>

              {orderDetail.plan_detail && (
                <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
                  <div className="font-medium">{orderDetail.plan_detail.name}</div>
                  {orderDetail.plan_detail.content && (
                    <div
                      className="prose prose-sm max-w-none rounded-md bg-background/80 p-3 text-muted-foreground shadow-inner [&_*]:text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: orderDetail.plan_detail.content }}
                    />
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      流量：<strong className="font-semibold">{formatBandwidth(orderDetail.plan_detail.transfer_enable)}</strong>
                    </span>
                    <span>
                      限速：
                      <strong className="font-semibold">
                        {orderDetail.plan_detail.speed_limit ? `${orderDetail.plan_detail.speed_limit} Mbps` : "不限速"}
                      </strong>
                    </span>
                    <span>
                      设备数：
                      <strong className="font-semibold">
                        {orderDetail.plan_detail.device_limit ? orderDetail.plan_detail.device_limit : "不限"}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {orderDetail.status === "pending" && (
                <div className="space-y-4 rounded-lg border border-dashed p-4">
                  <div>
                    <Label className="text-sm font-semibold">支付方式</Label>
                    {paymentMethods.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">暂无可用支付方式，请联系管理员</p>
                    ) : (
                      <RadioGroup
                        className="mt-3 space-y-2"
                        value={selectedPaymentMethod}
                        onValueChange={(value) => {
                          setSelectedPaymentMethod(value)
                          setCheckoutResult(null)
                        }}
                      >
                        {paymentMethods.map((method) => (
                          <Label
                            key={method.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/40"
                          >
                            <RadioGroupItem value={method.id} />
                            <div>
                              <p className="font-medium">{method.name}</p>
                              <p className="text-xs text-muted-foreground">{method.payment}</p>
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleCheckout} disabled={!selectedPaymentMethod || paying}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {paying ? "拉起支付中..." : "确认支付"}
                    </Button>
                    <Button variant="outline" onClick={handleCheckStatus} disabled={checkingStatus}>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden={!checkingStatus} />
                      刷新状态
                    </Button>
                    <Button variant="ghost" onClick={handleCancelOrder} disabled={canceling}>
                      取消订单
                    </Button>
                  </div>

                  {renderCheckoutResult()}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">无法加载订单详情</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              关闭
            </Button>
            {orderDetail?.status === "completed" && (
              <Button
                onClick={() => {
                  handleCloseDialog()
                  fetchOrders(true)
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                已完成
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
