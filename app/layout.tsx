import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Seele Cloud",
  description: "Seele Cloud 用户控制面板",
  icons: {
    icon: "/avatar-2025-11-11.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased relative">
        <div className="fixed inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('https://file.xiercloud.uk/seele.jpg')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-white/70 dark:bg-black/75" />
        </div>
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
