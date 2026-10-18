import React, { useState, useMemo } from 'react'
import { Modal } from '../ui/Modal.tsx'
import { Button } from '../ui/Button.tsx'
import { Badge } from '../ui/Badge.tsx'
import {
  Upload,
  AlertTriangle,
  FileCheck,
  Download,
  ShieldAlert,
  Sparkles,
  Database,
  ArrowRight,
  Server,
} from 'lucide-react'
import { useToast } from '../ui/Toast.tsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dataApi } from '../../api/index.ts'
import type { IngestResponse, SampleDataset } from '../../api/types.ts'

interface ImportReportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: (reportData: IngestResponse) => void
}

interface AutoreadPreviewItem {
  src: string
  dst: string
  description: string
  rel: string
  port?: number
  protocol?: string
  load?: number
  evidence_id?: string
}

interface ValidationReport {
  isValid: boolean
  nodeCount: number
  edgeCount: number
  detectedEndpoints: string[]
  autoreadConnections: AutoreadPreviewItem[]
  warnings: string[]
  errors: string[]
}

// Client-side heuristic parser matching the backend tf_ingest autoreader
const autoreadDescription = (desc: string, explicitRel?: string, defaultLoad = 0) => {
  let rel = explicitRel ? explicitRel.toUpperCase().replace(/\s+/g, '_') : ''
  const props: { port?: number; protocol?: string; load?: number; evidence_id?: string } = {
    load: defaultLoad,
  }

  if (!rel) {
    if (/dump|mimikatz|lsass|credential|steals|extract|token|vault|keychain/i.test(desc)) {
      rel = 'USES'
    } else if (/kerberos|tgs|tgt|login|logon|authenticat|ticket|session|rdp|ssh|privilege|impersonat/i.test(desc)) {
      rel = 'AUTHENTICATES_TO'
    } else if (/sql|database|query|postgres|mysql|oracle|mongo|share|smb|rpc|file|read|write|api|s3|bucket/i.test(desc)) {
      rel = 'ACCESSES'
    } else {
      rel = 'REACHES'
    }
  }

  const portMatch = desc.match(/(?:port\s*|:)(\d{2,5})/i)
  if (portMatch) props.port = parseInt(portMatch[1], 10)

  const protoMatch = desc.match(/\b(rdp|ssh|smb|rpc|kerberos|sql|postgres|mysql|https?|ldap)\b/i)
  if (protoMatch) props.protocol = protoMatch[1].toUpperCase()

  const loadMatch = desc.match(/(?:load\s*=\s*|load\s+of\s+)(\d+)/i)
  if (loadMatch) props.load = parseInt(loadMatch[1], 10)

  const evMatch = desc.match(/\b(ev-[a-z0-9_-]+)\b/i)
  if (evMatch) props.evidence_id = evMatch[1].toUpperCase()

  return { rel, props }
}

const parseAndValidateReport = (text: string, fname: string): ValidationReport => {
  const report: ValidationReport = {
    isValid: false,
    nodeCount: 0,
    edgeCount: 0,
    detectedEndpoints: [],
    autoreadConnections: [],
    warnings: [],
    errors: [],
  }

  const endpointSet = new Set<string>()

  try {
    const isJson = fname.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')

    if (isJson) {
      const json = JSON.parse(text)
      if (!json || typeof json !== 'object') {
        report.errors.push('Root payload must be a JSON object or array')
        return report
      }

      // Structure A: { nodes: [...], edges: [...] }
      if (typeof json === 'object' && !Array.isArray(json)) {
        if (Array.isArray(json.nodes)) {
          json.nodes.forEach((n: Record<string, unknown>, idx: number) => {
            const name = String(n?.name || n?.id || '').trim()
            if (name) endpointSet.add(name)
            else report.warnings.push(`Node at index ${idx} missing name/id`)
          })
        }

        if (Array.isArray(json.edges)) {
          json.edges.forEach((e: Record<string, unknown>, idx: number) => {
            const src = String(e?.src || e?.source || '').trim()
            const dst = String(e?.dst || e?.target || e?.destination || '').trim()
            const desc = String(e?.description || e?.connection_description || e?.details || '').trim()
            const explicitRel = e?.rel || e?.relationship ? String(e?.rel || e?.relationship) : undefined
            const load = Number(e?.load || e?.benign_load || 0)

            if (src && dst) {
              endpointSet.add(src)
              endpointSet.add(dst)
              const { rel, props } = autoreadDescription(desc || `${src} connects to ${dst}`, explicitRel, load)
              report.autoreadConnections.push({
                src,
                dst,
                description: desc || `Direct connection: ${rel}`,
                rel,
                port: props.port,
                protocol: props.protocol,
                load: props.load,
                evidence_id: props.evidence_id || (e?.evidence_id ? String(e.evidence_id) : undefined),
              })
            } else {
              report.warnings.push(`Edge at index ${idx} missing source or destination`)
            }
          })
        }
      }
      // Structure B: [ { source, target, description }, ... ]
      else if (Array.isArray(json)) {
        json.forEach((item: Record<string, unknown>) => {
          const src = String(item?.source || item?.src || item?.source_asset || '').trim()
          const dst = String(item?.target || item?.dst || item?.destination || '').trim()
          const desc = String(item?.description || item?.connection_description || item?.activity || '').trim()
          const explicitRel = item?.rel || item?.relationship ? String(item?.rel || item?.relationship) : undefined
          const load = Number(item?.load || item?.benign_load || 0)

          if (src && dst) {
            endpointSet.add(src)
            endpointSet.add(dst)
            const { rel, props } = autoreadDescription(desc || `${src} connects to ${dst}`, explicitRel, load)
            report.autoreadConnections.push({
              src,
              dst,
              description: desc || `Direct connection: ${rel}`,
              rel,
              port: props.port,
              protocol: props.protocol,
              load: props.load,
              evidence_id: props.evidence_id || (item?.evidence_id ? String(item.evidence_id) : undefined),
            })
          }
        })
      }
    } else {
      // CSV Parsing
      const lines = text.trim().split(/\r?\n/)
      if (lines.length < 2) {
        report.errors.push('CSV must contain a header row and at least 1 data row')
        return report
      }

      const header = lines[0].toLowerCase().split(',').map(s => s.trim().replace(/^["']|["']$/g, '').replace(/[_-]/g, ''))
      const srcCol = header.findIndex(h => ['src', 'source', 'sourceasset', 'from', 'cveid', 'cve', 'vulnerabilityid', 'vulnerability'].includes(h))
      const dstCol = header.findIndex(h => ['dst', 'target', 'destination', 'targetasset', 'to'].includes(h))
      const vendorCol = header.findIndex(h => ['vendorproject', 'vendor', 'project'].includes(h))
      const productCol = header.findIndex(h => ['product', 'affectedproduct'].includes(h))
      const descCol = header.findIndex(h => ['description', 'connectiondescription', 'shortdescription', 'details', 'activity', 'summary', 'vulnerabilityname'].includes(h))
      const relCol = header.findIndex(h => ['rel', 'relationship', 'type'].includes(h))
      const loadCol = header.findIndex(h => ['load', 'benignload', 'weight'].includes(h))
      const evCol = header.findIndex(h => ['evidenceid', 'evidence', 'ev'].includes(h))

      if (srcCol === -1 || (dstCol === -1 && vendorCol === -1 && productCol === -1)) {
        report.errors.push("CSV header must include source/CVE and target/product columns")
      } else {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',')
          const cleanParts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''))

          let src = cleanParts[srcCol] || ''
          let dst = dstCol !== -1 ? cleanParts[dstCol] || '' : ''
          const vendor = vendorCol !== -1 ? cleanParts[vendorCol] || '' : ''
          const prod = productCol !== -1 ? cleanParts[productCol] || '' : ''

          if (!dst && (prod || vendor)) {
            if (prod && prod.toLowerCase() !== 'multiple products' && prod.toLowerCase() !== 'various') {
              dst = vendor ? `${vendor} ${prod}` : prod
            } else {
              dst = vendor || prod
            }
          }

          // Sanitize names to match core.NAME_RE
          src = src.replace(/[^A-Za-z0-9 ._:-]/g, '-').replace(/-+/g, '-').slice(0, 64).trim()
          dst = dst.replace(/[^A-Za-z0-9 ._:-]/g, '-').replace(/-+/g, '-').slice(0, 64).trim()

          const desc = descCol !== -1 ? cleanParts[descCol] || '' : ''
          const explicitRel = relCol !== -1 ? cleanParts[relCol] || undefined : undefined
          const load = loadCol !== -1 ? parseInt(cleanParts[loadCol] || '0', 10) : 0
          const ev = evCol !== -1 ? cleanParts[evCol] : undefined

          if (src && dst) {
            endpointSet.add(src)
            endpointSet.add(dst)
            const { rel, props } = autoreadDescription(desc || `${src} connects to ${dst}`, explicitRel, load)
            report.autoreadConnections.push({
              src,
              dst,
              description: desc || `Direct connection: ${rel}`,
              rel,
              port: props.port,
              protocol: props.protocol,
              load: props.load,
              evidence_id: ev || props.evidence_id,
            })
          }
        }
      }
    }

    // Check prompt injection warnings safely
    const lower = text.toLowerCase()
    if (
      lower.includes('ignore previous instructions') ||
      lower.includes('system note:') ||
      lower.includes('disregard rules')
    ) {
      report.warnings.push(
        'Security notice: Suspicious prompt text detected in telemetry. Quarantined as uninterpreted data.'
      )
    }

    report.detectedEndpoints = Array.from(endpointSet)
    report.nodeCount = report.detectedEndpoints.length
    report.edgeCount = report.autoreadConnections.length

    if (report.edgeCount === 0 && report.errors.length === 0) {
      report.errors.push('No valid endpoint connections could be parsed from the file')
    }

    report.isValid = report.errors.length === 0 && report.edgeCount > 0
  } catch {
    report.errors.push('Malformed file syntax: Failed to parse JSON or CSV structure')
  }

  return report
}

export const ImportReportModal: React.FC<ImportReportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>('samples')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileContent, setFileContent] = useState<string>('')
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch server samples with React Query
  const { data: samplesData, isLoading: loadingSamples } = useQuery({
    queryKey: ['sample-datasets'],
    queryFn: () => dataApi.getSampleDatasets(),
    enabled: isOpen,
  })

  const samples = samplesData?.samples || []

  // Resolve current active sample and content without synchronous setState in effects
  const activeSample = samples.find(s => s.filename === fileName) || (samples.length > 0 ? samples[0] : null)
  const currentContent = fileContent || (activeTab === 'samples' && activeSample ? activeSample.content : '')
  const currentFileName = fileName || (activeTab === 'samples' && activeSample ? activeSample.filename : '')

  const currentValidation = useMemo(() => {
    if (!currentContent) return null
    return parseAndValidateReport(currentContent, currentFileName)
  }, [currentContent, currentFileName])

  const selectSampleDataset = (s: SampleDataset) => {
    setFileName(s.filename)
    setFile(null)
    setFileContent(s.content)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    setFile(selected)
    setFileName(selected.name)
    const reader = new FileReader()
    reader.onload = event => {
      const text = event.target?.result as string
      setFileContent(text)
    }
    reader.readAsText(selected)
  }

  const handleIngestToDatabase = async () => {
    if (!currentValidation?.isValid || !currentContent) return

    setIsProcessing(true)
    try {
      const resp = await dataApi.ingestData({
        graph: 'tf-sim-live',
        content: currentContent,
        format: 'auto',
        replace: replaceExisting,
      })

      // Invalidate relevant React Query caches to trigger immediate re-fetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['graph-view'] }),
        queryClient.invalidateQueries({ queryKey: ['schema'] }),
        queryClient.invalidateQueries({ queryKey: ['paths'] }),
        queryClient.invalidateQueries({ queryKey: ['health'] }),
        queryClient.invalidateQueries({ queryKey: ['cases'] }),
      ])

      toast.success(
        `Database Updated: Ingested ${resp.endpoints_added} endpoints & ${resp.connections_added} autoread connections into FalkorDB!`
      )

      onImportSuccess?.(resp)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to ingest data into database'
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadSampleJson = () => {
    const sample = {
      title: 'Incident Telemetry - Corporate Network Ingestion',
      timestamp: Date.now(),
      nodes: [
        { name: 'Laptop-CEO-Office', type: 'workstation', criticality: 'high' },
        { name: 'Admin-Kerberos-Ticket', type: 'credential', criticality: 'high' },
        { name: 'Core-Domain-Controller', type: 'server', criticality: 'critical' },
      ],
      edges: [
        {
          src: 'Laptop-CEO-Office',
          dst: 'Admin-Kerberos-Ticket',
          description: 'Mimikatz memory dump extracted cached domain credentials from LSASS process memory',
          load: 2,
          evidence_id: 'EV-101',
        },
        {
          src: 'Admin-Kerberos-Ticket',
          dst: 'Core-Domain-Controller',
          description: 'Kerberos authenticated TGS session requested for Domain Controller RPC replication port 135',
          load: 12,
          evidence_id: 'EV-102',
        },
      ],
    }
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-traceforge-autoread.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSampleCsv = () => {
    const csvContent = `src,dst,description,load,evidence_id
Workstation-Finance,Service-Account-Token,"Mimikatz extracted authentication token from memory",4,EV-CSV-01
Service-Account-Token,Billing-Database-Server,"SQL query session opened on Postgres port 5432 with administrative role",45,EV-CSV-02
`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-traceforge-autoread.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getRelBadgeVariant = (rel: string): 'purple' | 'cyan' | 'amber' | 'emerald' => {
    switch (rel) {
      case 'AUTHENTICATES_TO':
        return 'purple'
      case 'USES':
        return 'cyan'
      case 'ACCESSES':
        return 'amber'
      case 'REACHES':
      default:
        return 'emerald'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ingest Real Telemetry & Incident Data" maxWidth="2xl">
      <div className="space-y-4 font-mono text-xs">
        {/* Safety Boundary Banner */}
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-emerald-300 font-bold flex items-center gap-2">
              <span>Automatic Connection Description Autoreader</span>
              <Badge variant="emerald" size="sm">FalkorDB Direct Ingestion</Badge>
            </div>
            <p className="text-[11px] text-emerald-400/80 font-sans leading-relaxed">
              Upload real security events or telemetry. Natural language connection descriptions are automatically parsed
              into canonical graph verbs (<span className="font-mono text-emerald-300">AUTHENTICATES_TO</span>, <span className="font-mono text-emerald-300">USES</span>, <span className="font-mono text-emerald-300">ACCESSES</span>, <span className="font-mono text-emerald-300">REACHES</span>)
              and added as live endpoints in the FalkorDB topology.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'samples'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            1-Click Real Enterprise Datasets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Custom JSON / CSV
          </button>
        </div>

        {/* Tab 1: Real Enterprise Datasets */}
        {activeTab === 'samples' && (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-400 font-sans">
              Select an enterprise security scenario to immediately populate the database with real multi-hop breach telemetry:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {samples.map((s, idx) => {
                const isSelected = currentFileName === s.filename
                const isAD = s.filename.includes('ad_breach')
                const isKev = s.filename.includes('known_exploited') || s.filename.includes('cisa')
                return (
                  <div
                    key={idx}
                    onClick={() => selectSampleDataset(s)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isAD ? (
                          <Server className="w-4 h-4 text-purple-400" />
                        ) : isKev ? (
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Database className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="font-bold text-slate-200 text-xs">
                          {isAD
                            ? 'Active Directory Breach'
                            : isKev
                              ? 'CISA Known Exploited Vulns'
                              : 'AWS Cloud Lateral Movement'}
                        </span>
                      </div>
                      <Badge variant={s.format === 'json' ? 'cyan' : 'emerald'} size="sm">
                        {s.format.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed mb-2">
                      {isAD
                        ? 'LSASS memory dump on workstation → Kerberos TGS to Jump Host → DCSync to Domain Controller → SWIFT SQL database.'
                        : isKev
                          ? 'CISA KEV catalog telemetry: Real-world CVEs and affected enterprise products with autoread exploitation descriptions.'
                          : 'IMDSv1 SSRF credential extraction → AWS ECS cluster session → Aurora PostgreSQL financial database connection.'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{s.filename}</span>
                      <span>{(s.size_bytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                )
              })}
              {loadingSamples && samples.length === 0 && (
                <div className="col-span-2 text-center py-4 text-slate-500 text-xs">
                  Loading sample datasets...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Upload Custom File */}
        {activeTab === 'upload' && (
          <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center space-y-3 bg-slate-900/40 transition-colors">
            <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-300">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <label className="cursor-pointer text-emerald-400 hover:underline font-semibold">
                <span>Choose report or event file</span>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-slate-400"> or drag and drop</span>
              <p className="text-[11px] text-slate-500 font-sans mt-1">
                JSON with <span className="font-mono text-slate-400">nodes/edges</span> or flat events, or CSV with <span className="font-mono text-slate-400">src,dst,description</span>
              </p>
            </div>

            {file && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">{file.name}</span>
                <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>
        )}

        {/* Autoread Preview & Schema Validation */}
        {currentValidation && (
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200 font-bold">Autoread Connection Analysis</span>
              </div>
              <Badge variant={currentValidation.isValid ? 'emerald' : 'red'}>
                {currentValidation.isValid ? 'READY FOR INGESTION' : 'VALIDATION ISSUES'}
              </Badge>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 block">Endpoints Detected</span>
                <span className="text-slate-200 font-bold text-sm">{currentValidation.nodeCount}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 block">Connections Autoread</span>
                <span className="text-cyan-400 font-bold text-sm">{currentValidation.edgeCount}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 block">Target Database</span>
                <span className="text-emerald-400 font-bold text-xs">FalkorDB (traceforge)</span>
              </div>
            </div>

            {/* Live Autoread Connections Table */}
            {currentValidation.autoreadConnections.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                  <span>Autoread Graph Relationships Preview</span>
                  <span className="text-slate-500 font-normal">Descriptions automatically mapped to graph verbs</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {currentValidation.autoreadConnections.map((conn, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap font-semibold text-slate-300">
                          <span className="text-cyan-300">{conn.src}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <Badge variant={getRelBadgeVariant(conn.rel)} size="sm">
                            {conn.rel}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-emerald-300">{conn.dst}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                          {conn.port && (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">
                              port {conn.port}
                            </span>
                          )}
                          {conn.protocol && (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">
                              {conn.protocol}
                            </span>
                          )}
                          {conn.evidence_id && (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                              {conn.evidence_id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans italic truncate">
                        "{conn.description}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings & Errors */}
            {currentValidation.warnings.length > 0 && (
              <div className="space-y-1 pt-1">
                {currentValidation.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {currentValidation.errors.length > 0 && (
              <div className="space-y-1 pt-1">
                {currentValidation.errors.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-red-400 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Database Ingestion Options */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-slate-200 font-semibold block text-xs">Topology Overwrite Mode</span>
            <span className="text-slate-500 text-[11px] font-sans">
              {replaceExisting
                ? 'Clear current graph and replace with newly ingested endpoints'
                : 'Merge endpoints and autoread connections with current graph'}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={e => setReplaceExisting(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 w-4 h-4"
            />
            <span className="text-xs text-slate-300">Replace Graph</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={downloadSampleJson} title="Download JSON template">
              <Download className="w-3.5 h-3.5 mr-1" />
              JSON Template
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadSampleCsv} title="Download CSV template">
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV Template
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="neon"
              size="sm"
              disabled={!currentValidation?.isValid || isProcessing}
              onClick={handleIngestToDatabase}
            >
              {isProcessing ? (
                'Ingesting to FalkorDB...'
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 mr-1.5" />
                  Ingest into FalkorDB
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
