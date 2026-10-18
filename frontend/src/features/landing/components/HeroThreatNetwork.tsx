import React, { useState, useEffect, useRef } from 'react'
import { ShieldAlert, Terminal, Server, Key, Monitor, Database, Cpu, Activity, RefreshCw } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge.tsx'
import { Button } from '../../../components/ui/Button.tsx'

interface NetworkNode {
  id: string
  label: string
  type: 'workstation' | 'service_account' | 'bastion' | 'domain_controller' | 'storage' | 'database' | 'crown_jewel'
  x: number
  y: number
  ip: string
  criticality: number
  status: 'compromised' | 'vulnerable' | 'pivot' | 'target' | 'normal'
  cve?: string
  privilege?: string
  connections: string[]
}

const NODES: NetworkNode[] = [
  {
    id: 'ws-a',
    label: 'Workstation A',
    type: 'workstation',
    x: 90,
    y: 160,
    ip: '10.0.4.12',
    criticality: 0.45,
    status: 'compromised',
    cve: 'CVE-2024-3400 (Initial Foothold)',
    connections: ['sa-token', 'dc-auth'],
  },
  {
    id: 'dc-auth',
    label: 'Domain Controller',
    type: 'domain_controller',
    x: 230,
    y: 80,
    ip: '10.0.1.5',
    criticality: 0.92,
    status: 'vulnerable',
    cve: 'MS-SAMR Kerberoastable',
    connections: ['ws-a', 'prod-db', 'sa-token'],
  },
  {
    id: 'sa-token',
    label: 'svc-backup IAM',
    type: 'service_account',
    x: 270,
    y: 220,
    ip: 'iam::prod/backup-worker',
    criticality: 0.78,
    status: 'pivot',
    privilege: 'AssumeRole: Administrator',
    connections: ['ws-a', 'bastion-01', 's3-vault'],
  },
  {
    id: 'bastion-01',
    label: 'Bastion Gateway',
    type: 'bastion',
    x: 440,
    y: 150,
    ip: '10.0.2.14',
    criticality: 0.85,
    status: 'pivot',
    privilege: 'SSH Keypair Exfiltrated',
    connections: ['sa-token', 'crown-jewel', 'prod-db'],
  },
  {
    id: 's3-vault',
    label: 'Encrypted S3 Vault',
    type: 'storage',
    x: 410,
    y: 270,
    ip: 's3://tf-telemetry-vault',
    criticality: 0.65,
    status: 'normal',
    connections: ['sa-token'],
  },
  {
    id: 'prod-db',
    label: 'Postgres Primary',
    type: 'database',
    x: 430,
    y: 60,
    ip: '10.0.3.88',
    criticality: 0.88,
    status: 'vulnerable',
    connections: ['dc-auth', 'bastion-01'],
  },
  {
    id: 'crown-jewel',
    label: 'Critical Server',
    type: 'crown_jewel',
    x: 610,
    y: 150,
    ip: '10.0.1.100',
    criticality: 0.99,
    status: 'target',
    privilege: 'Customer PII & Secrets',
    connections: ['bastion-01'],
  },
]

const EDGES = [
  { from: 'ws-a', to: 'sa-token', type: 'USES_TOKEN', label: 'Token Stolen' },
  { from: 'ws-a', to: 'dc-auth', type: 'AUTHENTICATES_TO', label: 'Kerberos TGS' },
  { from: 'dc-auth', to: 'prod-db', type: 'ACCESSES', label: 'Replication' },
  { from: 'sa-token', to: 'bastion-01', type: 'SSH_SESSION', label: 'Key Auth' },
  { from: 'sa-token', to: 's3-vault', type: 'SYNCS_TO', label: 'Read Only' },
  { from: 'bastion-01', to: 'crown-jewel', type: 'REACHES', label: 'Direct Lateral Hop' },
  { from: 'bastion-01', to: 'prod-db', type: 'CONNECTS', label: 'Admin Tunnel' },
]

export const HeroThreatNetwork: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<NetworkNode>(NODES[0])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [assembled, setAssembled] = useState(false)
  const [pulseTick, setPulseTick] = useState(0)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Progressive assembly animation starting 300ms after load
  useEffect(() => {
    const timer = setTimeout(() => {
      setAssembled(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Heartbeat pulse cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseTick(prev => (prev + 1) % 100)
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  // Restrained cursor parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8
    setMousePos({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 })
    setHoveredNode(null)
  }

  const handleReassemble = () => {
    setAssembled(false)
    setTimeout(() => {
      setAssembled(true)
    }, 150)
  }

  const getNodeColor = (status: NetworkNode['status']) => {
    switch (status) {
      case 'compromised':
        return { stroke: '#FF6B35', fill: '#321E17', text: '#FF8559', glow: 'rgba(255,107,53,0.4)' }
      case 'pivot':
        return { stroke: '#FBBF24', fill: '#291F10', text: '#FBBF24', glow: 'rgba(251,191,36,0.3)' }
      case 'vulnerable':
        return { stroke: '#60A5FA', fill: '#132238', text: '#60A5FA', glow: 'rgba(96,165,250,0.3)' }
      case 'target':
        return { stroke: '#FB7185', fill: '#2A1417', text: '#FB7185', glow: 'rgba(251,113,133,0.5)' }
      default:
        return { stroke: '#34D399', fill: '#12261E', text: '#34D399', glow: 'rgba(52,211,153,0.2)' }
    }
  }

  const getNodeIcon = (type: NetworkNode['type']) => {
    switch (type) {
      case 'workstation':
        return <Monitor className="w-3.5 h-3.5" />
      case 'service_account':
        return <Key className="w-3.5 h-3.5" />
      case 'bastion':
        return <Server className="w-3.5 h-3.5" />
      case 'domain_controller':
        return <Cpu className="w-3.5 h-3.5" />
      case 'storage':
        return <Database className="w-3.5 h-3.5" />
      case 'database':
        return <Database className="w-3.5 h-3.5" />
      case 'crown_jewel':
        return <ShieldAlert className="w-3.5 h-3.5" />
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full rounded-2xl bg-[#121519] border border-[#2A3038] overflow-hidden shadow-2xl transition-all duration-300"
      style={{
        transform: `perspective(1000px) rotateX(${mousePos.y * -0.5}deg) rotateY(${mousePos.x * 0.5}deg)`,
      }}
    >
      {/* Top Header Controls */}
      <div className="px-5 py-3.5 border-b border-[#2A3038] bg-[#191D22] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
          <span className="font-semibold text-[#F5F5F5] tracking-wide">
            FalkorDB Live Threat Network
          </span>
          <Badge variant="accent" size="sm">
            Interactive Topology
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#858E9B]">
          <span className="hidden sm:inline">Click node to inspect metadata</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReassemble}
            className="h-7 px-2.5 text-[11px] border-[#3B434D] hover:border-[#FF6B35] text-[#F5F5F5]"
            title="Replay progressive graph assembly"
          >
            <RefreshCw className="w-3 h-3 mr-1.5 text-[#FF8559]" />
            Replay Assembly
          </Button>
        </div>
      </div>

      {/* Main Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
        {/* SVG Network Graph Area (Cols 1-8) */}
        <div className="lg:col-span-8 p-4 relative flex items-center justify-center bg-[#0B0D0F]">
          <svg
            viewBox="0 0 700 320"
            className="w-full h-full max-h-[360px] select-none"
          >
            <defs>
              {/* Radial gradient background grid dots */}
              <pattern id="hero-grid-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#22272E" />
              </pattern>

              {/* Glowing filter */}
              <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background grid */}
            <rect width="100%" height="100%" fill="url(#hero-grid-dots)" />

            {/* Subtle radar scan wave */}
            <circle
              cx="350"
              cy="160"
              r="140"
              fill="none"
              stroke="#2A3038"
              strokeWidth="1"
              strokeDasharray="4 6"
              className="animate-spin opacity-40 origin-center"
              style={{ animationDuration: '40s' }}
            />

            {/* Edge Connections */}
            {EDGES.map((edge, idx) => {
              const src = NODES.find(n => n.id === edge.from)
              const dst = NODES.find(n => n.id === edge.to)
              if (!src || !dst) return null

              const isHighlighted =
                hoveredNode === src.id ||
                hoveredNode === dst.id ||
                selectedNode.id === src.id ||
                selectedNode.id === dst.id

              const edgeColor = isHighlighted ? '#FF8559' : '#2A3038'
              const edgeWidth = isHighlighted ? 2.5 : 1.5

              return (
                <g key={`edge-${idx}`}>
                  {/* Base edge line with progressive stroke-draw assembly */}
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={dst.x}
                    y2={dst.y}
                    stroke={edgeColor}
                    strokeWidth={edgeWidth}
                    strokeDasharray={assembled ? (isHighlighted ? '4 4' : 'none') : '260'}
                    strokeDashoffset={assembled ? 0 : 260}
                    className="transition-all duration-300"
                    style={{
                      opacity: assembled ? (isHighlighted ? 1 : 0.65) : 0,
                      transition: `stroke-dashoffset 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.1}s, opacity 0.6s ease ${idx * 0.08}s, stroke 0.2s`,
                    }}
                  />

                  {/* Flowing animated particle pulses */}
                  {assembled && (
                    <circle r={isHighlighted ? 3 : 2} fill={isHighlighted ? '#FF6B35' : '#60A5FA'}>
                      <animateMotion
                        path={`M ${src.x} ${src.y} L ${dst.x} ${dst.y}`}
                        dur={`${2.2 + (idx % 3) * 0.4}s`}
                        repeatCount="indefinite"
                        begin={`${0.4 + idx * 0.25}s`}
                      />
                    </circle>
                  )}
                </g>
              )
            })}

            {/* Network Nodes */}
            {NODES.map((node, idx) => {
              const colors = getNodeColor(node.status)
              const isSelected = selectedNode.id === node.id
              const isHovered = hoveredNode === node.id
              const baseR = isSelected ? 20 : isHovered ? 18 : 16
              const dotR = isSelected ? 6 : isHovered ? 5 : 4

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer select-none"
                  style={{
                    opacity: assembled ? 1 : 0,
                    transition: `opacity 0.5s ease ${0.15 + idx * 0.08}s`,
                  }}
                >
                  {/* Outer pulse wave */}
                  {isSelected && (
                    <circle
                      r="26"
                      fill={colors.fill}
                      fillOpacity="0.3"
                      stroke={colors.stroke}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      className="animate-ping"
                      style={{ animationDuration: '2s' }}
                    />
                  )}

                  {/* Outer halo ring with smooth spring radius expansion on appear */}
                  <circle
                    r={assembled ? baseR : 0}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={isSelected ? 'url(#hero-glow)' : undefined}
                    style={{
                      transition: `r 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + idx * 0.08}s, fill 0.2s, stroke 0.2s`,
                    }}
                  />

                  {/* Core center dot with animated appear */}
                  <circle
                    r={assembled ? dotR : 0}
                    fill={colors.stroke}
                    style={{
                      transition: `r 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + idx * 0.08}s`,
                    }}
                  />

                  {/* Node Title Label */}
                  <text
                    y={isSelected ? 28 : 25}
                    textAnchor="middle"
                    fill={isSelected ? '#F5F5F5' : '#B0B7C3'}
                    fontSize={isSelected ? '10' : '9'}
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="select-none pointer-events-none transition-opacity duration-300"
                    style={{
                      opacity: assembled ? 1 : 0,
                      transition: `opacity 0.4s ease ${0.25 + idx * 0.08}s`,
                    }}
                  >
                    {node.label}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Quick HUD legend bar */}
          <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#858E9B]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35]" /> Foothold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FBBF24]" /> Pivot Hop
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#60A5FA]" /> Vulnerable
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FB7185]" /> Target
            </span>
          </div>
        </div>

        {/* Selected Node Detailed Inspector Panel (Cols 9-12) */}
        <div className="lg:col-span-4 p-5 bg-[#121519] border-t lg:border-t-0 lg:border-l border-[#2A3038] flex flex-col justify-between font-mono text-xs space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3038]">
              <span className="text-[10px] text-[#858E9B] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#FF8559]" />
                Graph Node Telemetry
              </span>
              <Badge
                variant={
                  selectedNode.status === 'compromised'
                    ? 'red'
                    : selectedNode.status === 'target'
                      ? 'red'
                      : selectedNode.status === 'pivot'
                        ? 'amber'
                        : 'cyan'
                }
                size="sm"
              >
                {selectedNode.status.toUpperCase()}
              </Badge>
            </div>

            {/* Node Identity */}
            <div className="space-y-1">
              <div className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#191D22] border border-[#2A3038] text-[#FF8559]">
                  {getNodeIcon(selectedNode.type)}
                </span>
                <span>{selectedNode.label}</span>
              </div>
              <div className="text-xs text-[#858E9B]">{selectedNode.ip}</div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#858E9B]">Criticality Impact:</span>
                <span className="font-bold text-[#F5F5F5]">
                  {(selectedNode.criticality * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#0B0D0F] border border-[#2A3038] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FF8559] transition-all duration-300"
                  style={{ width: `${selectedNode.criticality * 100}%` }}
                />
              </div>

              {selectedNode.cve && (
                <div className="p-2.5 rounded-lg bg-[#291F10]/40 border border-[#FBBF24]/30 text-[11px] text-[#FBBF24]">
                  <strong>Exploit Vector:</strong> {selectedNode.cve}
                </div>
              )}

              {selectedNode.privilege && (
                <div className="p-2.5 rounded-lg bg-[#191D22] border border-[#2A3038] text-[11px] text-[#B0B7C3]">
                  <strong>Privilege Escalation:</strong> {selectedNode.privilege}
                </div>
              )}

              <div className="text-[11px] text-[#858E9B] pt-1">
                Active Graph Edges: <strong className="text-[#F5F5F5]">{selectedNode.connections.length} paths</strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#2A3038] flex items-center justify-between text-[11px] text-[#858E9B]">
            <span className="flex items-center gap-1.5 text-[#34D399]">
              <Activity className="w-3.5 h-3.5" />
              Live Topology Hook
            </span>
            <span>Tick #{pulseTick}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
