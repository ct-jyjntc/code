declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options?: { action?: string }) => Promise<string>
    }
  }
}

const RECAPTCHA_SCRIPT_ID = "recaptcha-v3-script"
let recaptchaScriptPromise: Promise<void> | null = null

const loadRecaptchaV3Script = (siteKey: string) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("reCAPTCHA 仅在浏览器环境可用"))
  }

  if (window.grecaptcha) {
    return Promise.resolve()
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise
  }

  recaptchaScriptPromise = new Promise<void>((resolve, reject) => {
    if (document.getElementById(RECAPTCHA_SCRIPT_ID)) {
      resolve()
      return
    }

    const script = document.createElement("script")
    script.id = RECAPTCHA_SCRIPT_ID
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("reCAPTCHA 脚本加载失败"))
    document.body.appendChild(script)
  })

  return recaptchaScriptPromise
}

export const executeRecaptchaV3 = async (siteKey: string, action = "submit") => {
  await loadRecaptchaV3Script(siteKey)

  if (!window.grecaptcha) {
    throw new Error("reCAPTCHA 尚未初始化")
  }

  await new Promise<void>((resolve) => window.grecaptcha!.ready(resolve))
  const token = await window.grecaptcha!.execute(siteKey, { action })
  if (!token) {
    throw new Error("无法获取 reCAPTCHA token")
  }
  return token
}
