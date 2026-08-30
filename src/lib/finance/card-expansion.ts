// §8: a virtual card's expansion shows its own transactions with date,
// amount, title, status and the linked purchase. Ledger rows have no status
// column of their own, so the status is derived honestly from the linked
// purchase lifecycle and otherwise reported as settled ledger facts.

export type CardTransactionRowInput = {
  id: string
  amount: number
  type: string
  description: string | null
  createdAt: Date | string
  purchase?: { id: string; title: string; status: string } | null
}

export type CardTransactionRow = {
  id: string
  amount: number
  type: string
  title: string
  date: string
  status: string
  linkedPurchaseId: string | null
  linkedTitle: string | null
}

export function deriveTransactionStatus(purchase: { status: string } | null | undefined): string {
  if (!purchase) return 'SETTLED'
  return purchase.status
}

export function buildCardTransactionRow(row: CardTransactionRowInput): CardTransactionRow {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)
  const date = Number.isNaN(createdAt.getTime()) ? '' : createdAt.toISOString().slice(0, 10)
  const title = typeof row.description === 'string' && row.description.trim().length > 0 ? row.description : row.type
  const linkedPurchaseId = row.purchase && typeof row.purchase.id === 'string' ? row.purchase.id : null
  const linkedTitle = row.purchase && typeof row.purchase.title === 'string' && row.purchase.title.length > 0 ? row.purchase.title : null
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    title,
    date,
    status: deriveTransactionStatus(row.purchase ?? null),
    linkedPurchaseId,
    linkedTitle,
  }
}
