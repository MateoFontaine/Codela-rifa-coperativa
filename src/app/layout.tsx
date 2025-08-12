import './globals.css'
import { Toaster } from 'react-hot-toast'
import Header from '@/components/Header'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = { title: 'Rifa', description: 'MVP Rifa' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <div className="min-h-dvh">
          <Header />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
  