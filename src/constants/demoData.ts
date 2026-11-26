import type { ShopData, Customer, Product, Transaction } from '../types/ledger.types'

const now = new Date().toISOString()
const shopId = 'da710000-0000-4000-8000-000000000001'
const customers: Customer[] = [
  { id: 'da710000-0000-4000-8000-000000000002', shopId, name: 'صالح أحمد', phone: '967770000001', creditLimit: 50000, cycle: 'monthly', openingBalance: 0, createdAt: now, updatedAt: now },
  { id: 'da710000-0000-4000-8000-000000000003', shopId, name: 'سالم محمد', phone: '967770000002', creditLimit: 40000, cycle: 'weekly', openingBalance: 0, createdAt: now, updatedAt: now },
  { id: 'da710000-0000-4000-8000-000000000004', shopId, name: 'محمد قاسم', phone: '967770000003', creditLimit: 60000, cycle: 'monthly', openingBalance: 0, createdAt: now, updatedAt: now },
  { id: 'da710000-0000-4000-8000-000000000005', shopId, name: 'أمين عبدالله', phone: '967770000004', creditLimit: 30000, cycle: 'weekly', openingBalance: 0, createdAt: now, updatedAt: now },
]
const products: Product[] = [
  { id: 'da710000-0000-4000-8000-000000000006', shopId, name: 'رز', category: 'مواد غذائية', price: 5000, unit: 'كيس', active: true, updatedAt: now },
  { id: 'da710000-0000-4000-8000-000000000007', shopId, name: 'سكر', category: 'مواد غذائية', price: 3000, unit: 'كيس', active: true, updatedAt: now },
  { id: 'da710000-0000-4000-8000-000000000008', shopId, name: 'زيت', category: 'مواد غذائية', price: 4500, unit: 'علبة', active: true, updatedAt: now },
  { id: 'da710000-0000-4000-8000-000000000009', shopId, name: 'حليب', category: 'مشروبات', price: 2000, unit: 'علبة', active: true, updatedAt: now },
]
const transaction = (id: string, customerId: string, type: 'debt' | 'payment', amount: number, daysAgo: number): Transaction => {
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString()
  return { id, shopId, customerId, type, items: [], amount, note: type === 'debt' ? 'رصيد سابق' : 'سداد سابق', createdAt: date, updatedAt: date }
}

export const demoShopData: ShopData = {
  shop: { id: shopId, name: 'بقالة النور', ownerName: 'عبدالله', phone: '967770000000', type: 'grocery', createdAt: now, updatedAt: now },
  customers,
  products,
  transactions: [
    transaction('da710000-0000-4000-8000-000000000010', 'da710000-0000-4000-8000-000000000002', 'debt', 35000, 13),
    transaction('da710000-0000-4000-8000-000000000011', 'da710000-0000-4000-8000-000000000002', 'payment', 20000, 4),
    transaction('da710000-0000-4000-8000-000000000012', 'da710000-0000-4000-8000-000000000003', 'debt', 38000, 3),
    transaction('da710000-0000-4000-8000-000000000013', 'da710000-0000-4000-8000-000000000004', 'debt', 45000, 10),
    transaction('da710000-0000-4000-8000-000000000014', 'da710000-0000-4000-8000-000000000004', 'payment', 30000, 2),
    transaction('da710000-0000-4000-8000-000000000015', 'da710000-0000-4000-8000-000000000005', 'debt', 12000, 6),
    transaction('da710000-0000-4000-8000-000000000016', 'da710000-0000-4000-8000-000000000005', 'payment', 12000, 1),
  ],
  archives: [],
}
