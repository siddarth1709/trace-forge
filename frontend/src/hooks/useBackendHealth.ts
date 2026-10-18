import { useQuery } from '@tanstack/react-query'
import { healthApi } from '../api/index.ts'

export function useBackendHealth() {
  const healthQuery = useQuery({
    queryKey: ['backend-health'],
    queryFn: () => healthApi.getHealth(),
    refetchInterval: 15000,
    retry: 2,
    staleTime: 10000,
  })

  const modeQuery = useQuery({
    queryKey: ['agent-mode'],
    queryFn: () => healthApi.getMode(),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 20000,
  })

  return {
    isOnline: !healthQuery.isError && !!healthQuery.data,
    isLoading: healthQuery.isLoading,
    health: healthQuery.data,
    mode: modeQuery.data,
    error: healthQuery.error,
    refetch: () => {
      healthQuery.refetch()
      modeQuery.refetch()
    },
  }
}
