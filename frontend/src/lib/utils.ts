import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(ts: number | string | null | undefined): string {
  if (ts === null || ts === undefined) return 'N/A'
  const num = typeof ts === 'string' ? parseFloat(ts) : ts
  if (isNaN(num)) return String(ts)

  // FalkorDB / audit ts might be in seconds (e.g. 1792316752) or milliseconds or synthetic integer
  const ms = num < 10000000000 ? num * 1000 : num

  // If small synthetic timestamp (like 100, 150, 320)
  if (num < 100000) {
    return `T+${num}s (sim)`
  }

  try {
    const date = new Date(ms)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return String(ts)
  }
}

export function formatRelativeTime(ts: number | null | undefined): string {
  if (!ts) return 'Never'
  const ms = ts < 10000000000 ? ts * 1000 : ts
  const diffSec = Math.floor((Date.now() - ms) / 1000)

  if (diffSec < 0) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

export function getRiskLevel(score: number): {
  label: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  color: string
  bg: string
  border: string
} {
  if (score >= 0.75) {
    return {
      label: 'CRITICAL',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
    }
  }
  if (score >= 0.5) {
    return {
      label: 'HIGH',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
    }
  }
  if (score >= 0.25) {
    return {
      label: 'MEDIUM',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
    }
  }
  return {
    label: 'LOW',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  }
}

export function getNodeVisualProps(labels: string[] = [], props: Record<string, unknown> = {}) {
  const primaryLabel = labels[0] || 'Unknown'
  const type = String(props.type || '').toLowerCase()
  const criticality = String(props.criticality || '').toLowerCase()

  if (criticality === 'critical' || props.name === 'Critical Server') {
    return {
      color: '#ef4444',
      bg: '#450a0a',
      border: '#dc2626',
      icon: 'ShieldAlert',
      category: 'Critical Asset',
    }
  }

  if (primaryLabel === 'Incident' || primaryLabel === 'Alert') {
    return {
      color: '#f97316',
      bg: '#431407',
      border: '#ea580c',
      icon: 'AlertTriangle',
      category: 'Detection Event',
    }
  }

  if (primaryLabel === 'Evidence') {
    const isUntrusted = props.untrusted === true
    return {
      color: isUntrusted ? '#f43f5e' : '#06b6d4',
      bg: isUntrusted ? '#4c0519' : '#083344',
      border: isUntrusted ? '#e11d48' : '#0891b2',
      icon: 'FileText',
      category: isUntrusted ? 'Hostile Evidence (Untrusted)' : 'Verified Evidence',
    }
  }

  if (primaryLabel === 'Vulnerability') {
    return {
      color: '#ec4899',
      bg: '#500724',
      border: '#db2777',
      icon: 'Bug',
      category: 'Vulnerability (KEV)',
    }
  }

  if (primaryLabel === 'Credential' || type === 'credential') {
    return {
      color: '#a855f7',
      bg: '#3b0764',
      border: '#9333ea',
      icon: 'Key',
      category: 'Credential Asset',
    }
  }

  if (primaryLabel === 'Account' || type === 'service_account') {
    return {
      color: '#8b5cf6',
      bg: '#2e1065',
      border: '#7c3aed',
      icon: 'UserCheck',
      category: 'Service Account',
    }
  }

  if (type === 'workstation' || primaryLabel === 'Workstation') {
    return {
      color: '#3b82f6',
      bg: '#172554',
      border: '#2563eb',
      icon: 'Monitor',
      category: 'Workstation',
    }
  }

  if (type === 'server' || primaryLabel === 'Server') {
    return {
      color: '#10b981',
      bg: '#022c22',
      border: '#059669',
      icon: 'Server',
      category: 'Server Asset',
    }
  }

  return {
    color: '#00ff88',
    bg: '#064e3b',
    border: '#10b981',
    icon: 'Terminal',
    category: primaryLabel,
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false)
}
