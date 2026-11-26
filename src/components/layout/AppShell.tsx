import type { ReactNode } from 'react'
import { Bell, Boxes, ChartNoAxesCombined, CircleUserRound, Cloud, CloudOff, Menu, Plus, Settings, Store, Users, WifiOff } from 'lucide-react'
import type { AppTab, Shop } from '../../types/ledger.types'
import { shopTypeLabel } from '../../constants/shopTypes'
import { HeaderStats } from './HeaderStats'

const navigation: Array<{ id: AppTab; label: string; icon: typeof Store }> = [
  { id: 'home', label: 'الرئيسية', icon: ChartNoAxesCombined },
  { id: 'customers', label: 'الزبائن', icon: Users },
  { id: 'products', label: 'المنتجات والأسعار', icon: Boxes },
  { id: 'collections', label: 'التحصيل', icon: Bell },
  { id: 'portal', label: 'بوابة الزبون', icon: CircleUserRound },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
]

export const AppShell = ({ tab, setTab, shop, shops, onSelectShop, syncState, totals, onNewTransaction, children }: {
  tab: AppTab
  setTab: (tab: AppTab) => void
  shop: Shop
  shops: Shop[]
  onSelectShop: (id: string) => void
  syncState: 'local' | 'synced' | 'offline' | 'error'
  totals: { debt: number; paid: number; remaining: number }
  onNewTransaction: () => void
  children: ReactNode
}) => (
  <div className="app-shell" dir="rtl">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">د</div><div><strong>دَفتر</strong><small>حسابات محلك بسهولة</small></div></div>
      <div className="shop-switcher"><span className="shop-avatar">🏪</span><div className="shop-select-wrap"><small>المحل الحالي</small><select value={shop.id} onChange={event => onSelectShop(event.target.value)} aria-label="اختر المحل">{shops.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>{shopTypeLabel(shop.type, shop.customType)}</small></div></div>
      <nav className="side-nav" aria-label="القائمة الرئيسية">
        {navigation.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`nav-item ${tab === id ? 'active' : ''}`}><Icon size={19} /><span>{label}</span>{tab === id && <span className="nav-indicator" />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className={`connection ${syncState}`}><span className="connection-dot" />{syncState === 'synced' ? <><Cloud size={16} /> متصل ومتزامن</> : syncState === 'offline' ? <><WifiOff size={16} /> تعمل دون إنترنت</> : syncState === 'error' ? <><CloudOff size={16} /> تعذّرت المزامنة</> : <><CloudOff size={16} /> حفظ على هذا الجهاز</>}</div>
        <div className="owner-card"><span className="owner-avatar">{shop.ownerName.slice(0, 1)}</span><div><strong>{shop.ownerName}</strong><small>مالك المحل</small></div><Menu size={18} /></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><p className="eyebrow">{shop.name} <span>•</span> {shopTypeLabel(shop.type, shop.customType)}</p><h1>{navigation.find(item => item.id === tab)?.label}</h1></div><div className="topbar-actions"><span className={`online-pill ${syncState}`}><span />{syncState === 'offline' ? 'دون إنترنت' : syncState === 'synced' ? 'متزامن' : 'محفوظ محلياً'}</span><button className="button button-primary quick-action" onClick={onNewTransaction}><Plus size={18} /> تسجيل حركة</button></div></header>
      <div className="page-content">{tab === 'home' && <HeaderStats totals={totals} />}{children}</div>
      <nav className="mobile-nav" aria-label="القائمة الرئيسية">{navigation.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={tab === id ? 'active' : ''}><Icon size={20} /><span>{label === 'المنتجات والأسعار' ? 'المنتجات' : label}</span></button>)}</nav>
      <footer className="mobile-add"><button onClick={onNewTransaction}><Plus size={21} /><span>تسجيل حركة</span></button></footer>
    </main>
  </div>
)
