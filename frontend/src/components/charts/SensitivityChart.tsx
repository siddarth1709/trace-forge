import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { RiskUncertaintyScenario } from '../../api/types.ts'

export interface SensitivityChartProps {
  scenarios: RiskUncertaintyScenario[]
}

export const SensitivityChart: React.FC<SensitivityChartProps> = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) return null

  const data = scenarios.map(s => ({
    name: s.scenario.replace(/_/g, ' '),
    score: Math.round(s.score * 100),
    lower: Math.round(s.lower_bound * 100),
    upper: Math.round(s.upper_bound * 100),
  }))

  return (
    <div className="w-full h-64 font-mono">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            angle={-15}
            textAnchor="end"
          />
          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0c111a',
              borderColor: '#1e293b',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#f8fafc',
            }}
          />
          <Bar dataKey="score" name="Risk Score (0-100)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
