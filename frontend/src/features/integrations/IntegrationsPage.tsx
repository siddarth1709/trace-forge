import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import {
  Cable,
  Database,
  CheckCircle2,
  Clock,
  Shield,
  ExternalLink,
  Server,
  Cloud,
  FileText,
  Lock,
  Layers,
  Settings,
} from 'lucide-react'

interface Connector {
  id: string
  name: string
  category: 'Graph Engine' | 'SIEM & Audit' | 'EDR & Endpoint' | 'Cloud & IAM'
  status: 'CONNECTED' | 'AVAILABLE' | 'PLANNED'
  version?: string
  description: string
  endpoint?: string
  lastSync?: string
  docUrl?: string
}

export const IntegrationsPage: React.FC = () => {
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null)

  const connectors: Connector[] = [
    {
      id: 'falkordb',
      name: 'FalkorDB Graph Engine',
      category: 'Graph Engine',
      status: 'CONNECTED',
      version: 'v0.4.0',
      description: 'Primary low-latency knowledge graph store executing openCypher queries over connected security entities.',
      endpoint: 'localhost:6379 (graph: traceforge)',
      lastSync: 'Live (Streaming)',
    },
    {
      id: 'audit-sqlite',
      name: 'Tamper-Evident Audit DB',
      category: 'SIEM & Audit',
      status: 'CONNECTED',
      version: 'SQLite 3',
      description: 'Local append-only ACID audit trail logging all graph queries, simulation creations, and containment plans.',
      endpoint: 'backend/audit.db',
      lastSync: 'Live (Streaming)',
    },
    {
      id: 'syslog-zeek',
      name: 'Syslog / Zeek NDJSON Stream',
      category: 'SIEM & Audit',
      status: 'AVAILABLE',
      version: 'v1.0 (Parser Ready)',
      description: 'Local NDJSON log ingestion converting authentication events, netflows, and EDR detections into graph edges.',
      endpoint: 'file:///var/log/traceforge/ingest.ndjson',
      lastSync: 'Ready for batch ingestion',
    },
    {
      id: 'report-importer',
      name: 'Security Report Importer',
      category: 'SIEM & Audit',
      status: 'AVAILABLE',
      version: 'v1.0 (Safe Validator)',
      description: 'Client-validated JSON/CSV parser with strict schema checking and untrusted text isolation.',
      endpoint: 'Browser Client Parser',
      lastSync: 'Manual upload',
    },
    {
      id: 'crowdstrike',
      name: 'CrowdStrike Falcon EDR',
      category: 'EDR & Endpoint',
      status: 'PLANNED',
      description: 'Streaming process tree and host authentication events mapped into FalkorDB identity graph.',
      docUrl: 'https://falcon.crowdstrike.com',
    },
    {
      id: 'aws-guardduty',
      name: 'AWS GuardDuty & CloudTrail',
      category: 'Cloud & IAM',
      status: 'PLANNED',
      description: 'EventBridge-triggered ingestion of IAM role assumptions, VPC flows, and S3 access anomalies.',
      docUrl: 'https://aws.amazon.com/guardduty',
    },
    {
      id: 'ms-defender',
      name: 'Microsoft Defender for Endpoint',
      category: 'EDR & Endpoint',
      status: 'PLANNED',
      description: 'Graph API connector ingesting device telemetry, logon sessions, and security alerts.',
      docUrl: 'https://security.microsoft.com',
    },
    {
      id: 'okta-identity',
      name: 'Okta Identity Cloud',
      category: 'Cloud & IAM',
      status: 'PLANNED',
      description: 'System Log API connector mapping multi-tenant users, service accounts, and session tokens into identity nodes.',
      docUrl: 'https://developer.okta.com',
    },
    {
      id: 'sentinelone',
      name: 'SentinelOne Singularity',
      category: 'EDR & Endpoint',
      status: 'PLANNED',
      description: 'Deep Visibility telemetry streaming attack storyboards directly into TRACEFORGE containment simulator.',
      docUrl: 'https://www.sentinelone.com',
    },
  ]

  const categories: Connector['category'][] = [
    'Graph Engine',
    'SIEM & Audit',
    'EDR & Endpoint',
    'Cloud & IAM',
  ]

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="sm">Security Data Fabric</Badge>
            <span className="text-xs font-mono text-slate-400">
              Connected: 2 | Available: 2 | Planned: 5
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <Cable className="w-6 h-6 text-cyan-400" />
            Security Tool Integrations
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-3xl">
            TRACEFORGE synthesizes telemetry across graph databases, endpoint sensors, and cloud identities.
            Supported connectors ingest relationships directly into FalkorDB for rapid attack path discovery.
          </p>
        </div>
      </div>

      {/* Categories */}
      {categories.map(cat => {
        const catConnectors = connectors.filter(c => c.category === cat)
        if (catConnectors.length === 0) return null

        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold border-b border-slate-800 pb-1.5">
              {cat === 'Graph Engine' && <Database className="w-4 h-4 text-emerald-400" />}
              {cat === 'SIEM & Audit' && <FileText className="w-4 h-4 text-cyan-400" />}
              {cat === 'EDR & Endpoint' && <Server className="w-4 h-4 text-amber-400" />}
              {cat === 'Cloud & IAM' && <Cloud className="w-4 h-4 text-purple-400" />}
              <span>{cat}</span>
              <span className="text-[10px] text-slate-500">({catConnectors.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catConnectors.map(connector => (
                <Card
                  key={connector.id}
                  className="hover:border-slate-700 transition-all cursor-pointer"
                  onClick={() => setSelectedConnector(connector)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        {connector.name}
                      </CardTitle>
                      {connector.status === 'CONNECTED' && (
                        <Badge variant="emerald" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                      {connector.status === 'AVAILABLE' && (
                        <Badge variant="cyan" size="sm">
                          <Clock className="w-3 h-3 mr-1" />
                          Available
                        </Badge>
                      )}
                      {connector.status === 'PLANNED' && (
                        <Badge variant="slate" size="sm">
                          Planned
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-slate-400 font-sans text-xs line-clamp-2">
                      {connector.description}
                    </p>

                    {connector.endpoint && (
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono truncate">
                        <span className="text-slate-500">Target: </span>
                        {connector.endpoint}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{connector.version || 'Roadmap 2026'}</span>
                      <span className="text-emerald-400 hover:underline flex items-center gap-1">
                        Configure <Settings className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {/* Detail / Config Modal */}
      {selectedConnector && (
        <Modal
          isOpen={!!selectedConnector}
          onClose={() => setSelectedConnector(null)}
          title={`Connector: ${selectedConnector.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <div className="text-slate-200 font-bold">{selectedConnector.name}</div>
                <div className="text-slate-500 text-[11px]">{selectedConnector.category}</div>
              </div>
              <Badge
                variant={
                  selectedConnector.status === 'CONNECTED'
                    ? 'emerald'
                    : selectedConnector.status === 'AVAILABLE'
                    ? 'cyan'
                    : 'slate'
                }
              >
                {selectedConnector.status}
              </Badge>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[11px] uppercase">Description</label>
              <p className="text-slate-200 font-sans text-xs p-3 rounded bg-slate-900/60 border border-slate-800/80">
                {selectedConnector.description}
              </p>
            </div>

            {selectedConnector.status === 'CONNECTED' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Active Connection Verified
                  </div>
                  <p className="text-[11px] text-emerald-400/80 font-sans">
                    This data source is currently streaming live telemetry into the active TRACEFORGE graph session.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">Active Endpoint</div>
                    <div className="text-slate-200 font-semibold truncate">{selectedConnector.endpoint}</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">Sync Status</div>
                    <div className="text-emerald-400 font-semibold">{selectedConnector.lastSync}</div>
                  </div>
                </div>
              </div>
            )}

            {selectedConnector.status === 'AVAILABLE' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-cyan-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Local Ingestion Available
                  </div>
                  <p className="text-[11px] text-cyan-400/80 font-sans">
                    Parser and schema mapping are fully implemented. You can ingest sample logs or custom reports immediately.
                  </p>
                </div>
                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  <span className="text-slate-500">Schema requirement: </span>
                  Must provide entity names matching graph assets and timestamped relation verbs (e.g. USES, AUTHENTICATES_TO, ACCESSES).
                </div>
              </div>
            )}

            {selectedConnector.status === 'PLANNED' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-slate-200">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Roadmap Integration
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    API integration is currently under development. To connect external enterprise sources in staging,
                    use the CSV/JSON report importer or stream through the local Syslog ingest queue.
                  </p>
                </div>
                {selectedConnector.docUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => window.open(selectedConnector.docUrl, '_blank')}
                  >
                    View Official Documentation
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedConnector(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
