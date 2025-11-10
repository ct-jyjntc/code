"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart, Calendar, DollarSign, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  plan_name: string
  amount: number
  status: string
  created_at: string
  paid_at?: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.getOrders()
        setOrders(data)
      } catch (error) {
        console.error("[v0] Failed to fetch orders:", error)
        toast({
          title: "加载失败",
          description: "无法加载订单信息，请稍后重试",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [toast])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "待支付" },
      paid: { variant: "default", label: "已支付" },
      cancelled: { variant: "destructive", label: "已取消" },
      expired: { variant: "outline", label: "已过期" },
    }

    const statusInfo = statusMap[status] || { variant: "outline", label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">我的订单</h1>
        <p className="text-muted-foreground">查看您的购买记录</p>
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
                        <DollarSign className="h-4 w-4" />¥{order.amount.toFixed(2)}
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
                    <p className="font-medium">{new Date(order.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                  {order.paid_at && (
                    <div>
                      <p className="text-muted-foreground">支付时间</p>
                      <p className="font-medium">{new Date(order.paid_at).toLocaleString("zh-CN")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
