import type { Customer, Product, Transaction, TransactionItem } from '../../types/ledger.types'

export const customerBalance = (customer: Customer, transactions: Transaction[]) => {
  const own = transactions.filter(tx => tx.customerId === customer.id && (!customer.cycleStartedAt || tx.createdAt > customer.cycleStartedAt))
  const debt = customer.openingBalance + own.filter(tx => tx.type === 'debt').reduce((sum, tx) => sum + tx.amount, 0)
  const paid = own.filter(tx => tx.type === 'payment').reduce((sum, tx) => sum + tx.amount, 0)
  return { debt, paid, remaining: Math.max(0, debt - paid), netPaid: paid }
}

export const buildItemsFromCatalog = (
  spokenItems: Array<{ name: string; qty: number }>,
  products: Product[],
): { items: TransactionItem[]; missing: string[] } => {
  const items: TransactionItem[] = []
  const missing: string[] = []
  for (const spoken of spokenItems) {
    const product = products.find(item => item.active && item.name.trim() === spoken.name.trim())
    if (!product) {
      missing.push(spoken.name)
      continue
    }
    items.push({ productId: product.id, productName: product.name, qty: spoken.qty, unitPriceAtTime: product.price, total: product.price * spoken.qty })
  }
  return { items, missing }
}

export const checkCreditLimit = (customer: Customer, transactions: Transaction[], newDebt: number) => {
  const remaining = customerBalance(customer, transactions).remaining
  return { exceededBy: Math.max(0, remaining + newDebt - customer.creditLimit), allowed: remaining + newDebt <= customer.creditLimit }
}

export const transactionAmount = (items: TransactionItem[], fallbackAmount?: number) =>
  items.length ? items.reduce((sum, item) => sum + item.total, 0) : fallbackAmount ?? 0
