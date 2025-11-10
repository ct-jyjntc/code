"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download, Settings, HelpCircle } from "lucide-react"

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance text-foreground">使用文档</h1>
        <p className="text-muted-foreground">了解如何使用 SeeleCloud 服务</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              快速开始
            </CardTitle>
            <CardDescription>了解如何下载和配置客户端</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. 购买订阅套餐</p>
            <p>2. 下载适合您设备的客户端</p>
            <p>3. 导入订阅链接</p>
            <p>4. 选择节点并开始使用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              客户端下载
            </CardTitle>
            <CardDescription>支持多平台客户端</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Windows: Clash for Windows / V2rayN</p>
            <p>• macOS: ClashX / V2rayU</p>
            <p>• iOS: Shadowrocket / Quantumult X</p>
            <p>• Android: Clash for Android / V2rayNG</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              订阅链接
            </CardTitle>
            <CardDescription>如何获取和使用订阅链接</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>购买订阅后，在个人中心可以找到您的专属订阅链接</p>
            <p>将订阅链接复制到客户端中即可自动更新节点列表</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              常见问题
            </CardTitle>
            <CardDescription>遇到问题？查看常见问题解答</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Q: 如何更新节点列表？</p>
            <p>A: 在客户端中点击更新订阅即可</p>
            <p className="mt-2">Q: 连接失败怎么办？</p>
            <p>A: 尝试更换节点或联系客服支持</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">需要帮助？</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>如果您在使用过程中遇到任何问题，请前往「我的工单」创建支持工单，我们的客服团队将尽快为您解答。</p>
        </CardContent>
      </Card>
    </div>
  )
}
