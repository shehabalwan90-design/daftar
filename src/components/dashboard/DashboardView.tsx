import { ArrowLeft, Mic2, Plus, TrendingUp, TriangleAlert, UsersRound } from 'lucide-react'
import type { Customer } from '../../types/ledger.types'
import { money } from '../shared'

export interface CustomerWithBalance extends Customer {
  debt: number
  paid: number
  remaining: number
}

export const DashboardView = ({ customers, onCustomers, onVoice, onAddTransaction }: {
  customers: CustomerWithBalance[]
  onCustomers: () => void
  onVoice: () => void
  onAddTransaction: () => void
}) => {
  const alerts = customers.filter(customer => customer.creditLimit > 0 && customer.remaining / customer.creditLimit >= 0.7)
  const debtors = [...customers].filter(customer => customer.remaining > 0).sort((a, b) => b.remaining - a.remaining).slice(0, 5)
  return <div className="dashboard-layout">
    {alerts.length > 0 && <div className="alert-banner"><span className="alert-icon"><TriangleAlert size={20} /></span><div><strong>تنبيه بشأن سقف الدين</strong><p>{alerts.length} زبائن اقتربوا من سقف حسابهم أو تجاوزوه. راجع حساباتهم قبل تسجيل دين جديد.</p></div><button onClick={onCustomers}>عرض الزبائن <ArrowLeft size={16} /></button></div>}
    <section className="welcome-panel"><div className="welcome-copy"><span className="welcome-kicker">دفتر محلك بين يديك</span><h2>حسابات واضحة، وراحة بال أكبر</h2><p>سجّل الديون والسداد، وتابع رصيد كل زبون من مكان واحد.</p><div className="welcome-actions"><button className="button button-light" onClick={onAddTransaction}><Plus size={17} /> حركة جديدة</button><button className="button button-outline-light" onClick={onVoice}><Mic2 size={17} /> سجّل بصوتك</button></div></div><div className="welcome-art" aria-hidden="true"><div className="art-circle"><span>د</span></div><div className="art-card art-card-one"><TrendingUp size={18} /><span>حسابات منظّمة</span></div><div className="art-card art-card-two"><UsersRound size={18} /><span>زبائنك في مكان واحد</span></div></div></section>
    <div className="section-heading"><div><h2>حسابات تحتاج متابعة</h2><p>أعلى الأرصدة المتبقية على زبائنك</p></div><button className="text-button" onClick={onCustomers}>كل الزبائن <ArrowLeft size={16} /></button></div>
    {debtors.length ? <section className="debtor-list">{debtors.map(customer => {
      const ratio = customer.creditLimit ? customer.remaining / customer.creditLimit : 0
      const level = ratio >= 0.9 ? 'critical' : ratio >= 0.7 ? 'warning' : 'healthy'
      return <article className="debtor-row" key={customer.id}><span className="customer-avatar">{customer.name.slice(0, 1)}</span><div className="debtor-info"><strong>{customer.name}</strong><small>{customer.cycle === 'weekly' ? 'حساب أسبوعي' : 'حساب شهري'}</small></div><div className="limit-progress"><div className="progress-track"><span className={level} style={{ width: `${Math.min(ratio * 100, 100)}%` }} /></div><small>{Math.round(ratio * 100)}٪ من السقف</small></div><strong className="debtor-balance">{money(customer.remaining)}</strong><span className={`status-dot ${level}`} /></article>
    })}</section> : <div className="empty-state"><span>✨</span><strong>أحسنت! لا توجد مبالغ متأخرة</strong><p>ستظهر الحسابات هنا عند تسجيل دين جديد.</p></div>}
    <div className="dashboard-bottom"><div className="mini-info-card"><span className="mini-icon teal"><UsersRound size={20} /></span><div><strong>{customers.length.toLocaleString('ar-YE')} زبائن</strong><small>مسجلون في دفترك</small></div><button className="icon-button" onClick={onCustomers} aria-label="قائمة الزبائن"><ArrowLeft size={18} /></button></div><div className="mini-info-card"><span className="mini-icon gold"><TrendingUp size={20} /></span><div><strong>{customers.filter(customer => customer.remaining === 0).length.toLocaleString('ar-YE')} حسابات مسددة</strong><small>زبائن بلا رصيد متبقٍ</small></div></div></div>
  </div>
}
