export const arabicErrorMessage = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback
  const message = error.message.toLowerCase()
  if (message.includes('invalid login') || message.includes('invalid credentials')) return 'رقم الهاتف أو كلمة المرور غير صحيحة'
  if (message.includes('already registered') || message.includes('user already')) return 'هذا الرقم مسجل من قبل، جرّب تسجيل الدخول'
  if (message.includes('phone') && message.includes('valid')) return 'تحقق من كتابة رقم الهاتف بصيغته الدولية'
  if (message.includes('network') || message.includes('fetch')) return 'تعذّر الاتصال بالإنترنت، بياناتك محفوظة على هذا الجهاز'
  if (/[\u0600-\u06ff]/.test(error.message)) return error.message
  return fallback
}
