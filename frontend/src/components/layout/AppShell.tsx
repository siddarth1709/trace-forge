import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.tsx'
import { TopNav } from './TopNav.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { DISCLAIMERS } from '../../lib/constants.ts'
import { ShieldCheck } from 'lucide-react'

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#321E17] selection:text-[#FF8559]">
      {/* Sidebar (Desktop 256px / Responsive Drawer) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Column */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <TopNav
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* Global safety status banner - Obsidian charcoal */}
        <div className="bg-[#121519] border-b border-[#2A3038] px-4 sm:px-6 py-2 flex items-center justify-between text-[11px] font-mono text-[#B0B7C3]">
          <div className="flex items-center gap-2.5 truncate">
            <span className="w-2 h-2 rounded-full bg-[#34D399] shrink-0" />
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
            <span className="truncate">{DISCLAIMERS.SANDBOX_ONLY}</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#191D22] border border-[#2A3038] text-[10px] text-[#FF8559] shrink-0 font-medium tracking-wide">
            READ-ONLY PROD
          </span>
        </div>

        {/* Main Content Area: 24-32px padding */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
