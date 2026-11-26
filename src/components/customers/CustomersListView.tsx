import { useMemo, useState } from 'react'
import { ArrowLeft, CirclePlus, Search, UserRound, Users } from 'lucide-react'
import { money } from '../shared'
import type { CustomerWithBalance } from '../dashboard/DashboardView'

export const CustomersListView = ({ customers, onSelect, onAdd, onVoice }: {
  customers: CustomerWithBalance[]
  onSelect: (id: string) => void
  onAdd: () => void
  onVoice: () => void
}) => {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => customers.filter(customer => `${customer.name} ${customer.phone}`.includes(search.trim())), [customers, search])
  return <section className="content-card">
    <div className="section-heading inside"><div><h2>دفتر الزبائن</h2><p>تابع رصيد كل زبون وحسابه بالتفصيل</p></div><div className="heading-actions"><button className="button button-quiet" onClick={onVoice}><span>🎙️</span> تسجيل بالصوت</button><button className="button button-primary" onClick={onAdd}><CirclePlus size={17} /> زبون جديد</button></div></div>
    <label className="search-field customer-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف..." /></label>
    <div className="customer-table">
      <div className="customer-table-head"><span>الزبون</span><span>الدورة</span><span>سقف الدين</span><span>المتبقي</span><span /></div>
      {filtered.map(customer => {
        const ratio = customer.creditLimit ? customer.remaining / customer.creditLimit : 0
        const status = customer.remaining === 0 ? 'settled' : ratio >= 0.9 ? 'critical' : ratio >= 0.7 ? 'warning' : 'healthy'
        return <button className="customer-table-row" key={customer.id} onClick={() => onSelect(customer.id)}>
          <span className="table-customer"><span className={`customer-avatar ${status}`}>{customer.name.slice(0, 1)}</span><span><strong>{customer.name}</strong><small dir="ltr">{customer.phone || '—'}</small></span></span>
          <span className="cycle-badge">{customer.cycle === 'weekly' ? 'أسبوعي' : 'شهري'}</span><span className="muted-value">{money(customer.creditLimit)}</span><span><strong className={`balance-text ${status}`}>{money(customer.remaining)}</strong><small className="limit-percent">{customer.creditLimit ? `${Math.round(ratio * 100)}٪ من السقف` : 'بلا سقف محدد'}</small></span><ArrowLeft size={17} className="row-arrow" />
        </button>
      })}
      {!filtered.length && <div className="empty-state"><UserRound size={30} /><strong>{customers.length ? 'لا توجد نتائج' : 'دفترك بانتظار أول زبون'}</strong><p>{customers.length ? 'جرّب البحث باسم مختلف.' : 'أضف زبائنك وابدأ بتنظيم حساباتهم.'}</p>{!customers.length && <button className="button button-primary" onClick={onAdd}><Users size={17} /> إضافة زبون</button>}</div>}
    </div>
  </section>
}
