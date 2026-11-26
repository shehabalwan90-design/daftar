import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoShopData } from '../constants/demoData'
import { localStorageRepo } from '../services/storage/localStorageRepo'
import { isCloudConfigured, supabase } from '../services/storage/supabaseClient'
import { pullOwnerData, syncShopData } from '../services/storage/syncService'
import { arabicErrorMessage } from '../services/storage/errorMessages'
import type { ArchiveCycle, Customer, Product, ProductDraft, Shop, ShopData, Transaction } from '../types/ledger.types'

const activeShopKey = 'daftar-v2-active-shop'
const pendingOwnerPhoneKey = 'daftar-v2-pending-owner-phone'

export const useDaftarStore = () => {
  const [data, setData] = useState<ShopData>(demoShopData)
  const [shops, setShops] = useState<Shop[]>([demoShopData.shop])
  const [ready, setReady] = useState(false)
  const [syncState, setSyncState] = useState<'local' | 'synced' | 'offline' | 'error'>('local')
  const [errorMessage, setErrorMessage] = useState('')
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [ownerVerificationPhone, setOwnerVerificationPhone] = useState<string | null>(() => localStorage.getItem(pendingOwnerPhoneKey))
  const [startupError, setStartupError] = useState('')

  const refresh = useCallback(async () => {
    const availableShops = await localStorageRepo.initialize()
    const visibleShops = availableShops.filter(shop => authUserId ? shop.ownerId === authUserId : !shop.ownerId)
    const linkedShopId = new URLSearchParams(window.location.search).get('shop')
    const requestedShopId = linkedShopId ?? localStorage.getItem(activeShopKey)
    const selectedShop = visibleShops.find(shop => shop.id === requestedShopId) ?? visibleShops[0]
    setShops(visibleShops)
    if (!selectedShop) {
      setReady(true)
      return
    }
    const shopData = await localStorageRepo.getShopData(selectedShop.id)
    if (shopData) setData(shopData)
    setReady(true)
  }, [authUserId])

  useEffect(() => {
    void refresh().catch(error => {
      setStartupError(arabicErrorMessage(error, 'تعذّر فتح دفتر البيانات على هذا الجهاز'))
      setReady(true)
    })
  }, [refresh])

  useEffect(() => {
    if (!ready || !authUserId || !supabase || !navigator.onLine) return
    let active = true
    void pullOwnerData().then(async ownerShops => {
      if (!active || !ownerShops.length) return
      const availableShops = await localStorageRepo.initialize()
      const currentId = localStorage.getItem(activeShopKey)
      const selected = ownerShops.find(shop => shop.id === currentId) ?? ownerShops[0]
      const next = await localStorageRepo.getShopData(selected.id)
      if (!next || !active) return
      localStorage.setItem(activeShopKey, selected.id)
      setShops(availableShops.filter(shop => shop.ownerId === authUserId))
      setData(next)
    }).catch(error => {
      if (active) {
        setSyncState('error')
        setErrorMessage(arabicErrorMessage(error, 'تعذّر تحميل بيانات محلاتك من السحابة'))
      }
    })
    return () => { active = false }
  }, [authUserId, ready])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      if (active) setAuthUserId(data.session?.user.id ?? null)
    }).catch(error => {
      if (active) setErrorMessage(arabicErrorMessage(error, 'تعذّر التحقق من الحساب السحابي'))
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user.id ?? null)
    })
    return () => { active = false; subscription.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!ready || startupError) return
    void localStorageRepo.saveShopData(data).catch(error => {
      setSyncState('error')
      setErrorMessage(arabicErrorMessage(error, 'تعذّر حفظ البيانات على هذا الجهاز'))
    })
  }, [data, ready, startupError])

  useEffect(() => {
    const client = supabase
    if (!ready || startupError || !isCloudConfigured || !client) return
    if (!authUserId || data.shop.ownerId !== authUserId) {
      setSyncState('local')
      return
    }
    const sync = async () => {
      if (!navigator.onLine) { setSyncState('offline'); return }
      try {
        const synced = await syncShopData(data.shop.id)
        setSyncState(synced ? 'synced' : 'local')
        setErrorMessage('')
        if (synced) {
          const refreshed = await localStorageRepo.getShopData(data.shop.id)
          if (refreshed && JSON.stringify(refreshed) !== JSON.stringify(data)) setData(refreshed)
        }
      } catch (error) {
        setSyncState(navigator.onLine ? 'error' : 'offline')
        setErrorMessage(arabicErrorMessage(error, 'تعذّرت المزامنة، بياناتك محفوظة على هذا الجهاز'))
      }
    }
    void sync()
    const onOnline = () => { void sync() }
    window.addEventListener('online', onOnline)
    const channel = client.channel(`shop-sync-${data.shop.id}`)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shops', filter: `owner_id=eq.${authUserId}` }, () => {
      void pullOwnerData().then(async () => {
        const availableShops = await localStorageRepo.initialize()
        setShops(availableShops.filter(shop => shop.ownerId === authUserId))
      }).catch(error => {
        setSyncState('error')
        setErrorMessage(arabicErrorMessage(error, 'تعذّر تحديث قائمة محلاتك'))
      })
    })
    for (const table of ['customers', 'products', 'transactions', 'archives'] as const) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `shop_id=eq.${data.shop.id}` }, () => { void sync() })
    }
    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setSyncState('error')
        setErrorMessage('تعذّر الاتصال بالتحديثات المباشرة. ستستمر المزامنة عند عودة الاتصال')
      }
    })
    return () => {
      window.removeEventListener('online', onOnline)
      void client.removeChannel(channel)
    }
  }, [data, authUserId, ready])

  const selectShop = useCallback(async (shopId: string) => {
    try {
      const next = await localStorageRepo.getShopData(shopId)
      if (!next) return
      localStorage.setItem(activeShopKey, shopId)
      setData(next)
    } catch (error) {
      setErrorMessage(arabicErrorMessage(error, 'تعذّر فتح بيانات هذا المحل'))
      setSyncState('error')
    }
  }, [])

  const updateData = useCallback((updater: (current: ShopData) => ShopData) => setData(current => updater(current)), [])

  const createShop = useCallback(async (input: { name: string; ownerName: string; phone: string; password: string; type: Shop['type']; customType?: string }) => {
    console.log("زر إنشاء المحل تم الضغط عليه")
    const now = new Date().toISOString()
    const shop: Shop = { id: crypto.randomUUID(), name: input.name, ownerName: input.ownerName, phone: input.phone, type: input.type, customType: input.customType, createdAt: now, updatedAt: now }
    const newData: ShopData = { shop, customers: [], products: [], transactions: [], archives: [] }
    await localStorageRepo.saveShopData(newData)
    localStorage.setItem(activeShopKey, shop.id)
    setShops(current => [...current.filter(item => !item.ownerId), shop])
    setData(newData)

    if (supabase && navigator.onLine) {
      void (async () => {
        try {
          const { data: authData, error } = await supabase.auth.signUp({
            phone: input.phone,
            password: input.password,
            options: { data: { owner_name: input.ownerName, shop_name: input.name } },
          })
          if (error) throw error
          const ownerId = authData.user?.id
          const linkedShop = ownerId ? { ...shop, ownerId } : shop
          if (ownerId) {
            const linkedData = { ...newData, shop: linkedShop }
            await localStorageRepo.saveShopData(linkedData)
            setShops(current => current.map(item => item.id === shop.id ? linkedShop : item))
            setData(current => current.shop.id === shop.id ? linkedData : current)
          }
          const pendingPhone = authData.session ? null : input.phone
          setOwnerVerificationPhone(pendingPhone)
          if (pendingPhone) localStorage.setItem(pendingOwnerPhoneKey, pendingPhone)
          else localStorage.removeItem(pendingOwnerPhoneKey)
        } catch (error) {
          console.error('تعذّر إنشاء الحساب السحابي للمحل المحفوظ محلياً:', error)
          setSyncState('error')
          setErrorMessage(arabicErrorMessage(error, `تم حفظ المحل محلياً، لكن تعذّر إنشاء الحساب السحابي: ${error instanceof Error ? error.message : String(error)}`))
        }
      })()
    }

    return Boolean(supabase && navigator.onLine)
  }, [])

  const signInOwner = useCallback(async (phone: string, password: string) => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password })
    if (error) throw new Error(arabicErrorMessage(error, 'تعذّر تسجيل الدخول. تحقق من رقم الهاتف وكلمة المرور'))
    setOwnerVerificationPhone(null)
    localStorage.removeItem(pendingOwnerPhoneKey)
  }, [])

  const verifyOwnerOtp = useCallback(async (phone: string, token: string) => {
    if (!supabase) return
    const { error } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: token.trim(), type: 'sms' })
    if (error) throw new Error(arabicErrorMessage(error, 'تعذّر التحقق من الرمز، أعد المحاولة'))
    setOwnerVerificationPhone(null)
    localStorage.removeItem(pendingOwnerPhoneKey)
  }, [])

  const signOutOwner = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(arabicErrorMessage(error, 'تعذّر تسجيل الخروج'))
  }, [])

  const addCustomer = useCallback(async (input: Omit<Customer, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'openingBalance'>) => {
    console.log("زر حفظ الزبون تم الضغط عليه")
    const now = new Date().toISOString()
    const customer: Customer = { ...input, id: crypto.randomUUID(), shopId: data.shop.id, openingBalance: 0, createdAt: now, updatedAt: now }
    const nextData = { ...data, customers: [customer, ...data.customers] }
    await localStorageRepo.saveShopData(nextData)
    setData(nextData)
  }, [data])

  const saveProduct = useCallback((input: ProductDraft) => {
    const product: Product = { ...input, id: input.id ?? crypto.randomUUID(), shopId: data.shop.id, updatedAt: new Date().toISOString() }
    updateData(current => ({ ...current, products: [product, ...current.products.filter(item => item.id !== product.id)] }))
  }, [data.shop.id, updateData])

  const addTransaction = useCallback((input: Omit<Transaction, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const transaction: Transaction = { ...input, id: crypto.randomUUID(), shopId: data.shop.id, createdAt: now, updatedAt: now }
    updateData(current => ({ ...current, transactions: [transaction, ...current.transactions] }))
  }, [data.shop.id, updateData])

  const closeCustomerCycle = useCallback((customerId: string, balance: { debt: number; paid: number; remaining: number }) => {
    const now = new Date().toISOString()
    const customer = data.customers.find(item => item.id === customerId)
    const start = customer?.cycleStartedAt ?? customer?.createdAt ?? now
    const archive: ArchiveCycle = { id: crypto.randomUUID(), shopId: data.shop.id, customerId, from: start, to: now, ...balance, closedAt: now }
    updateData(current => ({
      ...current,
      archives: [archive, ...current.archives],
      customers: current.customers.map(customer => customer.id === customerId ? { ...customer, openingBalance: balance.remaining, cycleStartedAt: now, updatedAt: now } : customer),
    }))
  }, [data.shop.id, updateData])

  const totals = useMemo(() => data.customers.reduce((sum, customer) => {
    const own = data.transactions.filter(item => item.customerId === customer.id && (!customer.cycleStartedAt || item.createdAt > customer.cycleStartedAt))
    const debt = customer.openingBalance + own.filter(item => item.type === 'debt').reduce((value, item) => value + item.amount, 0)
    const paid = own.filter(item => item.type === 'payment').reduce((value, item) => value + item.amount, 0)
    return { debt: sum.debt + debt, paid: sum.paid + paid, remaining: sum.remaining + Math.max(0, debt - paid) }
  }, { debt: 0, paid: 0, remaining: 0 }), [data.customers, data.transactions])

  return { data, shops, ready, startupError, syncState, errorMessage, authUserId, ownerVerificationPhone, totals, selectShop, updateData, createShop, signInOwner, verifyOwnerOtp, signOutOwner, addCustomer, saveProduct, addTransaction, closeCustomerCycle }
}
