'use client'

import { ChatUnifiedTab } from '@/components/chat/ChatUnifiedTab'

interface ChatCenterProps {
  initialShowUserList?: boolean
  autoSmsEnabled?: boolean
  onContactSelectionChange?: (ids: readonly string[]) => void
  universalCreate?: boolean
  onUniversalCreateHandled?: () => void
  universalEdit?: boolean
  onUniversalEditHandled?: () => void
}

export function ChatCenter({ initialShowUserList = false, autoSmsEnabled = false, onContactSelectionChange, universalCreate = false, onUniversalCreateHandled, universalEdit = false, onUniversalEditHandled }: ChatCenterProps) {
  return (
    <ChatUnifiedTab initialShowUserList={initialShowUserList} autoSmsEnabled={autoSmsEnabled} onContactSelectionChange={onContactSelectionChange} universalCreate={universalCreate} onUniversalCreateHandled={onUniversalCreateHandled} universalEdit={universalEdit} onUniversalEditHandled={onUniversalEditHandled} />
  )
}
