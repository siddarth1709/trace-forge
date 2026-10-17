import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { api } from './api'
import GraphView from './GraphView'
import { EvidenceList, HypothesisList, ProposalCard, ResultCard, StatusBadge, StepList } from './Panels'
import type { AuditRow, Bench, Case, GraphData, PathRec } from './types'
import './App.css'

type Tab = 'investigate' | 'travel' | 'audit' | 'benchmark'

const ATTACK = new Set(['USES', 'AUTHENTICATES_TO', 'ACCESSES'])
const EMPTY = new Set<string>()
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e))

function pairs(paths: { nodes: string[] }[]): Set<string> {
  const s = new Set<string>()
  for (const p of paths) for (let i = 0; i < p.nodes.length - 1; i++) s.add(`${p.nodes[i]}>${p.nodes[i + 1]}`)
  return s
}

interface TabProps {
  graph: GraphData | null
  sources: string[]
  target: string
  showAll: boolean
}

function TravelTab({ graph, sources, target, showAll }: TabProps) {
  const range = useMemo(() => {
    const ts = graph
      ? graph.edges
        .filter((e) => ATTACK.has(e.rel))
        .map((e) => Number(e.props.observed_at))
        .filter((t) => Number.isFinite(t))
      : []
    return ts.length > 0 ? ([Math.min(...ts), Math.max(...ts)] as const) : null
  }, [graph])

  const [asOf, setAsOf] = useState<number | null>(null)
  const [paths, setPaths] = useState<PathRec[]>([])
  const [err, setErr] = useState<string | null>(null)
  const value = asOf ?? (range ? range[1] : 0)

  useEffect(() => {
    if (!range) return
    let alive = true
    const timer = window.setTimeout(() => {
      api
        .post<{ paths: PathRec[] }>('/trace', { sources, target, as_of: value })
        .then((r) => {
          if (alive) {
            setPaths(r.paths)
            setErr(null)
          }
        })
        .catch((e: unknown) => {
          if (alive) setErr(errText(e))
        })
    }, 200)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [range, sources, target, value])

  const pathPairs = useMemo(() => pairs(paths), [paths])

  if (!range) return <p className="muted">No timestamped attack relationships found. Run seed_traceforge.py first.</p>

  return (
    <div className="split">
      <section className="card">
        <GraphView graph={graph} sources={sources} target={target} pathPairs={pathPairs} cutPairs={EMPTY} remainingPairs={EMPTY} showAll={showAll} />
      </section>
      <section className="card">
        <h3>Time travel</h3>
        <p className="muted">Drag to see which attack paths existed at a point in time. Each hop must be observed no later than the chosen time.</p>
        <input
          type="range"
          min={range[0]}
          max={range[1]}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAsOf(Number(e.target.value))}
        />
        <p>
          Time <b>{value}</b>: <b>{paths.length}</b> attack path(s)
        </p>
        {err && <p className="warn">{err}</p>}
        <ul>
          {paths.map((p) => (
            <li key={p.id}>
              <b>{p.id}</b> {p.nodes.join(' → ')}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function AuditTab() {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .get<AuditRow[]>('/audit?limit=100')
      .then((r) => {
        if (alive) setRows(r)
      })
      .catch((e: unknown) => {
        if (alive) setErr(errText(e))
      })
    return () => {
      alive = false
    }
  }, [])

  if (err) return <p className="warn">{err}</p>
  if (!rows) return <p className="muted">Loading…</p>
  return (
    <section className="card">
      <h3>Audit trail</h3>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Tool</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.ts}-${r.tool}`}>
              <td>{new Date(r.ts * 1000).toLocaleTimeString()}</td>
              <td>{r.tool}</td>
              <td className="muted">{JSON.stringify(r.summary).slice(0, 140)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function BenchmarkTab() {
  const [bench, setBench] = useState<Bench | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .get<Bench>('/benchmark')
      .then((r) => {
        if (alive) setBench(r)
      })
      .catch((e: unknown) => {
        if (alive) setErr(errText(e))
      })
    return () => {
      alive = false
    }
  }, [])

  if (err) return <p className="warn">{err}</p>
  if (!bench) return <p className="muted">Loading…</p>
  const rows: [string, typeof bench.graph_agent][] = [
    ['Graph agent', bench.graph_agent],
    ['Flat-log baseline', bench.baseline],
  ]
  return (
    <section className="card">
      <h3>Graph agent vs flat-log baseline ({bench.n} seeded variants)</h3>
      <table>
        <thead>
          <tr>
            <th />
            <th>Fully contained</th>
            <th>Paths remaining</th>
            <th>Benign disruption</th>
            <th>Time (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{a.contained_pct}%</td>
              <td>{a.mean_remaining_paths}</td>
              <td>{a.mean_disruption}</td>
              <td>{a.mean_ms}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Cut matches ground-truth minimum: <b>{bench.graph_cut_matches_truth_pct}%</b>. Agrees with an independent networkx check:{' '}
        <b>{bench.graph_agrees_with_networkx_pct}%</b>.
      </p>
      <p className="muted">{bench.limits}</p>
    </section>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('investigate')
  const [sourcesText, setSourcesText] = useState('Workstation A, Secondary Foothold, Service Account')
  const [target, setTarget] = useState('Critical Server')
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [health, setHealth] = useState('checking')
  const [mode, setMode] = useState('')
  const [current, setCurrent] = useState<Case | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const sources = useMemo(
    () =>
      sourcesText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [sourcesText],
  )

  useEffect(() => {
    let alive = true
    api
      .get<{ status: string }>('/health')
      .then(() => {
        if (alive) setHealth('ok')
      })
      .catch((e: unknown) => {
        if (alive) {
          setHealth('down')
          setError(errText(e))
        }
      })
    api
      .get<{ mode: string }>('/mode')
      .then((m) => {
        if (alive) setMode(m.mode)
      })
      .catch(() => undefined)
    api
      .get<GraphData>('/graph')
      .then((g) => {
        if (alive) setGraph(g)
      })
      .catch((e: unknown) => {
        if (alive) setError(errText(e))
      })
    return () => {
      alive = false
    }
  }, [reloadKey])

  async function run() {
    setBusy(true)
    setError(null)
    setCurrent(null)
    try {
      setCurrent(await api.post<Case>('/investigate', { sources, target }))
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function decide(approve: boolean) {
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      setCurrent(await api.post<Case>(`/cases/${current.id}/approve`, { approve, approver: 'analyst' }))
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const pathPairs = useMemo(() => pairs(current?.paths ?? []), [current])
  const cutPairs = useMemo(
    () => (current?.proposal && !current.verification ? new Set(current.proposal.cut.map((c) => `${c.src}>${c.dst}`)) : EMPTY),
    [current],
  )
  const remainingPairs = useMemo(() => pairs(current?.verification?.remaining_paths ?? []), [current])

  const tabs: [Tab, string][] = [
    ['investigate', 'Investigate'],
    ['travel', 'Time travel'],
    ['audit', 'Audit'],
    ['benchmark', 'Benchmark'],
  ]

  return (
    <div className="app">
      <header>
        <h1>TRACEFORGE</h1>
        <span className={`dot ${health}`} title={`API ${health}`} />
        <span className="muted">{mode ? `AI mode: ${mode}` : ''}</span>
        <nav>
          {tabs.map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
          Refresh
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      {tab === 'investigate' && (
        <div className="split">
          <section className="card">
            <GraphView
              graph={graph}
              sources={sources}
              target={target}
              pathPairs={pathPairs}
              cutPairs={cutPairs}
              remainingPairs={remainingPairs}
              showAll={showAll}
            />
            <div className="legend">
              <span className="lg path">attack path</span>
              <span className="lg cut">proposed cut</span>
              <span className="lg remaining">still reachable</span>
              <label>
                <input type="checkbox" checked={showAll} onChange={(e: ChangeEvent<HTMLInputElement>) => setShowAll(e.target.checked)} /> show
                all attack-type nodes
              </label>
            </div>
          </section>

          <section className="side">
            <div className="card">
              <h3>Investigate</h3>
              <label className="field">
                Starting points (comma separated)
                <input value={sourcesText} onChange={(e: ChangeEvent<HTMLInputElement>) => setSourcesText(e.target.value)} />
              </label>
              <label className="field">
                Critical asset
                <input value={target} onChange={(e: ChangeEvent<HTMLInputElement>) => setTarget(e.target.value)} />
              </label>
              <button type="button" className="primary" disabled={busy || sources.length === 0} onClick={run}>
                {busy && !current ? 'Investigating…' : 'Run investigation'}
              </button>
              {current && (
                <p>
                  Case <code>{current.id}</code> <StatusBadge status={current.status} />
                  {current.risk && <span className="muted"> risk {current.risk.score} ({current.risk.version})</span>}
                </p>
              )}
              {current?.status === 'needs_analyst' && (
                <p className="warn">{current.decision?.reason ?? 'Not enough evidence to propose containment. Escalate to an analyst.'}</p>
              )}
              {current?.error && <p className="warn">{current.error}</p>}
            </div>

            {current?.proposal && (
              <div className="card">
                <h3>Containment proposal</h3>
                <ProposalCard proposal={current.proposal} status={current.status} busy={busy} onDecide={decide} />
              </div>
            )}

            {current?.verification && (
              <div className="card">
                <h3>Verified result</h3>
                <ResultCard c={current} />
              </div>
            )}

            {current && (
              <>
                <div className="card">
                  <h3>Hypotheses</h3>
                  <HypothesisList items={current.hypotheses} decision={current.decision} />
                </div>
                <div className="card">
                  <h3>Evidence</h3>
                  <EvidenceList items={current.evidence} />
                </div>
                <div className="card">
                  <h3>Agent steps (through MCP)</h3>
                  <StepList steps={current.steps} />
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {tab === 'travel' && <TravelTab graph={graph} sources={sources} target={target} showAll={showAll} />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'benchmark' && <BenchmarkTab />}
    </div>
  )
}