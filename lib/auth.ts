export interface User {
  id: string
  email: string
  username: string
  balance: number
  transfer_enable: number
  u: number
  d: number
  expired_at: string
  invite_code?: string
}

export interface AuthResponse {
  token: string
  user: User
}

// Token management
export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token)
  }
}

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token")
  }
  return null
}

export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token")
  }
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}
