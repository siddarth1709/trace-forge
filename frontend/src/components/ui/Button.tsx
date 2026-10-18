import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils.ts'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'neon' | 'cyan' | 'secondary' | 'outline' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    // Map variants to Obsidian Studio design tokens
    const variantStyles: Record<string, string> = {
      primary:
        'bg-[#FF6B35] hover:bg-[#FF8559] active:bg-[#E55A27] text-[#0B0D0F] font-semibold border border-[#FF6B35] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_0_14px_rgba(255,107,53,0.2)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_20px_rgba(255,107,53,0.35)]',
      neon:
        'bg-[#FF6B35] hover:bg-[#FF8559] active:bg-[#E55A27] text-[#0B0D0F] font-semibold border border-[#FF6B35] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_0_14px_rgba(255,107,53,0.2)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_20px_rgba(255,107,53,0.35)]',
      cyan:
        'bg-[#191D22] hover:bg-[#22272E] text-[#60A5FA] border border-[#2A3038] hover:border-[#3B434D]',
      secondary:
        'bg-[#191D22] hover:bg-[#22272E] text-[#F5F5F5] border border-[#2A3038] hover:border-[#3B434D]',
      outline:
        'bg-transparent hover:bg-[#191D22] text-[#B0B7C3] hover:text-[#F5F5F5] border border-[#2A3038] hover:border-[#3B434D]',
      destructive:
        'bg-[#2A1417] hover:bg-[#381B20] text-[#FB7185] border border-[#FB7185]/30 hover:border-[#FB7185]/50 shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
      ghost:
        'bg-transparent hover:bg-[#191D22] text-[#B0B7C3] hover:text-[#F5F5F5]',
    }

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 min-h-[32px] rounded-md gap-1.5',
      md: 'text-sm px-4 py-2 min-h-[40px] rounded-lg gap-2',
      lg: 'text-base px-6 py-2.5 min-h-[46px] rounded-lg gap-2.5 font-medium',
      icon: 'p-2 min-w-[40px] min-h-[40px] rounded-lg',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-mono transition-all duration-180 cursor-pointer select-none active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D0F]',
          'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 disabled:shadow-none',
          variantStyles[variant] || variantStyles.primary,
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
