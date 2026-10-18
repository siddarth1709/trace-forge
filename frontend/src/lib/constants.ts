export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
  badge?: string
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
  { id: 'overview-doc', label: 'About TRACEFORGE', path: '/', icon: 'Shield', badge: 'Docs' },
  { id: 'attack-graph', label: 'Attack Graph', path: '/graph', icon: 'Network' },
  { id: 'investigations', label: 'Investigations', path: '/investigations', icon: 'SearchCheck' },
  { id: 'defense-lab', label: 'Defense Lab', path: '/defense-lab', icon: 'ShieldAlert', badge: 'Sandbox' },
  { id: 'threat-mapping', label: 'Threat Mapping', path: '/threat-mapping', icon: 'Target' },
  { id: 'risk-analysis', label: 'Risk Analysis', path: '/risk-analysis', icon: 'TrendingUp' },
  { id: 'evidence', label: 'Evidence & Provenance', path: '/evidence', icon: 'FileCheck' },
  { id: 'integrations', label: 'Integrations', path: '/integrations', icon: 'Cable' },
  { id: 'cases', label: 'Cases', path: '/cases', icon: 'FolderArchive' },
  { id: 'audit', label: 'Audit Log', path: '/audit', icon: 'History' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: 'Settings' },
]

export const DEFAULT_ATTACK_SOURCES = [
  'Workstation A',
  'Secondary Foothold',
  'Service Account',
]

export const DEFAULT_ATTACK_TARGET = 'Critical Server'

export const DEMO_WORKSPACES = [
  {
    id: 'ws-prod',
    name: 'Production SecOps (Graph: traceforge)',
    graph: 'traceforge',
    isProduction: true,
    description: 'Live read-only topology connected to FalkorDB production dataset.',
  },
  {
    id: 'ws-seed-test',
    name: 'Staging / Seed Test (Graph: tf-seed-test)',
    graph: 'tf-seed-test',
    isProduction: false,
    description: 'Dedicated test graph for S1 benchmark scenario verification.',
  },
]

export const DISCLAIMERS = {
  SANDBOX_ONLY:
    'SAFETY BOUNDARY: All containment actions and mutations execute exclusively in disposable sandbox graphs (tf-sim-*). The production graph is strictly read-only and is never modified.',
  ADVISORY_ONLY:
    'ADVISORY NOTICE: Graph attack paths and risk metrics are investigative heuristics and not calibrated occurrence probabilities. Human analyst authorization is required before response.',
  DEMO_TENANCY:
    'WORKSPACE DEMO NOTICE: Multi-tenant workspace switching is currently simulated in the UI. Live tenant isolation and granular authorization require corresponding backend policy enforcement.',
}
