const PROXY_TARGET = (process.env.SEELE_PROXY_TARGET ?? "https://seele.xiercloud.uk/api/v1").replace(/\/$/, "")

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

const sanitizeHeaders = (headers: Headers) => {
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header))
  headers.delete("content-length")
  headers.delete("content-encoding")
  headers.delete("host")
}

type RouteContextValue = {
  path?: string[]
}

type RouteContext = {
  params: RouteContextValue | Promise<RouteContextValue>
}

const resolveParams = async (params: RouteContext["params"]) => {
  if (typeof (params as Promise<RouteContextValue>)?.then === "function") {
    return (await params) ?? {}
  }
  return (params as RouteContextValue) ?? {}
}

const buildTargetUrl = (pathSegments: string[] = [], search = "") => {
  const path = pathSegments.join("/")
  return path ? `${PROXY_TARGET}/${path}${search}` : `${PROXY_TARGET}${search}`
}

const proxyRequest = async (request: Request, context: RouteContext) => {
  const requestUrl = new URL(request.url)
  const params = await resolveParams(context.params)
  const targetUrl = buildTargetUrl(params.path ?? [], requestUrl.search)

  const headers = new Headers(request.headers)
  sanitizeHeaders(headers)

  try {
    const body =
      request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()

    const fetchResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    })

    const responseHeaders = new Headers(fetchResponse.headers)
    sanitizeHeaders(responseHeaders)

    return new Response(fetchResponse.body, {
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("[proxy] 请求失败", targetUrl, error)
    const message = error instanceof Error ? error.message : "Unknown proxy error"
    return new Response(JSON.stringify({ error: "Proxy request failed", detail: message }), {
      status: 502,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    })
  }
}

export const dynamic = "force-dynamic"

export const GET = (request: Request, context: RouteContext) => proxyRequest(request, context)
export const POST = (request: Request, context: RouteContext) => proxyRequest(request, context)
export const PUT = (request: Request, context: RouteContext) => proxyRequest(request, context)
export const PATCH = (request: Request, context: RouteContext) => proxyRequest(request, context)
export const DELETE = (request: Request, context: RouteContext) => proxyRequest(request, context)
export const OPTIONS = (request: Request, context: RouteContext) => proxyRequest(request, context)
