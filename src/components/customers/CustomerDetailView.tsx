import { ArrowRight, ArrowUpLeft, ArrowDownLeft, CalendarClock, CircleDollarSign, FileClock, Plus } from 'lucide-react'
import type { ArchiveCycle, Customer, Transaction } from '../../types/ledger.types'
import { money } from '../shared'

export const CustomerDetailView = ({ customer, transactions, archives, balance, onBack, onNewTransaction, onCloseCycle }: {
  customer: Customer
  transactions: Transaction[]
  archives: ArchiveCycle[]
  balance: { debt: number; paid: number; remaining: number }
  onBack: () => void
  onNewTransaction: (type: 'debt' | 'payment') => void
  onCloseCycle: () => void
}) => {
  const ratio = customer.creditLimit ? balance.remaining / customer.creditLimit : 0
  const level = ratio >= 0.9 ? 'critical' : ratio >= 0.7 ? 'warning' : 'healthy'
  return <div className="detail-view">
    <button className="back-link" onClick={onBack}><ArrowRight size={17} /> العودة إلى الزبائن</button>
    <section className="detail-profile"><div className="large-avatar">{customer.name.slice(0, 1)}</div><div className="profile-info"><h2>{customer.name}</h2><p dir="ltr">{customer.phone || 'لا يوجد رقم هاتف'}</p><span className="cycle-badge"><CalendarClock size={14} /> حساب {customer.cycle === 'weekly' ? 'أسبوعي' : 'شهري'}</span></div><div className="profile-actions"><button className="button button-quiet" onClick={onCloseCycle}>إغلاق الدورة</button><button className="button button-primary" onClick={() => onNewTransaction('debt')}><Plus size={17} /> تسجيل دين</button></div></section>
    <div className="detail-metrics"><article><span>إجمالي الدين</span><strong>{money(balance.debt)}</strong><ArrowUpLeft className="metric-icon amber" size={18} /></article><article><span>الصافي المسدد</span><strong>{money(balance.paid)}</strong><ArrowDownLeft className="metric-icon teal" size={18} /></article><article className={`remaining-metric ${level}`}><span>المتبقي الفعلي</span><strong>{money(balance.remaining)}</strong><CircleDollarSign className={`metric-icon ${level}`} size={18} /></article></div>
    {customer.creditLimit > 0 && <div className={`credit-meter ${level}`}><div className="meter-label"><span>سقف الدين</span><strong>{money(customer.creditLimit)} <small>— {Math.round(ratio * 100)}٪ مستخدم</small></strong></div><div className="progress-track"><span className={level} style={{ width: `${Math.min(ratio * 100, 100)}%` }} /></div></div>}
    <section className="content-card history-card"><div className="section-heading inside"><div><h3>سجل الحساب</h3><p>كل الحركات المسجلة لهذا الزبون</p></div><button className="button button-outline" onClick={() => onNewTransaction('payment')}><ArrowDownLeft size={17} /> تسجيل سداد</button></div>
      {transactions.length ? <div className="history-list">{transactions.map(transaction => <article className="history-row" key={transaction.id}><span className={`history-icon ${transaction.type}`}>{transaction.type === 'debt' ? <ArrowUpLeft size={17} /> : <ArrowDownLeft size={17} />}</span><div className="history-description"><strong>{transaction.type === 'debt' ? 'دين جديد' : 'سداد'}</strong><small>{new Date(transaction.createdAt).toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })}{transaction.note ? ` • ${transaction.note}` : ''}</small>{transaction.items.length > 0 && <small className="itemized">{transaction.items.map(item => `${item.productName} × ${item.qty} — ${money(item.unitPriceAtTime)}`).join('، ')}</small>}</div><strong className={transaction.type === 'debt' ? 'debt-amount' : 'paid-amount'}>{transaction.type === 'debt' ? '+' : '−'} {money(transaction.amount)}</strong></article>)}</div> : <div className="empty-state compact"><FileClock size={28} /><strong>لا توجد حركات بعد</strong><p>ستظهر الديون وعمليات السداد هنا.</p></div>}
    </section>
    {archives.length > 0 && <section className="archive-note"><FileClock size={18} /><span>تم إغلاق {archives.length.toLocaleString('ar-YE')} دورة حساب سابقة، وآخر رصيد مرحّل {money(archives[0].remaining)}.</span></section>}
  </div>
}
