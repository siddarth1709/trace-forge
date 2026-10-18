import React, { useState } from 'react'
import {
  Menu,
  Search,
  Bell,
  Cpu,
  ChevronDown,
  Layers,
  LogOut,
  AlertTriangle,
  Play,
  Shield,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.tsx'
import { useWorkspace } from '../../hooks/useWorkspace.tsx'
import { useBackendHealth } from '../../hooks/useBackendHealth.ts'
import { Badge } from '../ui/Badge.tsx'
import { GuidedInvestigationRunner } from '../investigation/GuidedInvestigationRunner.tsx'

interface TopNavProps {
  onOpenSidebar: () => void
  onOpenCommandPalette: () => void
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenSidebar,
  onOpenCommandPalette,
}) => {
  const navigate = useNavigate()
  const { user, logout, updateRole } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace()
  const { mode } = useBackendHealth()

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [guidedDemoOpen, setGuidedDemoOpen] = useState(false)

  return (
    <header className="h-16 bg-[#121519]/90 backdrop-blur-md border-b border-[#2A3038] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-[#858E9B] hover:text-[#F5F5F5] hover:bg-[#191D22] lg:hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Workspace selector */}
        <div className="relative">
          <button
            onClick={() => {
              setWorkspaceMenuOpen(!workspaceMenuOpen)
              setUserMenuOpen(false)
              setNotificationsOpen(false)
            }}
            className="flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#191D22] border border-[#2A3038] hover:border-[#3B434D] text-xs font-mono text-[#F5F5F5] transition-colors duration-180 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
          >
            <Layers className="w-3.5 h-3.5 text-[#FF8559]" />
            <span className="font-semibold max-w-[140px] sm:max-w-[200px] truncate">
              {currentWorkspace.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#858E9B]" />
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-[#121519] border border-[#2A3038] rounded-xl shadow-2xl p-2 z-50 font-mono text-xs">
              <div className="px-3 py-2 text-[10px] text-[#858E9B] uppercase border-b border-[#2A3038]">
                Active Tenant / Graph
              </div>
              <div className="py-1">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id)
                      setWorkspaceMenuOpen(false)
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors duration-180 flex items-start gap-2.5 cursor-pointer ${
                      ws.id === currentWorkspace.id
                        ? 'bg-[#321E17] text-[#FF8559] border border-[#FF6B35]/35'
                        : 'text-[#B0B7C3] hover:bg-[#191D22]'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#FF6B35]" />
                    <div>
                      <div className="font-medium text-xs text-[#F5F5F5]">{ws.name}</div>
                      <div className="text-[10px] text-[#858E9B] font-sans mt-0.5">
                        {ws.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-[#2A3038] bg-[#0B0D0F]/60 rounded-b-lg">
                <p className="text-[10px] text-[#858E9B] flex items-center gap-1 font-sans">
                  <AlertTriangle className="w-3 h-3 text-[#FBBF24] shrink-0" />
                  <span>Tenant switching is simulated; live multi-tenancy requires backend authorization.</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#191D22] border border-[#2A3038] text-xs font-mono text-[#858E9B] hover:text-[#F5F5F5] hover:border-[#3B434D] transition-colors duration-180 w-64 justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#858E9B]" />
          <span>Quick command search...</span>
        </div>
        <kbd className="px-1.5 py-0.5 rounded bg-[#22272E] text-[10px] text-[#B0B7C3] border border-[#2A3038]">
          ⌘K
        </kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* About TRACEFORGE / Platform Overview */}
        <button
          onClick={() => navigate('/')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#191D22] border border-[#2A3038] hover:border-[#3B434D] text-[#B0B7C3] hover:text-[#F5F5F5] text-xs font-mono font-medium transition-colors duration-180 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
        >
          <Shield className="w-3.5 h-3.5 text-[#FF8559]" />
          <span>About Platform</span>
        </button>

        {/* Quickstart Guided Demo CTA */}
        <button
          onClick={() => setGuidedDemoOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[#FF6B35] hover:bg-[#FF8559] text-[#0B0D0F] font-mono font-semibold text-xs transition-all duration-180 shadow-[0_0_14px_rgba(255,107,53,0.25)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Guided Demo</span>
        </button>

        {/* Agent mode badge */}
        {mode && (
          <div className="hidden sm:flex items-center">
            <Badge
              variant={mode.mode === 'live' ? 'emerald' : 'cyan'}
              size="sm"
              className="gap-1.5"
            >
              <Cpu className="w-3 h-3" />
              <span>Agent: {mode.mode.toUpperCase()}</span>
            </Badge>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen)
              setWorkspaceMenuOpen(false)
              setUserMenuOpen(false)
            }}
            className="p-2 rounded-lg text-[#858E9B] hover:text-[#F5F5F5] hover:bg-[#191D22] relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6B35] ring-2 ring-[#121519]" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#121519] border border-[#2A3038] rounded-xl shadow-2xl p-3 z-50 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#2A3038]">
                <span className="font-semibold text-[#F5F5F5]">System Notifications</span>
                <Badge variant="accent" size="sm">Active</Badge>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2.5 rounded-lg bg-[#191D22] border border-[#2A3038] text-left">
                  <div className="text-[11px] font-semibold text-[#34D399]">Sandbox Boundary Active</div>
                  <div className="text-[10px] text-[#858E9B] font-sans mt-0.5 leading-relaxed">
                    Simulation graph isolation confirmed. Production graph is protected.
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#191D22] border border-[#2A3038] text-left">
                  <div className="text-[11px] font-semibold text-[#FBBF24]">P2 Attack Route Detected</div>
                  <div className="text-[10px] text-[#858E9B] font-sans mt-0.5 leading-relaxed">
                    Workstation A → Service Account route verified in benchmark topology.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile menu */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen)
              setWorkspaceMenuOpen(false)
              setNotificationsOpen(false)
            }}
            className="flex items-center gap-2 p-1 pl-2 pr-2.5 min-h-[36px] rounded-lg bg-[#191D22] border border-[#2A3038] hover:border-[#3B434D] transition-colors duration-180 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B73]"
          >
            <div className="w-6 h-6 rounded-md bg-[#321E17] border border-[#FF6B35]/40 text-[#FF8559] font-mono font-bold text-xs flex items-center justify-center">
              {user?.avatar || 'AV'}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-mono font-semibold text-[#F5F5F5] leading-tight">
                {user?.name || 'Analyst'}
              </div>
              <div className="text-[10px] font-mono text-[#FF8559] leading-tight">
                {user?.role || 'SecOps Analyst'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#858E9B]" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#121519] border border-[#2A3038] rounded-xl shadow-2xl p-2 z-50 font-mono text-xs">
              <div className="px-3 py-2 border-b border-[#2A3038]">
                <div className="font-semibold text-[#F5F5F5]">{user?.name}</div>
                <div className="text-[10px] text-[#858E9B] font-sans">{user?.email}</div>
                <Badge variant="accent" size="sm" className="mt-1.5">{user?.role}</Badge>
              </div>

              <div className="py-2">
                <div className="px-3 py-1 text-[10px] text-[#858E9B] uppercase">Switch Analyst Role</div>
                {(['SecOps Analyst', 'Incident Commander', 'Security Admin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => {
                      updateRole(role)
                      setUserMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md hover:bg-[#191D22] flex items-center justify-between cursor-pointer ${
                      user?.role === role ? 'text-[#FF8559] font-semibold bg-[#321E17]/40' : 'text-[#B0B7C3]'
                    }`}
                  >
                    <span>{role}</span>
                    {user?.role === role && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />}
                  </button>
                ))}
              </div>

              <div className="pt-1 border-t border-[#2A3038]">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-[#2A1417] text-[#FB7185] flex items-center gap-2 transition-colors duration-180 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guided 7-Stage Demo Runner Modal */}
      <GuidedInvestigationRunner
        isOpen={guidedDemoOpen}
        onClose={() => setGuidedDemoOpen(false)}
      />
    </header>
  )
}
