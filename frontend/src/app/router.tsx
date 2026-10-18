import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell.tsx'
import { OverviewPage } from '../features/overview/OverviewPage.tsx'
import { AttackGraphPage } from '../features/attack-graph/AttackGraphPage.tsx'
import { InvestigationsPage } from '../features/investigations/InvestigationsPage.tsx'
import { DefenseLabPage } from '../features/defense-lab/DefenseLabPage.tsx'
import { ThreatMappingPage } from '../features/threat-mapping/ThreatMappingPage.tsx'
import { RiskAnalysisPage } from '../features/risk-analysis/RiskAnalysisPage.tsx'
import { EvidenceProvenancePage } from '../features/evidence/EvidenceProvenancePage.tsx'
import { IntegrationsPage } from '../features/integrations/IntegrationsPage.tsx'
import { CasesPage } from '../features/cases/CasesPage.tsx'
import { CaseDetailPage } from '../features/cases/CaseDetailPage.tsx'
import { AuditPage } from '../features/audit/AuditPage.tsx'
import { SettingsPage } from '../features/settings/SettingsPage.tsx'
import { LoginPage } from '../features/auth/LoginPage.tsx'
import { LandingPage } from '../features/landing/LandingPage.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/landing',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AppShell />,
    children: [
      {
        path: '/dashboard',
        element: <OverviewPage />,
      },
      {
        path: '/graph',
        element: <AttackGraphPage />,
      },
      {
        path: '/investigations',
        element: <InvestigationsPage />,
      },
      {
        path: '/defense-lab',
        element: <DefenseLabPage />,
      },
      {
        path: '/threat-mapping',
        element: <ThreatMappingPage />,
      },
      {
        path: '/risk-analysis',
        element: <RiskAnalysisPage />,
      },
      {
        path: '/evidence',
        element: <EvidenceProvenancePage />,
      },
      {
        path: '/integrations',
        element: <IntegrationsPage />,
      },
      {
        path: '/cases',
        element: <CasesPage />,
      },
      {
        path: '/cases/:caseId',
        element: <CaseDetailPage />,
      },
      {
        path: '/audit',
        element: <AuditPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
