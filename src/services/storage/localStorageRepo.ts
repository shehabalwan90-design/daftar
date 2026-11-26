import Dexie, { type Table } from 'dexie'
import { demoShopData } from '../../constants/demoData'
import type { ArchiveCycle, Customer, Product, Shop, ShopData, Transaction } from '../../types/ledger.types'

interface PendingChange {
  id: string
  shopId: string
  table: 'shops' | 'customers' | 'products' | 'transactions' | 'archives'
  recordId: string
  updatedAt: string
}

class DaftarDatabase extends Dexie {
  shops!: Table<Shop, string>
  customers!: Table<Customer, string>
  products!: Table<Product, string>
  transactions!: Table<Transaction, string>
  archives!: Table<ArchiveCycle, string>
  pendingChanges!: Table<PendingChange, string>

  constructor() {
    super('daftar-v2-offline-ledger')
    this.version(2).stores({
      shops: 'id, phone, createdAt, updatedAt',
      customers: 'id, shopId, name, phone, updatedAt',
      products: 'id, shopId, name, category, active, updatedAt',
      transactions: 'id, shopId, customerId, createdAt, updatedAt',
      archives: 'id, shopId, customerId, closedAt',
      pendingChanges: 'id, shopId, table, recordId, updatedAt',
    })
  }
}

const db = new DaftarDatabase()
const tables = { shops: db.shops, customers: db.customers, products: db.products, transactions: db.transactions, archives: db.archives }

export const localStorageRepo = {
  async initialize(): Promise<Shop[]> {
    if (await db.shops.count() === 0) {
      await db.transaction('rw', db.shops, db.customers, db.products, db.transactions, db.archives, async () => {
        await db.shops.put(demoShopData.shop)
        await db.customers.bulkPut(demoShopData.customers)
        await db.products.bulkPut(demoShopData.products)
        await db.transactions.bulkPut(demoShopData.transactions)
        await db.archives.bulkPut(demoShopData.archives)
      })
    }
    return db.shops.orderBy('createdAt').toArray()
  },

  async getShopData(shopId: string): Promise<ShopData | undefined> {
    const shop = await db.shops.get(shopId)
    if (!shop) return undefined
    const [customers, products, transactions, archives] = await Promise.all([
      db.customers.where('shopId').equals(shopId).toArray(),
      db.products.where('shopId').equals(shopId).toArray(),
      db.transactions.where('shopId').equals(shopId).toArray(),
      db.archives.where('shopId').equals(shopId).toArray(),
    ])
    return { shop, customers, products, transactions, archives }
  },

  async saveShopData(data: ShopData): Promise<void> {
    const records: Array<{ table: PendingChange['table']; record: Shop | Customer | Product | Transaction | ArchiveCycle }> = [
      { table: 'shops', record: data.shop },
      ...data.customers.map(record => ({ table: 'customers' as const, record })),
      ...data.products.map(record => ({ table: 'products' as const, record })),
      ...data.transactions.map(record => ({ table: 'transactions' as const, record })),
      ...data.archives.map(record => ({ table: 'archives' as const, record })),
    ]
    await db.transaction('rw', [db.shops, db.customers, db.products, db.transactions, db.archives, db.pendingChanges], async () => {
      for (const { table, record } of records) {
        const existing = await tables[table].get(record.id)
        if (existing && JSON.stringify(existing) === JSON.stringify(record)) continue
        await tables[table].put(record as never)
        const updatedAt = 'updatedAt' in record ? record.updatedAt : record.closedAt
        await db.pendingChanges.put({ id: `${table}:${record.id}`, shopId: data.shop.id, table, recordId: record.id, updatedAt })
      }
    })
  },

  async createShop(shop: Shop): Promise<void> {
    await db.shops.put(shop)
    await db.pendingChanges.put({ id: `shops:${shop.id}`, shopId: shop.id, table: 'shops', recordId: shop.id, updatedAt: shop.updatedAt })
  },

  async getPendingChanges(): Promise<PendingChange[]> {
    return db.pendingChanges.toArray()
  },

  async getRecord(table: PendingChange['table'], id: string): Promise<Shop | Customer | Product | Transaction | ArchiveCycle | undefined> {
    return tables[table].get(id)
  },

  async acknowledgeChange(id: string): Promise<void> {
    await db.pendingChanges.delete(id)
  },

  async mergeCloudRecord(table: PendingChange['table'], record: Shop | Customer | Product | Transaction | ArchiveCycle): Promise<void> {
    const local = await tables[table].get(record.id)
    const localTime = local && ('updatedAt' in local ? local.updatedAt : local.closedAt)
    const remoteTime = 'updatedAt' in record ? record.updatedAt : record.closedAt
    if (!localTime || remoteTime > localTime) await tables[table].put(record as never)
  },
}
