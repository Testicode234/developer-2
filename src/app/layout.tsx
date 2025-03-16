import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { Providers } from '../components/providers'
import { Navbar } from '../components/navbar'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Suspense fallback={<p>Loading Navbar...</p>}>
            <Navbar />
          </Suspense>
          <main className="min-h-screen bg-background">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
