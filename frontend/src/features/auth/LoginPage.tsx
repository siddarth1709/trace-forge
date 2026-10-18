import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type UserProfile } from '../../hooks/useAuth.tsx'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Input, Select } from '../../components/ui/Input.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Lock, AlertTriangle } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('analyst@traceforge.internal')
  const [role, setRole] = useState<UserProfile['role']>('SecOps Analyst')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login(email, role)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center p-4 font-mono text-xs selection:bg-[#321E17] selection:text-[#FF8559]">
      <div className="max-w-md w-full space-y-6">
        {/* Logo and Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-[#0B0D0F] border border-[#2A3038] shadow-[0_0_25px_rgba(6,182,212,0.25)]">
            <img src="/logo.png" alt="TRACEFORGE Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-[#F5F5F5]">TRACEFORGE</h1>
          <p className="text-xs text-[#858E9B] font-sans">
            Graph-Theoretic Attack Disruption & Autonomous Simulation
          </p>
        </div>

        {/* Login Card */}
        <Card glow="accent" className="bg-[#121519] border-[#2A3038]">
          <CardHeader>
            <CardTitle>
              <Lock className="w-4 h-4 text-[#FF8559]" />
              SecOps Analyst Authentication
            </CardTitle>
            <Badge variant="accent">Simulated Auth Session</Badge>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[10px] uppercase text-[#858E9B] block mb-1">
                  Analyst Corporate Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="analyst@traceforge.internal"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#858E9B] block mb-1">
                  Security Clearance Tier
                </label>
                <Select
                  value={role}
                  onChange={e => setRole(e.target.value as UserProfile['role'])}
                >
                  <option value="SecOps Analyst">SecOps Analyst (Tier 1/2 Triage)</option>
                  <option value="Incident Commander">Incident Commander (Authorization Lead)</option>
                  <option value="Security Admin">Security Admin (Full Policy Control)</option>
                </Select>
              </div>

              <div className="p-3 rounded-xl bg-[#191D22] border border-[#2A3038] text-[11px] text-[#B0B7C3] font-sans space-y-1">
                <div className="font-mono font-semibold text-[#FBBF24] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  SaaS Deployment Note:
                </div>
                <p className="leading-relaxed">
                  Production multi-tenant security requires backend JWT/OAuth2 session tokens with Secure HttpOnly cookies. Client-side authentication is provided for development convenience.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="primary" className="w-full">
                Enter Security Workspace
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
