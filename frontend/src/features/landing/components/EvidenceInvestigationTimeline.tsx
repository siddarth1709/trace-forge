import React, { useState } from 'react'
import {
  FileCheck,
  CheckCircle2,
  RotateCcw,
  Terminal,
} from 'lucide-react'
import { Badge } from '../../../components/ui/Badge.tsx'
import { Button } from '../../../components/ui/Button.tsx'

interface TimelineEvent {
  id: string
  time: string
  title: string
  classification: 'observed' | 'inferred' | 'simulated'
  source: string
  confidence: number
  description: string
  evidencePayload: Record<string, unknown>
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'EV-01',
    time: '12:04:15 UTC',
    title: 'Workstation A Process Injection Alert',
    classification: 'observed',
    source: 'CrowdStrike Falcon Sensor (host-04)',
    confidence: 0.98,
    description: 'Suspicious memory execution detected in powershell.exe spawned from external network listener.',
    evidencePayload: {
      pid: 4892,
      parent: 'explorer.exe',
      hash_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      action: 'PROCESS_INJECTION',
    },
  },
  {
    id: 'EV-02',
    time: '12:05:40 UTC',
    title: 'Kerberos TGS Service Ticket Requested',
    classification: 'observed',
    source: 'Active Directory DC-01 (Event ID 4769)',
    confidence: 0.94,
    description: 'Kerberos Service Ticket for svc-backup requested with RC4 encryption (potential Kerberoasting attempt).',
    evidencePayload: {
      account: 'svc-backup',
      ticket_encryption: '0x17 (RC4-HMAC)',
      client_address: '10.0.4.12',
    },
  },
  {
    id: 'REL-01',
    time: '12:06:12 UTC',
    title: 'Autonomous Graph Traversal: Inferred Attack Path',
    classification: 'inferred',
    source: 'FalkorDB Cypher Engine',
    confidence: 0.91,
    description: 'TRACEFORGE agent traverses graph edges connecting svc-backup privileges to internal Bastion SSH keypairs.',
    evidencePayload: {
      path_length: 3,
      discovered_hops: ['Workstation A', 'svc-backup', 'Bastion Gateway', 'Critical Server'],
      query_ms: 3.4,
    },
  },
  {
    id: 'EV-03',
    time: '12:07:33 UTC',
    title: 'Bastion Gateway Outbound Administrative Session',
    classification: 'observed',
    source: 'AWS VPC Flow Logs (eni-08d4b3a)',
    confidence: 0.99,
    description: 'Direct administrative SSH connection initiated from Bastion to Customer PII database on port 22.',
    evidencePayload: {
      src_ip: '10.0.2.14',
      dst_ip: '10.0.1.100',
      dst_port: 22,
      protocol: 'TCP',
    },
  },
  {
    id: 'SIM-01',
    time: '12:08:00 UTC',
    title: 'Sandbox Simulation: Edmonds-Karp Minimum-Cut',
    classification: 'simulated',
    source: 'Disposable Sandbox Graph (tf-sim-eval-01)',
    confidence: 1.0,
    description: 'Dry-run containment cuts 2 active edges. Zero collateral business disruption verified prior to human authorization.',
    evidencePayload: {
      cut_edges: 2,
      residual_capacity: 0.0,
      benign_impact: '0.0%',
      sandbox_status: 'ISOLATED_OK',
    },
  },
]

export const EvidenceInvestigationTimeline: React.FC = () => {
  const [revealedCount, setRevealedCount] = useState<number>(TIMELINE_EVENTS.length)
  const [selectedEventId, setSelectedEventId] = useState<string>(TIMELINE_EVENTS[0].id)
  const [filterType, setFilterType] = useState<'all' | 'observed' | 'inferred' | 'simulated'>('all')

  const handleReplay = () => {
    setRevealedCount(1)
    let current = 1
    const timer = setInterval(() => {
      current += 1
      setRevealedCount(current)
      if (current >= TIMELINE_EVENTS.length) {
        clearInterval(timer)
      }
    }, 600)
  }

  const filteredEvents = TIMELINE_EVENTS.slice(0, revealedCount).filter(
    e => filterType === 'all' || e.classification === filterType
  )

  const selectedEvent =
    TIMELINE_EVENTS.find(e => e.id === selectedEventId) || TIMELINE_EVENTS[0]

  const getClassificationBadge = (type: TimelineEvent['classification']) => {
    switch (type) {
      case 'observed':
        return <Badge variant="cyan" size="sm">OBSERVED TELEMETRY</Badge>
      case 'inferred':
        return <Badge variant="accent" size="sm">INFERRED RELATIONSHIP</Badge>
      case 'simulated':
        return <Badge variant="emerald" size="sm">SIMULATED SANDBOX</Badge>
    }
  }

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-[#121519] border border-[#2A3038] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A3038]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#FF8559] uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" />
            <span>Forensic Evidence & Provenance</span>
          </div>
          <h3 className="text-xl font-bold font-mono text-[#F5F5F5]">
            Chronological Investigation Timeline
          </h3>
          <p className="text-xs text-[#858E9B] font-sans mt-1">
            Reconstruct multi-hop intrusions from raw telemetry to autonomous graph inference and sandbox validation.
          </p>
        </div>

        {/* Filter and Replay Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {(['all', 'observed', 'inferred', 'simulated'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-md text-[11px] uppercase transition-colors duration-180 cursor-pointer ${
                filterType === type
                  ? 'bg-[#321E17] text-[#FF8559] border border-[#FF6B35]/40 font-bold'
                  : 'bg-[#191D22] text-[#858E9B] hover:text-[#F5F5F5] border border-[#2A3038]'
              }`}
            >
              {type}
            </button>
          ))}

          <Button variant="ghost" size="sm" onClick={handleReplay} title="Replay timeline reveal">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Replay
          </Button>
        </div>
      </div>

      {/* Two Column Grid: Timeline Rail + Forensic Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Left Column: Timeline items (Cols 1-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#2A3038]">
            {filteredEvents.map((evt, idx) => {
              const isSelected = selectedEvent.id === evt.id

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#191D22] border-[#FF6B35] shadow-[0_0_15px_rgba(255,107,53,0.12)]'
                      : 'bg-[#0B0D0F] border-[#2A3038] hover:border-[#3B434D]'
                  }`}
                  style={{
                    animation: `fadeInUp 0.35s ease-out ${idx * 0.08}s both`,
                  }}
                >
                  {/* Timeline Node Bullet */}
                  <div
                    className={`absolute -left-[1.85rem] top-5 w-3 h-3 rounded-full border-2 ${
                      isSelected
                        ? 'bg-[#FF6B35] border-[#FF8559] ring-4 ring-[#321E17]'
                        : evt.classification === 'observed'
                          ? 'bg-[#60A5FA] border-[#121519]'
                          : evt.classification === 'inferred'
                            ? 'bg-[#FF8559] border-[#121519]'
                            : 'bg-[#34D399] border-[#121519]'
                    }`}
                  />

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] text-[#858E9B]">{evt.time}</span>
                    {getClassificationBadge(evt.classification)}
                  </div>

                  <h4 className="text-xs font-bold text-[#F5F5F5]">{evt.title}</h4>
                  <p className="text-[11px] text-[#858E9B] font-sans mt-1 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-[#2A3038] flex items-center justify-between text-[10px] text-[#858E9B]">
                    <span>Source: {evt.source.split(' ')[0]}</span>
                    <span className="text-[#34D399]">
                      Confidence: {(evt.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Evidence Inspector Panel (Cols 8-12) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-[#0B0D0F] border border-[#2A3038] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3038]">
              <span className="text-[10px] text-[#858E9B] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#FF8559]" />
                Evidence Provenance Inspector
              </span>
              <span className="text-xs font-bold text-[#FF8559]">{selectedEvent.id}</span>
            </div>

            <div>
              <div className="text-sm font-bold text-[#F5F5F5]">{selectedEvent.title}</div>
              <div className="text-xs text-[#858E9B] mt-0.5">{selectedEvent.source}</div>
            </div>

            <div className="p-3 rounded-lg bg-[#121519] border border-[#2A3038] space-y-2 text-[11px]">
              <div className="text-[#858E9B] uppercase text-[10px]">Classification:</div>
              <div>{getClassificationBadge(selectedEvent.classification)}</div>
              <div className="text-[#858E9B] uppercase text-[10px] pt-1">Event Timestamp:</div>
              <div className="text-[#F5F5F5]">{selectedEvent.time}</div>
            </div>

            {/* Raw JSON Payload */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-[#858E9B] uppercase block">
                Structured Provenance Payload
              </span>
              <pre className="p-3 rounded-lg bg-[#121519] border border-[#2A3038] text-[10px] text-[#34D399] overflow-x-auto max-h-40 font-mono leading-relaxed">
                {JSON.stringify(selectedEvent.evidencePayload, null, 2)}
              </pre>
            </div>
          </div>

          <div className="pt-3 border-t border-[#2A3038] flex items-center justify-between text-[10px] text-[#858E9B]">
            <span className="flex items-center gap-1 text-[#34D399]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cryptographic Hash Verified
            </span>
            <span>Immutable Log</span>
          </div>
        </div>
      </div>
    </div>
  )
}
