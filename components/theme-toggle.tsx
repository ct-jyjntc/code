"use client"

import { useEffect, useState } from "react"
import { MonitorCog, Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = mounted ? (theme === "system" ? resolvedTheme ?? "system" : theme) : "system"
  const isSystem = theme === "system"

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isSystem ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("system")}
        className="h-9 w-9"
        aria-pressed={isSystem}
        disabled={!mounted}
      >
        <MonitorCog className="h-5 w-5" />
        <span className="sr-only">系统主题</span>
      </Button>
      <Button
        variant={!isSystem && activeTheme === "light" ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("light")}
        className="h-9 w-9"
        aria-pressed={!isSystem && activeTheme === "light"}
        disabled={!mounted}
      >
        <Sun className="h-5 w-5" />
        <span className="sr-only">亮色主题</span>
      </Button>
      <Button
        variant={!isSystem && activeTheme === "dark" ? "default" : "outline"}
        size="icon"
        onClick={() => setTheme("dark")}
        className="h-9 w-9"
        aria-pressed={!isSystem && activeTheme === "dark"}
        disabled={!mounted}
      >
        <Moon className="h-5 w-5" />
        <span className="sr-only">暗色主题</span>
      </Button>
    </div>
  )
}
