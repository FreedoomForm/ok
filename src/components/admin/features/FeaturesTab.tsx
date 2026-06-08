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

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/features')
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((data && data.error) || 'Ошибка загрузки')
      }
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
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((data && data.error) || 'Ошибка создания')
      }

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
        throw new Error((data && data.error) || 'Ошибка удаления')
      }
      setFeatures((prev) => prev.filter((f) => f.id !== id))
      toast.success('Удалено')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка удаления')
    }
  }, [])

  const rows = useMemo(() => {
    return features.map((f) => ({
      ...f,
      optionsList: normalizeOptions(f.options),
    }))
  }, [features])

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
        <CardHeader>
          <CardTitle>Список</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Варианты</TableHead>
                <TableHead className="w-full">Описание</TableHead>
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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Пусто
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.name}</TableCell>
                    <TableCell>{f.type}</TableCell>
 <TableCell className="max-w-[240px] truncate" title={f.optionsList.join(',')}>
                      {f.optionsList.length > 0 ? f.optionsList.join(', ') : '-'}
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


