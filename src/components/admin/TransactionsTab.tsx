'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'

import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'

type TransactionRow = {
  id: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category: string | null
  description: string | null
  createdAt: string
  customer?: { name: string; phone: string } | null
}

type TransactionsTabProps = {
  selectedIds?: readonly string[]
  onSelectionChange?: (ids: readonly string[]) => void
}

export function TransactionsTab({ selectedIds, onSelectionChange }: TransactionsTabProps) {
  const { language } = useLanguage()
  const [rows, setRows] = useState<TransactionRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const locale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
  const title = language === 'ru' ? 'Транзакции' : language === 'uz' ? 'Tranzaksiyalar' : 'Transactions'
  const empty = language === 'ru' ? 'Транзакций пока нет' : language === 'uz' ? 'Tranzaksiyalar yo‘q' : 'No transactions yet'

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/finance/company?limit=100&type=all&category=all')
      if (!response.ok) return
      const data = await response.json()
      const next = Array.isArray(data?.history) ? data.history as TransactionRow[] : []
      setRows(next)
      setSelectedId((current) => current && next.some((row) => row.id === current) ? current : next[0]?.id ?? null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const effectiveSelectedId = selectedIds === undefined ? selectedId : selectedIds[0] ?? null
  const selected = rows.find((row) => row.id === effectiveSelectedId)
  const selectTransaction = (id: string) => {
    setSelectedId(id)
    onSelectionChange?.([id])
  }

  return (
    <Card className="min-h-0 border-border/70">
      <CardHeader className="border-b border-border/70"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid min-h-0 gap-4 p-0 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-h-0 overflow-y-auto">
          {isLoading ? <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading...</div> : rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{empty}</p> : rows.map((row) => (
            <button key={row.id} type="button" aria-pressed={effectiveSelectedId === row.id} onClick={() => selectTransaction(row.id)} className={`flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left ${effectiveSelectedId === row.id ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.description || row.category || row.type}</span><span className="block text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString(locale)}</span></span>
              <span className={row.type === 'EXPENSE' ? 'shrink-0 text-sm text-red-600' : 'shrink-0 text-sm text-emerald-600'}>{row.type === 'EXPENSE' ? '−' : '+'}{row.amount.toLocaleString(locale)} UZS</span>
              <Badge variant="outline">{row.type}</Badge>
            </button>
          ))}
        </div>
        <aside className="border-l border-border/70 bg-muted/10 p-3">
          {selected ? <ResourceCalendarPanel resourceType="TRANSACTION" resourceId={selected.id} compact /> : <p className="text-xs text-muted-foreground">{language === 'ru' ? 'Выберите транзакцию' : language === 'uz' ? 'Tranzaksiyani tanlang' : 'Select a transaction'}</p>}
        </aside>
      </CardContent>
    </Card>
  )
}
