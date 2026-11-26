import { localStorageRepo } from './localStorageRepo'
import { supabase } from './supabaseClient'
import type { ArchiveCycle, Customer, Product, Shop, Transaction } from '../../types/ledger.types'

const cloudTables = ['shops', 'customers', 'products', 'transactions', 'archives'] as const

const toCloudRow = (table: typeof cloudTables[number], record: Shop | Customer | Product | Transaction | ArchiveCycle, userId: string) => {
  if (table === 'shops') {
    const shop = record as Shop
    return { id: shop.id, owner_id: userId, name: shop.name, owner_name: shop.ownerName, phone: shop.phone, type: shop.type, custom_type: shop.customType, created_at: shop.createdAt, updated_at: shop.updatedAt }
  }
  if (table === 'customers') {
    const customer = record as Customer
    return { id: customer.id, shop_id: customer.shopId, name: customer.name, phone: customer.phone, credit_limit: customer.creditLimit, cycle: customer.cycle, opening_balance: customer.openingBalance, cycle_started_at: customer.cycleStartedAt, created_at: customer.createdAt, updated_at: customer.updatedAt }
  }
  if (table === 'products') {
    const product = record as Product
    return { id: product.id, shop_id: product.shopId, name: product.name, category: product.category, price: product.price, unit: product.unit, stock: product.stock, barcode: product.barcode, active: product.active, updated_at: product.updatedAt }
  }
  if (table === 'transactions') {
    const transaction = record as Transaction
    return { id: transaction.id, shop_id: transaction.shopId, customer_id: transaction.customerId, type: transaction.type, items: transaction.items, amount: transaction.amount, note: transaction.note, created_at: transaction.createdAt, updated_at: transaction.updatedAt }
  }
  const archive = record as ArchiveCycle
  return { id: archive.id, shop_id: archive.shopId, customer_id: archive.customerId, from_at: archive.from, to_at: archive.to, debt: archive.debt, paid: archive.paid, remaining: archive.remaining, closed_at: archive.closedAt, updated_at: archive.closedAt }
}

const fromCloudRow = (table: typeof cloudTables[number], row: Record<string, unknown>): Shop | Customer | Product | Transaction | ArchiveCycle => {
  if (table === 'shops') return { id: row.id as string, ownerId: row.owner_id as string, name: row.name as string, ownerName: row.owner_name as string, phone: row.phone as string, type: row.type as Shop['type'], customType: row.custom_type as string | undefined, createdAt: row.created_at as string, updatedAt: row.updated_at as string }
  if (table === 'customers') return { id: row.id as string, shopId: row.shop_id as string, name: row.name as string, phone: row.phone as string, creditLimit: row.credit_limit as number, cycle: row.cycle as Customer['cycle'], openingBalance: row.opening_balance as number, cycleStartedAt: row.cycle_started_at as string | undefined, createdAt: row.created_at as string, updatedAt: row.updated_at as string }
  if (table === 'products') return { id: row.id as string, shopId: row.shop_id as string, name: row.name as string, category: row.category as string, price: row.price as number, unit: row.unit as string, stock: row.stock as number | undefined, barcode: row.barcode as string | undefined, active: row.active as boolean, updatedAt: row.updated_at as string }
  if (table === 'transactions') return { id: row.id as string, shopId: row.shop_id as string, customerId: row.customer_id as string, type: row.type as Transaction['type'], items: row.items as Transaction['items'], amount: row.amount as number, note: row.note as string | undefined, createdAt: row.created_at as string, updatedAt: row.updated_at as string }
  return { id: row.id as string, shopId: row.shop_id as string, customerId: row.customer_id as string, from: row.from_at as string, to: row.to_at as string, debt: row.debt as number, paid: row.paid as number, remaining: row.remaining as number, closedAt: row.closed_at as string }
}

export const syncShopData = async (shopId: string): Promise<boolean> => {
  if (!supabase || !navigator.onLine) return false
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const userId = sessionData.session?.user.id
  if (!userId) return false

  const queued = await localStorageRepo.getPendingChanges()
  const rank = { shops: 0, customers: 1, products: 2, transactions: 3, archives: 4 }
  for (const change of queued.filter(item => item.shopId === shopId).sort((a, b) => rank[a.table] - rank[b.table])) {
    const record = await localStorageRepo.getRecord(change.table, change.recordId)
    if (!record) continue
    const payload = toCloudRow(change.table, record, userId)
    const { error } = await supabase.from(change.table).upsert(payload as never, { onConflict: 'id' })
    if (error) throw error
    await localStorageRepo.acknowledgeChange(change.id)
  }

  for (const table of cloudTables) {
    const query = table === 'shops'
      ? supabase.from(table).select('*').eq('id', shopId)
      : supabase.from(table).select('*').eq('shop_id', shopId)
    const { data, error } = await query
    if (error) throw error
    for (const row of data ?? []) {
      await localStorageRepo.mergeCloudRecord(table, fromCloudRow(table, row as Record<string, unknown>))
    }
  }
  return true
}

export const pullOwnerData = async (): Promise<Shop[]> => {
  if (!supabase || !navigator.onLine) return []
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const userId = sessionData.session?.user.id
  if (!userId) return []
  const { data: shops, error: shopsError } = await supabase.from('shops').select('*').eq('owner_id', userId)
  if (shopsError) throw shopsError
  const ownerShops: Shop[] = []
  for (const shopRow of shops ?? []) {
    const shop = fromCloudRow('shops', shopRow as Record<string, unknown>) as Shop
    ownerShops.push(shop)
    await localStorageRepo.mergeCloudRecord('shops', shop)
    for (const table of cloudTables.filter(name => name !== 'shops')) {
      const { data, error } = await supabase.from(table).select('*').eq('shop_id', shop.id)
      if (error) throw error
      for (const row of data ?? []) {
        await localStorageRepo.mergeCloudRecord(table, fromCloudRow(table, row as Record<string, unknown>))
      }
    }
  }
  return ownerShops
}
