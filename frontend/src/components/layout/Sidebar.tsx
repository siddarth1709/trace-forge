import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  SearchCheck,
  ShieldAlert,
  Target,
  TrendingUp,
  FileCheck,
  FolderArchive,
  History,
  Settings,
  Shield,
  Activity,
  Cable,
  Sparkles,
  X,
} from 'lucide-react'
import { NAVIGATION_ITEMS } from '../../lib/constants.ts'
import { useBackendHealth } from '../../hooks/useBackendHealth.ts'
import { cn } from '../../lib/utils.ts'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isOnline, health } = useBackendHealth()

  const iconMap: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
    Sparkles: <Sparkles className="w-4 h-4 text-[#FF8559]" />,
    Network: <Network className="w-4 h-4" />,
    SearchCheck: <SearchCheck className="w-4 h-4" />,
    ShieldAlert: <ShieldAlert className="w-4 h-4" />,
    Target: <Target className="w-4 h-4" />,
    TrendingUp: <TrendingUp className="w-4 h-4" />,
    FileCheck: <FileCheck className="w-4 h-4" />,
    Cable: <Cable className="w-4 h-4" />,
    FolderArchive: <FolderArchive className="w-4 h-4" />,
    History: <History className="w-4 h-4" />,
    Settings: <Settings className="w-4 h-4" />,
    Shield: <Shield className="w-4 h-4" />,
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0B0D0F]/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#121519] border-r border-[#2A3038] flex flex-col transition-transform duration-240 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-[#2A3038] flex items-center justify-between shrink-0 bg-[#121519]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.25)] border border-[#2A3038] bg-[#0B0D0F] shrink-0">
              <img src="/logo.png" alt="TRACEFORGE Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-sm text-[#F5F5F5] tracking-wider">
                  TRACEFORGE
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#191D22] text-[#B0B7C3] border border-[#2A3038]">
                  v2.4
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#858E9B] block leading-tight">
                Graph Cyber Defense
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#858E9B] hover:text-[#F5F5F5] hover:bg-[#191D22] lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Track 01 Hackathon Context Banner */}
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-[#0B0D0F] border border-[#2A3038] font-mono text-[11px] flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-1.5 text-[#34D399]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            <span className="font-bold text-[10px]">Track 01</span>
          </div>
          <span className="text-[10px] text-[#858E9B]">Connected Data Agent</span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase text-[#858E9B] tracking-wider">
            Platform Modules
          </div>

          {NAVIGATION_ITEMS.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono font-medium transition-all duration-180 group',
                  isActive
                    ? 'bg-[#321E17]/70 text-[#FF8559] border border-[#FF6B35]/35 shadow-[0_0_12px_rgba(255,107,53,0.12)]'
                    : 'text-[#858E9B] hover:text-[#F5F5F5] hover:bg-[#191D22] border border-transparent'
                )
              }
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0">{iconMap[item.icon] || <Shield className="w-4 h-4" />}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#321E17] text-[#FF8559] border border-[#FF6B35]/30 font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Backend health status footer */}
        <div className="p-4 border-t border-[#2A3038] bg-[#0B0D0F]">
          <div className="p-3 rounded-xl bg-[#121519] border border-[#2A3038] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span
                  className={cn(
                    'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                    isOnline ? 'bg-[#34D399]' : 'bg-[#FB7185]'
                  )}
                />
                <span
                  className={cn(
                    'relative inline-flex rounded-full h-2 w-2',
                    isOnline ? 'bg-[#34D399]' : 'bg-[#FB7185]'
                  )}
                />
              </span>
              <div>
                <div className="text-[11px] font-mono font-medium text-[#F5F5F5] flex items-center gap-1">
                  <span>Backend</span>
                  <span className={isOnline ? 'text-[#34D399]' : 'text-[#FB7185]'}>
                    {isOnline ? 'Connected' : 'Offline'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#858E9B]">
                  {health ? `Graph: ${health.graph}` : 'Reconnecting...'}
                </div>
              </div>
            </div>

            <Activity
              className={cn(
                'w-4 h-4',
                isOnline ? 'text-[#34D399]' : 'text-[#FB7185]'
              )}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
