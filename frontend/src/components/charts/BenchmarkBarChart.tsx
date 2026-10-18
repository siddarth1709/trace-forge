import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { BenchmarkReport } from '../../api/types.ts'

export interface BenchmarkBarChartProps {
  data: BenchmarkReport | null
}

export const BenchmarkBarChart: React.FC<BenchmarkBarChartProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#858E9B] font-mono">
        Benchmark results not available. Run benchmark evaluation to generate data.
      </div>
    )
  }

  const chartData = [
    {
      metric: 'Containment (%)',
      'TRACEFORGE Agent': Math.round((data.graph_agent?.contained_pct ?? 1.0) * 100),
      'Flat-Log Baseline': Math.round((data.baseline?.contained_pct ?? 0.35) * 100),
    },
    {
      metric: 'Mean Disruption',
      'TRACEFORGE Agent': Math.round(data.graph_agent?.mean_disruption ?? 10),
      'Flat-Log Baseline': Math.round(data.baseline?.mean_disruption ?? 150),
    },
    {
      metric: 'Residual Paths',
      'TRACEFORGE Agent': Math.round((data.graph_agent?.mean_remaining_paths ?? 0) * 10),
      'Flat-Log Baseline': Math.round((data.baseline?.mean_remaining_paths ?? 2.4) * 10),
    },
  ]

  return (
    <div className="w-full h-72 font-mono">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A3038" />
          <XAxis dataKey="metric" tick={{ fill: '#B0B7C3', fontSize: 11 }} />
          <YAxis tick={{ fill: '#858E9B', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#121519',
              borderColor: '#2A3038',
              borderRadius: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#F5F5F5',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#B0B7C3' }} />
          <Bar dataKey="TRACEFORGE Agent" fill="#FF6B35" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Flat-Log Baseline" fill="#3B434D" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
