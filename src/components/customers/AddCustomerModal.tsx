import { useState } from 'react'
import type { CycleFrequency } from '../../types/ledger.types'
import { Field, Modal } from '../shared'
import { arabicErrorMessage } from '../../services/storage/errorMessages'

export const AddCustomerModal = ({ onSave, onClose }: {
  onSave: (input: { name: string; phone: string; creditLimit: number; cycle: CycleFrequency }) => Promise<void>
  onClose: () => void
}) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [limit, setLimit] = useState('')
  const [cycle, setCycle] = useState<CycleFrequency>('monthly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await onSave({ name: name.trim(), phone: phone.replace(/\s+/g, ''), creditLimit: Number(limit) || 0, cycle })
      onClose()
    } catch (issue) {
      console.error('تعذّر حفظ الزبون:', issue)
      const detail = issue instanceof Error ? issue.message : String(issue)
      setError(`${arabicErrorMessage(issue, detail)} (${detail})`)
    } finally {
      setBusy(false)
    }
  }
  return <Modal title="إضافة زبون جديد" onClose={onClose}>
    <form className="form-stack" onSubmit={event => void submit(event)}>
      <Field label="اسم الزبون"><input required autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="الاسم الكامل" /></Field>
      <Field label="رقم الهاتف"><input type="tel" dir="ltr" value={phone} onChange={event => setPhone(event.target.value)} placeholder="9677..." /></Field>
      <Field label="سقف الدين بالريال"><input type="number" min="0" inputMode="numeric" value={limit} onChange={event => setLimit(event.target.value)} placeholder="مثال: 50000" /></Field>
      <Field label="دورة الحساب"><select value={cycle} onChange={event => setCycle(event.target.value as CycleFrequency)}><option value="weekly">أسبوعي</option><option value="monthly">شهري</option></select></Field>
      {error && <div className="inline-alert" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>إلغاء</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'جارٍ حفظ الزبون...' : 'حفظ الزبون'}</button></div>
    </form>
  </Modal>
}
