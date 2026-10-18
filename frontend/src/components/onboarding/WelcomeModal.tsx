import React, { useState } from 'react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Badge } from '../ui/Badge.tsx'
import {
  Shield,
  Play,
  Cable,
  Upload,
  ArrowRight,
} from 'lucide-react'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectOptionA: () => void // Try the demo
  onSelectOptionB: () => void // Connect tools
  onSelectOptionC: () => void // Import report
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onSelectOptionA,
  onSelectOptionB,
  onSelectOptionC,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handleDismiss = () => {
    localStorage.setItem('traceforge_onboarding_dismissed', 'true')
    onClose()
  }

  const handleChooseA = () => {
    handleDismiss()
    onSelectOptionA()
  }

  const handleChooseB = () => {
    handleDismiss()
    onSelectOptionB()
  }

  const handleChooseC = () => {
    handleDismiss()
    onSelectOptionC()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} maxWidth="lg">
      <div className="space-y-6 font-mono text-xs">
        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-slate-100">
            Security investigations, made simpler.
          </h2>
          <p className="text-slate-400 font-sans text-xs max-w-md mx-auto">
            Connect your security data or explore how TRACEFORGE investigates connected attack paths.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Badge variant="cyan" size="sm">FalkorDB Graph Hacks 2026</Badge>
            <Badge variant="emerald" size="sm">Track 01 — Agents That Act on Connected Data</Badge>
          </div>
        </div>

        {/* 3 Entry Options */}
        <div className="space-y-3">
          {/* Option A — Try the demo (PRIMARY ACTION) */}
          <div
            onClick={handleChooseA}
            className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/60 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0 mt-0.5">
                  <Play className="w-5 h-5 fill-emerald-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm group-hover:text-emerald-300 transition-colors">
                      Option A — Try the Demo
                    </span>
                    <Badge variant="emerald" size="sm">PRIMARY ACTION</Badge>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Enter the live TRACEFORGE sample environment. Query FalkorDB graph topology, discover multi-hop attack routes, recommend containment cuts, obtain human authorization, and independently verify in an isolated sandbox.
                  </p>
                  <div className="text-[10px] text-emerald-400/80 font-mono pt-1">
                    Uses live demonstration dataset in <code className="text-emerald-300 font-semibold">traceforge</code>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-400 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Option B — Connect my security tools */}
          <div
            onClick={handleChooseB}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5">
                  <Cable className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm group-hover:text-cyan-300 transition-colors">
                      Option B — Connect My Security Tools
                    </span>
                    <Badge variant="cyan" size="sm">INTEGRATIONS</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Explore available and planned telemetry connectors for FalkorDB, Syslog, Zeek, CrowdStrike Falcon, AWS GuardDuty, and Okta Identity Cloud.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Option C — Import a security report */}
          <div
            onClick={handleChooseC}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm group-hover:text-amber-300 transition-colors">
                      Option C — Import a Security Report
                    </span>
                    <Badge variant="amber" size="sm">SAFE INGESTION</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Upload an existing incident report in JSON or CSV. Validates structure and quarantines content as untrusted data to prevent prompt injection.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <label className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Don&apos;t show automatically on start</span>
          </label>

          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Skip to Dashboard
          </Button>
        </div>
      </div>
    </Modal>
  )
}
