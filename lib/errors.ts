import { ApiError } from "./api"

export const getErrorMessage = (error: unknown, fallback = "发生错误，请稍后再试") => {
  if (error instanceof ApiError) return error.message || fallback
  if (error instanceof Error) return error.message || fallback
  if (typeof error === "string" && error.trim()) return error
  return fallback
}
