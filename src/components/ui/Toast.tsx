'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ToastMessage {
  id: number
  type: 'success' | 'error'
  message: string
}

interface ToastContextType {
  showToast: (type: 'success' | 'error', message: string) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast(): ToastContextType {
  return useContext(ToastContext)
}

let toastId = 0

/**
 * Toast notification provider and display.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all animate-slide-up ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
