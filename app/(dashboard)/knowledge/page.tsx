
"use client"

import { useEffect, useState } from "react"
import { Book, Search, FileText, AlertCircle, ChevronRight, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { KnowledgeGroup, KnowledgeArticle } from "@/types/config"

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

export default function KnowledgePage() {
  const [groups, setGroups] = useState<KnowledgeGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<KnowledgeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getKnowledgeBase()
        console.log("[Knowledge] Fetched data:", data)
        
        // Robust data handling
        let safeData: KnowledgeGroup[] = []
        
        if (Array.isArray(data)) {
          safeData = data
        } else if (data && typeof data === 'object') {
          // Try to recover if it's an object but not an array (though api.ts should handle this)
          safeData = Object.entries(data).map(([key, value]) => ({
            category: key,
            articles: Array.isArray(value) ? value : []
          })) as unknown as KnowledgeGroup[]
        }

        // Filter out empty groups if necessary, or keep them to show empty state
        // safeData = safeData.filter(g => g.articles && g.articles.length > 0)

        setGroups(safeData)
        setFilteredGroups(safeData)
      } catch (err) {
        console.error("[Knowledge] Failed to fetch knowledge base:", err)
        setError("无法加载文档内容，请稍后重试。")
      } finally {
        setLoading(false)
      }
    }

    fetchKnowledge()
  }, [])

  useEffect(() => {
    if (!keyword.trim()) {
      setFilteredGroups(groups)
      return
    }

    const lowerKeyword = keyword.toLowerCase()
    const filtered = groups
      .map((group) => ({
        ...group,
        articles: group.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(lowerKeyword) ||
            (article.body || article.content || "").toLowerCase().includes(lowerKeyword)
        ),
      }))
      .filter((group) => group.articles.length > 0)

    setFilteredGroups(filtered)
  }, [keyword, groups])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">实用文档</h1>
        <p className="text-muted-foreground">查阅常见问题解答和使用教程。</p>
      </motion.div>

      <motion.div variants={item} className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="搜索文档..."
          className="pl-9 bg-background/50 backdrop-blur-sm"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </motion.div>

      {error && (
        <motion.div variants={item}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {!loading && !error && filteredGroups.length === 0 && (
        <motion.div variants={item}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Book className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">未找到相关文档</p>
              <p className="text-sm text-muted-foreground">
                {keyword ? "换个关键词试试？" : "文档暂时为空。"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {filteredGroups.map((group, groupIndex) => (
          <motion.div 
            key={group.category || "uncategorized"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05 }}
          >
            <Card className="h-full border-none shadow-md bg-card hover:shadow-lg transition-all flex flex-col relative overflow-hidden group/card">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity pointer-events-none">
                <Book className="w-24 h-24" />
              </div>
              <CardHeader className="relative z-10">
                <CardTitle className="text-lg">
                  {group.category || "未分类"}
                </CardTitle>
                <CardDescription>共 {group.articles?.length || 0} 篇文章</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 relative z-10">
                <div className="space-y-1">
                  {group.articles?.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group/item text-left"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-colors">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium truncate text-foreground/80 group-hover/item:text-foreground transition-colors">
                          {article.title}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover/item:text-foreground/50 transition-colors" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0 gap-0 border-none shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2 text-muted-foreground mb-2 text-xs">
              <Book className="h-3 w-3" />
              <span>实用文档</span>
              <span>/</span>
              <span>{groups.find(g => g.articles.some(a => a.id === selectedArticle?.id))?.category || "文档"}</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-primary">
              {selectedArticle?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1 prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({node, ...props}) => <a className="text-primary hover:underline decoration-dashed underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
                  img: ({node, ...props}) => <img className="rounded-lg border border-border/50 shadow-sm my-4" {...props} />,
                  table: ({node, ...props}) => <div className="overflow-x-auto my-4 rounded-lg border border-border/50"><table className="w-full" {...props} /></div>,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/50 bg-muted/30 pl-4 py-1 rounded-r-lg italic" {...props} />,
                }}
              >
                {selectedArticle?.body || selectedArticle?.content || "暂无内容"}
              </ReactMarkdown>
            </div>
            <div className="h-10" /> {/* Bottom spacer */}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
