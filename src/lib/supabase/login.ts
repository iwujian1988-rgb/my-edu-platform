export const PASSWORD_LOGIN_PATH = '/api/auth/password'
export const LOGIN_UNAVAILABLE_MESSAGE = '登录服务暂时连接失败，请稍后重试'

export function loginErrorMessage(error: { code?: string; status?: number } | null): string {
  if (error?.code === 'invalid_credentials') return '手机号或密码错误'
  if (error?.code === 'validation_failed') return '请输入11位手机号和密码'
  if (error?.status === 429) return '登录尝试过于频繁，请稍后再试'
  if (error?.code === 'user_banned') return '你的账号被封禁，可联系店铺客服'
  if (error?.code === 'email_not_confirmed') return '账号尚未完成验证，请联系店铺客服'
  return LOGIN_UNAVAILABLE_MESSAGE
}

export const fetchWithPasswordProxy: typeof fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const isPasswordLogin = url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password'
  // Keep Supabase's normal session persistence and cookie chunking after the exchange.
  return fetch(isPasswordLogin ? PASSWORD_LOGIN_PATH : input, init)
}
