import type { VoiceParseResult, TransactionType } from '../../types/ledger.types'

const numberWords: Record<string, number> = { واحد: 1, واحدة: 1, اثنين: 2, اثنتين: 2, ثلاثة: 3, ثلاث: 3, اربعة: 4, أربعة: 4, خمسة: 5, ستة: 6, سبعة: 7, ثمانية: 8, تسعة: 9, عشرة: 10 }
const normalizeDigits = (text: string) => text.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))

export const parseArabicVoice = (input: string, customerNames: string[]): VoiceParseResult => {
  const text = normalizeDigits(input.trim())
  const lower = text.toLowerCase()
  const type: TransactionType = /سدّد|سدد|دفع|استلمت|سداد|حول/.test(lower) ? 'payment' : 'debt'
  const exactName = [...customerNames].sort((a, b) => b.length - a.length).find(name => lower.includes(name.toLowerCase()))
  const partialMatches = exactName ? [] : customerNames.filter(name => name.split(/\s+/).some(token => token.length > 2 && lower.includes(token.toLowerCase())))
  const customerName = exactName ?? (partialMatches.length === 1 ? partialMatches[0] : '')
  const nameTokens = customerName.split(/\s+/).filter(token => lower.includes(token.toLowerCase()))
  const phraseWithoutName = nameTokens.reduce((phrase, token) => phrase.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ''), text)
  const amountMatch = text.match(/(\d+)\s*(?:ريال|ر\.ي)/)
  const amount = amountMatch ? Number(amountMatch[1]) : undefined
  const phraseWithoutAmount = phraseWithoutName.replace(/(\d+)\s*(?:ريال|ر\.ي)/g, '')
  const items = type === 'payment' ? [] : phraseWithoutAmount.split(/[،, و]+/).map(piece => {
    const match = piece.match(/(\d+|واحد|واحدة|اثنين|اثنتين|ثلاثة|ثلاث|اربعة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة)\s*(?:حبة|كيس|علبة|قطعة|شريط)?\s*(.+)/)
    if (!match) return { qty: 1, name: piece.replace(/سجّل|سجل|على|دين|أخذ|اخذ|اشتري|اشترى|سدّد|سدد|دفع|ريال|حساب/g, '').trim() }
    const qty = Number(match[1]) || numberWords[match[1]] || 1
    return { qty, name: match[2].trim() }
  }).filter(item => item.name && !customerNames.includes(item.name))
  return { customerName, type, items, amount, unclear: !customerName || (!items.length && !amount) }
}

export const listenForArabicSpeech = (): Promise<string> => new Promise((resolve, reject) => {
  const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    reject(new Error('المتصفح لا يدعم التعرّف على الصوت'))
    return
  }
  const recognition = new SpeechRecognition()
  recognition.lang = 'ar-SA'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = event => resolve(event.results[0][0].transcript)
  recognition.onerror = () => reject(new Error('تعذّر التقاط الصوت'))
  recognition.start()
})
