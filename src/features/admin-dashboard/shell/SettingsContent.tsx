'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconButton } from '@/components/ui/icon-button'
import { User, Save, RefreshCw, LocateFixed } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { SiteBuilderCard } from '@/components/admin/SiteBuilderCard'
import type { ProfileUiText } from '@/features/admin-dashboard/config/profile-ui-text'

const WarehouseStartPointPickerMap = dynamic(
  () =>
    import('@/components/admin/dashboard/shared/WarehouseStartPointPickerMap').then(
      (mod) => mod.WarehouseStartPointPickerMap
    ),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-lg" /> }
)

interface WarehousePointValues {
  warehousePoint: { lat: number; lng: number } | null
  warehouseInput: string
  warehousePreview: { lat: number; lng: number } | null
  isWarehouseLoading: boolean
  isWarehouseSaving: boolean
  isWarehouseGeoLocating: boolean
  refreshWarehousePoint: () => Promise<void>
  handleWarehouseInputChange: (value: string) => void
  handleWarehouseInputBlur: () => Promise<void>
  handleWarehouseMapPick: (point: { lat: number; lng: number }) => void
  handleUseMyLocation: () => void
  handleSaveWarehousePoint: () => Promise<void>
}

interface SettingsContentProps {
  profileUiText: ProfileUiText
  isLowAdminView: boolean
  isWarehouseReadOnly: boolean
  onChangePassword: () => void
  warehouse: WarehousePointValues
}

export function SettingsContent({
  profileUiText,
  isLowAdminView,
  isWarehouseReadOnly,
  onChangePassword,
  warehouse,
}: SettingsContentProps) {
  const {
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
  } = warehouse

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <IconButton
          label={profileUiText.changePassword}
          onClick={onChangePassword}
          variant="outline"
          iconSize="md"
        >
          <User className="h-4 w-4" />
        </IconButton>
      </div>

      {!isLowAdminView && <SiteBuilderCard />}

      <Card className="">
        <CardHeader>
          <CardTitle>{profileUiText.warehouseStartPoint}</CardTitle>
          <CardDescription>{profileUiText.warehouseStartPointDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="warehousePointSettings">
              {profileUiText.warehouseInputLabel}
              {isWarehouseReadOnly && (
                <span className="ml-2 text-xs text-muted-foreground">{profileUiText.readOnly}</span>
              )}
            </Label>
            <Input
              id="warehousePointSettings"
              value={warehouseInput}
              onChange={(event) => handleWarehouseInputChange(event.target.value)}
              onBlur={() => void handleWarehouseInputBlur()}
              placeholder={profileUiText.warehousePlaceholder}
              disabled={isWarehouseReadOnly || isWarehouseLoading || isWarehouseSaving}
            />
            <div className="text-xs text-muted-foreground">
              {warehousePoint
                ? `${profileUiText.current}: ${warehousePoint.lat.toFixed(6)}, ${warehousePoint.lng.toFixed(6)}`
                : `${profileUiText.current}: ${profileUiText.notConfigured}`}
              {warehousePreview && (
                <span className="ml-2 text-muted-foreground/80">
                  {profileUiText.preview}: {warehousePreview.lat.toFixed(6)}, {warehousePreview.lng.toFixed(6)}
                </span>
              )}
            </div>
          </div>

          <div className="h-48 w-full overflow-hidden rounded-md bg-muted/20">
            <WarehouseStartPointPickerMap
              value={warehousePreview ?? warehousePoint}
              disabled={isWarehouseReadOnly || isWarehouseLoading || isWarehouseSaving}
              onChange={handleWarehouseMapPick}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <IconButton
              label={profileUiText.refresh}
              variant="outline"
              iconSize="md"
              onClick={() => void refreshWarehousePoint()}
              disabled={isWarehouseLoading || isWarehouseSaving}
            >
              <RefreshCw className={isWarehouseLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </IconButton>
            <IconButton
              label={profileUiText.useMyLocation}
              variant="outline"
              iconSize="md"
              onClick={handleUseMyLocation}
              disabled={isWarehouseReadOnly || isWarehouseSaving || isWarehouseLoading || isWarehouseGeoLocating}
            >
              <LocateFixed className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={isWarehouseSaving ? profileUiText.saving : profileUiText.saveLocation}
              iconSize="md"
              onClick={() => void handleSaveWarehousePoint()}
              disabled={isWarehouseReadOnly || isWarehouseSaving || isWarehouseLoading || !warehouseInput.trim()}
            >
              <Save className="h-4 w-4" />
            </IconButton>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
