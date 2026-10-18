import React from 'react'
import { cn } from '../../lib/utils.ts'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'accent' | 'orange' | 'emerald' | 'cyan' | 'amber' | 'red' | 'purple' | 'slate' | 'outline'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'emerald',
  size = 'md',
  children,
  ...props
}) => {
  const variantStyles = {
    accent: 'bg-[#321E17] text-[#FF8559] border-[#FF6B35]/40',
    orange: 'bg-[#321E17] text-[#FF8559] border-[#FF6B35]/40',
    emerald: 'bg-[#12261E] text-emerald-400 border-[#34D399]/30',
    cyan: 'bg-[#132238] text-[#60A5FA] border-[#60A5FA]/30',
    amber: 'bg-[#291F10] text-[#FBBF24] border-[#FBBF24]/30',
    red: 'bg-[#2A1417] text-[#FB7185] border-[#FB7185]/30',
    purple: 'bg-[#221733] text-[#C084FC] border-[#C084FC]/30',
    slate: 'bg-[#191D22] text-[#B0B7C3] border-[#2A3038]',
    outline: 'bg-transparent text-[#B0B7C3] border-[#2A3038]',
  }

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-md',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-medium border transition-colors select-none',
        variantStyles[variant] || variantStyles.slate,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
