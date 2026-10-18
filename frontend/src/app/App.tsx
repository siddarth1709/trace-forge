import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.tsx'
import { AuthProvider } from '../hooks/useAuth.tsx'
import { WorkspaceProvider } from '../hooks/useWorkspace.tsx'
import { ToastProvider } from '../components/ui/Toast.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: 1,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
