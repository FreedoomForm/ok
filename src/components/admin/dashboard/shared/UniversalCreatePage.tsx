'use client'

import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import type { WorkspaceResourcePage } from './workspace-state'

// R24: universal creation (key + plus) opens the creation-rows page from any
// workspace page. Each row expands into a minimal create form; «+» submits it
// and the created element becomes a single-line table row (no column
// headers). The last selected row is the active creation row.

type CreateFieldSpec = {
  id: string
  label: string
  placeholder: string
  type: 'text' | 'number' | 'tel'
  required?: boolean
  defaultValue?: string
}

type CreateRowSpec = {
  resource: WorkspaceResourcePage
  fields: readonly CreateFieldSpec[]
  buildPayload: (values: Record<string, string>) => Record<string, unknown>
  endpoint: string
  describe: (values: Record<string, string>) => string
}

const dayFlags = () => ({
  monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false,
})

const CREATE_ROWS: readonly CreateRowSpec[] = [
  {
    resource: 'clients',
    endpoint: '/api/admin/clients',
    fields: [
      { id: 'name', label: 'name', placeholder: 'Имя / Ism', type: 'text', required: true },
      { id: 'phone', label: 'phone', placeholder: '+998 90 000 00 00', type: 'tel', required: true },
      { id: 'address', label: 'address', placeholder: 'Адрес / Manzil', type: 'text', required: true },
      { id: 'calories', label: 'calories', placeholder: '1200', type: 'number', defaultValue: '1200' },
      { id: 'dailyPrice', label: 'dailyPrice', placeholder: '84000', type: 'number', defaultValue: '84000' },
    ],
    buildPayload: (values) => ({
      name: values.name?.trim() || '',
      phone: values.phone?.trim() || '',
      address: values.address?.trim() || '',
      calories: Number(values.calories) || 1200,
      planType: 'CLASSIC',
      dailyPrice: Number(values.dailyPrice) || 84000,
      deliveryDays: dayFlags(),
      autoOrdersEnabled: true,
      isActive: true,
      defaultCourierId: '',
      assignedSetId: '',
    }),
    describe: (values) => [values.name, values.phone].filter(Boolean).join(' · '),
  },
  {
    resource: 'ingredients',
    endpoint: '/api/admin/warehouse/ingredients',
    fields: [
      { id: 'name', label: 'name', placeholder: 'Рис / Guruch', type: 'text', required: true },
      { id: 'amount', label: 'amount', placeholder: '10', type: 'number', defaultValue: '0' },
      { id: 'unit', label: 'unit', placeholder: 'kg', type: 'text', defaultValue: 'kg' },
      { id: 'pricePerUnit', label: 'price', placeholder: '12000', type: 'number', defaultValue: '0' },
    ],
    buildPayload: (values) => ({
      name: values.name?.trim() || '',
      amount: Number(values.amount) || 0,
      unit: values.unit?.trim() || 'kg',
      pricePerUnit: values.pricePerUnit ? Number(values.pricePerUnit) : null,
      priceUnit: values.unit?.trim() || 'kg',
    }),
    describe: (values) => [values.name, values.amount && `${values.amount} ${values.unit}`].filter(Boolean).join(' · '),
  },
  {
    resource: 'finance',
    endpoint: '/api/admin/finance/cards',
    fields: [
      { id: 'name', label: 'name', placeholder: 'Карта / Karta', type: 'text', required: true },
      { id: 'color', label: 'color', placeholder: '#22c55e', type: 'text', defaultValue: '#22c55e' },
    ],
    buildPayload: (values) => ({ name: values.name?.trim() || '', color: values.color?.trim() || '#22c55e' }),
    describe: (values) => values.name,
  },
  {
    resource: 'chat',
    endpoint: '/api/chat/contacts',
    fields: [
      { id: 'name', label: 'name', placeholder: 'Имя / Ism', type: 'text', required: true },
      { id: 'phone', label: 'phone', placeholder: '+998 90 000 00 00', type: 'tel', required: true },
    ],
    buildPayload: (values) => ({ name: values.name?.trim() || '', phone: values.phone?.replace(/[^+\d]/g, '') || '' }),
    describe: (values) => [values.name, values.phone].filter(Boolean).join(' · '),
  },
  {
    resource: 'dishes',
    endpoint: '/api/admin/warehouse/dishes',
    fields: [
      { id: 'name', label: 'name', placeholder: 'Ош / Osh', type: 'text', required: true },
    ],
    buildPayload: (values) => ({ name: values.name?.trim() || '' }),
    describe: (values) => values.name,
  },
]

export type UniversalCreatePageProps = {
  /** Initial creation row — the page the key+plus was pressed on. */
  initialResource: WorkspaceResourcePage
  createdLabel: string
  addLabel: string
  emptyLabel: string
  errorLabel: string
  rowLabels: Readonly<Record<string, string>>
}

function UniversalCreateRow({
  spec,
  labels,
  addLabel,
  errorLabel,
  isLastSelected,
  onSelect,
  onCreated,
}: {
  spec: CreateRowSpec
  labels: Readonly<Record<string, string>>
  addLabel: string
  errorLabel: string
  isLastSelected: boolean
  onSelect: () => void
  onCreated: (description: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(spec.fields.map((field) => [field.id, field.defaultValue ?? ''])))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => spec.fields.filter((field) => field.required).every((field) => (values[field.id] ?? '').trim().length > 0), [spec.fields, values])

  const submit = useCallback(async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(spec.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec.buildPayload(values)),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : errorLabel)
      onCreated(spec.describe(values))
      setValues(Object.fromEntries(spec.fields.map((field) => [field.id, field.defaultValue ?? ''])))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorLabel)
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, errorLabel, onCreated, spec, submitting, values])

  const Chevron = expanded ? ChevronDown : ChevronRight
  return (
    <li className="rounded-lg border border-border bg-card" data-reference-create-row={spec.resource}>
      <button
        type="button"
        onClick={() => { onSelect(); setExpanded((current) => !current) }}
        aria-expanded={expanded}
        className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Chevron className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {labels[spec.resource] ?? spec.resource}
          {isLastSelected ? <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">★</span> : null}
        </span>
      </button>
      {expanded ? (
        <div className="space-y-2 border-t border-border/60 p-3" data-reference-create-form={spec.resource}>
          <div className="grid gap-2 sm:grid-cols-2">
            {spec.fields.map((field) => (
              <label key={field.id} className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                {labels[field.label] ?? field.label}
                <input
                  type={field.type}
                  value={values[field.id] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => setValues((previous) => ({ ...previous, [field.id]: event.target.value }))}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  aria-label={`${labels[field.label] ?? field.label}`}
                />
              </label>
            ))}
          </div>
          {error ? <p className="text-xs text-red-600" data-reference-create-error="true">{error}</p> : null}
          <button
            type="button"
            data-reference-create-submit={spec.resource}
            disabled={!canSubmit || submitting}
            onClick={() => void submit()}
            className="flex min-h-10 items-center gap-2 rounded-lg border border-green-600 bg-green-600 px-4 text-sm text-white hover:bg-green-700 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" aria-hidden="true" />
            {addLabel}
          </button>
        </div>
      ) : null}
    </li>
  )
}

export function UniversalCreatePage({
  initialResource,
  createdLabel,
  addLabel,
  emptyLabel,
  errorLabel,
  rowLabels,
}: UniversalCreatePageProps) {
  const [lastSelected, setLastSelected] = useState<WorkspaceResourcePage>(initialResource)
  const [created, setCreated] = useState<Array<{ id: number; resource: WorkspaceResourcePage; description: string }>>([])
  const [nextId, setNextId] = useState(1)

  return (
    <section aria-label={createdLabel} data-reference-universal-create="true" className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <ul className="space-y-2">
        {CREATE_ROWS.map((spec) => (
          <UniversalCreateRow
            key={spec.resource}
            spec={spec}
            labels={rowLabels}
            addLabel={addLabel}
            errorLabel={errorLabel}
            isLastSelected={lastSelected === spec.resource}
            onSelect={() => setLastSelected(spec.resource)}
            onCreated={(description) => {
              setCreated((previous) => [...previous, { id: nextId, resource: spec.resource, description }])
              setNextId((current) => current + 1)
            }}
          />
        ))}
      </ul>
      <div>
        <h3 className="mb-2 text-sm font-semibold">{createdLabel}</h3>
        {created.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card" data-reference-created-rows="true">
            {created.map((entry) => (
              <li key={entry.id} className="flex min-h-11 items-center gap-3 px-3 py-1.5 text-sm" data-reference-created-row={entry.resource}>
                <span className="min-w-0 flex-1 truncate">{entry.description}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{rowLabels[entry.resource] ?? entry.resource}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
