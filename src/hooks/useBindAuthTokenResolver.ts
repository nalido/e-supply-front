import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setAuthTokenResolver } from '../api/http'

export const useBindAuthTokenResolver = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth()

  useEffect(() => {
    const resolver = async () => {
      if (!isLoaded || !isSignedIn) {
        return null
      }
      return getToken()
    }

    setAuthTokenResolver(resolver)

    return () => {
      setAuthTokenResolver(async () => null)
    }
  }, [getToken, isLoaded, isSignedIn])
}
