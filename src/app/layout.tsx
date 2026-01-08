import './globals.css'
import { Toaster } from 'react-hot-toast'
import Header from '@/components/Header'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rifa Cooperativa - Camiseta Argentina firmada por Messi 🇦🇷',
  description: '¡Participá por una camiseta oficial de la Selección Argentina firmada por los Campeones del Mundo 2022! Incluye firma de Messi. Sorteo por Lotería Nacional en Navidad.',
  openGraph: {
    title: 'Rifa Cooperativa - Camiseta Argentina firmada por Messi',
    description: '¡Participá por una camiseta oficial del Seleccionado Argentino firmada por los Campeones del Mundo 2022! Sorteo en Navidad 🏆⚽',
    images: [
      {
        url: 'https://codela-rifa-coperativa.vercel.app/CamisetaFirmada.png', // 👈 CAMBIÁ por tu dominio real cuando subas a producción
        width: 1200,
        height: 630,
        alt: 'Camiseta Argentina firmada por los jugadores',
      }
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rifa Cooperativa - Camiseta Argentina firmada por Messi',
    description: '¡Participá por la camiseta oficial firmada por los Campeones del Mundo!',
    images: ['https://codela-rifa-coperativa.vercel.app/CamisetaFirmada.png'], // 👈 CAMBIÁ por tu dominio real
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <div className="min-h-dvh">
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}