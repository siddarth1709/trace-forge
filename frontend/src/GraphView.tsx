import { useMemo } from 'react'
import type { GEdge, GNode, GraphData } from './types'

const ATTACK = new Set(['USES', 'AUTHENTICATES_TO', 'ACCESSES'])
const COL_W = 210
const ROW_H = 62
const NODE_W = 160
const NODE_H = 34

export const nameOf = (n: GNode): string => String(n.props.name ?? n.id)

function push<K, V>(m: Map<K, V[]>, k: K, v: V): void {
    const arr = m.get(k)
    if (arr) arr.push(v)
    else m.set(k, [v])
}

export interface Placed {
    node: GNode
    x: number
    y: number
}

export interface Layout {
    edges: GEdge[]
    placed: Map<number, Placed>
    width: number
    height: number
}

/** Layered layout. By default only nodes that can reach the target are shown. */
export function buildLayout(graph: GraphData, target: string, showAll: boolean): Layout {
    const attackEdges = graph.edges.filter((e) => ATTACK.has(e.rel))
    const byId = new Map<number, GNode>(graph.nodes.map((n) => [n.id, n]))

    const touched = new Set<number>()
    for (const e of attackEdges) {
        touched.add(e.src)
        touched.add(e.dst)
    }

    let visible = touched
    if (!showAll) {
        const incoming = new Map<number, number[]>()
        for (const e of attackEdges) push(incoming, e.dst, e.src)
        const keep = new Set<number>()
        const targetNode = graph.nodes.find((n) => nameOf(n) === target)
        if (targetNode) {
            keep.add(targetNode.id)
            const stack = [targetNode.id]
            while (stack.length > 0) {
                const cur = stack.pop() as number
                for (const p of incoming.get(cur) ?? []) {
                    if (!keep.has(p)) {
                        keep.add(p)
                        stack.push(p)
                    }
                }
            }
        }
        visible = keep
    }

    const edges = attackEdges.filter((e) => visible.has(e.src) && visible.has(e.dst))

    // depth = longest distance from a root; relaxation is capped so a cycle cannot loop forever
    const depth = new Map<number, number>()
    for (const id of visible) depth.set(id, 0)
    const limit = visible.size
    for (let i = 0; i < limit; i++) {
        let changed = false
        for (const e of edges) {
            const d = (depth.get(e.src) ?? 0) + 1
            if (d > (depth.get(e.dst) ?? 0) && d <= limit) {
                depth.set(e.dst, d)
                changed = true
            }
        }
        if (!changed) break
    }

    const cols = new Map<number, GNode[]>()
    for (const id of visible) {
        const n = byId.get(id)
        if (n) push(cols, depth.get(id) ?? 0, n)
    }

    const placed = new Map<number, Placed>()
    let maxRows = 1
    let maxCol = 0
    for (const [d, list] of cols) {
        list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
        maxRows = Math.max(maxRows, list.length)
        maxCol = Math.max(maxCol, d)
        list.forEach((n, i) => placed.set(n.id, { node: n, x: 20 + d * COL_W, y: 20 + i * ROW_H }))
    }

    return {
        edges,
        placed,
        width: 40 + maxCol * COL_W + NODE_W,
        height: 40 + (maxRows - 1) * ROW_H + NODE_H,
    }
}

interface Props {
    graph: GraphData | null
    sources: string[]
    target: string
    pathPairs: Set<string>
    cutPairs: Set<string>
    remainingPairs: Set<string>
    showAll: boolean
}

const short = (s: string): string => (s.length > 24 ? `${s.slice(0, 23)}…` : s)

export default function GraphView({ graph, sources, target, pathPairs, cutPairs, remainingPairs, showAll }: Props) {
    const layout = useMemo(() => (graph ? buildLayout(graph, target, showAll) : null), [graph, target, showAll])

    if (!layout) return <div className="empty">Loading graph…</div>
    if (layout.placed.size === 0) {
        return <div className="empty">No attack relationships found. Run seed_traceforge.py, then refresh.</div>
    }

    const srcSet = new Set(sources)
    const { edges, placed, width, height } = layout

    const classify = (key: string): string => {
        if (cutPairs.has(key)) return 'cut'
        if (remainingPairs.has(key)) return 'remaining'
        if (pathPairs.has(key)) return 'path'
        return 'dim'
    }
    const rank: Record<string, number> = { dim: 0, path: 1, remaining: 2, cut: 3 }

    const drawn = edges
        .map((e) => {
            const a = placed.get(e.src)
            const b = placed.get(e.dst)
            if (!a || !b) return null
            const key = `${nameOf(a.node)}>${nameOf(b.node)}`
            return { e, a, b, key, cls: classify(key) }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((p, q) => rank[p.cls] - rank[q.cls])

    return (
        <svg className="graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Attack graph">
            <defs>
                {(['dim', 'path', 'remaining', 'cut'] as const).map((c) => (
                    <marker key={c} id={`arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" className={`arrowhead ${c}`} />
                    </marker>
                ))}
            </defs>

            {drawn.map(({ e, a, b, key, cls }) => {
                const x1 = a.x + NODE_W
                const y1 = a.y + NODE_H / 2
                const x2 = b.x
                const y2 = b.y + NODE_H / 2
                return (
                    <path
                        key={`${e.src}-${e.rel}-${e.dst}`}
                        className={`edge ${cls}`}
                        d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`}
                        markerEnd={`url(#arrow-${cls})`}
                    >
                        <title>{`${key.replace('>', ' → ')} (${e.rel})`}</title>
                    </path>
                )
            })}

            {[...placed.values()].map(({ node, x, y }) => {
                const name = nameOf(node)
                const classes = ['node']
                if (node.props.criticality === 'critical') classes.push('critical')
                if (node.props.type === 'credential') classes.push('credential')
                if (srcSet.has(name)) classes.push('source')
                return (
                    <g key={node.id} transform={`translate(${x} ${y})`}>
                        <rect className={classes.join(' ')} width={NODE_W} height={NODE_H} rx={8} />
                        <text x={NODE_W / 2} y={NODE_H / 2 + 4} textAnchor="middle" className="node-label">
                            {short(name)}
                        </text>
                        <title>{`${name}${node.props.type ? ` (${String(node.props.type)})` : ''}`}</title>
                    </g>
                )
            })}
        </svg>
    )
}