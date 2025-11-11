import { ApiError } from "./api"

const STATUS_HINTS: Record<number, string> = {
  400: "请求参数有误，请检查输入后重试",
  401: "身份验证失败，请确认账号或密码",
  403: "没有执行该操作的权限",
  404: "未找到相关资源",
  409: "请求与现有数据冲突，请稍后再试",
  422: "输入信息未通过校验，请检查后重试",
  429: "操作频率过高，请稍后再试",
  500: "服务器暂时不可用，请稍后再试",
  502: "无法连接上游服务，请稍后再试",
  503: "服务繁忙，请稍后再试",
  504: "请求超时，请检查网络后重试",
}

const NETWORK_ERROR_MESSAGE = "无法连接服务器，请稍后再试"
const NETWORK_ERROR_PATTERNS = [
  /network\s?error/i,
  /failed to fetch/i,
  /fetch failed/i,
  /timeout/i,
  /und_err_connect_timeout/i,
  /proxy request failed/i,
]

const extractErrorText = (error: unknown) => {
  if (error instanceof Error) {
    const parts = [error.message]
    if (error.cause instanceof Error) {
      parts.push(error.cause.message)
    } else if (typeof error.cause === "string") {
      parts.push(error.cause)
    }
    return parts.filter(Boolean).join(" ").trim()
  }
  if (typeof error === "string") {
    return error.trim()
  }
  return ""
}

export const getErrorMessage = (error: unknown, fallback = "发生错误，请稍后再试") => {
  if (error instanceof ApiError) {
    if (error.status && [502, 503, 504].includes(error.status)) {
      return NETWORK_ERROR_MESSAGE
    }
    if (error.message && error.message.trim() && error.message !== "Request failed") {
      return error.message.trim()
    }
    if (error.status && STATUS_HINTS[error.status]) {
      return STATUS_HINTS[error.status]
    }
  }

  const extracted = extractErrorText(error)
  if (extracted) {
    if (NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(extracted))) {
      return NETWORK_ERROR_MESSAGE
    }
    return extracted
  }

  return fallback
}
