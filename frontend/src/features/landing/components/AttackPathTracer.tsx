import React, { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Terminal,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Button } from '../../../components/ui/Button.tsx'
import { Badge } from '../../../components/ui/Badge.tsx'

interface AttackStep {
  index: number
  time: string
  title: string
  technique: string
  mitreId: string
  source: string
  target: string
  description: string
  cypher: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const ATTACK_STEPS: AttackStep[] = [
  {
    index: 0,
    time: 'T+0.0s',
    title: 'Initial Foothold Compromise',
    technique: 'Exploit Public-Facing Application',
    mitreId: 'T1190',
    source: 'External Threat Actor (194.26.29.11)',
    target: 'Workstation A (10.0.4.12)',
    description: 'Threat actor leverages remote buffer overflow exploit to obtain local execution privileges on user workstation.',
    cypher: "CREATE (a:ThreatActor {ip: '194.26.29.11'})-[r:EXPLOITED {cve: 'CVE-2024-3400'}]->(w:Workstation {name: 'Workstation A'})",
    severity: 'medium',
  },
  {
    index: 1,
    time: 'T+1.4s',
    title: 'Credential Token Harvesting',
    technique: 'Steal Application Access Token',
    mitreId: 'T1528',
    source: 'Workstation A (10.0.4.12)',
    target: 'svc-backup Service Account',
    description: 'Adversary extracts cached high-privilege IAM service token from memory, enabling privilege escalation across the VPC.',
    cypher: "MATCH (w:Workstation {name: 'Workstation A'}), (s:ServiceAccount {name: 'svc-backup'})\nCREATE (w)-[:HARVESTED_CREDENTIAL {privilege: 'Admin'}]->(s)",
    severity: 'high',
  },
  {
    index: 2,
    time: 'T+2.8s',
    title: 'Lateral SSH Bastion Pivot',
    technique: 'Remote Services: SSH',
    mitreId: 'T1021.004',
    source: 'svc-backup Service Account',
    target: 'Bastion Gateway (10.0.2.14)',
    description: 'Token assumes administrative role and creates an encrypted SSH tunnel through the internal bastion host.',
    cypher: "MATCH (s:ServiceAccount {name: 'svc-backup'}), (b:Server {name: 'Bastion Gateway'})\nCREATE (s)-[:AUTHENTICATES_TO {port: 22, type: 'SSH'}]->(b)",
    severity: 'high',
  },
  {
    index: 3,
    time: 'T+4.2s',
    title: 'Crown Jewel Database Penetration',
    technique: 'Data from Local System: PII Access',
    mitreId: 'T1005',
    source: 'Bastion Gateway (10.0.2.14)',
    target: 'Critical Server (10.0.1.100)',
    description: 'Final lateral leap reaches customer database. Without min-cut isolation, full data exfiltration follows immediately.',
    cypher: "MATCH (b:Server {name: 'Bastion Gateway'}), (c:Server {criticality: 'critical'})\nCREATE (b)-[:REACHES {risk: 0.99}]->(c)",
    severity: 'critical',
  },
]

export const AttackPathTracer: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)

  // Step interval timer for deterministic animated playback
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= ATTACK_STEPS.length - 1) {
          return 0 // loop continuously
        }
        return prev + 1
      })
      setSelectedStepIndex(null)
    }, 2400)

    return () => clearInterval(interval)
  }, [isPlaying])

  const activeIndex = selectedStepIndex ?? currentStep
  const activeStepData = ATTACK_STEPS[activeIndex]

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-[#121519] border border-[#2A3038] space-y-6">
      {/* Header and Playback Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A3038]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Deterministic Attack-Path Tracing</span>
          </div>
          <h3 className="text-xl font-bold font-mono text-[#F5F5F5]">
            Chronological Multi-Hop Lateral Intrusion
          </h3>
        </div>

        {/* Media Controls Bar */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentStep(prev => Math.max(0, prev - 1))
              setIsPlaying(false)
            }}
            disabled={currentStep === 0}
            title="Step backward"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-24 justify-center"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 mr-1.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Play
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentStep(prev => Math.min(ATTACK_STEPS.length - 1, prev + 1))
              setIsPlaying(false)
            }}
            disabled={currentStep >= ATTACK_STEPS.length - 1}
            title="Step forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentStep(0)
              setIsPlaying(true)
            }}
            title="Replay from start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Visual Attack Path Progress Rail */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {ATTACK_STEPS.map((step, idx) => {
          const isPast = idx < currentStep
          const isCurrent = idx === currentStep
          const isSelected = idx === selectedStepIndex

          return (
            <div
              key={step.index}
              onClick={() => {
                setSelectedStepIndex(idx)
                setCurrentStep(idx)
                setIsPlaying(false)
              }}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-xs font-mono relative overflow-hidden ${
                isSelected
                  ? 'bg-[#191D22] border-[#FF6B35] shadow-[0_0_15px_rgba(255,107,53,0.15)]'
                  : isCurrent
                    ? 'bg-[#191D22] border-[#FF8559]/70'
                    : isPast
                      ? 'bg-[#121519] border-[#34D399]/40 opacity-85'
                      : 'bg-[#0B0D0F] border-[#2A3038] opacity-50'
              }`}
            >
              {/* Active step indicator line */}
              {isCurrent && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B35] to-[#FF8559] animate-pulse" />
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[#858E9B]">{step.time}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B0D0F] text-[#FF8559] border border-[#2A3038]">
                  {step.mitreId}
                </span>
              </div>

              <div className="font-bold text-[#F5F5F5] truncate text-xs">{step.title}</div>
              <div className="text-[11px] text-[#858E9B] truncate mt-1">
                {step.source.split(' ')[0]} → {step.target.split(' ')[0]}
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className={isPast || isCurrent ? 'text-[#FF8559] font-bold' : 'text-[#858E9B]'}>
                  {isPast ? 'COMPROMISED' : isCurrent ? 'IN PROGRESS' : 'PENDING'}
                </span>
                {isPast ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-ping" />
                ) : (
                  <Lock className="w-3 h-3 text-[#858E9B]" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Step Detailed Forensic Deep Dive */}
      <div className="p-5 rounded-xl bg-[#0B0D0F] border border-[#2A3038] grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="accent" size="sm">
              PHASE {activeStepData.index + 1} OF 4
            </Badge>
            <span className="text-[#858E9B]">TECHNIQUE:</span>
            <span className="text-[#F5F5F5] font-bold">
              {activeStepData.technique} ({activeStepData.mitreId})
            </span>
          </div>

          <p className="text-xs text-[#B0B7C3] font-sans leading-relaxed">
            {activeStepData.description}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#121519] border border-[#2A3038]">
              <span className="text-[#858E9B] block text-[10px]">ORIGIN ENTITY:</span>
              <span className="text-[#60A5FA] font-bold truncate block">{activeStepData.source}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#121519] border border-[#2A3038]">
              <span className="text-[#858E9B] block text-[10px]">DESTINATION ASSET:</span>
              <span className="text-[#FB7185] font-bold truncate block">{activeStepData.target}</span>
            </div>
          </div>
        </div>

        {/* Cypher Representation */}
        <div className="lg:col-span-5 p-3.5 rounded-xl bg-[#121519] border border-[#2A3038] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#858E9B] pb-1 border-b border-[#2A3038]">
            <span className="flex items-center gap-1.5 text-[#FF8559]">
              <Terminal className="w-3.5 h-3.5" />
              Graph Traversal Hop
            </span>
            <span className="text-[#34D399] font-bold">EXEC OK</span>
          </div>
          <pre className="text-[10px] text-[#B0B7C3] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {activeStepData.cypher}
          </pre>
          <div className="pt-2 text-[10px] text-[#858E9B] flex items-center justify-between border-t border-[#2A3038]">
            <span>Latency: 2.1ms</span>
            <span className="text-[#FF8559]">Severity: {activeStepData.severity.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
