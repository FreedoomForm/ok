'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteOrdersAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isDeleting: boolean
  selectedCount: number
  onConfirm: () => void
  t: any
}

export function DeleteOrdersAlertDialog({
  open,
  onOpenChange,
  isDeleting,
  selectedCount,
  onConfirm,
  t,
}: DeleteOrdersAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.admin.toasts.deleteSelectedOrders}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.admin.toasts.deleteOrdersConfirmation.replace('{count}', String(selectedCount))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? t.common.loading : t.admin.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
