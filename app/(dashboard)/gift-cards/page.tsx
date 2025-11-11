"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Gift, History, Ticket, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface GiftCardCheckResult {
  code_info?: {
    template_name?: string
    expire_at?: string
    remaining?: number
  }
  reward_preview?: {
    traffic?: string
    balance?: string
    bonus_days?: number
  }
  can_redeem?: boolean
  reason?: string | null
}

interface GiftCardHistoryItem {
  id: string
  template_name: string
  template_type_name: string
  rewards_given: string
  created_at: string
}

export default function GiftCardsPage() {
  const [code, setCode] = useState("")
  const [checking, setChecking] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [checkResult, setCheckResult] = useState<GiftCardCheckResult | null>(null)
  const [history, setHistory] = useState<GiftCardHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getGiftCardHistory()
        setHistory(data.data || [])
      } catch (error) {
        console.error("Failed to fetch gift card history:", error)
        toast({
          title: "加载失败",
          description: "无法获取兑换记录，请稍后重试。",
          variant: "destructive",
        })
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [toast])

  const handleCheck = async () => {
    if (!code.trim()) {
      toast({
        title: "请输入兑换码",
        variant: "destructive",
      })
      return
    }
    setChecking(true)
    try {
      const data = await api.checkGiftCard(code.trim())
      setCheckResult(data)
      toast({ title: "查询成功", description: "已获取兑换码信息" })
    } catch (error) {
      console.error("Failed to check gift card:", error)
      toast({
        title: "查询失败",
        description: "无法查询兑换码，请稍后重试。",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast({
        title: "请输入兑换码",
        variant: "destructive",
      })
      return
    }
    setRedeeming(true)
    try {
      const trimmed = code.trim()
      const data = await api.redeemGiftCard(trimmed)
      toast({ title: "兑换成功", description: data.message })
      setCheckResult(null)
      setCode("")
      const historyData = await api.getGiftCardHistory()
      setHistory(historyData.data || [])
    } catch (error) {
      console.error("Failed to redeem gift card:", error)
      toast({
        title: "兑换失败",
        description: "请确认兑换码有效或稍后再试。",
        variant: "destructive",
      })
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">礼品卡中心</h1>
        <p className="text-muted-foreground">输入兑换码获取额外流量、余额或订阅天数</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              兑换礼品卡
            </CardTitle>
            <CardDescription>兑换码区分大小写，请准确输入</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="输入礼品卡兑换码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="w-full" variant="secondary" onClick={handleCheck} disabled={checking}>
                {checking ? "查询中..." : "查询兑换信息"}
              </Button>
              <Button
                className="w-full"
                onClick={handleRedeem}
                disabled={redeeming || !checkResult?.can_redeem}
              >
                {redeeming ? "兑换中..." : "立即兑换"}
              </Button>
            </div>
            {checkResult && (
              <div className="space-y-4 rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{checkResult.code_info?.template_name || "未知礼包"}</p>
                    {checkResult.code_info?.expire_at && (
                      <p className="text-xs text-muted-foreground">
                        有效期至：{new Date(checkResult.code_info.expire_at).toLocaleString("zh-CN")}
                      </p>
                    )}
                    {checkResult.code_info?.remaining !== undefined && (
                      <p className="text-xs text-muted-foreground">剩余数量：{checkResult.code_info.remaining}</p>
                    )}
                  </div>
                  <Badge variant={checkResult.can_redeem === false ? "destructive" : "default"}>
                    {checkResult.can_redeem === false ? "不可兑换" : "可兑换"}
                  </Badge>
                </div>

                {checkResult.reward_preview && (
                  <div className="rounded-md bg-background/70 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">奖励预览</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {checkResult.reward_preview.traffic && <li>流量奖励：{checkResult.reward_preview.traffic}</li>}
                      {checkResult.reward_preview.balance && <li>余额奖励：{checkResult.reward_preview.balance}</li>}
                      {checkResult.reward_preview.bonus_days && (
                        <li>额外天数：{checkResult.reward_preview.bonus_days} 天</li>
                      )}
                    </ul>
                  </div>
                )}

                {checkResult.can_redeem === false && (
                  <Alert variant="destructive">
                    <AlertTitle>当前不可兑换</AlertTitle>
                    <AlertDescription>{checkResult.reason || "请确认兑换码状态或联系管理员"}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCheckResult(null)}>
                    清除结果
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => code && navigator.clipboard.writeText(code.trim())}
                  >
                    复制兑换码
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              使用说明
            </CardTitle>
            <CardDescription>常见问题提示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>· 礼品卡通常由客服或活动发放，每个兑换码仅可使用一次。</p>
            <p>· 若提示不可用，请检查是否过期、使用次数已满或您不符合领取条件。</p>
            <p>· 兑换成功后奖励会即时发放，可在订单或账户余额中查看。</p>
            <p>· 如需发起佣金提现申请，请前往工单中心并选择“提现申请”模板。</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            兑换记录
          </CardTitle>
          <CardDescription>最近的礼品卡使用情况</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center text-muted-foreground">
              <Ticket className="mb-3 h-10 w-10" />
              暂无兑换记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>礼包名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>奖励</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.created_at).toLocaleString("zh-CN")}</TableCell>
                      <TableCell>{item.template_name}</TableCell>
                      <TableCell>{item.template_type_name}</TableCell>
                      <TableCell>{item.rewards_given}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
