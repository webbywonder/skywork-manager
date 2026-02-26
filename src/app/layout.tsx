import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'SkyWork Manager',
  description: 'Workspace management system for SkyWork Borivali',
}

/**
 * Root layout with sidebar navigation and main content area.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ToastProvider>
          <Sidebar />
          <main className="lg:ml-64 min-h-screen p-6 pt-16 lg:pt-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}
