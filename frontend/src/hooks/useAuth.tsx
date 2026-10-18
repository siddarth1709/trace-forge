import React, { createContext, useContext, useState, useEffect } from 'react'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: 'SecOps Analyst' | 'Incident Commander' | 'Security Admin'
  team: string
  avatar: string
}

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  login: (email: string, role?: UserProfile['role']) => void
  logout: () => void
  updateRole: (role: UserProfile['role']) => void
}

const DEFAULT_USER: UserProfile = {
  id: 'usr-001',
  name: 'Alex Vance',
  email: 'alex.vance@traceforge.internal',
  role: 'SecOps Analyst',
  team: 'Tier 2 Incident Response',
  avatar: 'AV',
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = sessionStorage.getItem('tf_auth_user')
      return stored ? JSON.parse(stored) : DEFAULT_USER
    } catch {
      return DEFAULT_USER
    }
  })

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('tf_auth_user', JSON.stringify(user))
    } else {
      sessionStorage.removeItem('tf_auth_user')
    }
  }, [user])

  const login = (email: string, role: UserProfile['role'] = 'SecOps Analyst') => {
    const name = email.split('@')[0].replace(/[._-]/g, ' ')
    const capitalizedName = name
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    const newUser: UserProfile = {
      id: `usr-${Date.now().toString(36)}`,
      name: capitalizedName || 'Analyst',
      email,
      role,
      team: 'Cyber Defense Center',
      avatar: (capitalizedName || 'A')
        .split(' ')
        .map(p => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    }
    setUser(newUser)
  }

  const logout = () => {
    setUser(null)
  }

  const updateRole = (role: UserProfile['role']) => {
    if (user) {
      setUser({ ...user, role })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        updateRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
