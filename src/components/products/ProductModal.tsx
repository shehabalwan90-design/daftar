import { useState } from 'react'
import type { Product, ProductDraft } from '../../types/ledger.types'
import { Field, Modal } from '../shared'

export const ProductModal = ({ product, initialName, categories, onSave, onClose }: {
  product?: Product
  initialName?: string
  categories: string[]
  onSave: (product: ProductDraft) => void
  onClose: () => void
}) => {
  const [name, setName] = useState(product?.name ?? initialName ?? '')
  const [category, setCategory] = useState(product?.category ?? categories[0] ?? 'عام')
  const [price, setPrice] = useState(product?.price.toString() ?? '')
  const [unit, setUnit] = useState(product?.unit ?? 'قطعة')
  const [stock, setStock] = useState(product?.stock?.toString() ?? '')
  const [barcode, setBarcode] = useState(product?.barcode ?? '')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !price || Number(price) < 0) return
    onSave({ id: product?.id, name: name.trim(), category, price: Number(price), unit, stock: stock ? Number(stock) : undefined, barcode: barcode || undefined, active: product?.active ?? true })
    onClose()
  }
  return <Modal title={product ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}>
      <Field label="اسم المنتج"><input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="مثال: رز بسمتي" /></Field>
      <div className="form-row"><Field label="التصنيف"><input required list="daftar-product-categories" value={category} onChange={event => setCategory(event.target.value)} /><datalist id="daftar-product-categories">{categories.map(item => <option key={item} value={item} />)}</datalist></Field><Field label="الوحدة"><input required list="daftar-product-units" value={unit} onChange={event => setUnit(event.target.value)} /><datalist id="daftar-product-units">{['كيس', 'علبة', 'شريط', 'قطعة', 'كيلو', 'لتر', 'متر', 'زوج'].map(item => <option key={item} value={item} />)}</datalist></Field></div>
      <div className="form-row"><Field label="السعر بالريال"><input required type="number" min="0" inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} placeholder="أدخل السعر" /></Field><Field label="الكمية المتوفرة (اختياري)"><input type="number" min="0" inputMode="numeric" value={stock} onChange={event => setStock(event.target.value)} placeholder="—" /></Field></div>
      <Field label="الباركود (اختياري)"><input value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="أدخل الباركود" /></Field>
      <p className="form-hint">السعر من تحديدك أنت، ويُحفظ سعر كل عملية وقت تسجيلها.</p>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>إلغاء</button><button type="submit" className="button button-primary">حفظ المنتج</button></div>
    </form>
  </Modal>
}
