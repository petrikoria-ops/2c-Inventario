import { useState, useEffect } from 'react'

/**
 * Like useState but syncs when the server re-sends new props via router.refresh().
 * Optimistic local updates still work — they're overwritten by the real server value
 * only after the next refresh cycle.
 */
export function useSyncedState<T>(serverData: T) {
  const [data, setData] = useState(serverData)
  useEffect(() => { setData(serverData) }, [serverData])
  return [data, setData] as const
}
