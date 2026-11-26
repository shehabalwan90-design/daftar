import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { DashboardView, type CustomerWithBalance } from './components/dashboard/DashboardView'
import { CustomersListView } from './components/customers/CustomersListView'
import { CustomerDetailView } from './components/customers/CustomerDetailView'
import { AddCustomerModal } from './components/customers/AddCustomerModal'
import { TransactionModal } from './components/customers/TransactionModal'
import { ProductsView } from './components/products/ProductsView'
import { CollectionsView } from './components/collections/CollectionsView'
import { CustomerPortalView } from './components/customer-portal/CustomerPortalView'
import { SettingsView } from './components/settings/SettingsView'
import { VoiceLedgerModal } from './components/voice/VoiceLedgerModal'
import { useDaftarStore } from './hooks/useDaftarStore'
import { customerBalance } from './services/ledger/ledgerEngine'
import { shopTypes } from './constants/shopTypes'
import type { AppTab, TransactionItem, TransactionType } from './types/ledger.types'

interface TransactionDraft {
  customerId?: string
  type: TransactionType
  amount?: number
  note?: string
}

export default function App() {
  const store = useDaftarStore()
  const [tab, setTab] = useState<AppTab>(() => window.location.hash === '#portal' ? 'portal' : 'home')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const customers = useMemo<CustomerWithBalance[]>(() => store.data.customers.map(customer => ({
    ...customer,
    ...customerBalance(customer, store.data.transactions),
  })), [store.data.customers, store.data.transactions])
  const selectedCustomer = store.data.customers.find(customer => customer.id === selectedCustomerId)
  const shopType = shopTypes.find(item => item.id === store.data.shop.type)

  const notify = (message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(current => current === message ? '' : current), 3600)
  }
  useEffect(() => () => { if (toastTimer.current !== null) window.clearTimeout(toastTimer.current) }, [])
  const openNewTransaction = (draft: TransactionDraft = { type: 'debt' }) => {
    if (!store.data.customers.length) {
      notify('أضف زبوناً أولاً قبل تسجيل حركة')
      setTab('customers')
      return
    }
    setTransactionDraft(draft)
  }
  const addTransaction = (input: { customerId: string; type: TransactionType; items: TransactionItem[]; amount: number; note?: string }) => {
    store.addTransaction(input)
    notify(input.type === 'debt' ? 'تم تسجيل الدين بنجاح' : 'تم تسجيل السداد بنجاح')
  }
  const closeCycle = (customer: CustomerWithBalance) => {
    store.closeCustomerCycle(customer.id, { debt: customer.debt, paid: customer.paid, remaining: customer.remaining })
    notify(`تم إغلاق دورة حساب ${customer.name} وترحيل الرصيد المتبقي`)
  }

  if (store.startupError) return <div className="startup-error" dir="rtl" role="alert"><div className="brand-mark">د</div><h1>تعذّر فتح دفتر البيانات</h1><p>{store.startupError}</p><button className="button button-primary" onClick={() => window.location.reload()}>إعادة المحاولة</button></div>
  if (!store.ready) return <div className="loading-screen" dir="rtl"><div className="brand-mark">د</div><strong>دفترك يجهز...</strong></div>
  const publicPortalShopId = new URLSearchParams(window.location.search).get('shop')
  if (window.location.hash === '#portal' && publicPortalShopId) return <main className="public-portal" dir="rtl"><header><div className="brand-mark">د</div><strong>دَفتر</strong></header><CustomerPortalView data={store.data} portalShopId={publicPortalShopId} allowShare={false} onToast={notify} />{toast && <div className="toast-message" role="status">{toast}</div>}</main>

  const content = tab === 'home' ? <DashboardView customers={customers} onCustomers={() => setTab('customers')} onVoice={() => setVoiceOpen(true)} onAddTransaction={() => openNewTransaction()} />
    : tab === 'customers' ? selectedCustomer
      ? <CustomerDetailView customer={selectedCustomer} transactions={store.data.transactions.filter(item => item.customerId === selectedCustomer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))} archives={store.data.archives.filter(item => item.customerId === selectedCustomer.id).sort((a, b) => b.closedAt.localeCompare(a.closedAt))} balance={customerBalance(selectedCustomer, store.data.transactions)} onBack={() => setSelectedCustomerId('')} onNewTransaction={type => openNewTransaction({ customerId: selectedCustomer.id, type })} onCloseCycle={() => { const balance = customerBalance(selectedCustomer, store.data.transactions); closeCycle({ ...selectedCustomer, ...balance }) }} />
      : <CustomersListView customers={customers} onSelect={setSelectedCustomerId} onAdd={() => setAddingCustomer(true)} onVoice={() => setVoiceOpen(true)} />
    : tab === 'products' ? <ProductsView products={store.data.products} categories={shopType?.categories ?? ['عام']} suggestions={shopType?.suggestions ?? []} onSave={store.saveProduct} />
    : tab === 'collections' ? <CollectionsView customers={customers} onCloseCycle={closeCycle} onToast={notify} />
    : tab === 'portal' ? <CustomerPortalView data={store.data} portalShopId={new URLSearchParams(window.location.search).get('shop') ?? store.data.shop.id} allowShare onToast={notify} />
    : <SettingsView shop={store.data.shop} shops={store.shops} syncState={store.syncState} isOwnerAuthenticated={Boolean(store.authUserId && store.authUserId === store.data.shop.ownerId)} verificationPhone={store.ownerVerificationPhone} onSignIn={store.signInOwner} onVerifyOtp={store.verifyOwnerOtp} onSignOut={store.signOutOwner} onSelectShop={id => { setSelectedCustomerId(''); void store.selectShop(id) }} onCreate={store.createShop} onToast={notify} />

  return <>
    <AppShell tab={tab} setTab={next => { setTab(next); if (next !== 'customers') setSelectedCustomerId('') }} shop={store.data.shop} shops={store.shops} onSelectShop={id => { setSelectedCustomerId(''); void store.selectShop(id) }} syncState={store.syncState} totals={store.totals} onNewTransaction={() => openNewTransaction()}>
      {content}
    </AppShell>
    {addingCustomer && <AddCustomerModal onSave={async input => { await store.addCustomer(input); notify('تمت إضافة الزبون إلى دفترك') }} onClose={() => setAddingCustomer(false)} />}
    {transactionDraft && <TransactionModal customers={store.data.customers} products={store.data.products} initialCustomerId={transactionDraft.customerId} initialType={transactionDraft.type} initialAmount={transactionDraft.amount} initialNote={transactionDraft.note} onSave={addTransaction} onClose={() => setTransactionDraft(null)} />}
    {voiceOpen && <VoiceLedgerModal customers={customers} products={store.data.products} transactions={store.data.transactions} shopId={store.data.shop.id} onSave={addTransaction} onSaveProduct={store.saveProduct} onManual={draft => { setTransactionDraft(draft); setVoiceOpen(false) }} onClose={() => setVoiceOpen(false)} />}
    {store.syncState === 'error' && <div className="sync-error" role="status">{store.errorMessage || 'تعذّرت المزامنة. بياناتك محفوظة على هذا الجهاز.'}</div>}
    {toast && <div className="toast-message" role="status">{toast}</div>}
  </>
}
