import React from 'react'
import { cn } from '../../lib/utils.ts'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'accent' | 'orange' | 'emerald' | 'cyan' | 'amber' | 'red' | 'purple' | 'none'
  surface?: 'primary' | 'secondary' | 'elevated'
}

export const Card: React.FC<CardProps> = ({
  className,
  glow = 'none',
  surface = 'primary',
  children,
  ...props
}) => {
  const surfaceStyles = {
    primary: 'bg-[#121519]',
    secondary: 'bg-[#191D22]',
    elevated: 'bg-[#22272E]',
  }

  const glowStyles = {
    none: 'border-[#2A3038] hover:border-[#3B434D]',
    accent: 'border-[#FF6B35]/35 shadow-[0_0_20px_rgba(255,107,53,0.08)] hover:border-[#FF6B35]/60',
    orange: 'border-[#FF6B35]/35 shadow-[0_0_20px_rgba(255,107,53,0.08)] hover:border-[#FF6B35]/60',
    emerald: 'border-[#34D399]/30 shadow-[0_0_20px_rgba(52,211,153,0.06)] hover:border-[#34D399]/50',
    cyan: 'border-[#60A5FA]/30 shadow-[0_0_20px_rgba(96,165,250,0.06)] hover:border-[#60A5FA]/50',
    amber: 'border-[#FBBF24]/30 shadow-[0_0_20px_rgba(251,191,36,0.06)] hover:border-[#FBBF24]/50',
    red: 'border-[#FB7185]/30 shadow-[0_0_20px_rgba(251,113,133,0.06)] hover:border-[#FB7185]/50',
    purple: 'border-[#C084FC]/30 shadow-[0_0_20px_rgba(192,132,252,0.06)] hover:border-[#C084FC]/50',
  }

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all duration-180',
        surfaceStyles[surface],
        glowStyles[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'px-5 py-4 border-b border-[#2A3038] flex items-center justify-between gap-4',
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={cn(
      'text-sm font-semibold font-mono tracking-wide text-[#F5F5F5] flex items-center gap-2',
      className
    )}
    {...props}
  >
    {children}
  </h3>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs text-[#858E9B] font-sans mt-0.5 leading-relaxed', className)} {...props}>
    {children}
  </p>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'px-5 py-3 bg-[#0B0D0F]/60 border-t border-[#2A3038] flex items-center justify-between text-xs text-[#B0B7C3] font-mono',
      className
    )}
    {...props}
  >
    {children}
  </div>
)
