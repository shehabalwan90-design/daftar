import { ArrowDownLeft, ArrowUpLeft, Wallet } from 'lucide-react'
import { money } from '../shared'

export const HeaderStats = ({ totals }: { totals: { debt: number; paid: number; remaining: number } }) => (
  <div className="stats-grid">
    <div className="stat-card"><span className="stat-icon amber"><ArrowUpLeft size={18} /></span><div><span className="stat-label">إجمالي الدين</span><strong>{money(totals.debt)}</strong></div></div>
    <div className="stat-card"><span className="stat-icon teal"><ArrowDownLeft size={18} /></span><div><span className="stat-label">الصافي المسدد</span><strong>{money(totals.paid)}</strong></div></div>
    <div className="stat-card"><span className="stat-icon emerald"><Wallet size={18} /></span><div><span className="stat-label">المتبقي الفعلي</span><strong>{money(totals.remaining)}</strong></div></div>
  </div>
)
