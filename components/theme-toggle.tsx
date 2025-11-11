"use client"

"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="default" size="icon" className="h-9 w-9" disabled />
        <Button variant="outline" size="icon" className="h-9 w-9" disabled />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("light")}
        className="h-9 w-9"
        aria-pressed={theme === "light"}
      >
        <Sun className="h-5 w-5" />
        <span className="sr-only">亮色主题</span>
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("dark")}
        className="h-9 w-9"
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-5 w-5" />
        <span className="sr-only">暗色主题</span>
      </Button>
    </div>
  )
}
