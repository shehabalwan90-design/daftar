import { useState } from 'react'
import { Check, Mic, Mic2, Plus, TriangleAlert, X } from 'lucide-react'
import { parseArabicVoice, listenForArabicSpeech } from '../../services/ai/voiceParserService'
import { buildItemsFromCatalog, checkCreditLimit, transactionAmount } from '../../services/ledger/ledgerEngine'
import type { Product, ProductDraft, Transaction, TransactionItem, TransactionType, VoiceParseResult } from '../../types/ledger.types'
import type { CustomerWithBalance } from '../dashboard/DashboardView'
import { Field, Modal, money } from '../shared'

const aliasStorageKey = (shopId: string) => `daftari-smart-aliases:${shopId}`

const readAliases = (shopId: string): Record<string, string> => {
  const saved = localStorage.getItem(aliasStorageKey(shopId))
  if (!saved) return {}
  try {
    const parsed: unknown = JSON.parse(saved)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    }
    console.error('Daftari Smart: saved customer aliases have an invalid format')
  } catch (issue) {
    console.error('Daftari Smart: could not read saved customer aliases', issue)
  }
  return {}
}

export const VoiceLedgerModal = ({ customers, products, transactions, shopId, onSave, onSaveProduct, onManual, onClose }: {
  customers: CustomerWithBalance[]
  products: Product[]
  transactions: Transaction[]
  shopId: string
  onSave: (input: { customerId: string; type: TransactionType; items: TransactionItem[]; amount: number }) => void
  onSaveProduct: (product: ProductDraft) => void
  onManual: (input: { customerId?: string; type: TransactionType; amount?: number; note?: string }) => void
  onClose: () => void
}) => {
  const [utterance, setUtterance] = useState('')
  const [reply, setReply] = useState('')
  const [result, setResult] = useState<VoiceParseResult | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [missingPrice, setMissingPrice] = useState('')
  const [error, setError] = useState('')
  const [answer, setAnswer] = useState('')
  const [listening, setListening] = useState(false)
  const [preview, setPreview] = useState(false)
  const [recordedAmount, setRecordedAmount] = useState<number | undefined>()
  const [aliases, setAliases] = useState<Record<string, string>>(() => readAliases(shopId))
  const [pendingCommand, setPendingCommand] = useState('')
  const [pendingCustomerIds, setPendingCustomerIds] = useState<string[]>([])

  const rememberAlias = (customer: CustomerWithBalance, alias?: string) => {
    if (!alias || aliases[alias] === customer.id) return
    const nextAliases = { ...aliases, [alias]: customer.id }
    localStorage.setItem(aliasStorageKey(shopId), JSON.stringify(nextAliases))
    setAliases(nextAliases)
  }

  const confirm = () => {
    if (!selectedCustomer || !result || result.action === 'balance') return
    if (missing.length) {
      setError(`أدخل سعر «${missing[0]}» أولاً.`)
      return
    }
    if (amount <= 0) {
      setError('أدخل مبلغ الحركة أولاً.')
      return
    }
    onSave({ customerId: selectedCustomer.id, type: result.type, items: result.type === 'debt' ? items : [], amount })
    if (result.explicitCustomer) rememberAlias(selectedCustomer, result.learnedAlias)
    onClose()
  }

  const handleReply = (text: string) => {
    const normalized = text.trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '')
    if (/^(نعم|ايوه|أيوه|ايوا|ايو|aywa|yes|سجل|sajel|تمام|tamam|تم)$/.test(normalized)) {
      confirm()
      return
    }
    if (/^(لا|لأ|الغاء|إلغاء|no|cancel)$/.test(normalized)) {
      setPreview(false)
      setReply('')
      setError('تم إلغاء الحركة، ما تسجل أي مبلغ.')
      return
    }
    setError('قل أو اكتب: نعم للتسجيل، أو لا للإلغاء.')
  }

  const parse = (text: string) => {
    let command = text
    if (pendingCommand) {
      const clarification = parseArabicVoice(text, customers, products, aliases)
      const clarifiedCustomer = customers.find(customer => customer.id === pendingCustomerIds.find(id => id === customer.id) && customer.name === clarification.customerName)
      if (clarifiedCustomer && clarification.action === 'unknown') command = `${pendingCommand} ${text}`
    }
    setPendingCommand('')
    setPendingCustomerIds([])
    const parsed = parseArabicVoice(command, customers, products, aliases)
    setAnswer('')
    setError('')
    setResult(parsed)
    setUtterance(command)

    if (parsed.customerMatches.length > 1) {
      const firstName = parsed.customerName || parsed.customerMatches[0].split(/\s+/)[0]
      setPendingCommand(command)
      setPendingCustomerIds(customers.filter(customer => parsed.customerMatches.includes(customer.name)).map(customer => customer.id))
      setSelectedCustomer(null)
      setPreview(false)
      setError(`عندك ${parsed.customerMatches.length} زبائن باسم ${firstName}. قل الاسم الكامل أو رقم الهاتف: ${parsed.customerMatches.join('؟ ')}`)
      return
    }
    const customer = customers.find(item => item.name === parsed.customerName)
    if (parsed.unclear || !customer) {
      setSelectedCustomer(null)
      setPreview(false)
      setError('ما فهمت الاسم أو الحركة بوضوح. قل اسم الزبون كامل والمبلغ أو المنتج.')
      return
    }
    setSelectedCustomer(customer)
    if (parsed.action === 'balance') {
      setPreview(false)
      setAnswer(`باقي على ${customer.name} ${money(customer.remaining)}.`)
      if (parsed.explicitCustomer) rememberAlias(customer, parsed.learnedAlias)
      return
    }
    if (parsed.action === 'unknown') {
      setPreview(false)
      setError('حدد الحركة: تسجيل دين، خصم أو سداد، أو سؤال عن الرصيد.')
      return
    }
    const lookup = parsed.type === 'debt'
      ? buildItemsFromCatalog(parsed.items, products)
      : { items: [], missing: [] }
    setItems(lookup.items)
    setMissing(lookup.missing)
    setRecordedAmount(parsed.amount)
    setReply('')
    setPreview(true)
  }

  const listen = async () => {
    setListening(true)
    setError('')
    try {
      const transcript = await listenForArabicSpeech()
      if (preview) {
        setReply(transcript)
        handleReply(transcript)
      } else {
        setUtterance(transcript)
        parse(transcript)
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'تعذّر التقاط الصوت')
    } finally { setListening(false) }
  }

  const registerMissingProduct = () => {
    const price = Number(missingPrice)
    if (!missing[0] || !Number.isFinite(price) || price <= 0) return
    const nowId = crypto.randomUUID()
    const product: Product = { id: nowId, shopId, name: missing[0], category: 'عام', price, unit: 'قطعة', active: true, updatedAt: new Date().toISOString() }
    onSaveProduct(product)
    const quantity = result?.items.find(item => item.name === product.name)?.qty ?? 1
    setItems(current => [...current, { productId: nowId, productName: product.name, qty: quantity, unitPriceAtTime: price, total: price * quantity }])
    setMissing(current => current.slice(1))
    setMissingPrice('')
  }

  const amount = transactionAmount(items, recordedAmount)
  const credit = selectedCustomer && result?.type === 'debt' && result.action !== 'balance' ? checkCreditLimit(selectedCustomer, transactions, amount) : null
  const manual = () => {
    const customer = customers.find(item => item.name === result?.customerName)
    onManual({ customerId: customer?.id, type: result?.type ?? 'debt', amount: recordedAmount, note: utterance })
    onClose()
  }

  return <Modal title="دفترّي الذكي" onClose={onClose} wide>
    {!preview ? <div className="voice-content">
      <p className="voice-intro">اكتب أو قل أمراً مثل: «سجّل على أحمد ٥٠٠٠» أو «كم باقي على أحمد؟»</p>
      <button className={`voice-record ${listening ? 'listening' : ''}`} onClick={() => void listen()} disabled={listening} aria-label="ابدأ التسجيل"><Mic size={27} /><span>{listening ? 'أستمع إليك الآن...' : 'اضغط للتحدث'}</span><small>{listening ? 'تحدث بوضوح' : 'عربي أو إنجليزي'}</small></button>
      <div className="voice-divider"><span>أو اكتب الأمر</span></div>
      <Field label="أمر دفتري الذكي"><textarea rows={3} value={utterance} onChange={event => setUtterance(event.target.value)} placeholder="سجّل على أحمد كيس سكر" /></Field>
      {answer && <div className="smart-answer" role="status">{answer}</div>}
      {error && <div className="inline-alert"><TriangleAlert size={18} /><span>{error}</span>{result?.customerMatches.length === 0 && <button className="button button-outline" onClick={manual}>إدخال يدوي</button>}</div>}
      <div className="modal-actions"><button className="button button-quiet" onClick={onClose}>إلغاء</button><button className="button button-primary" onClick={() => parse(utterance)} disabled={!utterance.trim()}><Mic2 size={17} /> فهم الأمر</button></div>
    </div> : <div className="voice-content">
      <div className="preview-heading"><span className="preview-check"><Check size={19} /></span><div><h3>راجع قبل التسجيل</h3><p>ما تسجل أي مبلغ إلا بعد تأكيدك</p></div></div>
      <div className="preview-customer"><span className="customer-avatar">{selectedCustomer?.name.slice(0, 1)}</span><div><small>الزبون</small><strong>{selectedCustomer?.name}</strong></div><span className={`transaction-type-chip ${result?.type}`}>{result?.action === 'deduct' ? 'خصم / سداد' : 'دين جديد'}</span></div>
      {items.length > 0 && <div className="preview-items">{items.map((item, index) => <div key={`${item.productId}-${index}`}><span>{item.qty} × {money(item.unitPriceAtTime)} = {money(item.total)} <small>({item.productName})</small></span><strong>{money(item.total)}</strong></div>)}</div>}
      {!!missing.length && <div className="missing-product"><TriangleAlert size={18} /><div><strong>ما عندي سعر «{missing[0]}»، كم سعره في محلك؟</strong><p>بحفظ السعر لهذا المحل فقط، وبعدها أعرض الحركة للتأكيد.</p><div className="missing-price-row"><input type="number" min="1" value={missingPrice} onChange={event => setMissingPrice(event.target.value)} placeholder="السعر بالريال" /><button className="button button-primary" onClick={registerMissingProduct} disabled={!missingPrice || Number(missingPrice) <= 0}><Plus size={16} /> حفظ السعر</button></div></div></div>}
      {result?.type === 'payment' && <div className="manual-amount"><Field label="مبلغ الخصم أو السداد بالريال"><input type="number" min="1" value={recordedAmount ?? ''} onChange={event => setRecordedAmount(Number(event.target.value))} placeholder="أدخل المبلغ" /></Field></div>}
      {credit && credit.exceededBy > 0 && <div className="inline-alert warning-alert"><TriangleAlert size={18} /><span>تجاوز سقف الدين بـ {money(credit.exceededBy)}</span></div>}
      <div className="preview-total"><span>{result?.action === 'deduct' ? 'مبلغ الخصم / السداد' : 'الإجمالي'}</span><strong>{missing.length ? 'بانتظار تحديد السعر' : money(amount)}</strong></div>
      <p className="confirmation-prompt">{result?.action === 'deduct' ? 'بخصم من' : 'بسجل على'} {selectedCustomer?.name} مبلغ {money(amount)}{items.length ? ` مقابل ${items.map(item => `${item.qty} × ${item.productName}`).join('، ')}` : ''}. قل أو اكتب «أيوه» للتسجيل.</p>
      <div className="confirmation-reply"><Field label="ردّك"><input value={reply} onChange={event => setReply(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleReply(reply) }} placeholder="اكتب أيوه أو لا" /></Field><button className={`icon-button ${listening ? 'listening' : ''}`} onClick={() => void listen()} disabled={listening} aria-label="رد صوتياً"><Mic size={19} /></button></div>
      {error && <div className="inline-alert" role="alert"><TriangleAlert size={18} /><span>{error}</span></div>}
      <div className="modal-actions"><button className="button button-quiet" onClick={() => { setPreview(false); setError('') }}><X size={16} /> تعديل</button><button className="button button-quiet" onClick={() => handleReply('لا')}>إلغاء</button><button className="button button-primary" onClick={() => handleReply(reply)} disabled={!!missing.length || amount <= 0 || !reply.trim()}>تأكيد وتسجيل</button></div>
    </div>}
  </Modal>
}
