import React, { useState } from 'react'
import {
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  Activity,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '../../../components/ui/Button.tsx'
import { Badge } from '../../../components/ui/Badge.tsx'

type SimulationPhase =
  | 'BASELINE'
  | 'THREAT_ACTIVE'
  | 'CUT_CALCULATED'
  | 'SEVERED_CONTAINED'

export const ContainmentSimulator: React.FC = () => {
  const [phase, setPhase] = useState<SimulationPhase>('THREAT_ACTIVE')
  const [isSimulating, setIsSimulating] = useState(false)

  const handleTriggerContainment = () => {
    setIsSimulating(true)
    setPhase('CUT_CALCULATED')
    setTimeout(() => {
      setPhase('SEVERED_CONTAINED')
      setIsSimulating(false)
    }, 1200)
  }

  const handleReset = () => {
    setPhase('BASELINE')
  }

  const handleInjectThreat = () => {
    setPhase('THREAT_ACTIVE')
  }

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-[#121519] border border-[#2A3038] space-y-6">
      {/* Simulator Phase Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A3038]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4" />
            <span>Interactive Disruption Simulator</span>
          </div>
          <h3 className="text-xl font-bold font-mono text-[#F5F5F5]">
            Edmonds-Karp Minimum-Cut Sandbox Simulation
          </h3>
          <p className="text-xs text-[#858E9B] font-sans mt-1">
            Experience mathematically deterministic attack isolation in an ephemeral sandbox graph (tf-sim-*).
          </p>
        </div>

        {/* Phase Control Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {phase === 'BASELINE' && (
            <Button variant="primary" size="sm" onClick={handleInjectThreat}>
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Inject Simulated Intrusion
            </Button>
          )}

          {phase === 'THREAT_ACTIVE' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerContainment}
              isLoading={isSimulating}
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              Calculate & Enact Min-Cut
            </Button>
          )}

          {phase === 'SEVERED_CONTAINED' && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#FF8559]" />
              Reset to Baseline State
            </Button>
          )}

          {phase === 'SEVERED_CONTAINED' && (
            <Button variant="primary" size="sm" onClick={handleInjectThreat}>
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Replay Threat Scenario
            </Button>
          )}
        </div>
      </div>

      {/* State Progress Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
        {[
          { id: 'BASELINE', label: '1. Baseline Network', sub: 'All nodes healthy' },
          { id: 'THREAT_ACTIVE', label: '2. Threat Injected', sub: 'Active attack path' },
          { id: 'CUT_CALCULATED', label: '3. Min-Cut Solved', sub: '2 edges identified' },
          { id: 'SEVERED_CONTAINED', label: '4. Attacker Isolated', sub: '0 residual routes' },
        ].map((item, idx) => {
          const isActive = phase === item.id
          const isDone =
            (phase === 'THREAT_ACTIVE' && idx === 0) ||
            (phase === 'CUT_CALCULATED' && idx <= 1) ||
            (phase === 'SEVERED_CONTAINED' && idx <= 2)

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'bg-[#191D22] border-[#FF6B35] text-[#FF8559]'
                  : isDone
                    ? 'bg-[#121519] border-[#34D399]/40 text-[#34D399]'
                    : 'bg-[#0B0D0F] border-[#2A3038] text-[#858E9B]'
              }`}
            >
              <div className="font-bold">{item.label}</div>
              <div className="text-[10px] text-[#858E9B] mt-0.5">{item.sub}</div>
            </div>
          )
        })}
      </div>

      {/* SVG Interactive Topology Canvas */}
      <div className="p-4 sm:p-6 rounded-xl bg-[#0B0D0F] border border-[#2A3038] relative overflow-hidden">
        {/* Sandbox Isolation Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2A3038] text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">
              SANDBOX GRAPH: tf-sim-eval-01
            </Badge>
            <span className="text-[#858E9B] hidden sm:inline">
              Production Graph (traceforge) is Read-Only
            </span>
          </div>

          <div className="flex items-center gap-3 text-[#858E9B]">
            <span>
              Active Threat: <strong className={phase === 'BASELINE' ? 'text-[#34D399]' : 'text-[#FB7185]'}>
                {phase === 'BASELINE' ? 'NONE' : 'LATERAL CHAIN (CVE-2024)'}
              </strong>
            </span>
            <span>
              Paths to Crown Jewel: <strong className={phase === 'SEVERED_CONTAINED' || phase === 'BASELINE' ? 'text-[#34D399]' : 'text-[#FB7185]'}>
                {phase === 'BASELINE' ? '0' : phase === 'SEVERED_CONTAINED' ? '0 (ISOLATED)' : '2 ACTIVE'}
              </strong>
            </span>
          </div>
        </div>

        {/* SVG Network Layout */}
        <svg viewBox="0 0 860 260" className="w-full h-64 text-xs font-mono select-none">
          <defs>
            <linearGradient id="sim-grad-threat" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>
            <linearGradient id="sim-grad-safe" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>

          {/* Zones */}
          <rect x="20" y="25" width="220" height="210" rx="12" fill="#121519" stroke="#2A3038" strokeDasharray="3 3" />
          <text x="35" y="48" fill="#858E9B" fontSize="9" fontWeight="bold">ZONE 1: USER WORKSTATIONS</text>

          <rect x="280" y="25" width="300" height="210" rx="12" fill="#121519" stroke="#2A3038" strokeDasharray="3 3" />
          <text x="295" y="48" fill="#858E9B" fontSize="9" fontWeight="bold">ZONE 2: SHARED AUTH & BASTIONS</text>

          <rect x="620" y="25" width="220" height="210" rx="12" fill="#121519" stroke="#2A3038" strokeDasharray="3 3" />
          <text x="635" y="48" fill="#858E9B" fontSize="9" fontWeight="bold">ZONE 3: CRITICAL DATA STORE</text>

          {/* Edges */}
          {/* Edge 1: Workstation -> Service Account */}
          <line
            x1="130"
            y1="130"
            x2="380"
            y2="85"
            stroke={phase === 'BASELINE' ? '#2A3038' : '#FF6B35'}
            strokeWidth={phase === 'BASELINE' ? 1.5 : 2.5}
            strokeDasharray={phase === 'BASELINE' ? 'none' : '4 4'}
          />

          {/* Edge 2: Workstation -> Pivot Host */}
          <line
            x1="130"
            y1="130"
            x2="380"
            y2="175"
            stroke={phase === 'BASELINE' ? '#2A3038' : '#FBBF24'}
            strokeWidth={phase === 'BASELINE' ? 1.5 : 2}
            strokeDasharray={phase === 'BASELINE' ? 'none' : '4 4'}
          />

          {/* Cut Edge 1: Service Account -> Critical Server */}
          <line
            x1="460"
            y1="85"
            x2="700"
            y2="130"
            stroke={
              phase === 'SEVERED_CONTAINED'
                ? '#FB7185'
                : phase === 'BASELINE'
                  ? '#2A3038'
                  : '#FF6B35'
            }
            strokeWidth={phase === 'SEVERED_CONTAINED' ? 3 : 2}
            strokeDasharray={phase === 'SEVERED_CONTAINED' ? '6 4' : 'none'}
            opacity={phase === 'SEVERED_CONTAINED' ? 0.35 : 1}
          />

          {/* Cut Edge 2: Pivot Host -> Critical Server */}
          <line
            x1="460"
            y1="175"
            x2="700"
            y2="130"
            stroke={
              phase === 'SEVERED_CONTAINED'
                ? '#FB7185'
                : phase === 'BASELINE'
                  ? '#2A3038'
                  : '#FF6B35'
            }
            strokeWidth={phase === 'SEVERED_CONTAINED' ? 3 : 2}
            strokeDasharray={phase === 'SEVERED_CONTAINED' ? '6 4' : 'none'}
            opacity={phase === 'SEVERED_CONTAINED' ? 0.35 : 1}
          />

          {/* Min-Cut Sever Barrier Line */}
          {(phase === 'CUT_CALCULATED' || phase === 'SEVERED_CONTAINED') && (
            <g className="transition-all duration-300">
              <line
                x1="550"
                y1="35"
                x2="550"
                y2="225"
                stroke="#FF6B35"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
              <rect x="500" y="115" width="100" height="26" rx="6" fill="#321E17" stroke="#FF6B35" strokeWidth="1.5" />
              <text x="550" y="132" fill="#FF8559" fontSize="10" fontWeight="bold" textAnchor="middle">
                MIN-CUT BARRIER
              </text>

              {/* Sever markers ✕ */}
              <circle cx="550" cy="100" r="9" fill="#2A1417" stroke="#FB7185" strokeWidth="2" />
              <text x="550" y="104" fill="#FB7185" fontSize="11" fontWeight="bold" textAnchor="middle">
                ✕
              </text>

              <circle cx="550" cy="160" r="9" fill="#2A1417" stroke="#FB7185" strokeWidth="2" />
              <text x="550" y="164" fill="#FB7185" fontSize="11" fontWeight="bold" textAnchor="middle">
                ✕
              </text>
            </g>
          )}

          {/* Node 1: Workstation A */}
          <g transform="translate(130, 130)">
            <circle
              r="22"
              fill={phase === 'BASELINE' ? '#191D22' : '#321E17'}
              stroke={phase === 'BASELINE' ? '#60A5FA' : '#FF6B35'}
              strokeWidth="2"
            />
            <circle r="6" fill={phase === 'BASELINE' ? '#60A5FA' : '#FF6B35'} />
            <text y="36" textAnchor="middle" fill="#F5F5F5" fontSize="10" fontWeight="bold">
              Workstation A
            </text>
            <text y="48" textAnchor="middle" fill={phase === 'BASELINE' ? '#858E9B' : '#FF8559'} fontSize="9">
              {phase === 'BASELINE' ? 'Healthy Node' : 'Compromised Foothold'}
            </text>
          </g>

          {/* Node 2: Service Account */}
          <g transform="translate(420, 85)">
            <circle
              r="20"
              fill={phase === 'SEVERED_CONTAINED' ? '#12261E' : phase === 'BASELINE' ? '#191D22' : '#291F10'}
              stroke={phase === 'SEVERED_CONTAINED' ? '#34D399' : phase === 'BASELINE' ? '#2A3038' : '#FBBF24'}
              strokeWidth="2"
            />
            <circle r="5" fill={phase === 'SEVERED_CONTAINED' ? '#34D399' : '#FBBF24'} />
            <text y="34" textAnchor="middle" fill="#F5F5F5" fontSize="10">
              svc-backup IAM
            </text>
            <text y="46" textAnchor="middle" fill={phase === 'SEVERED_CONTAINED' ? '#34D399' : '#858E9B'} fontSize="9">
              {phase === 'SEVERED_CONTAINED' ? 'Token Revoked (Safe)' : 'Over-privileged'}
            </text>
          </g>

          {/* Node 3: Pivot Server */}
          <g transform="translate(420, 175)">
            <circle
              r="20"
              fill={phase === 'SEVERED_CONTAINED' ? '#12261E' : phase === 'BASELINE' ? '#191D22' : '#291F10'}
              stroke={phase === 'SEVERED_CONTAINED' ? '#34D399' : phase === 'BASELINE' ? '#2A3038' : '#FBBF24'}
              strokeWidth="2"
            />
            <circle r="5" fill={phase === 'SEVERED_CONTAINED' ? '#34D399' : '#FBBF24'} />
            <text y="34" textAnchor="middle" fill="#F5F5F5" fontSize="10">
              SSH Bastion Host
            </text>
            <text y="46" textAnchor="middle" fill={phase === 'SEVERED_CONTAINED' ? '#34D399' : '#858E9B'} fontSize="9">
              {phase === 'SEVERED_CONTAINED' ? 'Tunnel Severed' : 'Internal Gateway'}
            </text>
          </g>

          {/* Node 4: Critical Crown Jewel */}
          <g transform="translate(720, 130)">
            <circle
              r="25"
              fill={phase === 'SEVERED_CONTAINED' ? '#12261E' : phase === 'BASELINE' ? '#191D22' : '#2A1417'}
              stroke={phase === 'SEVERED_CONTAINED' ? '#34D399' : phase === 'BASELINE' ? '#2A3038' : '#FB7185'}
              strokeWidth="2.5"
            />
            <circle r="7" fill={phase === 'SEVERED_CONTAINED' ? '#34D399' : '#FB7185'} />
            <text y="38" textAnchor="middle" fill="#F5F5F5" fontSize="10" fontWeight="bold">
              Critical Server
            </text>
            <text y="50" textAnchor="middle" fill={phase === 'SEVERED_CONTAINED' ? '#34D399' : '#FB7185'} fontSize="9">
              {phase === 'SEVERED_CONTAINED' ? 'ISOLATED & PROTECTED' : 'AT IMMEDIATE RISK'}
            </text>
          </g>
        </svg>

        {/* Verification Summary Footnote */}
        <div className="pt-3 border-t border-[#2A3038] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            {phase === 'SEVERED_CONTAINED' ? (
              <span className="flex items-center gap-1.5 text-[#34D399] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Residual Max-Flow: 0.0 • All Attacker Pathways Severed
              </span>
            ) : phase === 'BASELINE' ? (
              <span className="flex items-center gap-1.5 text-[#60A5FA]">
                <Activity className="w-4 h-4" />
                Topology Ready for Simulation Injection
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#FB7185] font-bold animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                Active Lateral Routes Detected • Min-Cut Required
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#858E9B]">
            Sandbox Disruption Cost: <strong className="text-[#F5F5F5]">{phase === 'SEVERED_CONTAINED' ? '2 Edges' : '0 Edges'}</strong> • Benign Disruption: <strong className="text-[#34D399]">0%</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
