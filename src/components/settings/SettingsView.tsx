import { useState } from 'react'
import { BadgeCheck, Cloud, Database, LockKeyhole, Plus, Store, WifiOff } from 'lucide-react'
import type { Shop, ShopType } from '../../types/ledger.types'
import { isCloudConfigured } from '../../services/storage/supabaseClient'
import { arabicErrorMessage } from '../../services/storage/errorMessages'
import { ShopSetupView } from '../shops/ShopSetupView'
import { Field } from '../shared'

export const SettingsView = ({ shop, shops, syncState, isOwnerAuthenticated, verificationPhone, onSelectShop, onCreate, onSignIn, onVerifyOtp, onSignOut, onToast }: {
  shop: Shop
  shops: Shop[]
  syncState: 'local' | 'synced' | 'offline' | 'error'
  isOwnerAuthenticated: boolean
  verificationPhone: string | null
  onSelectShop: (id: string) => void
  onCreate: (input: { name: string; ownerName: string; phone: string; password: string; type: ShopType; customType?: string }) => Promise<boolean>
  onSignIn: (phone: string, password: string) => Promise<void>
  onVerifyOtp: (phone: string, token: string) => Promise<void>
  onSignOut: () => Promise<void>
  onToast: (message: string) => void
}) => {
  const [showSetup, setShowSetup] = useState(false)
  const [authPhone, setAuthPhone] = useState(shop.phone)
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)
  const statusText = syncState === 'synced' ? 'متصل ومتزامن' : syncState === 'offline' ? 'تعمل دون إنترنت' : syncState === 'error' ? 'تعذّرت المزامنة' : 'حفظ محلي على هذا الجهاز'
  const runAuth = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true)
    setAuthError('')
    try { await action(); onToast(successMessage) }
    catch (error) { setAuthError(arabicErrorMessage(error, 'تعذّر إكمال العملية. تحقق من البيانات وحاول مجدداً')) }
    finally { setBusy(false) }
  }
  return <div className="settings-layout">
    <section className="content-card settings-card"><div className="section-heading inside"><div><h2>محلاتك</h2><p>لكل محل دفتر زبائن ومنتجات مستقل</p></div><button className="button button-primary" onClick={() => setShowSetup(true)}><Plus size={17} /> إضافة محل</button></div>
      <div className="settings-shop-list">{shops.map(item => <button key={item.id} className={`settings-shop ${item.id === shop.id ? 'current' : ''}`} onClick={() => onSelectShop(item.id)}><span className="settings-shop-icon"><Store size={20} /></span><span><strong>{item.name}</strong><small>{item.ownerName} • {item.phone}</small></span>{item.id === shop.id && <BadgeCheck size={19} />}</button>)}</div>
    </section>
    <section className="content-card settings-card"><div className="section-heading inside"><div><h2>الحساب والمزامنة</h2><p>بياناتك محفوظة محلياً وتُزامن عند الاتصال</p></div></div>
      <div className="setting-row"><span className="setting-icon"><Database size={19} /></span><div><strong>قاعدة البيانات المحلية</strong><small>حفظ فوري على هذا الجهاز للعمل دون إنترنت</small></div><span className="setting-state good">مفعّلة</span></div>
      <div className="setting-row"><span className="setting-icon">{isCloudConfigured ? <Cloud size={19} /> : <WifiOff size={19} />}</span><div><strong>المزامنة السحابية</strong><small>{isCloudConfigured ? 'المزامنة متاحة بعد تسجيل الدخول والاتصال بالإنترنت' : 'أضف بيانات اتصال قاعدة البيانات لتفعيل الحسابات والمزامنة'}</small></div><span className={`setting-state ${isCloudConfigured ? 'good' : ''}`}>{isCloudConfigured ? statusText : 'غير مُعدّة'}</span></div>
      <div className="setting-row"><span className="setting-icon"><LockKeyhole size={19} /></span><div><strong>خصوصية بيانات المحل</strong><small>سياسات قاعدة البيانات تفصل بيانات كل محل عن الآخر</small></div><BadgeCheck size={18} className="setting-check" /></div>
      {!isCloudConfigured && <div className="setup-hint settings-hint"><Cloud size={17} /><span>المعاينة تعمل بالكامل على جهازك. لتفعيل الحساب السحابي، أضف بيانات اتصال قاعدة البيانات إلى إعدادات المشروع ثم طبّق تحديث قاعدة البيانات.</span></div>}
    </section>
    {isCloudConfigured && <section className="content-card settings-card"><div className="section-heading inside"><div><h2>حساب المالك</h2><p>سجّل الدخول لمزامنة دفترك مع أجهزتك</p></div></div>
      {isOwnerAuthenticated ? <div className="owner-session"><span className="setting-icon"><BadgeCheck size={19} /></span><div><strong>تم تسجيل الدخول</strong><small>محلاتك السحابية متاحة لهذا الحساب</small></div><button className="button button-quiet" onClick={() => void runAuth(onSignOut, 'تم تسجيل الخروج')}>تسجيل الخروج</button></div>
        : verificationPhone ? <form className="form-stack auth-form" onSubmit={event => { event.preventDefault(); void runAuth(() => onVerifyOtp(verificationPhone, otp), 'تم التحقق من رقم الهاتف') }}><p className="auth-explainer">أدخل رمز التحقق المرسل إلى <b dir="ltr">{verificationPhone}</b> لتفعيل حساب المحل.</p><Field label="رمز التحقق"><input required inputMode="numeric" dir="ltr" value={otp} onChange={event => setOtp(event.target.value)} placeholder="أدخل الرمز المرسل" /></Field><button className="button button-primary" disabled={busy}>{busy ? 'جارٍ التحقق...' : 'تحقق من الرقم'}</button></form>
          : <form className="form-stack auth-form" onSubmit={event => { event.preventDefault(); void runAuth(() => onSignIn(authPhone, password), 'تم تسجيل الدخول') }}><div className="form-row"><Field label="رقم الهاتف"><input required type="tel" dir="ltr" value={authPhone} onChange={event => setAuthPhone(event.target.value)} placeholder="9677..." /></Field><Field label="كلمة المرور"><input required type="password" dir="ltr" value={password} onChange={event => setPassword(event.target.value)} placeholder="كلمة مرور الحساب" /></Field></div><button className="button button-primary" disabled={busy}>{busy ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}</button></form>}
      {authError && <div className="inline-alert auth-error">{authError}</div>}
    </section>}
    {showSetup && <ShopSetupView onCreate={async input => { const cloudEnabled = await onCreate(input); onToast(cloudEnabled ? 'تم إنشاء المحل. تحقق من رقم الهاتف إذا طُلب ذلك' : 'تم إنشاء المحل على هذا الجهاز، أضف منتجاتك وحدد أسعارها'); return true }} onClose={() => setShowSetup(false)} />}
  </div>
}
