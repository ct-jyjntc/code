import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

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
      <body className={`${inter.className} antialiased relative`}>
        <div className="fixed inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('https://file.xiercloud.uk/seele.jpg')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "scroll",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-white/80 dark:bg-black/80" />
        </div>
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
