import { useState } from 'react'
import { CalendarClock, Check, MessageCircle, Send, Sparkles } from 'lucide-react'
import { createReminder } from '../../services/ai/reminderService'
import type { CustomerWithBalance } from '../dashboard/DashboardView'
import { money } from '../shared'

export const CollectionsView = ({ customers, onCloseCycle, onToast }: {
  customers: CustomerWithBalance[]
  onCloseCycle: (customer: CustomerWithBalance) => void
  onToast: (message: string) => void
}) => {
  const [selectedId, setSelectedId] = useState('')
  const dueDate = (customer: CustomerWithBalance) => new Date(Date.now() + (customer.cycle === 'weekly' ? 7 : 30) * 86400000).toLocaleDateString('ar-YE', { day: 'numeric', month: 'long' })
  const owing = [...customers].filter(customer => customer.remaining > 0).sort((a, b) => b.remaining - a.remaining)
  const selected = customers.find(customer => customer.id === selectedId)
  const sendReminder = (customer: CustomerWithBalance) => {
    if (!customer.phone) { onToast('أضف رقم هاتف الزبون لإرسال تذكير واتساب'); return }
    const text = createReminder(customer.name, customer.remaining, dueDate(customer))
    window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }
  return <div className="collections-layout">
    <section className="collection-intro"><span className="collection-spark"><Sparkles size={20} /></span><div><h2>تحصيلٌ ألطف، وحسابٌ أوضح</h2><p>أرسل تذكيراً ودياً، أو أغلق دورة الحساب مع ترحيل الرصيد المتبقي تلقائياً.</p></div></section>
    <section className="content-card"><div className="section-heading inside"><div><h2>المبالغ المستحقة</h2><p>{owing.length.toLocaleString('ar-YE')} حسابات لديها رصيد متبقٍ</p></div><span className="owing-total">{money(owing.reduce((sum, item) => sum + item.remaining, 0))}</span></div>
      {owing.length ? <div className="collection-list">{owing.map(customer => <article className="collection-row" key={customer.id}><span className="customer-avatar">{customer.name.slice(0, 1)}</span><div className="collection-customer"><strong>{customer.name}</strong><small>{customer.cycle === 'weekly' ? 'دورة أسبوعية' : 'دورة شهرية'} • الاستحقاق {dueDate(customer)}</small></div><strong className="balance-text warning">{money(customer.remaining)}</strong><button className="button whatsapp-button" onClick={() => sendReminder(customer)}><MessageCircle size={17} /> تذكير واتساب</button><button className="button button-outline close-cycle-button" onClick={() => onCloseCycle(customer)}><CalendarClock size={16} /> إغلاق الدورة</button></article>)}</div> : <div className="empty-state"><Check size={30} /><strong>لا توجد مبالغ مستحقة للتحصيل</strong><p>ستظهر الحسابات ذات الرصيد هنا.</p></div>}
    </section>
    {selected && <div className="reminder-preview"><div><Send size={18} /><strong>معاينة التذكير</strong></div><p>{createReminder(selected.name, selected.remaining, dueDate(selected))}</p><button className="button button-primary" onClick={() => sendReminder(selected)}>فتح واتساب</button></div>}
    <div className="collection-footnote">لن يُرسل أي تذكير تلقائياً. ستراجع الرسالة في واتساب قبل إرسالها.</div>
    {owing.length > 0 && <div className="collection-select"><label htmlFor="reminder-preview-select">معاينة رسالة زبون</label><select id="reminder-preview-select" value={selectedId} onChange={event => setSelectedId(event.target.value)}><option value="">اختر زبوناً لمعاينة الرسالة</option>{owing.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>}
  </div>
}
