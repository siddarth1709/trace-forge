import React, { useState, useEffect } from 'react'
import { Database, Cpu, Network, Shield, Radio, Terminal } from 'lucide-react'
import { Badge } from '../ui/Badge.tsx'
import { cn } from '../../lib/utils.ts'

export interface GraphPreloaderProps {
  graphName?: string
  message?: string
  subMessage?: string
  variant?: 'overlay' | 'inline' | 'fullscreen'
  durationMs?: number
  className?: string
}

const CYPHER_TELEMETRY_STEPS = [
  {
    step: 'CONNECT',
    query: 'falkordb://127.0.0.1:6379 -> Redis Protocol Handshake OK',
    action: 'Binding session to graph instance...',
  },
  {
    step: 'CYPHER',
    query: 'MATCH (n:Entity)-[r]->(m:Entity) RETURN n, r, m LIMIT 1000',
    action: 'Querying node properties, labels & edge relations...',
  },
  {
    step: 'PATH_SOLVER',
    query: 'CALL tf.discover_lateral_hops(sources, target) YIELD path',
    action: 'Traversing multi-hop lateral movements & credentials...',
  },
  {
    step: 'RENDER',
    query: 'SERIALIZE TOPOLOGY -> ReactFlow Coordinate Layout',
    action: 'Preparing dynamic force-directed attack graph...',
  },
]

export const GraphPreloader: React.FC<GraphPreloaderProps> = ({
  graphName = 'traceforge',
  message = 'Fetching Graph Topology from FalkorDB...',
  subMessage = 'Querying live security nodes, relationships, and lateral attack paths',
  variant = 'overlay',
  durationMs = 3000,
  className,
}) => {
  const [telemetryIndex, setTelemetryIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Track progress and cycle telemetry steps smoothly across the 3 seconds
  useEffect(() => {
    const startTime = Date.now()
    const interval = 40 // update every 40ms for smooth 60fps-like progress
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100))
      setProgress(pct)

      const step = Math.min(
        CYPHER_TELEMETRY_STEPS.length - 1,
        Math.floor((elapsed / durationMs) * CYPHER_TELEMETRY_STEPS.length)
      )
      setTelemetryIndex(step)

      if (elapsed >= durationMs) {
        clearInterval(timer)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [durationMs])

  const currentStep = CYPHER_TELEMETRY_STEPS[telemetryIndex]

  const containerClasses = {
    overlay:
      'absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0B0D0F]/95 backdrop-blur-md p-6 text-center animate-in fade-in duration-180',
    inline:
      'w-full p-8 rounded-2xl bg-[#121519] border border-[#2A3038] shadow-2xl flex flex-col items-center justify-center text-center',
    fullscreen:
      'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0D0F] p-6 text-center',
  }

  return (
    <div
      data-testid="graph-preloader"
      className={cn(containerClasses[variant], className)}
    >
      {/* Top Engine Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <Badge variant="accent" size="sm" className="shadow-[0_0_12px_rgba(255,107,53,0.2)] flex items-center gap-1.5">
          <Database className="w-3 h-3 text-[#FF8559]" />
          FalkorDB Graph Engine
        </Badge>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#191D22] border border-[#2A3038] text-[#F5F5F5]">
          GRAPH: <span className="text-[#34D399] font-bold">{graphName}</span>
        </span>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#191D22] border border-[#2A3038] text-[#858E9B] flex items-center gap-1">
          <Radio className="w-3 h-3 text-[#34D399]" />
          LIVE SYNC
        </span>
      </div>

      {/* Cyber Sonar & Animated Network Topology Graphic */}
      <div className="relative w-80 h-44 mb-5 flex items-center justify-center">
        {/* Sonar sweep rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 rounded-full border border-cyan-500/15 animate-ping duration-1000" />
          <div className="w-60 h-60 rounded-full border border-emerald-500/10 animate-pulse" />
          <div className="w-80 h-80 rounded-full border border-slate-800/40" />
        </div>

        {/* SVG Network Graph Visualization */}
        <svg
          viewBox="0 0 340 180"
          className="w-full h-full relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.25)]"
        >
          <defs>
            {/* Linear gradients for edges */}
            <linearGradient id="edgeGradA" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="edgeGradB" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="edgeGradC" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <linearGradient id="edgeGradD" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges with animated dash flows */}
          <line
            x1="50"
            y1="90"
            x2="145"
            y2="45"
            stroke="url(#edgeGradA)"
            strokeWidth="2"
            strokeDasharray="5 5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="50"
            y1="90"
            x2="195"
            y2="135"
            stroke="url(#edgeGradB)"
            strokeWidth="2"
            strokeDasharray="5 5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="145"
            y1="45"
            x2="290"
            y2="90"
            stroke="url(#edgeGradC)"
            strokeWidth="2"
            strokeDasharray="5 5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="0.9s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="195"
            y1="135"
            x2="290"
            y2="90"
            stroke="url(#edgeGradD)"
            strokeWidth="2"
            strokeDasharray="5 5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </line>

          {/* Node 1: Foothold (Cyan) */}
          <g transform="translate(50, 90)">
            <circle r="16" fill="#06b6d4" fillOpacity="0.15" />
            <circle r="12" fill="#090d14" stroke="#06b6d4" strokeWidth="2" filter="url(#glow)">
              <animate attributeName="r" values="10;13;10" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="4" fill="#06b6d4" />
            <text y="26" textAnchor="middle" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
              FOOTHOLD
            </text>
          </g>

          {/* Node 2: Credential Hop (Purple) */}
          <g transform="translate(145, 45)">
            <circle r="15" fill="#a855f7" fillOpacity="0.15" />
            <circle r="11" fill="#090d14" stroke="#a855f7" strokeWidth="2" filter="url(#glow)">
              <animate attributeName="r" values="9;12;9" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <circle r="4" fill="#a855f7" />
            <text y="-18" textAnchor="middle" fill="#c084fc" fontSize="9" fontFamily="monospace">
              AUTH_HOP
            </text>
          </g>

          {/* Node 3: Lateral Server (Emerald) */}
          <g transform="translate(195, 135)">
            <circle r="15" fill="#10b981" fillOpacity="0.15" />
            <circle r="11" fill="#090d14" stroke="#10b981" strokeWidth="2" filter="url(#glow)">
              <animate attributeName="r" values="9;12;9" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle r="4" fill="#10b981" />
            <text y="24" textAnchor="middle" fill="#34d399" fontSize="9" fontFamily="monospace">
              PIVOT_SRV
            </text>
          </g>

          {/* Node 4: Target Crown Jewel (Rose/Red) */}
          <g transform="translate(290, 90)">
            <circle r="18" fill="#f43f5e" fillOpacity="0.2">
              <animate attributeName="r" values="16;22;16" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle r="12" fill="#090d14" stroke="#f43f5e" strokeWidth="2.5" filter="url(#glow)" />
            <circle r="4" fill="#f43f5e">
              <animate attributeName="fill" values="#f43f5e;#fda4af;#f43f5e" dur="1s" repeatCount="indefinite" />
            </circle>
            <text y="26" textAnchor="middle" fill="#fb7185" fontSize="9" fontFamily="monospace" fontWeight="bold">
              TARGET
            </text>
          </g>
        </svg>
      </div>

      {/* Main Status Text */}
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base sm:text-lg font-bold font-mono text-slate-100 flex items-center justify-center gap-2">
          <Network className="w-5 h-5 text-cyan-400 animate-pulse" />
          <span>{message}</span>
        </h3>
        <p className="text-xs text-slate-400 font-sans leading-relaxed">
          {subMessage}
        </p>
      </div>

      {/* Cyber 3-Second Synchronized Progress Meter */}
      <div className="w-72 sm:w-88 mt-4 mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            TOPOLOGY SYNCHRONIZATION
          </span>
          <span className="text-emerald-400 font-bold font-mono">
            {progress}% <span className="text-slate-500 font-normal">({(durationMs / 1000).toFixed(1)}s)</span>
          </span>
        </div>
        <div className="w-full h-2 bg-slate-900 border border-slate-800 rounded-full overflow-hidden relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-purple-500 rounded-full transition-all duration-75 ease-out shadow-[0_0_14px_rgba(6,182,212,0.7)]"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-24 animate-[laserSweep_1.5s_ease-in-out_infinite]"
          />
        </div>
      </div>

      {/* Terminal Cypher Query Telemetry Console */}
      <div className="w-full max-w-lg mt-2 p-3 rounded-xl bg-[#03060a]/90 border border-slate-800 text-left font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Terminal className="w-3 h-3 text-cyan-400" />
            FalkorDB Cypher Engine Telemetry
          </span>
          <span className="text-emerald-400 flex items-center gap-1 font-bold">
            <Cpu className="w-2.5 h-2.5" />
            STAGE {telemetryIndex + 1}/{CYPHER_TELEMETRY_STEPS.length} (3.0s SCAN)
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-300 truncate">
            <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 font-bold shrink-0">
              {currentStep.step}
            </span>
            <span className="truncate text-[11px]">{currentStep.query}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 pl-1">
            <span className="text-emerald-400">›</span>
            <span>{currentStep.action}</span>
          </div>
        </div>
      </div>

      {/* Footnote notice */}
      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
        <Shield className="w-3 h-3 text-emerald-400/70" />
        <span>Production graph isolation & read-only safety policy enforced</span>
      </div>
    </div>
  )
}
