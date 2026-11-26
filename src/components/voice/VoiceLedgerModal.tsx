import { useState } from 'react'
import { Check, Mic, Mic2, Plus, TriangleAlert, X } from 'lucide-react'
import { parseArabicVoice, listenForArabicSpeech } from '../../services/ai/voiceParserService'
import { buildItemsFromCatalog, checkCreditLimit, transactionAmount } from '../../services/ledger/ledgerEngine'
import type { Product, ProductDraft, Transaction, TransactionItem, TransactionType, VoiceParseResult } from '../../types/ledger.types'
import type { CustomerWithBalance } from '../dashboard/DashboardView'
import { Field, Modal, money } from '../shared'

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
  const [result, setResult] = useState<VoiceParseResult | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [missingPrice, setMissingPrice] = useState('')
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [preview, setPreview] = useState(false)
  const [recordedAmount, setRecordedAmount] = useState<number | undefined>()

  const parse = (text: string) => {
    const parsed = parseArabicVoice(text, customers.map(customer => customer.name))
    const customer = customers.find(item => item.name === parsed.customerName)
    if (parsed.unclear || !customer) {
      setError('تعذّر التقاط الاسم أو المبلغ بوضوح')
      setResult(parsed)
      setPreview(false)
      return
    }
    const lookup = parsed.type === 'debt'
      ? buildItemsFromCatalog(parsed.items, products)
      : { items: [], missing: [] }
    setError('')
    setResult(parsed)
    setSelectedCustomer(customer)
    setItems(lookup.items)
    setMissing(lookup.missing)
    setRecordedAmount(parsed.amount)
    setPreview(true)
  }
  const listen = async () => {
    setListening(true)
    setError('')
    try {
      const transcript = await listenForArabicSpeech()
      setUtterance(transcript)
      parse(transcript)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'تعذّر التقاط الاسم أو المبلغ بوضوح')
    } finally { setListening(false) }
  }
  const registerMissingProduct = () => {
    const price = Number(missingPrice)
    if (!missing[0] || price <= 0) return
    const nowId = crypto.randomUUID()
    const product: Product = { id: nowId, shopId, name: missing[0], category: 'عام', price, unit: 'قطعة', active: true, updatedAt: new Date().toISOString() }
    onSaveProduct(product)
    setItems(current => [...current, { productId: nowId, productName: product.name, qty: result?.items.find(item => item.name === product.name)?.qty ?? 1, unitPriceAtTime: price, total: price * (result?.items.find(item => item.name === product.name)?.qty ?? 1) }])
    setMissing(current => current.slice(1))
    setMissingPrice('')
  }
  const amount = transactionAmount(items, recordedAmount)
  const credit = selectedCustomer && result?.type === 'debt' ? checkCreditLimit(selectedCustomer, transactions, amount) : null
  const confirm = () => {
    if (!selectedCustomer || !result || missing.length || amount <= 0) return
    onSave({ customerId: selectedCustomer.id, type: result.type, items: result.type === 'debt' ? items : [], amount })
    onClose()
  }
  const manual = () => {
    const customer = customers.find(item => item.name === result?.customerName)
    onManual({ customerId: customer?.id, type: result?.type ?? 'debt', amount: recordedAmount, note: utterance })
    onClose()
  }
  return <Modal title="تسجيل حركة بالصوت" onClose={onClose} wide>
    {!preview ? <div className="voice-content">
      <p className="voice-intro">قل مثلاً: «سجّل على صالح رز وسكر» أو «سالم سدّد ٥٠٠٠ ريال»</p>
      <button className={`voice-record ${listening ? 'listening' : ''}`} onClick={() => void listen()} disabled={listening} aria-label="ابدأ التسجيل"><Mic size={27} /><span>{listening ? 'أستمع إليك الآن...' : 'اضغط للتحدث'}</span><small>{listening ? 'تحدث بوضوح' : 'يدعم العربية'}</small></button>
      <div className="voice-divider"><span>أو اكتب العبارة</span></div>
      <Field label="العبارة الصوتية أو النص"><textarea rows={3} value={utterance} onChange={event => setUtterance(event.target.value)} placeholder="سجّل على صالح رز وسكر" /></Field>
      {error && <div className="inline-alert"><TriangleAlert size={18} /><span>{error}</span><button className="button button-outline" onClick={manual}>إدخال يدوي</button></div>}
      <div className="modal-actions"><button className="button button-quiet" onClick={onClose}>إلغاء</button><button className="button button-primary" onClick={() => parse(utterance)} disabled={!utterance.trim()}><Mic2 size={17} /> مراجعة الحركة</button></div>
    </div> : <div className="voice-content">
      <div className="preview-heading"><span className="preview-check"><Check size={19} /></span><div><h3>راجع الحركة قبل تسجيلها</h3><p>لم يُسجّل أي مبلغ بعد</p></div></div>
      <div className="preview-customer"><span className="customer-avatar">{selectedCustomer?.name.slice(0, 1)}</span><div><small>الزبون</small><strong>{selectedCustomer?.name}</strong></div><span className={`transaction-type-chip ${result?.type}`}>{result?.type === 'debt' ? 'دين جديد' : 'سداد'}</span></div>
      {items.length > 0 && <div className="preview-items">{items.map((item, index) => <div key={`${item.productId}-${index}`}><span>{item.productName} <small>× {item.qty}</small></span><strong>{money(item.total)}</strong></div>)}</div>}
      {!!missing.length && <div className="missing-product"><TriangleAlert size={18} /><div><strong>سعر «{missing[0]}» غير مسجل، كم سعره؟</strong><p>أدخل السعر ليُضاف إلى منتجاتك ويُستخدم لهذه الحركة.</p><div className="missing-price-row"><input type="number" min="1" value={missingPrice} onChange={event => setMissingPrice(event.target.value)} placeholder="السعر بالريال" /><button className="button button-primary" onClick={registerMissingProduct} disabled={!missingPrice || Number(missingPrice) <= 0}><Plus size={16} /> حفظ السعر</button></div></div></div>}
      {result?.type === 'payment' && items.length === 0 && <div className="manual-amount"><Field label="مبلغ السداد بالريال"><input type="number" min="1" value={recordedAmount ?? ''} onChange={event => setRecordedAmount(Number(event.target.value))} placeholder="أدخل المبلغ" /></Field></div>}
      {credit && credit.exceededBy > 0 && <div className="inline-alert warning-alert"><TriangleAlert size={18} /><span>تجاوز سقف الدين بـ {money(credit.exceededBy)}</span></div>}
      <div className="preview-total"><span>الإجمالي</span><strong>{missing.length ? 'بانتظار تحديد السعر' : money(amount)}</strong></div>
      <div className="modal-actions"><button className="button button-quiet" onClick={() => setPreview(false)}><X size={16} /> تعديل</button><button className="button button-primary" onClick={confirm} disabled={!!missing.length || amount <= 0}>تأكيد وتسجيل الحركة</button></div>
    </div>}
  </Modal>
}
