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
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { getErrorMessage } from "@/lib/errors"

interface KnowledgeArticle {
  id: string
  title: string
  summary?: string
  body?: string
  updated_at?: string | number
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

  const formatUpdatedAt = (value?: string | number) => {
    if (value === undefined || value === null) return "--"

    let timestamp = Number(value)
    if (!Number.isFinite(timestamp)) {
      const parsed = Date.parse(String(value))
      if (Number.isNaN(parsed)) return "--"
      timestamp = parsed
    } else if (timestamp < 1e12) {
      timestamp *= 1000
    }

    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("zh-CN")
  }

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
          description: getErrorMessage(error, "无法获取知识库，请稍后重试。"),
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
          articles: group.articles.filter((article) => {
            const titleMatch = article.title.toLowerCase().includes(lowerKeyword)
            const summaryMatch = article.summary?.toLowerCase().includes(lowerKeyword) ?? false
            const bodyMatch = article.body?.toLowerCase().includes(lowerKeyword) ?? false
            return titleMatch || summaryMatch || bodyMatch
          }),
        }))
        .filter((group) => group.articles.length > 0),
    )
  }, [keyword, groups])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
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
                        {article.summary && (
                          <p className="text-sm leading-6 text-muted-foreground">{article.summary}</p>
                        )}
                        {article.body && (
                          <div className="prose prose-sm mt-3 max-w-none text-muted-foreground dark:prose-invert">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                a: ({ node, ...props }) => (
                                  <a
                                    {...props}
                                    className="text-primary underline decoration-dashed hover:decoration-solid"
                                    target="_blank"
                                    rel="noreferrer"
                                  />
                                ),
                                table: ({ node, ...props }) => (
                                  <div className="my-4 overflow-x-auto rounded-lg border">
                                    <table {...props} className="w-full text-sm" />
                                  </div>
                                ),
                                code: ({ node, inline, className, children, ...props }) =>
                                  inline ? (
                                    <code
                                      {...props}
                                      className={`rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground ${className ?? ""}`}
                                    >
                                      {children}
                                    </code>
                                  ) : (
                                    <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                                      <code {...props} className={className}>
                                        {children}
                                      </code>
                                    </pre>
                                  ),
                                pre: ({ node, children, ...props }) => (
                                  <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs" {...props}>
                                    {children}
                                  </pre>
                                ),
                                ul: ({ node, ...props }) => <ul {...props} className="my-2 list-disc pl-6" />,
                                ol: ({ node, ...props }) => <ol {...props} className="my-2 list-decimal pl-6" />,
                                li: ({ node, ...props }) => <li {...props} className="leading-6" />,
                                blockquote: ({ node, ...props }) => (
                                  <blockquote {...props} className="border-l-4 border-primary/50 bg-muted/40 p-3 text-sm italic" />
                                ),
                                img: ({ node, ...props }) => (
                                  <img {...props} className="my-4 max-w-full rounded-lg border" loading="lazy" />
                                ),
                                details: ({ node, ...props }) => (
                                  <details {...props} className="rounded-lg border border-dashed bg-muted/40 px-4 py-2 text-sm" />
                                ),
                                summary: ({ node, ...props }) => (
                                  <summary {...props} className="cursor-pointer text-sm font-semibold text-foreground" />
                                ),
                                hr: () => <hr className="my-6 border-dashed border-primary/30" />,
                              }}
                            >
                              {article.body}
                            </ReactMarkdown>
                          </div>
                        )}
                        <p className="mt-3 text-xs text-muted-foreground">
                          最近更新：{formatUpdatedAt(article.updated_at)}
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
