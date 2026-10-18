import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils.ts'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-[#0B0D0F]/85 backdrop-blur-sm transition-opacity duration-180"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Box */}
        <div
          className={cn(
            'relative w-full my-6 bg-[#121519] border border-[#2A3038] rounded-2xl shadow-2xl shadow-black/95 z-10 text-left overflow-hidden flex flex-col max-h-[88vh] transform transition-all duration-240',
            maxWidthStyles[maxWidth]
          )}
        >
          {/* Always Pinned Header */}
          <div className="px-6 py-4.5 border-b border-[#2A3038] bg-[#191D22] flex items-center justify-between shrink-0">
            <div>
              {title && (
                <h2 className="text-base font-semibold font-mono text-[#F5F5F5] flex items-center gap-2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-[#858E9B] mt-1 font-sans leading-relaxed">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#858E9B] hover:text-[#F5F5F5] hover:bg-[#22272E] transition-colors duration-180 cursor-pointer shrink-0 ml-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="p-6 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  subtitle?: string
  children: React.ReactNode
  width?: 'md' | 'lg' | 'xl'
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const widthStyles = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-[#0B0D0F]/80 backdrop-blur-sm transition-opacity duration-180"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full bg-[#121519] border-l border-[#2A3038] shadow-2xl h-full flex flex-col z-10 transform transition-all duration-240',
          widthStyles[width]
        )}
      >
        <div className="px-6 py-4.5 border-b border-[#2A3038] flex items-center justify-between bg-[#191D22] shrink-0">
          <div>
            {title && (
              <h2 className="text-sm font-semibold font-mono text-[#F5F5F5] flex items-center gap-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-[#858E9B] mt-0.5 font-mono">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#858E9B] hover:text-[#F5F5F5] hover:bg-[#22272E] transition-colors duration-180 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}
