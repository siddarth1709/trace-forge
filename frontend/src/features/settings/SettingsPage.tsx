import React from 'react'
import { useAuth } from '../../hooks/useAuth.tsx'
import { useWorkspace } from '../../hooks/useWorkspace.tsx'
import { useBackendHealth } from '../../hooks/useBackendHealth.ts'
import { getApiBaseUrl } from '../../api/client.ts'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { useToast } from '../../components/ui/Toast.tsx'
import {
  Settings,
  Shield,
  Layers,
  Database,
  User,
  AlertTriangle,
  Lock,
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { user, updateRole } = useAuth()
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace()
  const { isOnline, health, mode } = useBackendHealth()
  const toast = useToast()

  return (
    <div className="space-y-6 font-mono text-xs max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="sm">System Configuration</Badge>
          <span className="text-slate-400">SOC Environment</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          Platform Settings & Security Architecture
        </h1>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Review system guardrails, active database connections, agent execution mode, and tenant parameters.
        </p>
      </div>

      {/* Safety Guardrails Card */}
      <Card glow="emerald">
        <CardHeader>
          <CardTitle>
            <Shield className="w-4 h-4 text-emerald-400" />
            Active Platform Guardrails & Guarantees
          </CardTitle>
          <Badge variant="emerald">ENFORCED BY POLICY</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-1">
            <div className="font-bold flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              1. Production Read-Only Protection
            </div>
            <p className="font-sans text-xs text-slate-300">
              The production graph ({health?.graph || 'traceforge'}) rejects all write operations via PolicyError. Containment simulation never modifies live assets.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
            <div className="font-bold flex items-center gap-2 text-cyan-400">
              <Database className="w-3.5 h-3.5" />
              2. Isolated Disposable Sandboxes
            </div>
            <p className="font-sans text-xs text-slate-400">
              Simulation graphs are strictly cloned with designated <span className="text-cyan-300 font-mono">tf-sim-*</span> prefixes and dropped after verification.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
            <div className="font-bold flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              3. Prompt Injection Neutralization
            </div>
            <p className="font-sans text-xs text-slate-400">
              Hostile evidence strings (e.g. ticket comments) are parsed strictly with <span className="text-red-300 font-mono">data_only_never_instructions</span>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Backend Connection & Topology Meta */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Database className="w-4 h-4 text-cyan-400" />
            Backend Connection & Telemetry
          </CardTitle>
          <Badge variant={isOnline ? 'emerald' : 'red'}>
            {isOnline ? 'ONLINE' : 'DISCONNECTED'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[11px]">API Base URL</div>
              <div className="font-bold text-slate-100">{getApiBaseUrl()}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[11px]">Target Graph Name</div>
              <div className="font-bold text-emerald-400">{health?.graph || 'traceforge'}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[11px]">Agent Execution Engine</div>
              <div className="font-bold text-cyan-400">
                {mode ? `${mode.mode.toUpperCase()} (${mode.model})` : 'Replay Agent'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[11px]">Allowed Attack Relationships</div>
              <div className="font-bold text-slate-100">
                {Array.isArray(health?.attack_relationships)
                  ? health.attack_relationships.join(', ')
                  : 'USES, AUTHENTICATES_TO, ACCESSES, REACHES'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Management */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Layers className="w-4 h-4 text-amber-400" />
            Workspace & Multi-Tenancy (Simulated UI)
          </CardTitle>
          <Badge variant="amber">DEMO TENANCY</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-400 font-sans text-xs">
            Switching workspaces toggles target graph configurations in the interface. Note that real multi-tenant isolation requires backend authorization enforcement.
          </p>

          <div className="space-y-2">
            {workspaces.map(ws => (
              <div
                key={ws.id}
                onClick={() => {
                  switchWorkspace(ws.id)
                  toast.success('Workspace Switched', `Active workspace set to ${ws.name}`)
                }}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  ws.id === currentWorkspace.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">{ws.name}</div>
                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">{ws.description}</div>
                </div>
                {ws.id === currentWorkspace.id && (
                  <Badge variant="emerald" size="sm">ACTIVE</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analyst Profile & Role Controls */}
      <Card>
        <CardHeader>
          <CardTitle>
            <User className="w-4 h-4 text-purple-400" />
            Analyst Profile & Access Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 font-bold text-lg flex items-center justify-center">
              {user?.avatar || 'AV'}
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm">{user?.name}</div>
              <div className="text-slate-400 text-xs">{user?.email}</div>
              <Badge variant="purple" size="sm" className="mt-1">{user?.role}</Badge>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-400">Change Role Tier:</div>
            <div className="flex flex-wrap gap-2">
              {(['SecOps Analyst', 'Incident Commander', 'Security Admin'] as const).map(role => (
                <Button
                  key={role}
                  variant={user?.role === role ? 'neon' : 'outline'}
                  size="sm"
                  onClick={() => {
                    updateRole(role)
                    toast.success('Role Updated', `Switched role to ${role}`)
                  }}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
