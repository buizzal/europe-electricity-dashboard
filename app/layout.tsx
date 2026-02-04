import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'European Electricity Dashboard',
  description: 'Interactive dashboard for European electricity prices, emissions, and flexibility value analysis',
  keywords: ['electricity', 'europe', 'energy', 'carbon', 'emissions', 'flexibility', 'dashboard'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
