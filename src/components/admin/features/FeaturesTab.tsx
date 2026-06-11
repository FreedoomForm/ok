'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, RefreshCcw } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { extractApiError } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { SortableTableHeader, sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

const TableFilterPanel = dynamic(
  () => import('@/components/ui/table-filter-panel').then((mod) => mod.TableFilterPanel),
  { ssr: false }
)

type FeatureRow = {
  id: string
  name: string
  description: string
  type: 'TEXT' | 'SELECT'
  options: unknown | null
  createdAt?: string
}

function normalizeOptions(options: unknown): string[] {
  if (!options) return []
  if (Array.isArray(options)) return options.filter((x): x is string => typeof x === 'string')
  return []
}

export function FeaturesTab() {
  const { t } = useLanguage()
  const [features, setFeatures] = useState<FeatureRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'TEXT' as FeatureRow['type'],
    options: '',
  })

  const [sortStates, setSortStates] = useState<Record<string, SortState>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const featureColumns: SortableColumn[] = useMemo(() => [
    { key: 'name', label: 'Название', type: 'text' },
    { key: 'type', label: 'Тип', type: 'text' },
    { key: 'options', label: 'Варианты', type: 'text' },
    { key: 'description', label: 'Описание', type: 'text' },
  ], [])

  const featureFilterColumns: FilterColumn[] = featureColumns

  const handleSortChange = useCallback((key: string, state: SortState) => {
    setSortStates((prev) => ({ ...prev, [key]: state }))
  }, [])

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleClearAllFilters = useCallback(() => {
    setFilterValues({})
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/features')
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(extractApiError(json, 'Ошибка загрузки'))
      }
      const data = json?.data ?? json
      setFeatures(Array.isArray(data) ? (data as FeatureRow[]) : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createFeature = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(extractApiError(json, 'Ошибка создания'))
      }
      const data = json?.data ?? json

      toast.success(data?.message || 'Создано')
      if (data?.feature) {
        setFeatures((prev) => [data.feature as FeatureRow, ...prev])
      } else {
        await load()
      }

      setForm({ name: '', description: '', type: 'TEXT', options: '' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка создания')
    } finally {
      setIsSaving(false)
    }
  }, [form, load])

  const deleteFeature = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/features?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(extractApiError(data, 'Ошибка удаления'))
      }
      setFeatures((prev) => prev.filter((f) => f.id !== id))
      toast.success('Удалено')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка удаления')
    }
  }, [])

  const processedFeatures = useMemo(() => {
    const flat = features.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      options: normalizeOptions(f.options).join(', '),
      description: f.description || '',
      _original: f,
    }))
    const filtered = applyFilters(flat as unknown as Record<string, unknown>[], filterValues, featureFilterColumns)
    const sorted = sortData(filtered as unknown as Record<string, unknown>[], sortStates, featureColumns)
    return sorted.map((row: Record<string, unknown>) => (row as { _original: FeatureRow })._original)
  }, [features, filterValues, sortStates, featureFilterColumns, featureColumns])

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t.admin.features}</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feature-name">Название</Label>
              <Input
                id="feature-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Например: Без сахара"
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((p) => ({ ...p, type: value as FeatureRow['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">Текст</SelectItem>
                  <SelectItem value="SELECT">Выбор из списка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="feature-desc">Описание</Label>
              <Input
                id="feature-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Короткое описание"
              />
            </div>
            {form.type === 'SELECT' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="feature-options">Варианты (через запятую)</Label>
                <Input
                  id="feature-options"
                  value={form.options}
                  onChange={(e) => setForm((p) => ({ ...p, options: e.target.value }))}
                  placeholder="Например: да, нет"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={createFeature} disabled={isSaving}>
              {isSaving ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Список</CardTitle>
          <TableFilterPanel
            open={filterOpen}
            onOpenChange={setFilterOpen}
            columns={featureFilterColumns}
            filters={filterValues}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAllFilters}
            title="Фильтр характеристик"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {featureColumns.map((col) => (
                  <SortableTableHeader
                    key={col.key}
                    column={col}
                    sortState={sortStates[col.key] || 'default'}
                    onSortChange={handleSortChange}
                    className={col.key === 'description' ? 'w-full' : undefined}
                  />
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : processedFeatures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Пусто
                  </TableCell>
                </TableRow>
              ) : (
                processedFeatures.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.name}</TableCell>
                    <TableCell>{f.type}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={normalizeOptions(f.options).join(',')}>
                      {normalizeOptions(f.options).length > 0 ? normalizeOptions(f.options).join(', ') : '-'}
                    </TableCell>
                    <TableCell className="whitespace-normal">{f.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteFeature(f.id)}
                        aria-label="Delete feature"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


