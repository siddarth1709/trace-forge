import React, { useState, useEffect } from 'react'
import { TrendingUp, ShieldCheck, Cpu, AlertTriangle, Radio } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge.tsx'

export const AnimatedSecurityMetrics: React.FC = () => {
  const [animatedRiskScore, setAnimatedRiskScore] = useState(0)
  const [nodesCount, setNodesCount] = useState(0)
  const [latencyMs, setLatencyMs] = useState(0)
  const [lineDrawn, setLineDrawn] = useState(false)
  const [activeAnomalyIndex, setActiveAnomalyIndex] = useState(0)

  // Smooth numeric counter animation on mount
  useEffect(() => {
    const endRisk = 88
    const endNodes = 1420
    const endLatency = 3.8

    const duration = 1600
    const startTime = performance.now()

    const animateNumbers = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)

      setAnimatedRiskScore(Math.round(ease * endRisk))
      setNodesCount(Math.round(ease * endNodes))
      setLatencyMs(parseFloat((ease * endLatency).toFixed(1)))

      if (progress < 1) {
        requestAnimationFrame(animateNumbers)
      } else {
        setLineDrawn(true)
      }
    }

    requestAnimationFrame(animateNumbers)
  }, [])

  // Rotate anomaly markers
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAnomalyIndex(prev => (prev + 1) % 3)
    }, 2800)
    return () => clearInterval(timer)
  }, [])

  const barData = [
    { time: '00:00', val: 24, label: 'Low Triage' },
    { time: '04:00', val: 18, label: 'Baseline' },
    { time: '08:00', val: 45, label: 'Workday Start' },
    { time: '12:00', val: 92, label: 'CVE Exploit Spike' },
    { time: '16:00', val: 78, label: 'Bastion Pivot' },
    { time: '20:00', val: 32, label: 'Contained' },
  ]

  const anomalies = [
    { x: 180, y: 70, label: 'Foothold CVE-2024-3400', time: '12:14' },
    { x: 300, y: 45, label: 'Kerberoast Ticket Spike', time: '14:32' },
    { x: 420, y: 30, label: 'Crown Jewel Hop (P0)', time: '16:48' },
  ]

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-[#121519] border border-[#2A3038] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A3038]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Interactive Security Telemetry & Metrics</span>
          </div>
          <h3 className="text-xl font-bold font-mono text-[#F5F5F5]">
            Real-Time Risk Dynamics & Threat Indicators
          </h3>
          <p className="text-xs text-[#858E9B] font-sans mt-1">
            Deterministic graph telemetry tracking multi-hop escalation and automated containment response.
          </p>
        </div>

        <Badge variant="accent" size="sm">
          Illustrative S1 Benchmark Telemetry
        </Badge>
      </div>

      {/* Top 4 Animated KPI Stat Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B0D0F] border border-[#2A3038] space-y-1 font-mono">
          <div className="text-[11px] text-[#858E9B] uppercase">Graph Nodes Analyzed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5]">
            {nodesCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#34D399] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Topology Synced
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0D0F] border border-[#2A3038] space-y-1 font-mono">
          <div className="text-[11px] text-[#858E9B] uppercase">Mean Cypher Latency</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#FF8559]">
            {latencyMs}ms
          </div>
          <div className="text-[10px] text-[#858E9B] flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            GraphBLAS Sparse Matrix
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0D0F] border border-[#2A3038] space-y-1 font-mono">
          <div className="text-[11px] text-[#858E9B] uppercase">Production Isolation</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#34D399]">
            100%
          </div>
          <div className="text-[10px] text-[#858E9B] flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#34D399]" />
            Strict Read-Only Prod
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0D0F] border border-[#2A3038] space-y-1 font-mono">
          <div className="text-[11px] text-[#858E9B] uppercase">Collateral Disruption</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#34D399]">
            0.0%
          </div>
          <div className="text-[10px] text-[#858E9B]">
            Edmonds-Karp Min-Cut
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Circular Scan Progress & Risk Index (Cols 1-4) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0B0D0F] border border-[#2A3038] flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-mono font-bold text-[#858E9B] uppercase tracking-wider">
            Composite Threat Score
          </span>

          {/* Circular Scan SVG */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="80"
                cy="80"
                r="64"
                stroke="#191D22"
                strokeWidth="10"
                fill="none"
              />
              {/* Animated Progress Arc */}
              <circle
                cx="80"
                cy="80"
                r="64"
                stroke="#FF6B35"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="402"
                strokeDashoffset={402 - (402 * animatedRiskScore) / 100}
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Centered Risk Counter Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-3xl font-extrabold text-[#F5F5F5]">
                {animatedRiskScore}
              </span>
              <span className="text-[10px] text-[#FB7185] font-bold uppercase tracking-wider">
                CRITICAL (0.{animatedRiskScore})
              </span>
            </div>
          </div>

          <div className="w-full space-y-1 text-xs font-mono text-[#858E9B] pt-2 border-t border-[#2A3038]">
            <div className="flex justify-between">
              <span>Lateral Exposure:</span>
              <strong className="text-[#FF8559]">94%</strong>
            </div>
            <div className="flex justify-between">
              <span>Path Directness:</span>
              <strong className="text-[#FBBF24]">3 Hops</strong>
            </div>
            <div className="flex justify-between">
              <span>Target Criticality:</span>
              <strong className="text-[#FB7185]">0.99</strong>
            </div>
          </div>
        </div>

        {/* Center: Threat Activity Bar Chart with Sequential Growth (Cols 5-8) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0B0D0F] border border-[#2A3038] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#F5F5F5] uppercase">Threat Activity Distribution</span>
            <span className="text-[10px] text-[#858E9B]">24h Timeline</span>
          </div>

          {/* Bar Chart Area */}
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {barData.map((item, idx) => {
              const isPeak = item.val >= 70
              return (
                <div key={item.time} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t transition-all duration-700 ease-out ${
                      isPeak
                        ? 'bg-gradient-to-t from-[#FF6B35] to-[#FF8559] shadow-[0_0_12px_rgba(255,107,53,0.3)]'
                        : 'bg-[#22272E] hover:bg-[#3B434D]'
                    }`}
                    style={{
                      height: `${item.val}%`,
                      transitionDelay: `${idx * 120}ms`,
                    }}
                    title={`${item.time}: ${item.val}% threat density (${item.label})`}
                  />
                  {/* Time label */}
                  <span className="text-[10px] font-mono text-[#858E9B]">{item.time}</span>
                </div>
              )
            })}
          </div>

          <div className="text-[11px] font-mono text-[#858E9B] pt-2 border-t border-[#2A3038] flex items-center justify-between">
            <span>Peak Incident: 12:00</span>
            <span className="text-[#FF8559] font-bold">CVE Exploit Spike</span>
          </div>
        </div>

        {/* Right: Risk-Trend Line Chart with Sequential Drawing & Anomaly Markers (Cols 9-12) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0B0D0F] border border-[#2A3038] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#F5F5F5] uppercase">Risk Escalation Trend</span>
            <Badge variant="red" size="sm">
              3 Anomalies
            </Badge>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full h-44 flex items-center justify-center">
            <svg viewBox="0 0 460 140" className="w-full h-full">
              {/* Background Grid Lines */}
              <line x1="20" y1="30" x2="440" y2="30" stroke="#191D22" strokeDasharray="3 3" />
              <line x1="20" y1="70" x2="440" y2="70" stroke="#191D22" strokeDasharray="3 3" />
              <line x1="20" y1="110" x2="440" y2="110" stroke="#191D22" strokeDasharray="3 3" />

              {/* Area fill under curve */}
              <path
                d="M 20 120 Q 100 115, 180 70 T 300 45 T 420 30 L 420 130 L 20 130 Z"
                fill="url(#trend-gradient)"
                opacity="0.15"
              />

              <defs>
                <linearGradient id="trend-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF6B35" />
                  <stop offset="100%" stopColor="#0B0D0F" />
                </linearGradient>
              </defs>

              {/* Animated Line drawing from left to right */}
              <path
                d="M 20 120 Q 100 115, 180 70 T 300 45 T 420 30"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="500"
                strokeDashoffset={lineDrawn ? 0 : 500}
                className="transition-all duration-1200 ease-out"
              />

              {/* Anomaly Markers */}
              {anomalies.map((anom, idx) => {
                const isActive = activeAnomalyIndex === idx
                return (
                  <g key={idx} transform={`translate(${anom.x}, ${anom.y})`}>
                    {isActive && (
                      <circle
                        r="12"
                        fill="#FB7185"
                        fillOpacity="0.25"
                        className="animate-ping"
                        style={{ animationDuration: '1.5s' }}
                      />
                    )}
                    <circle
                      r={isActive ? 5 : 3.5}
                      fill={isActive ? '#FB7185' : '#FF8559'}
                      stroke="#0B0D0F"
                      strokeWidth="2"
                    />
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Active Anomaly Callout */}
          <div className="p-2 rounded-lg bg-[#121519] border border-[#2A3038] text-[11px] font-mono flex items-center justify-between text-[#858E9B]">
            <span className="text-[#FF8559] flex items-center gap-1 font-bold">
              <AlertTriangle className="w-3 h-3 text-[#FB7185]" />
              {anomalies[activeAnomalyIndex].label}
            </span>
            <span>{anomalies[activeAnomalyIndex].time}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
