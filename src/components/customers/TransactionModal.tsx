import { useMemo, useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { Customer, Product, TransactionItem, TransactionType } from '../../types/ledger.types'
import { Field, Modal, money } from '../shared'

export const TransactionModal = ({ customers, products, initialCustomerId, initialType = 'debt', initialAmount, initialNote, onSave, onClose }: {
  customers: Customer[]
  products: Product[]
  initialCustomerId?: string
  initialType?: TransactionType
  initialAmount?: number
  initialNote?: string
  onSave: (input: { customerId: string; type: TransactionType; items: TransactionItem[]; amount: number; note?: string }) => void
  onClose: () => void
}) => {
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '')
  const [type, setType] = useState<TransactionType>(initialType)
  const [amount, setAmount] = useState(initialAmount?.toString() ?? '')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')
  const [items, setItems] = useState<TransactionItem[]>([])
  const [note, setNote] = useState(initialNote ?? '')
  const total = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items])
  const addItem = () => {
    const product = products.find(item => item.id === productId)
    if (!product || Number(qty) <= 0) return
    setItems(current => [...current, { productId: product.id, productName: product.name, qty: Number(qty), unitPriceAtTime: product.price, total: product.price * Number(qty) }])
    setProductId('')
    setQty('1')
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const finalAmount = type === 'payment' || items.length === 0 ? Number(amount) : total
    if (!customerId || finalAmount <= 0) return
    onSave({ customerId, type, items: type === 'debt' ? items : [], amount: finalAmount, note: note || undefined })
    onClose()
  }
  return <Modal title="تسجيل حركة حساب" onClose={onClose} wide>
    <form className="form-stack" onSubmit={submit}>
      <div className="transaction-type-switch"><button type="button" className={type === 'debt' ? 'active debt' : ''} onClick={() => setType('debt')}>تسجيل دين</button><button type="button" className={type === 'payment' ? 'active payment' : ''} onClick={() => setType('payment')}>تسجيل سداد</button></div>
      <Field label="الزبون"><select required value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="" disabled>اختر الزبون</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></Field>
      {type === 'debt' && <div className="cart-entry"><Field label="المنتج"><select value={productId} onChange={event => setProductId(event.target.value)}><option value="">اختر من منتجاتك المسجلة</option>{products.filter(product => product.active).map(product => <option key={product.id} value={product.id}>{product.name} — {money(product.price)} / {product.unit}</option>)}</select></Field><Field label="الكمية"><input type="number" min="1" value={qty} onChange={event => setQty(event.target.value)} /></Field><button type="button" className="button button-outline add-item-button" onClick={addItem} disabled={!productId}><Plus size={16} /> إضافة</button></div>}
      {items.length > 0 && <div className="cart-list">{items.map((item, index) => <div key={`${item.productId}-${index}`}><span>{item.productName} × {item.qty}</span><strong>{money(item.total)}</strong><button type="button" className="icon-button danger-icon" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="حذف المنتج"><Trash2 size={16} /></button></div>)}<div className="cart-total"><span>إجمالي الدين</span><strong>{money(total)}</strong></div></div>}
      {(type === 'payment' || !items.length) && <Field label={type === 'payment' ? 'مبلغ السداد بالريال' : 'المبلغ بالريال'}><input required type="number" min="1" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="أدخل المبلغ" /></Field>}
      <Field label="ملاحظة (اختياري)"><input value={note} onChange={event => setNote(event.target.value)} placeholder="مثال: سداد نقدي" /></Field>
      {type === 'debt' && items.length > 0 && <p className="form-hint">سيُحفظ سعر كل منتج كما هو الآن، حتى لو تغير سعره لاحقاً.</p>}
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}><Minus size={16} /> إلغاء</button><button type="submit" className="button button-primary">حفظ الحركة</button></div>
    </form>
  </Modal>
}
