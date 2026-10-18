import React from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export interface RiskRadarProps {
  features: {
    criticality?: number
    exposure?: number
    confidence?: number
    recency?: number
    exploit?: number
  }
}

export const RiskRadar: React.FC<RiskRadarProps> = ({ features }) => {
  const data = [
    { subject: 'Criticality', value: Math.round((features.criticality ?? 0.8) * 100), fullMark: 100 },
    { subject: 'Exposure', value: Math.round((features.exposure ?? 0.6) * 100), fullMark: 100 },
    { subject: 'Confidence', value: Math.round((features.confidence ?? 0.9) * 100), fullMark: 100 },
    { subject: 'Recency', value: Math.round((features.recency ?? 0.75) * 100), fullMark: 100 },
    { subject: 'Exploitability', value: Math.round((features.exploit ?? 0.85) * 100), fullMark: 100 },
  ]

  return (
    <div className="w-full h-64 flex items-center justify-center font-mono">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#2A3038" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#B0B7C3', fontSize: 11, fontFamily: 'monospace' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            stroke="#3B434D"
            tick={{ fill: '#858E9B', fontSize: 9 }}
          />
          <Radar
            name="Risk Contribution"
            dataKey="value"
            stroke="#FF6B35"
            fill="#FF6B35"
            fillOpacity={0.2}
          />
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
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
