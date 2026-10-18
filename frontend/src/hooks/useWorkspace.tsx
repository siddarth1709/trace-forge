import React, { createContext, useContext, useState, useEffect } from 'react'
import { DEMO_WORKSPACES } from '../lib/constants.ts'

export interface Workspace {
  id: string
  name: string
  graph: string
  isProduction: boolean
  description: string
}

interface WorkspaceContextType {
  currentWorkspace: Workspace
  workspaces: Workspace[]
  switchWorkspace: (workspaceId: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(() => {
    try {
      const savedId = sessionStorage.getItem('tf_active_workspace')
      const found = DEMO_WORKSPACES.find(w => w.id === savedId)
      return found || DEMO_WORKSPACES[0]
    } catch {
      return DEMO_WORKSPACES[0]
    }
  })

  useEffect(() => {
    sessionStorage.setItem('tf_active_workspace', currentWorkspace.id)
  }, [currentWorkspace])

  const switchWorkspace = (workspaceId: string) => {
    const ws = DEMO_WORKSPACES.find(w => w.id === workspaceId)
    if (ws) {
      setCurrentWorkspace(ws)
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces: DEMO_WORKSPACES,
        switchWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
