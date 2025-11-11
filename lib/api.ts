import { getAuthToken } from "./auth"
import type { CaptchaPayload } from "@/types/captcha"
import type { GuestConfig } from "@/types/config"
import {
  mockAuthResponse,
  mockDashboardStats,
  mockPlans,
  mockOrders,
  mockOrderDetail,
  mockPaymentMethods,
  mockCheckoutResult,
  mockNodes,
  mockInvites,
  mockTickets,
  mockTicketDetail,
  mockTrafficLog,
  mockUser,
  mockSubscriptionInfo,
  mockSessions,
  mockNotices,
  mockKnowledgeBase,
  mockGiftCardHistory,
  mockGiftCardPreview,
  mockGiftCardRedeemResult,
} from "./mock-data"

const DEFAULT_SERVER_API_BASE_URL = process.env.SEELE_SERVER_API_BASE_URL || "https://seele.xiercloud.uk/api/v1"
const DEFAULT_BROWSER_API_BASE_URL = "/api/seele"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window === "undefined" ? DEFAULT_SERVER_API_BASE_URL : DEFAULT_BROWSER_API_BASE_URL)
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_API === "true"

const PERIOD_META: Record<
  string,
  {
    label: string
    days: number
  }
> = {
  month_price: { label: "月付", days: 30 },
  quarter_price: { label: "季付", days: 90 },
  half_year_price: { label: "半年付", days: 180 },
  year_price: { label: "年付", days: 365 },
  two_year_price: { label: "两年付", days: 730 },
  three_year_price: { label: "三年付", days: 1095 },
  onetime_price: { label: "一次性", days: -1 },
  reset_price: { label: "重置流量", days: -1 },
}

const getPeriodLabel = (legacyKey?: string) => {
  if (!legacyKey) return "自定义周期"
  return PERIOD_META[legacyKey]?.label ?? "自定义周期"
}

const PERIOD_PRIORITY = [
  "month_price",
  "quarter_price",
  "half_year_price",
  "year_price",
  "two_year_price",
  "three_year_price",
  "onetime_price",
  "reset_price",
]

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const centsToCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return 0
  return Math.round(value) / 100
}

const ensureArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object" && "data" in value && Array.isArray(value.data)) {
    return value.data as T[]
  }
  return []
}

const normalizeTimestamp = (value?: string | number | null) => {
  if (value === null || value === undefined) return undefined
  const numeric = Number(value)
  if (!Number.isNaN(numeric)) {
    const ms = numeric > 1e12 ? numeric : numeric * 1000
    return new Date(ms).toISOString()
  }
  const parsed = Date.parse(String(value))
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString()
  }
  return undefined
}

const bytesFromValue = (value?: number | null) => {
  if (value === null || value === undefined) return 0
  return Number(value)
}

const gbToBytes = (value?: number | null) => {
  if (value === null || value === undefined) return 0
  return Number(value) * 1024 * 1024 * 1024
}

const formatBytes = (bytes?: number) => {
  const value = bytes ?? 0
  if (value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB", "PB"]
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  const converted = value / Math.pow(1024, index)
  return `${converted % 1 === 0 ? converted : converted.toFixed(2)} ${units[index]}`
}

const pickFirst = <T>(items: T[], predicate?: (item: T) => boolean) => {
  if (!predicate) return items[0]
  return items.find(predicate) ?? items[0]
}

const safeJsonStringify = (body?: BodyInit | object) => {
  if (!body) return undefined
  if (typeof body === "string" || body instanceof FormData || body instanceof Blob) {
    return body
  }
  return JSON.stringify(body)
}

const formatAuthHeader = (token: string) => {
  if (!token) return token
  return /^bearer\s/i.test(token) ? token : `Bearer ${token}`
}

type RegisterPayload = {
  email: string
  password: string
  invite_code?: string
  email_code?: string
} & CaptchaPayload

type EmailCodePayload = {
  email: string
} & CaptchaPayload

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    throw new Error("Mock mode active")
  }

  const token = getAuthToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    headers["Authorization"] = formatAuthHeader(token)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: safeJsonStringify(options.body),
    cache: "no-store",
  })

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    // ignore JSON parse errors
  }

  if (!response.ok) {
    const message = payload?.message || response.statusText || "Request failed"
    throw new ApiError(response.status, message)
  }

  if (payload && typeof payload === "object" && "status" in payload) {
    if (payload.status !== "success") {
      throw new ApiError(response.status, payload?.message || "Request failed")
    }
    if ("data" in payload) {
      const data = (payload as Record<string, unknown>).data
      return data ?? payload
    }
  }

  return payload
}

const selectPlanPeriods = (plan: any) => {
  return Object.entries(PERIOD_META)
    .map(([legacyKey, meta]) => {
      const value = plan?.[legacyKey]
      if (value === null || value === undefined) return null
      return {
        legacyKey,
        periodKey: legacyKey,
        label: meta.label,
        days: meta.days,
        price: centsToCurrency(Number(value)),
      }
    })
    .filter(Boolean) as Array<{ legacyKey: string; periodKey: string; label: string; days: number; price: number }>
}

const determinePrimaryPeriod = (periods: Array<{ legacyKey: string }>) => {
  if (periods.length === 0) return undefined
  for (const key of PERIOD_PRIORITY) {
    const target = periods.find((period) => period.legacyKey === key)
    if (target) return target
  }
  return periods[0]
}

const normalizePlan = (plan: any) => {
  const periods = selectPlanPeriods(plan)
  const primaryPeriod = determinePrimaryPeriod(periods) ?? {
    legacyKey: "month_price",
    label: "月付",
    days: 30,
    price: 0,
  }
  const transferBytes = gbToBytes(plan?.transfer_enable ?? 0)
  const features = Array.isArray(plan?.tags) ? plan.tags.filter(Boolean) : []
  const toNumber = (value: any) => {
    if (value === null || value === undefined || value === "") return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }
  const speedLimit = toNumber(plan?.speed_limit)
  const deviceLimit = toNumber(plan?.device_limit)

  return {
    id: String(plan?.id ?? ""),
    name: plan?.name ?? "未命名套餐",
    price: primaryPeriod.price,
    duration_days: primaryPeriod.days,
    duration_label: primaryPeriod.label,
    bandwidth: transferBytes,
    features,
    speed_limit: speedLimit,
    device_limit: deviceLimit,
    popular: Boolean(plan?.tags?.includes("popular")),
    purchase_period: primaryPeriod.legacyKey,
    available_periods: periods,
  }
}

const normalizeOrderStatus = (status?: number) => {
  switch (status) {
    case 0:
      return "pending"
    case 1:
      return "processing"
    case 2:
      return "cancelled"
    case 3:
    case 4:
      return "completed"
    default:
      return "pending"
  }
}

const normalizeOrder = (order: any) => {
  const id = order?.trade_no ?? String(order?.id ?? "")
  return {
    id,
    trade_no: id,
    plan_name: order?.plan?.name ?? `套餐 #${order?.plan_id ?? "-"}`,
    amount: centsToCurrency(order?.total_amount),
    status: normalizeOrderStatus(order?.status),
    created_at: normalizeTimestamp(order?.created_at) ?? new Date().toISOString(),
    paid_at: normalizeTimestamp(order?.paid_at),
  }
}

const normalizeOrderDetail = (order: any) => {
  if (!order) return null
  const base = normalizeOrder(order)
  const planDetail = order?.plan
    ? {
        id: String(order.plan.id ?? ""),
        name: order.plan.name ?? base.plan_name,
        content: order.plan.content,
        transfer_enable: gbToBytes(order.plan.transfer_enable ?? 0),
        speed_limit: order.plan.speed_limit,
        device_limit: order.plan.device_limit,
      }
    : undefined

  return {
    ...base,
    status_code: order?.status,
    period: order?.period,
    period_label: getPeriodLabel(order?.period),
    total_amount: centsToCurrency(order?.total_amount ?? 0),
    balance_amount: centsToCurrency(order?.balance_amount ?? 0),
    handling_amount: centsToCurrency(order?.handling_amount ?? 0),
    discount_amount: centsToCurrency(order?.discount_amount ?? 0),
    payable_amount: centsToCurrency((order?.total_amount ?? 0) + (order?.handling_amount ?? 0)),
    plan_detail: planDetail,
    raw: order,
  }
}

const normalizeNode = (node: any) => {
  const status = node?.is_online ? "online" : "offline"
  return {
    id: String(node?.id ?? ""),
    name: node?.name ?? "未知节点",
    location: node?.tags?.[0] ?? node?.type ?? "未知",
    status,
    load: status === "online" ? Math.min(100, Math.round((Number(node?.rate ?? 1) / 5) * 100)) : 0,
    latency: status === "online" ? Math.round(50 + Math.random() * 80) : 0,
  }
}

const normalizePaymentMethod = (method: any) => ({
  id: String(method?.id ?? ""),
  name: method?.name ?? method?.payment ?? "支付方式",
  payment: method?.payment ?? "",
  icon: method?.icon ?? "",
  handling_fee_percent: Number(method?.handling_fee_percent ?? 0),
  handling_fee_fixed: centsToCurrency(method?.handling_fee_fixed ?? 0),
})

const normalizeInviteResponse = (data: any) => {
  const codes = ensureArray<any>(data?.codes)
  const stats = Array.isArray(data?.stat) ? data.stat : []
  const registeredUsers = stats[0] ?? codes.length
  const commissionEarnedRaw = stats[1] ?? 0
  const pendingCommissionRaw = stats[2] ?? 0
  const commissionRate = stats[3] ?? 0
  const availableCommissionRaw = stats[4] ?? 0

  return {
    invites: codes.map((code) => ({
      id: `${code?.code ?? ""}`,
      code: code?.code ?? "",
      created_at: normalizeTimestamp(code?.created_at) ?? new Date().toISOString(),
      status: code?.status === 0 ? "active" : "used",
    })),
    total_invites: registeredUsers,
    active_invites: codes.filter((code) => code?.status === 0).length,
    commission_earned: centsToCurrency(commissionEarnedRaw),
    pending_commission: centsToCurrency(pendingCommissionRaw),
    commission_rate: commissionRate,
    available_commission: centsToCurrency(availableCommissionRaw),
    available_commission_raw: availableCommissionRaw,
  }
}

const normalizeTicketStatus = (ticket: any) => {
  if (ticket?.status === 1) return "closed"
  if (ticket?.reply_status) return "replied"
  return "open"
}

const normalizeTicket = (ticket: any) => ({
  id: String(ticket?.id ?? ""),
  subject: ticket?.subject ?? "未命名工单",
  status: normalizeTicketStatus(ticket),
  created_at: normalizeTimestamp(ticket?.created_at) ?? new Date().toISOString(),
  updated_at: normalizeTimestamp(ticket?.updated_at) ?? new Date().toISOString(),
  priority: ticket?.level ?? "normal",
})

const normalizeTicketDetail = (ticket: any) => {
  const messages = ensureArray<any>(ticket?.message ?? ticket?.messages).map((message) => {
    const isUser = Boolean(message?.is_me)
    return {
      id: String(message?.id ?? ""),
      message: message?.message ?? "",
      is_admin: !isUser,
      is_me: isUser,
      sender_name: message?.sender_name,
      created_at: normalizeTimestamp(message?.created_at) ?? new Date().toISOString(),
    }
  })

  return {
    id: String(ticket?.id ?? ""),
    subject: ticket?.subject ?? "",
    status: normalizeTicketStatus(ticket),
    priority: ticket?.level ?? "normal",
    created_at: normalizeTimestamp(ticket?.created_at) ?? new Date().toISOString(),
    updated_at: normalizeTimestamp(ticket?.updated_at) ?? new Date().toISOString(),
    messages,
  }
}

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

const normalizeTrafficLogs = (logs: any[]) => {
  const normalized = logs.map((log, index) => {
    const baseId = log?.id ?? log?.record_at
    const id = baseId ? `${baseId}-${index}` : generateId()
    return {
      id: String(id),
      date: normalizeTimestamp(log?.record_at) ?? new Date().toISOString(),
      upload: bytesFromValue(log?.u),
      download: bytesFromValue(log?.d),
      total: bytesFromValue(log?.u) + bytesFromValue(log?.d),
    }
  })

  const summary = normalized.reduce(
    (acc, log) => {
      acc.month_upload += log.upload
      acc.month_download += log.download
      if (log.id === normalized[0]?.id) {
        acc.today_upload = log.upload
        acc.today_download = log.download
      }
      return acc
    },
    {
      today_upload: 0,
      today_download: 0,
      month_upload: 0,
      month_download: 0,
    },
  )

  return { summary, logs: normalized }
}

const normalizeSubscription = (data: any) => {
  const planData = data?.plan
  const normalizedPlan = planData
    ? {
        id: String(planData?.id ?? ""),
        name: planData?.name ?? "未命名套餐",
        transfer_enable: bytesFromValue(planData?.transfer_enable ?? data?.transfer_enable ?? 0),
        speed_limit: planData?.speed_limit,
        device_limit: planData?.device_limit ?? data?.device_limit,
        features: Array.isArray(planData?.tags) ? planData.tags : [],
      }
    : undefined

  return {
    token: data?.token ?? "",
    subscribe_url: data?.subscribe_url ?? "",
    plan: normalizedPlan,
    speed_limit: data?.speed_limit ?? planData?.speed_limit ?? null,
    device_limit: data?.device_limit ?? planData?.device_limit ?? null,
    u: bytesFromValue(data?.u),
    d: bytesFromValue(data?.d),
    transfer_enable: bytesFromValue(data?.transfer_enable),
    expired_at: normalizeTimestamp(data?.expired_at),
    reset_day: data?.reset_day,
    next_reset_at: normalizeTimestamp(data?.next_reset_at),
    last_reset_at: normalizeTimestamp(data?.last_reset_at),
    remarks: data?.remarks,
  }
}

const normalizeSessions = (sessions: any[]) => {
  return sessions.map((session) => ({
    id: String(session?.id ?? ""),
    device: session?.name ?? "未知设备",
    ip: session?.last_ip ?? "0.0.0.0",
    location: session?.last_ip ?? "未识别位置",
    user_agent: session?.user_agent ?? "",
    last_active_at: normalizeTimestamp(session?.last_used_at ?? session?.updated_at) ?? new Date().toISOString(),
  }))
}

const normalizeUserInfo = (data: any) => {
  const email = data?.email ?? "user@example.com"
  return {
    id: data?.uuid ?? email,
    username: email.split("@")[0],
    email,
    created_at: normalizeTimestamp(data?.created_at) ?? new Date().toISOString(),
    subscription_status: data?.plan_id ? "正常" : "未订阅",
  }
}

const unwrapCollection = (response: any) => {
  if (Array.isArray(response)) return response
  if (response?.data && Array.isArray(response.data)) return response.data
  return []
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    if (USE_MOCK_DATA) return mockAuthResponse
    return fetchWithAuth("/passport/auth/login", {
      method: "POST",
      body: { email, password },
    })
  },

  getGuestConfig: async (): Promise<GuestConfig> => {
    if (USE_MOCK_DATA) {
      return {
        is_email_verify: 1,
        is_invite_force: 0,
        email_whitelist_suffix: 0,
        is_captcha: 0,
        captcha_type: "recaptcha",
        recaptcha_site_key: "demo",
      }
    }
    return fetchWithAuth("/guest/comm/config")
  },

  register: async ({ email, password, invite_code, email_code, ...captcha }: RegisterPayload) => {
    if (USE_MOCK_DATA) return mockAuthResponse
    return fetchWithAuth("/passport/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        invite_code,
        email_code,
        ...captcha,
      },
    })
  },

  sendEmailCode: async ({ email, ...captcha }: EmailCodePayload) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/passport/comm/sendEmailVerify", {
      method: "POST",
      body: {
        email,
        ...captcha,
      },
    })
  },

  forgetPassword: async (payload: { email: string; password: string; email_code: string }) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/passport/auth/forget", {
      method: "POST",
      body: payload,
    })
  },

  getUserInfo: async () => {
    if (USE_MOCK_DATA) return mockUser
    const data = await fetchWithAuth("/user/info")
    return normalizeUserInfo(data)
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/user/changePassword", {
      method: "POST",
      body: {
        old_password: oldPassword,
        new_password: newPassword,
      },
    })
  },

  // Dashboard
  getDashboardStats: async () => {
    if (USE_MOCK_DATA) return mockDashboardStats
    const [subscription, userInfo, stat] = await Promise.all([
      fetchWithAuth("/user/getSubscribe"),
      fetchWithAuth("/user/info"),
      fetchWithAuth("/user/getStat").catch(() => []),
    ])

    const total = bytesFromValue(subscription?.transfer_enable)
    const used = bytesFromValue(subscription?.u) + bytesFromValue(subscription?.d)
    return {
      total_bandwidth: total,
      used_bandwidth: used,
      remaining_bandwidth: Math.max(total - used, 0),
      active_subscriptions: subscription?.plan ? 1 : 0,
      total_invites: Array.isArray(stat) ? stat[0] ?? 0 : 0,
      commission_balance: centsToCurrency(userInfo?.commission_balance ?? 0),
      plan_name: subscription?.plan?.name,
      expire_date: normalizeTimestamp(subscription?.expired_at),
    }
  },

  // Plans & Orders
  getPlans: async () => {
    if (USE_MOCK_DATA) return mockPlans
    const response = await fetchWithAuth("/user/plan/fetch")
    const plans = unwrapCollection(response)
    return plans.map(normalizePlan)
  },

  getOrders: async () => {
    if (USE_MOCK_DATA) return mockOrders
    const response = await fetchWithAuth("/user/order/fetch")
    return unwrapCollection(response).map(normalizeOrder)
  },

  createOrder: async (planId: string, period?: string) => {
    if (USE_MOCK_DATA) {
      return {
        trade_no: `mock_order_${Date.now()}`,
      }
    }
    const response = await fetchWithAuth("/user/order/save", {
      method: "POST",
      body: {
        plan_id: planId,
        period: period ?? "month_price",
      },
    })
    if (typeof response === "string") {
      return { trade_no: response }
    }
    if (response?.trade_no) {
      return { trade_no: response.trade_no }
    }
    return { trade_no: "" }
  },

  getOrderDetail: async (tradeNo: string) => {
    if (USE_MOCK_DATA) return normalizeOrderDetail(mockOrderDetail)
    const response = await fetchWithAuth(`/user/order/detail?trade_no=${tradeNo}`)
    return normalizeOrderDetail(response)
  },

  getPaymentMethods: async () => {
    if (USE_MOCK_DATA) return mockPaymentMethods.map(normalizePaymentMethod)
    const methods = await fetchWithAuth("/user/order/getPaymentMethod")
    return ensureArray(methods).map(normalizePaymentMethod)
  },

  checkoutOrder: async (tradeNo: string, methodId: string) => {
    if (USE_MOCK_DATA) return mockCheckoutResult
    const result = await fetchWithAuth("/user/order/checkout", {
      method: "POST",
      body: {
        trade_no: tradeNo,
        method: methodId,
      },
    })
    return {
      type: typeof result?.type === "number" ? result.type : -1,
      data: result?.data ?? null,
    }
  },

  checkOrderStatus: async (tradeNo: string) => {
    if (USE_MOCK_DATA) return { status: "completed" }
    const status = await fetchWithAuth(`/user/order/check?trade_no=${tradeNo}`)
    return {
      status: normalizeOrderStatus(typeof status === "number" ? status : Number(status)),
    }
  },

  cancelOrder: async (tradeNo: string) => {
    if (USE_MOCK_DATA) return { success: true }
    await fetchWithAuth("/user/order/cancel", {
      method: "POST",
      body: { trade_no: tradeNo },
    })
    return { success: true }
  },

  // Nodes
  getNodes: async () => {
    if (USE_MOCK_DATA) return mockNodes
    const response = await fetchWithAuth("/user/server/fetch")
    const nodes = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
    return nodes.map(normalizeNode)
  },

  getNodeStatus: async () => {
    if (USE_MOCK_DATA) return { status: "online", load: 50, latency: 50 }
    return { status: "unknown", load: 0, latency: 0 }
  },

  // Invites
  getInvites: async () => {
    if (USE_MOCK_DATA) return mockInvites
    const data = await fetchWithAuth("/user/invite/fetch")
    return normalizeInviteResponse(data)
  },

  generateInviteCode: async () => {
    if (USE_MOCK_DATA) return { invite_code: `MOCK${Date.now()}` }
    return fetchWithAuth("/user/invite/save")
  },

  transferCommission: async (amount: number) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/user/transfer", {
      method: "POST",
      body: { transfer_amount: amount },
    })
  },

  withdrawCommission: async (method: string, account: string) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/user/ticket/withdraw", {
      method: "POST",
      body: {
        withdraw_method: method,
        withdraw_account: account,
      },
    })
  },

  // Tickets
  getTickets: async () => {
    if (USE_MOCK_DATA) return mockTickets
    const response = await fetchWithAuth("/user/ticket/fetch")
    return unwrapCollection(response).map(normalizeTicket)
  },

  createTicket: async (subject: string, content: string, level = 0) => {
    if (USE_MOCK_DATA) return { id: `ticket_${Date.now()}`, status: "open" }
    return fetchWithAuth("/user/ticket/save", {
      method: "POST",
      body: {
        subject,
        message: content,
        level,
      },
    })
  },

  getTicketDetail: async (ticketId: string) => {
    if (USE_MOCK_DATA) return mockTicketDetail
    const response = await fetchWithAuth(`/user/ticket/fetch?id=${ticketId}`)
    return normalizeTicketDetail(response)
  },

  replyTicket: async (ticketId: string, content: string) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/user/ticket/reply", {
      method: "POST",
      body: {
        id: ticketId,
        message: content,
      },
    })
  },

  closeTicket: async (ticketId: string) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/user/ticket/close", {
      method: "POST",
      body: { id: ticketId },
    })
  },

  // Traffic
  getTrafficLog: async () => {
    if (USE_MOCK_DATA) return mockTrafficLog
    const response = await fetchWithAuth("/user/stat/getTrafficLog")
    return normalizeTrafficLogs(unwrapCollection(response))
  },

  // Subscription & security
  getSubscriptionInfo: async () => {
    if (USE_MOCK_DATA) return mockSubscriptionInfo
    const data = await fetchWithAuth("/user/getSubscribe")
    return normalizeSubscription(data)
  },

  resetSecurity: async () => {
    if (USE_MOCK_DATA) return mockSubscriptionInfo
    await fetchWithAuth("/user/resetSecurity")
    return api.getSubscriptionInfo()
  },

  getActiveSessions: async () => {
    if (USE_MOCK_DATA) return { sessions: mockSessions }
    const sessions = await fetchWithAuth("/user/getActiveSession")
    return { sessions: normalizeSessions(Array.isArray(sessions) ? sessions : []) }
  },

  removeActiveSession: async (sessionId: string) => {
    if (USE_MOCK_DATA) return { success: true }
    return fetchWithAuth("/user/removeActiveSession", {
      method: "POST",
      body: { session_id: sessionId },
    })
  },

  getQuickLoginUrl: async () => {
    if (USE_MOCK_DATA) return { url: "https://client.example.com/quick-login" }
    const url = await fetchWithAuth("/user/getQuickLoginUrl", {
      method: "POST",
    })
    return { url }
  },

  // Notices & knowledge
  getNotices: async (page = 1) => {
    if (USE_MOCK_DATA) return { data: mockNotices, total: mockNotices.length }
    const response = await fetchWithAuth(`/user/notice/fetch?current=${page}`)
    return {
      data: ensureArray(response),
      total: response?.total ?? ensureArray(response).length,
    }
  },

  getKnowledgeBase: async (language = "zh-CN") => {
    if (USE_MOCK_DATA) return mockKnowledgeBase
    const response = await fetchWithAuth(`/user/knowledge/fetch?language=${language}`)
    if (!response) return []
    if (Array.isArray(response)) return response
    return Object.entries(response).map(([category, articles]) => ({
      category,
      articles: ensureArray(articles),
    }))
  },

  // Gift cards
  checkGiftCard: async (code: string) => {
    if (USE_MOCK_DATA) return mockGiftCardPreview
    return fetchWithAuth("/user/gift-card/check", {
      method: "POST",
      body: { code },
    })
  },

  redeemGiftCard: async (code: string) => {
    if (USE_MOCK_DATA) return mockGiftCardRedeemResult
    return fetchWithAuth("/user/gift-card/redeem", {
      method: "POST",
      body: { code },
    })
  },

  getGiftCardHistory: async () => {
    if (USE_MOCK_DATA) return mockGiftCardHistory
    return fetchWithAuth("/user/gift-card/history")
  },

  getCommConfig: async () => {
    if (USE_MOCK_DATA) {
      return {
        withdraw_methods: ["支付宝", "USDT-TRC20"],
        withdraw_close: 0,
        currency_symbol: "¥",
      }
    }
    return fetchWithAuth("/user/comm/config")
  },
}
