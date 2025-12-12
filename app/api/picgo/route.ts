import { NextRequest, NextResponse } from "next/server"

const PICGO_ENDPOINT = process.env.PICGO_ENDPOINT ?? "https://www.picgo.net/api/1/upload"
const PICGO_API_KEY = process.env.PICGO_API_KEY

export async function POST(request: NextRequest) {
  if (!PICGO_API_KEY) {
    return NextResponse.json({ message: "PICGO_API_KEY is not configured on the server" }, { status: 500 })
  }

  try {
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ message: "需要 multipart/form-data" }, { status: 400 })
    }

    const formData = await request.formData()
    const picgoBody = new FormData()
    for (const [key, value] of formData.entries()) {
      picgoBody.append(key, value)
    }

    const response = await fetch(PICGO_ENDPOINT, {
      method: "POST",
      headers: {
        "X-API-Key": PICGO_API_KEY,
      },
      body: picgoBody,
    })

    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    })
  } catch (error) {
    console.error("PicGo proxy error:", error)
    return NextResponse.json({ message: "PicGo 上传失败" }, { status: 502 })
  }
}
