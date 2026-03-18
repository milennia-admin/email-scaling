import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Milennia Email Dashboard',
  description: 'Internal email marketing analytics for Milennia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
