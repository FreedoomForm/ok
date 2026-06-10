'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  expandShortMapsUrl,
  extractCoordsFromText,
  isShortGoogleMapsUrl,
  type LatLng,
} from '@/lib/geo'
import type { ProfileUiText } from '@/features/admin-dashboard/config/profile-ui-text'

interface UseWarehousePointOptions {
  isReadOnly: boolean
  profileUiText: ProfileUiText
  errorSavingWarehouse: string
  warehouseSaved: string
  enterMapsLinkOrCoords: string
}

export function useWarehousePoint({
  isReadOnly,
  profileUiText,
  errorSavingWarehouse,
  warehouseSaved,
  enterMapsLinkOrCoords,
}: UseWarehousePointOptions) {
  const [warehousePoint, setWarehousePoint] = useState<LatLng | null>(null)
  const [warehouseInput, setWarehouseInput] = useState('')
  const [warehousePreview, setWarehousePreview] = useState<LatLng | null>(null)
  const [isWarehouseLoading, setIsWarehouseLoading] = useState(false)
  const [isWarehouseSaving, setIsWarehouseSaving] = useState(false)
  const [isWarehouseGeoLocating, setIsWarehouseGeoLocating] = useState(false)

  const refreshWarehousePoint = useCallback(async () => {
    setIsWarehouseLoading(true)
    try {
      const res = await fetch('/api/admin/warehouse')
      if (!res.ok) return
      const json = await res.json().catch(() => null)
      const data = json?.data
      const lat = data && typeof data.lat === 'number' ? data.lat : null
      const lng = data && typeof data.lng === 'number' ? data.lng : null
      const point = lat != null && lng != null ? ({ lat, lng } as LatLng) : null
      setWarehousePoint(point)
      setWarehousePreview(point)
      setWarehouseInput(point ? `${lat},${lng}` : '')
    } catch (error) {
      console.error('Error loading warehouse point:', error)
    } finally {
      setIsWarehouseLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshWarehousePoint()
  }, [refreshWarehousePoint])

  const handleWarehouseInputChange = useCallback((value: string) => {
    setWarehouseInput(value)
    const coords = extractCoordsFromText(value)
    setWarehousePreview(coords)
  }, [])

  const handleWarehouseInputBlur = useCallback(async () => {
    if (!warehouseInput || warehousePreview) return
    if (!isShortGoogleMapsUrl(warehouseInput)) return

    try {
      const expanded = await expandShortMapsUrl(warehouseInput)
      if (!expanded) return
      const coords = extractCoordsFromText(expanded)
      if (coords) setWarehousePreview(coords)
    } catch (error) {
      console.error('Error expanding warehouse url:', error)
    }
  }, [warehouseInput, warehousePreview])

  const formatWarehousePoint = useCallback((point: LatLng) => {
    return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`
  }, [])

  const handleWarehouseMapPick = useCallback(
    (point: LatLng) => {
      handleWarehouseInputChange(formatWarehousePoint(point))
    },
    [formatWarehousePoint, handleWarehouseInputChange]
  )

  const handleUseMyLocation = useCallback(() => {
    if (isReadOnly) return
    if (typeof window === 'undefined') return

    if (!navigator.geolocation) {
      toast.error(profileUiText.geolocationUnsupported)
      return
    }

    setIsWarehouseGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        handleWarehouseInputChange(formatWarehousePoint(point))
        toast.success(profileUiText.geolocationSet)
        setIsWarehouseGeoLocating(false)
      },
      (err) => {
        if (err && 'code' in err && err.code === 1) {
          toast.error(profileUiText.geolocationDenied)
        } else {
          toast.error(profileUiText.geolocationFailed)
        }
        setIsWarehouseGeoLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [formatWarehousePoint, handleWarehouseInputChange, isReadOnly, profileUiText])

  const handleSaveWarehousePoint = useCallback(async () => {
    if (isReadOnly) return
    if (!warehouseInput.trim()) {
      toast.error(enterMapsLinkOrCoords)
      return
    }

    setIsWarehouseSaving(true)
    try {
      const res = await fetch('/api/admin/warehouse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleMapsLink: warehouseInput.trim() }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const errMsg = json?.error?.message || json?.error || errorSavingWarehouse
        throw new Error(typeof errMsg === 'string' ? errMsg : errorSavingWarehouse)
      }

      const data = json?.data
      const lat = data && typeof data.lat === 'number' ? data.lat : null
      const lng = data && typeof data.lng === 'number' ? data.lng : null
      const point = lat != null && lng != null ? ({ lat, lng } as LatLng) : null
      setWarehousePoint(point)
      setWarehousePreview(point)
      setWarehouseInput(point ? `${lat},${lng}` : '')

      toast.success(warehouseSaved)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorSavingWarehouse)
    } finally {
      setIsWarehouseSaving(false)
    }
  }, [errorSavingWarehouse, isReadOnly, warehouseInput, warehouseSaved])

  return {
    warehousePoint,
    warehouseInput,
    warehousePreview,
    isWarehouseLoading,
    isWarehouseSaving,
    isWarehouseGeoLocating,
    refreshWarehousePoint,
    handleWarehouseInputChange,
    handleWarehouseInputBlur,
    handleWarehouseMapPick,
    handleUseMyLocation,
    handleSaveWarehousePoint,
  }
}
