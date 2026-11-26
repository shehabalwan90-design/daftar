import type { Customer, Product, VoiceParseResult } from '../../types/ledger.types'

const numberWords: Record<string, number> = {
  واحد: 1, واحدة: 1, واحده: 1, اثنين: 2, اثنتين: 2, اثنان: 2, اثنتان: 2,
  ثلاثة: 3, ثلاث: 3, اربعة: 4, خمسه: 5, خمسة: 5, ستة: 6, سبعة: 7,
  ثمانية: 8, تسعة: 9, عشرة: 10,
}

const latinWords: Record<string, string> = {
  sajel: 'سجل', sajil: 'سجل', sajjel: 'سجل', record: 'سجل', add: 'سجل',
  ala: 'على', alaa: 'على', on: 'على', ikhsim: 'اخصم', ekhsim: 'اخصم',
  deduct: 'اخصم', khasim: 'اخصم', min: 'من', kam: 'كم', baqi: 'باقي',
  balance: 'رصيد', ahmed: 'احمد', ahmad: 'احمد', mohammed: 'محمد',
  mohamed: 'محمد', mohammad: 'محمد', ali: 'علي', saleh: 'صالح',
  salem: 'سالم', salim: 'سالم',
  kees: 'كيس', bag: 'كيس', sukkar: 'سكر', sugar: 'سكر',
  shareet: 'شريط', strip: 'شريط', mudad: 'مضاد', hayawi: 'حيوي',
  pay: 'سدد', paid: 'سدد', yes: 'aywa', no: 'لا',
}

const normalizeDigits = (text: string) => text
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))

const normalize = (text: string) => normalizeDigits(text.toLowerCase())
  .replace(/[ًٌٍَُِّْـ]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .split(/\s+/)
  .filter(Boolean)
  .map(word => latinWords[word] ?? word)

const includesPhrase = (haystack: string[], needle: string[]) =>
  needle.length > 0 && haystack.some((_, index) =>
    needle.every((word, offset) => haystack[index + offset] === word),
  )

const quantityValues: Record<string, number> = { ...numberWords, اربع: 4, ثلاثه: 3 }

export const parseArabicVoice = (
  input: string,
  customers: Customer[],
  products: Product[],
  aliases: Record<string, string> = {},
): VoiceParseResult => {
  const words = normalize(input)
  const normalizedText = words.join(' ')
  const balanceRequest = /(^| )(كم|كام) .*باقي|رصيد|balance/.test(normalizedText) || normalizedText.includes('كم باقي')
  const deductRequest = /(^| )(اخصم|خصم|سدد|دفع|استلمت|حول|من)( |$)/.test(normalizedText)
  const action: VoiceParseResult['action'] = balanceRequest ? 'balance' : deductRequest ? 'deduct' : /(^| )(سجل|دين|اخذ|اشتري)( |$)/.test(normalizedText) ? 'record' : 'unknown'
  const type = action === 'deduct' ? 'payment' : 'debt'

  const fullNameMatches = customers.filter(customer => includesPhrase(words, normalize(customer.name)))
  const phoneMatches = customers.filter(customer => {
    const phone = normalizeDigits(customer.phone).replace(/\D/g, '')
    const spokenDigits = normalizeDigits(input).replace(/\D/g, '')
    return phone.length >= 7 && spokenDigits.includes(phone)
  })
  const explicitMatches = [...new Map([...fullNameMatches, ...phoneMatches].map(customer => [customer.id, customer])).values()]
  const nameTokens = customers.map(customer => ({ customer, firstName: normalize(customer.name)[0] }))
  const mentionedFirstNames = [...new Set(nameTokens.filter(item => words.includes(item.firstName)).map(item => item.firstName))]
  const firstName = mentionedFirstNames[0]
  const firstNameMatches = firstName
    ? nameTokens.filter(item => item.firstName === firstName).map(item => item.customer)
    : []
  const aliasCustomer = firstName && aliases[firstName]
    ? customers.find(customer => customer.id === aliases[firstName])
    : undefined
  const matchedCustomers = explicitMatches.length
    ? explicitMatches
    : aliasCustomer
      ? [aliasCustomer]
      : firstNameMatches
  const selectedCustomer = matchedCustomers.length === 1 ? matchedCustomers[0] : undefined
  const explicitCustomer = Boolean(selectedCustomer && (
    explicitMatches.some(customer => customer.id === selectedCustomer.id)
    || (firstNameMatches.length === 1 && !aliasCustomer)
  ))
  const learnedAlias = explicitCustomer && selectedCustomer
    ? normalize(selectedCustomer.name)[0]
    : undefined

  const productMatch = products
    .filter(product => product.active)
    .map(product => ({ product, nameWords: normalize(product.name) }))
    .filter(item => includesPhrase(words, item.nameWords))
    .sort((left, right) => right.nameWords.length - left.nameWords.length)[0]
  const matchedProductWords = productMatch?.nameWords ?? []
  const productIndexes = matchedProductWords.length
    ? words.findIndex((_, index) => matchedProductWords.every((word, offset) => words[index + offset] === word))
    : -1
  const excludedWords = new Set([
    ...(selectedCustomer ? normalize(selectedCustomer.name) : firstNameMatches.length ? [firstName as string] : []),
    ...matchedProductWords,
    'سجل', 'على', 'دين', 'اخذ', 'اشتري', 'اخصم', 'خصم', 'من', 'سدد',
    'دفع', 'استلمت', 'حول', 'كم', 'كام', 'باقي', 'رصيد', 'ريال', 'ر',
    'حساب', 'مبلغ', 'بمبلغ', 'قيمة', 'بمقدار', 'حبة', 'كيس', 'علبة',
    'قطعة', 'شريط', 'عدد', 'ل', 'له',
  ])
  const remainingWords = words.filter(word => !excludedWords.has(word) && !/^\d+$/.test(word))
  const phoneDigits = selectedCustomer?.phone ? normalizeDigits(selectedCustomer.phone).replace(/\D/g, '') : ''
  const numericWords = words.filter(word => /^\d+$/.test(word) && word !== phoneDigits)
  const productQuantity = productMatch
    ? [...words.slice(0, productIndexes), ...words.slice(productIndexes + matchedProductWords.length)]
      .map(word => /^\d+$/.test(word) && word !== phoneDigits ? Number(word) : quantityValues[word])
      .find(value => value !== undefined && value > 0)
    : undefined
  const spokenQuantity = words.map(word => /^\d+$/.test(word) && word !== phoneDigits ? Number(word) : quantityValues[word])
    .find(value => value !== undefined && value > 0)
  const items = productMatch
    ? [{ name: productMatch.product.name, qty: productQuantity ?? spokenQuantity ?? 1 }]
    : remainingWords.length
      ? [{ name: remainingWords.join(' '), qty: spokenQuantity ?? 1 }]
      : []
  const amount = (action === 'deduct' || !items.length) && numericWords.length
    ? Number(numericWords.find(word => Number(word) > 10) ?? numericWords[0])
    : undefined
  const ambiguous = matchedCustomers.length > 1
  const unclear = action === 'unknown'
    || !selectedCustomer
    || (action !== 'balance' && !items.length && !amount)
    || ambiguous

  return {
    action,
    customerName: selectedCustomer?.name ?? '',
    customerMatches: matchedCustomers.map(customer => customer.name),
    type,
    items: action === 'deduct' ? [] : items,
    amount,
    unclear,
    explicitCustomer,
    learnedAlias,
  }
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
