import React from 'react'
import { cn } from '../../lib/utils.ts'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: string
  label?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, label, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-mono font-medium text-[#B0B7C3]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#858E9B] pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#0B0D0F] border border-[#2A3038] hover:border-[#3B434D] rounded-lg px-3 py-2 min-h-[40px] text-sm font-mono text-[#F5F5F5] placeholder:text-[#858E9B]',
              'focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF9B73]/60 transition-colors duration-180',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              icon && 'pl-9',
              error && 'border-[#FB7185] focus:border-[#FB7185] focus:ring-[#FB7185]/50',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#FB7185] font-mono mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-mono font-medium text-[#B0B7C3]">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full bg-[#0B0D0F] border border-[#2A3038] hover:border-[#3B434D] rounded-lg px-3 py-2 min-h-[40px] text-sm font-mono text-[#F5F5F5]',
            'focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF9B73]/60 transition-colors duration-180',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error && 'border-[#FB7185] focus:border-[#FB7185] focus:ring-[#FB7185]/50',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-[#FB7185] font-mono mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
