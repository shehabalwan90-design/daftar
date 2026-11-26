export type ShopType = 'grocery' | 'pharmacy' | 'clothing' | 'mobile' | 'building' | 'produce' | 'other'
export type CycleFrequency = 'weekly' | 'monthly'
export type TransactionType = 'debt' | 'payment'
export type AppTab = 'home' | 'customers' | 'products' | 'collections' | 'portal' | 'settings'

export interface Shop {
  id: string
  name: string
  ownerName: string
  phone: string
  type: ShopType
  customType?: string
  ownerId?: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  shopId: string
  name: string
  phone: string
  creditLimit: number
  cycle: CycleFrequency
  openingBalance: number
  cycleStartedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  shopId: string
  name: string
  category: string
  price: number
  unit: string
  stock?: number
  barcode?: string
  active: boolean
  updatedAt: string
}

export type ProductDraft = Omit<Product, 'id' | 'shopId' | 'updatedAt'> & { id?: string }

export interface TransactionItem {
  productId?: string
  productName: string
  qty: number
  unitPriceAtTime: number
  total: number
}

export interface Transaction {
  id: string
  shopId: string
  customerId: string
  type: TransactionType
  items: TransactionItem[]
  amount: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface ArchiveCycle {
  id: string
  shopId: string
  customerId: string
  from: string
  to: string
  debt: number
  paid: number
  remaining: number
  closedAt: string
}

export interface ShopData {
  shop: Shop
  customers: Customer[]
  products: Product[]
  transactions: Transaction[]
  archives: ArchiveCycle[]
}

export interface VoiceParseResult {
  customerName: string
  type: TransactionType
  items: Array<{ name: string; qty: number }>
  amount?: number
  unclear: boolean
}
