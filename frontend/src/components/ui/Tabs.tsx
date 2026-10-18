import React from 'react'
import { cn } from '../../lib/utils.ts'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1 border-b border-[#2A3038] overflow-x-auto no-scrollbar', className)}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 min-h-[40px] text-xs font-mono font-medium border-b-2 transition-all duration-180 whitespace-nowrap cursor-pointer -mb-px',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D0F]',
              isActive
                ? 'border-[#FF6B35] text-[#FF8559] bg-[#321E17]/40'
                : 'border-transparent text-[#858E9B] hover:text-[#F5F5F5] hover:border-[#3B434D] hover:bg-[#191D22]/40'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono',
                  isActive ? 'bg-[#321E17] text-[#FF8559] border border-[#FF6B35]/30' : 'bg-[#191D22] text-[#858E9B] border border-[#2A3038]'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
