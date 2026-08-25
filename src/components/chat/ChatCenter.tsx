'use client'

import { ChatUnifiedTab } from '@/components/chat/ChatUnifiedTab'

interface ChatCenterProps {
  initialShowUserList?: boolean
  onContactSelectionChange?: (ids: readonly string[]) => void
}

export function ChatCenter({ initialShowUserList = false, onContactSelectionChange }: ChatCenterProps) {
  return (
    <ChatUnifiedTab initialShowUserList={initialShowUserList} onContactSelectionChange={onContactSelectionChange} />
  )
}
