import { getAuthToken } from "./auth"
import {
  mockAuthResponse,
  mockDashboardStats,
  mockPlans,
  mockOrders,
  mockNodes,
  mockInvites,
  mockTickets,
  mockTicketDetail,
  mockTrafficLog,
  mockUser,
} from "./mock-data"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.example.com"
const USE_MOCK_DATA = true

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const mockDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  if (USE_MOCK_DATA) {
    await mockDelay(300) // Simulate network delay
    return getMockResponse(endpoint, options.method || "GET")
  }

  const token = getAuthToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }))
    throw new ApiError(response.status, error.message || "Request failed")
  }

  return response.json()
}

function getMockResponse(endpoint: string, method: string) {
  console.log("[v0] Mock API call:", method, endpoint)

  // Auth endpoints
  if (endpoint === "/auth/login") return mockAuthResponse
  if (endpoint === "/auth/register") return mockAuthResponse
  if (endpoint === "/user/info") return mockUser

  // Dashboard
  if (endpoint === "/user/stats") return mockDashboardStats

  // Plans and Orders
  if (endpoint === "/plans") return mockPlans
  if (endpoint === "/user/orders") return mockOrders
  if (endpoint === "/orders" && method === "POST") {
    return {
      id: "order_new",
      status: "pending",
      payment_url: "https://payment.example.com/pay/order_new",
    }
  }

  // Nodes
  if (endpoint === "/nodes") return mockNodes
  if (endpoint.startsWith("/nodes/") && endpoint.endsWith("/status")) {
    return { status: "online", load: 45, latency: 28 }
  }

  // Invites
  if (endpoint === "/user/invites") return mockInvites
  if (endpoint === "/user/invite/generate" && method === "POST") {
    return {
      invite_code: `DEMO${Math.floor(Math.random() * 10000)}`,
      invite_url: `https://xboard.com/register?code=DEMO${Math.floor(Math.random() * 10000)}`,
    }
  }

  // Tickets
  if (endpoint === "/tickets" && method === "GET") return mockTickets
  if (endpoint === "/tickets" && method === "POST") {
    return {
      id: `ticket_${Date.now()}`,
      status: "open",
      created_at: new Date().toISOString(),
    }
  }
  if (endpoint.startsWith("/tickets/") && !endpoint.includes("/reply")) {
    return mockTicketDetail
  }
  if (endpoint.includes("/reply") && method === "POST") {
    return { success: true }
  }

  // Traffic
  if (endpoint === "/user/traffic") return mockTrafficLog

  // Default
  return { message: "Mock endpoint not configured" }
}

export const api = {
  // Auth endpoints
  login: (email: string, password: string) =>
    fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, username: string, invite_code?: string) =>
    fetchWithAuth("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username, invite_code }),
    }),

  getUserInfo: () => fetchWithAuth("/user/info"),

  // Dashboard endpoints
  getDashboardStats: () => fetchWithAuth("/user/stats"),

  // Subscription endpoints
  getPlans: () => fetchWithAuth("/plans"),
  getOrders: () => fetchWithAuth("/user/orders"),
  createOrder: (planId: string) =>
    fetchWithAuth("/orders", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId }),
    }),

  // Node endpoints
  getNodes: () => fetchWithAuth("/nodes"),
  getNodeStatus: (nodeId: string) => fetchWithAuth(`/nodes/${nodeId}/status`),

  // Invite endpoints
  getInvites: () => fetchWithAuth("/user/invites"),
  generateInviteCode: () => fetchWithAuth("/user/invite/generate", { method: "POST" }),

  // Ticket endpoints
  getTickets: () => fetchWithAuth("/tickets"),
  createTicket: (subject: string, content: string) =>
    fetchWithAuth("/tickets", {
      method: "POST",
      body: JSON.stringify({ subject, content }),
    }),
  getTicketDetail: (ticketId: string) => fetchWithAuth(`/tickets/${ticketId}`),
  replyTicket: (ticketId: string, content: string) =>
    fetchWithAuth(`/tickets/${ticketId}/reply`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  // Traffic endpoints
  getTrafficLog: () => fetchWithAuth("/user/traffic"),
}
