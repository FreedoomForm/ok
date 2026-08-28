'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Loader2, RotateCcw, Trash2 } from 'lucide-react'

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
  deletedAt?: string | null
  customer?: { name: string; phone: string } | null
}

type TransactionsTabProps = {
  selectedIds?: readonly string[]
  onSelectionChange?: (ids: readonly string[]) => void
  searchTerm?: string
  showDeleted?: boolean
  universalEdit?: boolean
  onUniversalEditHandled?: () => void
}

export function TransactionsTab({ selectedIds, onSelectionChange, searchTerm = '', showDeleted = false, universalEdit = false, onUniversalEditHandled }: TransactionsTabProps) {
  const { language } = useLanguage()
  const [rows, setRows] = useState<TransactionRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSelectedElementsOpen, setIsSelectedElementsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const locale = language === 'uz' ? 'uz-UZ' : 'ru-RU'
  const title = language === 'uz' ? 'Tranzaksiyalar' : 'Транзакции'
  const empty = language === 'uz' ? 'Tranzaksiyalar yo‘q' : 'Транзакций пока нет'

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const query = new URLSearchParams({ limit: '100', type: 'all', category: 'all', showDeleted: String(showDeleted) })
      if (searchTerm.trim()) query.set('search', searchTerm.trim().slice(0, 120))
      const response = await fetch(`/api/admin/finance/company?${query.toString()}`)
      if (!response.ok) return
      const data = await response.json()
      const next = Array.isArray(data?.history) ? data.history as TransactionRow[] : []
      setRows(next)
      setSelectedId((current) => current && next.some((row) => row.id === current) ? current : next[0]?.id ?? null)
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, showDeleted])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!universalEdit || showDeleted) return
    if ((selectedIds?.length ?? 0) > 1) setIsSelectedElementsOpen(true)
    onUniversalEditHandled?.()
  }, [onUniversalEditHandled, selectedIds, showDeleted, universalEdit])
  const effectiveSelectedId = selectedIds === undefined ? selectedId : selectedIds[0] ?? null
  const selected = rows.find((row) => row.id === effectiveSelectedId)
  const selectTransaction = (id: string) => {
    setSelectedId(id)
    onSelectionChange?.([id])
  }
  const updateTransactionTrash = async (id: string) => {
    const response = await fetch('/api/admin/finance/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, deletedAt: !showDeleted }),
    })
    if (!response.ok) return
    await load()
  }
  return (
    <Card className="min-h-0 border-border/70">
      <CardHeader className="border-b border-border/70"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="min-h-0 p-0">
        {isSelectedElementsOpen ? <div data-reference-selected-elements="transactions" className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{language === 'uz' ? 'Tanlangan tranzaksiyalar' : 'Выбранные транзакции'}</h2><button type="button" className="text-sm underline" onClick={() => setIsSelectedElementsOpen(false)}>{language === 'uz' ? 'Orqaga' : 'Назад'}</button></div>
          <div className="divide-y border-y" role="list" aria-label={language === 'uz' ? 'Tanlangan tranzaksiyalar' : 'Выбранные транзакции'}>{rows.filter((row) => selectedIds?.includes(row.id)).map((row) => <button key={row.id} type="button" role="listitem" className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/30" onClick={() => { setIsSelectedElementsOpen(false); selectTransaction(row.id) }}><span className="min-w-0 truncate text-sm font-medium">{row.description || row.category || row.type}</span><span className="shrink-0 text-xs text-muted-foreground">{language === 'uz' ? 'Ochish' : 'Открыть'}</span></button>)}</div>
        </div> : <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-h-0 overflow-y-auto">
            {isLoading ? <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{language === 'uz' ? 'Yuklanmoqda…' : 'Загрузка…'}</div> : rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{empty}</p> : rows.map((row) => (
              <div key={row.id} data-reference-resource-row="transactions" data-resource-id={row.id} className={`flex items-center gap-2 border-b border-border/60 px-3 py-1 ${effectiveSelectedId === row.id ? 'bg-muted/50' : ''}`}>
                {onSelectionChange ? <input type="checkbox" checked={selectedIds?.includes(row.id) ?? false} onChange={() => onSelectionChange(selectedIds?.includes(row.id) ? (selectedIds ?? []).filter((id) => id !== row.id) : [...(selectedIds ?? []), row.id])} aria-label={`${language === 'uz' ? 'Tanlash' : 'Выбрать'} ${row.description || row.category || row.type}`} /> : null}
                <button type="button" aria-pressed={effectiveSelectedId === row.id} onClick={() => selectTransaction(row.id)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-left hover:bg-muted/30">
                  <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.description || row.category || row.type}</span><span className="block text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString(locale)}</span></span>
                  <span className={row.type === 'EXPENSE' ? 'shrink-0 text-sm text-red-600' : 'shrink-0 text-sm text-emerald-600'}>{row.type === 'EXPENSE' ? '−' : '+'}{row.amount.toLocaleString(locale)} UZS</span>
                  <Badge variant="outline">{row.type}</Badge>
                </button>
              </div>
            ))}
          </div>
          <aside className="border-l border-border/70 bg-muted/10 p-3">
            {selected ? <>
              <button type="button" className="mb-3 inline-flex h-8 items-center gap-2 border border-border px-2 text-xs" onClick={() => void updateTransactionTrash(selected.id)} aria-label={showDeleted ? (language === 'uz' ? 'Tiklash' : 'Восстановить') : (language === 'uz' ? 'Savatga yuborish' : 'В корзину')}>
                {showDeleted ? <RotateCcw className="size-3.5" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
                {showDeleted ? (language === 'uz' ? 'Tiklash' : 'Восстановить') : (language === 'uz' ? 'Savatga yuborish' : 'В корзину')}
              </button>
              <ResourceCalendarPanel resourceType="TRANSACTION" resourceId={selected.id} compact />
            </> : <p className="text-xs text-muted-foreground">{language === 'uz' ? 'Tranzaksiyani tanlang' : 'Выберите транзакцию'}</p>}
          </aside>
        </div>}
      </CardContent>
    </Card>
  )
}
