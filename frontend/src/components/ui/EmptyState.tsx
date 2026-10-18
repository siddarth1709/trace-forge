import React from 'react'
import { Terminal } from 'lucide-react'
import { Button } from './Button.tsx'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[#2A3038] bg-[#121519]/60">
      <div className="p-3.5 rounded-xl bg-[#191D22] border border-[#2A3038] text-[#FF8559] mb-4">
        {icon || <Terminal className="w-6 h-6" />}
      </div>
      <h4 className="text-sm font-semibold font-mono text-[#F5F5F5]">{title}</h4>
      {description && (
        <p className="text-xs text-[#858E9B] max-w-md mt-1.5 font-sans leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#22272E]/70 ${className || ''}`}
      {...props}
    />
  )
}
