import { NextRequest, NextResponse } from "next/server"

import { KOMARI_API_BASE, KOMARI_API_KEY } from "@/lib/komari"

export const runtime = "edge"

type PingRecord = {
  task_id: number
  time: string
  value: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uuid = searchParams.get("uuid")
  const hours = searchParams.get("hours")

  if (!uuid) {
    return NextResponse.json({ error: "Missing uuid" }, { status: 400 })
  }

  const upstreamUrl = new URL(`${KOMARI_API_BASE}/api/records/ping`)
  upstreamUrl.searchParams.set("uuid", uuid)
  if (hours) {
    upstreamUrl.searchParams.set("hours", hours)
  }

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        Authorization: `Bearer ${KOMARI_API_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Upstream error: ${response.status}` }, { status: response.status })
    }

    const payload = await response.json()
    const tasks = Array.isArray(payload?.data?.tasks) ? payload.data.tasks : []
    const records: PingRecord[] = Array.isArray(payload?.data?.records) ? payload.data.records : []

    const latestMap = new Map<number, { time: string; value: number }>()
    let lastUpdated = 0

    for (const record of records) {
      const timeMs = Date.parse(record.time)
      if (!Number.isFinite(timeMs)) continue

      lastUpdated = Math.max(lastUpdated, timeMs)
      const existing = latestMap.get(record.task_id)
      if (!existing || timeMs > Date.parse(existing.time)) {
        latestMap.set(record.task_id, {
          time: new Date(timeMs).toISOString(),
          value: Number(record.value ?? 0),
        })
      }
    }

    const trimmedTasks = tasks.map((task: { id: number }) => ({
      ...task,
      latest: latestMap.get(task.id) ?? null,
    }))

    return NextResponse.json({
      status: payload?.status ?? "success",
      message: payload?.message ?? "",
      data: {
        tasks: trimmedTasks,
        lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
      },
    })
  } catch (error) {
    console.error("[API] Komari ping proxy error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
