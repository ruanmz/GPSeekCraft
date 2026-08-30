import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { VT323 } from 'next/font/google'
import './globals.css'

const pixel = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

export const metadata: Metadata = {
  title: 'GPSeekCraft - 网页版我的世界',
  description: '基于 React Three Fiber 的浏览器体素沙盒游戏：多群系世界生成、水流动、日夜光照、合成与生存。',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  userScalable: false,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" className={`${pixel.variable} bg-background dark`}>
      <body className="antialiased overflow-hidden select-none">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
