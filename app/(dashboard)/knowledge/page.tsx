"use client"

import { useEffect, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { BookOpen, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface KnowledgeArticle {
  id: string
  title: string
  summary: string
  updated_at: string
}

interface KnowledgeGroup {
  category: string
  articles: KnowledgeArticle[]
}

export default function KnowledgePage() {
  const [groups, setGroups] = useState<KnowledgeGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<KnowledgeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const data = await api.getKnowledgeBase()
        setGroups(data)
        setFilteredGroups(data)
      } catch (error) {
        console.error("Failed to load knowledge base:", error)
        toast({
          title: "加载失败",
          description: "无法获取知识库，请稍后重试。",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchKnowledge()
  }, [toast])

  useEffect(() => {
    if (!keyword) {
      setFilteredGroups(groups)
      return
    }

    const lowerKeyword = keyword.toLowerCase()
    setFilteredGroups(
      groups
        .map((group) => ({
          ...group,
          articles: group.articles.filter(
            (article) =>
              article.title.toLowerCase().includes(lowerKeyword) ||
              article.summary.toLowerCase().includes(lowerKeyword),
          ),
        }))
        .filter((group) => group.articles.length > 0),
    )
  }, [keyword, groups])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance text-foreground">使用文档</h1>
          <p className="text-muted-foreground">常见问题、客户端配置与操作指导</p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索文章标题或内容"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="mt-2 h-5 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center text-muted-foreground">
            <BookOpen className="mb-3 h-10 w-10" />
            未找到相关文档
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group.category}>
              <CardHeader>
                <CardTitle>{group.category}</CardTitle>
                <CardDescription>共 {group.articles.length} 篇文章</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {group.articles.map((article) => (
                    <AccordionItem value={article.id} key={article.id}>
                      <AccordionTrigger className="text-left">{article.title}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm leading-6 text-muted-foreground">{article.summary}</p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          最近更新：{new Date(article.updated_at).toLocaleString("zh-CN")}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
