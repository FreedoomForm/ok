'use client'

import { ChatUnifiedTab } from '@/components/chat/ChatUnifiedTab'

interface ChatCenterProps {
  initialShowUserList?: boolean
}

export function ChatCenter({ initialShowUserList = false }: ChatCenterProps) {
  return (
    <ChatUnifiedTab initialShowUserList={initialShowUserList} />
  )
}
