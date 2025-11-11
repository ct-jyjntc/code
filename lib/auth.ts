const asString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return null
}

const AUTH_TOKEN_KEYS = ["auth_data", "token", "access_token"]

const looksLikeToken = (value: string) => {
  if (!value) return false
  if (/bearer\s+/i.test(value)) return true
  // JWT or random hash (>=16 chars, alphanumeric/.-/_)
  if (/^[A-Za-z0-9-_.=]{16,}$/.test(value)) return true
  return false
}

const findTokenInObject = (payload: unknown, seen = new WeakSet<object>()): string | null => {
  if (!payload || typeof payload !== "object") return null
  if (seen.has(payload)) return null
  seen.add(payload)

  for (const value of Object.values(payload)) {
    const asStr = asString(value)
    if (asStr && looksLikeToken(asStr)) {
      return asStr
    }

    if (value && typeof value === "object") {
      const nested = findTokenInObject(value, seen)
      if (nested) return nested
    }
  }

  return null
}

export const extractAuthToken = (payload: unknown): string | null => {
  const immediate = asString(payload)
  if (immediate && looksLikeToken(immediate)) return immediate

  if (payload && typeof payload === "object") {
    for (const key of AUTH_TOKEN_KEYS) {
      const candidate = asString((payload as Record<string, unknown>)[key])
      if (candidate && looksLikeToken(candidate)) return candidate
    }

    const user = (payload as Record<string, unknown>).user
    if (user && typeof user === "object") {
      const userToken = asString((user as Record<string, unknown>).token)
      if (userToken && looksLikeToken(userToken)) return userToken
    }

    const nestedToken = findTokenInObject(payload)
    if (nestedToken) return nestedToken
  }

  return null
}

const normalizeToken = (token: string): string => token.trim()

// Token management
export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", normalizeToken(token))
  }
}

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token")
    return token ? normalizeToken(token) : null
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
