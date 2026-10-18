import React from 'react'
import { Card } from './Card.tsx'
import { cn } from '../../lib/utils.ts'

export interface StatCardProps {
  title: string
  value: React.ReactNode
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    isPositive?: boolean
  }
  badge?: React.ReactNode
  variant?: 'accent' | 'orange' | 'emerald' | 'cyan' | 'amber' | 'red' | 'none'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  badge,
  variant = 'none',
  className,
}) => {
  return (
    <Card glow={variant} className={cn('p-5 flex flex-col justify-between bg-[#121519] border-[#2A3038]', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-mono font-medium text-[#858E9B] uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-[#191D22] border border-[#2A3038] text-[#B0B7C3]">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-bold font-mono text-[#F5F5F5] tracking-tight">
          {value}
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {(description || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-[#858E9B] font-mono">
          {description && <span className="truncate">{description}</span>}
          {trend && (
            <span
              className={cn(
                'font-medium shrink-0 ml-2',
                trend.isPositive ? 'text-[#34D399]' : 'text-[#FB7185]'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
