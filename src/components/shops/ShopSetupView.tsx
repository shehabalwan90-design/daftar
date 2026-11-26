import { useState } from 'react'
import { Store } from 'lucide-react'
import { shopTypes } from '../../constants/shopTypes'
import { arabicErrorMessage } from '../../services/storage/errorMessages'
import type { ShopType } from '../../types/ledger.types'
import { Field, Modal } from '../shared'

export const ShopSetupView = ({ onCreate, onClose }: {
  onCreate: (input: { name: string; ownerName: string; phone: string; password: string; type: ShopType; customType?: string }) => Promise<boolean>
  onClose: () => void
}) => {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [type, setType] = useState<ShopType>('grocery')
  const [customType, setCustomType] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onCreate({ name: name.trim(), ownerName: ownerName.trim(), phone: phone.trim(), password, type, customType: type === 'other' ? customType.trim() : undefined })
      onClose()
    } catch (issue) {
      console.error('تعذّر إنشاء المحل:', issue)
      const detail = issue instanceof Error ? issue.message : String(issue)
      setError(`${arabicErrorMessage(issue, detail)} (${detail})`)
    }
    finally { setBusy(false) }
  }
  return <Modal title="إعداد محل جديد" onClose={onClose} wide>
    <form className="form-stack" onSubmit={event => void submit(event)}>
      <div className="shop-type-grid">{shopTypes.map(item => <button type="button" key={item.id} className={`shop-type-option ${type === item.id ? 'selected' : ''}`} onClick={() => setType(item.id)}><span>{item.icon}</span><strong>{item.label}</strong></button>)}</div>
      {type === 'other' && <Field label="نوع المحل"><input required value={customType} onChange={event => setCustomType(event.target.value)} placeholder="اكتب نوع المحل" /></Field>}
      <div className="form-row"><Field label="اسم المحل"><input required value={name} onChange={event => setName(event.target.value)} placeholder="مثال: بقالة النور" /></Field><Field label="اسم المالك"><input required value={ownerName} onChange={event => setOwnerName(event.target.value)} placeholder="اسمك الكامل" /></Field></div>
      <div className="form-row"><Field label="رقم الهاتف"><input type="tel" dir="ltr" required value={phone} onChange={event => setPhone(event.target.value)} placeholder="9677..." /></Field><Field label="كلمة المرور"><input type="password" dir="ltr" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="٨ أحرف على الأقل" /></Field></div>
      <div className="setup-hint"><Store size={17} /><span>بيانات كل محل مستقلة. لن نضيف أسعاراً تلقائية؛ أنت تحدد أسعار منتجاتك.</span></div>
      {error && <div className="inline-alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>إلغاء</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'جارٍ إنشاء المحل...' : 'إنشاء حساب المحل'}</button></div>
    </form>
  </Modal>
}
