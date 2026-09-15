import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, tokenStorage } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const token = tokenStorage.get()
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then(data => setUser(data))
      .catch(() => {
        tokenStorage.remove()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    tokenStorage.set(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (username, email, password, role = 'user') => {
    const data = await authApi.signup(username, email, password, role)
    tokenStorage.set(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const data = await authApi.me()
    setUser(data)
    return data
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export default AuthContext
