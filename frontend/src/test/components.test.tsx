import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Badge } from '../components/ui/Badge.tsx'
import { Button } from '../components/ui/Button.tsx'
import { StatCard } from '../components/ui/StatCard.tsx'
import { Tabs } from '../components/ui/Tabs.tsx'
import { GraphPreloader } from '../components/graph/GraphPreloader.tsx'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from '../features/landing/LandingPage.tsx'

describe('UI Component Suite', () => {
  it('renders Badge with text and variant class', () => {
    render(<Badge variant="emerald">ACTIVE</Badge>)
    const badge = screen.getByText('ACTIVE')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('text-emerald-400')
  })

  it('renders Button and handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Run Simulation</Button>)
    const button = screen.getByText('Run Simulation')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disables Button when isLoading is true', () => {
    render(<Button isLoading>Deploy</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders StatCard with title, value, and description', () => {
    render(
      <StatCard
        title="Active Attack Paths"
        value={3}
        description="From 2 footholds"
      />
    )
    expect(screen.getByText('Active Attack Paths')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('From 2 footholds')).toBeInTheDocument()
  })

  it('renders Tabs and fires onChange when clicked', () => {
    const handleChange = vi.fn()
    const tabs = [
      { id: 'tab1', label: 'Overview' },
      { id: 'tab2', label: 'Topology' },
    ]
    render(<Tabs tabs={tabs} activeTab="tab1" onChange={handleChange} />)
    const secondTab = screen.getByText('Topology')
    fireEvent.click(secondTab)
    expect(handleChange).toHaveBeenCalledWith('tab2')
  })

  it('renders GraphPreloader with FalkorDB telemetry and custom graph name', () => {
    render(
      <GraphPreloader
        graphName="tf-sim-live"
        message="Fetching live attack graph..."
        variant="overlay"
      />
    )
    expect(screen.getByTestId('graph-preloader')).toBeInTheDocument()
    expect(screen.getByText('FalkorDB Graph Engine')).toBeInTheDocument()
    expect(screen.getByText('tf-sim-live')).toBeInTheDocument()
    expect(screen.getByText('Fetching live attack graph...')).toBeInTheDocument()
    expect(screen.getByText(/Production graph isolation/i)).toBeInTheDocument()
  })

  it('renders GraphPreloader in inline variant with submessage', () => {
    render(
      <GraphPreloader
        variant="inline"
        message="Connecting to database"
        subMessage="Custom Cypher execution in progress"
      />
    )
    expect(screen.getByText('Connecting to database')).toBeInTheDocument()
    expect(screen.getByText('Custom Cypher execution in progress')).toBeInTheDocument()
  })

  it('renders LandingPage with animated pillars, hero simulator, and 5-stage pipeline', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Deterministic Attack Disruption Powered by/i)).toBeInTheDocument()
    expect(screen.getByText('The Four Pillars of TRACEFORGE')).toBeInTheDocument()
    expect(screen.getByText('How TRACEFORGE Works in 5 Stages')).toBeInTheDocument()
    expect(screen.getByText('Built on Model Context Protocol (MCP)')).toBeInTheDocument()
    expect(screen.getByText('Interactive Disruption Simulator')).toBeInTheDocument()
  })
})


