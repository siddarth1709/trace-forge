import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
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
  Play,
} from 'lucide-react'
import { Modal } from '../ui/Modal.tsx'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  const items = [
    { label: 'SecOps Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4 text-[#FF8559]" /> },
    { label: 'About TRACEFORGE (Architecture & Overview)', path: '/', icon: <Shield className="w-4 h-4 text-[#60A5FA]" /> },
    { label: 'Attack Graph Explorer', path: '/graph', icon: <Network className="w-4 h-4 text-[#60A5FA]" /> },
    { label: 'Incident Investigations', path: '/investigations', icon: <SearchCheck className="w-4 h-4 text-[#FBBF24]" /> },
    { label: 'Defense Lab & Sandbox Simulations', path: '/defense-lab', icon: <ShieldAlert className="w-4 h-4 text-[#34D399]" /> },
    { label: 'Threat Mapping (MITRE ATT&CK)', path: '/threat-mapping', icon: <Target className="w-4 h-4 text-[#FB7185]" /> },
    { label: 'Risk Analysis & Sensitivity', path: '/risk-analysis', icon: <TrendingUp className="w-4 h-4 text-[#C084FC]" /> },
    { label: 'Evidence & Provenance Audit', path: '/evidence', icon: <FileCheck className="w-4 h-4 text-[#60A5FA]" /> },
    { label: 'Case Management & Human Approval', path: '/cases', icon: <FolderArchive className="w-4 h-4 text-[#FBBF24]" /> },
    { label: 'Immutable Audit Trail', path: '/audit', icon: <History className="w-4 h-4 text-[#858E9B]" /> },
    { label: 'System & Security Settings', path: '/settings', icon: <Settings className="w-4 h-4 text-[#858E9B]" /> },
  ]

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (path: string) => {
    navigate(path)
    handleClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="md">
      <div className="space-y-4 font-mono">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#858E9B] absolute left-3 pointer-events-none" />
          <input
            type="text"
            autoFocus
            placeholder="Type a page, command, or entity name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#0B0D0F] border border-[#2A3038] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#858E9B] focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF9B73]/60 transition-colors duration-180"
          />
        </div>

        <div className="space-y-1 max-h-72 overflow-y-auto">
          <div className="text-[10px] text-[#858E9B] uppercase px-3 py-1">Navigation</div>
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#858E9B]">No matching commands</div>
          ) : (
            filtered.map(item => (
              <button
                key={item.path}
                onClick={() => handleSelect(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-[#B0B7C3] hover:text-[#F5F5F5] hover:bg-[#191D22] transition-colors duration-120 text-left cursor-pointer group"
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <Play className="w-3 h-3 text-[#858E9B] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
