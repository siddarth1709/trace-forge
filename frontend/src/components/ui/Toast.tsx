import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils.ts'

export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type: ToastType
}

interface ToastContextType {
  toast: (title: string, description?: string, type?: ToastType) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((title: string, description?: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, title, description, type }])
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }, [removeToast])

  const toastContext: ToastContextType = {
    toast: addToast,
    success: (title, description) => addToast(title, description, 'success'),
    error: (title, description) => addToast(title, description, 'error'),
    warning: (title, description) => addToast(title, description, 'warning'),
    info: (title, description) => addToast(title, description, 'info'),
  }

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#34D399]" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />,
    error: <AlertCircle className="w-4 h-4 text-[#FB7185]" />,
    info: <Info className="w-4 h-4 text-[#FF8559]" />,
  }

  const borders = {
    success: 'border-[#34D399]/40 bg-[#12261E]/95 shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
    warning: 'border-[#FBBF24]/40 bg-[#291F10]/95 shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
    error: 'border-[#FB7185]/40 bg-[#2A1417]/95 shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
    info: 'border-[#FF6B35]/40 bg-[#321E17]/95 shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
  }

  return (
    <ToastContext.Provider value={toastContext}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-180 font-mono',
              borders[t.type]
            )}
          >
            <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-semibold text-[#F5F5F5]">{t.title}</h5>
              {t.description && (
                <p className="text-xs text-[#B0B7C3] mt-1 font-sans break-words leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-[#858E9B] hover:text-[#F5F5F5] rounded-md transition-colors duration-180 shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
