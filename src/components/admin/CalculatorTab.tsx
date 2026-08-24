'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useLanguage } from '@/contexts/LanguageContext'
import { SecondaryResourceRail, type SecondaryResourceRailItem } from '@/components/admin/dashboard/shared/SecondaryResourceRail'
import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel'
import { WarehouseTab, type CalculatorSummary } from '@/components/admin/WarehouseTab'

interface PurchaseItem {
  id: string
  name: string
  amount: number
  unit: string
  costPerUnit: number
  totalCost: number
}

interface Purchase {
  id: string
  title: string
  status: 'DRAFT' | 'COMPLETED'
  totalCost: number
  createdAt: string
  completedAt: string | null
  items: PurchaseItem[]
  transaction: { id: string; amount: number; type: string; createdAt: string } | null
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
}

export function CalculatorTab() {
  const { language } = useLanguage()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null)
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null)
  const [calculatorSummary, setCalculatorSummary] = useState<CalculatorSummary>({ required: [], shopping: [], totalCost: 0, dateRange: null })
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRejected, setAiRejected] = useState<string[]>([])
  const dateLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
  const text = language === 'ru'
    ? { rail: 'История покупок', empty: 'Покупок пока нет', ingredients: 'Ингредиенты', draft: 'Черновик' }
    : language === 'uz'
      ? { rail: 'Xaridlar tarixi', empty: 'Xaridlar yo‘q', ingredients: 'Masalliqlar', draft: 'Qoralama' }
      : { rail: 'Purchase history', empty: 'No purchases', ingredients: 'Ingredients', draft: 'Draft' }

  const fetchPurchases = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/finance/purchases')
      if (!response.ok) return
      const data = await response.json()
      setPurchases(Array.isArray(data?.purchases) ? data.purchases : [])
    } catch {
      // The calculator itself remains usable if history is temporarily unavailable.
    }
  }, [])

  useEffect(() => {
    void fetchPurchases()
    const interval = window.setInterval(() => void fetchPurchases(), 15000)
    return () => window.clearInterval(interval)
  }, [fetchPurchases])

  const requestAiPurchase = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiRejected([])
    try {
      const response = await fetch('/api/admin/finance/purchases/assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: aiPrompt.trim() }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'AI assistant failed')
      const items = Array.isArray(data?.items) ? data.items : []
      setAiRejected(Array.isArray(data?.rejected) ? data.rejected : [])
      setCalculatorSummary({ required: [], shopping: items, totalCost: items.reduce((sum: number, item: { totalCost?: number }) => sum + Number(item.totalCost || 0), 0), dateRange: null })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'AI assistant failed') } finally { setAiLoading(false) }
  }, [aiLoading, aiPrompt])

  const savePurchaseDraft = useCallback(async (complete: boolean) => {
    if (calculatorSummary.shopping.length === 0 || isWorkflowLoading) return
    setIsWorkflowLoading(true)
    try {
      const items = calculatorSummary.shopping.map((item) => ({ name: item.name, amount: item.amount, unit: item.unit, costPerUnit: item.costPerUnit }))
      const response = await fetch('/api/admin/finance/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: calculatorSummary.dateRange ? `Purchase ${calculatorSummary.dateRange.from}` : 'Ingredient purchase list', items }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Could not save purchase list')
      if (complete && data?.purchase?.id) {
        const completion = await fetch(`/api/admin/finance/purchases/${data.purchase.id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const completionData = await completion.json().catch(() => ({}))
        if (!completion.ok) throw new Error(completionData?.error || 'Could not complete purchase')
      }
      toast.success(complete ? (language === 'ru' ? 'Покупка завершена' : language === 'uz' ? 'Xarid yakunlandi' : 'Purchase completed') : (language === 'ru' ? 'Список сохранён' : language === 'uz' ? 'Ro‘yxat saqlandi' : 'List saved'))
      await fetchPurchases()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Purchase workflow failed')
    } finally {
      setIsWorkflowLoading(false)
    }
  }, [calculatorSummary, fetchPurchases, isWorkflowLoading, language])

  const items: SecondaryResourceRailItem[] = useMemo(() => purchases.map((purchase) => ({
    id: purchase.id,
    title: purchase.title,
    meta: new Date(purchase.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }),
    amount: `${formatAmount(purchase.totalCost)} UZS`,
    color: purchase.status === 'COMPLETED' ? '#059669' : '#d97706',
  })), [dateLocale, purchases])

  return (
    <div className="flex min-h-0 gap-0">
      <SecondaryResourceRail
        ariaLabel={text.rail}
        items={items}
        emptyLabel={text.empty}
        selectedId={selectedPurchaseId}
        expandedId={expandedPurchaseId}
        onSelect={setSelectedPurchaseId}
        onToggle={(id) => setExpandedPurchaseId((current) => current === id ? null : id)}
        renderExpanded={(item) => {
          const purchase = purchases.find((candidate) => candidate.id === item.id)
          if (!purchase) return null
          return (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{text.ingredients}</p>
              {purchase.items.map((ingredient) => (
                <div key={ingredient.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{ingredient.name}</span>
                  <span className="shrink-0 tabular-nums">{formatAmount(ingredient.amount)} {ingredient.unit}</span>
                </div>
              ))}
              {purchase.status === 'DRAFT' ? <p className="text-[11px] text-amber-600">{text.draft}</p> : null}
              <ResourceCalendarPanel resourceType="PURCHASE" resourceId={purchase.id} compact />
            </div>
          )
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <section className="rounded border border-border/70 bg-muted/10 p-3">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{language === 'ru' ? 'AI-закупка' : language === 'uz' ? 'AI xarid' : 'AI purchase'}</h2><span className="text-[11px] text-muted-foreground">{language === 'ru' ? 'Требует подтверждения' : language === 'uz' ? 'Tasdiqlash kerak' : 'Requires confirmation'}</span></div>
          <div className="mt-2 flex gap-2"><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={language === 'ru' ? 'Опишите список продуктов или вставьте расшифровку аудио' : language === 'uz' ? 'Mahsulotlarni yoki audio transkriptini yozing' : 'Describe products or paste an audio transcript'} aria-label="AI purchase request" className="min-h-16 flex-1 resize-y rounded border border-border bg-background px-2 py-1.5 text-sm" /><button type="button" disabled={aiLoading || !aiPrompt.trim()} onClick={() => void requestAiPurchase()} className="self-end rounded border border-border px-3 py-2 text-sm disabled:opacity-50">{aiLoading ? '...' : 'AI'}</button></div>
          {aiRejected.length > 0 ? <p className="mt-2 text-xs text-red-600">{aiRejected.join(', ')}</p> : null}
        </section>
        <section className="grid gap-3 border-b border-border/70 pb-3 sm:grid-cols-3" aria-label="Calculator summary">
          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{language === 'ru' ? 'Обязательное количество' : language === 'uz' ? 'Kerakli miqdor' : 'Required quantity'}</p><p className="text-lg font-semibold">{calculatorSummary.required.length}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{language === 'ru' ? 'Покупка' : language === 'uz' ? 'Xarid' : 'Shopping list'}</p><p className="text-lg font-semibold">{calculatorSummary.shopping.length}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{language === 'ru' ? 'Стоимость' : language === 'uz' ? 'Narx' : 'Total cost'}</p><p className="text-lg font-semibold tabular-nums">{formatAmount(calculatorSummary.totalCost)} UZS</p></div>
        </section>
        {calculatorSummary.dateRange ? <p className="text-xs text-muted-foreground">{calculatorSummary.dateRange.from} — {calculatorSummary.dateRange.to}</p> : null}
        <div className="min-h-0 flex-1 overflow-auto">
          {calculatorSummary.shopping.length > 0 ? <div className="overflow-hidden rounded border border-border/70"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/20 text-left"><th className="p-2">{text.ingredients}</th><th className="p-2">{language === 'ru' ? 'Количество' : language === 'uz' ? 'Miqdor' : 'Amount'}</th><th className="p-2 text-right">{language === 'ru' ? 'Стоимость' : language === 'uz' ? 'Narx' : 'Cost'}</th></tr></thead><tbody>{calculatorSummary.shopping.map((item) => <tr key={item.name} className="border-b last:border-0"><td className="p-2">{item.name}</td><td className="p-2 tabular-nums">{formatAmount(item.amount)} {item.unit}</td><td className="p-2 text-right tabular-nums">{formatAmount(item.totalCost)} UZS</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Выберите день или период и нажмите расчёт' : language === 'uz' ? 'Kun yoki davrni tanlab hisoblang' : 'Select a day or period and calculate'}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
          <button type="button" className="rounded border border-border px-3 py-2 text-sm disabled:opacity-50" disabled={isWorkflowLoading || calculatorSummary.shopping.length === 0} onClick={() => void savePurchaseDraft(false)}>{language === 'ru' ? 'Сохранить список' : language === 'uz' ? 'Ro‘yxatni saqlash' : 'Save list'}</button>
          <button type="button" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={isWorkflowLoading || calculatorSummary.shopping.length === 0} onClick={() => void savePurchaseDraft(true)}>{language === 'ru' ? 'Завершить покупку' : language === 'uz' ? 'Xaridni yakunlash' : 'Finish purchase'}</button>
        </div>
        <WarehouseTab initialSubTab="calculator" onCalculatorSummaryChange={setCalculatorSummary} onPurchaseCompleted={() => void fetchPurchases()} />
      </div>
    </div>
  )
}
