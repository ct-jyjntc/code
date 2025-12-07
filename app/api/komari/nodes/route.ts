import { NextRequest, NextResponse } from "next/server"
import { KOMARI_API_BASE, KOMARI_API_KEY } from "@/lib/komari"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${KOMARI_API_BASE}/api/nodes`, {
      headers: {
        "Authorization": `Bearer ${KOMARI_API_KEY}`,
        "Accept": "application/json"
      },
      cache: "no-store"
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Komari nodes proxy error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    )
  }
}
