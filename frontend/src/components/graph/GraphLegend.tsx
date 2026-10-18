import React from 'react'
import {
  ShieldAlert,
  Monitor,
  Key,
  UserCheck,
  Server,
  Bug,
  AlertTriangle,
  FileText,
} from 'lucide-react'

export const GraphLegend: React.FC = () => {
  const items = [
    { label: 'Critical Asset', color: '#ef4444', border: '#dc2626', icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> },
    { label: 'Workstation / Foothold', color: '#3b82f6', border: '#2563eb', icon: <Monitor className="w-3.5 h-3.5 text-blue-400" /> },
    { label: 'Credential', color: '#a855f7', border: '#9333ea', icon: <Key className="w-3.5 h-3.5 text-purple-400" /> },
    { label: 'Service Account', color: '#8b5cf6', border: '#7c3aed', icon: <UserCheck className="w-3.5 h-3.5 text-violet-400" /> },
    { label: 'Server', color: '#10b981', border: '#059669', icon: <Server className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: 'Vulnerability (KEV)', color: '#ec4899', border: '#db2777', icon: <Bug className="w-3.5 h-3.5 text-pink-400" /> },
    { label: 'Alert / Incident', color: '#f97316', border: '#ea580c', icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> },
    { label: 'Evidence (Hostile / Untrusted)', color: '#f43f5e', border: '#e11d48', icon: <FileText className="w-3.5 h-3.5 text-rose-400" /> },
  ]

  return (
    <div className="bg-[#0b0f17]/95 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md font-mono text-xs max-w-xs">
      <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">
        Topology Entity Legend
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2 text-[11px] text-slate-300">
            <div className="p-1 rounded bg-slate-900 border border-slate-800 shrink-0">
              {item.icon}
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
