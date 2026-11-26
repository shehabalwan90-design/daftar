import { useState } from 'react'
import { ArrowDownLeft, ArrowUpLeft, Copy, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react'
import { customerBalance } from '../../services/ledger/ledgerEngine'
import { supabase } from '../../services/storage/supabaseClient'
import { arabicErrorMessage } from '../../services/storage/errorMessages'
import type { Customer, ShopData, Transaction } from '../../types/ledger.types'
import { Field, money } from '../shared'

type PortalPayload = { customer: Customer; transactions: Transaction[]; shopName: string }

const normalizePortalPayload = (payload: { customer: Record<string, unknown>; transactions: Array<Record<string, unknown>>; shopName?: string }): PortalPayload => ({
  shopName: payload.shopName ?? 'المحل',
  customer: {
    id: payload.customer.id as string,
    shopId: payload.customer.shop_id as string,
    name: payload.customer.name as string,
    phone: payload.customer.phone as string,
    creditLimit: Number(payload.customer.credit_limit),
    cycle: payload.customer.cycle as Customer['cycle'],
    openingBalance: Number(payload.customer.opening_balance),
    cycleStartedAt: payload.customer.cycle_started_at as string | undefined,
    createdAt: payload.customer.created_at as string,
    updatedAt: payload.customer.updated_at as string,
  },
  transactions: payload.transactions.map(row => ({
    id: row.id as string,
    shopId: row.shop_id as string,
    customerId: row.customer_id as string,
    type: row.type as Transaction['type'],
    items: row.items as Transaction['items'],
    amount: Number(row.amount),
    note: row.note as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  })),
})

export const CustomerPortalView = ({ data, portalShopId, allowShare, onToast }: { data: ShopData; portalShopId: string; allowShare?: boolean; onToast: (message: string) => void }) => {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [portal, setPortal] = useState<PortalPayload | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const localCustomer = () => portalShopId === data.shop.id ? data.customers.find(customer => customer.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) : undefined
  const copyPortalLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?shop=${encodeURIComponent(data.shop.id)}#portal`)
      onToast('تم نسخ رابط بوابة الزبون')
    } catch {
      onToast('تعذّر نسخ الرابط من هذا المتصفح')
    }
  }
  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (supabase) {
      setBusy(true)
      try {
        const { error: authError } = await supabase.auth.signInWithOtp({ phone: phone.trim() })
        if (authError) throw authError
        setStep('otp')
      } catch (issue) { setError(arabicErrorMessage(issue, 'تعذّر إرسال رمز التحقق. تحقق من رقم الهاتف وحاول مجدداً')) }
      finally { setBusy(false) }
      return
    }
    const customer = localCustomer()
    if (!customer) { setError('لم نعثر على حساب بهذا الرقم في بيانات هذا المحل'); return }
    setPortal({ customer, transactions: data.transactions.filter(item => item.customerId === customer.id), shopName: data.shop.name })
  }
  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: otp, type: 'sms' })
      if (authError) throw authError
      const { data: portalData, error: portalError } = await supabase.rpc('customer_portal_data', { p_shop_id: portalShopId })
      if (portalError) throw portalError
      setPortal(normalizePortalPayload(portalData as { customer: Record<string, unknown>; transactions: Array<Record<string, unknown>>; shopName?: string }))
    } catch (issue) { setError(arabicErrorMessage(issue, 'تعذّر التحقق من الرمز أو العثور على الحساب')) }
    finally { setBusy(false) }
  }
  const balance = portal ? customerBalance(portal.customer, portal.transactions) : null
  return <div className="portal-layout">
    <section className="portal-hero"><div className="portal-lock"><LockKeyhole size={23} /></div><div><h2>حسابك، بكل وضوح</h2><p>اطّلع على رصيدك وحركات حسابك بأمان. لا يمكن لأي زبون رؤية حساب زبون آخر.</p></div><div className="portal-shield"><ShieldCheck size={21} /><span>خصوصيتك محفوظة</span></div>{allowShare && <button className="button button-outline-light portal-share" onClick={() => void copyPortalLink()}><Copy size={15} /> نسخ رابط البوابة</button>}</section>
    {!portal ? <section className="portal-auth-card"><div className="portal-phone-icon"><Smartphone size={24} /></div><h3>{step === 'otp' ? 'أدخل رمز التحقق' : 'تحقق من رقم هاتفك'}</h3><p>{step === 'otp' ? `أرسلنا رمزاً إلى ${phone}` : `اكتب رقم الهاتف المسجل لدى ${data.shop.id === portalShopId ? data.shop.name : 'المحل'} لعرض حسابك.`}</p>
      {step === 'phone' ? <form onSubmit={requestCode} className="form-stack"><Field label="رقم الهاتف"><input type="tel" dir="ltr" required value={phone} onChange={event => setPhone(event.target.value)} placeholder="9677..." /></Field><button className="button button-primary full-button" disabled={busy}>{busy ? 'جارٍ التحقق...' : supabase ? 'إرسال رمز التحقق' : 'عرض حسابي'}</button></form>
        : <form onSubmit={verifyCode} className="form-stack"><Field label="رمز التحقق"><input required inputMode="numeric" dir="ltr" value={otp} onChange={event => setOtp(event.target.value)} placeholder="أدخل الرمز المرسل" /></Field><button className="button button-primary full-button" disabled={busy}>{busy ? 'جارٍ التحقق...' : 'تحقق واعرض الحساب'}</button><button type="button" className="text-button centered" onClick={() => setStep('phone')}>تغيير رقم الهاتف</button></form>}
      {error && <div className="inline-alert"><span>{error}</span></div>}
      {!supabase && <small className="demo-hint">وضع المعاينة: يمكنك استخدام رقم زبون مسجل في هذا الجهاز.</small>}
    </section> : <section className="portal-account"><div className="portal-account-head"><span className="large-avatar">{portal.customer.name.slice(0, 1)}</span><div><small>حساب الزبون لدى</small><h3>{portal.shopName}</h3><p>{portal.customer.name}</p></div><button className="text-button" onClick={() => setPortal(null)}>تسجيل خروج</button></div>
      <div className="portal-balance"><small>المتبقي الفعلي</small><strong>{money(balance?.remaining ?? 0)}</strong><div><span>إجمالي الدين: {money(balance?.debt ?? 0)}</span><span>المسدّد: {money(balance?.paid ?? 0)}</span></div></div>
      <h3 className="portal-history-title">تفاصيل الحركات</h3><div className="history-list">{portal.transactions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(transaction => <article className="history-row" key={transaction.id}><span className={`history-icon ${transaction.type}`}>{transaction.type === 'debt' ? <ArrowUpLeft size={17} /> : <ArrowDownLeft size={17} />}</span><div className="history-description"><strong>{transaction.type === 'debt' ? 'مشتريات / دين' : 'مبلغ مسدد'}</strong><small>{new Date(transaction.createdAt).toLocaleDateString('ar-YE', { dateStyle: 'medium' })}</small>{transaction.items.map((item, index) => <small className="itemized" key={`${item.productName}-${index}`}>{item.productName} × {item.qty} • {money(item.unitPriceAtTime)} للواحدة</small>)}</div><strong className={transaction.type === 'debt' ? 'debt-amount' : 'paid-amount'}>{money(transaction.amount)}</strong></article>)}</div>
    </section>}
  </div>
}
