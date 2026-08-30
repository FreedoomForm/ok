'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Mic, Plus, Square, Trash2 } from 'lucide-react'

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

interface AiSuggestion extends PurchaseItem {
  selected: boolean
  priceEnabled: boolean
  // §12: every editable block carries the matched inventory item and the
  // grounding confidence so the human confirmation is informed.
  matchedInventoryId?: string | null
  confidence?: 'exact' | 'fuzzy'
  warning?: string
}

interface VirtualCardOption {
  id: string
  name: string
  balance: number
  isActive: boolean
  deletedAt?: string | null
}

interface Purchase {
  id: string
  title: string
  status: 'DRAFT' | 'COMPLETED'
  deletedAt: string | null
  totalCost: number
  createdAt: string
  completedAt: string | null
  items: PurchaseItem[]
  transaction: { id: string; amount: number; type: string; createdAt: string; virtualCardId: string | null; virtualCard: { id: string; name: string } | null } | null
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
}

export type CalculatorTabProps = {
  showDeleted?: boolean
  selectedPurchaseIds?: readonly string[]
  onPurchaseSelectionChange?: (ids: readonly string[]) => void
  universalEdit?: boolean
  onUniversalEditHandled?: () => void
}

export function CalculatorTab({ showDeleted = false, selectedPurchaseIds, onPurchaseSelectionChange, universalEdit = false, onUniversalEditHandled }: CalculatorTabProps) {
  const { language } = useLanguage()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [internalSelectedPurchaseId, setInternalSelectedPurchaseId] = useState<string | null>(null)
  const selectedPurchaseId = selectedPurchaseIds?.[0] ?? internalSelectedPurchaseId
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null)
  const [calculatorSummary, setCalculatorSummary] = useState<CalculatorSummary>({ required: [], shopping: [], totalCost: 0, dateRange: null })
  const [virtualCards, setVirtualCards] = useState<VirtualCardOption[]>([])
  const [virtualCardId, setVirtualCardId] = useState('')
  const [workflowPurchaseId, setWorkflowPurchaseId] = useState<string | null>(null)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [draftItems, setDraftItems] = useState<CalculatorSummary['shopping'] | null>(null)
  const [excludedShoppingNames, setExcludedShoppingNames] = useState<readonly string[]>([])
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRejected, setAiRejected] = useState<string[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [aiNeedsConfirmation, setAiNeedsConfirmation] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [audioTranscriptionLoading, setAudioTranscriptionLoading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const dateLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'ru-RU'
  const text = language === 'ru'
      ? { rail: 'История покупок', empty: 'Покупок пока нет', ingredients: 'Ингредиенты', amount: 'Количество', card: 'Карта', transaction: 'Транзакция', draft: 'Черновик' }
    : language === 'uz'
      ? { rail: 'Xaridlar tarixi', empty: 'Xaridlar yo‘q', ingredients: 'Masalliqlar', amount: 'Miqdor', card: 'Karta', transaction: 'Tranzaksiya', draft: 'Qoralama' }
      : { rail: 'История покупок', empty: 'Покупок пока нет', ingredients: 'Ингредиенты', amount: 'Количество', card: 'Карта', transaction: 'Транзакция', draft: 'Черновик' }
  const audioText = language === 'uz'
    ? { start: 'Yozishni boshlash', stop: 'Yozishni to‘xtatish', unsupported: 'Brauzer audio yozishni qo‘llamaydi', recorded: 'Audio yozildi. AI uchun transkriptni matn maydoniga kiriting.' }
    : { start: 'Начать запись', stop: 'Остановить запись', unsupported: 'Браузер не поддерживает запись аудио', recorded: 'Аудио записано. Текст можно использовать после расшифровки.' }

  const transcribeAudio = useCallback(async (blob: Blob) => {
    setAudioTranscriptionLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'purchase-audio.webm')
      const response = await fetch('/api/admin/finance/purchases/transcribe', { method: 'POST', body: formData })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data?.transcript !== 'string') throw new Error(data?.error || 'Расшифровка недоступна; введите текст вручную')
      setAiPrompt((current) => current.trim() ? `${current.trim()}\n${data.transcript}` : data.transcript)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Расшифровка недоступна; введите текст вручную')
    } finally {
      setAudioTranscriptionLoading(false)
    }
  }, [])

  const fetchVirtualCards = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/finance/cards')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return
      setVirtualCards(Array.isArray(data?.cards) ? data.cards.filter((card: VirtualCardOption) => card.isActive && !card.deletedAt) : [])
    } catch {
      // Company balance remains available when card history is unavailable.
    }
  }, [])

  const fetchPurchases = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/finance/purchases?showDeleted=${showDeleted ? 'true' : 'false'}`)
      if (!response.ok) return
      const data = await response.json()
      setPurchases(Array.isArray(data?.purchases) ? data.purchases : [])
    } catch {
      // The calculator itself remains usable if history is temporarily unavailable.
    }
  }, [showDeleted])

  useEffect(() => {
    void fetchPurchases()
    void fetchVirtualCards()
    const interval = window.setInterval(() => { void fetchPurchases(); void fetchVirtualCards() }, 15000)
    return () => window.clearInterval(interval)
  }, [fetchPurchases, fetchVirtualCards])

  const startRecording = useCallback(async () => {
    if (isRecording) return
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(audioText.unsupported)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setRecordedAudioUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob) })
        void transcribeAudio(blob)
        setIsRecording(false)
        stream.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      mediaRecorderRef.current = recorder
      mediaStreamRef.current = stream
      recorder.start()
      setIsRecording(true)
    } catch {
      toast.error(audioText.unsupported)
    }
  }, [audioText.unsupported, isRecording, transcribeAudio])
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }, [])
  useEffect(() => () => {
    mediaRecorderRef.current?.stop()
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl)
  }, [recordedAudioUrl])

  const requestAiPurchase = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiRejected([])
    try {
      const response = await fetch('/api/admin/finance/purchases/assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: aiPrompt.trim() }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Ошибка AI-помощника')
      const items = Array.isArray(data?.items) ? data.items as PurchaseItem[] : []
      const suggestions = items.map((item, index) => ({ ...item, id: item.id || `ai-${Date.now()}-${index}`, selected: true, priceEnabled: false }))
      setAiRejected(Array.isArray(data?.rejected) ? data.rejected : [])
      setAiSuggestions(suggestions)
      setAiNeedsConfirmation(suggestions.length > 0)
      setCalculatorSummary({ required: [], shopping: suggestions, totalCost: suggestions.reduce((sum, item) => sum + Number(item.totalCost || 0), 0), dateRange: null })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Ошибка AI-помощника') } finally { setAiLoading(false) }
  }, [aiLoading, aiPrompt])

  useEffect(() => {
    if (aiSuggestions.length === 0) return
    const shopping = aiSuggestions.filter((item) => item.selected && item.name.trim() && Number.isFinite(item.amount) && item.amount > 0 && Number.isFinite(item.costPerUnit) && item.costPerUnit >= 0).map((item) => ({ name: item.name.trim(), amount: item.amount, unit: item.unit.trim() || 'kg', costPerUnit: item.costPerUnit, totalCost: item.amount * item.costPerUnit }))
    setCalculatorSummary((current) => ({ ...current, shopping, totalCost: shopping.reduce((sum, item) => sum + item.totalCost, 0) }))
  }, [aiSuggestions])

  useEffect(() => {
    if (!universalEdit) return
    const id = selectedPurchaseIds?.[0] ?? internalSelectedPurchaseId
    const purchase = id ? purchases.find((candidate) => candidate.id === id) : undefined
    if (purchase?.status === 'DRAFT' && !purchase.deletedAt) {
      const nextItems = purchase.items.map(({ name, amount, unit, costPerUnit }) => ({ name, amount, unit, costPerUnit, totalCost: amount * costPerUnit }))
      setEditingDraftId(purchase.id)
      setWorkflowPurchaseId(purchase.id)
      setDraftItems(nextItems)
    }
    onUniversalEditHandled?.()
  }, [internalSelectedPurchaseId, onUniversalEditHandled, purchases, selectedPurchaseIds, universalEdit])

  // §9: Delete removes a row from the purchase draft — a fresh calculation
  // starts a new draft, so row exclusions reset whenever the demand recomputes.
  useEffect(() => {
    setExcludedShoppingNames([])
  }, [calculatorSummary.shopping])

  const displayedShopping = editingDraftId && draftItems ? draftItems : calculatorSummary.shopping.filter((item) => !excludedShoppingNames.includes(item.name))
  const displayedTotalCost = displayedShopping.reduce((sum, item) => sum + item.totalCost, 0)

  const savePurchaseDraft = useCallback(async (complete: boolean) => {
    if (displayedShopping.length === 0 || isWorkflowLoading || aiNeedsConfirmation) return
    setIsWorkflowLoading(true)
    try {
      const items = displayedShopping.map((item) => ({ name: item.name, amount: item.amount, unit: item.unit, costPerUnit: item.costPerUnit }))
      let purchaseId = workflowPurchaseId
      if (!purchaseId) {
        const idempotencyKey = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `calculator-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const response = await fetch('/api/admin/finance/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: calculatorSummary.dateRange ? `${language === 'uz' ? 'Xarid' : 'Покупка'} ${calculatorSummary.dateRange.from}` : language === 'uz' ? 'Masalliqlar xarid ro‘yxati' : 'Список покупки', items, idempotencyKey }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || typeof data?.purchase?.id !== 'string') throw new Error(data?.error || 'Не удалось сохранить список покупок')
        purchaseId = data.purchase.id
        setWorkflowPurchaseId(purchaseId)
        if (!complete) {
          toast.success(language === 'ru' ? 'Список сохранён' : language === 'uz' ? 'Ro‘yxat saqlandi' : 'Список сохранён')
          await fetchPurchases()
          return
        }
      }
      if (purchaseId && editingDraftId && !complete) {
        const response = await fetch('/api/admin/finance/purchases', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: purchaseId, items }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || 'Не удалось обновить список покупок')
      }
      if (complete && purchaseId) {
        if (editingDraftId) {
          const update = await fetch('/api/admin/finance/purchases', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: purchaseId, items }),
          })
          const updateData = await update.json().catch(() => ({}))
          if (!update.ok) throw new Error(updateData?.error || 'Не удалось обновить список покупок')
        }
        const completion = await fetch(`/api/admin/finance/purchases/${purchaseId}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(virtualCardId ? { virtualCardId } : {}) })
        const completionData = await completion.json().catch(() => ({}))
        if (!completion.ok) throw new Error(completionData?.error || 'Не удалось завершить покупку')
        setWorkflowPurchaseId(null)
        setEditingDraftId(null)
        setDraftItems(null)
      }
      toast.success(complete ? (language === 'ru' ? 'Покупка завершена' : language === 'uz' ? 'Xarid yakunlandi' : 'Покупка завершена') : (language === 'ru' ? 'Список сохранён' : language === 'uz' ? 'Ro‘yxat saqlandi' : 'Список сохранён'))
      await fetchPurchases()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка операции покупки')
    } finally {
      setIsWorkflowLoading(false)
    }
  }, [aiNeedsConfirmation, displayedShopping, editingDraftId, fetchPurchases, isWorkflowLoading, language, virtualCardId, workflowPurchaseId])

  const updateAiSuggestion = useCallback((id: string, patch: Partial<AiSuggestion>) => {
    setAiSuggestions((current) => current.map((item) => item.id === id ? { ...item, ...patch, totalCost: (patch.amount ?? item.amount) * (patch.costPerUnit ?? item.costPerUnit) } : item))
  }, [])
  const addAiSuggestion = useCallback(() => {
    setAiSuggestions((current) => [...current, { id: `ai-${Date.now()}-${current.length}`, name: '', amount: 1, unit: 'kg', costPerUnit: 0, totalCost: 0, selected: true, priceEnabled: false }])
    setAiNeedsConfirmation(true)
  }, [])
  const confirmAiSuggestions = useCallback(async () => {
    try {
      const priceItems = aiSuggestions.filter((item) => item.selected && item.priceEnabled).map(({ name, unit, costPerUnit }) => ({ name, unit, costPerUnit, enabled: true }))
      if (priceItems.length > 0) {
        const response = await fetch('/api/admin/finance/purchases/price-influence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: priceItems }) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || (language === 'uz' ? 'AI narxini saqlab bo‘lmadi' : 'Не удалось применить цену AI'))
      }
      setAiNeedsConfirmation(false)
      toast.success(language === 'uz' ? 'AI takliflari tasdiqlandi' : 'AI-предложения подтверждены')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'uz' ? 'AI takliflari tasdiqlanmadi' : 'AI-предложения не подтверждены'))
    }
  }, [aiSuggestions, language])

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
        selectedIds={selectedPurchaseIds}
        onSelectionChange={onPurchaseSelectionChange}
        selectionLabel={(item) => `${language === 'uz' ? 'Tanlash' : 'Выбрать'} ${item.title}`}
        resourceKind="calculator"
        onSelect={(id) => { setInternalSelectedPurchaseId(id); onPurchaseSelectionChange?.([id]) }}
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
              {purchase.transaction ? <div className="space-y-0.5 text-[11px] text-muted-foreground"><p>{text.transaction}: {purchase.transaction.id} · {formatAmount(purchase.transaction.amount)} UZS</p><p>{text.card}: {purchase.transaction.virtualCard?.name ?? purchase.transaction.virtualCardId ?? '—'}</p></div> : null}
              <ResourceCalendarPanel resourceType="PURCHASE" resourceId={purchase.id} compact />
            </div>
          )
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <section className="rounded border border-border/70 bg-muted/10 p-3">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{language === 'uz' ? 'AI xarid' : 'AI-закупка'}</h2><span className="text-[11px] text-muted-foreground">{language === 'uz' ? 'Tasdiqlash kerak' : 'Требует подтверждения'}</span></div>
          <div className="mt-2 flex flex-wrap gap-2"><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={language === 'ru' ? 'Опишите список продуктов или вставьте расшифровку аудио' : 'Mahsulotlarni yoki audio transkriptini yozing'} aria-label="AI purchase request" className="min-h-16 min-w-0 flex-1 resize-y rounded border border-border bg-background px-2 py-1.5 text-sm" /><button type="button" disabled={aiLoading || !aiPrompt.trim()} onClick={() => void requestAiPurchase()} className="self-end rounded border border-border px-3 py-2 text-sm disabled:opacity-50">{aiLoading ? '...' : 'AI'}</button><button type="button" onClick={() => isRecording ? stopRecording() : void startRecording()} className="self-end rounded border border-border p-2 text-sm" aria-label={isRecording ? audioText.stop : audioText.start} title={isRecording ? audioText.stop : audioText.start}>{isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}</button></div>
          {recordedAudioUrl ? <div className="mt-2 flex flex-wrap items-center gap-2"><audio controls src={recordedAudioUrl} className="h-8 max-w-full" /><span className="text-xs text-muted-foreground">{audioTranscriptionLoading ? (language === 'ru' ? 'Расшифровка…' : 'Transkripsiya…') : audioText.recorded}</span></div> : null}
          {aiRejected.length > 0 ? <p className="mt-2 text-xs text-red-600">{aiRejected.join(', ')}</p> : null}
        </section>
        {aiSuggestions.length > 0 ? <section aria-label={language === 'uz' ? 'AI takliflari' : 'AI-предложения'} className="border-b border-border/70 pb-3" data-reference-ai-suggestions="true">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{language === 'uz' ? 'AI takliflari' : 'AI-предложения'}</h3><span className="text-[11px] text-muted-foreground">{aiNeedsConfirmation ? (language === 'uz' ? 'Tasdiqlash kerak' : 'Требует подтверждения') : (language === 'uz' ? 'Tasdiqlangan' : 'Подтверждено')}</span></div>
          <div className="space-y-1.5">{aiSuggestions.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-1.5" data-reference-ai-row="true" data-reference-ai-confidence={item.confidence ?? undefined}>
            <input type="checkbox" checked={item.selected} onChange={(event) => updateAiSuggestion(item.id, { selected: event.target.checked })} aria-label={`${language === 'uz' ? 'AI tanlash' : 'Выбрать AI'} ${item.name || item.id}`} />
            <input value={item.name} onChange={(event) => updateAiSuggestion(item.id, { name: event.target.value })} aria-label={`${language === 'uz' ? 'AI mahsulot' : 'AI продукт'} ${item.id}`} className="min-w-32 flex-1 rounded-none border border-border bg-background px-2 py-1 text-sm" />
            {item.confidence === 'fuzzy' ? <span data-reference-ai-warning="true" className="rounded-none border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">{language === 'uz' ? 'Tekshiring' : 'Проверьте соответствие'}</span> : null}
            <input type="number" min="0" step="any" value={item.amount} onChange={(event) => updateAiSuggestion(item.id, { amount: Number(event.target.value) })} aria-label={`${language === 'uz' ? 'AI miqdor' : 'AI количество'} ${item.id}`} className="w-20 rounded-none border border-border bg-background px-2 py-1 text-sm" />
            <input value={item.unit} onChange={(event) => updateAiSuggestion(item.id, { unit: event.target.value })} aria-label={`${language === 'uz' ? 'AI birlik' : 'AI единица'} ${item.id}`} className="w-16 rounded-none border border-border bg-background px-2 py-1 text-sm" />
            <input type="number" min="0" step="any" value={item.costPerUnit} onChange={(event) => updateAiSuggestion(item.id, { costPerUnit: Number(event.target.value) })} aria-label={`${language === 'uz' ? 'AI narx' : 'AI цена'} ${item.id}`} className="w-24 rounded-none border border-border bg-background px-2 py-1 text-sm" />
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground"><input type="checkbox" checked={item.priceEnabled} onChange={(event) => updateAiSuggestion(item.id, { priceEnabled: event.target.checked })} aria-label={`${language === 'uz' ? 'AI narxiga ruxsat' : 'Разрешить цену AI'} ${item.id}`} />{language === 'uz' ? 'Narx' : 'Цена'}</label>
            <button type="button" onClick={() => setAiSuggestions((current) => current.filter((candidate) => candidate.id !== item.id))} aria-label={`${language === 'uz' ? 'AI qatorni o‘chirish' : 'Удалить строку AI'} ${item.name || item.id}`} title={language === 'uz' ? 'Qatorni o‘chirish' : 'Удалить строку'} className="p-1 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="size-4" aria-hidden="true" /></button>
          </div>)}</div>
          <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={addAiSuggestion} aria-label={language === 'uz' ? 'AI qatorini qo‘shish' : 'Добавить строку AI'} className="inline-flex items-center gap-1 rounded-none border border-transparent px-2 py-1 text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" aria-hidden="true" />{language === 'uz' ? 'Qator' : 'Строка'}</button><button type="button" onClick={confirmAiSuggestions} disabled={!aiSuggestions.some((item) => item.selected)} aria-label={language === 'uz' ? 'AI takliflarini tasdiqlash' : 'Подтвердить AI-предложения'} className="rounded-none bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">{language === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}</button></div>
        </section> : null}
        <section className="grid gap-3 border-b border-border/70 pb-3" aria-label="Calculator summary">
          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{language === 'uz' ? 'Kerakli miqdor' : 'Обязательное количество'}</p><p className="text-lg font-semibold">{calculatorSummary.required.length}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{language === 'uz' ? 'Xarid' : 'Покупка'}</p><p className="text-lg font-semibold">{displayedShopping.length}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{language === 'uz' ? 'Narx' : 'Стоимость'}</p><p className="text-lg font-semibold tabular-nums">{formatAmount(editingDraftId ? displayedTotalCost : calculatorSummary.totalCost)} UZS</p></div>
        </section>
        {calculatorSummary.dateRange ? <p className="text-xs text-muted-foreground">{calculatorSummary.dateRange.from} — {calculatorSummary.dateRange.to}</p> : null}
        <div className="min-h-0 flex-1 overflow-auto">
          {displayedShopping.length > 0 ? <div className="overflow-hidden rounded border border-border/70" data-reference-calculator-draft="true" data-reference-calculator-draft-editor={editingDraftId ? 'true' : undefined}><table className="w-full text-sm"><thead><tr className="border-b bg-muted/20 text-left"><th className="p-2">{text.ingredients}</th><th className="p-2">{text.amount}</th><th className="p-2 text-right">{language === 'ru' ? 'Стоимость' : language === 'uz' ? 'Narx' : 'Cost'}</th><th className="w-10" aria-hidden="true" /></tr></thead><tbody>{displayedShopping.map((item, index) => <tr key={`${item.name}-${index}`} className="border-b last:border-0" data-reference-calculator-row={item.name}><td className="p-2">{item.name}</td><td className="p-2 tabular-nums">{editingDraftId ? <input type="number" min="0" step="any" value={item.amount} aria-label={`${text.amount} ${item.name}`} onChange={(event) => { const amount = Number(event.target.value); setDraftItems((current) => current ? current.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, amount, totalCost: amount * candidate.costPerUnit } : candidate) : current) }} className="w-24 rounded-none border border-border bg-background px-2 py-1" /> : formatAmount(item.amount)} {item.unit}</td><td className="p-2 text-right tabular-nums">{formatAmount(item.totalCost)} UZS</td><td className="p-2 text-right"><button type="button" onClick={() => (editingDraftId ? setDraftItems((current) => current ? current.filter((_, candidateIndex) => candidateIndex !== index) : current) : setExcludedShoppingNames((current) => current.includes(item.name) ? current : [...current, item.name]))} aria-label={`${language === 'uz' ? 'Qatorni o‘chirish' : 'Удалить строку'} ${item.name}`} title={language === 'uz' ? 'Qatorni o‘chirish' : 'Удалить строку'} className="p-1 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="size-4" aria-hidden="true" /></button></td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">{language === 'uz' ? 'Kun yoki davrni tanlab hisoblang' : 'Выберите день или период и нажмите расчёт'}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <select value={virtualCardId} onChange={(event) => setVirtualCardId(event.target.value)} aria-label={language === 'uz' ? 'To‘lov hisobi' : 'Счёт оплаты'} className="h-9 max-w-full rounded border border-border bg-background px-2 text-sm"><option value="">{language === 'uz' ? 'Kompaniya hisobi' : 'Счёт компании'}</option>{virtualCards.map((card) => <option key={card.id} value={card.id}>{card.name} · {formatAmount(card.balance)} UZS</option>)}</select>
          <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="rounded border border-border px-3 py-2 text-sm disabled:opacity-50" disabled={isWorkflowLoading || aiNeedsConfirmation || displayedShopping.length === 0} onClick={() => void savePurchaseDraft(false)}>{language === 'uz' ? 'Ro‘yxatni saqlash' : 'Сохранить список'}</button>
          <button type="button" className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={isWorkflowLoading || aiNeedsConfirmation || displayedShopping.length === 0} onClick={() => void savePurchaseDraft(true)}>{language === 'uz' ? 'Xaridni yakunlash' : 'Завершить покупку'}</button>
          </div>
        </div>
        <WarehouseTab initialSubTab="calculator" calculatorWorkflow onCalculatorSummaryChange={setCalculatorSummary} onPurchaseCompleted={() => void fetchPurchases()} />
      </div>
    </div>
  )
}
