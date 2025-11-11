import { NextRequest, NextResponse } from "next/server"

const PICGO_ENDPOINT = "https://www.picgo.net/api/1/upload"
const PICGO_API_KEY = "chv_SPkDM_c248014d65780b4af1faedba654c0df56d978b516d50258aba77a9d1f9101a9d46c8238b550df61dafbd8a60665e3604b14a443f4bb4d39f9851cc57aab79fd9"

export async function POST(request: NextRequest) {
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
