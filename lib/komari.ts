const DEFAULT_BASE_URL = "https://komari.xiercloud.uk"
const DEFAULT_WS_URL = "wss://komari.xiercloud.uk/api/clients"
const DEFAULT_API_KEY = "komari-nRVg6wXYN5SbwK1Q02LsW2jh8SaFIqJD"

export const KOMARI_API_BASE = process.env.NEXT_PUBLIC_KOMARI_BASE_URL ?? DEFAULT_BASE_URL
export const KOMARI_WS_URL = process.env.NEXT_PUBLIC_KOMARI_WS_URL ?? DEFAULT_WS_URL
export const KOMARI_API_KEY = process.env.NEXT_PUBLIC_KOMARI_API_KEY ?? DEFAULT_API_KEY

export const buildKomariHeaders = (extra?: HeadersInit): HeadersInit => {
  const headers: HeadersInit = {
    Accept: "application/json",
    ...extra,
  }

  if (KOMARI_API_KEY) {
    headers["Authorization"] = `Bearer ${KOMARI_API_KEY}`
  }

  return headers
}

export const buildKomariWsUrl = () => {
  try {
    const url = new URL(KOMARI_WS_URL)
    if (KOMARI_API_KEY) {
      url.searchParams.set("api_key", KOMARI_API_KEY)
    }
    return url.toString()
  } catch {
    return KOMARI_WS_URL
  }
}
